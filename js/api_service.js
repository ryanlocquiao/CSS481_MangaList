/**
 * js/api_service.js - Data Fetching Service
 * 
 * Acts as specialized middleware that manages API integration,
 * data normalization, and communication with the backend.
 * By routing all MangaDex API calls through this single service,
 * we ensure that data is fetched and normalized consistently
 * across the entire application.
 */

// --- Configuration ---
// The BASE_URL points to the local Flask proxy server to bypass browser CORS restrictions.
// TODO for Production: Change before deployment
const BASE_URL = 'http://127.0.0.1:5000';
const COVER_URL = `${BASE_URL}/cover`;

/**
 * Data Normalization Layer
 * 
 * MangaDex returns complex JSON responses. This helper function
 * extracts only the necessary data and flattens it into a
 * simple, predictable object that the rest of the application
 * can easily consume.
 * 
 * @param   {Object} manga - The raw manga object from the MangaDex API.
 * @returns {Object} - A clean, flattened manga object.
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
        description: attributes.description?.en || "No description available.",
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
 * MangaService Object
 * 
 * Specialized middleware that manages API integration.
 */
const MangaService = {
    /**
     * Searches for manga based on a query or fetches a list by genre.
     * 
     * @param {string|null} query - Search term (e.g., "My Dress Up Darling") or null for no title.
     * @param {number} limit - Max numbers of items to return.
     * @param {string|null} genre_id - UUID of the genre to filter by.
     * @returns {Promise<Array>} - Array of normalized manga objects.
     */
    async searchManga(query, limit, genre_id) {
        try {
            // Include cover_art and author in includes[] so we avoid extra API calls
            const url = new URL(`${BASE_URL}/search`);

            // Append query params dynamically only if they are provided
            if (query) url.searchParams.append('title', query);
            if (genre_id) url.searchParams.append('includedTags[]', genre_id);
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
     * Fetches detailed data for a specific Manga by its UUID.
     * Used primarily when opening a modal directly via URL params.
     * 
     * @param {string} mangaId - The MangaDex UUID.
     * @returns {Promise<Object|null>} - A single normalized manga object or null.
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
     * Fetches the image URLs for a specific chapter.
     * Used by the Theater Mode (reader.js) to construct the image paths.
     * 
     * @param {string} chapterId - The MangaDex Chapter UUID.
     * @returns {Promise<Array<string>>} - Array of complete image URLs.
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
    },

    /**
     * Fetches the list of English chapters for a specific manga.
     * Used to build the chapter list in the modals.
     * 
     * @param {string} mangaId - The MangaDex Manga UUID.
     * @returns {Promise<Object|null>} - The raw feed data object.
     */
    async getMangaFeed(mangaId) {
        try {
            const response = await fetch(`${BASE_URL}/manga/${mangaId}/feed`);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Error fetching manga feed:", error);
            return null;
        }
    }
};