// Firebase Bewertungs-System - Realtime Database
console.log('📊 Firebase Bewertungs-System geladen');

// Globale Variablen für Bewertung
let aktuelleBewertung = null;
let aktuelleVorlage = null;

// Bewertungs-Tab Navigation
function openBewertungTab(tabName) {
    const contents = document.querySelectorAll('.bewertung-tab-content');
    const buttons = document.querySelectorAll('.bewertung-tab-btn');
    
    contents.forEach(content => content.classList.remove('active'));
    buttons.forEach(button => button.classList.remove('active'));
    
    document.getElementById(tabName + 'Tab').classList.add('active');
    if (event && event.target) {
        event.target.classList.add('active');
    }
}

// Bewertungen laden und anzeigen
async function loadBewertungen() {
    console.log('📊 Lade Bewertungen von Firebase...');
    
    if (!window.firebaseFunctions.requireAuth()) return;
    
    const liste = document.getElementById('bewertungsListe');
    if (!liste) return;
    
    // Sammle alle Schüler des aktuellen Lehrers aus Gruppen
    const meineSchueler = [];
    const gruppen = window.firebaseFunctions.getGruppenFromCache();
    const currentUserName = window.firebaseFunctions.getCurrentUserName();
    
    gruppen.forEach(gruppe => {
        if (gruppe.schueler && Array.isArray(gruppe.schueler)) {
            gruppe.schueler.forEach(schueler => {
                if (schueler.lehrer === currentUserName) {
                    const fachInfo = schueler.fach ? ` (${window.firebaseFunctions.getFachNameFromGlobal(schueler.fach)})` : '';
                    meineSchueler.push({
                        name: schueler.name,
                        thema: gruppe.thema,
                        gruppenId: gruppe.id,
                        schuelerId: `${gruppe.id}-${schueler.name.replace(/\s/g, '-')}`,
                        fach: schueler.fach,
                        fachInfo: fachInfo
                    });
                }
            });
        }
    });
    
    if (meineSchueler.length === 0) {
        liste.innerHTML = '<div class="card"><p>Keine Schüler zugewiesen.</p></div>';
        return;
    }

    // Bewertungen aus Cache holen
    const bewertungen = window.firebaseFunctions.getBewertungenFromCache();
    
    // Vorlagen-Optionen laden
    const vorlagenOptions = await loadVorlagenOptionsForAllSchueler();
    
    let html = '';
    meineSchueler.forEach(schueler => {
        const bewertung = bewertungen.find(b => b.schuelerId === schueler.schuelerId);
        const status = bewertung ? 'bewertet' : 'nicht-bewertet';
        
        // PDF-Button Status bestimmen
        const pdfVerfuegbar = bewertung && bewertung.endnote && bewertung.staerken && Object.keys(bewertung.staerken).length > 0;
        const pdfButtonClass = pdfVerfuegbar ? 'pdf-btn-enabled' : 'pdf-btn-disabled';
        const pdfButtonDisabled = pdfVerfuegbar ? '' : 'disabled';
        
        // Vorlagen-Select mit korrigierter Auswahl
        const selectedVorlage = bewertung?.vorlage || '';
        const vorlagenSelectOptions = vorlagenOptions.replace(
            `value="${selectedVorlage}"`, 
            `value="${selectedVorlage}" selected`
        );
        
        html += `<div class="bewertung-liste-item" data-status="${status}" data-name="${schueler.name}">
            <div class="bewertung-header">
                <div class="bewertung-info">
                    <strong>${schueler.name}</strong>${schueler.fachInfo}<br>
                    Thema: ${schueler.thema}<br>
                    Status: <span class="status-badge ${status}">${bewertung ? 'Bewertet' : 'Noch nicht bewertet'}</span>
                    ${bewertung ? `<br>Note: ${bewertung.endnote}` : ''}
                    ${bewertung ? `<br><small>Bewertet am: ${bewertung.datum}</small>` : ''}
                </div>
                <div class="bewertung-actions">
                    <select class="vorlage-select" id="vorlage-${schueler.schuelerId}">
                        <option value="">Bewertungsvorlage wählen...</option>
                        ${vorlagenSelectOptions}
                    </select>
                    <button class="btn" onclick="bewertungStarten('${schueler.schuelerId}', '${schueler.name}', '${schueler.thema}')">
                        ${bewertung ? 'Bewertung bearbeiten' : 'Bewerten'}
                    </button>
                    <button class="btn ${pdfButtonClass}" 
                            onclick="window.pdfFunctions.createPDF('${schueler.schuelerId}')" 
                            ${pdfButtonDisabled}>
                        PDF
                    </button>
                </div>
            </div>
        </div>`;
    });
    liste.innerHTML = html;
    
    // Filter anwenden
    filterBewertungen();
    
    console.log('📊 Bewertungen geladen:', meineSchueler.length, 'Schüler');
}

