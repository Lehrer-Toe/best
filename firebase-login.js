// Firebase Hauptsystem - Stabile Version
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
let isInitialized = false;

// Firebase App Initialisierung - Stabilere Version
async function initializeFirebaseApp() {
    console.log('🚀 Initialisiere Firebase App...');
    
    try {
        // Verhindere mehrfache Initialisierung
        if (isInitialized) {
            console.log('Firebase bereits initialisiert');
            return;
        }
        
        // Auth System starten
        initializeAuth();
        
        // Cache initialisieren
        initializeDataCache();
        
        // Als initialisiert markieren
        isInitialized = true;
        
        // Loading Screen ausblenden
        document.getElementById('loadingScreen').style.display = 'none';
        console.log('✅ Firebase App erfolgreich initialisiert');
        
    } catch (error) {
        console.error('❌ Fehler bei Firebase Initialisierung:', error);
        
        // Fallback-UI anzeigen
        const progressElement = document.getElementById('loadingProgress');
        if (progressElement) {
            progressElement.innerHTML = `
                <div style="color: #e74c3c; margin-bottom: 15px;">
                    ⚠️ Initialisierungsfehler
                </div>
                <div style="font-size: 0.9rem; margin-bottom: 15px;">
                    ${error.message}
                </div>
                <button onclick="window.location.reload()" 
                        style="background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                    Seite neu laden
                </button>
            `;
        }
    }
}

