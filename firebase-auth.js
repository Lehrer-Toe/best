// Firebase Authentication System
console.log('🔐 Firebase Authentication System geladen');

// Globale Variablen
let currentUser = null;
let firebaseUser = null;

// NEU: Automatischer Logout nach Inaktivität
let inactivityTimer = null;
let inactivityWarningTimer = null;
const INACTIVITY_TIMEOUT = 20 * 60 * 1000; // 20 Minuten in Millisekunden
const WARNING_TIMEOUT = 15 * 60 * 1000; // Warnung nach 15 Minuten

// Initialisiere Authentication
function initializeAuth() {
    console.log('🔐 Initialisiere Firebase Authentication...');
    
    // Auth State Listener
    window.firebaseAuth.onAuthStateChanged(window.auth, (user) => {
        if (user) {
            console.log('✅ Firebase User angemeldet:', user.email);
            firebaseUser = user;
            handleAuthenticatedUser(user);
        } else {
            console.log('❌ Kein Firebase User angemeldet');
            firebaseUser = null;
            currentUser = null;
            showLoginScreen();
        }
    });
    
    // Login Form Event Listener
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // NEU: Inaktivitäts-Tracker einrichten
    setupInactivityTracker();
    
    console.log('✅ Firebase Authentication bereit');
}

// NEU: Inaktivitäts-Tracker einrichten
function setupInactivityTracker() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const resetInactivityTimer = () => {
        // Nur wenn User eingeloggt ist
        if (!currentUser) return;
        
        // Timer zurücksetzen
        if (inactivityTimer) {
            clearTimeout(inactivityTimer);
        }
        if (inactivityWarningTimer) {
            clearTimeout(inactivityWarningTimer);
        }
        
        // Warnung nach 4 Minuten
        inactivityWarningTimer = setTimeout(() => {
            showInactivityWarning();
        }, WARNING_TIMEOUT);
        
        // Automatischer Logout nach 5 Minuten
        inactivityTimer = setTimeout(() => {
            handleInactivityLogout();
        }, INACTIVITY_TIMEOUT);
    };
    
    // Event-Listener für alle Aktivitäten
    events.forEach(event => {
        document.addEventListener(event, resetInactivityTimer, true);
    });
    
    console.log('⏰ Inaktivitäts-Tracker eingerichtet (5 Min)');
}

// NEU: Inaktivitäts-Warnung anzeigen
function showInactivityWarning() {
    if (!currentUser) return;
    
    const warningDiv = document.createElement('div');
    warningDiv.id = 'inactivityWarning';
    warningDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f39c12;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-weight: bold;
        animation: slideIn 0.3s ease-out;
    `;
    warningDiv.innerHTML = `
        ⚠️ Sie werden in 1 Minute automatisch abgemeldet!
        <button onclick="dismissInactivityWarning()" style="margin-left: 10px; background: white; color: #f39c12; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">OK</button>
    `;
    
    document.body.appendChild(warningDiv);
    
    // Animation hinzufügen
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    console.log('⚠️ Inaktivitäts-Warnung angezeigt');
}

// NEU: Inaktivitäts-Warnung schließen
window.dismissInactivityWarning = function() {
    const warning = document.getElementById('inactivityWarning');
    if (warning) {
        warning.remove();
    }
};

// NEU: Automatischer Logout wegen Inaktivität
async function handleInactivityLogout() {
    if (!currentUser) return;
    
    console.log('⏰ Automatischer Logout wegen Inaktivität');
    
    // Warnung entfernen falls noch da
    const warning = document.getElementById('inactivityWarning');
    if (warning) {
        warning.remove();
    }
    
    // Sanfter Logout ohne Fehlermeldung
    try {
        await window.firebaseAuth.signOut(window.auth);
        
        // Freundliche Nachricht anzeigen
        const logoutMessage = document.createElement('div');
        logoutMessage.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #667eea;
            color: white;
            padding: 20px 30px;
            border-radius: 10px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            z-index: 10001;
            text-align: center;
            font-size: 16px;
        `;
        logoutMessage.innerHTML = `
            <div style="margin-bottom: 10px;">🔒</div>
            <div>Sie wurden automatisch abgemeldet</div>
            <div style="font-size: 14px; margin-top: 10px; opacity: 0.8;">Aus Sicherheitsgründen nach 5 Minuten Inaktivität</div>
        `;
        
        document.body.appendChild(logoutMessage);
        
        // Nachricht nach 3 Sekunden entfernen
        setTimeout(() => {
            if (logoutMessage) {
                logoutMessage.remove();
            }
        }, 3000);
        
    } catch (error) {
        console.error('❌ Fehler beim automatischen Logout:', error);
    }
}

