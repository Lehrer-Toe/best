// Bewertungs-System - NUR JSON-basiert, KEIN Firebase
console.log('📊 Bewertungs-System geladen - JSON-basiert');

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

function loadBewertungen() {
    console.log('📊 Lade Bewertungen...');
    
    const liste = document.getElementById('bewertungsListe');
    if (!liste) return;
    
    // Sammle alle Schüler des aktuellen Lehrers
    const meineSchueler = [];
    gruppen.forEach(gruppe => {
        gruppe.schueler.forEach(schueler => {
            if (schueler.lehrer === currentUser.name) {
                const fachInfo = schueler.fach ? ` (${getFachNameFromGlobal(schueler.fach)})` : '';
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
    });
    
    if (meineSchueler.length === 0) {
        liste.innerHTML = '<div class="card"><p>Keine Schüler zugewiesen.</p></div>';
        return;
    }

    let html = '';
    meineSchueler.forEach(schueler => {
        const bewertung = bewertungen.find(b => b.schuelerId === schueler.schuelerId);
        const status = bewertung ? 'bewertet' : 'nicht-bewertet';
        
        // PDF-Button Status bestimmen
        const pdfVerfuegbar = bewertung && bewertung.endnote && bewertung.staerken && Object.keys(bewertung.staerken).length > 0;
        const pdfButtonClass = pdfVerfuegbar ? 'pdf-btn-enabled' : 'pdf-btn-disabled';
        const pdfButtonDisabled = pdfVerfuegbar ? '' : 'disabled';
        
        html += `<div class="bewertung-liste-item" data-status="${status}" data-name="${schueler.name}">
            <div class="bewertung-header">
                <div class="bewertung-info">
                    <strong>${schueler.name}</strong>${schueler.fachInfo}<br>
                    Thema: ${schueler.thema}<br>
                    Status: <span class="status-badge ${status}">${bewertung ? 'Bewertet' : 'Noch nicht bewertet'}</span>
                    ${bewertung ? `<br>Note: ${bewertung.endnote}` : ''}
                </div>
                <div class="bewertung-actions">
                    <select class="vorlage-select" id="vorlage-${schueler.schuelerId}">
                        <option value="">Bewertungsvorlage wählen...</option>
                        ${loadVorlagenOptionsForSchueler(bewertung?.vorlage)}
                    </select>
                    <button class="btn" onclick="bewertungStarten('${schueler.schuelerId}', '${schueler.name}', '${schueler.thema}')">
                        ${bewertung ? 'Bewertung bearbeiten' : 'Bewerten'}
                    </button>
                    <button class="btn ${pdfButtonClass}" 
                            onclick="generatePDF('${schueler.schuelerId}')" 
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

function loadVorlagenOptionsForSchueler(selectedVorlage) {
    let options = '';
    if (vorlagen[currentUser.email]) {
        vorlagen[currentUser.email].forEach(vorlage => {
            const selected = vorlage.name === selectedVorlage ? 'selected' : '';
            options += `<option value="${vorlage.name}" ${selected}>${vorlage.name}</option>`;
        });
    }
    return options;
}

function filterBewertungen() {
    const statusFilter = document.getElementById('bewertungsFilter').value;
    const namenSort = document.getElementById('namenSortierung').value;
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
    items.forEach(item => {
        container.appendChild(item);
    });
    
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

function bewertungStarten(schuelerId, schuelerName, thema) {
    console.log('📊 Starte Bewertung für:', schuelerName);
    
    const vorlageSelect = document.getElementById(`vorlage-${schuelerId}`);
    const vorlage = vorlageSelect.value;
    
    if (!vorlage) {
        alert('Bitte wählen Sie eine Bewertungsvorlage aus!');
        return;
    }
    
    const vorlageData = vorlagen[currentUser.email]?.find(v => v.name === vorlage);
    if (!vorlageData) {
        alert('Bewertungsvorlage nicht gefunden!');
        return;
    }
    
    aktuelleBewertung = { schuelerId, schuelerName, thema };
    aktuelleVorlage = vorlageData;
    showBewertungsRaster();
}

function showBewertungsRaster() {
    document.getElementById('bewertungsListe').classList.add('hidden');
    const raster = document.getElementById('bewertungsRaster');
    raster.classList.remove('hidden');
    
    // Vorhandene Bewertung laden
    const vorhandeneBewertung = bewertungen.find(b => b.schuelerId === aktuelleBewertung.schuelerId);
    
    // Bewertungsraster aufbauen
    loadBewertungsTab(vorhandeneBewertung);
    loadStaerkenTab(vorhandeneBewertung);
    
    // Durchschnitt initial berechnen
    if (vorhandeneBewertung) {
        aktuelleBewertung.noten = [...vorhandeneBewertung.noten];
        aktuelleBewertung.staerken = vorhandeneBewertung.staerken || {};
        aktuelleBewertung.freitext = vorhandeneBewertung.freitext || '';
        berechneDurchschnitt();
    } else {
        aktuelleBewertung.noten = new Array(aktuelleVorlage.kategorien.length);
        aktuelleBewertung.staerken = {};
        aktuelleBewertung.freitext = '';
    }
}

function loadBewertungsTab(vorhandeneBewertung) {
    const container = document.getElementById('bewertungsRasterContent');
    
    let html = `
        <div class="vorlage-titel">Bewertungsvorlage: ${aktuelleVorlage.name}</div>
        <h3>Bewertung: ${aktuelleBewertung.schuelerName}</h3>
        <p>Thema: ${aktuelleBewertung.thema}</p>
        
        <div class="endnote-section">
            <span>Endnote:</span>
            <input type="number" id="endnote" class="endnote-input" min="1" max="6" step="0.1" 
                   value="${vorhandeneBewertung ? vorhandeneBewertung.endnote : ''}"
                   onchange="endnoteGeaendert()">
            <button class="btn" onclick="durchschnittUebernehmen()">Durchschnitt übernehmen</button>
        </div>
    `;
    
    aktuelleVorlage.kategorien.forEach((kategorie, index) => {
        const vorhandeneNote = vorhandeneBewertung?.noten[index];
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

function loadStaerkenTab(vorhandeneBewertung) {
    const container = document.getElementById('staerkenCheckliste');
    
    let html = '<h3>Stärken bewerten</h3>';
    
    // Prüfe ob bewertungsCheckpoints geladen sind
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

function toggleCheckbox(kategorie, index) {
    const checkbox = document.querySelector(`.staerken-item input[onchange*="${kategorie}"][onchange*="${index}"]`);
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        staerkeToggle(kategorie, index, checkbox);
    }
}

function freitextChanged(textarea) {
    aktuelleBewertung.freitext = textarea.value;
    autosaveStaerken();
}

function autosaveStaerken() {
    // Stärken automatisch speichern
    const existingIndex = bewertungen.findIndex(b => b.schuelerId === aktuelleBewertung.schuelerId);
    
    if (existingIndex >= 0) {
        bewertungen[existingIndex].staerken = { ...aktuelleBewertung.staerken };
        bewertungen[existingIndex].freitext = aktuelleBewertung.freitext;
    }
}

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

function berechneDurchschnitt() {
    const noten = aktuelleBewertung.noten.filter(n => n !== undefined);
    if (noten.length === 0) {
        document.getElementById('durchschnittAnzeige').textContent = '-';
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
    document.getElementById('durchschnittAnzeige').textContent = durchschnitt.toFixed(1);
    
    // Endnote automatisch setzen wenn leer
    const endnoteInput = document.getElementById('endnote');
    if (!endnoteInput.value) {
        endnoteInput.value = durchschnitt.toFixed(1);
    }
}

function durchschnittUebernehmen() {
    const durchschnitt = document.getElementById('durchschnittAnzeige').textContent;
    if (durchschnitt !== '-') {
        document.getElementById('endnote').value = durchschnitt;
    }
}

function endnoteGeaendert() {
    // Validation könnte hier hinzugefügt werden
}

function bewertungSpeichern() {
    console.log('💾 Speichere Bewertung...');
    
    const endnote = parseFloat(document.getElementById('endnote').value);
    if (!endnote || endnote < 1 || endnote > 6) {
        alert('Bitte geben Sie eine gültige Endnote (1.0-6.0) ein!');
        return;
    }
    
    // Vorhandene Bewertung aktualisieren oder neue erstellen
    const existingIndex = bewertungen.findIndex(b => b.schuelerId === aktuelleBewertung.schuelerId);
    const bewertungData = {
        schuelerId: aktuelleBewertung.schuelerId,
        schuelerName: aktuelleBewertung.schuelerName,
        thema: aktuelleBewertung.thema,
        lehrer: currentUser.name,
        vorlage: aktuelleVorlage.name,
        noten: [...aktuelleBewertung.noten],
        endnote: endnote,
        datum: new Date().toLocaleDateString('de-DE'),
        staerken: { ...aktuelleBewertung.staerken },
        freitext: aktuelleBewertung.freitext
    };
    
    if (existingIndex >= 0) {
        bewertungen[existingIndex] = bewertungData;
    } else {
        bewertungen.push(bewertungData);
    }
    
    addNews('Bewertung gespeichert', `${aktuelleBewertung.schuelerName} wurde mit ${endnote} bewertet.`);
    
    console.log('✅ Bewertung gespeichert:', aktuelleBewertung.schuelerName, 'Note:', endnote);
    bewertungAbbrechen();
}

function bewertungAbbrechen() {
    document.getElementById('bewertungsRaster').classList.add('hidden');
    document.getElementById('bewertungsListe').classList.remove('hidden');
    aktuelleBewertung = null;
    aktuelleVorlage = null;
    loadBewertungen(); // Neu laden um PDF-Button Status zu aktualisieren
}

// Vorlagen-System
function loadVorlagen() {
    console.log('📋 Lade Vorlagen...');
    // Wird implementiert...
}

// generatePDF Funktion für Bewertung
function generatePDF(schuelerId) {
    if (typeof createPDF === 'function') {
        createPDF(schuelerId);
    } else {
        alert('PDF-System wird geladen...');
    }
}