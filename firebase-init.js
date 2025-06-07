// Firebase System Initialisierung - Koordiniert alle Module
console.log('🚀 Firebase System Initialisierung gestartet');

// Globale Variablen
let currentUser = null;

// Hauptinitialisierung
window.initializeFirebaseApp = async function() {
    console.log('🔥 Starte Firebase App Initialisierung...');
    
    try {
        // Schritt 1: Prüfe Firebase SDK
        updateLoadingProgress('Firebase SDK laden...', 20);
        await checkFirebaseSDK();
        
        // Schritt 2: Authentication initialisieren
        updateLoadingProgress('Authentication initialisieren...', 40);
        await initializeAuthentication();
        
        // Schritt 3: Database vorbereiten
        updateLoadingProgress('Database vorbereiten...', 60);
        await prepareDatabaseConnection();
        
        // Schritt 4: UI vorbereiten
        updateLoadingProgress('Benutzer-Interface vorbereiten...', 100);
        await setupUserInterface();
        
        // Erfolgreich initialisiert
        console.log('✅ Firebase System erfolgreich initialisiert');
        showLoginScreen();
        
    } catch (error) {
        console.error('❌ KRITISCHER FEHLER bei Firebase Initialisierung:', error);
        showInitError(error);
    }
};

// Firebase SDK prüfen
async function checkFirebaseSDK() {
    const requiredObjects = ['firebaseApp', 'auth', 'database', 'firebaseAuth', 'firebaseDB'];
    
    for (const obj of requiredObjects) {
        if (!window[obj]) {
            throw new Error(`Firebase ${obj} nicht verfügbar - SDK-Problem`);
        }
    }
    
    console.log('✅ Firebase SDK vollständig geladen');
}

// Authentication initialisieren
async function initializeAuthentication() {
    if (typeof initializeAuth !== 'function') {
        throw new Error('Authentication Module nicht gefunden');
    }
    
    initializeAuth();
    console.log('✅ Firebase Authentication initialisiert');
}

// Database-Verbindung vorbereiten
async function prepareDatabaseConnection() {
    try {
        if (!window.database || !window.firebaseDB) {
            throw new Error('Firebase Database Objekte nicht verfügbar');
        }
        
        // Cache initialisieren
        if (typeof initializeDataCache === 'function') {
            initializeDataCache();
        }
        
        console.log('✅ Firebase Database vorbereitet');
        
    } catch (error) {
        throw new Error('Firebase Database nicht verfügbar: ' + error.message);
    }
}

// Benutzer-Interface vorbereiten
async function setupUserInterface() {
    try {
        // Globale Event-Listener setzen
        setupGlobalEventListeners();
        
        // Tab-Navigation vorbereiten
        setupTabNavigation();
        
        // Module global verfügbar machen
        makeModulesGloballyAvailable();
        
        console.log('✅ Benutzer-Interface vorbereitet');
        
    } catch (error) {
        console.error('⚠️ Warnung bei UI-Setup:', error);
    }
}

// Globale Event-Listener
function setupGlobalEventListeners() {
    // Fenster-Events
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Tastatur-Shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Aktivitäts-Tracking für Auto-Logout
    document.addEventListener('click', resetAutoLogoutTimer);
    document.addEventListener('keypress', resetAutoLogoutTimer);
    document.addEventListener('mousemove', resetAutoLogoutTimer);
    
    console.log('✅ Globale Event-Listener gesetzt');
}

// Tab-Navigation einrichten
function setupTabNavigation() {
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const tabName = this.getAttribute('onclick')?.match(/openTab\('([^']+)'\)/)?.[1];
            if (tabName) {
                openTab(tabName, e);
            }
        });
    });
    
    console.log('✅ Tab-Navigation eingerichtet');
}

// Module global verfügbar machen
function makeModulesGloballyAvailable() {
    // Haupt-Funktionen
    window.openTab = openTab;
    window.updateLoadingProgress = updateLoadingProgress;
    window.showLoginScreen = showLoginScreen;
    window.showInitError = showInitError;
    
    console.log('✅ Module global verfügbar');
}

// === EVENT HANDLERS ===

function handleBeforeUnload(e) {
    if (currentUser && typeof cleanupListeners === 'function') {
        cleanupListeners();
    }
}

function handleOnline() {
    console.log('🌐 Wieder online');
    const statusEl = document.getElementById('dbStatus');
    if (statusEl) statusEl.innerHTML = '🔥 Verbunden';
}

function handleOffline() {
    console.log('📵 Offline');
    const statusEl = document.getElementById('dbStatus');
    if (statusEl) statusEl.innerHTML = '❌ Offline';
}

function handleKeyboardShortcuts(e) {
    // Alt+L für Logout
    if (e.altKey && e.key === 'l') {
        e.preventDefault();
        if (typeof firebaseLogout === 'function') {
            firebaseLogout();
        }
    }
}

function resetAutoLogoutTimer() {
    if (typeof window.resetAutoLogoutTimer === 'function') {
        window.resetAutoLogoutTimer();
    }
}

// === UI HELPER FUNCTIONS ===

function updateLoadingProgress(message, percent) {
    const progressEl = document.getElementById('loadingProgress');
    if (progressEl) {
        progressEl.innerHTML = `
            <p>${message}</p>
            <div style="width: 100%; background: #e0e0e0; border-radius: 5px; overflow: hidden;">
                <div style="width: ${percent}%; background: #667eea; height: 10px; transition: width 0.3s;"></div>
            </div>
        `;
    }
}

function showLoginScreen() {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
}

function showInitError(error) {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.innerHTML = `
            <div class="loading-card">
                <h1>❌ Fehler beim Starten</h1>
                <p style="color: #e74c3c; margin: 1rem 0;">${error.message}</p>
                <button onclick="location.reload()" class="btn">Neu laden</button>
            </div>
        `;
    }
}

// Tab Navigation
function openTab(tabName, evt) {
    try {
        const contents = document.querySelectorAll('.tab-content');
        const buttons = document.querySelectorAll('.tab-btn');

        contents.forEach(content => content.classList.remove('active'));
        buttons.forEach(button => button.classList.remove('active'));

        const targetContent = document.getElementById(tabName);
        if (targetContent) {
            targetContent.classList.add('active');
        }

        if (evt && evt.target) {
            evt.target.classList.add('active');
        }
        
        console.log('📑 Tab gewechselt zu:', tabName);
        
        // Tab-spezifische Inhalte laden
        setTimeout(() => {
            if (tabName === 'news' && typeof loadNews === 'function') loadNews();
            if (tabName === 'themen' && typeof loadThemen === 'function') loadThemen();
            if (tabName === 'gruppen' && typeof loadGruppen === 'function') loadGruppen();
            if (tabName === 'lehrer' && typeof loadLehrer === 'function') loadLehrer();
            if (tabName === 'daten' && typeof loadDatenverwaltung === 'function') loadDatenverwaltung();
            if (tabName === 'bewerten' && typeof loadBewertungen === 'function') loadBewertungen();
            if (tabName === 'vorlagen' && typeof loadVorlagen === 'function') loadVorlagen();
            if (tabName === 'uebersicht' && typeof loadUebersicht === 'function') loadUebersicht();
            if (tabName === 'adminvorlagen' && typeof loadAdminVorlagen === 'function') loadAdminVorlagen();
        }, 100);
        
    } catch (error) {
        console.error('❌ Fehler bei Tab-Wechsel:', error);
    }
}

console.log('✅ Firebase Init Module geladen');
