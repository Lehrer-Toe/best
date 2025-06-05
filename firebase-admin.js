// Firebase Admin-System - Realtime Database
console.log('⚙️ Firebase Admin-System geladen');

// Admin-Vorlagen Tab laden
function loadAdminVorlagen() {
    console.log('⚙️ Lade Admin-Vorlagen...');
    
    if (!window.firebaseFunctions.requireAdmin()) return;
    
    // Alle Admin-Bereiche laden
    loadFaecherVerwaltung();
    loadKlassenVerwaltung();
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
            <h3>Klassen und Schüler verwalten</h3>
            <p>Hier können Sie Klassen anlegen und Schüler zuordnen.</p>
            
            <!-- CSV Import -->
            <div class="csv-import-bereich">
                <h4>📄 Schüler aus CSV importieren</h4>
                <p><strong>CSV-Format:</strong> Klasse,Nachname,Vorname (z.B. "7a,Müller,Max")</p>
                <div class="input-group">
                    <input type="file" id="csvFileInput" accept=".csv" onchange="csvDateiAusgewaehlt()">
                    <button class="btn btn-success" onclick="csvImportieren()">CSV importieren</button>
                </div>
                <div id="csvPreview" class="csv-preview hidden"></div>
            </div>
            
            <!-- Neue Klasse manuell anlegen -->
            <div class="neue-klasse-bereich">
                <h4>➕ Neue Klasse anlegen</h4>
                <div class="input-group">
                    <input type="text" id="neueKlasseName" placeholder="Klassenname (z.B. 7a)" maxlength="10">
                    <button class="btn btn-success" onclick="neueKlasseAnlegen()">Klasse anlegen</button>
                </div>
            </div>
            
            <!-- Bestehende Klassen -->
            <div class="klassen-liste">
                <h4>📚 Bestehende Klassen</h4>
                <div id="klassenListe">
        `;
        
        if (Object.keys(klassen).length > 0) {
            Object.entries(klassen).forEach(([klassenName, klassenData]) => {
                const schuelerCount = klassenData.schueler ? klassenData.schueler.length : 0;
                const zugewieseneCount = getZugewieseneSchuelerCount(klassenName);
                const freieCount = schuelerCount - zugewieseneCount;
                
                html += `
                    <div class="klassen-item">
                        <div class="klassen-header">
                            <h5>${klassenName}</h5>
                            <div class="klassen-stats">
                                <span class="stat-badge">Gesamt: ${schuelerCount}</span>
                                <span class="stat-badge frei">Frei: ${freieCount}</span>
                                <span class="stat-badge zugewiesen">Zugewiesen: ${zugewieseneCount}</span>
                            </div>
                            <div class="klassen-actions">
                                <button class="btn btn-sm" onclick="klasseBearbeiten('${klassenName}')">Bearbeiten</button>
                                <button class="btn btn-danger btn-sm" onclick="klasseLoeschen('${klassenName}')">Löschen</button>
                            </div>
                        </div>
                        <div class="schueler-liste-preview" id="schueler-${klassenName}">
                `;
                
                if (klassenData.schueler && klassenData.schueler.length > 0) {
                    klassenData.schueler.forEach(schueler => {
                        const istZugewiesen = istSchuelerZugewiesen(klassenName, schueler.nachname, schueler.vorname);
                        const statusClass = istZugewiesen ? 'zugewiesen' : 'frei';
                        const statusText = istZugewiesen ? '📋 Zugewiesen' : '✅ Verfügbar';
                        
                        html += `
                            <div class="schueler-preview-item ${statusClass}">
                                <span class="schueler-name">${schueler.nachname}, ${schueler.vorname}</span>
                                <span class="schueler-status">${statusText}</span>
                            </div>
                        `;
                    });
                } else {
                    html += '<p class="keine-schueler">Keine Schüler in dieser Klasse</p>';
                }
                
                html += `
                        </div>
                    </div>
                `;
            });
        } else {
            html += '<p class="keine-klassen">Noch keine Klassen angelegt. Importieren Sie eine CSV-Datei oder legen Sie manuell eine Klasse an.</p>';
        }
        
        html += `
                </div>
            </div>
            <button class="btn btn-success" onclick="klassenSpeichern()">Alle Änderungen speichern</button>
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
    const file = fileInput.files[0];
    
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const csvText = e.target.result;
        csvVorschauAnzeigen(csvText);
    };
    reader.readAsText(file, 'UTF-8');
}

