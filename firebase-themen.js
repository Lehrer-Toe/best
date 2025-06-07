// Firebase Themen System - Realtime Database (ERWEITERT mit Bearbeitung)
console.log('💡 Firebase Themen System geladen (mit Bearbeitung)');

// Globale Variablen für Themen
let ausgewaehlteFaecher = [];
let bearbeitungsModus = false; // NEU: Track edit mode
let aktuellesThemaEdit = null; // NEU: Aktuell zu bearbeitendes Thema

// Themen laden und anzeigen
function loadThemen() {
    if (!window.firebaseFunctions.requireAuth()) return;
    
    const filterSelect = document.getElementById('themenFachFilter');
    const currentFilter = filterSelect ? filterSelect.value : '';
    
    // Filter-Dropdown aktualisieren
    updateThemenFachFilter();
    
    // Aktuellen Filter wiederherstellen
    if (filterSelect && currentFilter !== undefined) {
        filterSelect.value = currentFilter;
    }
    
    // Edit-Modus Button aktualisieren
    updateEditModeButton();
    
    // Mit aktuellem Filter laden
    loadThemenWithFilter(currentFilter);
}

// NEU: Edit-Modus Button aktualisieren
function updateEditModeButton() {
    const editButton = document.getElementById('themenEditButton');
    if (!editButton) return;
    
    if (bearbeitungsModus) {
        editButton.textContent = '✏️ Bearbeitung deaktivieren';
        editButton.className = 'btn btn-danger';
    } else {
        editButton.textContent = '✏️ Themen bearbeiten';
        editButton.className = 'btn';
    }
}

// NEU: Edit-Modus togglen
function toggleThemenEditMode() {
    bearbeitungsModus = !bearbeitungsModus;
    console.log('✏️ Themen-Bearbeitungsmodus:', bearbeitungsModus ? 'AN' : 'AUS');
    
    updateEditModeButton();
    loadThemen(); // Neu laden um Filter anzuwenden
}

// Themen mit spezifischem Filter laden (ERWEITERT)
function loadThemenWithFilter(filterValue) {
    if (!window.firebaseFunctions.requireAuth()) return;
    
    const liste = document.getElementById('themenListe');
    if (!liste) return;
    
    // Themen aus Cache holen
    let allThemen = window.firebaseFunctions.getThemenFromCache();
    
    // NEU: Im Bearbeitungsmodus nur eigene Themen anzeigen
    if (bearbeitungsModus) {
        const currentUserName = window.firebaseFunctions.getCurrentUserName();
        allThemen = allThemen.filter(thema => thema.ersteller === currentUserName);
    }
    
    // Themen filtern
    let gefilterte;
    if (!filterValue || filterValue === '') {
        gefilterte = allThemen;
    } else {
        gefilterte = allThemen.filter(thema => {
            return thema.faecher && thema.faecher.includes(filterValue);
        });
    }
    
    // HTML erstellen
    let html = '';
    gefilterte.forEach((thema) => {
        const kannLoeschen = thema.ersteller === window.firebaseFunctions.getCurrentUserName() || window.firebaseFunctions.isAdmin();
        const kannBearbeiten = thema.ersteller === window.firebaseFunctions.getCurrentUserName(); // NEU
        
        // Fächer-Badges erstellen
        let faecherBadges = '';
        if (thema.faecher && thema.faecher.length > 0) {
            faecherBadges = thema.faecher.map(fach => 
                `<span class="fach-badge">${getFachName(fach)}</span>`
            ).join(' ');
        }
        
        html += `<div class="liste-item thema-item" ${!bearbeitungsModus ? `onclick="themaAuswaehlen('${thema.name}')"` : ''}>
            <div>
                <strong>${thema.name}</strong><br>
                <div style="margin-top: 5px;">
                    ${faecherBadges}
                </div>
                <small>Erstellt von: ${thema.ersteller} am ${thema.erstellt}</small>
            </div>
            <div>
                ${bearbeitungsModus && kannBearbeiten ? 
                    `<button class="btn" onclick="event.stopPropagation(); themaBearbeiten('${thema.id || thema.name}')">Bearbeiten</button>` : 
                    ''}
                ${kannLoeschen ? 
                    `<button class="btn btn-danger" onclick="event.stopPropagation(); themaLoeschen('${thema.id || thema.name}')">Löschen</button>` : 
                    ''}
            </div>
        </div>`;
    });
    
    if (!html) {
        if (bearbeitungsModus) {
            html = '<div class="card"><p>Sie haben noch keine eigenen Themen erstellt.</p></div>';
        } else {
            html = '<div class="card"><p>Keine Themen vorhanden.</p></div>';
        }
    }
    
    liste.innerHTML = html;
}

