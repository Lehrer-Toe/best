// Firebase Gruppen-System - Realtime Database mit Klassen-Filter
console.log('👥 Firebase Gruppen-System geladen');

// Globale Variablen für Gruppenbearbeitung
let aktuelleGruppeEdit = null;
let verfuegbareSchueler = []; // Alle Schüler aus gewählter Klasse
let bereitsZugewieseneSchueler = []; // Bereits zugewiesene Schüler

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
    
    // Bereits zugewiesene Schüler sammeln für Filter
    updateBereitsZugewieseneSchueler();
    
    let html = '';
    gruppen.forEach((gruppe) => {
        // Berechtigung prüfen - Admin oder beteiligte Lehrer können bearbeiten
        const currentUserName = window.firebaseFunctions.getCurrentUserName();
        const istBeteiligt = gruppe.schueler?.some(s => s.lehrer === currentUserName);
        const kannBearbeiten = window.firebaseFunctions.isAdmin() || istBeteiligt;
        
        html += `<div class="liste-item">
            <div>
                <strong>${gruppe.thema}</strong><br>
                <small>Klasse: ${gruppe.klasse || 'Keine Klasse'} | Erstellt: ${gruppe.erstellt} von ${gruppe.ersteller || 'System'}</small><br>
                <div style="margin-top: 0.5rem;">`;
        
        if (gruppe.schueler && Array.isArray(gruppe.schueler)) {
            gruppe.schueler.forEach(schueler => {
                const fachInfo = schueler.fach ? ` (${window.firebaseFunctions.getFachNameFromGlobal(schueler.fach)})` : '';
                
                // Bewertungsstatus prüfen
                const schuelerId = `${gruppe.id}-${schueler.name.replace(/\s/g, '-')}`;
                const istBewertet = alleBewertungen.some(b => b.schuelerId === schuelerId);
                const statusColor = istBewertet ? '#27ae60' : '#e74c3c'; // Grün oder Rot
                const statusIcon = istBewertet ? '✅' : '⏳';
                
                html += `<div style="margin: 2px 0; padding: 3px 6px; background: ${statusColor}; color: white; border-radius: 3px; display: inline-block; margin-right: 5px; font-size: 0.85rem;">
                    ${statusIcon} ${schueler.name} → ${schueler.lehrer}${fachInfo}
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
    
    // Klassen-Filter und Lehrer-Auswahl für neue Gruppen aktualisieren
    loadKlassenFilter();
    updateSchuelerSelects();
    
    console.log('👥 Gruppen geladen:', gruppen.length);
}

// Klassen-Filter laden
async function loadKlassenFilter() {
    console.log('🏫 Lade Klassen für Filter...');
    
    try {
        const klassenSelect = document.getElementById('klassenFilter');
        if (!klassenSelect) return;
        
        // Klassen aus Cache holen
        const klassen = window.firebaseFunctions.getKlassenFromCache();
        
        let html = '<option value="">Klasse wählen...</option>';
        Object.keys(klassen).forEach(klassenName => {
            html += `<option value="${klassenName}">${klassenName}</option>`;
        });
        
        klassenSelect.innerHTML = html;
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der Klassen:', error);
    }
}

// Klasse ausgewählt - Schüler laden
function klasseAusgewaehlt() {
    const klassenSelect = document.getElementById('klassenFilter');
    const selectedKlasse = klassenSelect?.value;
    
    if (!selectedKlasse) {
        verfuegbareSchueler = [];
        updateSchuelerSelects();
        return;
    }
    
    console.log('🏫 Klasse ausgewählt:', selectedKlasse);
    
    // Schüler der gewählten Klasse laden
    const klassen = window.firebaseFunctions.getKlassenFromCache();
    const klassenDaten = klassen[selectedKlasse];
    
    if (klassenDaten && klassenDaten.schueler) {
        verfuegbareSchueler = klassenDaten.schueler.map(schueler => ({
            ...schueler,
            klasse: selectedKlasse
        }));
    } else {
        verfuegbareSchueler = [];
    }
    
    // Bereits zugewiesene Schüler herausfiltern
    updateBereitsZugewieseneSchueler();
    updateSchuelerDropdowns();
    
    // Erste Schüler-Zeile automatisch aktualisieren
    updateSchuelerSelects();
}

// Bereits zugewiesene Schüler sammeln
function updateBereitsZugewieseneSchueler() {
    bereitsZugewieseneSchueler = [];
    
    const gruppen = window.firebaseFunctions.getGruppenFromCache();
    gruppen.forEach(gruppe => {
        if (gruppe.schueler) {
            gruppe.schueler.forEach(schueler => {
                bereitsZugewieseneSchueler.push(schueler.name);
            });
        }
    });
    
    console.log('📋 Bereits zugewiesene Schüler:', bereitsZugewieseneSchueler.length);
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

// Schüler-Dropdowns aktualisieren
function updateSchuelerDropdowns() {
    const schuelerSelects = document.querySelectorAll('.schueler-name-select');
    
    schuelerSelects.forEach(select => {
        const currentValue = select.value;
        
        // Verfügbare Schüler (nicht bereits zugewiesen)
        const verfuegbar = verfuegbareSchueler.filter(schueler => 
            !bereitsZugewieseneSchueler.includes(schueler.name) || schueler.name === currentValue
        );
        
        let html = '<option value="">Schüler wählen...</option>';
        verfuegbar.forEach(schueler => {
            const selected = schueler.name === currentValue ? 'selected' : '';
            html += `<option value="${schueler.name}" ${selected}>${schueler.name}</option>`;
        });
        
        select.innerHTML = html;
    });
    
    // Statistik anzeigen
    updateSchuelerStatistik();
}

// Schüler-Statistik anzeigen
function updateSchuelerStatistik() {
    const statistikElement = document.getElementById('schuelerStatistik');
    if (!statistikElement) return;
    
    const klassenSelect = document.getElementById('klassenFilter');
    const selectedKlasse = klassenSelect?.value;
    
    if (!selectedKlasse) {
        statistikElement.innerHTML = '<p>Wählen Sie eine Klasse aus, um Schüler zu sehen.</p>';
        return;
    }
    
    const gesamt = verfuegbareSchueler.length;
    const verfuegbar = verfuegbareSchueler.filter(s => !bereitsZugewieseneSchueler.includes(s.name)).length;
    const zugewiesen = gesamt - verfuegbar;
    
    statistikElement.innerHTML = `
        <div class="schueler-statistik">
            <strong>Klasse ${selectedKlasse}:</strong>
            <span class="stat-item">📊 Gesamt: ${gesamt}</span>
            <span class="stat-item verfuegbar">✅ Verfügbar: ${verfuegbar}</span>
            <span class="stat-item zugewiesen">📝 Zugewiesen: ${zugewiesen}</span>
        </div>
    `;
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
        select.innerHTML = '<option value="">Fach wählen...</option>' + fachOptions;
    });
    
    // Schüler-Dropdowns aktualisieren
    updateSchuelerDropdowns();
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
            select.innerHTML = '<option value="">Lehrer wählen...</option>' + lehrerOptions;
        });
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der Lehrer:', error);
    }
}

// Schüler-Zeile hinzufügen (mit Dropdown)
function schuelerHinzufuegen() {
    const container = document.getElementById('schuelerListe');
    if (!container) return;
    
    const klassenSelect = document.getElementById('klassenFilter');
    const selectedKlasse = klassenSelect?.value;
    
    if (!selectedKlasse) {
        alert('Bitte wählen Sie zuerst eine Klasse aus!');
        return;
    }
    
    const newRow = document.createElement('div');
    newRow.className = 'input-group schueler-row';
    
    newRow.innerHTML = `
        <select class="schueler-name-select" onchange="schuelerAusgewaehlt(this)">
            <option value="">Schüler wählen...</option>
        </select>
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

// Schüler ausgewählt (Event Handler)
function schuelerAusgewaehlt(select) {
    const selectedName = select.value;
    if (!selectedName) return;
    
    // Schüler-Daten finden
    const schueler = verfuegbareSchueler.find(s => s.name === selectedName);
    if (!schueler) return;
    
    // Automatisch Lehrer vorauswählen falls verfügbar
    const row = select.closest('.schueler-row');
    const lehrerSelect = row.querySelector('.schueler-lehrer');
    
    if (schueler.klassenlehrer && lehrerSelect) {
        // Prüfen ob Klassenlehrer in der Lehrer-Liste ist
        const lehrerOption = Array.from(lehrerSelect.options).find(opt => opt.value === schueler.klassenlehrer);
        if (lehrerOption) {
            lehrerSelect.value = schueler.klassenlehrer;
        }
    }
    
    console.log('👤 Schüler ausgewählt:', selectedName);
}

// Schüler-Zeile entfernen
function schuelerEntfernen(button) {
    const rows = document.querySelectorAll('.schueler-row');
    if (rows.length > 1) {
        button.parentElement.remove();
        updateSchuelerDropdowns(); // Dropdowns nach Entfernen aktualisieren
        console.log('➖ Schüler-Zeile entfernt');
    } else {
        alert('Mindestens ein Schüler muss vorhanden sein!');
    }
}

// Neue Gruppe erstellen (angepasst für Klassen)
async function gruppeErstellen() {
    console.log('👥 Erstelle neue Gruppe...');
    
    if (!window.firebaseFunctions.requireAuth()) return;
    
    const themaInput = document.getElementById('gruppenThema');
    const thema = themaInput?.value.trim();
    
    const klassenSelect = document.getElementById('klassenFilter');
    const selectedKlasse = klassenSelect?.value;
    
    if (!thema) {
        alert('Bitte geben Sie ein Thema ein!');
        return;
    }
    
    if (!selectedKlasse) {
        alert('Bitte wählen Sie eine Klasse aus!');
        return;
    }

    const schuelerRows = document.querySelectorAll('.schueler-row');
    const schueler = [];
    
    for (let row of schuelerRows) {
        const nameSelect = row.querySelector('.schueler-name-select');
        const name = nameSelect?.value;
        const lehrer = row.querySelector('.schueler-lehrer')?.value;
        const fach = row.querySelector('.schueler-fach')?.value;
        
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

    try {
        // Gruppe zu Firebase hinzufügen
        const gruppenRef = window.firebaseFunctions.getDatabaseRef('gruppen');
        const newGruppenRef = window.firebaseDB.push(gruppenRef);
        
        const gruppe = { 
            id: newGruppenRef.key,
            thema, 
            klasse: selectedKlasse,
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
                    `Gruppe "${thema}" (Klasse ${selectedKlasse}) zugewiesen mit Schüler(n): ${schuelerDesLehrers.join(', ')}`,
                    true,
                    lehrerName // Spezifischer Empfänger
                );
            }
        }
        
        // Felder zurücksetzen
        themaInput.value = '';
        klassenSelect.value = '';
        verfuegbareSchueler = [];
        
        // Alle Schüler-Zeilen bis auf eine entfernen
        const schuelerListe = document.getElementById('schuelerListe');
        if (schuelerListe) {
            schuelerListe.innerHTML = `
                <div class="input-group schueler-row">
                    <select class="schueler-name-select" onchange="schuelerAusgewaehlt(this)">
                        <option value="">Schüler wählen...</option>
                    </select>
                    <select class="schueler-lehrer">
                        <option value="">Lehrer wählen...</option>
                    </select>
                    <select class="schueler-fach">
                        <option value="">Fach wählen...</option>
                    </select>
                    <button type="button" class="btn btn-danger" onclick="schuelerEntfernen(this)">Entfernen</button>
                </div>
            `;
        }
        
        updateSchuelerSelects();
        updateSchuelerStatistik();
        
        console.log('✅ Gruppe erstellt:', thema, 'mit', schueler.length, 'Schülern aus Klasse', selectedKlasse);
        
        alert(`Gruppe "${thema}" wurde erfolgreich erstellt!`);
        
    } catch (error) {
        console.error('❌ Fehler beim Erstellen der Gruppe:', error);
        alert('Fehler beim Erstellen der Gruppe: ' + error.message);
    }
}

// Gruppe bearbeiten (Rest bleibt gleich wie vorher)
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

// Edit-Schüler-Liste aufbauen
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
                    <input type="text" value="${schueler.name}" class="edit-schueler-name" data-index="${index}" readonly style="background: #f0f0f0;">
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

// Neuen Schüler in Edit hinzufügen (vereinfacht)
function neuerSchuelerInEdit() {
    alert('Das Hinzufügen neuer Schüler beim Bearbeiten ist nicht möglich. Bitte erstellen Sie eine neue Gruppe.');
}

// Gruppen-Edit speichern
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
        
        // Schüler-Daten sammeln (nur Lehrer und Fach können geändert werden)
        const neueSchueler = [];
        const schuelerInputs = document.querySelectorAll('.edit-schueler-item');
        
        for (let item of schuelerInputs) {
            const name = item.querySelector('.edit-schueler-name')?.value.trim();
            const lehrer = item.querySelector('.edit-schueler-lehrer')?.value;
            const fach = item.querySelector('.edit-schueler-fach')?.value;
            
            if (name && lehrer) {
                neueSchueler.push({ name, lehrer, fach: fach || null });
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

// Gruppe löschen (bleibt wie vorher)
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
    updateSchuelerSelects,
    klasseAusgewaehlt,
    schuelerAusgewaehlt
};

console.log('✅ Firebase Gruppen-System bereit');
