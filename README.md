# Ticketer - Simple Queue Management System

A browser-based queue management app that lets customers get a ticket number by scanning a QR code and see their position in line.

## Features

- **Customer View** - Scan QR code, get a ticket number, see position in queue
- **Cashier Dashboard** - View queue, call next customer, reset queue
- **Display Screen** - Large display showing current number being served
- **Real-time sync** - All screens update instantly via Firebase
- **Daily auto-reset** - Queue starts fresh each day with a random 4-digit number
- **Persistent tickets** - Customers keep their ticket even if they refresh

## Pages

| Page | URL | Description |
|------|-----|-------------|
| Customer | `/index.html` | Where customers get their ticket |
| Cashier | `/cashier.html` | Queue management for staff |
| Display | `/display.html` | Big screen for waiting area |

## Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter a project name (e.g., "ticketer-queue")
4. Disable Google Analytics (not needed) and create
5. Click "Build" > "Realtime Database" in sidebar
6. Click "Create Database"
7. Select your region
8. Start in **test mode** (we'll secure it later)

### 2. Get Firebase Config

1. In Firebase Console, click the gear icon > "Project settings"
2. Scroll to "Your apps" and click the web icon (`</>`)
3. Register app with a nickname (e.g., "ticketer-web")
4. Copy the `firebaseConfig` object

### 3. Configure the App

Edit `js/firebase-config.js` and replace the placeholder values:

```javascript
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project.firebaseapp.com",
    databaseURL: "https://your-project-default-rtdb.firebaseio.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};
```

### 4. Set Database Rules

In Firebase Console > Realtime Database > Rules, set:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

> **Note:** These rules allow public access. For production, implement proper authentication.

### 5. Deploy to GitHub Pages

1. Create a GitHub repository
2. Push the code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/ticketer.git
   git push -u origin main
   ```
3. Go to repository Settings > Pages
4. Source: "Deploy from a branch"
5. Branch: `main` / `root`
6. Save

Your app will be live at `https://YOUR_USERNAME.github.io/ticketer/`

## Usage

### For Cashiers
1. Open `/cashier.html`
2. Click "Show QR Code" to display the code for customers
3. Click "Call Next" when ready for the next customer
4. Click "Reset Queue" to start fresh (requires confirmation)

### For Customers
1. Scan the QR code with phone camera
2. Tap "Get Ticket" to join the queue
3. See your ticket number and position
4. Wait for your number to be called

### For Display Screen
1. Open `/display.html` on a TV or tablet
2. Shows current number being served
3. Shows upcoming numbers in queue
4. Auto-updates in real-time

## File Structure

```
ticketer/
├── index.html          # Customer page
├── cashier.html        # Cashier dashboard
├── display.html        # Display screen
├── css/
│   └── style.css       # All styles
├── js/
│   ├── firebase-config.js  # Firebase setup
│   ├── customer.js     # Customer page logic
│   ├── cashier.js      # Cashier page logic
│   └── display.js      # Display page logic
└── README.md
```

## License

MIT
