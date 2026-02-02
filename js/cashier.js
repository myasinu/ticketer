// Cashier page logic

// Default PIN (used only for first-time setup)
const DEFAULT_PIN = '123456';
const SESSION_KEY = 'ticketer_cashier_session';

// DOM Elements - Login
const loginScreen = document.getElementById('login-screen');
const dashboard = document.getElementById('dashboard');
const pinInput = document.getElementById('pin-input');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');

// DOM Elements - Dashboard
const currentNumberEl = document.getElementById('current-number');
const queueCountEl = document.getElementById('queue-count');
const queueListEl = document.getElementById('queue-list');
const nextBtn = document.getElementById('next-btn');
const resetBtn = document.getElementById('reset-btn');
const resetHint = document.getElementById('reset-hint');
const changePinBtn = document.getElementById('change-pin-btn');

// DOM Elements - Modals
const resetModal = document.getElementById('reset-modal');
const resetCancel = document.getElementById('reset-cancel');
const resetConfirm = document.getElementById('reset-confirm');
const pinModal = document.getElementById('pin-modal');
const newPinInput = document.getElementById('new-pin-input');
const confirmPinInput = document.getElementById('confirm-pin-input');
const pinError = document.getElementById('pin-error');
const pinCancel = document.getElementById('pin-cancel');
const pinSave = document.getElementById('pin-save');

let queue = [];

// ============ PIN Hashing ============

// Hash a PIN using SHA-256
async function hashPin(pin) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + 'ticketer_salt_2024');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// ============ Authentication ============

// Check if user is logged in (session-based)
function isLoggedIn() {
    return sessionStorage.getItem(SESSION_KEY) === 'true';
}

// Show dashboard, hide login
function showDashboard() {
    loginScreen.classList.add('hidden');
    dashboard.classList.remove('hidden');
    sessionStorage.setItem(SESSION_KEY, 'true');
}

// Show login, hide dashboard
function showLogin() {
    loginScreen.classList.remove('hidden');
    dashboard.classList.add('hidden');
    sessionStorage.removeItem(SESSION_KEY);
    pinInput.value = '';
    loginError.classList.add('hidden');
}

// Verify PIN against Firebase (compares hashes)
async function verifyPin(enteredPin) {
    const enteredHash = await hashPin(enteredPin);
    const snapshot = await database.ref('settings/pinHash').once('value');
    let storedHash = snapshot.val();

    // If no PIN hash set yet, set the default PIN hash
    if (!storedHash) {
        const defaultHash = await hashPin(DEFAULT_PIN);
        await database.ref('settings/pinHash').set(defaultHash);
        storedHash = defaultHash;
    }

    return enteredHash === storedHash;
}

