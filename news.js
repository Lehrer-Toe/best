// News-System - NUR JSON-basiert, KEIN Firebase
console.log('📰 News-System geladen - JSON-basiert');

function loadNews() {
    console.log('📰 Lade News...');
    
    // Admin-Editor anzeigen - nur wenn User eingeloggt und Admin ist
    if (currentUser && currentUser.role === 'admin') {
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
    
    // Abgelaufene News filtern und bereits als gelesen markierte entfernen
    const aktuelleNews = news.filter(item => {
        // Entferne gelesen markierte News dauerhaft
        if (item.gelesen === true) {
            return false;
        }
        
        // Prüfe Ablaufdatum
        if (item.ablauf) {
            return new Date(item.ablauf) >= new Date();
        }
        return true;
    });
    
    if (aktuelleNews.length === 0) {
        newsList.innerHTML = '<div class="card"><p>Keine aktuellen News vorhanden.</p></div>';
        return;
    }
    
    let html = '';
    aktuelleNews.forEach((item, index) => {
        const isAdmin = currentUser && currentUser.role === 'admin';
        const originalIndex = news.indexOf(item);
        
        html += `<div class="news-item ${item.wichtig ? 'wichtig' : ''}" id="news-${index}">
            <div class="news-gelesen-bereich">
                <label style="font-size: 0.9rem; cursor: pointer;">
                    <input type="checkbox" onchange="newsAlsGelesenMarkieren(${originalIndex})" style="margin-right: 5px;">
                    Gelesen
                </label>
            </div>
            <strong>${item.titel}</strong><br>
            ${item.text}<br>
            <small>${item.datum} ${item.autor ? '- ' + item.autor : ''}</small>
            ${isAdmin ? `<button class="btn btn-danger" style="float: right; margin-top: 10px;" onclick="newsLoeschen(${originalIndex})">Löschen</button>` : ''}
        </div>`;
    });
    newsList.innerHTML = html;
    
    console.log('📰 News geladen:', aktuelleNews.length, 'aktuelle News');
}

function toggleAblaufField() {
    const ablaufField = document.getElementById('newsAblauf');
    if (ablaufField) {
        ablaufField.style.display = this.checked ? 'block' : 'none';
    }
}

function adminNewsErstellen() {
    console.log('📰 Erstelle neue News...');
    
    // Prüfe ob User berechtigt ist
    if (!currentUser || currentUser.role !== 'admin') {
        alert('Keine Berechtigung!');
        return;
    }
    
    const titel = document.getElementById('newsTitel').value.trim();
    const text = document.getElementById('newsText').value.trim();
    const wichtig = document.getElementById('newsWichtig').checked;
    const zeitbegrenzt = document.getElementById('newsZeitbegrenzt').checked;
    const ablauf = zeitbegrenzt ? document.getElementById('newsAblauf').value : null;
    
    if (!titel || !text) {
        alert('Bitte füllen Sie Titel und Text aus!');
        return;
    }
    
    addNews(titel, text, wichtig, currentUser.name, ablauf);
    
    // Felder zurücksetzen
    document.getElementById('newsTitel').value = '';
    document.getElementById('newsText').value = '';
    document.getElementById('newsWichtig').checked = false;
    document.getElementById('newsZeitbegrenzt').checked = false;
    document.getElementById('newsAblauf').value = '';
    document.getElementById('newsAblauf').style.display = 'none';
    
    console.log('✅ News erstellt:', titel);
    loadNews();
}

function addNews(titel, text, wichtig = false, autor = null, ablauf = null) {
    const neueNews = {
        titel,
        text,
        datum: new Date().toLocaleDateString('de-DE'),
        wichtig,
        autor: autor || (currentUser ? currentUser.name : 'System'),
        ablauf,
        gelesen: false
    };
    
    news.unshift(neueNews);
    console.log('📰 News hinzugefügt:', titel);
}

function newsLoeschen(index) {
    // Prüfe ob User berechtigt ist
    if (!currentUser || currentUser.role !== 'admin') {
        alert('Keine Berechtigung!');
        return;
    }
    
    if (index >= 0 && index < news.length) {
        const titel = news[index].titel;
        if (confirm(`News "${titel}" wirklich löschen?`)) {
            news.splice(index, 1);
            console.log('🗑️ News gelöscht:', titel);
            loadNews();
        }
    }
}

function newsAlsGelesenMarkieren(index) {
    if (index >= 0 && index < news.length) {
        const titel = news[index].titel;
        news[index].gelesen = true;
        console.log('👁️ News als gelesen markiert:', titel);
        
        // News wird beim nächsten Laden automatisch ausgeblendet
        setTimeout(() => {
            loadNews();
        }, 500); // Kurze Verzögerung für bessere UX
    }
}