// Vorlagen-Optionen für alle Schüler laden
async function loadVorlagenOptionsForAllSchueler() {
    if (!window.firebaseFunctions.requireAuth()) return '';
    
    try {
        const userEmail = window.authFunctions.getUserEmail();
        const sanitizedEmail = window.firebaseFunctions.sanitizeEmail(userEmail);
        
        const vorlagenRef = window.firebaseFunctions.getDatabaseRef(`vorlagen/${sanitizedEmail}`);
        const snapshot = await window.firebaseDB.get(vorlagenRef);
        
        let options = '';
        if (snapshot.exists()) {
            const vorlagen = snapshot.val();
            Object.values(vorlagen).forEach(vorlage => {
                options += `<option value="${vorlage.name}">${vorlage.name}</option>`;
            });
        }
        
        return options;
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der Vorlagen:', error);
        return '';
    }
}

// Bewertungen filtern
function filterBewertungen() {
    const statusFilter = document.getElementById('bewertungsFilter')?.value || 'alle';
    const namenSort = document.getElementById('namenSortierung')?.value || 'az';
    const items = Array.from(document.querySelectorAll('.bewertung-liste-item'));
    
    // Sortierung anwenden
    items.sort((a, b) => {
        const nameA = a.getAttribute('data-name');
        const nameB = b.getAttribute('data-name');
        
        if (namenSort === 'za') {
            return nameB.localeCompare(nameA);
        } else {
            return nameA.localeCompare(nameB);
        }
    });
    
    // Elemente neu anordnen
    const container = document.getElementById('bewertungsListe');
    if (container) {
        items.forEach(item => {
            container.appendChild(item);
        });
    }
    
    // Filter anwenden
    items.forEach(item => {
        const status = item.getAttribute('data-status');
        if (statusFilter === 'alle' || statusFilter === status) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// Bewertung starten
async function bewertungStarten(schuelerId, schuelerName, thema) {
    console.log('📊 Starte Bewertung für:', schuelerName);
    
    if (!window.firebaseFunctions.requireAuth()) return;
    
    const vorlageSelect = document.getElementById(`vorlage-${schuelerId}`);
    const vorlageName = vorlageSelect?.value;
    
    if (!vorlageName) {
        alert('Bitte wählen Sie eine Bewertungsvorlage aus!');
        return;
    }
    
    try {
        // Vorlage aus Firebase laden
        const userEmail = window.authFunctions.getUserEmail();
        const sanitizedEmail = window.firebaseFunctions.sanitizeEmail(userEmail);
        
        const vorlagenRef = window.firebaseFunctions.getDatabaseRef(`vorlagen/${sanitizedEmail}`);
        const snapshot = await window.firebaseDB.get(vorlagenRef);
        
        if (!snapshot.exists()) {
            alert('Keine Vorlagen gefunden!');
            return;
        }
        
        const vorlagen = snapshot.val();
        const vorlageData = Object.values(vorlagen).find(v => v.name === vorlageName);
        
        if (!vorlageData) {
            alert('Bewertungsvorlage nicht gefunden!');
            return;
        }
        
        aktuelleBewertung = { schuelerId, schuelerName, thema };
        aktuelleVorlage = vorlageData;
        
        await showBewertungsRaster();
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der Vorlage:', error);
        alert('Fehler beim Laden der Vorlage: ' + error.message);
    }
}

// Bewertungsraster anzeigen
async function showBewertungsRaster() {
    document.getElementById('bewertungsListe').classList.add('hidden');
    const raster = document.getElementById('bewertungsRaster');
    raster.classList.remove('hidden');
    
    try {
        // Vorhandene Bewertung aus Firebase laden
        const userEmail = window.authFunctions.getUserEmail();
        const sanitizedEmail = window.firebaseFunctions.sanitizeEmail(userEmail);
        
        const bewertungRef = window.firebaseFunctions.getDatabaseRef(`bewertungen/${sanitizedEmail}/${aktuelleBewertung.schuelerId}`);
        const snapshot = await window.firebaseDB.get(bewertungRef);
        
        let vorhandeneBewertung = null;
        if (snapshot.exists()) {
            vorhandeneBewertung = snapshot.val();
        }
        
        // Bewertungsraster aufbauen
        loadBewertungsTab(vorhandeneBewertung);
        loadStaerkenTab(vorhandeneBewertung);
        
        // Durchschnitt initial berechnen
        if (vorhandeneBewertung) {
            aktuelleBewertung.noten = [...(vorhandeneBewertung.noten || [])];
            aktuelleBewertung.staerken = vorhandeneBewertung.staerken || {};
            aktuelleBewertung.freitext = vorhandeneBewertung.freitext || '';
            berechneDurchschnitt();
        } else {
            aktuelleBewertung.noten = new Array(aktuelleVorlage.kategorien.length);
            aktuelleBewertung.staerken = {};
            aktuelleBewertung.freitext = '';
        }
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der Bewertung:', error);
        alert('Fehler beim Laden der Bewertung: ' + error.message);
    }
}

// Bewertungs-Tab laden
function loadBewertungsTab(vorhandeneBewertung) {
    const container = document.getElementById('bewertungsRasterContent');
    
    let html = `
        <div class="vorlage-titel">Bewertungsvorlage: ${aktuelleVorlage.name}</div>
        <h3>Bewertung: ${aktuelleBewertung.schuelerName}</h3>
        <p>Thema: ${aktuelleBewertung.thema}</p>
        
        <div class="endnote-section">
            <span>Endnote:</span>
            <input type="number" id="endnote" class="endnote-input" min="1" max="6" step="0.1" 
                   value="${vorhandeneBewertung ? vorhandeneBewertung.endnote || '' : ''}"
                   onchange="endnoteGeaendert()">
            <button class="btn" onclick="durchschnittUebernehmen()">Durchschnitt übernehmen</button>
        </div>
    `;
    
    aktuelleVorlage.kategorien.forEach((kategorie, index) => {
        const vorhandeneNote = vorhandeneBewertung?.noten?.[index];
        html += `
            <div class="kategorie">
                <div class="kategorie-titel">${kategorie.name} (${kategorie.gewichtung}%)</div>
                <div class="noten-buttons">
                    ${generateNotenButtons(index, vorhandeneNote)}
                    <button class="nicht-bewertet-btn ${vorhandeneNote === undefined ? 'selected' : ''}" 
                            onclick="noteSetzen(${index}, undefined)">–</button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Stärken-Tab laden
function loadStaerkenTab(vorhandeneBewertung) {
    const container = document.getElementById('staerkenCheckliste');
    
    let html = '<h3>Stärken bewerten</h3>';
    
    // Bewertungs-Checkpoints aus Cache holen
    const bewertungsCheckpoints = window.firebaseFunctions.dataCache.bewertungsCheckpoints;
    
    if (!bewertungsCheckpoints || Object.keys(bewertungsCheckpoints).length === 0) {
        html += '<p style="color: #e74c3c;">Bewertungskriterien werden geladen...</p>';
        container.innerHTML = html;
        return;
    }
    
    Object.keys(bewertungsCheckpoints).forEach(kategorie => {
        const aktivierte = vorhandeneBewertung?.staerken?.[kategorie] || [];
        
        html += `
            <div class="staerken-kategorie">
                <div class="staerken-kategorie-titel">
                    ${getKategorieIcon(kategorie)} ${kategorie}
                </div>
                <div class="staerken-liste">
        `;
        
        bewertungsCheckpoints[kategorie].forEach((text, index) => {
            const checked = aktivierte.includes(index) ? 'checked' : '';
            const itemClass = aktivierte.includes(index) ? 'checked' : '';
            
            html += `
                <div class="staerken-item ${itemClass}">
                    <input type="checkbox" class="staerken-checkbox" 
                           ${checked}
                           onchange="staerkeToggle('${kategorie}', ${index}, this)">
                    <span class="staerken-text" onclick="toggleCheckbox('${kategorie}', ${index})">${text}</span>
                </div>
            `;
        });
        
        html += '</div></div>';
    });
    
    html += `
        <div class="freitext-bereich">
            <label><strong>📝 Weitere Beobachtungen oder individuelle Stärken:</strong></label>
            <textarea class="freitext-textarea" 
                      placeholder="Hier können Sie weitere Beobachtungen eintragen..."
                      onchange="freitextChanged(this)">${vorhandeneBewertung?.freitext || ''}</textarea>
        </div>
    `;
    
    container.innerHTML = html;
}

// Kategorie-Icons
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

// Stärke togglen
function staerkeToggle(kategorie, index, checkbox) {
    if (!aktuelleBewertung.staerken[kategorie]) {
        aktuelleBewertung.staerken[kategorie] = [];
    }
    
    if (checkbox.checked) {
        if (!aktuelleBewertung.staerken[kategorie].includes(index)) {
            aktuelleBewertung.staerken[kategorie].push(index);
        }
        checkbox.parentElement.classList.add('checked');
    } else {
        aktuelleBewertung.staerken[kategorie] = aktuelleBewertung.staerken[kategorie].filter(i => i !== index);
        checkbox.parentElement.classList.remove('checked');
    }
    
    // Automatisch speichern
    autosaveStaerken();
}

// Checkbox per Click auf Text togglen
function toggleCheckbox(kategorie, index) {
    const checkbox = document.querySelector(`.staerken-item input[onchange*="${kategorie}"][onchange*="${index}"]`);
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        staerkeToggle(kategorie, index, checkbox);
    }
}

// Freitext geändert
function freitextChanged(textarea) {
    aktuelleBewertung.freitext = textarea.value;
    autosaveStaerken();
}

// Stärken automatisch speichern
async function autosaveStaerken() {
    if (!window.firebaseFunctions.requireAuth()) return;
    
    try {
        const userEmail = window.authFunctions.getUserEmail();
        const sanitizedEmail = window.firebaseFunctions.sanitizeEmail(userEmail);
        
        const bewertungRef = window.firebaseFunctions.getDatabaseRef(`bewertungen/${sanitizedEmail}/${aktuelleBewertung.schuelerId}`);
        
        // Nur Stärken und Freitext aktualisieren
        const updates = {
            staerken: aktuelleBewertung.staerken,
            freitext: aktuelleBewertung.freitext,
            lastUpdate: window.firebaseFunctions.getTimestamp()
        };
        
        // Prüfen ob Bewertung schon existiert
        const snapshot = await window.firebaseDB.get(bewertungRef);
        if (snapshot.exists()) {
            // Update nur die geänderten Felder
            const updateRef = window.firebaseFunctions.getDatabaseRef(`bewertungen/${sanitizedEmail}/${aktuelleBewertung.schuelerId}`);
            await window.firebaseDB.set(updateRef, { ...snapshot.val(), ...updates });
        }
        
        console.log('💾 Stärken automatisch gespeichert');
        
    } catch (error) {
        console.error('❌ Fehler beim Autosave der Stärken:', error);
    }
}

// Noten-Buttons generieren
function generateNotenButtons(kategorieIndex, vorhandeneNote) {
    const noten = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0];
    let html = '';
    
    noten.forEach(note => {
        const noteStr = note.toString().replace('.', '-');
        const isSelected = vorhandeneNote === note ? 'selected' : '';
        html += `<button class="note-btn note-${noteStr} ${isSelected}" 
                       onclick="noteSetzen(${kategorieIndex}, ${note})">${note}</button>`;
    });
    
    return html;
}

// Note setzen
function noteSetzen(kategorieIndex, note) {
    // Alle Buttons der Kategorie zurücksetzen
    const kategorie = document.querySelectorAll('.kategorie')[kategorieIndex];
    kategorie.querySelectorAll('.note-btn, .nicht-bewertet-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Neuen Button markieren
    if (note === undefined) {
        kategorie.querySelector('.nicht-bewertet-btn').classList.add('selected');
    } else {
        const noteStr = note.toString().replace('.', '-');
        kategorie.querySelector(`.note-${noteStr}`).classList.add('selected');
    }
    
    // Note speichern und Durchschnitt berechnen
    aktuelleBewertung.noten[kategorieIndex] = note;
    berechneDurchschnitt();
}

// Durchschnitt berechnen
function berechneDurchschnitt() {
    const noten = aktuelleBewertung.noten.filter(n => n !== undefined);
    const durchschnittElement = document.getElementById('durchschnittAnzeige');
    
    if (!durchschnittElement) return;
    
    if (noten.length === 0) {
        durchschnittElement.textContent = '-';
        return;
    }
    
    // Gewichteter Durchschnitt
    let summe = 0;
    let gewichtungSumme = 0;
    
    aktuelleBewertung.noten.forEach((note, index) => {
        if (note !== undefined) {
            const gewichtung = aktuelleVorlage.kategorien[index].gewichtung;
            summe += note * gewichtung;
            gewichtungSumme += gewichtung;
        }
    });
    
    const durchschnitt = gewichtungSumme > 0 ? summe / gewichtungSumme : 0;
    durchschnittElement.textContent = durchschnitt.toFixed(1);
    
    // Endnote automatisch setzen wenn leer
    const endnoteInput = document.getElementById('endnote');
    if (endnoteInput && !endnoteInput.value) {
        endnoteInput.value = durchschnitt.toFixed(1);
    }
}

// Durchschnitt übernehmen
function durchschnittUebernehmen() {
    const durchschnitt = document.getElementById('durchschnittAnzeige')?.textContent;
    const endnoteInput = document.getElementById('endnote');
    
    if (durchschnitt && durchschnitt !== '-' && endnoteInput) {
        endnoteInput.value = durchschnitt;
    }
}

// Endnote geändert
function endnoteGeaendert() {
    // Validation könnte hier hinzugefügt werden
    const endnoteInput = document.getElementById('endnote');
    const value = parseFloat(endnoteInput.value);
    
    if (value && (value < 1 || value > 6)) {
        endnoteInput.style.borderColor = '#e74c3c';
    } else {
        endnoteInput.style.borderColor = '#e1e8ed';
    }
}

// Bewertung speichern
async function bewertungSpeichern() {
    console.log('💾 Speichere Bewertung...');
    
    if (!window.firebaseFunctions.requireAuth()) return;
    
    const endnoteInput = document.getElementById('endnote');
    const endnote = parseFloat(endnoteInput.value);
    
    if (!endnote || endnote < 1 || endnote > 6) {
        alert('Bitte geben Sie eine gültige Endnote (1.0-6.0) ein!');
        endnoteInput.focus();
        return;
    }
    
    try {
        const userEmail = window.authFunctions.getUserEmail();
        const sanitizedEmail = window.firebaseFunctions.sanitizeEmail(userEmail);
        
        const bewertungData = {
            schuelerId: aktuelleBewertung.schuelerId,
            schuelerName: aktuelleBewertung.schuelerName,
            thema: aktuelleBewertung.thema,
            lehrer: window.firebaseFunctions.getCurrentUserName(),
            vorlage: aktuelleVorlage.name,
            noten: [...aktuelleBewertung.noten],
            endnote: endnote,
            datum: window.firebaseFunctions.formatGermanDate(),
            timestamp: window.firebaseFunctions.getTimestamp(),
            staerken: { ...aktuelleBewertung.staerken },
            freitext: aktuelleBewertung.freitext
        };
        
        const bewertungRef = window.firebaseFunctions.getDatabaseRef(`bewertungen/${sanitizedEmail}/${aktuelleBewertung.schuelerId}`);
        await window.firebaseDB.set(bewertungRef, bewertungData);
        
        // News erstellen
        if (window.newsFunctions) {
            await window.newsFunctions.createNewsForAction(
                'Bewertung gespeichert', 
                `${aktuelleBewertung.schuelerName} wurde mit ${endnote} bewertet.`
            );
        }
        
        console.log('✅ Bewertung gespeichert:', aktuelleBewertung.schuelerName, 'Note:', endnote);
        
        alert(`Bewertung für ${aktuelleBewertung.schuelerName} erfolgreich gespeichert!`);
        bewertungAbbrechen();
        
    } catch (error) {
        console.error('❌ Fehler beim Speichern der Bewertung:', error);
        alert('Fehler beim Speichern der Bewertung: ' + error.message);
    }
}

// Bewertung abbrechen
function bewertungAbbrechen() {
    document.getElementById('bewertungsRaster').classList.add('hidden');
    document.getElementById('bewertungsListe').classList.remove('hidden');
    
    aktuelleBewertung = null;
    aktuelleVorlage = null;
    
    // Bewertungsliste neu laden
    loadBewertungen();
}

// Vorlagen System (Platzhalter)
function loadVorlagen() {
    console.log('📋 Lade Vorlagen...');
    // Wird später implementiert...
}

// Export für andere Module
window.bewertungsFunctions = {
    loadBewertungen,
    filterBewertungen
};

console.log('✅ Firebase Bewertungs-System bereit');
