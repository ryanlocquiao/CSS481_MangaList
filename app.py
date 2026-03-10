#-------------------------------
# python -m pip install flask flask-cors requests
#
# Run with 'py app.py'
#-------------------------------
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import requests

app = Flask(__name__)

# Allows local JS file to talk to this Py Server w/o CORS errors
CORS(app)

BASE_URL = "https://api.mangadex.org"
COVER_URL = "https://uploads.mangadex.org/covers"

# Shared request timeout (seconds) — prevents hanging indefinitely on slow MangaDex responses
REQUEST_TIMEOUT = 10


def safe_mangadex_get(url, params=None):
    """
    Centralized GET wrapper for MangaDex API calls.

    Handles timeouts, connection errors, and bad HTTP status codes
    in one place so individual routes stay clean.
    """
    try:
        response = requests.get(url, params=params, timeout=REQUEST_TIMEOUT)

        if response.status_code == 429:
            return None, (jsonify({"error": "MangaDex rate limit reached. Please wait a moment and try again."}), 429)

        if response.status_code == 404:
            return None, (jsonify({"error": "The requested resource was not found on MangaDex."}), 404)

        if response.status_code == 503:
            return None, (jsonify({"error": "MangaDex is currently unavailable. Please try again later."}), 503)

        if not response.ok:
            return None, (jsonify({"error": f"MangaDex returned an unexpected error (HTTP {response.status_code})."}), 502)

        try:
            return response.json(), None
        except ValueError:
            return None, (jsonify({"error": "MangaDex returned a malformed response. Please try again."}), 502)

    except requests.exceptions.ConnectionError:
        return None, (jsonify({"error": "Could not connect to MangaDex. Check your internet connection."}), 503)

    except requests.exceptions.Timeout:
        return None, (jsonify({"error": "The request to MangaDex timed out. Please try again."}), 504)

    except requests.exceptions.RequestException as e:
        return None, (jsonify({"error": f"An unexpected network error occurred: {str(e)}"}), 500)


@app.route('/search', methods=['GET'])
def search_manga():
    """
    Proxy: Search/Browse Manga

    Acts as a middleman between the Client (JS) and MangaDex to bypass
    CORS restrictions. Forwards the search query and returns normalized JSON.

    Params:
        title (str): Optional search term (e.g., "My Dress Up Darling")
        limit (int): Items per page (default 10, max 100)
        includedTags[] (str): Optional genre UUID to filter by
    """
    query = request.args.get('title', '').strip()
    limit_raw = request.args.get('limit', '10')
    genre_id = request.args.get('includedTags[]', '').strip()

    # Validate limit — must be a positive integer within MangaDex's accepted range
    try:
        limit = int(limit_raw)
        if not (1 <= limit <= 100):
            return jsonify({"error": "limit must be between 1 and 100."}), 400
    except ValueError:
        return jsonify({"error": f"Invalid limit value: '{limit_raw}'. Must be an integer."}), 400

    url = f"{BASE_URL}/manga"
    order = {
        "followedCount": "desc",
        "rating": "desc",
    }
    final_order_query = {f"order[{key}]": value for key, value in order.items()}

    payload = {
        "limit": limit,
        **final_order_query,
        "contentRating[]": ["safe", "suggestive"],
        "includes[]": ["cover_art", "author"],
    }
    if query:
        payload["title"] = query
    if genre_id:
        payload["includedTags[]"] = genre_id

    data, error = safe_mangadex_get(url, params=payload)
    if error:
        return error

    # Guard: MangaDex sometimes returns a valid 200 with an error field
    if "error" in data or "data" not in data:
        return jsonify({"error": "MangaDex returned an unexpected response format."}), 502

    return jsonify(data)


