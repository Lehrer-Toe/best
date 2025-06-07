// Firebase Hauptsystem - Realtime Database - KORRIGIERT
console.log('🚀 Firebase Main System geladen - Stabile Version');

// ENTFERNT: Doppelte dataCache Deklaration - wird bereits in firebase-login.js definiert
// Verwende stattdessen die bereits existierende dataCache aus firebase-login.js

// Realtime Listeners für automatische Updates
let activeListeners = {};

// Firebase App Initialisierung (KORRIGIERT - lädt keine Daten mehr)
async function initializeFirebaseApp() {
    console.log('🚀 Initialisiere Firebase App...');
    
    try {
        // Auth System starten
        if (typeof initializeAuth === 'function') {
            initializeAuth();
        }
        
        // Cache initialisieren (aber keine Daten laden)
        initializeDataCache();
        
        // Erfolg
        document.getElementById('loadingScreen').style.display = 'none';
        console.log('✅ Firebase App erfolgreich initialisiert');
        
    } catch (error) {
        console.error('❌ Fehler bei Firebase Initialisierung:', error);
        const progressElement = document.getElementById('loadingProgress');
        if (progressElement) {
            progressElement.innerHTML = '<p style="color: #e74c3c;">Fehler: ' + error.message + '</p>';
        }
    }
}

