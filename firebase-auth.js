// Firebase Authentication System
console.log('🔐 Firebase Authentication System geladen');

// Globale Variablen
let currentUser = null;
let firebaseUser = null;
let autoLogoutTimer = null;

// Auto-Logout nach 20 Minuten
const AUTO_LOGOUT_TIME = 20 * 60 * 1000; // 20 Minuten in Millisekunden

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
            stopAutoLogoutTimer();
            showLoginScreen();
        }
    });
    
    // Login Form Event Listener
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    console.log('✅ Firebase Authentication bereit');
}

// Login Handler
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
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
        
        // onAuthStateChanged wird automatisch ausgelöst
        
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
            case 'auth/network-request-failed':
                errorMessage = 'Netzwerkfehler. Bitte Internetverbindung prüfen!';
                break;
        }
        
        showError(errorMessage);
    }
}

// Authentifizierten Benutzer verarbeiten
async function handleAuthenticatedUser(user) {
    console.log('👤 Verarbeite authentifizierten Benutzer...');
    
    try {
        // Benutzerdaten aus Database laden
        const userRef = window.firebaseDB.ref(window.database, `users/${user.email.replace(/[.$#\[\]/]/g, '_')}`);
        const snapshot = await window.firebaseDB.get(userRef);
        
        if (snapshot.exists()) {
            currentUser = snapshot.val();
            console.log('✅ Benutzerdaten geladen:', currentUser);
            
            // Auto-Logout Timer starten
            startAutoLogoutTimer();
            
            // App anzeigen
            showApp();
            
            // App initialisieren
            if (typeof initializeAppAfterLogin === 'function') {
                await initializeAppAfterLogin();
            }
        } else {
            console.error('❌ Keine Benutzerdaten in Database gefunden');
            showError('Benutzerdaten nicht gefunden. Bitte kontaktieren Sie den Administrator.');
            await firebaseLogout();
        }
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der Benutzerdaten:', error);
        showError('Fehler beim Laden der Benutzerdaten!');
        await firebaseLogout();
    }
}

// Logout
async function firebaseLogout() {
    console.log('🔐 Logout wird durchgeführt...');
    
    try {
        stopAutoLogoutTimer();
        await window.firebaseAuth.signOut(window.auth);
        console.log('✅ Logout erfolgreich');
        
        // UI zurücksetzen
        currentUser = null;
        firebaseUser = null;
        showLoginScreen();
        
    } catch (error) {
        console.error('❌ Fehler beim Logout:', error);
    }
}

// Auto-Logout Timer starten
function startAutoLogoutTimer() {
    console.log('⏰ Auto-Logout Timer gestartet (20 Minuten)');
    stopAutoLogoutTimer();
    
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

// Aktivität registrieren
window.resetAutoLogoutTimer = function() {
    if (currentUser && firebaseUser) {
        startAutoLogoutTimer();
    }
}

// UI Funktionen
function showLoginScreen() {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
    
    // Felder leeren
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
    hideError();
}

function showApp() {
    if (!currentUser) {
        console.error('❌ Kein currentUser beim showApp()');
        return;
    }
    
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'block';
    document.getElementById('currentUser').textContent = `${currentUser.name} (${currentUser.role})`;
    
    console.log('👤 App angezeigt für:', currentUser.name, 'Rolle:', currentUser.role);
    
    // Tabs je nach Rolle anzeigen
    const allTabs = {
        'newsTab': true, // Alle sehen News
        'themenTab': true, // Alle sehen Themen
        'gruppenTab': currentUser.role !== 'schueler',
        'lehrerTab': currentUser.role === 'admin',
        'datenTab': currentUser.role === 'admin',
        'bewertenTab': currentUser.role === 'lehrer' || currentUser.role === 'admin',
        'vorlagenTab': currentUser.role === 'lehrer' || currentUser.role === 'admin',
        'uebersichtTab': currentUser.role === 'lehrer' || currentUser.role === 'admin',
        'adminvorlagenTab': currentUser.role === 'admin'
    };
    
    // Tabs ein-/ausblenden
    Object.entries(allTabs).forEach(([tabId, visible]) => {
        const tab = document.getElementById(tabId);
        if (tab) {
            tab.style.display = visible ? 'block' : 'none';
        }
    });
    
    // News-Tab aktivieren
    openTab('news', { target: document.getElementById('newsTab') });
}

function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }
}

function hideError() {
    const errorEl = document.getElementById('errorMessage');
    if (errorEl) {
        errorEl.style.display = 'none';
    }
}

// Globale Auth-Funktionen verfügbar machen
window.authFunctions = {
    initializeAuth,
    firebaseLogout,
    getCurrentUser: () => currentUser,
    getCurrentUserName: () => currentUser?.name || 'Unbekannt',
    isAdmin: () => currentUser?.role === 'admin',
    requireAuth: () => {
        if (!currentUser) {
            console.error('❌ Nicht authentifiziert!');
            showLoginScreen();
            return false;
        }
        return true;
    },
    requireAdmin: () => {
        if (!currentUser || currentUser.role !== 'admin') {
            console.error('❌ Admin-Rechte erforderlich!');
            alert('Diese Funktion erfordert Admin-Rechte!');
            return false;
        }
        return true;
    }
};

// Export für andere Module
window.currentUser = currentUser;
window.firebaseLogout = firebaseLogout;

console.log('✅ Firebase Authentication Module bereit');
