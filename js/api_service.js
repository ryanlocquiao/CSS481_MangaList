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
const BASE_URL = 'http://127.0.0.1:5000';
const COVER_URL = `${BASE_URL}/cover`;

// Milliseconds before a fetch is considered timed out
const FETCH_TIMEOUT_MS = 12000;

/**
 * Fetch wrapper that enforces a timeout.
 * Native fetch() hangs indefinitely on unresponsive servers.
 *
 * @param {string} url
 * @param {RequestInit} options
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Data Normalization Layer
 *
 * MangaDex returns complex JSON responses. This helper extracts only
 * the necessary data and flattens it into a simple, predictable object.
 *
 * @param   {Object} manga - Raw manga object from MangaDex API.
 * @returns {Object|null}  - Clean, flattened manga object, or null on failure.
 */
function normalizeMangaData(manga) {
    // Guard: malformed entry — skip silently rather than crashing the whole list
    if (!manga || !manga.attributes || !manga.relationships) {
        console.warn('normalizeMangaData: Skipping malformed manga entry:', manga);
        return null;
    }

    try {
        const attributes = manga.attributes;
        const coverRel = manga.relationships.find(r => r.type === 'cover_art');
        const authorRel = manga.relationships.find(r => r.type === 'author');

        const coverFileName = coverRel?.attributes?.fileName || null;
        const authorName = authorRel?.attributes?.name || 'Unknown Author';

        // Title fallback chain: English → first available language → 'Untitled'
        const title =
            attributes.title?.en ||
            (attributes.title && Object.values(attributes.title)[0]) ||
            'Untitled';

        const description =
            attributes.description?.en ||
            (attributes.description && Object.values(attributes.description)[0]) ||
            'No description available.';

        const tags = Array.isArray(attributes.tags)
            ? attributes.tags
                  .map(tag => tag?.attributes?.name?.en)
                  .filter(Boolean)
                  .slice(0, 5)
            : [];

        return {
            id: manga.id,
            title,
            description,
            status: attributes.status || 'unknown',
            tags,
            coverImage: coverFileName
                ? `${COVER_URL}/${manga.id}/${coverFileName}`
                : null,
            author: authorName,
            rating: attributes.contentRating || 'unknown',
        };
    } catch (err) {
        console.error('normalizeMangaData: Unexpected error normalizing entry:', err, manga);
        return null;
    }
}

/**
 * MangaService Object
 *
 * Specialized middleware that manages all API communication.
 */
