// Firebase Admin-System - Realtime Database mit Klassen-Verwaltung
console.log('⚙️ Firebase Admin-System geladen');

// Admin-Vorlagen Tab laden
function loadAdminVorlagen() {
    console.log('⚙️ Lade Admin-Vorlagen...');
    
    if (!window.firebaseFunctions.requireAdmin()) return;
    
    // Alle Admin-Bereiche laden
    loadKlassenVerwaltung();
    loadFaecherVerwaltung();
    loadCheckpointsVerwaltung();
    loadBriefvorlage();
}

// === KLASSEN-VERWALTUNG (NEU) ===

async function loadKlassenVerwaltung() {
    console.log('🏫 Lade Klassen-Verwaltung...');
    
    const container = document.getElementById('klassenVerwaltung');
    if (!container) return;
    
    try {
        // Klassen aus Cache holen
        const klassen = window.firebaseFunctions.getKlassenFromCache();
        
        let html = `
            <h3>🏫 Klassen verwalten</h3>
            <p>Hier können Sie Klassen mit Schülern verwalten. Verwenden Sie CSV-Import oder manuelle Eingabe.</p>
            
            <!-- CSV Import -->
            <div class="csv-import-bereich">
                <h4>📋 CSV-Import</h4>
                <p><strong>CSV-Format:</strong> Klasse, Schülername, Klassenlehrer (Optional)</p>
                <p><em>Beispiel: 8a, Müller Max, Herr Schmidt</em></p>
                <div class="input-group">
                    <input type="file" id="csvFileInput" accept=".csv" onchange="csvDateiAusgewaehlt()">
                    <button class="btn btn-success" onclick="csvImportieren()">CSV importieren</button>
                </div>
                <div id="csvPreview" class="csv-preview hidden"></div>
            </div>
            
            <!-- Manuelle Klassen-Verwaltung -->
            <div class="manuelle-klassen">
                <h4>➕ Neue Klasse manuell erstellen</h4>
                <div class="input-group">
                    <input type="text" id="neueKlasseName" placeholder="Klassenname (z.B. 8a)" maxlength="10">
                    <input type="text" id="neuerKlassenlehrer" placeholder="Klassenlehrer (Optional)">
                    <button class="btn btn-success" onclick="neueKlasseErstellen()">Klasse erstellen</button>
                </div>
            </div>
            
            <!-- Bestehende Klassen -->
            <div id="klassenListe" class="klassen-liste">
        `;
        
        Object.entries(klassen).forEach(([klassenName, klassenDaten]) => {
            const schuelerAnzahl = klassenDaten.schueler ? klassenDaten.schueler.length : 0;
            const klassenlehrer = klassenDaten.klassenlehrer || 'Nicht zugewiesen';
            
            html += `
                <div class="klassen-item">
                    <div class="klassen-header">
                        <h5>🏫 ${klassenName}</h5>
                        <div class="klassen-info">
                            <span class="schueler-anzahl">👥 ${schuelerAnzahl} Schüler</span>
                            <span class="klassenlehrer-info">👨‍🏫 ${klassenlehrer}</span>
                        </div>
                    </div>
                    <div class="klassen-actions">
                        <button class="btn" onclick="klasseBearbeiten('${klassenName}')">Bearbeiten</button>
                        <button class="btn btn-danger" onclick="klasseLoeschen('${klassenName}')">Löschen</button>
                    </div>
                    <div class="schueler-vorschau">
                        ${klassenDaten.schueler ? 
                            klassenDaten.schueler.slice(0, 5).map(s => `<span class="schueler-name-tag">${s.name}</span>`).join('') +
                            (schuelerAnzahl > 5 ? `<span class="weitere-schueler">... und ${schuelerAnzahl - 5} weitere</span>` : '')
                            : '<em>Keine Schüler</em>'
                        }
                    </div>
                </div>
            `;
        });
        
        html += `
            </div>
            <div class="klassen-statistik">
                <strong>📊 Statistik:</strong> 
                ${Object.keys(klassen).length} Klassen mit insgesamt 
                ${Object.values(klassen).reduce((sum, k) => sum + (k.schueler ? k.schueler.length : 0), 0)} Schülern
            </div>
        `;
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der Klassen-Verwaltung:', error);
        container.innerHTML = '<p style="color: #e74c3c;">Fehler beim Laden der Klassen-Verwaltung!</p>';
    }
}

// CSV-Datei ausgewählt
function csvDateiAusgewaehlt() {
    const fileInput = document.getElementById('csvFileInput');
    const file = fileInput?.files[0];
    
    if (!file) return;
    
    console.log('📄 CSV-Datei ausgewählt:', file.name);
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const csvContent = e.target.result;
        showCSVPreview(csvContent);
    };
    reader.readAsText(file);
}

