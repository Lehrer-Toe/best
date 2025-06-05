// Firebase News System - Realtime Database
console.log('📰 Firebase News System geladen');

// News laden und anzeigen
function loadNews() {
    console.log('📰 Lade News von Firebase...');
    
    if (!window.firebaseFunctions.requireAuth()) return;
    
    // Admin-Editor anzeigen - nur wenn User eingeloggt und Admin ist
    if (window.firebaseFunctions.isAdmin()) {
        document.getElementById('adminNewsEditor').style.display = 'block';
        
        // Zeitbegrenzung Toggle - nur einmal hinzufügen
        const zeitbegrenztCheckbox = document.getElementById('newsZeitbegrenzt');
        if (zeitbegrenztCheckbox) {
            zeitbegrenztCheckbox.removeEventListener('change', toggleAblaufField);
            zeitbegrenztCheckbox.addEventListener('change', toggleAblaufField);
        }
    } else {
        document.getElementById('adminNewsEditor').style.display = 'none';
    }
    
    const newsList = document.getElementById('newsList');
    if (!newsList) return;
    
    // News aus Cache holen
    const allNews = window.firebaseFunctions.getNewsFromCache();
    
    // News nach Relevanz filtern
    const relevanteNews = filterNewsForUser(allNews);
    
    // Abgelaufene News filtern und bereits als gelesen markierte entfernen
    const currentUserEmail = window.authFunctions.getUserEmail();
    const sanitizedEmail = window.firebaseFunctions.sanitizeEmail(currentUserEmail);
    
    const aktuelleNews = relevanteNews.filter(item => {
        // Entferne gelesen markierte News dauerhaft
        if (item.gelesenVon && item.gelesenVon[sanitizedEmail]) {
            return false;
        }
        
        // Prüfe Ablaufdatum
        if (item.ablauf) {
            return new Date(item.ablauf) >= new Date();
        }
        return true;
    });
    
    // NEU: "Alles gelesen" Button nur anzeigen wenn News vorhanden
    const newsActionBereich = document.getElementById('newsActionBereich');
    if (newsActionBereich) {
        if (aktuelleNews.length > 0) {
            newsActionBereich.style.display = 'block';
        } else {
            newsActionBereich.style.display = 'none';
        }
    }
    
    if (aktuelleNews.length === 0) {
        newsList.innerHTML = '<div class="card"><p>Keine aktuellen News vorhanden.</p></div>';
        return;
    }
    
    let html = '';
    aktuelleNews.forEach((item, index) => {
        const isAdmin = window.firebaseFunctions.isAdmin();
        
        // Relevanz-Badge hinzufügen
        let relevanzBadge = '';
        if (item.empfaenger === 'alle') {
            relevanzBadge = '<span style="background: #667eea; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.7rem; margin-left: 5px;">Für alle</span>';
        } else if (item.empfaenger === window.firebaseFunctions.getCurrentUserName()) {
            relevanzBadge = '<span style="background: #27ae60; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.7rem; margin-left: 5px;">Für Sie</span>';
        }
        
        html += `<div class="news-item ${item.wichtig ? 'wichtig' : ''}" id="news-${item.id || index}">
            <div class="news-gelesen-bereich">
                <label style="font-size: 0.9rem; cursor: pointer;">
                    <input type="checkbox" onchange="newsAlsGelesenMarkieren('${item.id || index}')" style="margin-right: 5px;">
                    Gelesen
                </label>
            </div>
            <strong>${item.titel}${relevanzBadge}</strong><br>
            ${item.text}<br>
            <small>${item.datum} ${item.autor ? '- ' + item.autor : ''}</small>
            ${isAdmin ? `<button class="btn btn-danger" style="float: right; margin-top: 10px;" onclick="newsLoeschen('${item.id || index}')">Löschen</button>` : ''}
        </div>`;
    });
    newsList.innerHTML = html;
    
    console.log('📰 News geladen:', aktuelleNews.length, 'relevante News von', allNews.length, 'gesamt');
}