// Cache initialisieren (OHNE Daten zu laden)
function initializeDataCache() {
    console.log('📂 Initialisiere Daten-Cache...');
    
    // Cache mit leeren Objekten initialisieren
    dataCache = {
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
    
    console.log('✅ Daten-Cache initialisiert');
}

// System-Grunddaten laden (NACH LOGIN) - Mit besserer Fehlerbehandlung
async function loadSystemData() {
    console.log('📂 Lade System-Grunddaten nach Login...');
    
    const loadPromises = [
        loadConfigSafe(),
        loadFaecherSafe(),
        loadBewertungsCheckpointsSafe(),
        loadBriefvorlageSafe(),
        loadStaerkenFormulierungenSafe()
    ];
    
    // Alle parallel laden, aber Fehler nicht propagieren
    const results = await Promise.allSettled(loadPromises);
    
    results.forEach((result, index) => {
        if (result.status === 'rejected') {
            console.warn(`Grunddaten-Laden ${index} fehlgeschlagen:`, result.reason);
        }
    });
    
    console.log('✅ System-Grunddaten geladen (mit Fallbacks bei Fehlern)');
}

// App nach Login initialisieren - Robuster
async function initializeAppAfterLogin() {
    console.log('🚀 Initialisiere App nach Login...');
    
    if (!currentUser) {
        console.error('❌ Kein Benutzer angemeldet!');
        return;
    }
    
    console.log('👤 Benutzer:', currentUser.name, 'Rolle:', currentUser.role);
    
    try {
        // System-Daten laden (nicht blockierend)
        await loadSystemData();
        
        // Realtime Listeners einrichten (nicht blockierend)
        try {
            setupRealtimeListeners();
        } catch (listenerError) {
            console.warn('Listener Setup fehlgeschlagen:', listenerError);
        }
        
        // Grundlegende App-Inhalte laden (nicht blockierend)
        try {
            loadAppContent();
        } catch (contentError) {
            console.warn('Content Loading fehlgeschlagen:', contentError);
        }
        
        // Firebase Status aktualisieren
        updateFirebaseStatus();
        
        console.log('✅ App-Interface geladen');
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der App-Inhalte:', error);
        
        // Auch bei Fehlern versuchen, grundlegende Funktionen zu laden
        try {
            loadAppContent();
            updateFirebaseStatus();
        } catch (fallbackError) {
            console.error('❌ Auch Fallback fehlgeschlagen:', fallbackError);
        }
    }
}

// App-Inhalte laden - Sicher
function loadAppContent() {
    try {
        if (typeof loadNews === 'function') {
            loadNews();
        }
    } catch (error) {
        console.warn('News laden fehlgeschlagen:', error);
    }
    
    try {
        if (typeof loadThemen === 'function') {
            loadThemen();
        }
    } catch (error) {
        console.warn('Themen laden fehlgeschlagen:', error);
    }
}

// === SICHERE DATEN-LADE-FUNKTIONEN ===

// Config sicher laden
async function loadConfigSafe() {
    try {
        const configRef = window.firebaseDB.ref(window.database, 'config/system');
        const snapshot = await window.firebaseDB.get(configRef);
        
        if (snapshot.exists()) {
            dataCache.config = snapshot.val();
            console.log('✅ Config geladen');
        } else {
            throw new Error('Config nicht gefunden');
        }
    } catch (error) {
        console.warn('Config Fallback verwendet:', error.message);
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
    }
}

// Fächer sicher laden
async function loadFaecherSafe() {
    try {
        const faecherRef = window.firebaseDB.ref(window.database, 'system/faecher');
        const snapshot = await window.firebaseDB.get(faecherRef);
        
        if (snapshot.exists()) {
            dataCache.faecher = snapshot.val();
            console.log('✅ Fächer geladen:', Object.keys(dataCache.faecher).length);
        } else {
            throw new Error('Fächer nicht gefunden');
        }
    } catch (error) {
        console.warn('Fächer Fallback verwendet:', error.message);
        dataCache.faecher = {
            "D": "Deutsch",
            "M": "Mathematik",
            "E": "Englisch",
            "FR": "Französisch",
            "T": "Technik",
            "AES": "AES",
            "G": "Geschichte",
            "GK": "Gemeinschaftskunde",
            "BIO": "Biologie",
            "PH": "Physik",
            "SP": "Sport",
            "BK": "Bildende Kunst",
            "IT": "Informatik",
            "WBS": "WBS",
            "REL": "Religion",
            "ETH": "Ethik",
            "ALL": "Allgemein"
        };
    }
}

// Bewertungs-Checkpoints sicher laden
async function loadBewertungsCheckpointsSafe() {
    try {
        const checkpointsRef = window.firebaseDB.ref(window.database, 'system/bewertungsCheckpoints');
        const snapshot = await window.firebaseDB.get(checkpointsRef);
        
        if (snapshot.exists()) {
            dataCache.bewertungsCheckpoints = snapshot.val();
            console.log('✅ Bewertungs-Checkpoints geladen');
        } else {
            throw new Error('Checkpoints nicht gefunden');
        }
    } catch (error) {
        console.warn('Checkpoints Fallback verwendet:', error.message);
        dataCache.bewertungsCheckpoints = {
            "Fachliches Arbeiten": [
                "Du arbeitest konzentriert und ausdauernd",
                "Du sammelst Informationen zielgerichtet",
                "Du setzt dein Wissen sinnvoll ein"
            ],
            "Zusammenarbeit": [
                "Du arbeitest konstruktiv im Team",
                "Du übernimmst Verantwortung in der Gruppe"
            ],
            "Kommunikation": [
                "Du drückst dich klar und verständlich aus",
                "Du hältst Blickkontakt und sprichst sicher"
            ]
        };
    }
}

// Briefvorlage sicher laden
async function loadBriefvorlageSafe() {
    try {
        const briefRef = window.firebaseDB.ref(window.database, 'system/briefvorlage');
        const snapshot = await window.firebaseDB.get(briefRef);
        
        if (snapshot.exists()) {
            dataCache.briefvorlage = snapshot.val();
            console.log('✅ Briefvorlage geladen');
        } else {
            throw new Error('Briefvorlage nicht gefunden');
        }
    } catch (error) {
        console.warn('Briefvorlage Fallback verwendet:', error.message);
        dataCache.briefvorlage = {
            anrede: "Liebe/r [NAME],\n\nim Rahmen des Projekts \"Zeig, was du kannst!\" hast du folgende Stärken gezeigt:",
            schluss: "Wir gratulieren dir zu diesen Leistungen und freuen uns auf weitere erfolgreiche Projekte.\n\nMit freundlichen Grüßen\nDein Lehrerteam"
        };
    }
}

// Stärken-Formulierungen sicher laden
async function loadStaerkenFormulierungenSafe() {
    try {
        const staerkenRef = window.firebaseDB.ref(window.database, 'system/staerkenFormulierungen');
        const snapshot = await window.firebaseDB.get(staerkenRef);
        
        if (snapshot.exists()) {
            dataCache.staerkenFormulierungen = snapshot.val();
            console.log('✅ Stärken-Formulierungen geladen');
        } else {
            throw new Error('Formulierungen nicht gefunden');
        }
    } catch (error) {
        console.warn('Formulierungen Fallback verwendet:', error.message);
        
        // Default Formulierungen aus Checkpoints erstellen
        const defaultFormulierungen = {};
        Object.entries(dataCache.bewertungsCheckpoints).forEach(([kategorie, checkpoints]) => {
            checkpoints.forEach((text, index) => {
                const key = `${kategorie}_${index}`;
                defaultFormulierungen[key] = text;
            });
        });
        
        dataCache.staerkenFormulierungen = defaultFormulierungen;
    }
}

// === REALTIME LISTENERS - Robuster ===

// Realtime Listeners einrichten - Mit Fehlerbehandlung
function setupRealtimeListeners() {
    console.log('👂 Richte Realtime Listeners ein...');
    
    try {
        setupNewsListener();
        setupThemenListener();
        setupGruppenListener();
        setupBewertungenListener();
        
        console.log('✅ Realtime Listeners aktiv');
        
    } catch (error) {
        console.error('❌ Fehler beim Einrichten der Listeners:', error);
    }
}

// Einzelne Listener mit try-catch
function setupNewsListener() {
    try {
        const newsRef = window.firebaseDB.ref(window.database, 'news');
        activeListeners.news = window.firebaseDB.onValue(newsRef, (snapshot) => {
            try {
                if (snapshot.exists()) {
                    dataCache.news = snapshot.val();
                    console.log('🔄 News Update erhalten');
                    if (typeof loadNews === 'function') {
                        loadNews();
                    }
                }
            } catch (error) {
                console.warn('News Update Fehler:', error);
            }
        });
    } catch (error) {
        console.warn('News Listener Setup Fehler:', error);
    }
}

function setupThemenListener() {
    try {
        const themenRef = window.firebaseDB.ref(window.database, 'themen');
        activeListeners.themen = window.firebaseDB.onValue(themenRef, (snapshot) => {
            try {
                if (snapshot.exists()) {
                    dataCache.themen = snapshot.val();
                    console.log('🔄 Themen Update erhalten');
                    if (typeof loadThemen === 'function') {
                        loadThemen();
                    }
                }
            } catch (error) {
                console.warn('Themen Update Fehler:', error);
            }
        });
    } catch (error) {
        console.warn('Themen Listener Setup Fehler:', error);
    }
}

function setupGruppenListener() {
    try {
        const gruppenRef = window.firebaseDB.ref(window.database, 'gruppen');
        activeListeners.gruppen = window.firebaseDB.onValue(gruppenRef, (snapshot) => {
            try {
                if (snapshot.exists()) {
                    dataCache.gruppen = snapshot.val();
                    console.log('🔄 Gruppen Update erhalten');
                    if (typeof loadGruppen === 'function') {
                        loadGruppen();
                    }
                }
            } catch (error) {
                console.warn('Gruppen Update Fehler:', error);
            }
        });
    } catch (error) {
        console.warn('Gruppen Listener Setup Fehler:', error);
    }
}

function setupBewertungenListener() {
    try {
        if (currentUser && currentUser.role === 'lehrer') {
            const bewertungenRef = window.firebaseDB.ref(window.database, `bewertungen/${sanitizeEmail(currentUser.email)}`);
            activeListeners.bewertungen = window.firebaseDB.onValue(bewertungenRef, (snapshot) => {
                try {
                    if (snapshot.exists()) {
                        dataCache.bewertungen[currentUser.email] = snapshot.val();
                        console.log('🔄 Bewertungen Update erhalten');
                        if (typeof loadBewertungen === 'function') {
                            loadBewertungen();
                        }
                    }
                } catch (error) {
                    console.warn('Bewertungen Update Fehler:', error);
                }
            });
        }
    } catch (error) {
        console.warn('Bewertungen Listener Setup Fehler:', error);
    }
}

// Listeners aufräumen (bei Logout)
function cleanupListeners() {
    console.log('🧹 Räume Realtime Listeners auf...');
    
    Object.entries(activeListeners).forEach(([key, unsubscribe]) => {
        try {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        } catch (error) {
            console.warn(`Fehler beim Aufräumen von ${key} Listener:`, error);
        }
    });
    
    activeListeners = {};
    console.log('✅ Listeners aufgeräumt');
}

// === HILFSFUNKTIONEN ===

// Tab Navigation - Robuster
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
        } else {
            const fallbackBtn = document.querySelector(`.tab-btn[onclick*="openTab('${tabName}')"]`);
            if (fallbackBtn) fallbackBtn.classList.add('active');
        }
        
        console.log('📑 Tab gewechselt zu:', tabName);
        
        // Tab-spezifische Inhalte laden - Mit Fehlerbehandlung
        setTimeout(() => {
            try {
                if (tabName === 'news' && typeof loadNews === 'function') loadNews();
                if (tabName === 'themen' && typeof loadThemen === 'function') loadThemen();
                if (tabName === 'gruppen' && typeof loadGruppen === 'function') loadGruppen();
                if (tabName === 'lehrer' && typeof loadLehrer === 'function') loadLehrer();
                if (tabName === 'daten' && typeof loadDatenverwaltung === 'function') loadDatenverwaltung();
                if (tabName === 'bewerten' && typeof loadBewertungen === 'function') loadBewertungen();
                if (tabName === 'vorlagen' && typeof loadVorlagen === 'function') loadVorlagen();
                if (tabName === 'uebersicht' && typeof loadUebersicht === 'function') loadUebersicht();
                if (tabName === 'adminvorlagen' && typeof loadAdminVorlagen === 'function') loadAdminVorlagen();
            } catch (error) {
                console.warn(`Fehler beim Laden von Tab ${tabName}:`, error);
            }
        }, 100);
        
    } catch (error) {
        console.error('❌ Fehler bei Tab-Wechsel:', error);
    }
}

