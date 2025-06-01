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
        
        // Grunddaten laden
        await loadSystemData();
        
        // Erfolg
        document.getElementById('loadingScreen').style.display = 'none';
        console.log('✅ Firebase App erfolgreich initialisiert');
        
    } catch (error) {
        console.error('❌ Fehler bei Firebase Initialisierung:', error);
        document.getElementById('loadingProgress').innerHTML = 
            '<p style="color: #e74c3c;">Fehler: ' + error.message + '</p>';
    }
}

// System-Grunddaten laden
async function loadSystemData() {
    console.log('📂 Lade System-Grunddaten...');
    
    try {
        // Config laden
        await loadConfig();
        
        // Fächer laden
        await loadFaecher();
        
        // Bewertungs-Checkpoints laden
        await loadBewertungsCheckpoints();
        
        // Briefvorlage laden
        await loadBriefvorlage();
        
        // Stärken-Formulierungen laden
        await loadStaerkenFormulierungen();
        
        console.log('✅ System-Grunddaten geladen');
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der Grunddaten:', error);
        throw error;
    }
}

// App nach Login initialisieren
function initializeAppAfterLogin() {
    console.log('🚀 Initialisiere App nach Login...');
    
    if (!currentUser) {
        console.error('❌ Kein Benutzer angemeldet!');
        return;
    }
    
    console.log('👤 Benutzer:', currentUser.name, 'Rolle:', currentUser.role);
    
    try {
        // Realtime Listeners für benutzerspezifische Daten
        setupRealtimeListeners();
        
        // Lade Inhalte der aktiven Tabs
        loadNews();
        loadThemen();
        updateFirebaseStatus();
        
        console.log('✅ App-Interface geladen');
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der App-Inhalte:', error);
    }
}

// === DATEN LADEN ===

// Config laden
async function loadConfig() {
    try {
        const configRef = window.firebaseDB.ref(window.database, 'config/system');
        const snapshot = await window.firebaseDB.get(configRef);
        
        if (snapshot.exists()) {
            dataCache.config = snapshot.val();
            console.log('✅ Config geladen');
        } else {
            // Default Config erstellen
            const defaultConfig = {
                schuljahr: '2025/26',
                appName: 'Zeig, was du kannst!',
                schule: {
                    name: 'Realschule Bad Schönborn',
                    adresse: 'Schulstraße 12 • 76669 Bad Schönborn',
                    telefon: '07253/12345',
                    email: 'info@rs-badschoenborn.de'
                }
            };
            
            await window.firebaseDB.set(configRef, defaultConfig);
            dataCache.config = defaultConfig;
            console.log('✅ Default Config erstellt');
        }
    } catch (error) {
        console.error('❌ Fehler beim Laden der Config:', error);
        throw error;
    }
}

