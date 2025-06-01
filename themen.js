// Themen-System - NUR JSON-basiert, KEIN Firebase
console.log('💡 Themen-System geladen - JSON-basiert');

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
        const kannLoeschen = thema.ersteller === (currentUser ? currentUser.name : 'System') || (currentUser && currentUser.role === 'admin');
        
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
                <div style="margin-top: 5px;">
                    ${faecherBadges}
                </div>
            </div>
            ${kannLoeschen ? 
                `<button class="btn btn-danger" onclick="event.stopPropagation(); themaLoeschen(${originalIndex})">Löschen</button>` : 
                ''}
        </div>`;
    });
    liste.innerHTML = html || '<div class="card"><p>Keine Themen vorhanden.</p></div>';
    
    console.log('💡 Themen geladen:', gefilterte.length, 'von', themen.length);
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