// NEU: Thema bearbeiten
async function themaBearbeiten(themaId) {
    console.log('✏️ Bearbeite Thema:', themaId);
    
    if (!window.firebaseFunctions.requireAuth()) return;
    
    try {
        // Thema aus Cache finden
        const allThemen = window.firebaseFunctions.getThemenFromCache();
        const thema = allThemen.find(t => (t.id || t.name) === themaId);
        
        if (!thema) {
            alert('Thema nicht gefunden!');
            return;
        }
        
        // Berechtigung prüfen
        if (thema.ersteller !== window.firebaseFunctions.getCurrentUserName()) {
            alert('Sie können nur eigene Themen bearbeiten!');
            return;
        }
        
        aktuellesThemaEdit = thema;
        ausgewaehlteFaecher = [...(thema.faecher || [])];
        
        zeigeFaecherBearbeitungsModal(thema.name);
        
    } catch (error) {
        console.error('❌ Fehler beim Laden des Themas:', error);
        alert('Fehler beim Laden des Themas: ' + error.message);
    }
}

// NEU: Fächer-Bearbeitungs Modal anzeigen
function zeigeFaecherBearbeitungsModal(themaName) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'faecherBearbeitungModal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Thema bearbeiten</h3>
            
            <div class="input-group">
                <label>Thema-Name:</label>
                <input type="text" id="editThemaName" value="${themaName}" style="width: 100%;">
            </div>
            
            <p>Fächer für dieses Thema auswählen:</p>
            
            <div id="editFaecherGrid" class="faecher-grid">
                ${createFaecherButtons()}
            </div>
            
            <div class="ausgewaehlte-faecher" id="editAusgewaehlteFaecherAnzeige">
                <strong>Ausgewählte Fächer:</strong> <span id="editFaecherListe">Keine</span>
            </div>
            
            <div class="modal-buttons">
                <button class="btn btn-success" onclick="themaAktualisierungSpeichern()">Änderungen speichern</button>
                <button class="btn btn-danger" onclick="schließeBearbeitungsModal()">Abbrechen</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Bereits ausgewählte Fächer markieren
    ausgewaehlteFaecher.forEach(fach => {
        const button = modal.querySelector(`[data-fach="${fach}"]`);
        if (button) {
            button.classList.add('selected');
        }
    });
    
    updateEditFaecherAnzeige();
}

// NEU: Fächer auswählen/abwählen (Edit-Version)
function toggleFach(fachKuerzel) {
    const button = document.querySelector(`[data-fach="${fachKuerzel}"]`);
    
    if (ausgewaehlteFaecher.includes(fachKuerzel)) {
        // Fach entfernen
        ausgewaehlteFaecher = ausgewaehlteFaecher.filter(f => f !== fachKuerzel);
        button.classList.remove('selected');
    } else {
        // Fach hinzufügen
        ausgewaehlteFaecher.push(fachKuerzel);
        button.classList.add('selected');
    }
    
    // Je nach Modal aktualisieren
    if (document.getElementById('editFaecherListe')) {
        updateEditFaecherAnzeige();
    } else {
        updateFaecherAnzeige();
    }
}

// NEU: Edit-Fächer-Anzeige aktualisieren
function updateEditFaecherAnzeige() {
    const anzeige = document.getElementById('editFaecherListe');
    if (anzeige) {
        if (ausgewaehlteFaecher.length === 0) {
            anzeige.textContent = 'Keine';
        } else {
            anzeige.textContent = ausgewaehlteFaecher.map(f => getFachName(f)).join(', ');
        }
    }
}

