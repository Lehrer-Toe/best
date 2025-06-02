// Firebase Authentication System - Robuste Version
console.log('🔐 Firebase Authentication System geladen');

// Globale Variablen
let currentUser = null;
let firebaseUser = null;
let authInitialized = false;
let loginInProgress = false;

// Initialisiere Authentication
function initializeAuth() {
    console.log('🔐 Initialisiere Firebase Authentication...');
    
    if (authInitialized) {
        console.log('⚠️ Auth bereits initialisiert');
        return;
    }
    
    try {
        // Auth State Listener mit verbesserter Fehlerbehandlung
        window.firebaseAuth.onAuthStateChanged(window.auth, (user) => {
            console.log('🔄 Auth State Changed:', user ? user.email : 'null');
            
            if (user) {
                console.log('✅ Firebase User angemeldet:', user.email);
                firebaseUser = user;
                
                // Verhindere mehrfache Ausführung
                if (!loginInProgress) {
                    handleAuthenticatedUser(user);
                }
            } else {
                console.log('❌ Kein Firebase User angemeldet');
                firebaseUser = null;
                currentUser = null;
                
                // Nur zur Login-Seite wenn nicht gerade ein Login läuft
                if (!loginInProgress) {
                    showLoginScreen();
                }
            }
        }, (error) => {
            console.error('❌ Auth State Change Error:', error);
            showError('Fehler bei der Authentifizierung: ' + error.message);
        });
        
        // Login Form Event Listener mit verbesserter Behandlung
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            // Entferne vorherige Listener
            loginForm.removeEventListener('submit', handleLogin);
            loginForm.addEventListener('submit', handleLogin);
            
            // Enter-Key Support für bessere Browser-Kompatibilität
            loginForm.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLogin(e);
                }
            });
        }
        
        authInitialized = true;
        console.log('✅ Firebase Authentication bereit');
        
    } catch (error) {
        console.error('❌ Kritischer Fehler bei Auth-Initialisierung:', error);
        showError('Authentication konnte nicht initialisiert werden: ' + error.message);
    }
}

// Login Handler - Verbessert für Browser-Kompatibilität
async function handleLogin(e) {
    e.preventDefault();
    
    // Verhindere mehrfache Login-Versuche
    if (loginInProgress) {
        console.log('⚠️ Login bereits in Bearbeitung');
        return;
    }
    
    const email = document.getElementById('email')?.value?.trim();
    const password = document.getElementById('password')?.value;
    
    if (!email || !password) {
        showError('Bitte E-Mail und Passwort eingeben!');
        return;
    }
    
    console.log('🔐 Login-Versuch für:', email);
    loginInProgress = true;
    
    // UI während Login sperren
    const loginBtn = document.querySelector('.login-btn');
    const originalText = loginBtn?.textContent;
    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Anmeldung läuft...';
    }
    
    // Fehler-Nachricht verstecken
    hideError();
    
    try {
        // Firebase Authentication mit Timeout
        console.log('🔥 Starte Firebase Authentication...');
        
        const loginPromise = window.firebaseAuth.signInWithEmailAndPassword(window.auth, email, password);
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Login-Timeout nach 15 Sekunden')), 15000);
        });
        
        const userCredential = await Promise.race([loginPromise, timeoutPromise]);
        console.log('✅ Firebase Login erfolgreich:', userCredential.user.email);
        
        // Warte kurz auf Auth State Change (Browser-spezifisch)
        await waitForAuthStateChange(userCredential.user, 5000);
        
    } catch (error) {
        console.error('❌ Firebase Login Fehler:', error);
        loginInProgress = false;
        
        // UI wieder entsperren
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.textContent = originalText;
        }
        
        let errorMessage = 'Login fehlgeschlagen!';
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'Benutzer nicht gefunden!';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Falsches Passwort!';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Ungültige E-Mail Adresse!';
                break;
            case 'auth/user-disabled':
                errorMessage = 'Benutzer wurde deaktiviert!';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Zu viele Anmeldeversuche. Bitte später erneut versuchen!';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Netzwerkfehler. Prüfen Sie Ihre Internetverbindung!';
                break;
            default:
                if (error.message.includes('Timeout')) {
                    errorMessage = 'Anmeldung dauert zu lange. Bitte erneut versuchen!';
                } else {
                    errorMessage = `Fehler: ${error.message}`;
                }
        }
        
        showError(errorMessage);
    }
}

