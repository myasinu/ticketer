// Customer page logic
const TICKET_STORAGE_KEY = 'ticketer_customer_ticket';

let currentTicket = null;
let currentQueue = [];
let currentServing = null;
let firebaseLoaded = false;

// DOM Elements
const noTicketDiv = document.getElementById('no-ticket');
const hasTicketDiv = document.getElementById('has-ticket');
const ticketNumberEl = document.getElementById('ticket-number');
const positionEl = document.getElementById('position');
const nowServingEl = document.getElementById('now-serving');
const beingServedEl = document.getElementById('being-served');
const getTicketBtn = document.getElementById('get-ticket-btn');

// Check for existing ticket in localStorage
function loadStoredTicket() {
    const stored = localStorage.getItem(TICKET_STORAGE_KEY);
    if (stored) {
        try {
            const data = JSON.parse(stored);
            // Check if ticket is from today
            if (data.date === getTodayString()) {
                return data;
            } else {
                // Clear old ticket
                localStorage.removeItem(TICKET_STORAGE_KEY);
            }
        } catch (e) {
            localStorage.removeItem(TICKET_STORAGE_KEY);
        }
    }
    return null;
}

// Check if ticket has expired (older than 2 hours)
function isTicketExpired(ticket) {
    if (!ticket || !ticket.timestamp) return true;
    const now = Date.now();
    return (now - ticket.timestamp) > TICKET_EXPIRATION_MS;
}

// Save ticket to localStorage
function saveTicket(ticketData) {
    localStorage.setItem(TICKET_STORAGE_KEY, JSON.stringify(ticketData));
}

// Clear stored ticket
function clearStoredTicket() {
    localStorage.removeItem(TICKET_STORAGE_KEY);
    currentTicket = null;
}

// Show ticket UI
function showTicket(ticketNumber) {
    noTicketDiv.classList.add('hidden');
    hasTicketDiv.classList.remove('hidden');
    ticketNumberEl.textContent = ticketNumber;
}

// Show get ticket UI
function showGetTicket() {
    noTicketDiv.classList.remove('hidden');
    hasTicketDiv.classList.add('hidden');
    beingServedEl.classList.add('hidden');
}

// Show expired ticket UI with option to get new ticket
function showExpiredTicket() {
    noTicketDiv.classList.remove('hidden');
    hasTicketDiv.classList.add('hidden');
    beingServedEl.classList.add('hidden');
    // Clear the old ticket
    clearStoredTicket();
}

// Update position in queue - called whenever queue or currentServing changes
function updatePosition() {
    // Update "Now Serving" display regardless of ticket status
    nowServingEl.textContent = currentServing || '---';

    if (!currentTicket) return;

    const ticketNumber = currentTicket.number;

    // Check if being served
    if (currentServing === ticketNumber) {
        positionEl.textContent = "Сейчас!";
        beingServedEl.classList.remove('hidden');
        return;
    }

    beingServedEl.classList.add('hidden');

    // Check if ticket is in queue
    const queuePosition = currentQueue.findIndex(item => item.number === ticketNumber);

    if (queuePosition === -1) {
        // Only mark as done if Firebase has loaded and ticket is truly not in queue
        if (firebaseLoaded) {
            positionEl.textContent = "Готово";
        } else {
            positionEl.textContent = "...";
        }
        return;
    }

    // Show position (1-based)
    positionEl.textContent = `#${queuePosition + 1}`;
}

// Generate unique ticket number (check against existing queue)
async function generateUniqueTicketNumber() {
    const usedNumbersRef = database.ref('usedNumbers/' + getTodayString());
    const snapshot = await usedNumbersRef.once('value');
    const usedNumbers = snapshot.val() || {};

    let newNumber;
    let attempts = 0;
    const maxAttempts = 100;

    do {
        newNumber = generateTicketNumber();
        attempts++;
    } while (usedNumbers[newNumber] && attempts < maxAttempts);

    // Mark as used
    await usedNumbersRef.child(newNumber).set(true);

    return newNumber;
}

// Get a new ticket
async function getNewTicket() {
    getTicketBtn.disabled = true;
    getTicketBtn.textContent = 'Получение талона...';

    try {
        const today = getTodayString();
        const queueRef = database.ref('queue');
        const metaRef = database.ref('meta');

        // Get or initialize today's queue
        const metaSnapshot = await metaRef.once('value');
        let meta = metaSnapshot.val();

        if (!meta || meta.date !== today) {
            // New day - initialize
            meta = {
                date: today,
                currentServing: null
            };
            await metaRef.set(meta);
            await queueRef.remove();
            // Clear used numbers from previous days
            await database.ref('usedNumbers').remove();
        }

        // Generate unique ticket number
        const newNumber = await generateUniqueTicketNumber();

        // Add to queue
        const newTicketRef = queueRef.push();
        await newTicketRef.set({
            number: newNumber,
            timestamp: Date.now()
        });

        // Save ticket locally
        currentTicket = {
            number: newNumber,
            date: today,
            id: newTicketRef.key,
            timestamp: Date.now()
        };
        saveTicket(currentTicket);
        showTicket(newNumber);
        updatePosition();

    } catch (error) {
        console.error('Error getting ticket:', error);
        alert('Не удалось получить талон. Попробуйте ещё раз.');
    } finally {
        getTicketBtn.disabled = false;
        getTicketBtn.textContent = 'Получить талон';
    }
}

// Setup Firebase listeners for real-time updates
function setupListeners() {
    // Listen for current serving number changes
    database.ref('meta/currentServing').on('value', (snapshot) => {
        currentServing = snapshot.val();
        updatePosition();
    });

    // Listen for queue changes
    database.ref('queue').on('value', (snapshot) => {
        const queueData = snapshot.val() || {};
        currentQueue = Object.values(queueData).sort((a, b) => a.timestamp - b.timestamp);
        firebaseLoaded = true;
        updatePosition();

        // If we have a ticket, check if it's still valid
        if (currentTicket) {
            const inQueue = currentQueue.some(item => item.number === currentTicket.number);
            const isBeingServed = currentServing === currentTicket.number;

            if (!inQueue && !isBeingServed && firebaseLoaded) {
                // Ticket was served or removed - clear it
                clearStoredTicket();
                showGetTicket();
            }
        }
    });

    // Listen for date changes (daily reset)
    database.ref('meta/date').on('value', (snapshot) => {
        const dbDate = snapshot.val();
        if (currentTicket && dbDate && dbDate !== currentTicket.date) {
            // Queue was reset for a new day
            clearStoredTicket();
            showGetTicket();
        }
    });
}

// Initialize
function init() {
    // Load stored ticket first
    currentTicket = loadStoredTicket();

    // Check if ticket exists and is not expired
    if (currentTicket) {
        if (isTicketExpired(currentTicket)) {
            // Ticket expired - show get new ticket screen
            showExpiredTicket();
        } else {
            // Valid ticket - show it
            showTicket(currentTicket.number);
            positionEl.textContent = "..."; // Loading indicator
        }
    } else {
        showGetTicket();
    }

    // Setup Firebase listeners (will update position when data arrives)
    setupListeners();

    // Setup button event listener
    getTicketBtn.addEventListener('click', getNewTicket);
}

init();
