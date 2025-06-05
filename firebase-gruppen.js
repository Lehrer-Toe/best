// Firebase Gruppen-System - Realtime Database (Überarbeitet für Klassensystem)
console.log('👥 Firebase Gruppen-System geladen');

// Globale Variablen für Gruppenbearbeitung
let aktuelleGruppeEdit = null;
let gruppenFilter = {
    sortierung: 'thema-az',
    status: 'alle'
};

// Gruppen laden und anzeigen
function loadGruppen() {
    console.log('👥 Lade Gruppen von Firebase...');
    
    if (!window.firebaseFunctions.requireAuth()) return;
    
    const liste = document.getElementById('gruppenListe');
    if (!liste) return;
    
    // Gruppen aus Cache holen
    const alleGruppen = window.firebaseFunctions.getGruppenFromCache();
    
    // Filter anwenden
    const gefilterteGruppen = filterGruppenListe(alleGruppen);
    
    // Bewertungen für Statusanzeige laden
    const alleBewertungen = getAllBewertungsdata();
    
    let html = '';
    gefilterteGruppen.forEach((gruppe) => {
        // Berechtigung prüfen - Admin oder beteiligte Lehrer können bearbeiten
        const currentUserName = window.firebaseFunctions.getCurrentUserName();
        const istBeteiligt = gruppe.schueler?.some(s => s.lehrer === currentUserName);
        const kannBearbeiten = window.firebaseFunctions.isAdmin() || istBeteiligt;
        
        // Bewertungsstatus berechnen
        const { bewertungsStatus, bewerteteSchueler, gesamtSchueler } = getBewertungsStatusFuerGruppe(gruppe, alleBewertungen);
        
        html += `<div class="liste-item gruppe-item">
            <div>
                <strong>${gruppe.thema}</strong>
                <span class="bewertungs-status-badge ${bewertungsStatus}">${getBewertungsStatusText(bewertungsStatus)}</span><br>
                <small>Erstellt: ${gruppe.erstellt} von ${gruppe.ersteller || 'System'}</small><br>
                <small>Bewertungsstatus: ${bewerteteSchueler}/${gesamtSchueler} Schüler bewertet</small><br>
                <div style="margin-top: 0.5rem;">`;
        
        if (gruppe.schueler && Array.isArray(gruppe.schueler)) {
            gruppe.schueler.forEach(schueler => {
                const fachInfo = schueler.fach ? ` (${window.firebaseFunctions.getFachNameFromGlobal(schueler.fach)})` : '';
                
                // Bewertungsstatus prüfen
                const schuelerId = `${gruppe.id}-${schueler.name.replace(/\s/g, '-')}`;
                const istBewertet = alleBewertungen.some(b => b.schuelerId === schuelerId);
                const statusColor = istBewertet ? '#27ae60' : '#e74c3c';
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
    
    console.log('👥 Gruppen geladen:', gefilterteGruppen.length);
}

// Gruppen filtern und sortieren
function filterGruppen() {
    const sortierungSelect = document.getElementById('gruppenSortierung');
    const statusSelect = document.getElementById('gruppenStatusFilter');
    
    if (sortierungSelect) gruppenFilter.sortierung = sortierungSelect.value;
    if (statusSelect) gruppenFilter.status = statusSelect.value;
    
    loadGruppen();
}

// Gruppen-Liste filtern und sortieren
function filterGruppenListe(gruppen) {
    let gefiltert = [...gruppen];
    
    // Nur Gruppen anzeigen, die der Benutzer sehen darf
    const currentUserName = window.firebaseFunctions.getCurrentUserName();
    if (!window.firebaseFunctions.isAdmin()) {
        gefiltert = gefiltert.filter(gruppe => 
            gruppe.schueler && gruppe.schueler.some(s => s.lehrer === currentUserName)
        );
    }
    
    // Status-Filter anwenden
    if (gruppenFilter.status !== 'alle') {
        const alleBewertungen = getAllBewertungsdata();
        gefiltert = gefiltert.filter(gruppe => {
            const { bewertungsStatus } = getBewertungsStatusFuerGruppe(gruppe, alleBewertungen);
            return bewertungsStatus === gruppenFilter.status;
        });
    }
    
    // Sortierung anwenden
    switch (gruppenFilter.sortierung) {
        case 'thema-za':
            gefiltert.sort((a, b) => b.thema.localeCompare(a.thema));
            break;
        case 'datum-neu':
            gefiltert.sort((a, b) => new Date(b.timestamp || b.erstellt) - new Date(a.timestamp || a.erstellt));
            break;
        case 'datum-alt':
            gefiltert.sort((a, b) => new Date(a.timestamp || a.erstellt) - new Date(b.timestamp || b.erstellt));
            break;
        case 'groesse-auf':
            gefiltert.sort((a, b) => (a.schueler?.length || 0) - (b.schueler?.length || 0));
            break;
        case 'groesse-ab':
            gefiltert.sort((a, b) => (b.schueler?.length || 0) - (a.schueler?.length || 0));
            break;
        default: // 'thema-az'
            gefiltert.sort((a, b) => a.thema.localeCompare(b.thema));
            break;
    }
    
    return gefiltert;
}

// Bewertungsstatus für Gruppe berechnen
function getBewertungsStatusFuerGruppe(gruppe, alleBewertungen) {
    if (!gruppe.schueler || gruppe.schueler.length === 0) {
        return { bewertungsStatus: 'nicht-bewertet', bewerteteSchueler: 0, gesamtSchueler: 0 };
    }
    
    const gesamtSchueler = gruppe.schueler.length;
    let bewerteteSchueler = 0;
    
    gruppe.schueler.forEach(schueler => {
        const schuelerId = `${gruppe.id}-${schueler.name.replace(/\s/g, '-')}`;
        const istBewertet = alleBewertungen.some(b => b.schuelerId === schuelerId);
        if (istBewertet) bewerteteSchueler++;
    });
    
    let bewertungsStatus;
    if (bewerteteSchueler === 0) {
        bewertungsStatus = 'nicht-bewertet';
    } else if (bewerteteSchueler === gesamtSchueler) {
        bewertungsStatus = 'vollstaendig-bewertet';
    } else {
        bewertungsStatus = 'teilweise-bewertet';
    }
    
    return { bewertungsStatus, bewerteteSchueler, gesamtSchueler };
}

// Bewertungsstatus-Text
function getBewertungsStatusText(status) {
    switch (status) {
        case 'vollstaendig-bewertet': return 'Vollständig bewertet';
        case 'teilweise-bewertet': return 'Teilweise bewertet';
        case 'nicht-bewertet': return 'Nicht bewertet';
        default: return 'Unbekannt';
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

// === NEUE GRUPPE ANLEGEN ===

// Neue Gruppe anlegen (Modal öffnen)
function neueGruppeAnlegen() {
    console.log('👥 Öffne Neue-Gruppe-Modal...');
    
    if (!window.firebaseFunctions.requireAuth()) return;
    
    // Klassen-Select aktualisieren
    if (window.klassenFunctions) {
        window.klassenFunctions.updateKlassenSelects();
    }
    
    // Modal anzeigen
    const modal = document.getElementById('neueGruppeModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
    
    // Schüler-Bereich verstecken
    const schuelerBereich = document.getElementById('schuelerAuswahlBereich');
    if (schuelerBereich) {
        schuelerBereich.classList.add('hidden');
    }
    
    // Thema-Input zurücksetzen
    const themaInput = document.getElementById('gruppenThemaInput');
    if (themaInput) {
        themaInput.value = '';
    }
    
    // Klassen-Select zurücksetzen
    const klasseSelect = document.getElementById('gruppenKlasseSelect');
    if (klasseSelect) {
        klasseSelect.value = '';
    }
}

// Neue-Gruppe-Modal schließen
function neueGruppeModalSchliessen() {
    const modal = document.getElementById('neueGruppeModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Themen-Auswahl öffnen
function oeffneThemenAuswahl() {
    console.log('💡 Öffne Themen-Auswahl...');
    
    // Themen laden
    ladeThemenFuerAuswahl();
    
    // Modal anzeigen
    const modal = document.getElementById('themenAuswahlModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

// Themen für Auswahl laden
function ladeThemenFuerAuswahl() {
    const container = document.getElementById('themenAuswahlListe');
    if (!container) return;
    
    const themen = window.firebaseFunctions.getThemenFromCache();
    
    let html = '';
    themen.forEach(thema => {
        const faecherText = thema.faecher ? 
            thema.faecher.map(f => window.firebaseFunctions.getFachNameFromGlobal(f)).join(', ') : 
            'Allgemein';
        
        html += `
            <div class="thema-auswahl-item" onclick="themaAuswaehlen('${thema.name}')">
                <strong>${thema.name}</strong><br>
                <small>${faecherText}</small>
            </div>
        `;
    });
    
    if (!html) {
        html = '<p>Keine Themen vorhanden. Erstellen Sie zuerst Themen im Themen-Tab.</p>';
    }
    
    container.innerHTML = html;
}

// Themen filtern in Auswahl
function filterThemenAuswahl() {
    const searchInput = document.getElementById('themenSuche');
    const searchTerm = searchInput?.value.toLowerCase() || '';
    
    const items = document.querySelectorAll('.thema-auswahl-item');
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// Thema auswählen
function themaAuswaehlen(themaName) {
    const themaInput = document.getElementById('gruppenThemaInput');
    if (themaInput) {
        themaInput.value = themaName;
    }
    
    // Themen-Auswahl Modal schließen
    themenAuswahlModalSchliessen();
}

// Themen-Auswahl Modal schließen
function themenAuswahlModalSchliessen() {
    const modal = document.getElementById('themenAuswahlModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    
    // Suchfeld zurücksetzen
    const searchInput = document.getElementById('themenSuche');
    if (searchInput) {
        searchInput.value = '';
    }
}

// Schüler für Gruppe laden (nach Klassen-Auswahl)
function ladeSchuelerFuerGruppe() {
    const klasseSelect = document.getElementById('gruppenKlasseSelect');
    const schuelerBereich = document.getElementById('schuelerAuswahlBereich');
    
    if (!klasseSelect || !schuelerBereich) return;
    
    const klasseId = klasseSelect.value;
    
    if (!klasseId) {
        schuelerBereich.classList.add('hidden');
        return;
    }
    
    // Schüler der Klasse laden
    const schueler = window.klassenFunctions ? 
        window.klassenFunctions.getSchuelerFuerKlasse(klasseId) : [];
    
    if (schueler.length === 0) {
        schuelerBereich.innerHTML = '<p>Keine Schüler in dieser Klasse gefunden.</p>';
        schuelerBereich.classList.remove('hidden');
        return;
    }
    
    // Lehrer aus Firebase laden
    loadLehrerFuerSchuelerAuswahl(schueler);
}

// Lehrer für Schüler-Auswahl laden
async function loadLehrerFuerSchuelerAuswahl(schueler) {
    try {
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
        
        // Schüler-Auswahl aufbauen
        const container = document.getElementById('schuelerAuswahlListe');
        let html = '';
        
        schueler.forEach((schueler, index) => {
            const schuelerName = `${schueler.vorname} ${schueler.nachname}`;
            html += `
                <div class="schueler-auswahl-item">
                    <label class="schueler-checkbox-label">
                        <input type="checkbox" class="schueler-checkbox" data-index="${index}" data-name="${schuelerName}">
                        <span class="schueler-name">${schuelerName}</span>
                    </label>
                    <select class="schueler-lehrer-select" data-index="${index}" disabled>
                        ${lehrerOptions}
                    </select>
                    <select class="schueler-fach-select" data-index="${index}" disabled>
                        ${fachOptions}
                    </select>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        // Event-Listener für Checkboxen
        document.querySelectorAll('.schueler-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const index = this.dataset.index;
                const lehrerSelect = document.querySelector(`.schueler-lehrer-select[data-index="${index}"]`);
                const fachSelect = document.querySelector(`.schueler-fach-select[data-index="${index}"]`);
                
                if (lehrerSelect && fachSelect) {
                    lehrerSelect.disabled = !this.checked;
                    fachSelect.disabled = !this.checked;
                    
                    if (!this.checked) {
                        lehrerSelect.value = '';
                        fachSelect.value = '';
                    }
                }
            });
        });
        
        document.getElementById('schuelerAuswahlBereich').classList.remove('hidden');
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der Lehrer:', error);
        document.getElementById('schuelerAuswahlBereich').innerHTML = 
            '<p style="color: #e74c3c;">Fehler beim Laden der Lehrer!</p>';
        document.getElementById('schuelerAuswahlBereich').classList.remove('hidden');
    }
}

// Gruppe aus Modal erstellen
async function gruppeErstellenAusModal() {
    console.log('👥 Erstelle Gruppe aus Modal...');
    
    if (!window.firebaseFunctions.requireAuth()) return;
    
    const themaInput = document.getElementById('gruppenThemaInput');
    const thema = themaInput?.value.trim();
    
    if (!thema) {
        alert('Bitte wählen Sie ein Thema aus!');
        return;
    }
    
    // Ausgewählte Schüler sammeln
    const ausgewaehlteSchueler = [];
    const checkboxen = document.querySelectorAll('.schueler-checkbox:checked');
    
    for (let checkbox of checkboxen) {
        const index = checkbox.dataset.index;
        const name = checkbox.dataset.name;
        const lehrerSelect = document.querySelector(`.schueler-lehrer-select[data-index="${index}"]`);
        const fachSelect = document.querySelector(`.schueler-fach-select[data-index="${index}"]`);
        
        const lehrer = lehrerSelect?.value;
        const fach = fachSelect?.value;
        
        if (!lehrer) {
            alert(`Bitte wählen Sie einen Lehrer für ${name}!`);
            return;
        }
        
        ausgewaehlteSchueler.push({
            name,
            lehrer,
            fach: fach || null
        });
    }
    
    if (ausgewaehlteSchueler.length === 0) {
        alert('Bitte wählen Sie mindestens einen Schüler aus!');
        return;
    }
    
    try {
        // Gruppe zu Firebase hinzufügen
        const gruppenRef = window.firebaseFunctions.getDatabaseRef('gruppen');
        const newGruppenRef = window.firebaseDB.push(gruppenRef);
        
        const gruppe = {
            id: newGruppenRef.key,
            thema,
            schueler: ausgewaehlteSchueler,
            erstellt: window.firebaseFunctions.formatGermanDate(),
            timestamp: window.firebaseFunctions.getTimestamp(),
            ersteller: window.firebaseFunctions.getCurrentUserName()
        };
        
        await window.firebaseDB.set(newGruppenRef, gruppe);
        
        // News für jeden betroffenen Lehrer erstellen
        const lehrer = [...new Set(ausgewaehlteSchueler.map(s => s.lehrer))];
        for (const lehrerName of lehrer) {
            const schuelerDesLehrers = ausgewaehlteSchueler.filter(s => s.lehrer === lehrerName).map(s => s.name);
            if (window.newsFunctions) {
                await window.newsFunctions.createNewsForAction(
                    `Neue Bewertung für ${lehrerName}`,
                    `Gruppe "${thema}" zugewiesen mit Schüler(n): ${schuelerDesLehrers.join(', ')}`,
                    true,
                    lehrerName
                );
            }
        }
        
        console.log('✅ Gruppe erstellt:', thema, 'mit', ausgewaehlteSchueler.length, 'Schülern');
        alert(`Gruppe "${thema}" wurde erfolgreich erstellt!`);
        
        // Modal schließen
        neueGruppeModalSchliessen();
        
    } catch (error) {
        console.error('❌ Fehler beim Erstellen der Gruppe:', error);
        alert('Fehler beim Erstellen der Gruppe: ' + error.message);
    }
}

// === GRUPPE BEARBEITEN (Bestehende Funktionen) ===

// Gruppe bearbeiten
async function gruppeBearbeiten(gruppenId) {
    console.log('👥 Bearbeite Gruppe:', gruppenId);
    
    if (!window.firebaseFunctions.requireAuth()) return;
    
    try {
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
    filterGruppen
};

console.log('✅ Firebase Gruppen-System bereit');
