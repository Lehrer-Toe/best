// Firebase Klassen-System - Realtime Database
console.log('🏫 Firebase Klassen-System geladen');

// Globale Variablen für Klassenverwaltung
let aktuelleKlasseEdit = null;
let uploadVorschauDaten = [];

// Klassen laden und anzeigen
function loadKlassen() {
    console.log('🏫 Lade Klassen von Firebase...');
    
    if (!window.firebaseFunctions.requireAdmin()) return;
    
    // Schuljahr-Selects aktualisieren
    updateSchuljahreSelects();
    
    // Klassen für Uploads laden
    updateKlassenSelects();
    
    // Klassen-Liste laden
    loadKlassenListe();
}

// Schuljahre in Selects aktualisieren
function updateSchuljahreSelects() {
    const currentYear = new Date().getFullYear();
    const schuljahre = [];
    
    // Aktuelles und nächste Schuljahre generieren
    for (let i = -1; i <= 2; i++) {
        const year = currentYear + i;
        schuljahre.push(`${year}/${(year + 1).toString().slice(-2)}`);
    }
    
    const selects = ['klassenSchuljahr', 'editKlassenSchuljahr', 'schuljahrFilter'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = schuljahre.map(jahr => 
                `<option value="${jahr}">${jahr}</option>`
            ).join('');
            
            // Aktuelles Schuljahr auswählen
            const aktuellesSchuljahr = window.firebaseFunctions.dataCache.config?.schuljahr || '2025/26';
            select.value = aktuellesSchuljahr;
        }
    });
}

// Klassen in Selects aktualisieren
function updateKlassenSelects() {
    const klassen = window.firebaseFunctions.getKlassenFromCache();
    
    const selects = ['uploadKlasseSelect', 'gruppenKlasseSelect', 'klassenFilter'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            let html = selectId === 'klassenFilter' ? '<option value="">Alle Klassen</option>' : '<option value="">Klasse auswählen...</option>';
            
            klassen.forEach(klasse => {
                html += `<option value="${klasse.id}">${klasse.name} (${klasse.schuljahr})</option>`;
            });
            
            select.innerHTML = html;
        }
    });
}

