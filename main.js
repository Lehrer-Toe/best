// Hauptsystem - NUR JSON-basiert, KEIN Firebase
console.log('🚀 Main.js geladen - JSON-basiert, KEIN Firebase');

// Globale Variablen für Datenspeicherung
let currentUser = null;
let users = [];
let alleFaecherGlobal = {};
let bewertungsCheckpoints = {};
let themen = [];
let gruppen = [];
let bewertungen = [];
let vorlagen = {};
let news = [];
let schuljahr = '2025/26';
let briefvorlage = {};
let staerkenFormulierungen = {};
let aktuelleGruppeEdit = null;

// Daten laden beim Start
async function loadInitialData() {
    console.log('📂 loadInitialData() gestartet...');
    
    try {
        console.log('📂 Lade JSON-Dateien...');
        
        // Benutzer laden
        console.log('📂 Lade users.json...');
        const usersResponse = await fetch('users.json');
        if (!usersResponse.ok) throw new Error(`users.json HTTP ${usersResponse.status}`);
        const usersData = await usersResponse.json();
        users = usersData.users;
        console.log('✅ Benutzer geladen:', users.length, 'Accounts');

        // Fächer laden
        console.log('📂 Lade faecher.json...');
        const faecherResponse = await fetch('faecher.json');
        if (!faecherResponse.ok) throw new Error(`faecher.json HTTP ${faecherResponse.status}`);
        const faecherData = await faecherResponse.json();
        alleFaecherGlobal = faecherData.faecher;
        console.log('✅ Fächer geladen:', Object.keys(alleFaecherGlobal).length, 'Fächer');

        // Bewertungscheckpoints laden
        console.log('📂 Lade bewertungsCheckpoints.json...');
        const checkpointsResponse = await fetch('bewertungsCheckpoints.json');
        if (!checkpointsResponse.ok) throw new Error(`bewertungsCheckpoints.json HTTP ${checkpointsResponse.status}`);
        const checkpointsData = await checkpointsResponse.json();
        bewertungsCheckpoints = checkpointsData.bewertungsCheckpoints;
        console.log('✅ Bewertungscheckpoints geladen:', Object.keys(bewertungsCheckpoints).length, 'Kategorien');

        // Themen laden
        console.log('📂 Lade themen.json...');
        const themenResponse = await fetch('themen.json');
        if (!themenResponse.ok) throw new Error(`themen.json HTTP ${themenResponse.status}`);
        const themenData = await themenResponse.json();
        themen = themenData.themen;
        console.log('✅ Themen geladen:', themen.length, 'Themen');

        // Briefvorlage laden
        console.log('📂 Lade briefvorlage.json...');
        const briefvorlageResponse = await fetch('briefvorlage.json');
        if (!briefvorlageResponse.ok) throw new Error(`briefvorlage.json HTTP ${briefvorlageResponse.status}`);
        const briefvorlageData = await briefvorlageResponse.json();
        briefvorlage = briefvorlageData.briefvorlage;
        console.log('✅ Briefvorlage geladen');

        // System-Konfiguration laden
        console.log('📂 Lade config.json...');
        const configResponse = await fetch('config.json');
        if (!configResponse.ok) throw new Error(`config.json HTTP ${configResponse.status}`);
        const configData = await configResponse.json();
        schuljahr = configData.systemConfig.schuljahr;
        staerkenFormulierungen = configData.staerkenFormulierungen;
        console.log('✅ System-Konfiguration geladen für Schuljahr:', schuljahr);

        console.log('✅ ALLE Grunddaten erfolgreich geladen');
        
        // Demo-Daten laden
        await loadDemoData();
        
        console.log('🎉 System vollständig initialisiert - JSON-basiert');
        
    } catch (error) {
        console.error('❌ FEHLER beim Laden der Grunddaten:', error);
        throw error;
    }
}

// Demo-Daten laden (optional)
async function loadDemoData() {
    console.log('📋 Lade Demo-Daten...');
    
    try {
        // Demo-Gruppen laden
        const gruppenResponse = await fetch('demo-gruppen.json');
        if (gruppenResponse.ok) {
            const gruppenData = await gruppenResponse.json();
            gruppen = gruppenData.gruppen;
            console.log('✅ Demo-Gruppen geladen:', gruppen.length);
        }

        // Demo-Bewertungen laden
        const bewertungenResponse = await fetch('demo-bewertungen.json');
        if (bewertungenResponse.ok) {
            const bewertungenData = await bewertungenResponse.json();
            bewertungen = bewertungenData.bewertungen;
            console.log('✅ Demo-Bewertungen geladen:', bewertungen.length);
        }

        // Demo-Vorlagen laden
        const vorlagenResponse = await fetch('demo-vorlagen.json');
        if (vorlagenResponse.ok) {
            const vorlagenData = await vorlagenResponse.json();
            vorlagen = vorlagenData.vorlagen;
            console.log('✅ Demo-Vorlagen geladen');
        }

        // Demo-News laden
        const newsResponse = await fetch('demo-news.json');
        if (newsResponse.ok) {
            const newsData = await newsResponse.json();
            news = newsData.news;
            console.log('✅ Demo-News geladen:', news.length);
        }

        console.log('✅ Demo-Daten erfolgreich geladen');
        
    } catch (error) {
        console.warn('⚠️ Demo-Daten konnten nicht geladen werden:', error);
        // Fallback zu leeren Arrays/Objekten
        gruppen = [];
        bewertungen = [];
        vorlagen = {};
        news = [];
        
        // Erstelle Basis-News
        addNews('System gestartet', 'Das Bewertungssystem wurde erfolgreich gestartet.', false, 'System');
    }
}

