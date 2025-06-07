// Firebase Hauptsystem - Realtime Database
console.log('🚀 Firebase Main System geladen');

// Globale Daten-Cache für bessere Performance
let dataCache = {
    users: {},
    faecher: {},
    bewertungsCheckpoints: {},
    themen: {},
    gruppen: {},
    bewertungen: {},
    vorlagen: {},
    news: {},
    config: {},
    briefvorlage: {},
    staerkenFormulierungen: {}
};

// Realtime Listeners für automatische Updates
let activeListeners = {};

// Firebase App Initialisierung
async function initializeFirebaseApp() {
    console.log('🚀 Initialisiere Firebase App...');
    
    try {
        // Auth System starten
        initializeAuth();
        
        // Cache initialisieren
        initializeDataCache();
        
        // Erfolg
        document.getElementById('loadingScreen').style.display = 'none';
        console.log('✅ Firebase App erfolgreich initialisiert');
        
    } catch (error) {
        console.error('❌ Fehler bei Firebase Initialisierung:', error);
        document.getElementById('loadingProgress').innerHTML = 
            '<p style="color: #e74c3c;">Fehler: ' + error.message + '</p>';
    }
}

// Cache initialisieren
function initializeDataCache() {
    console.log('📂 Initialisiere Daten-Cache...');
    
    dataCache = {
        users: {},
        faecher: {
            'D': 'Deutsch',
            'M': 'Mathematik',
            'E': 'Englisch',
            'Ph': 'Physik',
            'Ch': 'Chemie',
            'Bio': 'Biologie',
            'G': 'Geschichte',
            'Geo': 'Geographie',
            'Gk': 'Gemeinschaftskunde',
            'Rel': 'Religion',
            'Eth': 'Ethik',
            'BK': 'Bildende Kunst',
            'Mu': 'Musik',
            'Sp': 'Sport',
            'Inf': 'Informatik',
            'T': 'Technik',
            'AES': 'AES',
            'F': 'Französisch',
            'WBS': 'WBS'
        },
        bewertungsCheckpoints: {},
        themen: {},
        gruppen: {},
        bewertungen: {},
        vorlagen: {},
        news: {},
        config: {},
        briefvorlage: {},
        staerkenFormulierungen: {}
    };
    
    console.log('✅ Daten-Cache initialisiert');
}

// System-Grunddaten laden (NACH LOGIN)
async function loadSystemData() {
    console.log('📂 Lade System-Grunddaten nach Login...');
    
    try {
        // Config laden
        await loadConfigSafe();
        
        // Bewertungs-Checkpoints laden
        await loadBewertungsCheckpointsSafe();
        
        // Briefvorlage laden
        await loadBriefvorlageSafe();
        
        // Stärken-Formulierungen laden
        await loadStaerkenFormulierungenSafe();
        
        console.log('✅ System-Grunddaten geladen');
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der Grunddaten:', error);
    }
}

// App nach Login initialisieren
async function initializeAppAfterLogin() {
    console.log('🚀 Initialisiere App nach Login...');
    
    if (!window.currentUser) {
        console.error('❌ Kein Benutzer angemeldet!');
        return;
    }
    
    console.log('👤 Benutzer:', window.currentUser.name, 'Rolle:', window.currentUser.role);
    
    try {
        // System-Daten laden
        await loadSystemData();
        
        // Realtime Listeners für benutzerspezifische Daten
        setupRealtimeListeners();
        
        // Lade Inhalte der aktiven Tabs
        if (typeof loadNews === 'function') loadNews();
        if (typeof loadThemen === 'function') loadThemen();
        
        updateFirebaseStatus();
        
        console.log('✅ App-Interface geladen');
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der App-Inhalte:', error);
    }
}

