/**
 * js/cloud_sync.js - Firebase Firestore Data Synchronization
 *
 * Handles bidirectional syncing of user data (Favorites & Reading Progress)
 * between the browser's LocalStorage and Firebase Firestore.
 */

const CloudSync = {
    /**
     * Pushes the current state of LocalStorage up to Firestore.
     * Triggered whenever a user favorites a manga or turns a page.
     *
     * Silently skips if the user is not logged in (guest mode is valid).
     */
    async saveToCloud() {
        // Guard: Firebase must be initialized
        if (typeof auth === 'undefined' || typeof db === 'undefined') {
            console.error('CloudSync.saveToCloud: Firebase auth or db is not initialized.');
            return;
        }

        const user = auth.currentUser;
        if (!user) return; // Guest — no cloud sync needed

        let favorites = [];
        let progress  = {};

        // Safely read from localStorage — corrupt data should not block the save
        try {
            const rawFav = localStorage.getItem('mangaFavorites');
            if (rawFav) {
                const parsed = JSON.parse(rawFav);
                favorites = Array.isArray(parsed) ? parsed : [];
            }
        } catch (err) {
            console.error('CloudSync.saveToCloud: Failed to parse mangaFavorites from localStorage:', err);
            // Continue with empty favorites rather than aborting the entire save
        }

        try {
            const rawProgress = localStorage.getItem('readingProgress');
            if (rawProgress) {
                const parsed = JSON.parse(rawProgress);
                progress = (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
            }
        } catch (err) {
            console.error('CloudSync.saveToCloud: Failed to parse readingProgress from localStorage:', err);
        }

        try {
            await db.collection('users').doc(user.uid).set({
                favorites:      favorites,
                readingProgress: progress,
                lastUpdated:    firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        } catch (err) {
            // Non-fatal — data lives in localStorage, cloud is the backup
            console.error('CloudSync.saveToCloud: Firestore write failed:', err);

            // Show a toast only for network-level failures the user should know about
            if (err.code === 'unavailable' || err.code === 'resource-exhausted') {
                if (typeof MangaService !== 'undefined') {
                    MangaService._showToast('Could not sync your data to the cloud. Changes are saved locally.');
                }
            }
        }
    },

    /**
     * Pulls the user's saved data from Firestore and merges it into LocalStorage.
     * Triggered immediately upon successful login.
     *
     * Cloud data takes precedence over any existing local data on login.
     */
    async loadFromCloud() {
        if (typeof auth === 'undefined' || typeof db === 'undefined') {
            console.error('CloudSync.loadFromCloud: Firebase auth or db is not initialized.');
            return;
        }

        const user = auth.currentUser;
        if (!user) return;

        try {
            const doc = await db.collection('users').doc(user.uid).get();

            if (!doc.exists) {
                // First-time user — no cloud data yet, this is not an error
                console.log('CloudSync.loadFromCloud: No existing cloud data for user:', user.uid);
                return;
            }

            const data = doc.data();

            if (!data || typeof data !== 'object') {
                console.warn('CloudSync.loadFromCloud: Cloud document exists but has unexpected shape:', data);
                return;
            }

            // Write cloud data back to localStorage — validate each field before storing
            if (Array.isArray(data.favorites)) {
                try {
                    localStorage.setItem('mangaFavorites', JSON.stringify(data.favorites));
                } catch (storageErr) {
                    console.error('CloudSync.loadFromCloud: Failed to write favorites to localStorage:', storageErr);
                }
            }

            if (data.readingProgress && typeof data.readingProgress === 'object' && !Array.isArray(data.readingProgress)) {
                try {
                    localStorage.setItem('readingProgress', JSON.stringify(data.readingProgress));
                } catch (storageErr) {
                    console.error('CloudSync.loadFromCloud: Failed to write readingProgress to localStorage:', storageErr);
                }
            }

        } catch (err) {
            console.error('CloudSync.loadFromCloud: Firestore read failed:', err);

            if (err.code === 'permission-denied') {
                console.error('CloudSync.loadFromCloud: Permission denied — check Firestore security rules.');
            } else if (err.code === 'unavailable') {
                if (typeof MangaService !== 'undefined') {
                    MangaService._showToast('Could not load your cloud data. Using locally saved data instead.');
                }
            }
        }
    },
};