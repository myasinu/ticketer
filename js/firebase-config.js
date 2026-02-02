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

// Generate a random ticket number (Letter + 3 digits, e.g., "A123", "K456")
function generateTicketNumber() {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed I and O to avoid confusion
    const letter = letters[Math.floor(Math.random() * letters.length)];
    const digits = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return letter + digits;
}

// Ticket expiration time in milliseconds (2 hours)
const TICKET_EXPIRATION_MS = 2 * 60 * 60 * 1000;
