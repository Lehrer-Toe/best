// Firebase Themen System - Realtime Database - DEBUG VERSION
console.log('💡 Firebase Themen System geladen');

// Globale Variablen für Themen
let ausgewaehlteFaecher = [];

// Themen laden und anzeigen - ORIGINALE VERSION mit Debug
function loadThemen() {
    console.log('💡 loadThemen() - Lade alle Themen...');
    
    if (!window.firebaseFunctions.requireAuth()) return;
    
    const filterSelect = document.getElementById('themenFachFilter');
    const currentFilter = filterSelect ? filterSelect.value : '';
    
    console.log('🔍 Aktueller Filter beim Laden:', `"${currentFilter}"`);
    
    // Filter-Dropdown aktualisieren
    updateThemenFachFilter();
    
    // Aktuellen Filter wiederherstellen
    if (filterSelect && currentFilter !== undefined) {
        filterSelect.value = currentFilter;
        console.log('🔄 Filter wiederhergestellt auf:', `"${filterSelect.value}"`);
    }
    
    // Mit aktuellem Filter laden
    loadThemenWithFilter(currentFilter);
}

// Neue Funktion mit explizitem Filter-Parameter
function loadThemenWithFilter(filterValue) {
    console.log('💡 loadThemenWithFilter aufgerufen mit:', `"${filterValue}"`);
    
    if (!window.firebaseFunctions.requireAuth()) return;
    
    const liste = document.getElementById('themenListe');
    if (!liste) return;
    
    // Themen aus Cache holen
    const allThemen = window.firebaseFunctions.getThemenFromCache();
    console.log('📚 Alle Themen im Cache:', allThemen.length);
    
    // Debug: Zeige alle Themen mit ihren Fächern
    allThemen.forEach((thema, index) => {
        console.log(`Thema ${index + 1}: "${thema.name}" - Fächer:`, thema.faecher);
    });
    
    // EINFACHSTE FILTER-LOGIK
    let gefilterte;
    if (!filterValue || filterValue === '') {
        // ALLE anzeigen
        gefilterte = allThemen;
        console.log('✅ Zeige ALLE Themen:', gefilterte.length);
    } else {
        // Filtern
        gefilterte = allThemen.filter(thema => {
            const hatFach = thema.faecher && thema.faecher.includes(filterValue);
            console.log(`- Prüfe "${thema.name}": Fächer=${JSON.stringify(thema.faecher)} → Enthält "${filterValue}": ${hatFach}`);
            return hatFach;
        });
        console.log('✅ Gefilterte Themen:', gefilterte.length);
    }
    
    // HTML erstellen
    let html = '';
    gefilterte.forEach((thema) => {
        const kannLoeschen = thema.ersteller === window.firebaseFunctions.getCurrentUserName() || window.firebaseFunctions.isAdmin();
        
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
                <small>Erstellt von: ${thema.ersteller} am ${thema.erstellt}</small>
            </div>
            ${kannLoeschen ? 
                `<button class="btn btn-danger" onclick="event.stopPropagation(); themaLoeschen('${thema.id || thema.name}')">Löschen</button>` : 
                ''}
        </div>`;
    });
    
    liste.innerHTML = html || '<div class="card"><p>Keine Themen vorhanden.</p></div>';
    
    console.log('💡 Anzeige aktualisiert - Themen sichtbar:', gefilterte.length);
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
    console.log('🔄 Filter-Dropdown aktualisiert mit', Object.keys(alleFaecher).length, 'Fächern');
}

// Fachname aus Cache holen
function getFachName(fachKuerzel) {
    return window.firebaseFunctions.getFachNameFromGlobal(fachKuerzel);
}

// Themen filtern - KOMPLETT NEUE DEBUG-VERSION
function filterThemen() {
    console.log('🔥 filterThemen() aufgerufen!');
    
    const filterSelect = document.getElementById('themenFachFilter');
    if (!filterSelect) {
        console.error('❌ Select-Element nicht gefunden!');
        return;
    }
    
    const selectedValue = filterSelect.value;
    console.log('🔍 Gewählter Wert:', `"${selectedValue}"`, 'Index:', filterSelect.selectedIndex);
    console.log('🔍 Alle Optionen:', Array.from(filterSelect.options).map(o => `"${o.value}": "${o.text}"`));
    
    // Direkt loadThemenWithFilter aufrufen
    loadThemenWithFilter(selectedValue);
}

// Neues Thema hinzufügen
function themaHinzufuegen() {
    console.log('💡 Neues Thema hinzufügen...');
    
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
    zeigeFaecherAuswahlModal(themaName);
}

// Fächer-Auswahl Modal anzeigen
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

// Fach auswählen/abwählen
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

// Fächer-Anzeige aktualisieren
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

// Thema mit Fächern speichern
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

// Fächer-Modal schließen
function schließeFaecherModal() {
    const modal = document.getElementById('faecherAuswahlModal');
    if (modal) {
        modal.remove();
    }
    ausgewaehlteFaecher = [];
}

// Thema auswählen (für Gruppen-Erstellung)
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
    getFachName
};

console.log('✅ Firebase Themen System bereit - DEBUG VERSION');
