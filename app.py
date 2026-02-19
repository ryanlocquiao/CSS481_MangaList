#-------------------------------
# python -m pip install flask flask-cors requests
#-------------------------------
from flask import Flask, request, jsonify
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
    items_per_page = 10
    query = request.args.get('title')
    limit = request.args.get('limit', items_per_page)

    url = f"{BASE_URL}/manga"

    # I'm using a list of tuples instead of a dictionary because the requests lib handles array parameters (includes[]) better when passed as tuples, so cover_art and author are sent correctly
    payload = [
        ('title', query),
        ('limit', limit),
        ('includes[]', 'cover_art'),
        ('includes[]', 'author')
    ]

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
    
# Server Entry Point
if __name__ == '__main__':
    print("✅ MangaList Python Backend is running on http://127.0.0.1:5000")
    print("   - Proxying requests to: " + BASE_URL)

    app.run(debug=True, port=5000)