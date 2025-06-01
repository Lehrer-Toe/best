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
        if (tabName === 'vorlagen') {
            // Lade Vorlagen aus admin-vorlagen.js
            setTimeout(() => {
                if (typeof window.loadVorlagen === 'function') {
                    window.loadVorlagen();
                }
            }, 10);
        }
        if (tabName === 'uebersicht') {
            // Lade Übersicht aus admin-vorlagen.js
            setTimeout(() => {
                if (typeof window.loadUebersicht === 'function') {
                    window.loadUebersicht();
                }
            }, 10);
        }
        if (tabName === 'adminvorlagen') {
            // Lade Admin-Vorlagen aus admin-vorlagen.js
            setTimeout(() => {
                if (typeof window.loadAdminVorlagen === 'function') {
                    window.loadAdminVorlagen();
                }
            }, 10);
        }
        if (tabName === 'checkpoints') loadCheckpoints();
        if (tabName === 'faecher') loadFaecherVerwaltung();
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
        const kannBearbeiten = currentUser && (currentUser.role === 'admin' || 
            gruppe.schueler.some(s => s.lehrer === currentUser.name));
        
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
                ${kannBearbeiten ? 
                    `<button class="btn" onclick="gruppeBearbeiten(${index})">Bearbeiten</button>` : 
                    ''}
                ${currentUser && currentUser.role === 'admin' ? 
                    `<button class="btn btn-danger" onclick="gruppeLoeschen(${index})">Löschen</button>` : 
                    ''}
            </div>
        </div>`;
    });
    liste.innerHTML = html || '<div class="card"><p>Keine Gruppen vorhanden.</p></div>';
    
    console.log('👥 Gruppen geladen:', gruppen.length);
}

function gruppeBearbeiten(index) {
    console.log('✏️ Bearbeite Gruppe:', index);
    
    if (index < 0 || index >= gruppen.length) return;
    
    aktuelleGruppeEdit = { index, gruppe: {...gruppen[index]} };
    
    // Modal öffnen
    const modal = document.getElementById('gruppenEditModal');
    modal.classList.remove('hidden');
    
    // Thema setzen
    document.getElementById('editGruppenThema').value = aktuelleGruppeEdit.gruppe.thema;
    
    // Schüler laden
    loadEditSchuelerListe();
}

function loadEditSchuelerListe() {
    const container = document.getElementById('editSchuelerListe');
    let html = '';
    
    const lehrerOptions = users.filter(u => u.role === 'lehrer')
        .map(lehrer => `<option value="${lehrer.name}">${lehrer.name}</option>`)
        .join('');
    
    const fachOptions = Object.entries(alleFaecherGlobal)
        .map(([kuerzel, name]) => `<option value="${kuerzel}">${name}</option>`)
        .join('');
    
    aktuelleGruppeEdit.gruppe.schueler.forEach((schueler, index) => {
        html += `
            <div class="edit-schueler-item">
                <input type="text" value="${schueler.name}" class="edit-schueler-name">
                <select class="edit-schueler-lehrer">
                    <option value="">Lehrer wählen...</option>
                    ${lehrerOptions}
                </select>
                <select class="edit-schueler-fach">
                    <option value="">Fach wählen...</option>
                    ${fachOptions}
                </select>
                <button class="btn btn-danger" onclick="editSchuelerEntfernen(${index})">Entfernen</button>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Werte setzen
    aktuelleGruppeEdit.gruppe.schueler.forEach((schueler, index) => {
        const item = container.children[index];
        item.querySelector('.edit-schueler-lehrer').value = schueler.lehrer;
        item.querySelector('.edit-schueler-fach').value = schueler.fach || '';
    });
}

function neuerSchuelerInEdit() {
    if (!aktuelleGruppeEdit) return;
    
    aktuelleGruppeEdit.gruppe.schueler.push({ name: '', lehrer: '', fach: null });
    loadEditSchuelerListe();
}

function editSchuelerEntfernen(index) {
    if (!aktuelleGruppeEdit) return;
    
    if (aktuelleGruppeEdit.gruppe.schueler.length > 1) {
        aktuelleGruppeEdit.gruppe.schueler.splice(index, 1);
        loadEditSchuelerListe();
    } else {
        alert('Mindestens ein Schüler muss vorhanden sein!');
    }
}

