// Login-System - NUR JSON-basiert, KEIN Firebase
console.log('🔐 Login-System geladen - JSON-basiert');

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            console.log('🔐 Login-Versuch für:', email);
            
            const user = users.find(u => u.email === email && u.password === password);
            if (user) {
                currentUser = user;
                console.log('✅ Login erfolgreich:', user.name);
                showApp();
            } else {
                console.log('❌ Login fehlgeschlagen');
                showError('Ungültige Anmeldedaten!');
            }
        });
    }
});

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

function showApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'block';
    document.getElementById('currentUser').textContent = `${currentUser.name} (${currentUser.role})`;
    
    console.log('👤 Benutzer angemeldet:', currentUser.name, 'Rolle:', currentUser.role);
    
    // ALLE Tabs erst mal verstecken
    hideAllTabs();
    
    // Tabs je nach Rolle anzeigen
    if (currentUser.role === 'admin') {
        // Admin sieht alle Tabs
        document.getElementById('newsTab').style.display = 'block';
        document.getElementById('lehrerTab').style.display = 'block';
        document.getElementById('datenTab').style.display = 'block';
        document.getElementById('faecherTab').style.display = 'block';
        document.getElementById('checkpointsTab').style.display = 'block';
        document.getElementById('adminvorlagenTab').style.display = 'block';
        console.log('👑 Admin-Interface aktiviert');
    } else {
        // Lehrer sieht nur diese Tabs
        document.getElementById('newsTab').style.display = 'block';
        document.getElementById('themenTab').style.display = 'block';
        document.getElementById('gruppenTab').style.display = 'block';
        document.getElementById('bewertenTab').style.display = 'block';
        document.getElementById('vorlagenTab').style.display = 'block';
        document.getElementById('uebersichtTab').style.display = 'block';
        console.log('👨‍🏫 Lehrer-Interface aktiviert');
    }
    
    // App nach Login initialisieren
    if (typeof initializeApp === 'function') {
        initializeApp();
    }
}

function hideAllTabs() {
    const allTabs = [
        'newsTab', 'themenTab', 'gruppenTab', 'lehrerTab', 'datenTab', 
        'bewertenTab', 'vorlagenTab', 'uebersichtTab', 'faecherTab', 
        'checkpointsTab', 'adminvorlagenTab'
    ];
    
    allTabs.forEach(tabId => {
        const tab = document.getElementById(tabId);
        if (tab) {
            tab.style.display = 'none';
        }
    });
}

function logout() {
    console.log('👋 Benutzer meldet sich ab:', currentUser ? currentUser.name : 'unbekannt');
    currentUser = null;
    
    // Alle Tabs verstecken beim Logout
    hideAllTabs();
    
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
    
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
        errorMessage.style.display = 'none';
    }
}
