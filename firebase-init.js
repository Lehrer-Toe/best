// Firebase System Initialisierung - Koordiniert alle Module
console.log('🚀 Firebase System Initialisierung gestartet');

// Globale Initialisierungskonfiguration
const FIREBASE_INIT_CONFIG = {
    requiredModules: [
        'firebaseApp', 'auth', 'database',
        'firebaseAuth', 'firebaseDB',
        'authFunctions', 'firebaseFunctions'
    ],
    loadingSteps: [
        'Firebase SDK laden',
        'Authentication initialisieren',
        'Database verbinden',
        'System-Daten laden',
        'Benutzer-Interface vorbereiten'
    ]
};

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
        
        // Schritt 3: Database vorbereiten (OHNE Permission-Test)
        updateLoadingProgress('Database vorbereiten...', 60);
        await prepareDatabaseConnection();
        
        // Schritt 4: Grunddaten vorbereiten (OHNE Laden, da kein User angemeldet)
        updateLoadingProgress('System vorbereiten...', 80);
        await prepareSystemData();
        
        // Schritt 5: UI vorbereiten
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
    
    // Warte kurz auf Auth-Initialisierung
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('✅ Firebase Authentication initialisiert');
}

// Database-Verbindung vorbereiten (OHNE Permission-Test)
async function prepareDatabaseConnection() {
    try {
        // Nur prüfen ob Database-Objekt verfügbar ist
        if (!window.database || !window.firebaseDB) {
            throw new Error('Firebase Database Objekte nicht verfügbar');
        }
        
        console.log('✅ Firebase Database vorbereitet');
        
    } catch (error) {
        throw new Error('Firebase Database nicht verfügbar: ' + error.message);
    }
}

// System-Daten vorbereiten (OHNE Laden)
async function prepareSystemData() {
    try {
        // Nur Cache initialisieren, aber nicht laden
        // Daten werden erst nach dem Login geladen
        console.log('✅ System-Daten vorbereitet (werden nach Login geladen)');
        
    } catch (error) {
        console.error('⚠️ Warnung bei System-Vorbereitung:', error);
        // Nicht kritisch - weitermachen
    }
}

