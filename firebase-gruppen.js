// Firebase Gruppen-System - Realtime Database
console.log('👥 Firebase Gruppen-System geladen');

// Globale Variablen für Gruppenbearbeitung
let aktuelleGruppeEdit = null;
let vorhandeneSchuelerData = [];

// Gruppen laden und anzeigen
function loadGruppen() {
    console.log('👥 Lade Gruppen von Firebase...');
    
    if (!window.firebaseFunctions.requireAuth()) return;
    
    const liste = document.getElementById('gruppenListe');
    if (!liste) return;
    
    // Gruppen aus Cache holen
    const gruppen = window.firebaseFunctions.getGruppenFromCache();
    
    // Bewertungen für Statusanzeige laden
    const alleBewertungen = getAllBewertungsdata();
    
    let html = '';
    gruppen.forEach((gruppe) => {
        // Berechtigung prüfen - Admin oder beteiligte Lehrer können bearbeiten
        const currentUserName = window.firebaseFunctions.getCurrentUserName();
        const istBeteiligt = gruppe.schueler?.some(s => s.lehrer === currentUserName);
        const kannBearbeiten = window.firebaseFunctions.isAdmin() || istBeteiligt;
        
        html += `<div class="liste-item">
            <div>
                <strong>${gruppe.thema}</strong><br>
                <small>Erstellt: ${gruppe.erstellt} von ${gruppe.ersteller || 'System'}</small><br>
                <div style="margin-top: 0.5rem;">`;
        
        if (gruppe.schueler && Array.isArray(gruppe.schueler)) {
            gruppe.schueler.forEach(schueler => {
                const fachInfo = schueler.fach ? ` (${window.firebaseFunctions.getFachNameFromGlobal(schueler.fach)})` : '';
                const klasseInfo = schueler.klasse ? ` - ${schueler.klasse}` : '';
                
                // Bewertungsstatus prüfen
                const schuelerId = `${gruppe.id}-${schueler.name.replace(/\s/g, '-')}`;
                const istBewertet = alleBewertungen.some(b => b.schuelerId === schuelerId);
                const statusColor = istBewertet ? '#27ae60' : '#e74c3c'; // Grün oder Rot
                const statusIcon = istBewertet ? '✅' : '⏳';
                
                html += `<div style="margin: 2px 0; padding: 3px 6px; background: ${statusColor}; color: white; border-radius: 3px; display: inline-block; margin-right: 5px; font-size: 0.85rem;">
                    ${statusIcon} ${schueler.name}${klasseInfo} → ${schueler.lehrer}${fachInfo}
                </div><br>`;
            });
        }
        
        html += `</div>
            </div>
            <div>
                ${kannBearbeiten ? `<button class="btn" onclick="gruppeBearbeiten('${gruppe.id}')">Bearbeiten</button>` : ''}
                ${window.firebaseFunctions.isAdmin() ? `<button class="btn btn-danger" onclick="gruppeLoeschen('${gruppe.id}')">Löschen</button>` : ''}
            </div>
        </div>`;
    });
    
    liste.innerHTML = html || '<div class="card"><p>Keine Gruppen vorhanden.</p></div>';
    
    // Lehrer- und Fach-Auswahl für neue Gruppen aktualisieren
    updateSchuelerSelects();
    
    // NEU: Vorhandene Schüler laden und Klassenfilter aktualisieren
    loadVorhandeneSchueler();
    
    console.log('👥 Gruppen geladen:', gruppen.length);
}

// NEU: Neue Gruppe anlegen - UI öffnen
function neueGruppeAnlegen() {
    console.log('➕ Öffne Gruppen-Ersteller...');
    
    const ersteller = document.getElementById('gruppenErsteller');
    const neueGruppeBtn = document.getElementById('neueGruppeBtn');
    const abbrechenBtn = document.getElementById('gruppenAbbrechenBtn');
    
    if (ersteller) ersteller.style.display = 'block';
    if (neueGruppeBtn) neueGruppeBtn.style.display = 'none';
    if (abbrechenBtn) abbrechenBtn.style.display = 'inline-block';
    
    // Vorhandene Schüler und Klassenfilter laden
    loadVorhandeneSchueler();
    updateKlassenFilter();
}