const MangaService = {
    /**
     * Searches for manga based on a query or fetches a list by genre.
     *
     * @param {string|null} query    - Search term or null.
     * @param {number}      limit    - Max results to return.
     * @param {string|null} genre_id - Genre UUID to filter by.
     * @returns {Promise<Array>} Array of normalized manga objects (empty on failure).
     */
    async searchManga(query, limit, genre_id) {
        try {
            const url = new URL(`${BASE_URL}/search`);

            if (query && typeof query === 'string' && query.trim()) {
                url.searchParams.append('title', query.trim());
            }
            if (genre_id && typeof genre_id === 'string') {
                url.searchParams.append('includedTags[]', genre_id);
            }

            const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 10;
            url.searchParams.append('limit', safeLimit);

            const response = await fetchWithTimeout(url.toString());

            if (response.status === 429) {
                console.warn('MangaService.searchManga: Rate limited by backend.');
                MangaService._showToast('Too many requests — please wait a moment before searching again.');
                return [];
            }

            if (!response.ok) {
                console.error(`MangaService.searchManga: Backend returned HTTP ${response.status}.`);
                return [];
            }

            let data;
            try {
                data = await response.json();
            } catch {
                console.error('MangaService.searchManga: Response was not valid JSON.');
                return [];
            }

            if (!data || !Array.isArray(data.data)) {
                console.error('MangaService.searchManga: Unexpected response shape:', data);
                return [];
            }

            // Normalize and filter out any entries that failed normalization
            return data.data.map(normalizeMangaData).filter(Boolean);

        } catch (err) {
            if (err.name === 'AbortError') {
                console.error('MangaService.searchManga: Request timed out.');
                MangaService._showToast('Search timed out. Check that the backend server is running.');
            } else {
                console.error('MangaService.searchManga: Network error:', err);
            }
            return [];
        }
    },

    /**
     * Fetches detailed data for a specific manga by its UUID.
     *
     * @param {string} mangaId - MangaDex UUID.
     * @returns {Promise<Object|null>} Normalized manga object or null.
     */
    async getMangaById(mangaId) {
        if (!mangaId || typeof mangaId !== 'string') {
            console.error('MangaService.getMangaById: Invalid mangaId provided:', mangaId);
            return null;
        }

        try {
            const response = await fetchWithTimeout(`${BASE_URL}/manga/${mangaId}`);

            if (response.status === 404) {
                console.warn(`MangaService.getMangaById: Manga ${mangaId} not found.`);
                return null;
            }

            if (!response.ok) {
                console.error(`MangaService.getMangaById: HTTP ${response.status} for manga ${mangaId}.`);
                return null;
            }

            let data;
            try {
                data = await response.json();
            } catch {
                console.error('MangaService.getMangaById: Response was not valid JSON.');
                return null;
            }

            if (!data || !data.data) {
                console.error('MangaService.getMangaById: Missing data field in response:', data);
                return null;
            }

            return normalizeMangaData(data.data);

        } catch (err) {
            if (err.name === 'AbortError') {
                console.error(`MangaService.getMangaById: Request timed out for manga ${mangaId}.`);
            } else {
                console.error('MangaService.getMangaById: Network error:', err);
            }
            return null;
        }
    },

    /**
     * Fetches image URLs for a specific chapter (Theater Mode).
     *
     * @param {string} chapterId - MangaDex Chapter UUID.
     * @returns {Promise<Array<string>>} Array of image URLs (empty on failure).
     */
    async getChapterImages(chapterId) {
        if (!chapterId || typeof chapterId !== 'string') {
            console.error('MangaService.getChapterImages: Invalid chapterId:', chapterId);
            return [];
        }

        try {
            const response = await fetchWithTimeout(`${BASE_URL}/chapter/${chapterId}`);

            if (response.status === 404) {
                console.warn(`MangaService.getChapterImages: Chapter ${chapterId} not found.`);
                return [];
            }

            if (!response.ok) {
                console.error(`MangaService.getChapterImages: HTTP ${response.status} for chapter ${chapterId}.`);
                return [];
            }

            let data;
            try {
                data = await response.json();
            } catch {
                console.error('MangaService.getChapterImages: Response was not valid JSON.');
                return [];
            }

            // Validate all required fields before constructing URLs
            if (!data.baseUrl || !data.chapter) {
                console.error('MangaService.getChapterImages: Missing baseUrl or chapter in response:', data);
                return [];
            }

            const { hash, data: pageFiles } = data.chapter;

            if (!hash || !Array.isArray(pageFiles) || pageFiles.length === 0) {
                console.warn(`MangaService.getChapterImages: Chapter ${chapterId} has no pages.`);
                return [];
            }

            return pageFiles.map(filename => `${data.baseUrl}/data/${hash}/${filename}`);

        } catch (err) {
            if (err.name === 'AbortError') {
                console.error(`MangaService.getChapterImages: Request timed out for chapter ${chapterId}.`);
            } else {
                console.error('MangaService.getChapterImages: Network error:', err);
            }
            return [];
        }
    },

    /**
     * Fetches the list of English chapters for a specific manga.
     *
     * @param {string} mangaId - MangaDex Manga UUID.
     * @returns {Promise<Object|null>} Raw feed data or null on failure.
     */
    async getMangaFeed(mangaId) {
        if (!mangaId || typeof mangaId !== 'string') {
            console.error('MangaService.getMangaFeed: Invalid mangaId:', mangaId);
            return null;
        }

        try {
            const response = await fetchWithTimeout(`${BASE_URL}/manga/${mangaId}/feed`);

            if (response.status === 404) {
                console.warn(`MangaService.getMangaFeed: No feed found for manga ${mangaId}.`);
                return null;
            }

            if (!response.ok) {
                console.error(`MangaService.getMangaFeed: HTTP ${response.status} for manga ${mangaId}.`);
                return null;
            }

            let data;
            try {
                data = await response.json();
            } catch {
                console.error('MangaService.getMangaFeed: Response was not valid JSON.');
                return null;
            }

            if (!data || !Array.isArray(data.data)) {
                console.error('MangaService.getMangaFeed: Unexpected response shape:', data);
                return null;
            }

            return data;

        } catch (err) {
            if (err.name === 'AbortError') {
                console.error(`MangaService.getMangaFeed: Request timed out for manga ${mangaId}.`);
            } else {
                console.error('MangaService.getMangaFeed: Network error:', err);
            }
            return null;
        }
    },

    /**
     * Displays a non-intrusive toast notification to the user.
     * Creates a self-removing element so no HTML changes are needed.
     *
     * @param {string} message - Message to display.
     * @param {number} duration - Duration in ms (default 4000).
     */
    _showToast(message, duration = 4000) {
        // Avoid stacking duplicate toasts
        if (document.getElementById('mangalist-toast')) return;

        const toast = document.createElement('div');
        toast.id = 'mangalist-toast';
        toast.textContent = message;
        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#333',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '6px',
            fontSize: '14px',
            zIndex: '9999',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            borderLeft: '4px solid #e50914',
            maxWidth: '400px',
            textAlign: 'center',
            transition: 'opacity 0.4s ease',
        });

        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 400);
        }, duration);
    },
};