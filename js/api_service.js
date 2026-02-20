/**
 * api_service.js - Data Fetching Service
 * 
 * Acts as specialized middleware that manages API integration, data normalization, and communication with the backend.
 */

// Base Configuration
// const BASE_URL = 'https://api.mangadex.org';
const BASE_URL = 'http://127.0.0.1:5000';
// const COVER_URL = 'https://uploads.mangadex.org/covers';
const COVER_URL = `${BASE_URL}/cover`;

/**
 * Data Normalization Layer
 * 
 * Transforms complex MangaDex API responses into a clean, flat object for the MangaList UI.
 */
function normalizeMangaData(manga) {
    // Extract details needed for manga data
    const attributes = manga.attributes;
    const coverRel = manga.relationships.find(r => r.type === 'cover_art');
    const authorRel = manga.relationships.find(r => r.type === 'author');
    const coverFileName = coverRel?.attributes?.fileName;
    const authorName = authorRel?.attributes?.name || 'Unknown Author';

    return {
        id: manga.id,
        title: attributes.title.en || Object.values(attributes.title)[0],
        description: attributes.description ? (attributes.description.en || "No description available.") : "No description available",
        status: attributes.status,
        tags: attributes.tags.map(tag => tag.attributes.name.en).slice(0, 5),    // Create a limit for tags for now until we can test them and find a good limit or have no limit
        coverImage: coverFileName
            ? `${COVER_URL}/${manga.id}/${coverFileName}`
            : 'placeholder.jpg', // TODO: Implement placeholder image
        author: authorName,
        rating: attributes.contentRating
    };
}

/**
 * Data Fetching Service
 * 
 * Specialized middleware that manages API integration.
 */
const MangaService = {
    /**
     * Search/Browse Manga
     * 
     * @param {string} query - Search term (e.g., "My Dress Up Darling")
     * @param {number} limit - Items per page
     */
    async searchManga(query, limit = 10) {
        try {
            // Include cover_art and author in includes[] so we avoid extra API calls
            const url = new URL(`${BASE_URL}/search`);
            url.searchParams.append('title', query);
            url.searchParams.append('limit', limit);

            const response = await fetch(url);
            const data = await response.json();

            // Safety check
            if (!data || !data.data) {
                console.error("API Error or Empty Response:", data);
                return [];
            }

            // Normalize the list of results
            return data.data.map(normalizeMangaData);
        } catch (error) {
            console.error("MangaList API Error:", error);
            return [];
        }
    },

    /**
     * Get a specific Manga by its ID
     * 
     * @param {string} mangaId
     */
    async getMangaById(mangaId) {
        try {
            const response = await fetch(`${BASE_URL}/manga/${mangaId}`);
            const data = await response.json();

            if (!data || !data.data) return null;

            return normalizeMangaData(data.data);
        } catch (error) {
            console.error("Error fetching specific manga:", error);
            return null;
        }
    },

    /**
     * Get Chapter Pages (For Theater Mode)
     * 
     * @param {string} chapterId
     */
    async getChapterImages(chapterId) {
        try {
            const response = await fetch(`${BASE_URL}/chapter/${chapterId}`);
            const data = await response.json();

            const baseUrl = data.baseUrl;
            const hash = data.chapter.hash;

            // Construct full image URLs for pre-loading logic
            return data.chapter.data.map(filename => {
                return `${baseUrl}/data/${hash}/${filename}`;
            });
        } catch (error) {
            console.error("Error fetching chapter pages:", error);
            return [];
        }
    }
};