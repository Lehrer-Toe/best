// Firebase Gruppen-System - Realtime Database
console.log('👥 Firebase Gruppen-System geladen');

// Globale Variablen für Gruppenbearbeitung
let aktuelleGruppeEdit = null;

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
    
    // Lehrer- und Fach-Auswahl für neue Gruppen aktualisieren
    updateSchuelerSelects();
    
    console.log('👥 Gruppen geladen:', gruppen.length);
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
        select.innerHTML = '<option value="">Fach wählen...</option>' + fachOptions;
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
            select.innerHTML = '<option value="">Lehrer wählen...</option>' + lehrerOptions;
        });
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der Lehrer:', error);
    }
}

// Schüler-Zeile hinzufügen
function schuelerHinzufuegen() {
    console.log('➕ Füge Schüler-Zeile hinzu...');
    
    const container = document.getElementById('schuelerListe');
    if (!container) {
        console.error('❌ Container schuelerListe nicht gefunden!');
        return;
    }
    
    const newRow = document.createElement('div');
    newRow.className = 'input-group schueler-row';
    
    newRow.innerHTML = `
        <input type="text" placeholder="Schülername" class="schueler-name">
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
    
    console.log('✅ Schüler-Zeile hinzugefügt');
}

// Schüler-Zeile entfernen
function schuelerEntfernen(button) {
    console.log('➖ Entferne Schüler-Zeile...');
    
    const rows = document.querySelectorAll('.schueler-row');
    if (rows.length > 1) {
        button.parentElement.remove();
        console.log('✅ Schüler-Zeile entfernt');
    } else {
        alert('Mindestens ein Schüler muss vorhanden sein!');
    }
}

// KORRIGIERT: Neue Gruppe erstellen
async function gruppeErstellen() {
    console.log('👥 Erstelle neue Gruppe...');
    
    if (!window.firebaseFunctions.requireAuth()) {
        console.error('❌ Nicht authentifiziert!');
        return;
    }
    
    const themaInput = document.getElementById('gruppenThema');
    if (!themaInput) {
        console.error('❌ Thema-Input nicht gefunden!');
        alert('Fehler: Thema-Eingabefeld nicht gefunden!');
        return;
    }
    
    const thema = themaInput.value.trim();
    
    if (!thema) {
        alert('Bitte geben Sie ein Thema ein!');
        themaInput.focus();
        return;
    }

    const schuelerRows = document.querySelectorAll('.schueler-row');
    console.log('🔍 Gefundene Schüler-Zeilen:', schuelerRows.length);
    
    if (schuelerRows.length === 0) {
        alert('Keine Schüler-Eingabezeilen gefunden! Bitte laden Sie die Seite neu.');
        return;
    }
    
    const schueler = [];
    
    for (let row of schuelerRows) {
        const nameInput = row.querySelector('.schueler-name');
        const lehrerSelect = row.querySelector('.schueler-lehrer');
        const fachSelect = row.querySelector('.schueler-fach');
        
        const name = nameInput?.value.trim();
        const lehrer = lehrerSelect?.value;
        const fach = fachSelect?.value;
        
        console.log('📝 Schüler-Daten:', { name, lehrer, fach });
        
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

    console.log('👥 Erstelle Gruppe mit', schueler.length, 'Schülern:', schueler);

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
        
        console.log('✅ Gruppe in Firebase gespeichert:', gruppe);
        
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
        
        // Felder zurücksetzen
        themaInput.value = '';
        document.querySelectorAll('.schueler-name').forEach(input => input.value = '');
        document.querySelectorAll('.schueler-lehrer').forEach(select => select.value = '');
        document.querySelectorAll('.schueler-fach').forEach(select => select.value = '');
        
        console.log('✅ Gruppe erstellt:', thema, 'mit', schueler.length, 'Schülern');
        
        alert(`Gruppe "${thema}" wurde erfolgreich erstellt!`);
        
        // Scroll zur Gruppenliste
        const gruppenListe = document.getElementById('gruppenListe');
        if (gruppenListe) {
            gruppenListe.scrollIntoView({ behavior: 'smooth' });
        }
        
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
                    <input type="text" value="${schueler.name}" class="edit-schueler-name" data-index="${index}">
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
    
    aktuelleGruppeEdit.schueler.push({ name: '', lehrer: '', fach: '' });
    buildEditSchuelerListe();
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
        
        // Schüler-Daten sammeln
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

// GLOBALE FUNKTIONEN FÜR WINDOW - WICHTIG FÜR ONCLICK-HANDLER
window.gruppeErstellen = gruppeErstellen;
window.schuelerHinzufuegen = schuelerHinzufuegen;
window.schuelerEntfernen = schuelerEntfernen;
window.gruppeBearbeiten = gruppeBearbeiten;
window.gruppeLoeschen = gruppeLoeschen;
window.gruppeEditSpeichern = gruppeEditSpeichern;
window.gruppeEditAbbrechen = gruppeEditAbbrechen;
window.neuerSchuelerInEdit = neuerSchuelerInEdit;
window.editSchuelerEntfernen = editSchuelerEntfernen;

// Export für andere Module
window.gruppenFunctions = {
    getGruppenForUser,
    updateSchuelerSelects,
    loadGruppen, // Wichtig: auch loadGruppen exportieren
    gruppeErstellen,
    schuelerHinzufuegen,
    schuelerEntfernen
};

console.log('✅ Firebase Gruppen-System bereit - Alle Funktionen global verfügbar');