// CSV-Vorschau anzeigen
function csvVorschauAnzeigen(csvText) {
    const preview = document.getElementById('csvPreview');
    if (!preview) return;
    
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
        preview.innerHTML = '<p style="color: #e74c3c;">CSV-Datei ist leer oder ungültig.</p>';
        preview.classList.remove('hidden');
        return;
    }
    
    let html = `
        <h5>📋 CSV-Vorschau (${lines.length} Einträge)</h5>
        <div class="csv-preview-liste">
    `;
    
    const klassenStats = {};
    let validEntries = 0;
    let invalidEntries = 0;
    
    lines.forEach((line, index) => {
        const parts = line.split(',').map(part => part.trim().replace(/"/g, ''));
        
        if (parts.length >= 3) {
            const [klasse, nachname, vorname] = parts;
            if (klasse && nachname && vorname) {
                klassenStats[klasse] = (klassenStats[klasse] || 0) + 1;
                html += `
                    <div class="csv-entry valid">
                        <span class="klasse-badge">${klasse}</span>
                        ${nachname}, ${vorname}
                    </div>
                `;
                validEntries++;
            } else {
                html += `
                    <div class="csv-entry invalid">
                        Zeile ${index + 1}: Ungültige Daten - "${line}"
                    </div>
                `;
                invalidEntries++;
            }
        } else {
            html += `
                <div class="csv-entry invalid">
                    Zeile ${index + 1}: Zu wenige Spalten - "${line}"
                </div>
            `;
            invalidEntries++;
        }
    });
    
    html += '</div>';
    
    // Statistiken hinzufügen
    html += `
        <div class="csv-stats">
            <div class="stat-item">
                <strong>Gültige Einträge:</strong> ${validEntries}
            </div>
            <div class="stat-item">
                <strong>Ungültige Einträge:</strong> ${invalidEntries}
            </div>
            <div class="stat-item">
                <strong>Klassen:</strong> ${Object.keys(klassenStats).map(k => `${k} (${klassenStats[k]})`).join(', ')}
            </div>
        </div>
    `;
    
    preview.innerHTML = html;
    preview.classList.remove('hidden');
}

// CSV importieren
async function csvImportieren() {
    console.log('📄 Importiere CSV-Daten...');
    
    if (!window.firebaseFunctions.requireAdmin()) return;
    
    const fileInput = document.getElementById('csvFileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Bitte wählen Sie eine CSV-Datei aus!');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        const csvText = e.target.result;
        const lines = csvText.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
            alert('CSV-Datei ist leer!');
            return;
        }
        
        try {
            const neueKlassen = {};
            let importCount = 0;
            let errorCount = 0;
            
            lines.forEach(line => {
                const parts = line.split(',').map(part => part.trim().replace(/"/g, ''));
                
                if (parts.length >= 3) {
                    const [klasse, nachname, vorname] = parts;
                    
                    if (klasse && nachname && vorname) {
                        if (!neueKlassen[klasse]) {
                            neueKlassen[klasse] = {
                                name: klasse,
                                schueler: [],
                                erstellt: window.firebaseFunctions.formatGermanDate(),
                                timestamp: window.firebaseFunctions.getTimestamp()
                            };
                        }
                        
                        // Prüfen ob Schüler bereits existiert
                        const existiert = neueKlassen[klasse].schueler.some(s => 
                            s.nachname === nachname && s.vorname === vorname
                        );
                        
                        if (!existiert) {
                            neueKlassen[klasse].schueler.push({ nachname, vorname });
                            importCount++;
                        }
                    } else {
                        errorCount++;
                    }
                } else {
                    errorCount++;
                }
            });
            
            if (Object.keys(neueKlassen).length === 0) {
                alert('Keine gültigen Daten zum Importieren gefunden!');
                return;
            }
            
            // Bestehende Klassen laden und zusammenführen
            const bestehendKlassen = window.firebaseFunctions.getKlassenFromCache();
            
            Object.entries(neueKlassen).forEach(([klassenName, klassenData]) => {
                if (bestehendKlassen[klassenName]) {
                    // Klasse existiert bereits - Schüler hinzufügen
                    klassenData.schueler.forEach(neuerSchueler => {
                        const existiert = bestehendKlassen[klassenName].schueler.some(s => 
                            s.nachname === neuerSchueler.nachname && s.vorname === neuerSchueler.vorname
                        );
                        
                        if (!existiert) {
                            bestehendKlassen[klassenName].schueler.push(neuerSchueler);
                        }
                    });
                } else {
                    // Neue Klasse
                    bestehendKlassen[klassenName] = klassenData;
                }
            });
            
            // In Firebase speichern
            const klassenRef = window.firebaseFunctions.getDatabaseRef('system/klassen');
            await window.firebaseDB.set(klassenRef, bestehendKlassen);
            
            // Cache aktualisieren
            window.firebaseFunctions.dataCache.klassen = bestehendKlassen;
            
            // News erstellen
            if (window.newsFunctions) {
                await window.newsFunctions.createNewsForAction(
                    'Schülerdaten importiert', 
                    `${importCount} Schüler in ${Object.keys(neueKlassen).length} Klassen importiert.`
                );
            }
            
            console.log('✅ CSV-Import erfolgreich:', importCount, 'Schüler');
            alert(`Import erfolgreich!\n\n${importCount} Schüler importiert\n${errorCount} Fehler\nKlassen: ${Object.keys(neueKlassen).join(', ')}`);
            
            // UI neu laden
            loadKlassenVerwaltung();
            
            // CSV-Eingabe zurücksetzen
            fileInput.value = '';
            document.getElementById('csvPreview').classList.add('hidden');
            
        } catch (error) {
            console.error('❌ Fehler beim CSV-Import:', error);
            alert('Fehler beim Import: ' + error.message);
        }
    };
    
    reader.readAsText(file, 'UTF-8');
}

// Neue Klasse anlegen
async function neueKlasseAnlegen() {
    console.log('🏫 Lege neue Klasse an...');
    
    if (!window.firebaseFunctions.requireAdmin()) return;
    
    const nameInput = document.getElementById('neueKlasseName');
    const klassenName = nameInput?.value.trim();
    
    if (!klassenName) {
        alert('Bitte Klassennamen eingeben!');
        return;
    }
    
    // Prüfen ob Klasse bereits existiert
    const klassen = window.firebaseFunctions.getKlassenFromCache();
    if (klassen[klassenName]) {
        alert('Diese Klasse existiert bereits!');
        return;
    }
    
    try {
        const neueKlasse = {
            name: klassenName,
            schueler: [],
            erstellt: window.firebaseFunctions.formatGermanDate(),
            timestamp: window.firebaseFunctions.getTimestamp()
        };
        
        klassen[klassenName] = neueKlasse;
        
        // In Firebase speichern
        const klassenRef = window.firebaseFunctions.getDatabaseRef('system/klassen');
        await window.firebaseDB.set(klassenRef, klassen);
        
        // Cache aktualisieren
        window.firebaseFunctions.dataCache.klassen = klassen;
        
        // News erstellen
        if (window.newsFunctions) {
            await window.newsFunctions.createNewsForAction(
                'Neue Klasse angelegt', 
                `Die Klasse "${klassenName}" wurde angelegt.`
            );
        }
        
        console.log('✅ Neue Klasse angelegt:', klassenName);
        alert(`Klasse "${klassenName}" wurde erfolgreich angelegt!`);
        
        // Eingabefeld leeren
        nameInput.value = '';
        
        // UI neu laden
        loadKlassenVerwaltung();
        
    } catch (error) {
        console.error('❌ Fehler beim Anlegen der Klasse:', error);
        alert('Fehler beim Anlegen der Klasse: ' + error.message);
    }
}

// Klasse bearbeiten
function klasseBearbeiten(klassenName) {
    console.log('✏️ Bearbeite Klasse:', klassenName);
    
    const klassen = window.firebaseFunctions.getKlassenFromCache();
    const klasse = klassen[klassenName];
    
    if (!klasse) {
        alert('Klasse nicht gefunden!');
        return;
    }
    
    // Modal für Klassenbearbeitung öffnen
    showKlassenEditModal(klassenName, klasse);
}

// Klassen-Edit Modal anzeigen
function showKlassenEditModal(klassenName, klasse) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'klassenEditModal';
    
    let schuelerHtml = '';
    if (klasse.schueler && klasse.schueler.length > 0) {
        klasse.schueler.forEach((schueler, index) => {
            schuelerHtml += `
                <div class="schueler-edit-item">
                    <input type="text" value="${schueler.nachname}" placeholder="Nachname" data-index="${index}" data-field="nachname">
                    <input type="text" value="${schueler.vorname}" placeholder="Vorname" data-index="${index}" data-field="vorname">
                    <button class="btn btn-danger btn-sm" onclick="schuelerAusKlasseEntfernen(${index})">Entfernen</button>
                </div>
            `;
        });
    }
    
    modal.innerHTML = `
        <div class="modal-content">
            <h3>Klasse "${klassenName}" bearbeiten</h3>
            
            <div class="schueler-bearbeitung">
                <h4>Schüler in der Klasse:</h4>
                <div id="schuelerEditListe">
                    ${schuelerHtml}
                </div>
                
                <div class="neuer-schueler">
                    <h5>Neuen Schüler hinzufügen:</h5>
                    <div class="input-group">
                        <input type="text" id="neuerSchuelerNachname" placeholder="Nachname">
                        <input type="text" id="neuerSchuelerVorname" placeholder="Vorname">
                        <button class="btn btn-success" onclick="schuelerZuKlasseHinzufuegen()">Hinzufügen</button>
                    </div>
                </div>
            </div>
            
            <div class="modal-buttons">
                <button class="btn btn-success" onclick="klassenEditSpeichern('${klassenName}')">Speichern</button>
                <button class="btn btn-danger" onclick="klassenEditAbbrechen()">Abbrechen</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Schüler zu Klasse hinzufügen (im Modal)
function schuelerZuKlasseHinzufuegen() {
    const nachnameInput = document.getElementById('neuerSchuelerNachname');
    const vornameInput = document.getElementById('neuerSchuelerVorname');
    
    const nachname = nachnameInput?.value.trim();
    const vorname = vornameInput?.value.trim();
    
    if (!nachname || !vorname) {
        alert('Bitte Vor- und Nachname eingeben!');
        return;
    }
    
    const liste = document.getElementById('schuelerEditListe');
    const existingItems = liste.querySelectorAll('.schueler-edit-item');
    const newIndex = existingItems.length;
    
    const newItem = document.createElement('div');
    newItem.className = 'schueler-edit-item';
    newItem.innerHTML = `
        <input type="text" value="${nachname}" placeholder="Nachname" data-index="${newIndex}" data-field="nachname">
        <input type="text" value="${vorname}" placeholder="Vorname" data-index="${newIndex}" data-field="vorname">
        <button class="btn btn-danger btn-sm" onclick="schuelerAusKlasseEntfernen(${newIndex})">Entfernen</button>
    `;
    
    liste.appendChild(newItem);
    
    // Eingabefelder leeren
    nachnameInput.value = '';
    vornameInput.value = '';
    
    console.log('➕ Schüler hinzugefügt:', nachname, vorname);
}

// Schüler aus Klasse entfernen (im Modal)
function schuelerAusKlasseEntfernen(index) {
    const item = document.querySelector(`[data-index="${index}"]`)?.closest('.schueler-edit-item');
    if (item) {
        item.remove();
        console.log('➖ Schüler entfernt:', index);
    }
}

// Klassen-Edit speichern
async function klassenEditSpeichern(klassenName) {
    console.log('💾 Speichere Klassen-Änderungen...');
    
    if (!window.firebaseFunctions.requireAdmin()) return;
    
    try {
        const schuelerItems = document.querySelectorAll('.schueler-edit-item');
        const neueSchuelerListe = [];
        
        schuelerItems.forEach(item => {
            const nachnameInput = item.querySelector('[data-field="nachname"]');
            const vornameInput = item.querySelector('[data-field="vorname"]');
            
            const nachname = nachnameInput?.value.trim();
            const vorname = vornameInput?.value.trim();
            
            if (nachname && vorname) {
                neueSchuelerListe.push({ nachname, vorname });
            }
        });
        
        // Klassen aus Cache holen und aktualisieren
        const klassen = window.firebaseFunctions.getKlassenFromCache();
        if (klassen[klassenName]) {
            klassen[klassenName].schueler = neueSchuelerListe;
            klassen[klassenName].lastUpdate = window.firebaseFunctions.getTimestamp();
        }
        
        // In Firebase speichern
        const klassenRef = window.firebaseFunctions.getDatabaseRef('system/klassen');
        await window.firebaseDB.set(klassenRef, klassen);
        
        // Cache aktualisieren
        window.firebaseFunctions.dataCache.klassen = klassen;
        
        console.log('✅ Klasse aktualisiert:', klassenName, neueSchuelerListe.length, 'Schüler');
        alert(`Klasse "${klassenName}" wurde erfolgreich aktualisiert!`);
        
        klassenEditAbbrechen();
        loadKlassenVerwaltung();
        
    } catch (error) {
        console.error('❌ Fehler beim Speichern der Klasse:', error);
        alert('Fehler beim Speichern der Klasse: ' + error.message);
    }
}

// Klassen-Edit abbrechen
function klassenEditAbbrechen() {
    const modal = document.getElementById('klassenEditModal');
    if (modal) {
        modal.remove();
    }
}

// Klasse löschen
async function klasseLoeschen(klassenName) {
    if (!window.firebaseFunctions.requireAdmin()) return;
    
    const zugewieseneCount = getZugewieseneSchuelerCount(klassenName);
    
    let confirmText = `Klasse "${klassenName}" wirklich löschen?`;
    if (zugewieseneCount > 0) {
        confirmText += `\n\nAchtung: ${zugewieseneCount} Schüler aus dieser Klasse sind bereits Gruppen zugewiesen!`;
    }
    
    if (!confirm(confirmText)) return;
    
    try {
        const klassen = window.firebaseFunctions.getKlassenFromCache();
        delete klassen[klassenName];
        
        // In Firebase speichern
        const klassenRef = window.firebaseFunctions.getDatabaseRef('system/klassen');
        await window.firebaseDB.set(klassenRef, klassen);
        
        // Cache aktualisieren
        window.firebaseFunctions.dataCache.klassen = klassen;
        
        // News erstellen
        if (window.newsFunctions) {
            await window.newsFunctions.createNewsForAction(
                'Klasse gelöscht', 
                `Die Klasse "${klassenName}" wurde gelöscht.`
            );
        }
        
        console.log('🗑️ Klasse gelöscht:', klassenName);
        alert(`Klasse "${klassenName}" wurde gelöscht.`);
        
        loadKlassenVerwaltung();
        
    } catch (error) {
        console.error('❌ Fehler beim Löschen der Klasse:', error);
        alert('Fehler beim Löschen der Klasse: ' + error.message);
    }
}

// Hilfsfunktionen für Klassen-Verwaltung
function getZugewieseneSchuelerCount(klassenName) {
    let count = 0;
    const gruppen = window.firebaseFunctions.getGruppenFromCache();
    
    gruppen.forEach(gruppe => {
        if (gruppe.schueler) {
            gruppe.schueler.forEach(schueler => {
                if (schueler.klasse === klassenName) {
                    count++;
                }
            });
        }
    });
    
    return count;
}

function istSchuelerZugewiesen(klassenName, nachname, vorname) {
    const gruppen = window.firebaseFunctions.getGruppenFromCache();
    
    return gruppen.some(gruppe => {
        if (!gruppe.schueler) return false;
        return gruppe.schueler.some(schueler => 
            schueler.klasse === klassenName && 
            schueler.nachname === nachname && 
            schueler.vorname === vorname
        );
    });
}

// === FÄCHER-VERWALTUNG ===

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

// === CHECKPOINTS-VERWALTUNG (Neu strukturiert) ===

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

// === BRIEFVORLAGE ===

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

// === WEITERE ADMIN-FUNKTIONEN ===

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
    schuljahrSpeichern
};

console.log('✅ Firebase Admin-System bereit');
