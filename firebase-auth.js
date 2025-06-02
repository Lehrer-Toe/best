// Firebase Authentication System - Finale Lösung
console.log('🔐 Firebase Authentication System geladen');

// Globale Variablen
let currentUser = null;
let firebaseUser = null;
let authInitialized = false;
let loginInProgress = false;
let autoLogoutTimer = null;

// Auto-Logout nach 20 Minuten (ohne Warnung)
const AUTO_LOGOUT_TIME = 20 * 60 * 1000; // 20 Minuten in Millisekunden

// Initialisiere Authentication
function initializeAuth() {
    console.log('🔐 Initialisiere Firebase Authentication...');
    
    if (authInitialized) {
        console.log('⚠️ Auth bereits initialisiert');
        return;
    }
    
    try {
        // Auth State Listener - VEREINFACHT
        window.firebaseAuth.onAuthStateChanged(window.auth, (user) => {
            console.log('🔄 Auth State Changed:', user ? user.email : 'null');
            
            if (user) {
                console.log('✅ Firebase User angemeldet:', user.email);
                firebaseUser = user;
                handleAuthenticatedUser(user);
            } else {
                console.log('❌ Kein Firebase User angemeldet');
                firebaseUser = null;
                currentUser = null;
                stopAutoLogoutTimer();
                
                if (!loginInProgress) {
                    showLoginScreen();
                }
            }
        });
        
        // Login Form Event Listener
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.removeEventListener('submit', handleLogin);
            loginForm.addEventListener('submit', handleLogin);
        }
        
        authInitialized = true;
        console.log('✅ Firebase Authentication bereit');
        
    } catch (error) {
        console.error('❌ Kritischer Fehler bei Auth-Initialisierung:', error);
        showError('Authentication konnte nicht initialisiert werden: ' + error.message);
    }
}

// Login Handler - VEREINFACHT
async function handleLogin(e) {
    e.preventDefault();
    
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
    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Anmeldung läuft...';
    }
    
    hideError();
    
    try {
        // Firebase Authentication - DIREKTER AUFRUF
        console.log('🔥 Starte Firebase Authentication...');
        const userCredential = await window.firebaseAuth.signInWithEmailAndPassword(window.auth, email, password);
        console.log('✅ Firebase Login erfolgreich:', userCredential.user.email);
        
        // Login erfolgreich - Auth State Listener übernimmt den Rest
        
    } catch (error) {
        console.error('❌ Firebase Login Fehler:', error);
        loginInProgress = false;
        
        // UI wieder entsperren
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Anmelden';
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
                errorMessage = `Fehler: ${error.message}`;
        }
        
        showError(errorMessage);
    }
}

// Authentifizierter User Handler - VEREINFACHT
async function handleAuthenticatedUser(firebaseUser) {
    console.log('👤 Lade Benutzerdaten für:', firebaseUser.email);
    
    // Verhindere mehrfache Ausführung
    if (currentUser && currentUser.uid === firebaseUser.uid) {
        console.log('👤 Benutzer bereits geladen');
        return;
    }
    
    try {
        // Benutzerdaten aus Firebase laden - DIREKTER AUFRUF
        const userDataRef = window.firebaseDB.ref(window.database, `users/${sanitizeEmail(firebaseUser.email)}`);
        const snapshot = await window.firebaseDB.get(userDataRef);
        
        if (snapshot.exists()) {
            const userData = snapshot.val();
            currentUser = {
                email: firebaseUser.email,
                uid: firebaseUser.uid,
                ...userData
            };
            
            console.log('✅ Benutzerdaten geladen:', currentUser.name, 'Rolle:', currentUser.role);
            
            // App anzeigen
            showApp();
            loginInProgress = false;
            
            // Auto-Logout Timer starten
            startAutoLogoutTimer();
            
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

// Auto-Logout Timer starten
function startAutoLogoutTimer() {
    console.log('⏰ Auto-Logout Timer gestartet (20 Minuten)');
    stopAutoLogoutTimer(); // Vorherigen Timer stoppen
    
    autoLogoutTimer = setTimeout(async () => {
        console.log('⏰ Auto-Logout nach 20 Minuten');
        await firebaseLogout();
    }, AUTO_LOGOUT_TIME);
}

// Auto-Logout Timer stoppen
function stopAutoLogoutTimer() {
    if (autoLogoutTimer) {
        clearTimeout(autoLogoutTimer);
        autoLogoutTimer = null;
        console.log('⏰ Auto-Logout Timer gestoppt');
    }
}

// Aktivität registrieren (Timer zurücksetzen)
function resetAutoLogoutTimer() {
    if (currentUser && firebaseUser) {
        startAutoLogoutTimer();
    }
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

// App anzeigen (nach erfolgreichem Login)
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
    
    // Alle Tabs zurücksetzen
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
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // News-Tab standardmäßig aktivieren
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
        
        if (newsTab) newsTab.classList.add('active');
        console.log('👑 Admin-Interface aktiviert');
        
    } else if (currentUser.role === 'lehrer') {
        const lehrerTabs = ['newsTab', 'themenTab', 'gruppenTab', 'bewertenTab', 'vorlagenTab', 'uebersichtTab'];
        lehrerTabs.forEach(tabId => {
            const tab = document.getElementById(tabId);
            if (tab) tab.style.display = 'block';
        });
        
        if (newsTab) newsTab.classList.add('active');
        console.log('👨‍🏫 Lehrer-Interface aktiviert');
        
    } else {
        console.warn('⚠️ Unbekannte Benutzerrolle:', currentUser.role);
        showError('Unbekannte Benutzerrolle!');
        return;
    }
    
    // App nach Login initialisieren
    setTimeout(() => {
        if (typeof initializeAppAfterLogin === 'function') {
            try {
                initializeAppAfterLogin();
            } catch (error) {
                console.error('❌ Fehler bei App-Initialisierung:', error);
            }
        }
    }, 100);
}

// Logout
async function firebaseLogout() {
    console.log('👋 Benutzer meldet sich ab:', currentUser ? currentUser.name : 'unbekannt');
    
    try {
        stopAutoLogoutTimer();
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
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
}

// Error/Success Messages
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        errorDiv.style.background = '#fdf2f2';
        errorDiv.style.color = '#e74c3c';
        
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

// Auth Guard
function requireAuth() {
    if (!currentUser || !firebaseUser) {
        console.warn('⚠️ Nicht autorisiert - Login erforderlich');
        showError('Bitte melden Sie sich an!');
        showLoginScreen();
        return false;
    }
    
    // Timer bei Aktivität zurücksetzen
    resetAutoLogoutTimer();
    return true;
}

// Admin Guard
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

// Aktivität-Listener für Auto-Logout Reset
document.addEventListener('click', resetAutoLogoutTimer);
document.addEventListener('keypress', resetAutoLogoutTimer);
document.addEventListener('scroll', resetAutoLogoutTimer);

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

console.log('✅ Firebase Authentication System bereit - Finale Version mit Auto-Logout');