// NEU: Thema-Aktualisierung speichern
async function themaAktualisierungSpeichern() {
    if (!window.firebaseFunctions.requireAuth() || !aktuellesThemaEdit) return;
    
    const nameInput = document.getElementById('editThemaName');
    const neuerName = nameInput?.value.trim();
    
    if (!neuerName) {
        alert('Bitte geben Sie einen Thema-Namen ein!');
        return;
    }
    
    if (ausgewaehlteFaecher.length === 0) {
        alert('Bitte wählen Sie mindestens ein Fach aus!');
        return;
    }
    
    // Prüfen ob Name geändert wurde und bereits existiert
    if (neuerName !== aktuellesThemaEdit.name) {
        const existierend = window.firebaseFunctions.getThemenFromCache().find(t => 
            t.name === neuerName && (t.id || t.name) !== (aktuellesThemaEdit.id || aktuellesThemaEdit.name)
        );
        if (existierend) {
            alert('Ein Thema mit diesem Namen existiert bereits!');
            return;
        }
    }
    
    try {
        // Thema in Firebase aktualisieren
        const themaRef = window.firebaseFunctions.getDatabaseRef(`themen/${aktuellesThemaEdit.id}`);
        
        const aktualisiertesThema = {
            ...aktuellesThemaEdit,
            name: neuerName,
            faecher: [...ausgewaehlteFaecher],
            lastUpdate: window.firebaseFunctions.getTimestamp(),
            bearbeitet: window.firebaseFunctions.formatGermanDate()
        };
        
        await window.firebaseDB.set(themaRef, aktualisiertesThema);
        
        // Modal schließen
        schließeBearbeitungsModal();
        
        // News erstellen
        const faecherText = ausgewaehlteFaecher.map(f => getFachName(f)).join(', ');
        if (window.newsFunctions) {
            await window.newsFunctions.createNewsForAction(
                'Thema aktualisiert', 
                `Das Thema "${neuerName}" wurde bearbeitet (Fächer: ${faecherText}).`
            );
        }
        
        console.log('✅ Thema aktualisiert:', neuerName, 'für Fächer:', ausgewaehlteFaecher);
        alert('Thema wurde erfolgreich aktualisiert!');
        
    } catch (error) {
        console.error('❌ Fehler beim Aktualisieren des Themas:', error);
        alert('Fehler beim Aktualisieren des Themas: ' + error.message);
    }
}

// NEU: Bearbeitungs-Modal schließen
function schließeBearbeitungsModal() {
    const modal = document.getElementById('faecherBearbeitungModal');
    if (modal) {
        modal.remove();
    }
    aktuellesThemaEdit = null;
    ausgewaehlteFaecher = [];
}

// Fach-Filter Dropdown aktualisieren
function updateThemenFachFilter() {
    const filterSelect = document.getElementById('themenFachFilter');
    if (!filterSelect) return;
    
    const alleFaecher = window.firebaseFunctions.getAllFaecher();
    let html = '<option value="">Alle Fächer</option>';
    
    Object.entries(alleFaecher).forEach(([kuerzel, name]) => {
        html += `<option value="${kuerzel}">${name}</option>`;
    });
    
    filterSelect.innerHTML = html;
}

// Fachname aus Cache holen
function getFachName(fachKuerzel) {
    return window.firebaseFunctions.getFachNameFromGlobal(fachKuerzel);
}

// Themen filtern
function filterThemen() {
    const filterSelect = document.getElementById('themenFachFilter');
    if (!filterSelect) return;
    
    const selectedValue = filterSelect.value;
    loadThemenWithFilter(selectedValue);
}

// Neues Thema hinzufügen
function themaHinzufuegen() {
    if (!window.firebaseFunctions.requireAuth()) return;
    
    const input = document.getElementById('neuesThema');
    const themaName = input.value.trim();
    
    if (!themaName) {
        alert('Bitte geben Sie einen Thema-Namen ein!');
        return;
    }
    
    // Prüfen ob Thema bereits existiert
    const existierend = window.firebaseFunctions.getThemenFromCache().find(t => t.name === themaName);
    if (existierend) {
        alert('Dieses Thema existiert bereits!');
        return;
    }
    
    // Zeige Fächer-Auswahl Modal
    ausgewaehlteFaecher = [];
    aktuellesThemaEdit = null; // Sicherstellen dass wir im Neu-Modus sind
    zeigeFaecherAuswahlModal(themaName);
}

// Fächer-Auswahl Modal anzeigen (für neue Themen)
function zeigeFaecherAuswahlModal(themaName) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'faecherAuswahlModal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Fächer für Thema "${themaName}" auswählen</h3>
            <p>Klicken Sie auf die Fächer, die zu diesem Thema gehören:</p>
            
            <div id="faecherGrid" class="faecher-grid">
                ${createFaecherButtons()}
            </div>
            
            <div class="ausgewaehlte-faecher" id="ausgewaehlteFaecherAnzeige">
                <strong>Ausgewählte Fächer:</strong> <span id="faecherListe">Keine</span>
            </div>
            
            <div class="modal-buttons">
                <button class="btn btn-success" onclick="speichereThemaMitFaechern('${themaName}')">Thema erstellen</button>
                <button class="btn btn-danger" onclick="schließeFaecherModal()">Abbrechen</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Fächer-Buttons für Modal erstellen
function createFaecherButtons() {
    const alleFaecher = window.firebaseFunctions.getAllFaecher();
    
    let html = '';
    Object.entries(alleFaecher).forEach(([kuerzel, name]) => {
        html += `
            <button class="fach-button" data-fach="${kuerzel}" onclick="toggleFach('${kuerzel}')">
                ${name}
            </button>
        `;
    });
    
    return html;
}