// Warte auf Auth State Change (für Browser-Kompatibilität)
function waitForAuthStateChange(expectedUser, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Auth State Change Timeout'));
        }, timeoutMs);
        
        const checkAuth = () => {
            if (firebaseUser && firebaseUser.uid === expectedUser.uid) {
                clearTimeout(timeout);
                resolve();
            } else {
                // Kurz warten und nochmal prüfen
                setTimeout(checkAuth, 100);
            }
        };
        
        checkAuth();
    });
}

// Authentifizierter User Handler - Verbessert
async function handleAuthenticatedUser(firebaseUser) {
    console.log('👤 Lade Benutzerdaten für:', firebaseUser.email);
    
    try {
        // Doppelte Ausführung verhindern
        if (currentUser && currentUser.uid === firebaseUser.uid) {
            console.log('👤 Benutzer bereits geladen');
            return;
        }
        
        // Benutzerdaten aus Firebase laden mit Retry-Mechanismus
        const userData = await loadUserDataWithRetry(firebaseUser.email, 3);
        
        if (userData) {
            currentUser = {
                email: firebaseUser.email,
                uid: firebaseUser.uid,
                ...userData
            };
            
            console.log('✅ Benutzerdaten geladen:', currentUser.name, 'Rolle:', currentUser.role);
            
            // UI mit Verzögerung für Browser-Kompatibilität
            setTimeout(() => {
                showApp();
                loginInProgress = false;
            }, 100);
            
        } else {
            console.warn('⚠️ Benutzerdaten nicht in Firebase gefunden');
            showError('Benutzer nicht berechtigt. Bitte kontaktieren Sie den Administrator.');
            await firebaseLogout();
        }
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der Benutzerdaten:', error);
        showError('Fehler beim Laden der Benutzerdaten!');
        await firebaseLogout();
    }
}

// Benutzerdaten laden mit Retry-Mechanismus
async function loadUserDataWithRetry(email, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`📂 Lade Benutzerdaten (Versuch ${attempt}/${maxRetries})`);
            
            const userDataRef = window.firebaseDB.ref(window.database, `users/${sanitizeEmail(email)}`);
            const snapshot = await window.firebaseDB.get(userDataRef);
            
            if (snapshot.exists()) {
                return snapshot.val();
            } else {
                console.warn(`⚠️ Benutzerdaten nicht gefunden (Versuch ${attempt})`);
                return null;
            }
            
        } catch (error) {
            console.error(`❌ Fehler beim Laden der Benutzerdaten (Versuch ${attempt}):`, error);
            
            if (attempt === maxRetries) {
                throw error;
            }
            
            // Kurz warten vor nächstem Versuch
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
    
    return null;
}

// Login Screen anzeigen
function showLoginScreen() {
    console.log('🏠 Zeige Login Screen');
    
    const loadingScreen = document.getElementById('loadingScreen');
    const loginScreen = document.getElementById('loginScreen');
    const appContainer = document.getElementById('appContainer');
    
    if (loadingScreen) loadingScreen.style.display = 'none';
    if (loginScreen) loginScreen.style.display = 'flex';
    if (appContainer) appContainer.style.display = 'none';
    
    // Felder leeren
    const emailField = document.getElementById('email');
    const passwordField = document.getElementById('password');
    if (emailField) emailField.value = '';
    if (passwordField) passwordField.value = '';
    
    // Login-Button entsperren
    const loginBtn = document.querySelector('.login-btn');
    if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Anmelden';
    }
    
    hideError();
    loginInProgress = false;
}

