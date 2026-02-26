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

@app.route('/search', methods=['GET'])

def search_manga():
    """
    Proxy: Search/Browse Manga

    Acts as a middleman between the Client (JS) and MangaDex to bypass CORS restrictions. It forwards the search query and returns the raw JSON responses.

    Params:
        title (str): Search term (e.g., "My Dress Up Darling")
        limit (int): Items per page (limit set to 10 for now)
    """
    query = request.args.get('title')
    limit = request.args.get('limit')
    genre_id = request.args.get('includedTags[]')

    url = f"{BASE_URL}/manga"
    order = {
        "followedCount": "desc",
        "rating": "desc",
    }
    final_order_query = {}
    for key, value in order.items():
        final_order_query[f"order[{key}]"] = value

    # I'm using a list of tuples instead of a dictionary because the requests lib handles array parameters (includes[]) better when passed as tuples, so cover_art and author are sent correctly
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

    try:
        response = requests.get(url, params=payload)

        if response.status_code == 429:
            return jsonify({"error": "Rate limit hit. Please wait."}), 429
        
        return jsonify(response.json())
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/chapter/<chapter_id>', methods=['GET'])
def get_chapter(chapter_id):
    """
    Proxy: Get Chapter Images (For Theater Mode)

    Fetches the MangaDex At-Home server URL for a specific chapter. This is required to generate the image links for the reader.

    Params:
        chapter_id(str): The unique UUID of the chapter.
    """
    try:
        response = requests.get(f"{BASE_URL}/at-home/server/{chapter_id}")

        return jsonify(response.json())
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/manga/<manga_id>', methods=['GET'])
def get_manga(manga_id):
    """
    Proxy: Get a single Manga by ID
    """
    url = f"{BASE_URL}/manga/{manga_id}"
    payload = [
        ('includes[]', 'cover_art'),
        ('includes[]', 'author')
    ]

    try:
        response = requests.get(url, params=payload)
        return jsonify(response.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/cover/<manga_id>/<filename>', methods=['GET'])
def get_cover(manga_id, filename):
    """
    Proxy: Get Cover Image

    Bypasses MangaDex hotlink protection by fetching the image via Python.
    """
    url = f"{COVER_URL}/{manga_id}/{filename}"
    try:
        r = requests.get(url, stream=True)

        return Response(r.iter_content(chunk_size=1024), content_type=r.headers.get('Content-Type', 'image/jpeg'))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/manga/<manga_id>/feed', methods=['GET'])
def get_manga_feed(manga_id):
    """
    Proxy: Get Chapter Feed for a Manga

    Fetches the list of English chapters for a specific manga.
    """
    url = f"{BASE_URL}/manga/{manga_id}/feed"

    payload = {
        'translatedLanguage[]': 'en',
        'order[chapter]': 'asc',
        'limit': 50
    }

    try:
        response = requests.get(url, params=payload)
        return jsonify(response.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
# Server Entry Point
if __name__ == '__main__':
    print("✅ MangaList Python Backend is running on http://127.0.0.1:5000")
    print("   - Proxying requests to: " + BASE_URL)

    app.run(debug=True, port=5000)