// Benutzer-Interface vorbereiten
async function setupUserInterface() {
    try {
        // Globale Event-Listener setzen
        setupGlobalEventListeners();
        
        // Tab-Navigation vorbereiten
        setupTabNavigation();
        
        // Alle Module verfügbar machen
        makeModulesGloballyAvailable();
        
        console.log('✅ Benutzer-Interface vorbereitet');
        
    } catch (error) {
        console.error('⚠️ Warnung bei UI-Setup:', error);
        // Nicht kritisch - weitermachen
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
    
    console.log('✅ Globale Event-Listener gesetzt');
}

// Tab-Navigation einrichten
function setupTabNavigation() {
    // Alle Tab-Buttons finden und Event-Listener hinzufügen
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
    // Haupt-Funktionen global verfügbar machen
    window.openTab = openTab;
    window.firebaseLogout = firebaseLogout;
    
    // Admin-Funktionen
    if (window.adminFunctions) {
        Object.assign(window, window.adminFunctions);
    }
    
    // Datenverwaltung-Funktionen
    if (window.datenverwaltungFunctions) {
        Object.assign(window, window.datenverwaltungFunctions);
    }
    
    // Übersicht-Funktionen
    if (window.uebersichtFunctions) {
        Object.assign(window, window.uebersichtFunctions);
    }
    
    // Bewertungs-Funktionen
    if (window.bewertungsFunctions) {
        Object.assign(window, window.bewertungsFunctions);
    }
    
    // Gruppen-Funktionen
    if (window.gruppenFunctions) {
        Object.assign(window, window.gruppenFunctions);
    }
    
    // Vorlagen-Funktionen
    if (window.vorlagenFunctions) {
        Object.assign(window, window.vorlagenFunctions);
    }
    
    // Themen-Funktionen
    if (window.themenFunctions) {
        Object.assign(window, window.themenFunctions);
    }
    
    // News-Funktionen
    if (window.newsFunctions) {
        Object.assign(window, window.newsFunctions);
    }
    
    // PDF-Funktionen
    if (window.pdfFunctions) {
        Object.assign(window, window.pdfFunctions);
    }
    
    console.log('✅ Module global verfügbar gemacht');
}

// Loading-Progress aktualisieren
function updateLoadingProgress(message, percentage) {
    const progressElement = document.getElementById('loadingProgress');
    if (progressElement) {
        progressElement.innerHTML = `
            <div style="margin-bottom: 10px;">${message}</div>
            <div style="background: #f3f3f3; border-radius: 10px; overflow: hidden;">
                <div style="background: #667eea; height: 6px; width: ${percentage}%; transition: width 0.3s;"></div>
            </div>
            <small>${percentage}%</small>
        `;
    }
}

// Login-Screen anzeigen
function showLoginScreen() {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
}

// Initialisierungsfehler anzeigen
function showInitError(error) {
    const progressElement = document.getElementById('loadingProgress');
    if (progressElement) {
        progressElement.innerHTML = `
            <div style="color: #e74c3c; font-weight: bold;">❌ Initialisierungsfehler</div>
            <div style="margin: 10px 0; padding: 10px; background: #fdf2f2; border-radius: 5px;">
                ${error.message}
            </div>
            <button onclick="window.location.reload()" style="background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                Seite neu laden
            </button>
        `;
    }
}

// === EVENT HANDLER ===

// Vor dem Schließen
function handleBeforeUnload(e) {
    if (currentUser) {
        e.preventDefault();
        e.returnValue = 'Möchten Sie die Anwendung wirklich schließen?';
    }
}

// Online/Offline Events
function handleOnline() {
    console.log('🌐 Verbindung wiederhergestellt');
    if (window.authFunctions && window.authFunctions.updateFirebaseStatus) {
        window.authFunctions.updateFirebaseStatus();
    }
}

function handleOffline() {
    console.log('📴 Verbindung verloren');
    if (window.authFunctions && window.authFunctions.updateFirebaseStatus) {
        window.authFunctions.updateFirebaseStatus();
    }
}

// Tastatur-Shortcuts
function handleKeyboardShortcuts(e) {
    // Nur für eingeloggte Benutzer
    if (!currentUser) return;
    
    // Ctrl+Alt+Kombinationen
    if (e.ctrlKey && e.altKey) {
        switch (e.key) {
            case '1':
                e.preventDefault();
                openTab('news');
                break;
            case '2':
                e.preventDefault();
                if (window.firebaseFunctions.isLehrer()) openTab('themen');
                break;
            case '3':
                e.preventDefault();
                if (window.firebaseFunctions.isLehrer()) openTab('gruppen');
                break;
            case '4':
                e.preventDefault();
                if (window.firebaseFunctions.isLehrer()) openTab('bewerten');
                break;
            case '5':
                e.preventDefault();
                if (window.firebaseFunctions.isLehrer()) openTab('uebersicht');
                break;
            case 'l':
                e.preventDefault();
                firebaseLogout();
                break;
        }
    }
}

// === HELPER FUNKTIONEN ===

// Fehlerbehandlung für Module
function safeModuleExecution(moduleName, func, ...args) {
    try {
        return func(...args);
    } catch (error) {
        console.error(`❌ Fehler in Modul ${moduleName}:`, error);
        return null;
    }
}

// System-Status prüfen
function checkSystemHealth() {
    const health = {
        firebase: !!window.firebaseApp,
        auth: !!window.auth,
        database: !!window.database,
        user: !!currentUser,
        modules: {
            auth: typeof window.authFunctions === 'object',
            firebase: typeof window.firebaseFunctions === 'object',
            news: typeof window.newsFunctions === 'object',
            themen: typeof window.themenFunctions === 'object',
            gruppen: typeof window.gruppenFunctions === 'object',
            bewertungen: typeof window.bewertungsFunctions === 'object',
            pdf: typeof window.pdfFunctions === 'object',
            vorlagen: typeof window.vorlagenFunctions === 'object',
            admin: typeof window.adminFunctions === 'object',
            datenverwaltung: typeof window.datenverwaltungFunctions === 'object',
            uebersicht: typeof window.uebersichtFunctions === 'object'
        }
    };
    
    console.log('🔍 System-Status:', health);
    return health;
}

// Debug-Modus
function enableDebugMode() {
    window.debugMode = true;
    window.systemHealth = checkSystemHealth;
    window.firebaseConfig = {
        app: window.firebaseApp,
        auth: window.auth,
        database: window.database
    };
    
    console.log('🐛 Debug-Modus aktiviert');
    console.log('Verfügbare Debug-Funktionen: systemHealth(), firebaseConfig');
}

// Bei Development automatisch Debug-Modus aktivieren
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    enableDebugMode();
}

// === EXPORT FÜR ANDERE MODULE ===

window.systemInit = {
    checkSystemHealth,
    enableDebugMode,
    safeModuleExecution,
    updateLoadingProgress
};

console.log('✅ Firebase System Initialisierung bereit');

// Auto-Start bei DOM Ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM bereit - warte auf Firebase SDK...');
    
    // Prüfe ob Firebase SDK geladen ist
    const checkFirebaseReady = setInterval(() => {
        if (window.firebaseApp && window.auth && window.database) {
            clearInterval(checkFirebaseReady);
            console.log('🔥 Firebase SDK erkannt - starte Initialisierung');
            // initializeFirebaseApp wird durch das module script aufgerufen
        }
    }, 100);
    
    // Timeout nach 10 Sekunden
    setTimeout(() => {
        clearInterval(checkFirebaseReady);
        if (!window.firebaseApp) {
            showInitError(new Error('Firebase SDK konnte nicht geladen werden. Prüfen Sie Ihre Internetverbindung.'));
        }
    }, 10000);
});

// Finale Bestätigung
console.log('🎉 Firebase System vollständig geladen und bereit!');