// Sichere Daten-Lade-Funktionen
async function loadConfigSafe() {
    try {
        const configRef = window.firebaseDB.ref(window.database, 'config/system');
        const snapshot = await window.firebaseDB.get(configRef);
        
        if (snapshot.exists()) {
            dataCache.config = snapshot.val();
            console.log('✅ Config geladen');
        } else {
            // Default Config
            dataCache.config = {
                schuljahr: '2025/26',
                appName: 'Zeig, was du kannst!',
                schule: {
                    name: 'Realschule Bad Schönborn',
                    adresse: 'Schulstraße 12 • 76669 Bad Schönborn',
                    telefon: '07253/12345',
                    email: 'info@rs-badschoenborn.de'
                }
            };
            console.log('✅ Default Config verwendet');
        }
    } catch (error) {
        console.error('❌ Config Fehler:', error);
        // Fallback Config
        dataCache.config = {
            schuljahr: '2025/26',
            appName: 'Zeig, was du kannst!'
        };
    }
}

async function loadBewertungsCheckpointsSafe() {
    try {
        const ref = window.firebaseDB.ref(window.database, 'config/bewertungsCheckpoints');
        const snapshot = await window.firebaseDB.get(ref);
        
        if (snapshot.exists()) {
            dataCache.bewertungsCheckpoints = snapshot.val();
            console.log('✅ Bewertungs-Checkpoints geladen');
        } else {
            // Default Checkpoints
            dataCache.bewertungsCheckpoints = {
                'Fachliches Arbeiten': [
                    'Arbeitet konzentriert und ausdauernd',
                    'Zeigt Interesse am Fach',
                    'Beteiligt sich aktiv am Unterricht',
                    'Erledigt Aufgaben selbstständig',
                    'Arbeitet sorgfältig und genau'
                ],
                'Soziale Kompetenzen': [
                    'Arbeitet gut im Team',
                    'Hilft anderen Schülern',
                    'Verhält sich respektvoll',
                    'Löst Konflikte friedlich',
                    'Übernimmt Verantwortung'
                ],
                'Methodische Kompetenzen': [
                    'Organisiert Arbeitsmaterial gut',
                    'Plant Arbeitsschritte sinnvoll',
                    'Nutzt verschiedene Lernmethoden',
                    'Kann Informationen gut strukturieren',
                    'Präsentiert Ergebnisse verständlich'
                ]
            };
            console.log('✅ Default Checkpoints verwendet');
        }
    } catch (error) {
        console.error('❌ Checkpoint Fehler:', error);
        dataCache.bewertungsCheckpoints = {};
    }
}

async function loadBriefvorlageSafe() {
    try {
        const ref = window.firebaseDB.ref(window.database, 'config/briefvorlage');
        const snapshot = await window.firebaseDB.get(ref);
        
        if (snapshot.exists()) {
            dataCache.briefvorlage = snapshot.val();
            console.log('✅ Briefvorlage geladen');
        } else {
            dataCache.briefvorlage = {};
            console.log('✅ Leere Briefvorlage verwendet');
        }
    } catch (error) {
        console.error('❌ Briefvorlage Fehler:', error);
        dataCache.briefvorlage = {};
    }
}

async function loadStaerkenFormulierungenSafe() {
    try {
        const ref = window.firebaseDB.ref(window.database, 'config/staerkenFormulierungen');
        const snapshot = await window.firebaseDB.get(ref);
        
        if (snapshot.exists()) {
            dataCache.staerkenFormulierungen = snapshot.val();
            console.log('✅ Stärken-Formulierungen geladen');
        } else {
            dataCache.staerkenFormulierungen = {};
            console.log('✅ Leere Stärken-Formulierungen verwendet');
        }
    } catch (error) {
        console.error('❌ Stärken Fehler:', error);
        dataCache.staerkenFormulierungen = {};
    }
}

