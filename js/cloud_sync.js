/**
 * js/cloud_sync.js - Firebase Firestore Data Synchronization
 * 
 * Handles bidirectional syncing of user data (Favorites & Reading Progress)
 * between the browser's LocalStorage and Firebase Firestore.
 */

const CloudSync = {
    /**
     * Pushes the current state of LocalStorage up to the cloud.
     * Triggered whenever a user favorites a manga or turns a page in the reader.
     */
    async saveToCloud() {
        const user = auth.currentUser;
        if (!user) return;  // Exit silently if the user is a guest

        // Retrieve current local state
        const favorites = JSON.parse(localStorage.getItem('mangaFavorites')) || [];
        const progress = JSON.parse(localStorage.getItem('readingProgress')) || {};

        try {
            // Save the users collection under their specific user ID
            await db.collection('users').doc(user.uid).set({
                favorites: favorites,
                readingProgress: progress,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error("Error saving data to cloud:", error);
        }
    },

    /**
     * Pulls the user's saved data from the cloud and injects it into LocalStorage.
     * Triggered immediately upon successful login.
     */
    async loadFromCloud() {
        const user = auth.currentUser;
        if (!user) return;

        try {
            const doc = await db.collection('users').doc(user.uid).get();
            
            if (doc.exists) {
                const data = doc.data();

                // Overwrite local storage with the user's cloud data
                if (data.favorites) {
                    localStorage.setItem('mangaFavorites', JSON.stringify(data.favorites));
                }
                if (data.readingProgress) {
                    localStorage.setItem('readingProgress', JSON.stringify(data.readingProgress));
                }
            }
        } catch (error) {
            console.error("Error loading data from cloud:", error);
        }
    }
};