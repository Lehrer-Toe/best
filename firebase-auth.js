// Firebase Authentication System - Funktionsfähige Version mit Auto-Logout
console.log('🔐 Firebase Authentication System geladen');

// Globale Variablen
let currentUser = null;
let firebaseUser = null;
let autoLogoutTimer = null;

// Auto-Logout nach 20 Minuten (ohne Warnung)
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
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
    
    // Felder leeren
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
    hideError();
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
        'datenTab', 'bewertenTab', 'vorlagenTab', 'uebersichtTab',
        'adminvorlagenTab', 'klassenTab'
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
        document.getElementById('klassenTab').style.display = 'block';
        
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
        stopAutoLogoutTimer();
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
    }
}

// Alle Tabs verstecken
function hideAllTabs() {
    const allTabs = [
        'newsTab', 'themenTab', 'gruppenTab', 'lehrerTab',
        'datenTab', 'bewertenTab', 'vorlagenTab', 'uebersichtTab',
        'adminvorlagenTab', 'klassenTab'
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
    
    // Timer bei Aktivität zurücksetzen
    resetAutoLogoutTimer();
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

console.log('✅ Firebase Authentication System bereit - Funktionsfähige Version');