// NEU: Gruppen-Ersteller schließen
function gruppenErstellerSchließen() {
    console.log('❌ Schließe Gruppen-Ersteller...');
    
    const ersteller = document.getElementById('gruppenErsteller');
    const neueGruppeBtn = document.getElementById('neueGruppeBtn');
    const abbrechenBtn = document.getElementById('gruppenAbbrechenBtn');
    
    if (ersteller) ersteller.style.display = 'none';
    if (neueGruppeBtn) neueGruppeBtn.style.display = 'inline-block';
    if (abbrechenBtn) abbrechenBtn.style.display = 'none';
    
    // Eingabefelder zurücksetzen
    const themaInput = document.getElementById('gruppenThema');
    if (themaInput) themaInput.value = '';
    
    // Schüler-Liste zurücksetzen
    resetSchuelerListe();
    
    // Auswahl zurücksetzen
    document.querySelectorAll('.schueler-auswahl-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
}

// NEU: Vorhandene Schüler laden
function loadVorhandeneSchueler() {
    console.log('👥 Lade vorhandene Schüler...');
    
    const gruppen = window.firebaseFunctions.getGruppenFromCache();
    const schuelerSet = new Set();
    vorhandeneSchuelerData = [];
    
    // Sammle alle einzigartigen Schüler aus allen Gruppen
    gruppen.forEach(gruppe => {
        if (gruppe.schueler && Array.isArray(gruppe.schueler)) {
            gruppe.schueler.forEach(schueler => {
                const schuelerKey = `${schueler.name}_${schueler.klasse || 'unbekannt'}`;
                if (!schuelerSet.has(schuelerKey)) {
                    schuelerSet.add(schuelerKey);
                    vorhandeneSchuelerData.push({
                        name: schueler.name,
                        klasse: schueler.klasse || 'Unbekannt',
                        lehrer: schueler.lehrer,
                        fach: schueler.fach
                    });
                }
            });
        }
    });
    
    // Nach Namen sortieren
    vorhandeneSchuelerData.sort((a, b) => a.name.localeCompare(b.name));
    
    console.log('✅ Vorhandene Schüler geladen:', vorhandeneSchuelerData.length);
    
    // Schüler-Auswahl anzeigen
    displayVorhandeneSchueler();
}

// NEU: Vorhandene Schüler anzeigen
function displayVorhandeneSchueler(filterKlasse = '') {
    const container = document.getElementById('schuelerAuswahl');
    if (!container) return;
    
    // Filtern nach Klasse wenn ausgewählt
    let anzuzeigendeSchueler = vorhandeneSchuelerData;
    if (filterKlasse) {
        anzuzeigendeSchueler = vorhandeneSchuelerData.filter(s => s.klasse === filterKlasse);
    }
    
    if (anzuzeigendeSchueler.length === 0) {
        container.innerHTML = '<p style="color: #666; font-style: italic;">Keine Schüler gefunden.</p>';
        return;
    }
    
    let html = '';
    anzuzeigendeSchueler.forEach((schueler, index) => {
        const fachName = schueler.fach ? window.firebaseFunctions.getFachNameFromGlobal(schueler.fach) : 'Allgemein';
        const checkboxId = `schueler-${index}`;
        
        html += `
            <div class="schueler-auswahl-item">
                <label for="${checkboxId}" class="schueler-auswahl-label">
                    <input type="checkbox" id="${checkboxId}" class="schueler-auswahl-checkbox" 
                           data-name="${schueler.name}" 
                           data-klasse="${schueler.klasse}"
                           data-lehrer="${schueler.lehrer}"
                           data-fach="${schueler.fach || ''}">
                    <div class="schueler-info">
                        <strong>${schueler.name}</strong>
                        <span class="schueler-klasse">${schueler.klasse}</span>
                        <small>→ ${schueler.lehrer} (${fachName})</small>
                    </div>
                </label>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// NEU: Klassenfilter aktualisieren
function updateKlassenFilter() {
    const filterSelect = document.getElementById('klassenFilter');
    if (!filterSelect) return;
    
    // Alle einzigartigen Klassen sammeln
    const klassenSet = new Set();
    vorhandeneSchuelerData.forEach(schueler => {
        if (schueler.klasse && schueler.klasse !== 'Unbekannt') {
            klassenSet.add(schueler.klasse);
        }
    });
    
    // Klassen sortieren
    const sortierteKlassen = Array.from(klassenSet).sort();
    
    let html = '<option value="">Alle Klassen</option>';
    sortierteKlassen.forEach(klasse => {
        html += `<option value="${klasse}">${klasse}</option>`;
    });
    
    filterSelect.innerHTML = html;
}

// NEU: Vorhandene Schüler nach Klasse filtern
function filterVorhandeneSchueler() {
    const filterSelect = document.getElementById('klassenFilter');
    if (!filterSelect) return;
    
    const selectedKlasse = filterSelect.value;
    displayVorhandeneSchueler(selectedKlasse);
}

// NEU: Gewählte Schüler zur Gruppe hinzufügen
function gewählteSchuelerHinzufuegen() {
    console.log('➕ Füge gewählte Schüler hinzu...');
    
    const gewählteCheckboxen = document.querySelectorAll('.schueler-auswahl-checkbox:checked');
    if (gewählteCheckboxen.length === 0) {
        alert('Bitte wählen Sie mindestens einen Schüler aus!');
        return;
    }
    
    const schuelerListe = document.getElementById('schuelerListe');
    if (!schuelerListe) return;
    
    gewählteCheckboxen.forEach(checkbox => {
        const name = checkbox.dataset.name;
        const klasse = checkbox.dataset.klasse;
        const lehrer = checkbox.dataset.lehrer;
        const fach = checkbox.dataset.fach;
        
        // Neue Schüler-Zeile erstellen
        const newRow = document.createElement('div');
        newRow.className = 'input-group schueler-row';
        
        newRow.innerHTML = `
            <input type="text" placeholder="Schülername" class="schueler-name" value="${name}">
            <input type="text" placeholder="Klasse (z.B. 9a)" class="schueler-klasse" value="${klasse}">
            <select class="schueler-lehrer">
                <option value="">Lehrer wählen...</option>
            </select>
            <select class="schueler-fach">
                <option value="">Fach wählen...</option>
            </select>
            <button type="button" class="btn btn-danger" onclick="schuelerEntfernen(this)">Entfernen</button>
        `;
        
        schuelerListe.appendChild(newRow);
        
        // Selects mit Optionen füllen und Werte setzen
        updateSchuelerSelects();
        
        // Korrekte Werte setzen
        const lehrerSelect = newRow.querySelector('.schueler-lehrer');
        const fachSelect = newRow.querySelector('.schueler-fach');
        
        if (lehrerSelect) lehrerSelect.value = lehrer;
        if (fachSelect) fachSelect.value = fach;
        
        // Checkbox deaktivieren
        checkbox.checked = false;
    });
    
    console.log('✅ Gewählte Schüler hinzugefügt');
}

// Schüler-Liste zurücksetzen
function resetSchuelerListe() {
    const schuelerListe = document.getElementById('schuelerListe');
    if (!schuelerListe) return;
    
    // Alle Zeilen außer der ersten entfernen
    const rows = schuelerListe.querySelectorAll('.schueler-row');
    for (let i = 1; i < rows.length; i++) {
        rows[i].remove();
    }
    
    // Erste Zeile leeren
    const firstRow = schuelerListe.querySelector('.schueler-row');
    if (firstRow) {
        firstRow.querySelector('.schueler-name').value = '';
        firstRow.querySelector('.schueler-klasse').value = '';
        firstRow.querySelector('.schueler-lehrer').value = '';
        firstRow.querySelector('.schueler-fach').value = '';
    }
}

// Alle Bewertungsdaten sammeln (für Statusanzeige)
function getAllBewertungsdata() {
    try {
        const alleBewertungen = [];
        const bewertungsCache = window.firebaseFunctions.dataCache.bewertungen || {};
        
        // Durch alle Lehrer-Bewertungen gehen
        Object.values(bewertungsCache).forEach(lehrerBewertungen => {
            if (lehrerBewertungen && typeof lehrerBewertungen === 'object') {
                Object.values(lehrerBewertungen).forEach(bewertung => {
                    if (bewertung && bewertung.schuelerId) {
                        alleBewertungen.push(bewertung);
                    }
                });
            }
        });
        
        return alleBewertungen;
    } catch (error) {
        console.error('❌ Fehler beim Laden der Bewertungsdaten:', error);
        return [];
    }
}

// Lehrer- und Fach-Selects aktualisieren
function updateSchuelerSelects() {
    console.log('👨‍🏫 Aktualisiere Lehrer- und Fach-Auswahl...');
    
    // Lehrer aus Firebase laden
    loadLehrerForSelects();
    
    // Fächer aus Cache holen
    const faecher = window.firebaseFunctions.getAllFaecher();
    const fachOptions = Object.entries(faecher)
        .map(([kuerzel, name]) => `<option value="${kuerzel}">${name}</option>`)
        .join('');
    
    const fachSelects = document.querySelectorAll('.schueler-fach');
    fachSelects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Fach wählen...</option>' + fachOptions;
        select.value = currentValue; // Wert wiederherstellen
    });
}

// Lehrer für Selects laden
async function loadLehrerForSelects() {
    try {
        const usersRef = window.firebaseFunctions.getDatabaseRef('users');
        const snapshot = await window.firebaseDB.get(usersRef);
        
        let lehrerOptions = '';
        if (snapshot.exists()) {
            const users = snapshot.val();
            Object.values(users).forEach(user => {
                if (user.role === 'lehrer') {
                    lehrerOptions += `<option value="${user.name}">${user.name}</option>`;
                }
            });
        }
        
        const lehrerSelects = document.querySelectorAll('.schueler-lehrer');
        lehrerSelects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = '<option value="">Lehrer wählen...</option>' + lehrerOptions;
            select.value = currentValue; // Wert wiederherstellen
        });
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der Lehrer:', error);
    }
}

// Schüler-Zeile hinzufügen
function schuelerHinzufuegen() {
    const container = document.getElementById('schuelerListe');
    if (!container) return;
    
    const newRow = document.createElement('div');
    newRow.className = 'input-group schueler-row';
    
    newRow.innerHTML = `
        <input type="text" placeholder="Schülername" class="schueler-name">
        <input type="text" placeholder="Klasse (z.B. 9a)" class="schueler-klasse">
        <select class="schueler-lehrer">
            <option value="">Lehrer wählen...</option>
        </select>
        <select class="schueler-fach">
            <option value="">Fach wählen...</option>
        </select>
        <button type="button" class="btn btn-danger" onclick="schuelerEntfernen(this)">Entfernen</button>
    `;
    
    container.appendChild(newRow);
    
    // Neue Selects mit Optionen füllen
    updateSchuelerSelects();
    
    console.log('➕ Schüler-Zeile hinzugefügt');
}

// Schüler-Zeile entfernen
function schuelerEntfernen(button) {
    const rows = document.querySelectorAll('.schueler-row');
    if (rows.length > 1) {
        button.parentElement.remove();
        console.log('➖ Schüler-Zeile entfernt');
    } else {
        alert('Mindestens ein Schüler muss vorhanden sein!');
    }
}

// Neue Gruppe erstellen - ERWEITERT für Klassen
async function gruppeErstellen() {
    console.log('👥 Erstelle neue Gruppe...');
    
    if (!window.firebaseFunctions.requireAuth()) return;
    
    const themaInput = document.getElementById('gruppenThema');
    const thema = themaInput?.value.trim();
    
    if (!thema) {
        alert('Bitte geben Sie ein Thema ein!');
        return;
    }

    const schuelerRows = document.querySelectorAll('.schueler-row');
    const schueler = [];
    
    for (let row of schuelerRows) {
        const name = row.querySelector('.schueler-name')?.value.trim();
        const klasse = row.querySelector('.schueler-klasse')?.value.trim();
        const lehrer = row.querySelector('.schueler-lehrer')?.value;
        const fach = row.querySelector('.schueler-fach')?.value;
        
        if (name && lehrer) {
            schueler.push({ 
                name, 
                klasse: klasse || '', // Klasse hinzufügen
                lehrer, 
                fach: fach || null 
            });
        } else if (name) {
            alert(`Bitte wählen Sie einen Lehrer für ${name}!`);
            return;
        }
    }

    if (schueler.length === 0) {
        alert('Bitte fügen Sie mindestens einen Schüler hinzu!');
        return;
    }

    try {
        // Gruppe zu Firebase hinzufügen
        const gruppenRef = window.firebaseFunctions.getDatabaseRef('gruppen');
        const newGruppenRef = window.firebaseDB.push(gruppenRef);
        
        const gruppe = { 
            id: newGruppenRef.key,
            thema, 
            schueler, 
            erstellt: window.firebaseFunctions.formatGermanDate(),
            timestamp: window.firebaseFunctions.getTimestamp(),
            ersteller: window.firebaseFunctions.getCurrentUserName()
        };
        
        await window.firebaseDB.set(newGruppenRef, gruppe);
        
        // News für jeden betroffenen Lehrer erstellen
        const lehrer = [...new Set(schueler.map(s => s.lehrer))];
        for (const lehrerName of lehrer) {
            const schuelerDesLehrers = schueler.filter(s => s.lehrer === lehrerName).map(s => s.name);
            if (window.newsFunctions) {
                await window.newsFunctions.createNewsForAction(
                    `Neue Bewertung für ${lehrerName}`, 
                    `Gruppe "${thema}" zugewiesen mit Schüler(n): ${schuelerDesLehrers.join(', ')}`,
                    true,
                    lehrerName // Spezifischer Empfänger
                );
            }
        }
        
        console.log('✅ Gruppe erstellt:', thema, 'mit', schueler.length, 'Schülern');
        
        alert(`Gruppe "${thema}" wurde erfolgreich erstellt!`);
        
        // Gruppen-Ersteller schließen
        gruppenErstellerSchließen();
        
    } catch (error) {
        console.error('❌ Fehler beim Erstellen der Gruppe:', error);
        alert('Fehler beim Erstellen der Gruppe: ' + error.message);
    }
}

// Gruppe bearbeiten
async function gruppeBearbeiten(gruppenId) {
    console.log('👥 Bearbeite Gruppe:', gruppenId);
    
    if (!window.firebaseFunctions.requireAuth()) return;
    
    try {
        // Gruppe aus Cache finden
        const gruppen = window.firebaseFunctions.getGruppenFromCache();
        const gruppe = gruppen.find(g => g.id === gruppenId);
        
        if (!gruppe) {
            alert('Gruppe nicht gefunden!');
            return;
        }
        
        aktuelleGruppeEdit = gruppe;
        await showGruppenEditModal();
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der Gruppe:', error);
        alert('Fehler beim Laden der Gruppe: ' + error.message);
    }
}

// Gruppen-Edit Modal anzeigen
async function showGruppenEditModal() {
    const modal = document.getElementById('gruppenEditModal');
    if (!modal) return;
    
    modal.classList.remove('hidden');
    
    // Thema setzen
    const themaInput = document.getElementById('editGruppenThema');
    if (themaInput) {
        themaInput.value = aktuelleGruppeEdit.thema;
    }
    
    // Schüler-Liste aufbauen
    await buildEditSchuelerListe();
}

// Edit-Schüler-Liste aufbauen - ERWEITERT für Klassen
async function buildEditSchuelerListe() {
    const container = document.getElementById('editSchuelerListe');
    if (!container || !aktuelleGruppeEdit) return;
    
    // Lehrer laden für Selects
    const usersRef = window.firebaseFunctions.getDatabaseRef('users');
    const snapshot = await window.firebaseDB.get(usersRef);
    
    let lehrerOptions = '<option value="">Lehrer wählen...</option>';
    if (snapshot.exists()) {
        const users = snapshot.val();
        Object.values(users).forEach(user => {
            if (user.role === 'lehrer') {
                lehrerOptions += `<option value="${user.name}">${user.name}</option>`;
            }
        });
    }
    
    // Fach-Optionen
    const faecher = window.firebaseFunctions.getAllFaecher();
    const fachOptions = '<option value="">Fach wählen...</option>' + 
        Object.entries(faecher)
            .map(([kuerzel, name]) => `<option value="${kuerzel}">${name}</option>`)
            .join('');
    
    let html = '';
    
    if (aktuelleGruppeEdit.schueler && Array.isArray(aktuelleGruppeEdit.schueler)) {
        aktuelleGruppeEdit.schueler.forEach((schueler, index) => {
            html += `
                <div class="edit-schueler-item">
                    <input type="text" value="${schueler.name}" class="edit-schueler-name" data-index="${index}">
                    <input type="text" value="${schueler.klasse || ''}" class="edit-schueler-klasse" data-index="${index}" placeholder="Klasse">
                    <select class="edit-schueler-lehrer" data-index="${index}">
                        ${lehrerOptions.replace(`value="${schueler.lehrer}"`, `value="${schueler.lehrer}" selected`)}
                    </select>
                    <select class="edit-schueler-fach" data-index="${index}">
                        ${fachOptions.replace(`value="${schueler.fach || ''}"`, `value="${schueler.fach || ''}" selected`)}
                    </select>
                    <button class="btn btn-danger" onclick="editSchuelerEntfernen(${index})">Entfernen</button>
                </div>
            `;
        });
    }
    
    container.innerHTML = html;
}

// Schüler in Edit entfernen
function editSchuelerEntfernen(index) {
    if (aktuelleGruppeEdit.schueler.length <= 1) {
        alert('Mindestens ein Schüler muss vorhanden sein!');
        return;
    }
    
    aktuelleGruppeEdit.schueler.splice(index, 1);
    buildEditSchuelerListe();
}

// Neuen Schüler in Edit hinzufügen
function neuerSchuelerInEdit() {
    if (!aktuelleGruppeEdit.schueler) {
        aktuelleGruppeEdit.schueler = [];
    }
    
    aktuelleGruppeEdit.schueler.push({ name: '', klasse: '', lehrer: '', fach: '' });
    buildEditSchuelerListe();
}

// Gruppen-Edit speichern - ERWEITERT für Klassen
async function gruppeEditSpeichern() {
    console.log('💾 Speichere Gruppen-Änderungen...');
    
    if (!window.firebaseFunctions.requireAuth() || !aktuelleGruppeEdit) return;
    
    try {
        // Daten aus Formular sammeln
        const themaInput = document.getElementById('editGruppenThema');
        const neuesThema = themaInput?.value.trim();
        
        if (!neuesThema) {
            alert('Bitte geben Sie ein Thema ein!');
            return;
        }
        
        // Schüler-Daten sammeln
        const neueSchueler = [];
        const schuelerInputs = document.querySelectorAll('.edit-schueler-item');
        
        for (let item of schuelerInputs) {
            const name = item.querySelector('.edit-schueler-name')?.value.trim();
            const klasse = item.querySelector('.edit-schueler-klasse')?.value.trim();
            const lehrer = item.querySelector('.edit-schueler-lehrer')?.value;
            const fach = item.querySelector('.edit-schueler-fach')?.value;
            
            if (name && lehrer) {
                neueSchueler.push({ 
                    name, 
                    klasse: klasse || '', // Klasse hinzufügen
                    lehrer, 
                    fach: fach || null 
                });
            } else if (name) {
                alert(`Bitte wählen Sie einen Lehrer für ${name}!`);
                return;
            }
        }
        
        if (neueSchueler.length === 0) {
            alert('Mindestens ein Schüler muss vorhanden sein!');
            return;
        }
        
        // Aktualisierte Gruppe speichern
        const updatedGruppe = {
            ...aktuelleGruppeEdit,
            thema: neuesThema,
            schueler: neueSchueler,
            lastUpdate: window.firebaseFunctions.getTimestamp()
        };
        
        const gruppenRef = window.firebaseFunctions.getDatabaseRef(`gruppen/${aktuelleGruppeEdit.id}`);
        await window.firebaseDB.set(gruppenRef, updatedGruppe);
        
        // News erstellen
        if (window.newsFunctions) {
            await window.newsFunctions.createNewsForAction(
                'Gruppe aktualisiert', 
                `Die Gruppe "${neuesThema}" wurde bearbeitet.`
            );
        }
        
        console.log('✅ Gruppe aktualisiert:', neuesThema);
        
        alert(`Gruppe "${neuesThema}" wurde erfolgreich aktualisiert!`);
        gruppeEditAbbrechen();
        
    } catch (error) {
        console.error('❌ Fehler beim Speichern der Gruppe:', error);
        alert('Fehler beim Speichern der Gruppe: ' + error.message);
    }
}

// Gruppen-Edit abbrechen
function gruppeEditAbbrechen() {
    const modal = document.getElementById('gruppenEditModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    aktuelleGruppeEdit = null;
}

// Gruppe löschen
async function gruppeLoeschen(gruppenId) {
    if (!window.firebaseFunctions.requireAdmin()) return;
    
    try {
        // Gruppe aus Cache finden
        const gruppen = window.firebaseFunctions.getGruppenFromCache();
        const gruppe = gruppen.find(g => g.id === gruppenId);
        
        if (!gruppe) {
            alert('Gruppe nicht gefunden!');
            return;
        }
        
        if (confirm(`Gruppe "${gruppe.thema}" wirklich löschen?\n\nDies löscht auch alle zugehörigen Bewertungen!`)) {
            // Gruppe löschen
            const gruppenRef = window.firebaseFunctions.getDatabaseRef(`gruppen/${gruppenId}`);
            await window.firebaseDB.remove(gruppenRef);
            
            // Zugehörige Bewertungen löschen
            await deleteGruppenBewertungen(gruppenId);
            
            // News erstellen
            if (window.newsFunctions) {
                await window.newsFunctions.createNewsForAction(
                    'Gruppe gelöscht', 
                    `Die Gruppe "${gruppe.thema}" wurde gelöscht.`
                );
            }
            
            console.log('🗑️ Gruppe gelöscht:', gruppe.thema);
            
            alert(`Gruppe "${gruppe.thema}" wurde gelöscht.`);
        }
        
    } catch (error) {
        console.error('❌ Fehler beim Löschen der Gruppe:', error);
        alert('Fehler beim Löschen der Gruppe: ' + error.message);
    }
}

// Bewertungen einer Gruppe löschen
async function deleteGruppenBewertungen(gruppenId) {
    try {
        const bewertungenRef = window.firebaseFunctions.getDatabaseRef('bewertungen');
        const snapshot = await window.firebaseDB.get(bewertungenRef);
        
        if (snapshot.exists()) {
            const alleBewertungen = snapshot.val();
            
            // Durch alle Lehrer-Bewertungen gehen
            for (const [lehrerEmail, bewertungen] of Object.entries(alleBewertungen)) {
                for (const [bewertungId, bewertung] of Object.entries(bewertungen)) {
                    // Prüfen ob Bewertung zu dieser Gruppe gehört
                    if (bewertung.schuelerId && bewertung.schuelerId.startsWith(gruppenId + '-')) {
                        const bewertungRef = window.firebaseFunctions.getDatabaseRef(`bewertungen/${lehrerEmail}/${bewertungId}`);
                        await window.firebaseDB.remove(bewertungRef);
                        console.log('🗑️ Bewertung gelöscht:', bewertungId);
                    }
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Fehler beim Löschen der Gruppen-Bewertungen:', error);
    }
}

// Gruppen-Daten für andere Module bereitstellen
function getGruppenForUser() {
    const gruppen = window.firebaseFunctions.getGruppenFromCache();
    const currentUserName = window.firebaseFunctions.getCurrentUserName();
    
    if (window.firebaseFunctions.isAdmin()) {
        return gruppen; // Admin sieht alle Gruppen
    } else {
        // Lehrer sieht nur Gruppen mit eigenen Schülern
        return gruppen.filter(gruppe => 
            gruppe.schueler && gruppe.schueler.some(s => s.lehrer === currentUserName)
        );
    }
}

// Export für andere Module
window.gruppenFunctions = {
    getGruppenForUser,
    updateSchuelerSelects
};

console.log('✅ Firebase Gruppen-System bereit');