// App anzeigen (nach erfolgreichem Login) - Verbessert
function showApp() {
    if (!currentUser) {
        console.error('❌ Kein currentUser beim showApp()');
        showLoginScreen();
        return;
    }
    
    console.log('🎉 Zeige App für:', currentUser.name, 'Rolle:', currentUser.role);
    
    const loginScreen = document.getElementById('loginScreen');
    const appContainer = document.getElementById('appContainer');
    const currentUserSpan = document.getElementById('currentUser');
    
    if (loginScreen) loginScreen.style.display = 'none';
    if (appContainer) appContainer.style.display = 'block';
    if (currentUserSpan) currentUserSpan.textContent = `${currentUser.name} (${currentUser.role})`;
    
    // KOMPLETT ALLE Tabs verstecken und Buttons deaktivieren
    const allTabs = [
        'newsTab', 'themenTab', 'gruppenTab', 'lehrerTab', 
        'datenTab', 'bewertenTab', 'vorlagenTab', 'uebersichtTab', 'adminvorlagenTab'
    ];
    
    allTabs.forEach(tabId => {
        const tab = document.getElementById(tabId);
        if (tab) {
            tab.style.display = 'none';
            tab.classList.remove('active');
        }
    });
    
    // Alle Tab-Contents deaktivieren
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // News-Tab standardmäßig aktivieren für alle
    const newsTab = document.getElementById('newsTab');
    const newsContent = document.getElementById('news');
    if (newsTab) newsTab.style.display = 'block';
    if (newsContent) newsContent.classList.add('active');
    
    // Tabs je nach Rolle anzeigen
    if (currentUser.role === 'admin') {
        const adminTabs = ['newsTab', 'lehrerTab', 'datenTab', 'adminvorlagenTab'];
        adminTabs.forEach(tabId => {
            const tab = document.getElementById(tabId);
            if (tab) tab.style.display = 'block';
        });
        
        // Ersten sichtbaren Tab aktivieren
        if (newsTab) newsTab.classList.add('active');
        console.log('👑 Admin-Interface aktiviert');
        
    } else if (currentUser.role === 'lehrer') {
        const lehrerTabs = ['newsTab', 'themenTab', 'gruppenTab', 'bewertenTab', 'vorlagenTab', 'uebersichtTab'];
        lehrerTabs.forEach(tabId => {
            const tab = document.getElementById(tabId);
            if (tab) tab.style.display = 'block';
        });
        
        // Ersten sichtbaren Tab aktivieren
        if (newsTab) newsTab.classList.add('active');
        console.log('👨‍🏫 Lehrer-Interface aktiviert');
        
    } else {
        console.warn('⚠️ Unbekannte Benutzerrolle:', currentUser.role);
        showError('Unbekannte Benutzerrolle!');
        return;
    }
    
    // App nach Login initialisieren mit Verzögerung
    setTimeout(() => {
        if (typeof initializeAppAfterLogin === 'function') {
            try {
                initializeAppAfterLogin();
            } catch (error) {
                console.error('❌ Fehler bei App-Initialisierung:', error);
            }
        }
    }, 200);
}

// Logout - Verbessert
async function firebaseLogout() {
    console.log('👋 Benutzer meldet sich ab:', currentUser ? currentUser.name : 'unbekannt');
    
    try {
        loginInProgress = true;
        
        await window.firebaseAuth.signOut(window.auth);
        console.log('✅ Firebase Logout erfolgreich');
        
        // Cleanup
        currentUser = null;
        firebaseUser = null;
        
        // UI zurücksetzen
        hideAllTabs();
        showLoginScreen();
        
    } catch (error) {
        console.error('❌ Fehler beim Logout:', error);
        showError('Fehler beim Abmelden!');
    } finally {
        loginInProgress = false;
    }
}

// Alle Tabs verstecken
function hideAllTabs() {
    const allTabs = [
        'newsTab', 'themenTab', 'gruppenTab', 'lehrerTab', 
        'datenTab', 'bewertenTab', 'vorlagenTab', 'uebersichtTab', 'adminvorlagenTab'
    ];
    
    allTabs.forEach(tabId => {
        const tab = document.getElementById(tabId);
        if (tab) {
            tab.style.display = 'none';
            tab.classList.remove('active');
        }
    });
    
    // Alle Tab-Contents deaktivieren
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
}