// App-Initialisierung nach Login
function initializeApp() {
    console.log('🚀 Initialisiere App nach Login...');
    
    if (!currentUser) {
        console.error('❌ Kein Benutzer angemeldet!');
        return;
    }
    
    console.log('👤 Benutzer:', currentUser.name, 'Rolle:', currentUser.role);
    
    // Lade Inhalte der aktiven Tabs
    try {
        loadNews();
        loadThemen();
        loadSchuelerLehrerAuswahl();
        console.log('✅ App-Interface geladen');
    } catch (error) {
        console.error('❌ Fehler beim Laden der App-Inhalte:', error);
    }
}

// Tab-Navigation
function openTab(tabName) {
    const contents = document.querySelectorAll('.tab-content');
    const buttons = document.querySelectorAll('.tab-btn');
    
    contents.forEach(content => content.classList.remove('active'));
    buttons.forEach(button => button.classList.remove('active'));
    
    document.getElementById(tabName).classList.add('active');
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    console.log('📑 Tab gewechselt zu:', tabName);
    
    // Tab-spezifische Inhalte laden
    try {
        if (tabName === 'news') loadNews();
        if (tabName === 'themen') loadThemen();
        if (tabName === 'gruppen') loadGruppen();
        if (tabName === 'lehrer') loadLehrer();
        if (tabName === 'daten') loadDatenverwaltung();
        if (tabName === 'bewerten') loadBewertungen();
        if (tabName === 'vorlagen') loadVorlagen();
        if (tabName === 'uebersicht') loadUebersicht();
        if (tabName === 'adminvorlagen') loadAdminVorlagen();
    } catch (error) {
        console.error('❌ Fehler beim Laden von Tab:', tabName, error);
    }
}

// Gruppen-System
function loadGruppen() {
    console.log('👥 Lade Gruppen...');
    
    const liste = document.getElementById('gruppenListe');
    if (!liste) return;
    
    let html = '';
    gruppen.forEach((gruppe, index) => {
        html += `<div class="liste-item">
            <div>
                <strong>${gruppe.thema}</strong><br>
                <small>Erstellt: ${gruppe.erstellt}</small><br>
                <div style="margin-top: 0.5rem;">`;
        
        gruppe.schueler.forEach(schueler => {
            const fachInfo = schueler.fach ? ` (${getFachNameFromGlobal(schueler.fach)})` : '';
            html += `${schueler.name} → ${schueler.lehrer}${fachInfo}<br>`;
        });
        
        html += `</div>
            </div>
            <div>
                <button class="btn" onclick="gruppeBearbeiten(${index})">Bearbeiten</button>
                <button class="btn btn-danger" onclick="gruppeLoeschen(${index})">Löschen</button>
            </div>
        </div>`;
    });
    liste.innerHTML = html || '<div class="card"><p>Keine Gruppen vorhanden.</p></div>';
    
    console.log('👥 Gruppen geladen:', gruppen.length);
}

function getFachNameFromGlobal(fachKuerzel) {
    return alleFaecherGlobal[fachKuerzel] || fachKuerzel;
}

function loadSchuelerLehrerAuswahl() {
    console.log('👨‍🏫 Aktualisiere Lehrer-Auswahl...');
    
    const selects = document.querySelectorAll('.schueler-lehrer');
    const lehrerOptions = users.filter(u => u.role === 'lehrer')
        .map(lehrer => `<option value="${lehrer.name}">${lehrer.name}</option>`)
        .join('');
    
    selects.forEach(select => {
        select.innerHTML = '<option value="">Lehrer wählen...</option>' + lehrerOptions;
    });
    
    // Fach-Selects auch laden
    const fachSelects = document.querySelectorAll('.schueler-fach');
    const fachOptions = Object.entries(alleFaecherGlobal)
        .map(([kuerzel, name]) => `<option value="${kuerzel}">${name}</option>`)
        .join('');
    
    fachSelects.forEach(select => {
        select.innerHTML = '<option value="">Fach wählen...</option>' + fachOptions;
    });
    
    console.log('👨‍🏫 Lehrer-Auswahl aktualisiert');
}

