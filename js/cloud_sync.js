/**
 * js/cloud_sync.js - Firebase Firestore Data Synchronization
 */

const CloudSync = {
    // Push local data to cloud
    async saveToCloud() {
        const user = auth.currentUser;
        if (!user) return;

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

    // Pull cloud data to device
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