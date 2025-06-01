// Themen-System - NUR JSON-basiert, KEIN Firebase
console.log('💡 Themen-System geladen - JSON-basiert');

let aktuellesThemaEdit = null;

function loadThemen() {
    console.log('💡 Lade Themen...');
    
    const liste = document.getElementById('themenListe');
    if (!liste) return;
    
    const filter = document.getElementById('themenFachFilter').value;
    
    // Themen nach Fach filtern
    let gefilterte = themen;
    if (filter) {
        gefilterte = themen.filter(t => t.faecher && t.faecher.includes(filter));
    }
    
    let html = '';
    gefilterte.forEach((thema, index) => {
        const originalIndex = themen.indexOf(thema);
        const kannBearbeiten = thema.ersteller === (currentUser ? currentUser.name : 'System') || (currentUser && currentUser.role === 'admin');
        const kannLoeschen = kannBearbeiten;
        
        // Fächer-Badges erstellen
        let faecherBadges = '';
        if (thema.faecher && thema.faecher.length > 0) {
            faecherBadges = thema.faecher.map(fach => 
                `<span class="fach-badge">${getFachName(fach)}</span>`
            ).join(' ');
        }
        
        html += `<div class="liste-item thema-item" onclick="themaAuswaehlen('${thema.name}')">
            <div>
                <strong>${thema.name}</strong><br>
                <small>Ersteller: ${thema.ersteller}</small><br>
                <div style="margin-top: 5px;">
                    ${faecherBadges}
                </div>
            </div>
            <div>
                ${kannBearbeiten ? 
                    `<button class="btn" onclick="event.stopPropagation(); themaBearbeiten(${originalIndex})">Bearbeiten</button>` : 
                    ''}
                ${kannLoeschen ? 
                    `<button class="btn btn-danger" onclick="event.stopPropagation(); themaLoeschen(${originalIndex})">Löschen</button>` : 
                    ''}
            </div>
        </div>`;
    });
    liste.innerHTML = html || '<div class="card"><p>Keine Themen vorhanden.</p></div>';
    
    console.log('💡 Themen geladen:', gefilterte.length, 'von', themen.length);
}

function themaBearbeiten(index) {
    console.log('✏️ Bearbeite Thema:', index);
    
    if (index < 0 || index >= themen.length) return;
    
    const thema = themen[index];
    
    // Prüfe Berechtigung
    if (thema.ersteller !== (currentUser ? currentUser.name : 'System') && currentUser && currentUser.role !== 'admin') {
        alert('Sie können nur eigene Themen bearbeiten!');
        return;
    }
    
    aktuellesThemaEdit = { index, thema: {...thema} };
    ausgewaehlteFaecher = [...(thema.faecher || [])];
    
    zeigeFaecherBearbeitungsModal(thema.name);
}

function zeigeFaecherBearbeitungsModal(themaName) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'themaBearbeitenModal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Thema "${themaName}" bearbeiten</h3>
            
            <div class="input-group">
                <label>Themenname:</label>
                <input type="text" id="editThemaName" value="${themaName}">
            </div>
            
            <p>Klicken Sie auf die Fächer, die zu diesem Thema gehören:</p>
            
            <div id="editFaecherGrid" class="faecher-grid">
                ${createFaecherButtons()}
            </div>
            
            <div class="ausgewaehlte-faecher" id="editAusgewaehlteFaecherAnzeige">
                <strong>Ausgewählte Fächer:</strong> <span id="editFaecherListe">Keine</span>
            </div>
            
            <div class="modal-buttons">
                <button class="btn btn-success" onclick="themaBearbeitungSpeichern()">Speichern</button>
                <button class="btn btn-danger" onclick="themaBearbeitungAbbrechen()">Abbrechen</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Bereits ausgewählte Fächer markieren
    setTimeout(() => {
        ausgewaehlteFaecher.forEach(fach => {
            const button = document.querySelector(`[data-fach="${fach}"]`);
            if (button) {
                button.classList.add('selected');
            }
        });
        updateEditFaecherAnzeige();
    }, 100);
}

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