// Fächer-Anzeige aktualisieren (für neue Themen)
function updateFaecherAnzeige() {
    const anzeige = document.getElementById('faecherListe');
    if (anzeige) {
        if (ausgewaehlteFaecher.length === 0) {
            anzeige.textContent = 'Keine';
        } else {
            anzeige.textContent = ausgewaehlteFaecher.map(f => getFachName(f)).join(', ');
        }
    }
}

// Thema mit Fächern speichern (für neue Themen)
async function speichereThemaMitFaechern(themaName) {
    if (!window.firebaseFunctions.requireAuth()) return;
    
    if (ausgewaehlteFaecher.length === 0) {
        alert('Bitte wählen Sie mindestens ein Fach aus!');
        return;
    }
    
    try {
        // Thema zu Firebase hinzufügen
        const themenRef = window.firebaseFunctions.getDatabaseRef('themen');
        const newThemaRef = window.firebaseDB.push(themenRef);
        
        const neuesThema = { 
            id: newThemaRef.key,
            name: themaName, 
            ersteller: window.firebaseFunctions.getCurrentUserName(),
            faecher: [...ausgewaehlteFaecher],
            erstellt: window.firebaseFunctions.formatGermanDate(),
            timestamp: window.firebaseFunctions.getTimestamp()
        };
        
        await window.firebaseDB.set(newThemaRef, neuesThema);
        
        // Modal schließen
        schließeFaecherModal();
        
        // Eingabefeld leeren
        document.getElementById('neuesThema').value = '';
        
        // News erstellen
        const faecherText = ausgewaehlteFaecher.map(f => getFachName(f)).join(', ');
        if (window.newsFunctions) {
            await window.newsFunctions.createNewsForAction(
                'Neues Thema', 
                `Das Thema "${themaName}" wurde für die Fächer ${faecherText} hinzugefügt.`
            );
        }
        
        console.log('✅ Thema erstellt:', themaName, 'für Fächer:', ausgewaehlteFaecher);
        
    } catch (error) {
        console.error('❌ Fehler beim Erstellen des Themas:', error);
        alert('Fehler beim Erstellen des Themas: ' + error.message);
    }
}

// Fächer-Modal schließen (für neue Themen)
function schließeFaecherModal() {
    const modal = document.getElementById('faecherAuswahlModal');
    if (modal) {
        modal.remove();
    }
    ausgewaehlteFaecher = [];
}

// Thema auswählen (für Gruppen-Erstellung)
function themaAuswaehlen(thema) {
    // Im Bearbeitungsmodus keine Auswahl möglich
    if (bearbeitungsModus) return;
    
    const gruppenThemaInput = document.getElementById('gruppenThema');
    if (gruppenThemaInput) {
        gruppenThemaInput.value = thema;
    }
    
    // Wechsle zu Gruppen-Tab
    openTab('gruppen');
    
    const gruppenButton = document.querySelector('[onclick="openTab(\'gruppen\')"]');
    if (gruppenButton) {
        gruppenButton.classList.add('active');
    }
}

// Thema löschen
async function themaLoeschen(themaId) {
    if (!window.firebaseFunctions.requireAuth()) return;
    
    try {
        // Thema aus Cache finden
        const allThemen = window.firebaseFunctions.getThemenFromCache();
        const thema = allThemen.find(t => (t.id || t.name) === themaId);
        
        if (!thema) {
            alert('Thema nicht gefunden!');
            return;
        }
        
        // Prüfe Berechtigung
        if (thema.ersteller !== window.firebaseFunctions.getCurrentUserName() && !window.firebaseFunctions.isAdmin()) {
            alert('Sie können nur eigene Themen löschen!');
            return;
        }
        
        if (confirm(`Thema "${thema.name}" wirklich löschen?`)) {
            const themaRef = window.firebaseFunctions.getDatabaseRef(`themen/${themaId}`);
            await window.firebaseDB.remove(themaRef);
            
            // News erstellen
            if (window.newsFunctions) {
                await window.newsFunctions.createNewsForAction(
                    'Thema gelöscht', 
                    `Das Thema "${thema.name}" wurde entfernt.`
                );
            }
            
            console.log('🗑️ Thema gelöscht:', thema.name);
        }
        
    } catch (error) {
        console.error('❌ Fehler beim Löschen des Themas:', error);
        alert('Fehler beim Löschen des Themas: ' + error.message);
    }
}

// Themen-Daten für andere Module bereitstellen
function getThemenForDropdown() {
    return window.firebaseFunctions.getThemenFromCache().map(thema => ({
        value: thema.name,
        text: thema.name,
        faecher: thema.faecher
    }));
}

// Export für andere Module
window.themenFunctions = {
    getThemenForDropdown,
    getFachName,
    toggleThemenEditMode // NEU: Export für Button
};

console.log('✅ Firebase Themen System bereit (mit Bearbeitung)');