// Realtime Listeners einrichten
function setupRealtimeListeners() {
    console.log('🔄 Richte Realtime Listeners ein...');
    
    // News Listener
    const newsRef = window.firebaseDB.ref(window.database, 'news');
    activeListeners.news = window.firebaseDB.onValue(newsRef, (snapshot) => {
        dataCache.news = snapshot.val() || {};
        if (typeof updateNewsDisplay === 'function') updateNewsDisplay();
    });
    
    // Themen Listener
    const themenRef = window.firebaseDB.ref(window.database, 'themen');
    activeListeners.themen = window.firebaseDB.onValue(themenRef, (snapshot) => {
        dataCache.themen = snapshot.val() || {};
        if (typeof updateThemenDisplay === 'function') updateThemenDisplay();
    });
    
    // Gruppen Listener
    const gruppenRef = window.firebaseDB.ref(window.database, 'gruppen');
    activeListeners.gruppen = window.firebaseDB.onValue(gruppenRef, (snapshot) => {
        dataCache.gruppen = snapshot.val() || {};
        if (typeof updateGruppenDisplay === 'function') updateGruppenDisplay();
    });
    
    console.log('✅ Realtime Listeners aktiv');
}

// Cleanup Listeners
function cleanupListeners() {
    console.log('🧹 Räume Listeners auf...');
    
    Object.entries(activeListeners).forEach(([key, unsubscribe]) => {
        if (typeof unsubscribe === 'function') {
            unsubscribe();
        }
    });
    
    activeListeners = {};
    console.log('✅ Listeners aufgeräumt');
}

// Hilfsfunktionen
function getFachNameFromGlobal(fachKuerzel) {
    return dataCache.faecher[fachKuerzel] || fachKuerzel;
}

function getAllFaecher() {
    return dataCache.faecher;
}

function sanitizeEmail(email) {
    return email.replace(/[.$#\[\]/]/g, '_');
}

function getTimestamp() {
    return new Date().toISOString();
}

function formatGermanDate(date = new Date()) {
    return date.toLocaleDateString('de-DE');
}

// Data Access Functions
function getNewsFromCache() {
    return Object.values(dataCache.news || {}).sort((a, b) => 
        new Date(b.datum || b.timestamp) - new Date(a.datum || a.timestamp)
    );
}

function getThemenFromCache() {
    return Object.values(dataCache.themen || {});
}

function getGruppenFromCache() {
    return Object.values(dataCache.gruppen || {});
}

function getBewertungenFromCache() {
    if (!window.currentUser) return [];
    
    const lehrerBewertungen = dataCache.bewertungen[window.currentUser.email] || {};
    return Object.values(lehrerBewertungen);
}

// Firebase Status aktualisieren
function updateFirebaseStatus() {
    const statusElement = document.getElementById('dbStatus');
    const userElement = document.getElementById('dbUser');
    const syncElement = document.getElementById('lastSync');
    
    if (statusElement) {
        if (window.currentUser) {
            statusElement.innerHTML = '🔥 Verbunden';
            statusElement.style.color = '#27ae60';
        } else {
            statusElement.innerHTML = '❌ Nicht angemeldet';
            statusElement.style.color = '#e74c3c';
        }
    }
    
    if (userElement) {
        userElement.textContent = window.currentUser ? window.currentUser.email : '-';
    }
    
    if (syncElement) {
        syncElement.textContent = new Date().toLocaleString('de-DE');
    }
}

// Globale Funktionen für andere Module
window.firebaseFunctions = {
    // Data Access
    getNewsFromCache,
    getThemenFromCache,
    getGruppenFromCache,
    getBewertungenFromCache,
    getAllFaecher,
    getFachNameFromGlobal,
    
    // Utilities
    sanitizeEmail,
    getTimestamp,
    formatGermanDate,
    
    // Auth
    requireAuth: () => window.authFunctions?.requireAuth() || false,
    requireAdmin: () => window.authFunctions?.requireAdmin() || false,
    isAdmin: () => window.authFunctions?.isAdmin() || false,
    getCurrentUserName: () => window.authFunctions?.getCurrentUserName() || 'Unbekannt',
    
    // Firebase References
    getDatabase: () => window.database,
    getDatabaseRef: (path) => window.firebaseDB.ref(window.database, path),
    
    // Cache Access
    dataCache
};

// Event Listeners
window.addEventListener('beforeunload', () => {
    cleanupListeners();
});

// Export functions
window.initializeDataCache = initializeDataCache;
window.initializeAppAfterLogin = initializeAppAfterLogin;
window.updateFirebaseStatus = updateFirebaseStatus;

console.log('✅ Firebase Main System bereit');
