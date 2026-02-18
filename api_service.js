// Base Configuration
const BASE_URL = 'https://api.mangadex.org';
const COVERL_URL = 'https://uploads.mangadex.org/covers';

/**
 * Data Nromalization Layer
 * 
 * Transforms complex MangaDex API responses into a clean, flat object for the MangaList UI.
 */
function normalizeMangaData(manga) {
    const attributes = manga.attributes;

    // Extract details needed for manga data
    const coverRel = manga.relationships.find(r => r.type === 'cover_art');
    const authorRel = manga.relationships.find(r => r.type === 'author');
    const coverFileName = coverRel?.attributes?.fileName;
    const authorName = authorRel?.attributes?.name || 'Unknown Author';

    return {
        id: manga.id,
        title: attributes.title.en || Object.values(attributes.title[0]),
        descriptiion: attributes.descriptiion.en || "No description available.",
        status: attributes.status,
        tags: attributes.tags.map(tag => tag.attributes.name.en).slice(0, 5),    // Create a limit for tags for now until we can test them and find a good limit or have no limit
        coverImage: coverFileName
            ? `${COVERL_URL}/${manga.id}/${coverFileName}`
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
            const url = new URL(`${BASE_URL}/manga`);
            url.searchParams.append('title', query);
            url.searchParams.append('limit', limit);
            url.searchParams.append('includes[]', 'cover_art');
            url.searchParams.append('includes[]', 'author');

            const response = await fetch(url);

            // Rate Limiting Handler
            // Might switch to node.js + express to handle these better
            if (response.status === 429) {
                console.warn("Rate limit hit. Retrying in 2 seconds...");
                const timeWait = 2000;  // Change as needed, be sure to change the warn to reflect it though
                await new Promise(r => setTimeout(r, timeWait));
                return this.searchManga(query, limit);
            }

            const data = await response.json();

            // Normalize the list of results
            return data.data.map(normalizeMangaData);
        } catch (error) {
            console.error("MangaList API Error:", error);
            return [];
        }
    },

    /**
     * Get Chapter Pages (For Theater Mode)
     * 
     * @param {string} chapterId
     */
    async getChapterImages(chapterId) {
        try {
            const response = await fetch(`${BASE_URL}/at-home-server/${chapterId}`);
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