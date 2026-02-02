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

// Save ticket to localStorage
function saveTicket(ticketData) {
    localStorage.setItem(TICKET_STORAGE_KEY, JSON.stringify(ticketData));
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
            // New day - initialize with random start number
            const startNumber = generateStartNumber();
            meta = {
                date: today,
                startNumber: startNumber,
                nextNumber: startNumber,
                currentServing: null
            };
            await metaRef.set(meta);
            await queueRef.remove(); // Clear old queue
        }

        // Get next ticket number
        const newNumber = meta.nextNumber;

        // Add to queue
        const newTicketRef = queueRef.push();
        await newTicketRef.set({
            number: newNumber,
            timestamp: Date.now()
        });

        // Increment next number
        await metaRef.update({
            nextNumber: newNumber + 1
        });

        // Save ticket locally
        currentTicket = {
            number: newNumber,
            date: today,
            id: newTicketRef.key
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

        // Check if we have a stored ticket and should show it
        if (currentTicket && !hasTicketDiv.classList.contains('hidden') === false) {
            const inQueue = currentQueue.some(item => item.number === currentTicket.number);
            if (inQueue || currentServing === currentTicket.number) {
                showTicket(currentTicket.number);
            }
        }
    });

    // Listen for date changes (daily reset)
    database.ref('meta/date').on('value', (snapshot) => {
        const dbDate = snapshot.val();
        if (currentTicket && dbDate && dbDate !== currentTicket.date) {
            // Queue was reset for a new day
            localStorage.removeItem(TICKET_STORAGE_KEY);
            currentTicket = null;
            showGetTicket();
        }
    });
}

// Initialize
function init() {
    // Load stored ticket first
    currentTicket = loadStoredTicket();

    // If we have a stored ticket, show it immediately (position will update when Firebase loads)
    if (currentTicket) {
        showTicket(currentTicket.number);
        positionEl.textContent = "..."; // Loading indicator
    } else {
        showGetTicket();
    }

    // Setup Firebase listeners (will update position when data arrives)
    setupListeners();

    // Setup button event listener
    getTicketBtn.addEventListener('click', getNewTicket);
}

init();