// Hilfsfunktionen
function getFachNameFromGlobal(fachKuerzel) {
    return dataCache.faecher[fachKuerzel] || fachKuerzel || 'Unbekannt';
}

function getAllFaecher() {
    return dataCache.faecher || {};
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

// === DATA ACCESS FUNCTIONS ===

function getNewsFromCache() {
    try {
        return Object.values(dataCache.news || {}).sort((a, b) => 
            new Date(b.datum || b.timestamp) - new Date(a.datum || a.timestamp)
        );
    } catch (error) {
        console.warn('News Cache Fehler:', error);
        return [];
    }
}

function getThemenFromCache() {
    try {
        return Object.values(dataCache.themen || {});
    } catch (error) {
        console.warn('Themen Cache Fehler:', error);
        return [];
    }
}

function getGruppenFromCache() {
    try {
        return Object.values(dataCache.gruppen || {});
    } catch (error) {
        console.warn('Gruppen Cache Fehler:', error);
        return [];
    }
}

function getBewertungenFromCache() {
    try {
        if (!currentUser) return [];
        
        const lehrerBewertungen = dataCache.bewertungen[currentUser.email] || {};
        return Object.values(lehrerBewertungen);
    } catch (error) {
        console.warn('Bewertungen Cache Fehler:', error);
        return [];
    }
}

// Firebase Status aktualisieren
function updateFirebaseStatus() {
    try {
        const statusElement = document.getElementById('dbStatus');
        const userElement = document.getElementById('dbUser');
        const syncElement = document.getElementById('lastSync');
        
        if (statusElement) {
            if (currentUser) {
                statusElement.innerHTML = '🔥 Verbunden';
                statusElement.style.color = '#27ae60';
            } else {
                statusElement.innerHTML = '❌ Nicht angemeldet';
                statusElement.style.color = '#e74c3c';
            }
        }
        
        if (userElement) {
            userElement.textContent = currentUser ? currentUser.email : '-';
        }
        
        if (syncElement) {
            syncElement.textContent = new Date().toLocaleString('de-DE');
        }
    } catch (error) {
        console.warn('Firebase Status Update Fehler:', error);
    }
}

// === GLOBAL VERFÜGBAR MACHEN ===

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
    
    // Auth (sichere Verweise)
    requireAuth: () => window.authFunctions ? window.authFunctions.requireAuth() : false,
    requireAdmin: () => window.authFunctions ? window.authFunctions.requireAdmin() : false,
    isAdmin: () => window.authFunctions ? window.authFunctions.isAdmin() : false,
    getCurrentUserName: () => window.authFunctions ? window.authFunctions.getCurrentUserName() : 'Unbekannt',
    
    // Firebase References
    getDatabase: () => window.database,
    getDatabaseRef: (path) => window.firebaseDB.ref(window.database, path),
    
    // Cache Access
    dataCache
};

// Window Event Listeners
window.addEventListener('beforeunload', () => {
    cleanupListeners();
});

console.log('✅ Firebase Main System bereit - Stabile Version');