function schuelerHinzufuegen() {
    const container = document.getElementById('schuelerListe');
    const newRow = document.createElement('div');
    newRow.className = 'input-group schueler-row';
    
    const lehrerOptions = users.filter(u => u.role === 'lehrer')
        .map(lehrer => `<option value="${lehrer.name}">${lehrer.name}</option>`)
        .join('');
    
    const fachOptions = Object.entries(alleFaecherGlobal)
        .map(([kuerzel, name]) => `<option value="${kuerzel}">${name}</option>`)
        .join('');
    
    newRow.innerHTML = `
        <input type="text" placeholder="Schülername" class="schueler-name">
        <select class="schueler-lehrer">
            <option value="">Lehrer wählen...</option>
            ${lehrerOptions}
        </select>
        <select class="schueler-fach">
            <option value="">Fach wählen...</option>
            ${fachOptions}
        </select>
        <button type="button" class="btn btn-danger" onclick="schuelerEntfernen(this)">Entfernen</button>
    `;
    
    container.appendChild(newRow);
    console.log('➕ Schüler-Zeile hinzugefügt');
}

function schuelerEntfernen(button) {
    const rows = document.querySelectorAll('.schueler-row');
    if (rows.length > 1) {
        button.parentElement.remove();
        console.log('➖ Schüler-Zeile entfernt');
    } else {
        alert('Mindestens ein Schüler muss vorhanden sein!');
    }
}

function gruppeErstellen() {
    console.log('👥 Erstelle neue Gruppe...');
    
    const thema = document.getElementById('gruppenThema').value.trim();
    if (!thema) {
        alert('Bitte geben Sie ein Thema ein!');
        return;
    }

    const schuelerRows = document.querySelectorAll('.schueler-row');
    const schueler = [];
    
    for (let row of schuelerRows) {
        const name = row.querySelector('.schueler-name').value.trim();
        const lehrer = row.querySelector('.schueler-lehrer').value;
        const fach = row.querySelector('.schueler-fach').value;
        
        if (name && lehrer) {
            schueler.push({ name, lehrer, fach: fach || null });
        } else if (name) {
            alert(`Bitte wählen Sie einen Lehrer für ${name}!`);
            return;
        }
    }

    if (schueler.length === 0) {
        alert('Bitte fügen Sie mindestens einen Schüler hinzu!');
        return;
    }

    const gruppe = { 
        thema, 
        schueler, 
        id: Date.now(),
        erstellt: new Date().toLocaleDateString('de-DE')
    };
    gruppen.push(gruppe);
    
    // News für jeden betroffenen Lehrer erstellen
    const lehrer = [...new Set(schueler.map(s => s.lehrer))];
    lehrer.forEach(lehrerName => {
        const schuelerDesLehrers = schueler.filter(s => s.lehrer === lehrerName).map(s => s.name);
        addNews(`Neue Bewertung für ${lehrerName}`, 
               `Gruppe "${thema}" zugewiesen mit Schüler(n): ${schuelerDesLehrers.join(', ')}`, true);
    });
    
    // Felder zurücksetzen
    document.getElementById('gruppenThema').value = '';
    document.querySelectorAll('.schueler-name').forEach(input => input.value = '');
    document.querySelectorAll('.schueler-lehrer').forEach(select => select.value = '');
    document.querySelectorAll('.schueler-fach').forEach(select => select.value = '');
    
    console.log('✅ Gruppe erstellt:', thema, 'mit', schueler.length, 'Schülern');
    loadGruppen();
}

// Placeholder-Funktionen für andere Systeme
function loadLehrer() {
    console.log('👨‍🏫 Lade Lehrer-Verwaltung...');
    // Wird implementiert...
}

function loadDatenverwaltung() {
    console.log('🗄️ Lade Datenverwaltung...');
    // Wird implementiert...
}

function loadBewertungen() {
    console.log('📊 Lade Bewertungen...');
    // Wird implementiert...
}

function loadVorlagen() {
    console.log('📋 Lade Vorlagen...');
    // Wird implementiert...
}

function loadUebersicht() {
    console.log('📈 Lade Übersicht...');
    // Wird implementiert...
}

function loadAdminVorlagen() {
    console.log('⚙️ Lade Admin-Vorlagen...');
    // Wird implementiert...
}

function loadThemen() {
    console.log('💡 Lade Themen...');
    // Wird von themen.js übernommen
}

// addNews Hilfsfunktion
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

// Sicherstellung dass alle Funktionen verfügbar sind
console.log('✅ Main.js vollständig geladen - alle Funktionen verfügbar');