// News nach Benutzer-Relevanz filtern
function filterNewsForUser(allNews) {
    const currentUserName = window.firebaseFunctions.getCurrentUserName();
    const isAdmin = window.firebaseFunctions.isAdmin();
    
    // Admin sieht alle News
    if (isAdmin) {
        return allNews;
    }
    
    // Lehrer sehen nur relevante News
    return allNews.filter(newsItem => {
        // News für alle anzeigen
        if (!newsItem.empfaenger || newsItem.empfaenger === 'alle') {
            return true;
        }
        
        // News die speziell für diesen Lehrer sind
        if (newsItem.empfaenger === currentUserName) {
            return true;
        }
        
        // News vom Admin (auch ohne spezifischen Empfänger)
        if (newsItem.autor === 'Admin' || newsItem.autor === 'System') {
            return true;
        }
        
        return false;
    });
}

// Toggle Ablauf-Feld
function toggleAblaufField() {
    const ablaufField = document.getElementById('newsAblauf');
    if (ablaufField) {
        ablaufField.style.display = this.checked ? 'block' : 'none';
    }
}

// Admin: Neue News erstellen
async function adminNewsErstellen() {
    console.log('📰 Erstelle neue News...');
    
    if (!window.firebaseFunctions.requireAdmin()) return;
    
    const titel = document.getElementById('newsTitel').value.trim();
    const text = document.getElementById('newsText').value.trim();
    const wichtig = document.getElementById('newsWichtig').checked;
    const zeitbegrenzt = document.getElementById('newsZeitbegrenzt').checked;
    const ablauf = zeitbegrenzt ? document.getElementById('newsAblauf').value : null;
    
    if (!titel || !text) {
        alert('Bitte füllen Sie Titel und Text aus!');
        return;
    }
    
    try {
        await addNews(titel, text, wichtig, window.firebaseFunctions.getCurrentUserName(), ablauf, 'alle');
        
        // Felder zurücksetzen
        document.getElementById('newsTitel').value = '';
        document.getElementById('newsText').value = '';
        document.getElementById('newsWichtig').checked = false;
        document.getElementById('newsZeitbegrenzt').checked = false;
        document.getElementById('newsAblauf').value = '';
        document.getElementById('newsAblauf').style.display = 'none';
        
        console.log('✅ News erstellt:', titel);
        
    } catch (error) {
        console.error('❌ Fehler beim Erstellen der News:', error);
        alert('Fehler beim Erstellen der News: ' + error.message);
    }
}

// News zu Firebase hinzufügen - ERWEITERT um Empfänger
async function addNews(titel, text, wichtig = false, autor = null, ablauf = null, empfaenger = 'alle') {
    if (!window.firebaseFunctions.requireAuth()) return;
    
    const newsRef = window.firebaseFunctions.getDatabaseRef('news');
    const newNewsRef = window.firebaseDB.push(newsRef);
    
    const neueNews = {
        id: newNewsRef.key,
        titel,
        text,
        datum: window.firebaseFunctions.formatGermanDate(),
        timestamp: window.firebaseFunctions.getTimestamp(),
        wichtig,
        autor: autor || window.firebaseFunctions.getCurrentUserName(),
        ablauf,
        empfaenger, // NEU: Spezifischer Empfänger oder 'alle'
        gelesenVon: {} // Object für jeden User der es gelesen hat
    };
    
    try {
        await window.firebaseDB.set(newNewsRef, neueNews);
        console.log('📰 News zu Firebase hinzugefügt:', titel, 'für:', empfaenger);
        return newNewsRef.key;
    } catch (error) {
        console.error('❌ Fehler beim Hinzufügen der News:', error);
        throw error;
    }
}

// News löschen
async function newsLoeschen(newsId) {
    if (!window.firebaseFunctions.requireAdmin()) return;
    
    try {
        // News aus Cache finden
        const allNews = window.firebaseFunctions.getNewsFromCache();
        const newsItem = allNews.find(item => (item.id || item.key) === newsId);
        
        if (!newsItem) {
            alert('News nicht gefunden!');
            return;
        }
        
        const titel = newsItem.titel;
        
        if (confirm(`News "${titel}" wirklich löschen?`)) {
            const newsRef = window.firebaseFunctions.getDatabaseRef(`news/${newsId}`);
            await window.firebaseDB.remove(newsRef);
            
            console.log('🗑️ News gelöscht:', titel);
        }
        
    } catch (error) {
        console.error('❌ Fehler beim Löschen der News:', error);
        alert('Fehler beim Löschen der News: ' + error.message);
    }
}