// Cache initialisieren (OHNE Daten zu laden)
function initializeDataCache() {
    console.log('📂 Initialisiere Daten-Cache...');
    
    // Verwende die bereits existierende dataCache oder erstelle sie falls nötig
    if (typeof dataCache === 'undefined') {
        window.dataCache = {
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
    }
    
    console.log('✅ Daten-Cache initialisiert');
}

// System-Grunddaten laden (NACH LOGIN) - KORRIGIERT mit besserer Fehlerbehandlung
async function loadSystemData() {
    console.log('📂 Lade System-Grunddaten nach Login...');
    
    try {
        // Config laden (mit Fallback)
        await loadConfigSafe();
        
        // Fächer laden (mit Fallback)
        await loadFaecherSafe();
        
        // Bewertungs-Checkpoints laden (mit Fallback)
        await loadBewertungsCheckpointsSafe();
        
        // Briefvorlage laden (mit Fallback)
        await loadBriefvorlageSafe();
        
        // Stärken-Formulierungen laden (mit Fallback)
        await loadStaerkenFormulierungenSafe();
        
        console.log('✅ System-Grunddaten geladen (mit Fallbacks bei Fehlern)');
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der Grunddaten:', error);
        // Nicht kritisch - App kann trotzdem funktionieren
    }
}

// Sichere Lade-Funktionen mit Fallbacks
async function loadConfigSafe() {
    try {
        const configRef = window.firebaseDB.ref(window.database, 'config');
        const snapshot = await window.firebaseDB.get(configRef);
        dataCache.config = snapshot.exists() ? snapshot.val() : {};
        console.log('✅ Config geladen');
    } catch (error) {
        console.warn('Config konnte nicht geladen werden, verwende Fallback:', error);
        dataCache.config = {};
    }
}

async function loadFaecherSafe() {
    try {
        const faecherRef = window.firebaseDB.ref(window.database, 'system/faecher');
        const snapshot = await window.firebaseDB.get(faecherRef);
        dataCache.faecher = snapshot.exists() ? snapshot.val() : {};
        console.log('✅ Fächer geladen');
    } catch (error) {
        console.warn('Fächer konnten nicht geladen werden, verwende Fallback:', error);
        dataCache.faecher = {};
    }
}

async function loadBewertungsCheckpointsSafe() {
    try {
        const checkpointsRef = window.firebaseDB.ref(window.database, 'system/bewertungsCheckpoints');
        const snapshot = await window.firebaseDB.get(checkpointsRef);
        dataCache.bewertungsCheckpoints = snapshot.exists() ? snapshot.val() : {};
        console.log('✅ Bewertungs-Checkpoints geladen');
    } catch (error) {
        console.warn('Bewertungs-Checkpoints konnten nicht geladen werden, verwende Fallback:', error);
        dataCache.bewertungsCheckpoints = {};
    }
}

async function loadBriefvorlageSafe() {
    try {
        const briefRef = window.firebaseDB.ref(window.database, 'system/briefvorlage');
        const snapshot = await window.firebaseDB.get(briefRef);
        dataCache.briefvorlage = snapshot.exists() ? snapshot.val() : {};
        console.log('✅ Briefvorlage geladen');
    } catch (error) {
        console.warn('Briefvorlage konnte nicht geladen werden, verwende Fallback:', error);
        dataCache.briefvorlage = {};
    }
}

async function loadStaerkenFormulierungenSafe() {
    try {
        const formulierungenRef = window.firebaseDB.ref(window.database, 'system/staerkenFormulierungen');
        const snapshot = await window.firebaseDB.get(formulierungenRef);
        dataCache.staerkenFormulierungen = snapshot.exists() ? snapshot.val() : {};
        console.log('✅ Stärken-Formulierungen geladen');
    } catch (error) {
        console.warn('Stärken-Formulierungen konnten nicht geladen werden, verwende Fallback:', error);
        dataCache.staerkenFormulierungen = {};
    }
}

// App nach Login initialisieren (KORRIGIERT)
async function initializeAppAfterLogin() {
    console.log('🚀 Initialisiere App nach Login...');
    
    if (!currentUser) {
        console.error('❌ Kein Benutzer angemeldet!');
        return;
    }
    
    try {
        // Grunddaten laden
        await loadSystemData();
        
        // Realtime Listeners einrichten
        setupRealtimeListeners();
        
        // UI-Elemente aktualisieren
        updateUserInterface();
        
        // Tab-Inhalte für ersten Tab laden
        setTimeout(() => {
            if (typeof loadNews === 'function') {
                loadNews();
            }
        }, 500);
        
        console.log('✅ App nach Login erfolgreich initialisiert');
        
    } catch (error) {
        console.error('❌ Fehler bei App-Initialisierung:', error);
        alert('Fehler bei der App-Initialisierung: ' + error.message);
    }
}

// Realtime Listeners einrichten
function setupRealtimeListeners() {
    if (!currentUser) return;
    
    try {
        console.log('🔄 Richte Realtime Listeners ein...');
        
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
        
    } catch (error) {
        console.error('❌ Fehler beim Einrichten der Listeners:', error);
    }
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

// User Interface aktualisieren
function updateUserInterface() {
    const userNameElement = document.getElementById('currentUser');
    if (userNameElement && currentUser) {
        userNameElement.textContent = currentUser.name || currentUser.email;
    }
    
    // Admin-spezifische UI-Elemente anzeigen/verstecken
    const adminElements = document.querySelectorAll('[data-admin-only]');
    adminElements.forEach(element => {
        if (currentUser && currentUser.role === 'admin') {
            element.style.display = 'block';
        } else {
            element.style.display = 'none';
        }
    });
}

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

// === DATA ACCESS FUNCTIONS ===

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

function getLehrerFromCache() {
    return Object.values(dataCache.users || {}).filter(user => user.role === 'lehrer');
}

function getKlassenFromCache() {
    return Object.values(dataCache.klassen || {});
}

function getFaecherFromCache() {
    return Object.values(dataCache.faecher || {});
}

function getBewertungenFromCache() {
    if (!currentUser) return [];
    const lehrerBewertungen = dataCache.bewertungen[currentUser.email] || {};
    return Object.values(lehrerBewertungen);
}

// === GLOBAL VERFÜGBAR MACHEN ===

window.firebaseFunctions = {
    // Data Access
    getNewsFromCache,
    getThemenFromCache,
    getGruppenFromCache,
    getLehrerFromCache,
    getKlassenFromCache,
    getFaecherFromCache,
    getBewertungenFromCache,
    getAllFaecher,
    getFachNameFromGlobal,
    
    // Utilities
    sanitizeEmail,
    getTimestamp,
    formatGermanDate,
    
    // Auth
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

// Globale Funktionen verfügbar machen
window.openTab = openTab;
window.initializeAppAfterLogin = initializeAppAfterLogin;

console.log('✅ Firebase Main System bereit - Stabile Version');