@app.route('/chapter/<chapter_id>', methods=['GET'])
def get_chapter(chapter_id):
    """
    Proxy: Get Chapter Images (For Theater Mode)

    Fetches the MangaDex At-Home server URL for a specific chapter.

    Params:
        chapter_id (str): The unique UUID of the chapter.
    """
    # Basic UUID format validation — MangaDex UUIDs are 36 chars
    if not chapter_id or len(chapter_id) != 36:
        return jsonify({"error": "Invalid chapter ID format."}), 400

    data, error = safe_mangadex_get(f"{BASE_URL}/at-home/server/{chapter_id}")
    if error:
        return error

    # Validate the At-Home response has the fields we need before sending it
    if "baseUrl" not in data or "chapter" not in data:
        return jsonify({"error": "MangaDex returned an incomplete chapter response. The chapter may be unavailable."}), 502

    chapter = data.get("chapter", {})
    if "hash" not in chapter or "data" not in chapter:
        return jsonify({"error": "Chapter image data is missing or corrupted."}), 502

    if not chapter["data"]:
        return jsonify({"error": "This chapter has no pages available."}), 404

    return jsonify(data)


@app.route('/manga/<manga_id>', methods=['GET'])
def get_manga(manga_id):
    """
    Proxy: Get a single Manga by ID.
    """
    if not manga_id or len(manga_id) != 36:
        return jsonify({"error": "Invalid manga ID format."}), 400

    url = f"{BASE_URL}/manga/{manga_id}"
    payload = [
        ('includes[]', 'cover_art'),
        ('includes[]', 'author')
    ]

    data, error = safe_mangadex_get(url, params=payload)
    if error:
        return error

    if "data" not in data:
        return jsonify({"error": f"Manga with ID '{manga_id}' was not found."}), 404

    return jsonify(data)


@app.route('/cover/<manga_id>/<filename>', methods=['GET'])
def get_cover(manga_id, filename):
    """
    Proxy: Get Cover Image

    Bypasses MangaDex hotlink protection by fetching the image via Python.
    """
    if not manga_id or not filename:
        return jsonify({"error": "manga_id and filename are required."}), 400

    # Prevent directory traversal attacks
    if ".." in filename or "/" in filename or "\\" in filename:
        return jsonify({"error": "Invalid filename."}), 400

    url = f"{COVER_URL}/{manga_id}/{filename}"

    try:
        r = requests.get(url, stream=True, timeout=REQUEST_TIMEOUT)

        if not r.ok:
            return jsonify({"error": f"Cover image not found (HTTP {r.status_code})."}), r.status_code

        content_type = r.headers.get('Content-Type', 'image/jpeg')
        if not content_type.startswith('image/'):
            return jsonify({"error": "The server returned a non-image response for the cover."}), 502

        return Response(r.iter_content(chunk_size=1024), content_type=content_type)

    except requests.exceptions.Timeout:
        return jsonify({"error": "Cover image request timed out."}), 504

    except requests.exceptions.ConnectionError:
        return jsonify({"error": "Could not connect to MangaDex image server."}), 503

    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Failed to fetch cover image: {str(e)}"}), 500


@app.route('/manga/<manga_id>/feed', methods=['GET'])
def get_manga_feed(manga_id):
    """
    Proxy: Get Chapter Feed for a Manga

    Fetches the list of English chapters for a specific manga.
    """
    if not manga_id or len(manga_id) != 36:
        return jsonify({"error": "Invalid manga ID format."}), 400

    url = f"{BASE_URL}/manga/{manga_id}/feed"
    payload = {
        'translatedLanguage[]': 'en',
        'order[chapter]': 'asc',
        'limit': 50
    }

    data, error = safe_mangadex_get(url, params=payload)
    if error:
        return error

    if "data" not in data:
        return jsonify({"error": "No chapter data returned for this manga."}), 404

    return jsonify(data)


# Server Entry Point
if __name__ == '__main__':
    print("✅ MangaList Python Backend is running on http://127.0.0.1:5000")
    print("   - Proxying requests to: " + BASE_URL)
    app.run(debug=True, port=5000)