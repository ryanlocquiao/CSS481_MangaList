/**
 * js/firebase-init.js - Firebase Initialization Configuration
 * 
 * Initializes the connection to the Google Firebase backend
 * using public API keys.
 * Exposes the global db and auth objects used by the rest of
 * the application.
 */

const firebaseConfig = {
    apiKey: "AIzaSyBgdm1kkIzDK177xZfkGMKK8BB6LCIpXuo",
    authDomain: "mangalist-af487.firebaseapp.com",
    projectId: "mangalist-af487",
    storageBucket: "mangalist-af487.firebasestorage.app",
    messagingSenderId: "1081382736764",
    appId: "1:1081382736764:web:672c387ee1a759b0a04af9"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const auth = firebase.auth();

console.log("Firebase initialized successfully!");