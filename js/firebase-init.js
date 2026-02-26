const firebaseConfig = {
    apiKey: "AIzaSyBgdm1kkIzDK177xZfkGMKK8BB6LCIpXuo",
    authDomain: "mangalist-af487.firebaseapp.com",
    projectId: "mangalist-af487",
    storageBucket: "mangalist-af487.firebasestorage.app",
    messagingSenderId: "1081382736764",
    appId: "1:1081382736764:web:672c387ee1a759b0a04af9"
};

firebaseConfig.intializeApp(firebaseConfig);

const db = firebase.firestore();
const auth = firebase.auth();

console.log("Firebase initialized successfully!");