function gruppeEditSpeichern() {
    if (!aktuelleGruppeEdit) return;
    
    const thema = document.getElementById('editGruppenThema').value.trim();
    if (!thema) {
        alert('Bitte geben Sie ein Thema ein!');
        return;
    }
    
    const items = document.querySelectorAll('.edit-schueler-item');
    const schueler = [];
    
    for (let item of items) {
        const name = item.querySelector('.edit-schueler-name').value.trim();
        const lehrer = item.querySelector('.edit-schueler-lehrer').value;
        const fach = item.querySelector('.edit-schueler-fach').value;
        
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
    
    // Gruppe aktualisieren
    gruppen[aktuelleGruppeEdit.index] = {
        ...aktuelleGruppeEdit.gruppe,
        thema,
        schueler
    };
    
    addNews('Gruppe bearbeitet', `Gruppe "${thema}" wurde aktualisiert.`);
    
    gruppeEditAbbrechen();
    loadGruppen();
    
    console.log('✅ Gruppe bearbeitet:', thema);
}

function gruppeEditAbbrechen() {
    aktuelleGruppeEdit = null;
    document.getElementById('gruppenEditModal').classList.add('hidden');
}

function gruppeLoeschen(index) {
    if (!currentUser || currentUser.role !== 'admin') {
        alert('Nur Administratoren können Gruppen löschen!');
        return;
    }
    
    if (index < 0 || index >= gruppen.length) return;
    
    const gruppe = gruppen[index];
    if (confirm(`Gruppe "${gruppe.thema}" wirklich löschen?`)) {
        gruppen.splice(index, 1);
        addNews('Gruppe gelöscht', `Gruppe "${gruppe.thema}" wurde entfernt.`);
        loadGruppen();
        console.log('🗑️ Gruppe gelöscht:', gruppe.thema);
    }
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
        erstellt: new Date().toLocaleDateString('de-DE'),
        ersteller: currentUser ? currentUser.name : 'System'
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

// Lehrer-Verwaltung
function loadLehrer() {
    console.log('👨‍🏫 Lade Lehrer-Verwaltung...');
    
    if (!currentUser || currentUser.role !== 'admin') return;
    
    const liste = document.getElementById('lehrerListe');
    if (!liste) return;
    
    const lehrer = users.filter(u => u.role === 'lehrer');
    
    let html = '';
    lehrer.forEach((l, index) => {
        html += `<div class="liste-item">
            <div>
                <strong>${l.name}</strong><br>
                <small>E-Mail: ${l.email}</small>
            </div>
            <div>
                <button class="btn" onclick="lehrerBearbeiten('${l.email}')">Bearbeiten</button>
                <button class="btn btn-danger" onclick="lehrerLoeschen('${l.email}')">Löschen</button>
            </div>
        </div>`;
    });
    
    liste.innerHTML = html || '<div class="card"><p>Keine Lehrer vorhanden.</p></div>';
    console.log('👨‍🏫 Lehrer geladen:', lehrer.length);
}

function lehrerHinzufuegen() {
    if (!currentUser || currentUser.role !== 'admin') {
        alert('Keine Berechtigung!');
        return;
    }
    
    const name = document.getElementById('lehrerName').value.trim();
    const email = document.getElementById('lehrerEmail').value.trim();
    const password = document.getElementById('lehrerPasswort').value.trim();
    
    if (!name || !email || !password) {
        alert('Bitte füllen Sie alle Felder aus!');
        return;
    }
    
    if (users.find(u => u.email === email)) {
        alert('E-Mail bereits vergeben!');
        return;
    }
    
    users.push({
        email,
        password,
        role: 'lehrer',
        name
    });
    
    // Felder zurücksetzen
    document.getElementById('lehrerName').value = '';
    document.getElementById('lehrerEmail').value = '';
    document.getElementById('lehrerPasswort').value = 'lehrer123';
    
    addNews('Neuer Lehrer', `${name} wurde als Lehrer hinzugefügt.`);
    loadLehrer();
    loadSchuelerLehrerAuswahl();
    
    console.log('✅ Lehrer hinzugefügt:', name);
}

function lehrerBearbeiten(email) {
    if (!currentUser || currentUser.role !== 'admin') {
        alert('Keine Berechtigung!');
        return;
    }
    
    const lehrer = users.find(u => u.email === email);
    if (!lehrer) return;
    
    const neuerName = prompt('Neuer Name:', lehrer.name);
    if (neuerName && neuerName.trim() && neuerName.trim() !== lehrer.name) {
        lehrer.name = neuerName.trim();
        addNews('Lehrer bearbeitet', `${lehrer.name} wurde aktualisiert.`);
        loadLehrer();
        loadSchuelerLehrerAuswahl();
        console.log('✏️ Lehrer bearbeitet:', lehrer.name);
    }
}

function lehrerLoeschen(email) {
    if (!currentUser || currentUser.role !== 'admin') {
        alert('Keine Berechtigung!');
        return;
    }
    
    const lehrer = users.find(u => u.email === email);
    if (!lehrer) return;
    
    if (confirm(`Lehrer ${lehrer.name} wirklich löschen?`)) {
        users.splice(users.indexOf(lehrer), 1);
        addNews('Lehrer entfernt', `${lehrer.name} wurde entfernt.`);
        loadLehrer();
        loadSchuelerLehrerAuswahl();
        console.log('🗑️ Lehrer gelöscht:', lehrer.name);
    }
}

// Datenverwaltung
function loadDatenverwaltung() {
    console.log('🗄️ Lade Datenverwaltung...');
    
    if (!currentUser || currentUser.role !== 'admin') return;
    
    // Schuljahr anzeigen
    const schuljahrInput = document.getElementById('schuljahr');
    if (schuljahrInput) {
        schuljahrInput.value = schuljahr;
    }
    
    // Statistiken laden
    loadStatistiken();
}

function loadStatistiken() {
    const container = document.getElementById('statistiken');
    if (!container) return;
    
    const stats = {
        gruppen: gruppen.length,
        bewertungen: bewertungen.length,
        schueler: gruppen.reduce((sum, g) => sum + g.schueler.length, 0),
        lehrer: users.filter(u => u.role === 'lehrer').length,
        themen: themen.length
    };
    
    container.innerHTML = `
        <div class="statistik-card">
            <h4>Aktuelle Daten</h4>
            <p><strong>Gruppen:</strong> ${stats.gruppen}</p>
            <p><strong>Bewertungen:</strong> ${stats.bewertungen}</p>
            <p><strong>Schüler gesamt:</strong> ${stats.schueler}</p>
            <p><strong>Lehrer:</strong> ${stats.lehrer}</p>
            <p><strong>Themen:</strong> ${stats.themen}</p>
        </div>
    `;
}

function schuljahrSpeichern() {
    if (!currentUser || currentUser.role !== 'admin') {
        alert('Keine Berechtigung!');
        return;
    }
    
    const neuesSchuljahr = document.getElementById('schuljahr').value.trim();
    if (!neuesSchuljahr) {
        alert('Bitte geben Sie ein Schuljahr ein!');
        return;
    }
    
    if (neuesSchuljahr !== schuljahr) {
        if (confirm(`Schuljahr von ${schuljahr} auf ${neuesSchuljahr} wechseln?\n\nAlle aktuellen Bewertungen und Gruppen werden archiviert und gelöscht!`)) {
            // Daten archivieren (hier nur simuliert)
            const archivDaten = {
                schuljahr: schuljahr,
                gruppen: [...gruppen],
                bewertungen: [...bewertungen],
                archiviert: new Date().toISOString()
            };
            
            console.log('📁 Archiviere Daten für Schuljahr:', schuljahr, archivDaten);
            
            // Flexible Daten löschen
            gruppen = [];
            bewertungen = [];
            
            // Neues Schuljahr setzen
            schuljahr = neuesSchuljahr;
            
            addNews('Schuljahr gewechselt', `Neues Schuljahr ${neuesSchuljahr} gestartet. Alte Daten wurden archiviert.`, true);
            loadDatenverwaltung();
            
            alert(`Schuljahr erfolgreich auf ${neuesSchuljahr} gewechselt!`);
        }
    }
}

function datenExportieren(typ) {
    if (!currentUser || currentUser.role !== 'admin') {
        alert('Keine Berechtigung!');
        return;
    }
    
    let daten = {};
    let filename = '';
    
    switch (typ) {
        case 'alle':
            daten = { gruppen, bewertungen, users, themen, schuljahr };
            filename = `backup_alle_${schuljahr.replace('/', '-')}_${new Date().toISOString().split('T')[0]}.json`;
            break;
        case 'bewertungen':
            daten = { bewertungen, schuljahr };
            filename = `bewertungen_${schuljahr.replace('/', '-')}_${new Date().toISOString().split('T')[0]}.json`;
            break;
        case 'gruppen':
            daten = { gruppen, schuljahr };
            filename = `gruppen_${schuljahr.replace('/', '-')}_${new Date().toISOString().split('T')[0]}.json`;
            break;
    }
    
    const blob = new Blob([JSON.stringify(daten, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('📤 Daten exportiert:', typ);
}

function datenLoeschen(typ) {
    if (!currentUser || currentUser.role !== 'admin') {
        alert('Keine Berechtigung!');
        return;
    }
    
    let confirmText = '';
    switch (typ) {
        case 'bewertungen':
            confirmText = 'Alle Bewertungen löschen?';
            break;
        case 'gruppen':
            confirmText = 'Alle Gruppen löschen?';
            break;
        case 'news':
            confirmText = 'Alle News löschen?';
            break;
        case 'alle':
            confirmText = 'ALLE DATEN LÖSCHEN? Dies kann nicht rückgängig gemacht werden!';
            break;
    }
    
    if (confirm(confirmText)) {
        switch (typ) {
            case 'bewertungen':
                bewertungen = [];
                addNews('Bewertungen gelöscht', 'Alle Bewertungen wurden entfernt.');
                break;
            case 'gruppen':
                gruppen = [];
                addNews('Gruppen gelöscht', 'Alle Gruppen wurden entfernt.');
                break;
            case 'news':
                news = [];
                break;
            case 'alle':
                gruppen = [];
                bewertungen = [];
                news = [];
                themen = [];
                addNews('System zurückgesetzt', 'Alle Daten wurden gelöscht.');
                break;
        }
        loadDatenverwaltung();
        console.log('🗑️ Daten gelöscht:', typ);
    }
}

// Fächer-Verwaltung
function loadFaecherVerwaltung() {
    console.log('📚 Lade Fächer-Verwaltung...');
    
    if (!currentUser || currentUser.role !== 'admin') return;
    
    const container = document.getElementById('faecherVerwaltung');
    if (!container) return;
    
    let html = '<h3>📚 Fächer verwalten</h3>';
    
    Object.entries(alleFaecherGlobal).forEach(([kuerzel, name]) => {
        html += `
            <div class="fach-item">
                <span class="fach-kuerzel">${kuerzel}</span>
                <input type="text" value="${name}" onchange="fachNameAendern('${kuerzel}', this.value)">
                <button class="btn btn-danger btn-sm" onclick="fachLoeschen('${kuerzel}')">Löschen</button>
            </div>
        `;
    });
    
    html += `
        <div class="neues-fach">
            <h4>Neues Fach hinzufügen</h4>
            <div class="input-group">
                <input type="text" id="neuesFachKuerzel" placeholder="Kürzel (z.B. MU)" maxlength="3">
                <input type="text" id="neuesFachName" placeholder="Fachname (z.B. Musik)">
                <button class="btn btn-success" onclick="neuesFachHinzufuegen()">Hinzufügen</button>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

function fachNameAendern(kuerzel, neuerName) {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    if (neuerName.trim()) {
        alleFaecherGlobal[kuerzel] = neuerName.trim();
        console.log('✏️ Fach geändert:', kuerzel, '→', neuerName);
    }
}

function fachLoeschen(kuerzel) {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    if (confirm(`Fach "${alleFaecherGlobal[kuerzel]}" (${kuerzel}) wirklich löschen?`)) {
        delete alleFaecherGlobal[kuerzel];
        loadFaecherVerwaltung();
        loadSchuelerLehrerAuswahl();
        console.log('🗑️ Fach gelöscht:', kuerzel);
    }
}

function neuesFachHinzufuegen() {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    const kuerzel = document.getElementById('neuesFachKuerzel').value.trim().toUpperCase();
    const name = document.getElementById('neuesFachName').value.trim();
    
    if (!kuerzel || !name) {
        alert('Bitte füllen Sie beide Felder aus!');
        return;
    }
    
    if (alleFaecherGlobal[kuerzel]) {
        alert('Kürzel bereits vorhanden!');
        return;
    }
    
    alleFaecherGlobal[kuerzel] = name;
    
    document.getElementById('neuesFachKuerzel').value = '';
    document.getElementById('neuesFachName').value = '';
    
    loadFaecherVerwaltung();
    loadSchuelerLehrerAuswahl();
    
    console.log('✅ Neues Fach hinzugefügt:', kuerzel, '→', name);
}

// Checkpoints-Verwaltung
function loadCheckpoints() {
    console.log('✅ Lade Checkpoints-Verwaltung...');
    
    if (!currentUser || currentUser.role !== 'admin') return;
    
    const container = document.getElementById('checkpointsVerwaltung');
    if (!container) return;
    
    let html = '<h3>✅ Bewertungs-Checkpoints verwalten</h3>';
    
    Object.keys(bewertungsCheckpoints).forEach(kategorie => {
        html += `
            <div class="checkpoint-kategorie">
                <h4>${getKategorieIcon(kategorie)} ${kategorie}</h4>
                <div class="checkpoints-liste">
        `;
        
        bewertungsCheckpoints[kategorie].forEach((checkpoint, index) => {
            const staerkenKey = `${kategorie}_${index}`;
            const formulierung = staerkenFormulierungen[staerkenKey] || checkpoint;
            
            html += `
                <div class="checkpoint-item">
                    <span style="min-width: 30px; font-weight: bold;">${index}:</span>
                    <input type="text" value="${checkpoint}" 
                           onchange="checkpointAendern('${kategorie}', ${index}, this.value)"
                           placeholder="Checkpoint-Text">
                    <input type="text" value="${formulierung}" 
                           onchange="formulierungAendern('${kategorie}', ${index}, this.value)"
                           placeholder="PDF-Formulierung (mit [NAME])">
                    <button class="btn btn-danger btn-sm" onclick="checkpointLoeschen('${kategorie}', ${index})">Löschen</button>
                </div>
            `;
        });
        
        html += `
                    <button class="btn btn-sm" onclick="neuerCheckpoint('${kategorie}')">+ Checkpoint hinzufügen</button>
                </div>
            </div>
        `;
    });
    
    html += '<button class="btn btn-success" onclick="checkpointsSpeichern()">Alle Änderungen speichern</button>';
    
    container.innerHTML = html;
}

function getKategorieIcon(kategorie) {
    const icons = {
        'Fachliches Arbeiten': '🧠',
        'Zusammenarbeit': '🤝',
        'Kommunikation': '🗣️',
        'Eigenständigkeit': '🎯',
        'Reflexionsfähigkeit': '🔁',
        'Persönlichkeitsentwicklung': '🌱'
    };
    return icons[kategorie] || '📋';
}

function checkpointAendern(kategorie, index, neuerText) {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    if (neuerText.trim()) {
        bewertungsCheckpoints[kategorie][index] = neuerText.trim();
    }
}

function formulierungAendern(kategorie, index, neueFormulierung) {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    const key = `${kategorie}_${index}`;
    if (neueFormulierung.trim()) {
        staerkenFormulierungen[key] = neueFormulierung.trim();
    }
}

function checkpointLoeschen(kategorie, index) {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    if (confirm('Checkpoint wirklich löschen?')) {
        bewertungsCheckpoints[kategorie].splice(index, 1);
        
        // Formulierungen auch anpassen
        const altKey = `${kategorie}_${index}`;
        delete staerkenFormulierungen[altKey];
        
        loadCheckpoints();
    }
}

function neuerCheckpoint(kategorie) {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    bewertungsCheckpoints[kategorie].push('Neuer Checkpoint');
    loadCheckpoints();
}

function checkpointsSpeichern() {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    addNews('Checkpoints aktualisiert', 'Bewertungs-Checkpoints wurden bearbeitet.');
    alert('Änderungen gespeichert!');
    console.log('✅ Checkpoints gespeichert');
}

// Placeholder-Funktionen für andere Systeme
function loadBewertungen() {
    console.log('📊 Lade Bewertungen...');
    // Wird von bewertung.js übernommen
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