// News als gelesen markieren
async function newsAlsGelesenMarkieren(newsId) {
    if (!window.firebaseFunctions.requireAuth()) return;
    
    try {
        const currentUserEmail = window.authFunctions.getUserEmail();
        const sanitizedEmail = window.firebaseFunctions.sanitizeEmail(currentUserEmail);
        
        // Markiere als gelesen in Firebase
        const gelesenRef = window.firebaseFunctions.getDatabaseRef(`news/${newsId}/gelesenVon/${sanitizedEmail}`);
        await window.firebaseDB.set(gelesenRef, {
            timestamp: window.firebaseFunctions.getTimestamp(),
            user: window.firebaseFunctions.getCurrentUserName()
        });
        
        console.log('👁️ News als gelesen markiert:', newsId);
        
        // News wird durch den Realtime Listener automatisch ausgeblendet
        
    } catch (error) {
        console.error('❌ Fehler beim Markieren als gelesen:', error);
        alert('Fehler beim Markieren als gelesen: ' + error.message);
    }
}

// NEU: Alle News als gelesen markieren
async function alleNewsAlsGelesenMarkieren() {
    console.log('📚 Markiere alle News als gelesen...');
    
    if (!window.firebaseFunctions.requireAuth()) return;
    
    if (!confirm('Wirklich alle aktuell sichtbaren News als gelesen markieren?')) {
        return;
    }
    
    try {
        const currentUserEmail = window.authFunctions.getUserEmail();
        const sanitizedEmail = window.firebaseFunctions.sanitizeEmail(currentUserEmail);
        
        // Alle aktuell sichtbaren News finden
        const allNews = window.firebaseFunctions.getNewsFromCache();
        const relevanteNews = filterNewsForUser(allNews);
        
        const aktuelleNews = relevanteNews.filter(item => {
            // Nur ungelesene News
            if (item.gelesenVon && item.gelesenVon[sanitizedEmail]) {
                return false;
            }
            
            // Prüfe Ablaufdatum
            if (item.ablauf) {
                return new Date(item.ablauf) >= new Date();
            }
            return true;
        });
        
        if (aktuelleNews.length === 0) {
            alert('Keine ungelesenen News vorhanden.');
            return;
        }
        
        // Alle als gelesen markieren
        const markierungsPromises = aktuelleNews.map(async (newsItem) => {
            const gelesenRef = window.firebaseFunctions.getDatabaseRef(`news/${newsItem.id}/gelesenVon/${sanitizedEmail}`);
            return window.firebaseDB.set(gelesenRef, {
                timestamp: window.firebaseFunctions.getTimestamp(),
                user: window.firebaseFunctions.getCurrentUserName()
            });
        });
        
        await Promise.all(markierungsPromises);
        
        console.log('✅ Alle News als gelesen markiert:', aktuelleNews.length, 'News');
        alert(`${aktuelleNews.length} News wurden als gelesen markiert.`);
        
    } catch (error) {
        console.error('❌ Fehler beim Markieren aller News:', error);
        alert('Fehler beim Markieren aller News: ' + error.message);
    }
}

// News für andere Module (wird von anderen Modulen aufgerufen) - ERWEITERT
async function createNewsForAction(titel, text, wichtig = false, empfaenger = 'alle') {
    if (!window.firebaseFunctions.requireAuth()) return;
    
    try {
        return await addNews(titel, text, wichtig, window.firebaseFunctions.getCurrentUserName(), null, empfaenger);
    } catch (error) {
        console.error('❌ Fehler beim Erstellen der Action-News:', error);
        // Fehler nicht an User weiterleiten, da es nur ein Nebeneffekt ist
    }
}

// Export für andere Module
window.newsFunctions = {
    addNews,
    createNewsForAction
};

console.log('✅ Firebase News System bereit');