// Login Handler
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showError('Bitte E-Mail und Passwort eingeben!');
        return;
    }
    
    console.log('🔐 Login-Versuch für:', email);
    
    try {
        // Firebase Authentication
        const userCredential = await window.firebaseAuth.signInWithEmailAndPassword(window.auth, email, password);
        console.log('✅ Firebase Login erfolgreich:', userCredential.user.email);
        
        // Keine weitere Aktion nötig - onAuthStateChanged wird automatisch ausgelöst
        
    } catch (error) {
        console.error('❌ Firebase Login Fehler:', error);
        
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
            default:
                errorMessage = `Fehler: ${error.message}`;
        }
        
        showError(errorMessage);
    }
}

// Authentifizierter User Handler
async function handleAuthenticatedUser(firebaseUser) {
    console.log('👤 Lade Benutzerdaten für:', firebaseUser.email);
    
    try {
        // Benutzerdaten aus Firebase laden
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
            showApp();
            
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

// Login Screen anzeigen
function showLoginScreen() {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
    
    // Felder leeren
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
    hideError();
    
    // Timer stoppen
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
        inactivityTimer = null;
    }
    if (inactivityWarningTimer) {
        clearTimeout(inactivityWarningTimer);
        inactivityWarningTimer = null;
    }
}

// App anzeigen (nach erfolgreichem Login)
function showApp() {
    if (!currentUser) {
        console.error('❌ Kein currentUser beim showApp()');
        return;
    }
    
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'block';
    document.getElementById('currentUser').textContent = `${currentUser.name} (${currentUser.role})`;
    
    console.log('👤 App angezeigt für:', currentUser.name, 'Rolle:', currentUser.role);
    
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
    document.getElementById('newsTab').style.display = 'block';
    document.getElementById('news').classList.add('active');
    
    // Tabs je nach Rolle anzeigen
    if (currentUser.role === 'admin') {
        document.getElementById('newsTab').style.display = 'block';
        document.getElementById('lehrerTab').style.display = 'block';
        document.getElementById('datenTab').style.display = 'block';
        document.getElementById('adminvorlagenTab').style.display = 'block';
        
        // Ersten sichtbaren Tab aktivieren
        document.getElementById('newsTab').classList.add('active');
        console.log('👑 Admin-Interface aktiviert');
        
    } else if (currentUser.role === 'lehrer') {
        document.getElementById('newsTab').style.display = 'block';
        document.getElementById('themenTab').style.display = 'block';
        document.getElementById('gruppenTab').style.display = 'block';
        document.getElementById('bewertenTab').style.display = 'block';
        document.getElementById('vorlagenTab').style.display = 'block';
        document.getElementById('uebersichtTab').style.display = 'block';
        
        // Ersten sichtbaren Tab aktivieren
        document.getElementById('newsTab').classList.add('active');
        console.log('👨‍🏫 Lehrer-Interface aktiviert');
        
    } else {
        console.warn('⚠️ Unbekannte Benutzerrolle:', currentUser.role);
        showError('Unbekannte Benutzerrolle!');
        return;
    }
    
    // App nach Login initialisieren
    if (typeof initializeAppAfterLogin === 'function') {
        initializeAppAfterLogin();
    }
}

// Logout
async function firebaseLogout() {
    console.log('👋 Benutzer meldet sich ab:', currentUser ? currentUser.name : 'unbekannt');
    
    try {
        await window.firebaseAuth.signOut(window.auth);
        console.log('✅ Firebase Logout erfolgreich');
        
        // Cleanup
        currentUser = null;
        firebaseUser = null;
        
        // Timer stoppen
        if (inactivityTimer) {
            clearTimeout(inactivityTimer);
            inactivityTimer = null;
        }
        if (inactivityWarningTimer) {
            clearTimeout(inactivityWarningTimer);
            inactivityWarningTimer = null;
        }
        
        // UI zurücksetzen
        hideAllTabs();
        showLoginScreen();
        
    } catch (error) {
        console.error('❌ Fehler beim Logout:', error);
        showError('Fehler beim Abmelden!');
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

// Error/Success Messages
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        errorDiv.style.background = '#fdf2f2';
        errorDiv.style.color = '#e74c3c';
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

console.log('✅ Firebase Authentication System bereit');