function themaBearbeitungSpeichern() {
    if (!aktuellesThemaEdit) return;
    
    const neuerName = document.getElementById('editThemaName').value.trim();
    
    if (!neuerName) {
        alert('Bitte geben Sie einen Thema-Namen ein!');
        return;
    }
    
    // Prüfe ob Name bereits existiert (außer bei sich selbst)
    const existierendesThema = themen.find((t, i) => t.name === neuerName && i !== aktuellesThemaEdit.index);
    if (existierendesThema) {
        alert('Ein Thema mit diesem Namen existiert bereits!');
        return;
    }
    
    if (ausgewaehlteFaecher.length === 0) {
        alert('Bitte wählen Sie mindestens ein Fach aus!');
        return;
    }
    
    // Thema aktualisieren
    themen[aktuellesThemaEdit.index] = {
        ...aktuellesThemaEdit.thema,
        name: neuerName,
        faecher: [...ausgewaehlteFaecher]
    };
    
    themaBearbeitungAbbrechen();
    loadThemen();
    
    const faecherText = ausgewaehlteFaecher.map(f => getFachName(f)).join(', ');
    addNews('Thema bearbeitet', `Das Thema "${neuerName}" wurde für die Fächer ${faecherText} aktualisiert.`);
    
    console.log('✅ Thema bearbeitet:', neuerName, 'für Fächer:', ausgewaehlteFaecher);
}

function themaBearbeitungAbbrechen() {
    const modal = document.getElementById('themaBearbeitenModal');
    if (modal) {
        modal.remove();
    }
    aktuellesThemaEdit = null;
    ausgewaehlteFaecher = [];
}

function getFachName(fachKuerzel) {
    return alleFaecherGlobal[fachKuerzel] || fachKuerzel;
}

function getAllFaecher() {
    return alleFaecherGlobal;
}

function filterThemen() {
    loadThemen();
}

let ausgewaehlteFaecher = [];

function themaHinzufuegen() {
    console.log('💡 Neues Thema hinzufügen...');
    
    if (!currentUser) {
        alert('Bitte melden Sie sich an!');
        return;
    }
    
    const input = document.getElementById('neuesThema');
    const themaName = input.value.trim();
    
    if (!themaName) {
        alert('Bitte geben Sie einen Thema-Namen ein!');
        return;
    }
    
    if (themen.find(t => t.name === themaName)) {
        alert('Dieses Thema existiert bereits!');
        return;
    }
    
    // Zeige Fächer-Auswahl Modal
    ausgewaehlteFaecher = [];
    zeigeFaecherAuswahlModal(themaName);
}

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

function createFaecherButtons() {
    const alleFaecher = getAllFaecher();
    
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
    
    updateFaecherAnzeige();
}

function updateFaecherAnzeige() {
    const anzeige = document.getElementById('faecherListe');
    if (anzeige) {
        if (ausgewaehlteFaecher.length === 0) {
            anzeige.textContent = 'Keine';
        } else {
            anzeige.textContent = ausgewaehlteFaecher.map(f => getFachName(f)).join(', ');
        }
    }
    
    // Auch für Edit-Modal
    updateEditFaecherAnzeige();
}

function speichereThemaMitFaechern(themaName) {
    if (!currentUser) {
        alert('Bitte melden Sie sich an!');
        return;
    }
    
    if (ausgewaehlteFaecher.length === 0) {
        alert('Bitte wählen Sie mindestens ein Fach aus!');
        return;
    }
    
    const neuesThema = { 
        name: themaName, 
        ersteller: currentUser.name,
        faecher: [...ausgewaehlteFaecher]
    };
    
    themen.push(neuesThema);
    
    // Modal schließen
    schließeFaecherModal();
    
    // Eingabefeld leeren
    document.getElementById('neuesThema').value = '';
    
    // Liste neu laden
    loadThemen();
    
    // News erstellen
    const faecherText = ausgewaehlteFaecher.map(f => getFachName(f)).join(', ');
    addNews('Neues Thema', `Das Thema "${themaName}" wurde für die Fächer ${faecherText} hinzugefügt.`);
    
    console.log('✅ Thema erstellt:', themaName, 'für Fächer:', ausgewaehlteFaecher);
}

function schließeFaecherModal() {
    const modal = document.getElementById('faecherAuswahlModal');
    if (modal) {
        modal.remove();
    }
    ausgewaehlteFaecher = [];
}

function themaAuswaehlen(thema) {
    console.log('💡 Thema ausgewählt:', thema);
    
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

function themaLoeschen(index) {
    if (!currentUser) {
        alert('Bitte melden Sie sich an!');
        return;
    }
    
    if (index < 0 || index >= themen.length) return;
    
    const thema = themen[index];
    
    // Prüfe Berechtigung
    if (thema.ersteller !== currentUser.name && currentUser.role !== 'admin') {
        alert('Sie können nur eigene Themen löschen!');
        return;
    }
    
    if (confirm(`Thema "${thema.name}" wirklich löschen?`)) {
        themen.splice(index, 1);
        console.log('🗑️ Thema gelöscht:', thema.name);
        loadThemen();
        addNews('Thema gelöscht', `Das Thema "${thema.name}" wurde entfernt.`);
    }
}