// Error/Success Messages - Verbessert
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        errorDiv.style.background = '#fdf2f2';
        errorDiv.style.color = '#e74c3c';
        
        // Auto-hide nach 10 Sekunden
        setTimeout(() => {
            if (errorDiv.textContent === message) {
                hideError();
            }
        }, 10000);
    }
    console.warn('⚠️ Error angezeigt:', message);
}

function showSuccess(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        errorDiv.style.background = '#f0f9ff';
        errorDiv.style.color = '#27ae60';
        
        // Auto-hide nach 5 Sekunden
        setTimeout(() => {
            if (errorDiv.textContent === message) {
                hideError();
            }
        }, 5000);
    }
    console.log('✅ Success angezeigt:', message);
}

function hideError() {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

// Hilfsfunktionen
function sanitizeEmail(email) {
    // Firebase Realtime Database Keys dürfen keine . $ # [ ] / enthalten
    return email.replace(/[.$#\[\]/]/g, '_');
}

function getUserUid() {
    return firebaseUser ? firebaseUser.uid : null;
}

function getUserEmail() {
    return firebaseUser ? firebaseUser.email : null;
}

function isAdmin() {
    return currentUser && currentUser.role === 'admin';
}

function isLehrer() {
    return currentUser && currentUser.role === 'lehrer';
}

function getCurrentUserName() {
    return currentUser ? currentUser.name : 'Unbekannt';
}

// Auth Guard - prüft ob User eingeloggt ist
function requireAuth() {
    if (!currentUser || !firebaseUser) {
        console.warn('⚠️ Nicht autorisiert - Login erforderlich');
        showError('Bitte melden Sie sich an!');
        showLoginScreen();
        return false;
    }
    return true;
}

// Admin Guard - prüft ob User Admin ist
function requireAdmin() {
    if (!requireAuth()) return false;
    
    if (!isAdmin()) {
        console.warn('⚠️ Admin-Berechtigung erforderlich');
        showError('Keine Berechtigung für diese Aktion!');
        return false;
    }
    return true;
}

// Firebase Status aktualisieren
function updateFirebaseStatus() {
    const statusElement = document.getElementById('dbStatus');
    const userElement = document.getElementById('dbUser');
    const syncElement = document.getElementById('lastSync');
    
    if (statusElement) {
        if (firebaseUser) {
            statusElement.innerHTML = '🔥 Verbunden';
            statusElement.style.color = '#27ae60';
        } else {
            statusElement.innerHTML = '❌ Nicht verbunden';
            statusElement.style.color = '#e74c3c';
        }
    }
    
    if (userElement) {
        userElement.textContent = firebaseUser ? firebaseUser.email : '-';
    }
    
    if (syncElement) {
        syncElement.textContent = new Date().toLocaleString('de-DE');
    }
}

// Browser-spezifische Workarounds
function applyBrowserWorkarounds() {
    // Chrome-spezifische Korrekturen
    if (navigator.userAgent.includes('Chrome')) {
        console.log('🌐 Chrome-Browser erkannt - wende Workarounds an');
        
        // Chrome hat manchmal Probleme mit schnellen Auth State Changes
        window.CHROME_AUTH_DELAY = 200;
    }
    
    // Firefox-spezifische Korrekturen
    if (navigator.userAgent.includes('Firefox')) {
        console.log('🦊 Firefox-Browser erkannt');
    }
    
    // Safari-spezifische Korrekturen
    if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) {
        console.log('🧭 Safari-Browser erkannt');
    }
}

// Initialisierung mit Browser-Workarounds
document.addEventListener('DOMContentLoaded', () => {
    applyBrowserWorkarounds();
});

// Export für andere Module
window.authFunctions = {
    requireAuth,
    requireAdmin,
    isAdmin,
    isLehrer,
    getCurrentUserName,
    getUserUid,
    getUserEmail,
    sanitizeEmail,
    updateFirebaseStatus
};

console.log('✅ Firebase Authentication System bereit - Robuste Version');