// CSV-Vorschau anzeigen
function showCSVPreview(csvContent) {
    const previewContainer = document.getElementById('csvPreview');
    if (!previewContainer) return;
    
    const lines = csvContent.split('\n').filter(line => line.trim());
    const parsedData = [];
    
    lines.forEach((line, index) => {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 2) {
            parsedData.push({
                klasse: parts[0],
                name: parts[1],
                klassenlehrer: parts[2] || ''
            });
        }
    });
    
    if (parsedData.length === 0) {
        previewContainer.innerHTML = '<p style="color: #e74c3c;">Keine gültigen Daten in der CSV-Datei gefunden.</p>';
        previewContainer.classList.remove('hidden');
        return;
    }
    
    // Klassen gruppieren
    const klassenGruppen = {};
    parsedData.forEach(item => {
        if (!klassenGruppen[item.klasse]) {
            klassenGruppen[item.klasse] = {
                schueler: [],
                klassenlehrer: item.klassenlehrer
            };
        }
        klassenGruppen[item.klasse].schueler.push({
            name: item.name
        });
    });
    
    let html = `
        <h4>📋 CSV-Vorschau</h4>
        <p><strong>${parsedData.length}</strong> Schüler in <strong>${Object.keys(klassenGruppen).length}</strong> Klassen gefunden:</p>
        <div class="csv-vorschau-liste">
    `;
    
    Object.entries(klassenGruppen).forEach(([klassenName, klassenDaten]) => {
        html += `
            <div class="csv-klasse-vorschau">
                <strong>🏫 ${klassenName}</strong>
                ${klassenDaten.klassenlehrer ? `<span class="klassenlehrer">(${klassenDaten.klassenlehrer})</span>` : ''}
                <div class="csv-schueler-liste">
                    ${klassenDaten.schueler.map(s => `<span class="csv-schueler-tag">${s.name}</span>`).join('')}
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    
    previewContainer.innerHTML = html;
    previewContainer.classList.remove('hidden');
    
    // Daten für Import zwischenspeichern
    window.csvImportData = klassenGruppen;
}

// CSV importieren
async function csvImportieren() {
    if (!window.csvImportData) {
        alert('Keine CSV-Daten zum Importieren vorhanden!');
        return;
    }
    
    if (!window.firebaseFunctions.requireAdmin()) return;
    
    const klassenAnzahl = Object.keys(window.csvImportData).length;
    const schuelerAnzahl = Object.values(window.csvImportData).reduce((sum, k) => sum + k.schueler.length, 0);
    
    if (!confirm(`${klassenAnzahl} Klassen mit ${schuelerAnzahl} Schülern importieren?\n\nBestehende Klassen werden überschrieben!`)) {
        return;
    }
    
    try {
        // Bestehende Klassen laden
        const klasssenRef = window.firebaseFunctions.getDatabaseRef('system/klassen');
        const snapshot = await window.firebaseDB.get(klasssenRef);
        
        let existingKlassen = {};
        if (snapshot.exists()) {
            existingKlassen = snapshot.val();
        }
        
        // Neue Klassen hinzufügen/überschreiben
        const updatedKlassen = { ...existingKlassen, ...window.csvImportData };
        
        // In Firebase speichern
        await window.firebaseDB.set(klasssenRef, updatedKlassen);
        
        // Cache aktualisieren
        window.firebaseFunctions.dataCache.klassen = updatedKlassen;
        
        // UI zurücksetzen
        document.getElementById('csvFileInput').value = '';
        document.getElementById('csvPreview').classList.add('hidden');
        window.csvImportData = null;
        
        // News erstellen
        if (window.newsFunctions) {
            await window.newsFunctions.createNewsForAction(
                'Klassen importiert', 
                `${klassenAnzahl} Klassen mit ${schuelerAnzahl} Schülern wurden importiert.`
            );
        }
        
        console.log('✅ CSV-Import erfolgreich');
        alert(`${klassenAnzahl} Klassen mit ${schuelerAnzahl} Schülern wurden erfolgreich importiert!`);
        
        // Klassen-Verwaltung neu laden
        loadKlassenVerwaltung();
        
    } catch (error) {
        console.error('❌ Fehler beim CSV-Import:', error);
        alert('Fehler beim CSV-Import: ' + error.message);
    }
}

// Neue Klasse manuell erstellen
async function neueKlasseErstellen() {
    const nameInput = document.getElementById('neueKlasseName');
    const lehrerInput = document.getElementById('neuerKlassenlehrer');
    
    const name = nameInput?.value.trim();
    const klassenlehrer = lehrerInput?.value.trim();
    
    if (!name) {
        alert('Bitte geben Sie einen Klassennamen ein!');
        return;
    }
    
    if (!window.firebaseFunctions.requireAdmin()) return;
    
    try {
        // Bestehende Klassen prüfen
        const klassen = window.firebaseFunctions.getKlassenFromCache();
        
        if (klassen[name]) {
            if (!confirm(`Klasse "${name}" existiert bereits. Überschreiben?`)) {
                return;
            }
        }
        
        // Neue Klasse erstellen
        const neueKlasse = {
            klassenlehrer: klassenlehrer || null,
            schueler: [],
            erstellt: window.firebaseFunctions.formatGermanDate(),
            timestamp: window.firebaseFunctions.getTimestamp()
        };
        
        // In Firebase speichern
        const klasseRef = window.firebaseFunctions.getDatabaseRef(`system/klassen/${name}`);
        await window.firebaseDB.set(klasseRef, neueKlasse);
        
        // Cache aktualisieren
        window.firebaseFunctions.dataCache.klassen[name] = neueKlasse;
        
        // Eingabefelder leeren
        nameInput.value = '';
        lehrerInput.value = '';
        
        console.log('✅ Neue Klasse erstellt:', name);
        alert(`Klasse "${name}" wurde erfolgreich erstellt!`);
        
        // Klassen-Verwaltung neu laden
        loadKlassenVerwaltung();
        
    } catch (error) {
        console.error('❌ Fehler beim Erstellen der Klasse:', error);
        alert('Fehler beim Erstellen der Klasse: ' + error.message);
    }
}

// Klasse bearbeiten
function klasseBearbeiten(klassenName) {
    const klassen = window.firebaseFunctions.getKlassenFromCache();
    const klassenDaten = klassen[klassenName];
    
    if (!klassenDaten) {
        alert('Klasse nicht gefunden!');
        return;
    }
    
    // Modal für Klassen-Bearbeitung anzeigen
    showKlassenEditModal(klassenName, klassenDaten);
}

// Klassen-Edit Modal anzeigen
function showKlassenEditModal(klassenName, klassenDaten) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'klassenEditModal';
    
    const schuelerListe = klassenDaten.schueler || [];
    
    modal.innerHTML = `
        <div class="modal-content">
            <h3>✏️ Klasse "${klassenName}" bearbeiten</h3>
            
            <div class="input-group">
                <label>Klassenlehrer:</label>
                <input type="text" id="editKlassenlehrer" value="${klassenDaten.klassenlehrer || ''}" placeholder="Klassenlehrer (Optional)">
            </div>
            
            <h4>👥 Schüler (${schuelerListe.length})</h4>
            <div class="input-group">
                <input type="text" id="neuerSchuelerName" placeholder="Neuer Schüler">
                <button class="btn btn-success" onclick="schuelerZurKlasseHinzufuegen()">Hinzufügen</button>
            </div>
            
            <div id="klassenSchuelerListe" class="klassen-schueler-liste">
                ${schuelerListe.map((schueler, index) => `
                    <div class="schueler-edit-item">
                        <span class="schueler-name">${schueler.name}</span>
                        <button class="btn btn-danger btn-sm" onclick="schuelerAusKlasseEntfernen(${index})">Entfernen</button>
                    </div>
                `).join('')}
            </div>
            
            <div class="modal-buttons">
                <button class="btn btn-success" onclick="klasseEditSpeichern('${klassenName}')">Speichern</button>
                <button class="btn btn-danger" onclick="klasseEditAbbrechen()">Abbrechen</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Aktuelle Klassen-Daten für Bearbeitung speichern
    window.currentEditKlasse = {
        name: klassenName,
        data: { ...klassenDaten }
    };
}

// Schüler zur Klasse hinzufügen
function schuelerZurKlasseHinzufuegen() {
    const nameInput = document.getElementById('neuerSchuelerName');
    const name = nameInput?.value.trim();
    
    if (!name) {
        alert('Bitte geben Sie einen Schülernamen ein!');
        return;
    }
    
    if (!window.currentEditKlasse) return;
    
    // Prüfen ob Schüler bereits existiert
    const existiert = window.currentEditKlasse.data.schueler.some(s => s.name === name);
    if (existiert) {
        alert('Dieser Schüler ist bereits in der Klasse!');
        return;
    }
    
    // Schüler hinzufügen
    window.currentEditKlasse.data.schueler.push({ name });
    
    // Liste aktualisieren
    updateKlassenSchuelerListe();
    
    // Eingabefeld leeren
    nameInput.value = '';
    
    console.log('➕ Schüler hinzugefügt:', name);
}

// Schüler aus Klasse entfernen
function schuelerAusKlasseEntfernen(index) {
    if (!window.currentEditKlasse) return;
    
    const schueler = window.currentEditKlasse.data.schueler[index];
    if (confirm(`Schüler "${schueler.name}" aus der Klasse entfernen?`)) {
        window.currentEditKlasse.data.schueler.splice(index, 1);
        updateKlassenSchuelerListe();
        console.log('➖ Schüler entfernt:', schueler.name);
    }
}

// Klassen-Schüler-Liste aktualisieren
function updateKlassenSchuelerListe() {
    const container = document.getElementById('klassenSchuelerListe');
    if (!container || !window.currentEditKlasse) return;
    
    const schuelerListe = window.currentEditKlasse.data.schueler;
    
    container.innerHTML = schuelerListe.map((schueler, index) => `
        <div class="schueler-edit-item">
            <span class="schueler-name">${schueler.name}</span>
            <button class="btn btn-danger btn-sm" onclick="schuelerAusKlasseEntfernen(${index})">Entfernen</button>
        </div>
    `).join('');
    
    // Schüler-Anzahl im Titel aktualisieren
    const titleElement = container.previousElementSibling;
    if (titleElement && titleElement.tagName === 'H4') {
        titleElement.textContent = `👥 Schüler (${schuelerListe.length})`;
    }
}

// Klasse-Edit speichern
async function klasseEditSpeichern(klassenName) {
    if (!window.currentEditKlasse) return;
    
    const lehrerInput = document.getElementById('editKlassenlehrer');
    const klassenlehrer = lehrerInput?.value.trim();
    
    try {
        // Aktualisierte Klassen-Daten
        const updatedKlassenData = {
            ...window.currentEditKlasse.data,
            klassenlehrer: klassenlehrer || null,
            lastUpdate: window.firebaseFunctions.getTimestamp()
        };
        
        // In Firebase speichern
        const klasseRef = window.firebaseFunctions.getDatabaseRef(`system/klassen/${klassenName}`);
        await window.firebaseDB.set(klasseRef, updatedKlassenData);
        
        // Cache aktualisieren
        window.firebaseFunctions.dataCache.klassen[klassenName] = updatedKlassenData;
        
        console.log('✅ Klasse aktualisiert:', klassenName);
        alert(`Klasse "${klassenName}" wurde erfolgreich aktualisiert!`);
        
        klasseEditAbbrechen();
        loadKlassenVerwaltung();
        
    } catch (error) {
        console.error('❌ Fehler beim Speichern der Klasse:', error);
        alert('Fehler beim Speichern der Klasse: ' + error.message);
    }
}

// Klasse-Edit abbrechen
function klasseEditAbbrechen() {
    const modal = document.getElementById('klassenEditModal');
    if (modal) {
        modal.remove();
    }
    window.currentEditKlasse = null;
}

// Klasse löschen
async function klasseLoeschen(klassenName) {
    if (!window.firebaseFunctions.requireAdmin()) return;
    
    const klassen = window.firebaseFunctions.getKlassenFromCache();
    const klassenDaten = klassen[klassenName];
    
    if (!klassenDaten) {
        alert('Klasse nicht gefunden!');
        return;
    }
    
    const schuelerAnzahl = klassenDaten.schueler ? klassenDaten.schueler.length : 0;
    
    if (!confirm(`Klasse "${klassenName}" mit ${schuelerAnzahl} Schülern wirklich löschen?\n\nDies kann bestehende Gruppenzuordnungen beeinträchtigen!`)) {
        return;
    }
    
    try {
        // Klasse aus Firebase löschen
        const klasseRef = window.firebaseFunctions.getDatabaseRef(`system/klassen/${klassenName}`);
        await window.firebaseDB.remove(klasseRef);
        
        // Cache aktualisieren
        delete window.firebaseFunctions.dataCache.klassen[klassenName];
        
        // News erstellen
        if (window.newsFunctions) {
            await window.newsFunctions.createNewsForAction(
                'Klasse gelöscht', 
                `Die Klasse "${klassenName}" wurde gelöscht.`
            );
        }
        
        console.log('🗑️ Klasse gelöscht:', klassenName);
        alert(`Klasse "${klassenName}" wurde gelöscht.`);
        
        // Klassen-Verwaltung neu laden
        loadKlassenVerwaltung();
        
    } catch (error) {
        console.error('❌ Fehler beim Löschen der Klasse:', error);
        alert('Fehler beim Löschen der Klasse: ' + error.message);
    }
}

// === FÄCHER-VERWALTUNG (bleibt wie vorher) ===

async function loadFaecherVerwaltung() {
    console.log('📚 Lade Fächer-Verwaltung...');
    
    const container = document.getElementById('faecherVerwaltung');
    if (!container) return;
    
    try {
        // Fächer aus Cache holen
        const faecher = window.firebaseFunctions.getAllFaecher();
        
        let html = `
            <h3>Fächer verwalten</h3>
            <p>Hier können Sie die verfügbaren Fächer bearbeiten.</p>
            <div id="faecherListe">
        `;
        
        Object.entries(faecher).forEach(([kuerzel, name]) => {
            html += `
                <div class="fach-item">
                    <span class="fach-kuerzel">${kuerzel}</span>
                    <input type="text" value="${name}" onchange="fachNameChanged('${kuerzel}', this.value)">
                    <button class="btn btn-danger btn-sm" onclick="fachLoeschen('${kuerzel}')">Löschen</button>
                </div>
            `;
        });
        
        html += `
            </div>
            <div class="neues-fach">
                <h4>Neues Fach hinzufügen</h4>
                <div class="input-group">
                    <input type="text" id="neuesFachKuerzel" placeholder="Kürzel (z.B. M)" maxlength="5">
                    <input type="text" id="neuesFachName" placeholder="Fachname (z.B. Mathematik)">
                    <button class="btn btn-success" onclick="neuesFachHinzufuegen()">Hinzufügen</button>
                </div>
            </div>
            <button class="btn btn-success" onclick="faecherSpeichern()">Alle Änderungen speichern</button>
        `;
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der Fächer-Verwaltung:', error);
        container.innerHTML = '<p style="color: #e74c3c;">Fehler beim Laden der Fächer-Verwaltung!</p>';
    }
}

// Fach-Name geändert
function fachNameChanged(kuerzel, neuerName) {
    // Änderung wird beim Speichern übernommen
    console.log('📝 Fach geändert:', kuerzel, '->', neuerName);
}

// Neues Fach hinzufügen
function neuesFachHinzufuegen() {
    const kuerzelInput = document.getElementById('neuesFachKuerzel');
    const nameInput = document.getElementById('neuesFachName');
    
    const kuerzel = kuerzelInput?.value.trim().toUpperCase();
    const name = nameInput?.value.trim();
    
    if (!kuerzel || !name) {
        alert('Bitte Kürzel und Name eingeben!');
        return;
    }
    
    if (kuerzel.length > 5) {
        alert('Kürzel darf maximal 5 Zeichen lang sein!');
        return;
    }
    
    // Prüfen ob Kürzel bereits existiert
    const faecher = window.firebaseFunctions.getAllFaecher();
    if (faecher[kuerzel]) {
        alert('Dieses Kürzel existiert bereits!');
        return;
    }
    
    // Neues Fach zur Liste hinzufügen
    const faecherListe = document.getElementById('faecherListe');
    const newItem = document.createElement('div');
    newItem.className = 'fach-item';
    newItem.innerHTML = `
        <span class="fach-kuerzel">${kuerzel}</span>
        <input type="text" value="${name}" onchange="fachNameChanged('${kuerzel}', this.value)">
        <button class="btn btn-danger btn-sm" onclick="fachLoeschen('${kuerzel}')">Löschen</button>
    `;
    faecherListe.appendChild(newItem);
    
    // Eingabefelder leeren
    kuerzelInput.value = '';
    nameInput.value = '';
    
    console.log('➕ Neues Fach hinzugefügt:', kuerzel, name);
}

// Fach löschen
function fachLoeschen(kuerzel) {
    if (confirm(`Fach "${kuerzel}" wirklich löschen?\n\nHinweis: Dies kann Themen und andere Daten beeinträchtigen!`)) {
        const fachItem = event.target.closest('.fach-item');
        if (fachItem) {
            fachItem.remove();
        }
        console.log('🗑️ Fach gelöscht:', kuerzel);
    }
}

// Fächer speichern
async function faecherSpeichern() {
    console.log('💾 Speichere Fächer...');
    
    if (!window.firebaseFunctions.requireAdmin()) return;
    
    try {
        // Aktuelle Fächer aus DOM sammeln
        const neueFaecher = {};
        const fachItems = document.querySelectorAll('.fach-item');
        
        fachItems.forEach(item => {
            const kuerzel = item.querySelector('.fach-kuerzel')?.textContent.trim();
            const name = item.querySelector('input')?.value.trim();
            
            if (kuerzel && name) {
                neueFaecher[kuerzel] = name;
            }
        });
        
        if (Object.keys(neueFaecher).length === 0) {
            alert('Mindestens ein Fach muss vorhanden sein!');
            return;
        }
        
        // Fächer in Firebase speichern
        const faecherRef = window.firebaseFunctions.getDatabaseRef('system/faecher');
        await window.firebaseDB.set(faecherRef, neueFaecher);
        
        // Cache aktualisieren
        window.firebaseFunctions.dataCache.faecher = neueFaecher;
        
        // News erstellen
        if (window.newsFunctions) {
            await window.newsFunctions.createNewsForAction(
                'Fächer aktualisiert', 
                'Die Fächer-Liste wurde vom Administrator aktualisiert.'
            );
        }
        
        console.log('✅ Fächer gespeichert');
        alert('Fächer wurden erfolgreich gespeichert!');
        
    } catch (error) {
        console.error('❌ Fehler beim Speichern der Fächer:', error);
        alert('Fehler beim Speichern der Fächer: ' + error.message);
    }
}

// === CHECKPOINTS-VERWALTUNG (bleibt wie vorher) ===

async function loadCheckpointsVerwaltung() {
    console.log('📋 Lade Checkpoints-Verwaltung...');
    
    const container = document.getElementById('checkpointsVerwaltung');
    if (!container) return;
    
    try {
        // Checkpoints und Formulierungen aus Cache holen
        const checkpoints = window.firebaseFunctions.dataCache.bewertungsCheckpoints;
        const formulierungen = window.firebaseFunctions.dataCache.staerkenFormulierungen;
        
        let html = `
            <h3>Bewertungs-Checkpoints und Formulierungen verwalten</h3>
            <p>Hier können Sie die Bewertungskriterien und die dazugehörigen Sätze für die PDFs bearbeiten.</p>
            <div class="checkpoint-hilfe">
                <strong>Hinweis:</strong> Verwenden Sie [NAME] als Platzhalter für den Schülernamen in den Formulierungen.
            </div>
        `;
        
        Object.entries(checkpoints).forEach(([kategorie, items]) => {
            html += `
                <div class="checkpoint-kategorie-erweitert">
                    <h4>${getKategorieIcon(kategorie)} ${kategorie}</h4>
                    <div class="checkpoints-formulierungen" id="checkpoints-${kategorie.replace(/\s/g, '-')}">
            `;
            
            items.forEach((checkpointText, index) => {
                const key = `${kategorie}_${index}`;
                const formulierung = formulierungen[key] || checkpointText;
                
                html += `
                    <div class="checkpoint-formulierung-item">
                        <div class="checkpoint-nummer">Checkpoint ${index + 1}:</div>
                        <div class="checkpoint-inputs">
                            <div class="input-group">
                                <label>Bewertungskriterium:</label>
                                <input type="text" value="${checkpointText}" 
                                       class="checkpoint-text" 
                                       data-kategorie="${kategorie}" 
                                       data-index="${index}"
                                       onchange="checkpointTextChanged('${kategorie}', ${index}, this.value)">
                            </div>
                            <div class="input-group">
                                <label>Formulierung für PDF:</label>
                                <input type="text" value="${formulierung}" 
                                       class="formulierung-text"
                                       data-key="${key}"
                                       onchange="formulierungChanged('${key}', this.value)">
                            </div>
                            <button class="btn btn-danger btn-sm" 
                                    onclick="checkpointEntfernen('${kategorie}', ${index})">Entfernen</button>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    <div class="checkpoint-formulierung-item neue-item">
                        <div class="input-group">
                            <input type="text" placeholder="Neues Bewertungskriterium..." 
                                   id="new-checkpoint-${kategorie.replace(/\s/g, '-')}">
                            <input type="text" placeholder="Formulierung für PDF..." 
                                   id="new-formulierung-${kategorie.replace(/\s/g, '-')}">
                            <button class="btn btn-success btn-sm" 
                                    onclick="checkpointHinzufuegen('${kategorie}')">Hinzufügen</button>
                        </div>
                    </div>
                </div>
                </div>
            `;
        });
        
        html += `<button class="btn btn-success" onclick="checkpointsUndFormulierungenSpeichern()">Alle Änderungen speichern</button>`;
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der Checkpoints-Verwaltung:', error);
        container.innerHTML = '<p style="color: #e74c3c;">Fehler beim Laden der Checkpoints-Verwaltung!</p>';
    }
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

// Checkpoint-Text geändert
function checkpointTextChanged(kategorie, index, neuerText) {
    console.log('📝 Checkpoint geändert:', kategorie, index, '->', neuerText);
}

// Formulierung geändert
function formulierungChanged(key, neueFormulierung) {
    console.log('📝 Formulierung geändert:', key, '->', neueFormulierung);
}

// Checkpoint hinzufügen
function checkpointHinzufuegen(kategorie) {
    const checkpointInputId = `new-checkpoint-${kategorie.replace(/\s/g, '-')}`;
    const formulierungInputId = `new-formulierung-${kategorie.replace(/\s/g, '-')}`;
    
    const checkpointInput = document.getElementById(checkpointInputId);
    const formulierungInput = document.getElementById(formulierungInputId);
    
    const checkpointText = checkpointInput?.value.trim();
    const formulierungText = formulierungInput?.value.trim();
    
    if (!checkpointText) {
        alert('Bitte Bewertungskriterium eingeben!');
        return;
    }
    
    if (!formulierungText) {
        alert('Bitte Formulierung für PDF eingeben!');
        return;
    }
    
    // Neuen Checkpoint zur Liste hinzufügen
    const listeId = `checkpoints-${kategorie.replace(/\s/g, '-')}`;
    const liste = document.getElementById(listeId);
    if (!liste) return;
    
    // Index für neuen Checkpoint ermitteln
    const existingItems = liste.querySelectorAll('.checkpoint-formulierung-item:not(.neue-item)');
    const newIndex = existingItems.length;
    const key = `${kategorie}_${newIndex}`;
    
    // Neues Item vor dem Eingabe-Item einfügen
    const neuesItem = document.createElement('div');
    neuesItem.className = 'checkpoint-formulierung-item';
    neuesItem.innerHTML = `
        <div class="checkpoint-nummer">Checkpoint ${newIndex + 1}:</div>
        <div class="checkpoint-inputs">
            <div class="input-group">
                <label>Bewertungskriterium:</label>
                <input type="text" value="${checkpointText}" 
                       class="checkpoint-text" 
                       data-kategorie="${kategorie}" 
                       data-index="${newIndex}"
                       onchange="checkpointTextChanged('${kategorie}', ${newIndex}, this.value)">
            </div>
            <div class="input-group">
                <label>Formulierung für PDF:</label>
                <input type="text" value="${formulierungText}" 
                       class="formulierung-text"
                       data-key="${key}"
                       onchange="formulierungChanged('${key}', this.value)">
            </div>
            <button class="btn btn-danger btn-sm" 
                    onclick="checkpointEntfernen('${kategorie}', ${newIndex})">Entfernen</button>
        </div>
    `;
    
    // Vor dem letzten Element (Eingabe-Item) einfügen
    const eingabeItem = liste.querySelector('.neue-item');
    liste.insertBefore(neuesItem, eingabeItem);
    
    // Eingabefelder leeren
    checkpointInput.value = '';
    formulierungInput.value = '';
    
    console.log('➕ Checkpoint hinzugefügt:', kategorie, checkpointText);
}

// Checkpoint entfernen
function checkpointEntfernen(kategorie, index) {
    if (confirm('Checkpoint und Formulierung wirklich löschen?')) {
        const checkpointItem = event.target.closest('.checkpoint-formulierung-item');
        if (checkpointItem) {
            checkpointItem.remove();
        }
        console.log('🗑️ Checkpoint entfernt:', kategorie, index);
    }
}

// Checkpoints und Formulierungen speichern
async function checkpointsUndFormulierungenSpeichern() {
    console.log('💾 Speichere Checkpoints und Formulierungen...');
    
    if (!window.firebaseFunctions.requireAdmin()) return;
    
    try {
        const neueCheckpoints = {};
        const neueFormulierungen = {};
        
        // Alle Kategorien durchgehen
        const kategorien = Object.keys(window.firebaseFunctions.dataCache.bewertungsCheckpoints);
        
        kategorien.forEach(kategorie => {
            const listeId = `checkpoints-${kategorie.replace(/\s/g, '-')}`;
            const liste = document.getElementById(listeId);
            
            if (liste) {
                const checkpointItems = [];
                const items = liste.querySelectorAll('.checkpoint-formulierung-item:not(.neue-item)');
                
                items.forEach((item, realIndex) => {
                    const checkpointInput = item.querySelector('.checkpoint-text');
                    const formulierungInput = item.querySelector('.formulierung-text');
                    
                    if (checkpointInput && formulierungInput) {
                        const checkpointText = checkpointInput.value.trim();
                        const formulierungText = formulierungInput.value.trim();
                        
                        if (checkpointText && formulierungText) {
                            checkpointItems.push(checkpointText);
                            
                            // Formulierung mit neuem Index speichern
                            const key = `${kategorie}_${realIndex}`;
                            neueFormulierungen[key] = formulierungText;
                        }
                    }
                });
                
                if (checkpointItems.length > 0) {
                    neueCheckpoints[kategorie] = checkpointItems;
                }
            }
        });
        
        if (Object.keys(neueCheckpoints).length === 0) {
            alert('Mindestens eine Kategorie mit Checkpoints muss vorhanden sein!');
            return;
        }
        
        // Checkpoints speichern
        const checkpointsRef = window.firebaseFunctions.getDatabaseRef('system/bewertungsCheckpoints');
        await window.firebaseDB.set(checkpointsRef, neueCheckpoints);
        
        // Formulierungen speichern
        const formulierungenRef = window.firebaseFunctions.getDatabaseRef('system/staerkenFormulierungen');
        await window.firebaseDB.set(formulierungenRef, neueFormulierungen);
        
        // Cache aktualisieren
        window.firebaseFunctions.dataCache.bewertungsCheckpoints = neueCheckpoints;
        window.firebaseFunctions.dataCache.staerkenFormulierungen = neueFormulierungen;
        
        // News erstellen
        if (window.newsFunctions) {
            await window.newsFunctions.createNewsForAction(
                'Bewertungskriterien aktualisiert', 
                'Die Bewertungs-Checkpoints und Formulierungen wurden vom Administrator aktualisiert.'
            );
        }
        
        console.log('✅ Checkpoints und Formulierungen gespeichert');
        alert('Bewertungskriterien und Formulierungen wurden erfolgreich gespeichert!');
        
    } catch (error) {
        console.error('❌ Fehler beim Speichern:', error);
        alert('Fehler beim Speichern: ' + error.message);
    }
}

// === BRIEFVORLAGE (bleibt wie vorher) ===

async function loadBriefvorlage() {
    console.log('📄 Lade Briefvorlage...');
    
    try {
        const briefvorlage = window.firebaseFunctions.dataCache.briefvorlage;
        
        const anredeInput = document.getElementById('briefAnrede');
        const schlussInput = document.getElementById('briefSchluss');
        
        if (anredeInput) anredeInput.value = briefvorlage.anrede || '';
        if (schlussInput) schlussInput.value = briefvorlage.schluss || '';
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der Briefvorlage:', error);
    }
}

// Briefvorlage speichern
async function briefvorlageSpeichern() {
    console.log('💾 Speichere Briefvorlage...');
    
    if (!window.firebaseFunctions.requireAdmin()) return;
    
    try {
        const anredeInput = document.getElementById('briefAnrede');
        const schlussInput = document.getElementById('briefSchluss');
        
        const anrede = anredeInput?.value.trim();
        const schluss = schlussInput?.value.trim();
        
        if (!anrede || !schluss) {
            alert('Bitte füllen Sie beide Felder aus!');
            return;
        }
        
        const neueBriefvorlage = { anrede, schluss };
        
        // Briefvorlage in Firebase speichern
        const briefvorlageRef = window.firebaseFunctions.getDatabaseRef('system/briefvorlage');
        await window.firebaseDB.set(briefvorlageRef, neueBriefvorlage);
        
        // Cache aktualisieren
        window.firebaseFunctions.dataCache.briefvorlage = neueBriefvorlage;
        
        // News erstellen
        if (window.newsFunctions) {
            await window.newsFunctions.createNewsForAction(
                'Briefvorlage aktualisiert', 
                'Die Briefvorlage wurde vom Administrator aktualisiert.'
            );
        }
        
        console.log('✅ Briefvorlage gespeichert');
        alert('Briefvorlage wurde erfolgreich gespeichert!');
        
    } catch (error) {
        console.error('❌ Fehler beim Speichern der Briefvorlage:', error);
        alert('Fehler beim Speichern der Briefvorlage: ' + error.message);
    }
}

// === WEITERE ADMIN-FUNKTIONEN (bleiben wie vorher) ===

// Lehrer-Verwaltung laden
function loadLehrer() {
    console.log('👨‍🏫 Lade Lehrer-Verwaltung...');
    
    if (!window.firebaseFunctions.requireAdmin()) return;
    
    loadLehrerListe();
}

// Lehrer-Liste laden
async function loadLehrerListe() {
    try {
        const usersRef = window.firebaseFunctions.getDatabaseRef('users');
        const snapshot = await window.firebaseDB.get(usersRef);
        
        const liste = document.getElementById('lehrerListe');
        if (!liste) return;
        
        let html = '';
        
        if (snapshot.exists()) {
            const users = snapshot.val();
            
            Object.entries(users).forEach(([key, user]) => {
                if (user.role === 'lehrer') {
                    html += `
                        <div class="liste-item">
                            <div>
                                <strong>${user.name}</strong><br>
                                <small>E-Mail: ${user.email}</small>
                            </div>
                            <div>
                                <button class="btn btn-danger" onclick="lehrerLoeschen('${key}', '${user.name}')">Löschen</button>
                            </div>
                        </div>
                    `;
                }
            });
        }
        
        if (!html) {
            html = '<div class="card"><p>Keine Lehrer gefunden.</p></div>';
        }
        
        liste.innerHTML = html;
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der Lehrer-Liste:', error);
        const liste = document.getElementById('lehrerListe');
        if (liste) {
            liste.innerHTML = '<div class="card"><p style="color: #e74c3c;">Fehler beim Laden der Lehrer-Liste!</p></div>';
        }
    }
}

// Datenverwaltung laden
function loadDatenverwaltung() {
    console.log('🗄️ Lade Datenverwaltung...');
    
    if (!window.firebaseFunctions.requireAdmin()) return;
    
    updateFirebaseInfo();
    loadStatistiken();
}

// Firebase-Info aktualisieren
function updateFirebaseInfo() {
    const statusElement = document.getElementById('dbStatus');
    const userElement = document.getElementById('dbUser');
    const syncElement = document.getElementById('lastSync');
    
    if (statusElement) {
        statusElement.innerHTML = '🔥 Firebase Realtime Database';
        statusElement.style.color = '#27ae60';
    }
    
    if (userElement) {
        userElement.textContent = window.authFunctions.getUserEmail() || '-';
    }
    
    if (syncElement) {
        syncElement.textContent = new Date().toLocaleString('de-DE');
    }
}

// Schuljahr speichern
async function schuljahrSpeichern() {
    console.log('📅 Speichere Schuljahr...');
    
    if (!window.firebaseFunctions.requireAdmin()) return;
    
    try {
        const schuljahrInput = document.getElementById('schuljahr');
        const schuljahr = schuljahrInput?.value.trim();
        
        if (!schuljahr) {
            alert('Bitte geben Sie ein Schuljahr ein!');
            return;
        }
        
        // Schuljahr in Firebase speichern
        const configRef = window.firebaseFunctions.getDatabaseRef('config/system/schuljahr');
        await window.firebaseDB.set(configRef, schuljahr);
        
        // Cache aktualisieren
        if (window.firebaseFunctions.dataCache.config) {
            window.firebaseFunctions.dataCache.config.schuljahr = schuljahr;
        }
        
        console.log('✅ Schuljahr gespeichert:', schuljahr);
        alert('Schuljahr wurde erfolgreich gespeichert!');
        
    } catch (error) {
        console.error('❌ Fehler beim Speichern des Schuljahrs:', error);
        alert('Fehler beim Speichern des Schuljahrs: ' + error.message);
    }
}

// Export für andere Module
window.adminFunctions = {
    loadAdminVorlagen,
    loadLehrer,
    loadDatenverwaltung,
    updateFirebaseInfo,
    schuljahrSpeichern,
    csvDateiAusgewaehlt,
    csvImportieren,
    neueKlasseErstellen,
    klasseBearbeiten,
    klasseLoeschen,
    schuelerZurKlasseHinzufuegen,
    schuelerAusKlasseEntfernen,
    klasseEditSpeichern,
    klasseEditAbbrechen
};

console.log('✅ Firebase Admin-System bereit');
