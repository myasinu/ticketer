// Display page logic

// DOM Elements
const currentNumberEl = document.getElementById('current-number');
const upcomingListEl = document.getElementById('upcoming-list');
const queueCountEl = document.getElementById('queue-count');

// Number of upcoming tickets to show
const SHOW_UPCOMING = 5;

let lastNumber = null;

// Play sound or visual effect when number changes
function announceNumberChange(newNumber) {
    if (lastNumber !== null && newNumber !== lastNumber) {
        // Add a brief flash animation
        currentNumberEl.style.animation = 'none';
        currentNumberEl.offsetHeight; // Trigger reflow
        currentNumberEl.style.animation = 'flash 0.5s ease-out';
    }
    lastNumber = newNumber;
}

// Render upcoming list
function renderUpcomingList(queue) {
    if (queue.length === 0) {
        upcomingListEl.innerHTML = '<p class="empty-message">Нет ожидающих</p>';
        return;
    }

    const upcoming = queue.slice(0, SHOW_UPCOMING);

    upcomingListEl.innerHTML = upcoming.map(item =>
        `<div class="upcoming-item">${item.number}</div>`
    ).join('');
}

// Setup Firebase listeners
function setupListeners() {
    // Listen for current serving
    database.ref('meta/currentServing').on('value', (snapshot) => {
        const current = snapshot.val();
        const displayNumber = current || '---';
        currentNumberEl.textContent = displayNumber;

        if (current) {
            announceNumberChange(current);
        }
    });

    // Listen for queue changes
    database.ref('queue').on('value', (snapshot) => {
        const queueData = snapshot.val() || {};
        const queue = Object.values(queueData)
            .sort((a, b) => a.timestamp - b.timestamp);

        queueCountEl.textContent = queue.length;
        renderUpcomingList(queue);
    });
}

// Add CSS animation for number change
const style = document.createElement('style');
style.textContent = `
    @keyframes flash {
        0% { transform: scale(1.1); color: #fbbf24; }
        100% { transform: scale(1); color: white; }
    }
`;
document.head.appendChild(style);

// Keep screen awake (for Android)
function keepAwake() {
    // Request wake lock if available
    if ('wakeLock' in navigator) {
        navigator.wakeLock.request('screen').catch(console.error);
    }
}

// Initialize
function init() {
    setupListeners();
    keepAwake();

    // Re-request wake lock on visibility change
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            keepAwake();
        }
    });
}

init();