// Handle login
async function handleLogin() {
    const enteredPin = pinInput.value;

    if (!enteredPin) {
        loginError.textContent = 'Введите PIN-код';
        loginError.classList.remove('hidden');
        return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Проверка...';

    try {
        const valid = await verifyPin(enteredPin);

        if (valid) {
            showDashboard();
            initializeDashboard();
        } else {
            loginError.textContent = 'Неверный PIN-код';
            loginError.classList.remove('hidden');
            pinInput.value = '';
            pinInput.focus();
        }
    } catch (error) {
        console.error('Login error:', error);
        loginError.textContent = 'Ошибка соединения. Попробуйте ещё раз.';
        loginError.classList.remove('hidden');
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Войти';
    }
}

// Handle logout
function handleLogout() {
    showLogin();
}

// Change PIN
async function changePin() {
    const newPin = newPinInput.value;
    const confirmPin = confirmPinInput.value;

    // Validate
    if (newPin.length !== 6) {
        pinError.textContent = 'PIN должен быть ровно 6 цифр';
        pinError.classList.remove('hidden');
        return;
    }

    if (!/^\d+$/.test(newPin)) {
        pinError.textContent = 'PIN должен содержать только цифры';
        pinError.classList.remove('hidden');
        return;
    }

    if (newPin !== confirmPin) {
        pinError.textContent = 'PIN-коды не совпадают';
        pinError.classList.remove('hidden');
        return;
    }

    try {
        const newHash = await hashPin(newPin);
        await database.ref('settings/pinHash').set(newHash);
        pinModal.classList.add('hidden');
        newPinInput.value = '';
        confirmPinInput.value = '';
        pinError.classList.add('hidden');
        alert('PIN-код успешно изменён!');
    } catch (error) {
        console.error('Error changing PIN:', error);
        pinError.textContent = 'Ошибка сохранения PIN. Попробуйте ещё раз.';
        pinError.classList.remove('hidden');
    }
}

// ============ Queue Management ============

// Initialize queue for today if needed
async function initializeQueue() {
    const today = getTodayString();
    const metaRef = database.ref('meta');

    const snapshot = await metaRef.once('value');
    const meta = snapshot.val();

    if (!meta || meta.date !== today) {
        // New day - initialize
        await metaRef.set({
            date: today,
            currentServing: null
        });
        await database.ref('queue').remove();
        await database.ref('usedNumbers').remove();
    }
}

// Update reset button state based on queue
function updateResetButtonState() {
    if (queue.length === 0) {
        resetBtn.disabled = false;
        resetHint.classList.add('hidden');
    } else {
        resetBtn.disabled = true;
        resetHint.classList.remove('hidden');
    }
}

// Render queue list
function renderQueueList() {
    if (queue.length === 0) {
        queueListEl.innerHTML = '<p class="empty-message">Очередь пуста</p>';
        nextBtn.disabled = true;
        return;
    }

    nextBtn.disabled = false;

    queueListEl.innerHTML = queue.map((item, index) => {
        const time = new Date(item.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
        const isNext = index === 0;

        return `
            <div class="queue-item ${isNext ? 'next' : ''}" data-key="${item.key}">
                <div>
                    <span class="queue-item-number">${item.number}</span>
                    ${isNext ? '<span class="label"> (Следующий)</span>' : ''}
                </div>
                <span class="queue-item-time">${time}</span>
            </div>
        `;
    }).join('');
}

// Call next customer
async function callNext() {
    if (queue.length === 0) return;

    const nextCustomer = queue[0];

    // Update current serving
    await database.ref('meta/currentServing').set(nextCustomer.number);

    // Remove from queue
    await database.ref(`queue/${nextCustomer.key}`).remove();
}

// Reset queue
async function resetQueue() {
    // Double-check queue is empty
    if (queue.length > 0) {
        alert('Невозможно сбросить очередь пока есть ожидающие!');
        resetModal.classList.add('hidden');
        return;
    }

    const today = getTodayString();

    await database.ref('meta').set({
        date: today,
        currentServing: null
    });

    await database.ref('queue').remove();
    await database.ref('usedNumbers').remove();

    resetModal.classList.add('hidden');
}

// Setup Firebase listeners
function setupListeners() {
    // Listen for queue changes
    database.ref('queue').on('value', (snapshot) => {
        const queueData = snapshot.val() || {};
        queue = Object.entries(queueData)
            .map(([key, value]) => ({ ...value, key }))
            .sort((a, b) => a.timestamp - b.timestamp);

        queueCountEl.textContent = queue.length;
        renderQueueList();
        updateResetButtonState();
    });

    // Listen for current serving
    database.ref('meta/currentServing').on('value', (snapshot) => {
        const current = snapshot.val();
        currentNumberEl.textContent = current || '---';
    });
}

// Initialize dashboard
async function initializeDashboard() {
    await initializeQueue();
    setupListeners();
}

// ============ Event Listeners ============

// Login events
loginBtn.addEventListener('click', handleLogin);
pinInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
});
logoutBtn.addEventListener('click', handleLogout);

// Dashboard events
nextBtn.addEventListener('click', callNext);

resetBtn.addEventListener('click', () => {
    if (queue.length === 0) {
        resetModal.classList.remove('hidden');
    }
});

resetCancel.addEventListener('click', () => {
    resetModal.classList.add('hidden');
});

resetConfirm.addEventListener('click', resetQueue);

changePinBtn.addEventListener('click', () => {
    pinModal.classList.remove('hidden');
    newPinInput.value = '';
    confirmPinInput.value = '';
    pinError.classList.add('hidden');
});

pinCancel.addEventListener('click', () => {
    pinModal.classList.add('hidden');
});

pinSave.addEventListener('click', changePin);

// Close modals on backdrop click
resetModal.addEventListener('click', (e) => {
    if (e.target === resetModal) {
        resetModal.classList.add('hidden');
    }
});

pinModal.addEventListener('click', (e) => {
    if (e.target === pinModal) {
        pinModal.classList.add('hidden');
    }
});

// ============ Initialize ============

// Check if already logged in (same browser session)
if (isLoggedIn()) {
    showDashboard();
    initializeDashboard();
} else {
    showLogin();
}