// Klassen-Liste laden
async function loadKlassenListe() {
    const container = document.getElementById('klassenListe');
    if (!container) return;
    
    try {
        // Klassen aus Cache holen
        const alleKlassen = window.firebaseFunctions.getKlassenFromCache();
        
        // Filter anwenden
        const gefilterteKlassen = filterKlassenListe(alleKlassen);
        
        if (gefilterteKlassen.length === 0) {
            container.innerHTML = '<div class="card"><p>Keine Klassen vorhanden. Legen Sie eine neue Klasse an!</p></div>';
            return;
        }
        
        let html = '';
        gefilterteKlassen.forEach(klasse => {
            const schuelerAnzahl = klasse.schueler ? klasse.schueler.length : 0;
            const schuelerText = schuelerAnzahl === 1 ? '1 Schüler' : `${schuelerAnzahl} Schüler`;
            
            html += `
                <div class="liste-item klasse-item">
                    <div>
                        <strong>${klasse.name}</strong>
                        <span class="schuljahr-badge">${klasse.schuljahr}</span><br>
                        <small>${schuelerText} • Erstellt: ${klasse.erstellt} von ${klasse.ersteller || 'System'}</small>
                        ${schuelerAnzahl > 0 ? `<br><small>Beispiel: ${klasse.schueler.slice(0, 3).map(s => s.vorname + ' ' + s.nachname).join(', ')}${schuelerAnzahl > 3 ? '...' : ''}</small>` : ''}
                    </div>
                    <div>
                        <button class="btn" onclick="klasseBearbeiten('${klasse.id}')">Bearbeiten</button>
                        <button class="btn btn-danger" onclick="klasseLoeschen('${klasse.id}')">Löschen</button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        console.log('🏫 Klassen geladen:', gefilterteKlassen.length);
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der Klassen:', error);
        container.innerHTML = '<div class="card"><p style="color: #e74c3c;">Fehler beim Laden der Klassen!</p></div>';
    }
}

// Klassen filtern
function filterKlassen() {
    loadKlassenListe();
}

// Klassen-Liste filtern
function filterKlassenListe(klassen) {
    const klassenFilter = document.getElementById('klassenFilter')?.value || '';
    const schuljahrFilter = document.getElementById('schuljahrFilter')?.value || '';
    
    let gefiltert = [...klassen];
    
    // Klassen-Filter
    if (klassenFilter) {
        gefiltert = gefiltert.filter(k => k.id === klassenFilter);
    }
    
    // Schuljahr-Filter
    if (schuljahrFilter) {
        gefiltert = gefiltert.filter(k => k.schuljahr === schuljahrFilter);
    }
    
    // Nach Name sortieren
    gefiltert.sort((a, b) => a.name.localeCompare(b.name));
    
    return gefiltert;
}

// Neue Klasse anlegen
async function klasseAnlegen() {
    console.log('🏫 Erstelle neue Klasse...');
    
    if (!window.firebaseFunctions.requireAdmin()) return;
    
    const nameInput = document.getElementById('klassenName');
    const schuljahrSelect = document.getElementById('klassenSchuljahr');
    
    const name = nameInput?.value.trim();
    const schuljahr = schuljahrSelect?.value;
    
    if (!name) {
        alert('Bitte geben Sie einen Klassennamen ein!');
        return;
    }
    
    if (!schuljahr) {
        alert('Bitte wählen Sie ein Schuljahr aus!');
        return;
    }
    
    // Prüfen ob Klasse bereits existiert
    const klassen = window.firebaseFunctions.getKlassenFromCache();
    const existierend = klassen.find(k => k.name === name && k.schuljahr === schuljahr);
    if (existierend) {
        alert('Eine Klasse mit diesem Namen existiert bereits in diesem Schuljahr!');
        return;
    }
    
    try {
        // Klasse zu Firebase hinzufügen
        const klassenRef = window.firebaseFunctions.getDatabaseRef('klassen');
        const newKlasseRef = window.firebaseDB.push(klassenRef);
        
        const neueKlasse = {
            id: newKlasseRef.key,
            name,
            schuljahr,
            schueler: [],
            erstellt: window.firebaseFunctions.formatGermanDate(),
            timestamp: window.firebaseFunctions.getTimestamp(),
            ersteller: window.firebaseFunctions.getCurrentUserName()
        };
        
        await window.firebaseDB.set(newKlasseRef, neueKlasse);
        
        // Eingabefelder zurücksetzen
        nameInput.value = '';
        
        // News erstellen
        if (window.newsFunctions) {
            await window.newsFunctions.createNewsForAction(
                'Neue Klasse angelegt', 
                `Die Klasse "${name}" wurde für das Schuljahr ${schuljahr} angelegt.`
            );
        }
        
        console.log('✅ Klasse erstellt:', name, 'Schuljahr:', schuljahr);
        alert(`Klasse "${name}" wurde erfolgreich angelegt!`);
        
    } catch (error) {
        console.error('❌ Fehler beim Erstellen der Klasse:', error);
        alert('Fehler beim Erstellen der Klasse: ' + error.message);
    }
}

// === DATEI-UPLOAD ===

// Schüler-Datei gewählt
function schuelerDateiGewaehlt() {
    const fileInput = document.getElementById('schuelerDateiUpload');
    const uploadButton = document.getElementById('uploadButton');
    
    if (fileInput.files.length > 0) {
        uploadButton.disabled = false;
        uploadButton.textContent = 'Datei verarbeiten';
    } else {
        uploadButton.disabled = true;
        uploadButton.textContent = 'Schüler hochladen';
    }
}

// Schüler-Datei hochladen und verarbeiten
async function schuelerDateiHochladen() {
    console.log('📁 Verarbeite Schüler-Datei...');
    
    const fileInput = document.getElementById('schuelerDateiUpload');
    const klasseSelect = document.getElementById('uploadKlasseSelect');
    const formatSelect = document.getElementById('uploadFormat');
    
    const file = fileInput.files[0];
    const klasseId = klasseSelect.value;
    const format = formatSelect.value;
    
    if (!file) {
        alert('Bitte wählen Sie eine Datei aus!');
        return;
    }
    
    if (!klasseId) {
        alert('Bitte wählen Sie eine Klasse aus!');
        return;
    }
    
    try {
        const fileExtension = file.name.split('.').pop().toLowerCase();
        let rawData = '';
        
        if (fileExtension === 'csv' || fileExtension === 'txt') {
            rawData = await readTextFile(file);
        } else if (fileExtension === 'xlsx') {
            rawData = await readExcelFile(file);
        } else {
            alert('Nicht unterstütztes Dateiformat! Verwenden Sie CSV, XLSX oder TXT.');
            return;
        }
        
        // Daten parsen
        const schuelerDaten = parseSchuelerDaten(rawData, format);
        
        if (schuelerDaten.length === 0) {
            alert('Keine gültigen Schülerdaten gefunden!');
            return;
        }
        
        // Vorschau anzeigen
        zeigeUploadVorschau(schuelerDaten, klasseId);
        
    } catch (error) {
        console.error('❌ Fehler beim Verarbeiten der Datei:', error);
        alert('Fehler beim Verarbeiten der Datei: ' + error.message);
    }
}

// Text-Datei lesen
function readTextFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Fehler beim Lesen der Datei'));
        reader.readAsText(file, 'UTF-8');
    });
}

// Excel-Datei lesen
async function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                // Wir simulieren Excel-Parsing hier - in einer echten Implementation würde man SheetJS verwenden
                // Für diese Demo nehmen wir an, dass Excel-Dateien als CSV-ähnliche Struktur vorliegen
                const text = new TextDecoder().decode(e.target.result);
                resolve(text);
            } catch (error) {
                reject(new Error('Fehler beim Lesen der Excel-Datei'));
            }
        };
        reader.onerror = (e) => reject(new Error('Fehler beim Lesen der Datei'));
        reader.readAsArrayBuffer(file);
    });
}

// Schüler-Daten parsen
function parseSchuelerDaten(rawData, format) {
    const lines = rawData.split('\n').map(line => line.trim()).filter(line => line);
    const schueler = [];
    
    lines.forEach((line, index) => {
        try {
            let vorname = '';
            let nachname = '';
            
            if (format === 'vorname-nachname') {
                // "Max Mustermann" oder "Max Mustermann-Schmidt"
                const parts = line.split(' ');
                if (parts.length >= 2) {
                    vorname = parts[0];
                    nachname = parts.slice(1).join(' ');
                }
            } else if (format === 'nachname-vorname') {
                // "Mustermann, Max" oder "Mustermann-Schmidt, Max"
                const parts = line.split(',').map(p => p.trim());
                if (parts.length >= 2) {
                    nachname = parts[0];
                    vorname = parts[1];
                }
            }
            
            if (vorname && nachname) {
                schueler.push({
                    vorname: vorname.trim(),
                    nachname: nachname.trim(),
                    originalLine: line,
                    lineNumber: index + 1
                });
            }
        } catch (error) {
            console.warn('Fehler beim Parsen von Zeile', index + 1, ':', line, error);
        }
    });
    
    return schueler;
}

// Upload-Vorschau anzeigen
function zeigeUploadVorschau(schuelerDaten, klasseId) {
    uploadVorschauDaten = schuelerDaten;
    
    const vorschauContainer = document.getElementById('uploadVorschau');
    const inhaltContainer = document.getElementById('uploadVorschauInhalt');
    
    const klassen = window.firebaseFunctions.getKlassenFromCache();
    const klasse = klassen.find(k => k.id === klasseId);
    
    let html = `
        <p><strong>Klasse:</strong> ${klasse ? klasse.name + ' (' + klasse.schuljahr + ')' : 'Unbekannt'}</p>
        <p><strong>Anzahl Schüler:</strong> ${schuelerDaten.length}</p>
        <div class="vorschau-liste">
    `;
    
    schuelerDaten.forEach((schueler, index) => {
        html += `
            <div class="vorschau-schueler-item">
                <span class="schueler-nummer">${index + 1}.</span>
                <span class="schueler-name">${schueler.vorname} ${schueler.nachname}</span>
                <small class="original-text">(${schueler.originalLine})</small>
            </div>
        `;
    });
    
    html += '</div>';
    
    inhaltContainer.innerHTML = html;
    vorschauContainer.classList.remove('hidden');
}

// Upload-Vorschau schließen
function uploadVorschauSchliessen() {
    document.getElementById('uploadVorschau').classList.add('hidden');
    uploadVorschauDaten = [];
    
    // File-Input zurücksetzen
    const fileInput = document.getElementById('schuelerDateiUpload');
    const uploadButton = document.getElementById('uploadButton');
    fileInput.value = '';
    uploadButton.disabled = true;
    uploadButton.textContent = 'Schüler hochladen';
}

// Schüler-Daten bestätigen und speichern
async function schuelerDatenBestaetigen() {
    console.log('💾 Speichere Schüler-Daten...');
    
    if (!window.firebaseFunctions.requireAdmin() || uploadVorschauDaten.length === 0) return;
    
    const klasseSelect = document.getElementById('uploadKlasseSelect');
    const klasseId = klasseSelect.value;
    
    if (!klasseId) {
        alert('Keine Klasse ausgewählt!');
        return;
    }
    
    try {
        // Klasse laden
        const klassenRef = window.firebaseFunctions.getDatabaseRef(`klassen/${klasseId}`);
        const snapshot = await window.firebaseDB.get(klassenRef);
        
        if (!snapshot.exists()) {
            alert('Klasse nicht gefunden!');
            return;
        }
        
        const klasse = snapshot.val();
        const existierdeSchueler = klasse.schueler || [];
        
        // Neue Schüler hinzufügen (Duplikate vermeiden)
        const neueSchueler = [...existierdeSchueler];
        let hinzugefuegt = 0;
        
        uploadVorschauDaten.forEach(uploadSchueler => {
            const existiert = existierdeSchueler.some(existing => 
                existing.vorname.toLowerCase() === uploadSchueler.vorname.toLowerCase() &&
                existing.nachname.toLowerCase() === uploadSchueler.nachname.toLowerCase()
            );
            
            if (!existiert) {
                neueSchueler.push({
                    vorname: uploadSchueler.vorname,
                    nachname: uploadSchueler.nachname,
                    hinzugefuegt: window.firebaseFunctions.formatGermanDate(),
                    timestamp: window.firebaseFunctions.getTimestamp()
                });
                hinzugefuegt++;
            }
        });
        
        // Aktualisierte Klasse speichern
        await window.firebaseDB.set(klassenRef, {
            ...klasse,
            schueler: neueSchueler,
            lastUpdate: window.firebaseFunctions.getTimestamp()
        });
        
        // News erstellen
        if (window.newsFunctions) {
            await window.newsFunctions.createNewsForAction(
                'Schüler hochgeladen', 
                `${hinzugefuegt} neue Schüler wurden zur Klasse "${klasse.name}" hinzugefügt.`
            );
        }
        
        console.log('✅ Schüler-Daten gespeichert:', hinzugefuegt, 'neue Schüler');
        alert(`${hinzugefuegt} neue Schüler wurden erfolgreich hinzugefügt!\n(${uploadVorschauDaten.length - hinzugefuegt} Duplikate übersprungen)`);
        
        // Aufräumen
        uploadVorschauSchliessen();
        
    } catch (error) {
        console.error('❌ Fehler beim Speichern der Schüler-Daten:', error);
        alert('Fehler beim Speichern der Schüler-Daten: ' + error.message);
    }
}

// === KLASSE BEARBEITEN ===

// Klasse bearbeiten
async function klasseBearbeiten(klasseId) {
    console.log('🏫 Bearbeite Klasse:', klasseId);
    
    if (!window.firebaseFunctions.requireAdmin()) return;
    
    try {
        const klassen = window.firebaseFunctions.getKlassenFromCache();
        const klasse = klassen.find(k => k.id === klasseId);
        
        if (!klasse) {
            alert('Klasse nicht gefunden!');
            return;
        }
        
        aktuelleKlasseEdit = klasse;
        await showKlasseEditModal();
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der Klasse:', error);
        alert('Fehler beim Laden der Klasse: ' + error.message);
    }
}

// Klasse-Edit Modal anzeigen
async function showKlasseEditModal() {
    const modal = document.getElementById('klasseEditModal');
    if (!modal) return;
    
    modal.classList.remove('hidden');
    
    // Klassen-Daten setzen
    const nameInput = document.getElementById('editKlassenName');
    const schuljahrSelect = document.getElementById('editKlassenSchuljahr');
    
    if (nameInput) nameInput.value = aktuelleKlasseEdit.name;
    if (schuljahrSelect) schuljahrSelect.value = aktuelleKlasseEdit.schuljahr;
    
    // Schüler-Liste aufbauen
    buildKlasseSchuelerListe();
}

// Schüler-Liste in Klasse-Edit aufbauen
function buildKlasseSchuelerListe() {
    const container = document.getElementById('klasseSchuelerListe');
    if (!container || !aktuelleKlasseEdit) return;
    
    const schueler = aktuelleKlasseEdit.schueler || [];
    
    let html = '';
    
    if (schueler.length === 0) {
        html = '<p>Keine Schüler in dieser Klasse.</p>';
    } else {
        schueler.forEach((schueler, index) => {
            html += `
                <div class="klasse-schueler-item">
                    <span class="schueler-info">${schueler.vorname} ${schueler.nachname}</span>
                    <small class="schueler-datum">Hinzugefügt: ${schueler.hinzugefuegt || 'Unbekannt'}</small>
                    <button class="btn btn-danger btn-sm" onclick="schuelerAusKlasseEntfernen(${index})">Entfernen</button>
                </div>
            `;
        });
    }
    
    container.innerHTML = html;
}

// Schüler zur Klasse hinzufügen
function schuelerZurKlasseHinzufuegen() {
    const vornameInput = document.getElementById('neuerSchuelerVorname');
    const nachnameInput = document.getElementById('neuerSchuelerNachname');
    
    const vorname = vornameInput?.value.trim();
    const nachname = nachnameInput?.value.trim();
    
    if (!vorname || !nachname) {
        alert('Bitte geben Sie Vor- und Nachname ein!');
        return;
    }
    
    // Prüfen ob Schüler bereits existiert
    const existiert = aktuelleKlasseEdit.schueler?.some(s => 
        s.vorname.toLowerCase() === vorname.toLowerCase() &&
        s.nachname.toLowerCase() === nachname.toLowerCase()
    );
    
    if (existiert) {
        alert('Dieser Schüler ist bereits in der Klasse!');
        return;
    }
    
    // Schüler hinzufügen
    if (!aktuelleKlasseEdit.schueler) {
        aktuelleKlasseEdit.schueler = [];
    }
    
    aktuelleKlasseEdit.schueler.push({
        vorname,
        nachname,
        hinzugefuegt: window.firebaseFunctions.formatGermanDate(),
        timestamp: window.firebaseFunctions.getTimestamp()
    });
    
    // Eingabefelder leeren
    vornameInput.value = '';
    nachnameInput.value = '';
    
    // Liste neu aufbauen
    buildKlasseSchuelerListe();
    
    console.log('➕ Schüler hinzugefügt:', vorname, nachname);
}

// Schüler aus Klasse entfernen
function schuelerAusKlasseEntfernen(index) {
    if (!aktuelleKlasseEdit.schueler) return;
    
    const schueler = aktuelleKlasseEdit.schueler[index];
    if (!schueler) return;
    
    if (confirm(`${schueler.vorname} ${schueler.nachname} wirklich aus der Klasse entfernen?\n\nHinweis: Dies kann bestehende Gruppen beeinträchtigen!`)) {
        aktuelleKlasseEdit.schueler.splice(index, 1);
        buildKlasseSchuelerListe();
        
        console.log('➖ Schüler entfernt:', schueler.vorname, schueler.nachname);
    }
}

// Klasse-Edit speichern
async function klasseEditSpeichern() {
    console.log('💾 Speichere Klassen-Änderungen...');
    
    if (!window.firebaseFunctions.requireAdmin() || !aktuelleKlasseEdit) return;
    
    try {
        const nameInput = document.getElementById('editKlassenName');
        const schuljahrSelect = document.getElementById('editKlassenSchuljahr');
        
        const neuerName = nameInput?.value.trim();
        const neuesSchuljahr = schuljahrSelect?.value;
        
        if (!neuerName) {
            alert('Bitte geben Sie einen Klassennamen ein!');
            return;
        }
        
        if (!neuesSchuljahr) {
            alert('Bitte wählen Sie ein Schuljahr aus!');
            return;
        }
        
        // Prüfen ob Name/Schuljahr-Kombination bereits existiert (außer bei aktueller Klasse)
        const klassen = window.firebaseFunctions.getKlassenFromCache();
        const nameConflict = klassen.find(k => 
            k.id !== aktuelleKlasseEdit.id &&
            k.name === neuerName && 
            k.schuljahr === neuesSchuljahr
        );
        
        if (nameConflict) {
            alert('Eine Klasse mit diesem Namen existiert bereits in diesem Schuljahr!');
            return;
        }
        
        // Aktualisierte Klasse speichern
        const updatedKlasse = {
            ...aktuelleKlasseEdit,
            name: neuerName,
            schuljahr: neuesSchuljahr,
            lastUpdate: window.firebaseFunctions.getTimestamp()
        };
        
        const klasseRef = window.firebaseFunctions.getDatabaseRef(`klassen/${aktuelleKlasseEdit.id}`);
        await window.firebaseDB.set(klasseRef, updatedKlasse);
        
        // News erstellen
        if (window.newsFunctions) {
            await window.newsFunctions.createNewsForAction(
                'Klasse aktualisiert', 
                `Die Klasse "${neuerName}" wurde bearbeitet.`
            );
        }
        
        console.log('✅ Klasse aktualisiert:', neuerName);
        alert(`Klasse "${neuerName}" wurde erfolgreich aktualisiert!`);
        
        klasseEditAbbrechen();
        
    } catch (error) {
        console.error('❌ Fehler beim Speichern der Klasse:', error);
        alert('Fehler beim Speichern der Klasse: ' + error.message);
    }
}

// Klasse-Edit abbrechen
function klasseEditAbbrechen() {
    const modal = document.getElementById('klasseEditModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    aktuelleKlasseEdit = null;
}

// Klasse löschen
async function klasseLoeschen(klasseId) {
    if (!window.firebaseFunctions.requireAdmin()) return;
    
    try {
        const klassen = window.firebaseFunctions.getKlassenFromCache();
        const klasse = klassen.find(k => k.id === klasseId);
        
        if (!klasse) {
            alert('Klasse nicht gefunden!');
            return;
        }
        
        const schuelerAnzahl = klasse.schueler ? klasse.schueler.length : 0;
        
        if (confirm(`Klasse "${klasse.name}" wirklich löschen?\n\nDies löscht ${schuelerAnzahl} Schüler und kann bestehende Gruppen beeinträchtigen!`)) {
            // Klasse löschen
            const klasseRef = window.firebaseFunctions.getDatabaseRef(`klassen/${klasseId}`);
            await window.firebaseDB.remove(klasseRef);
            
            // News erstellen
            if (window.newsFunctions) {
                await window.newsFunctions.createNewsForAction(
                    'Klasse gelöscht', 
                    `Die Klasse "${klasse.name}" wurde gelöscht.`
                );
            }
            
            console.log('🗑️ Klasse gelöscht:', klasse.name);
            alert(`Klasse "${klasse.name}" wurde gelöscht.`);
        }
        
    } catch (error) {
        console.error('❌ Fehler beim Löschen der Klasse:', error);
        alert('Fehler beim Löschen der Klasse: ' + error.message);
    }
}

// === HELPER FUNCTIONS ===

// Schüler einer Klasse für Gruppen-Erstellung holen
function getSchuelerFuerKlasse(klasseId) {
    const klassen = window.firebaseFunctions.getKlassenFromCache();
    const klasse = klassen.find(k => k.id === klasseId);
    return klasse ? (klasse.schueler || []) : [];
}

// Verfügbare Schüler für Gruppen-Erstellung (nicht bereits in Gruppen)
function getVerfuegbareSchueler(klasseId) {
    const klassenSchueler = getSchuelerFuerKlasse(klasseId);
    const gruppen = window.firebaseFunctions.getGruppenFromCache();
    
    // Sammle alle bereits verwendeten Schüler
    const verwendeteSchueler = new Set();
    gruppen.forEach(gruppe => {
        if (gruppe.schueler) {
            gruppe.schueler.forEach(schueler => {
                if (schueler.klasseId === klasseId) {
                    verwendeteSchueler.add(`${schueler.vorname}-${schueler.nachname}`);
                }
            });
        }
    });
    
    // Filtere verfügbare Schüler
    return klassenSchueler.filter(schueler => 
        !verwendeteSchueler.has(`${schueler.vorname}-${schueler.nachname}`)
    );
}

// Klassen-Daten für andere Module bereitstellen
function getKlassenForDropdown() {
    const klassen = window.firebaseFunctions.getKlassenFromCache();
    return klassen.map(klasse => ({
        value: klasse.id,
        text: `${klasse.name} (${klasse.schuljahr})`,
        schueler: klasse.schueler || []
    }));
}

// Export für andere Module
window.klassenFunctions = {
    getSchuelerFuerKlasse,
    getVerfuegbareSchueler,
    getKlassenForDropdown,
    updateKlassenSelects
};

console.log('✅ Firebase Klassen-System bereit');