// Fächer laden
async function loadFaecher() {
    try {
        const faecherRef = window.firebaseDB.ref(window.database, 'system/faecher');
        const snapshot = await window.firebaseDB.get(faecherRef);
        
        if (snapshot.exists()) {
            dataCache.faecher = snapshot.val();
            console.log('✅ Fächer geladen:', Object.keys(dataCache.faecher).length);
        } else {
            // Default Fächer erstellen
            const defaultFaecher = {
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
            
            await window.firebaseDB.set(faecherRef, defaultFaecher);
            dataCache.faecher = defaultFaecher;
            console.log('✅ Default Fächer erstellt');
        }
    } catch (error) {
        console.error('❌ Fehler beim Laden der Fächer:', error);
        throw error;
    }
}

// Bewertungs-Checkpoints laden
async function loadBewertungsCheckpoints() {
    try {
        const checkpointsRef = window.firebaseDB.ref(window.database, 'system/bewertungsCheckpoints');
        const snapshot = await window.firebaseDB.get(checkpointsRef);
        
        if (snapshot.exists()) {
            dataCache.bewertungsCheckpoints = snapshot.val();
            console.log('✅ Bewertungs-Checkpoints geladen');
        } else {
            // Default Checkpoints erstellen
            const defaultCheckpoints = {
                "Fachliches Arbeiten": [
                    "Du arbeitest konzentriert und ausdauernd",
                    "Du sammelst Informationen zielgerichtet",
                    "Du setzt dein Wissen sinnvoll ein",
                    "Du denkst kreativ und lösungsorientiert",
                    "Du strukturierst deine Arbeit logisch und klar",
                    "Du zeigst Verantwortungsbewusstsein beim Arbeiten"
                ],
                "Zusammenarbeit": [
                    "Du arbeitest konstruktiv im Team",
                    "Du übernimmst Verantwortung in der Gruppe",
                    "Du hörst anderen zu und respektierst Meinungen",
                    "Du unterstützt andere aktiv",
                    "Du löst Konflikte fair und eigenständig"
                ],
                "Kommunikation": [
                    "Du drückst dich klar und verständlich aus",
                    "Du hältst Blickkontakt und sprichst sicher",
                    "Du kannst Feedback geben und annehmen",
                    "Du nimmst aktiv an Gesprächen teil",
                    "Du kannst Inhalte gut präsentieren"
                ],
                "Eigenständigkeit": [
                    "Du arbeitest selbstständig und zielgerichtet",
                    "Du zeigst Eigeninitiative",
                    "Du triffst Entscheidungen und stehst dazu",
                    "Du erkennst Probleme und gehst sie an"
                ],
                "Reflexionsfähigkeit": [
                    "Du kannst deine Stärken und Schwächen benennen",
                    "Du denkst über deinen Lernprozess nach",
                    "Du lernst aus Fehlern und verbesserst dich",
                    "Du beschreibst, was gut lief und was nicht"
                ],
                "Persönlichkeitsentwicklung": [
                    "Du zeigst Mut, neue Wege zu gehen",
                    "Du bleibst auch bei Schwierigkeiten dran",
                    "Du entwickelst dich im Laufe des Projekts spürbar weiter",
                    "Du nutzt Rückmeldungen zur Verbesserung"
                ]
            };
            
            await window.firebaseDB.set(checkpointsRef, defaultCheckpoints);
            dataCache.bewertungsCheckpoints = defaultCheckpoints;
            console.log('✅ Default Bewertungs-Checkpoints erstellt');
        }
    } catch (error) {
        console.error('❌ Fehler beim Laden der Bewertungs-Checkpoints:', error);
        throw error;
    }
}

// Briefvorlage laden
async function loadBriefvorlage() {
    try {
        const briefRef = window.firebaseDB.ref(window.database, 'system/briefvorlage');
        const snapshot = await window.firebaseDB.get(briefRef);
        
        if (snapshot.exists()) {
            dataCache.briefvorlage = snapshot.val();
            console.log('✅ Briefvorlage geladen');
        } else {
            // Default Briefvorlage erstellen
            const defaultBrief = {
                anrede: "Liebe/r [NAME],\n\nim Rahmen des Projekts \"Zeig, was du kannst!\" hast du folgende Stärken gezeigt:",
                schluss: "Wir gratulieren dir zu diesen Leistungen und freuen uns auf weitere erfolgreiche Projekte.\n\nMit freundlichen Grüßen\nDein Lehrerteam"
            };
            
            await window.firebaseDB.set(briefRef, defaultBrief);
            dataCache.briefvorlage = defaultBrief;
            console.log('✅ Default Briefvorlage erstellt');
        }
    } catch (error) {
        console.error('❌ Fehler beim Laden der Briefvorlage:', error);
        throw error;
    }
}

// Stärken-Formulierungen laden
async function loadStaerkenFormulierungen() {
    try {
        const staerkenRef = window.firebaseDB.ref(window.database, 'system/staerkenFormulierungen');
        const snapshot = await window.firebaseDB.get(staerkenRef);
        
        if (snapshot.exists()) {
            dataCache.staerkenFormulierungen = snapshot.val();
            console.log('✅ Stärken-Formulierungen geladen');
        } else {
            // Default Formulierungen erstellen (basierend auf Checkpoints)
            const defaultFormulierungen = {};
            
            Object.entries(dataCache.bewertungsCheckpoints).forEach(([kategorie, checkpoints]) => {
                checkpoints.forEach((text, index) => {
                    const key = `${kategorie}_${index}`;
                    defaultFormulierungen[key] = text;
                });
            });
            
            await window.firebaseDB.set(staerkenRef, defaultFormulierungen);
            dataCache.staerkenFormulierungen = defaultFormulierungen;
            console.log('✅ Default Stärken-Formulierungen erstellt');
        }
    } catch (error) {
        console.error('❌ Fehler beim Laden der Stärken-Formulierungen:', error);
        throw error;
    }
}

// === REALTIME LISTENERS ===

// Realtime Listeners einrichten
function setupRealtimeListeners() {
    console.log('👂 Richte Realtime Listeners ein...');
    
    // News Listener
    const newsRef = window.firebaseDB.ref(window.database, 'news');
    activeListeners.news = window.firebaseDB.onValue(newsRef, (snapshot) => {
        if (snapshot.exists()) {
            dataCache.news = snapshot.val();
            console.log('🔄 News Update erhalten');
            if (typeof loadNews === 'function') {
                loadNews();
            }
        }
    });
    
    // Themen Listener
    const themenRef = window.firebaseDB.ref(window.database, 'themen');
    activeListeners.themen = window.firebaseDB.onValue(themenRef, (snapshot) => {
        if (snapshot.exists()) {
            dataCache.themen = snapshot.val();
            console.log('🔄 Themen Update erhalten');
            if (typeof loadThemen === 'function') {
                loadThemen();
            }
        }
    });
    
    // Gruppen Listener
    const gruppenRef = window.firebaseDB.ref(window.database, 'gruppen');
    activeListeners.gruppen = window.firebaseDB.onValue(gruppenRef, (snapshot) => {
        if (snapshot.exists()) {
            dataCache.gruppen = snapshot.val();
            console.log('🔄 Gruppen Update erhalten');
            if (typeof loadGruppen === 'function') {
                loadGruppen();
            }
        }
    });
    
    // Bewertungen Listener (nur für den aktuellen Lehrer)
    if (currentUser && currentUser.role === 'lehrer') {
        const bewertungenRef = window.firebaseDB.ref(window.database, `bewertungen/${sanitizeEmail(currentUser.email)}`);
        activeListeners.bewertungen = window.firebaseDB.onValue(bewertungenRef, (snapshot) => {
            if (snapshot.exists()) {
                dataCache.bewertungen[currentUser.email] = snapshot.val();
                console.log('🔄 Bewertungen Update erhalten');
                if (typeof loadBewertungen === 'function') {
                    loadBewertungen();
                }
            }
        });
    }
    
    console.log('✅ Realtime Listeners aktiv');
}

// Listeners aufräumen (bei Logout)
function cleanupListeners() {
    console.log('🧹 Räume Realtime Listeners auf...');
    
    Object.entries(activeListeners).forEach(([key, unsubscribe]) => {
        if (typeof unsubscribe === 'function') {
            unsubscribe();
        }
    });
    
    activeListeners = {};
    console.log('✅ Listeners aufgeräumt');
}

// === HILFSFUNKTIONEN ===

// Tab Navigation
function openTab(tabName) {
    const contents = document.querySelectorAll('.tab-content');
    const buttons = document.querySelectorAll('.tab-btn');
    
    contents.forEach(content => content.classList.remove('active'));
    buttons.forEach(button => button.classList.remove('active'));
    
    document.getElementById(tabName).classList.add('active');
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    console.log('📑 Tab gewechselt zu:', tabName);
    
    // Tab-spezifische Inhalte laden
    try {
        if (tabName === 'news') loadNews();
        if (tabName === 'themen') loadThemen();
        if (tabName === 'gruppen') loadGruppen();
        if (tabName === 'lehrer') loadLehrer();
        if (tabName === 'daten') loadDatenverwaltung();
        if (tabName === 'bewerten') loadBewertungen();
        if (tabName === 'vorlagen') loadVorlagen();
        if (tabName === 'uebersicht') loadUebersicht();
        if (tabName === 'adminvorlagen') loadAdminVorlagen();
    } catch (error) {
        console.error('❌ Fehler beim Laden von Tab:', tabName, error);
    }
}

// Fächer-Name aus Cache holen
function getFachNameFromGlobal(fachKuerzel) {
    return dataCache.faecher[fachKuerzel] || fachKuerzel;
}

// Alle Fächer aus Cache holen
function getAllFaecher() {
    return dataCache.faecher;
}

// Email für Firebase Key sanitieren
function sanitizeEmail(email) {
    return email.replace(/[.$#\[\]/]/g, '_');
}

// Timestamp generieren
function getTimestamp() {
    return new Date().toISOString();
}

// Deutsche Datumsformatierung
function formatGermanDate(date = new Date()) {
    return date.toLocaleDateString('de-DE');
}

// === DATA ACCESS FUNCTIONS ===

// News aus Cache
function getNewsFromCache() {
    return Object.values(dataCache.news || {}).sort((a, b) => 
        new Date(b.datum || b.timestamp) - new Date(a.datum || a.timestamp)
    );
}

// Themen aus Cache
function getThemenFromCache() {
    return Object.values(dataCache.themen || {});
}

// Gruppen aus Cache
function getGruppenFromCache() {
    return Object.values(dataCache.gruppen || {});
}

// Bewertungen aus Cache (für aktuellen Lehrer)
function getBewertungenFromCache() {
    if (!currentUser) return [];
    
    const lehrerBewertungen = dataCache.bewertungen[currentUser.email] || {};
    return Object.values(lehrerBewertungen);
}

// === GLOBAL VERFÜGBAR MACHEN ===

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
    requireAuth: () => window.authFunctions.requireAuth(),
    requireAdmin: () => window.authFunctions.requireAdmin(),
    isAdmin: () => window.authFunctions.isAdmin(),
    getCurrentUserName: () => window.authFunctions.getCurrentUserName(),
    
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

console.log('✅ Firebase Main System bereit');
