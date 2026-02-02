// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA9tydptRb2wqe4WCBNnzJcB6zltxkMiMA",
    authDomain: "ticketer-df75b.firebaseapp.com",
    databaseURL: "https://ticketer-df75b-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "ticketer-df75b",
    storageBucket: "ticketer-df75b.firebasestorage.app",
    messagingSenderId: "161100640528",
    appId: "1:161100640528:web:10f87ec353b9b46f3f7595"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Helper function to get today's date string (for daily reset)
function getTodayString() {
    const today = new Date();
    return today.toISOString().split('T')[0]; // Returns "YYYY-MM-DD"
}

// Generate a random 4-digit starting number
function generateStartNumber() {
    return Math.floor(1000 + Math.random() * 9000); // 1000-9999
}
