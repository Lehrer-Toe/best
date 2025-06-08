let currentUser = null;
let firebaseUser = null;
// Aktuellen Benutzer auch im globalen Window verfügbar machen,
// damit andere Module (z.B. firebase-gruppen.js) darauf zugreifen können
window.currentUser = null;
let autoLogoutTimer = null;

const AUTO_LOGOUT_TIME = 20 * 60 * 1000; // 20 Minuten in Millisekunden

function initializeAuth() {
    
    window.firebaseAuth.onAuthStateChanged(window.auth, (user) => {
        if (user) {
            firebaseUser = user;
            handleAuthenticatedUser(user);
        } else {
            firebaseUser = null;
            currentUser = null;
            window.currentUser = null;
            stopAutoLogoutTimer();
            showLoginScreen();
            // Beim Logout auch den Toggle verstecken
            if (typeof window.showGroupCreationToggleIfAuthorized === 'function') {
                window.showGroupCreationToggleIfAuthorized(false);
            }
        }
    });
    
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showError('Bitte E-Mail und Passwort eingeben!');
        return;
    }
    
    
    try {
        const userCredential = await window.firebaseAuth.signInWithEmailAndPassword(window.auth, email, password);
        
        
    } catch (error) {
        
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

async function handleAuthenticatedUser(firebaseUser) {
    
    try {
        const userDataRef = window.firebaseDB.ref(window.database, `users/${sanitizeEmail(firebaseUser.email)}`);
        const snapshot = await window.firebaseDB.get(userDataRef);
        
        if (snapshot.exists()) {
            const userData = snapshot.val();
            currentUser = {
                email: firebaseUser.email,
                uid: firebaseUser.uid,
                ...userData
            };
            // Auch für andere Skripte bereitstellen
            window.currentUser = currentUser;
            
            showApp();
            
            startAutoLogoutTimer();

            // === WICHTIG: Hier wird die Sichtbarkeit des Toggles gesteuert ===
            // Wenn der Benutzer Admin oder Lehrer ist, zeige den Toggle an.
            const isAuthorizedForGroupCreation = currentUser.role === 'admin' || currentUser.role === 'lehrer';
            if (typeof window.showGroupCreationToggleIfAuthorized === 'function') {
                window.showGroupCreationToggleIfAuthorized(isAuthorizedForGroupCreation);
            }
            // ================================================================
            
        } else {
            showError('Benutzer nicht berechtigt. Bitte kontaktieren Sie den Administrator.');
            await firebaseLogout();
        }
        
    } catch (error) {
        showError('Fehler beim Laden der Benutzerdaten!');
        await firebaseLogout();
    }
}

function startAutoLogoutTimer() {
    stopAutoLogoutTimer(); // Vorherigen Timer stoppen
    
    autoLogoutTimer = setTimeout(async () => {
        await firebaseLogout();
    }, AUTO_LOGOUT_TIME);
}

function stopAutoLogoutTimer() {
    if (autoLogoutTimer) {
        clearTimeout(autoLogoutTimer);
        autoLogoutTimer = null;
    }
}

function resetAutoLogoutTimer() {
    if (currentUser && firebaseUser) {
        startAutoLogoutTimer();
    }
}

function showLoginScreen() {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
    
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
    hideError();
}

function showApp() {
    if (!currentUser) {
        return;
    }
    
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'block';
    document.getElementById('currentUser').textContent = `${currentUser.name} (${currentUser.role})`;
    
    
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
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    document.getElementById('newsTab').style.display = 'block';
    document.getElementById('news').classList.add('active');
    
    if (currentUser.role === 'admin') {
        document.getElementById('newsTab').style.display = 'block';
        document.getElementById('lehrerTab').style.display = 'block';
        document.getElementById('datenTab').style.display = 'block';
        document.getElementById('adminvorlagenTab').style.display = 'block';
        document.getElementById('klassenTab').style.display = 'block';
        
        document.getElementById('newsTab').classList.add('active');
        
    } else if (currentUser.role === 'lehrer') {
        document.getElementById('newsTab').style.display = 'block';
        document.getElementById('themenTab').style.display = 'block';
        document.getElementById('gruppenTab').style.display = 'block';
        document.getElementById('bewertenTab').style.display = 'block';
        document.getElementById('vorlagenTab').style.display = 'block';
        document.getElementById('uebersichtTab').style.display = 'block';
        
        document.getElementById('newsTab').classList.add('active');
        
    } else {
        showError('Unbekannte Benutzerrolle!');
        return;
    }
    
    if (typeof initializeAppAfterLogin === 'function') {
        initializeAppAfterLogin();
    }
}

async function firebaseLogout() {
    
    try {
        stopAutoLogoutTimer();
        await window.firebaseAuth.signOut(window.auth);

        currentUser = null;
        window.currentUser = null;
        firebaseUser = null;
        
        hideAllTabs();
        showLoginScreen();

        // Beim Logout auch den Toggle für Gruppenerstellung verstecken
        if (typeof window.showGroupCreationToggleIfAuthorized === 'function') {
            window.showGroupCreationToggleIfAuthorized(false);
        }
        
    } catch (error) {
        showError('Fehler beim Abmelden!');
    }
}

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
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        errorDiv.style.background = '#fdf2f2';
        errorDiv.style.color = '#e74c3c';
    }
}

function showSuccess(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        errorDiv.style.background = '#f0f9ff';
        errorDiv.style.color = '#27ae60';
    }
}

function hideError() {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

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

function requireAuth() {
    if (!currentUser || !firebaseUser) {
        showError('Bitte melden Sie sich an!');
        showLoginScreen();
        return false;
    }
    
    resetAutoLogoutTimer();
    return true;
}

function requireAdmin() {
    if (!requireAuth()) return false;
    
    if (!isAdmin()) {
        showError('Keine Berechtigung für diese Aktion!');
        return false;
    }
    return true;
}

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

// Neue Funktion für die Berechtigungsprüfung des Gruppen-Toggles
function checkGruppenAnlegenBerechtigung() {
    if (typeof window.showGroupCreationToggleIfAuthorized === 'function') {
        const isAuthorized = currentUser && (currentUser.role === 'admin' || currentUser.role === 'lehrer');
        window.showGroupCreationToggleIfAuthorized(isAuthorized);
    }
}

document.addEventListener('click', resetAutoLogoutTimer);
document.addEventListener('keypress', resetAutoLogoutTimer);
document.addEventListener('scroll', resetAutoLogoutTimer);

window.authFunctions = {
    requireAuth,
    requireAdmin,
    isAdmin,
    isLehrer,
    getCurrentUserName,
    getUserUid,
    getUserEmail,
    sanitizeEmail,
    updateFirebaseStatus,
    checkGruppenAnlegenBerechtigung // Neu hinzugefügt
};
