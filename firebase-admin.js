// Firebase Admin-System - Realtime Database
console.log('⚙️ Firebase Admin-System geladen');

// Admin-Vorlagen Tab laden
function loadAdminVorlagen() {
    console.log('⚙️ Lade Admin-Vorlagen...');
    
    if (!window.firebaseFunctions.requireAdmin()) return;
    
    // Alle Admin-Bereiche laden
    loadFaecherVerwaltung();
    loadCheckpointsVerwaltung();
    loadBriefvorlage();
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

// Lehrer-Liste laden (ERWEITERT mit Gruppen-Berechtigung)
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
                    // Standard: kann Gruppen anlegen (true)
                    const kannGruppenAnlegen = user.kannGruppenAnlegen !== false;
                    const checkboxChecked = kannGruppenAnlegen ? 'checked' : '';
                    
                    html += `
                        <div class="liste-item">
                            <div>
                                <strong>${user.name}</strong><br>
                                <small>E-Mail: ${user.email}</small><br>
                                <label style="margin-top: 10px; cursor: pointer;">
                                    <input type="checkbox" 
                                           ${checkboxChecked}
                                           onchange="toggleGruppenBerechtigung('${key}', this.checked)"
                                           style="margin-right: 5px;">
                                    Kann Gruppen anlegen
                                </label>
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

// Gruppen-Berechtigung für Lehrer umschalten
async function toggleGruppenBerechtigung(userKey, kannGruppenAnlegen) {
    console.log('🔄 Ändere Gruppen-Berechtigung:', userKey, kannGruppenAnlegen);
    
    if (!window.firebaseFunctions.requireAdmin()) return;
    
    try {
        const userRef = window.firebaseFunctions.getDatabaseRef(`users/${userKey}/kannGruppenAnlegen`);
        await window.firebaseDB.set(userRef, kannGruppenAnlegen);
        
        // Cache aktualisieren wenn verfügbar
        if (window.firebaseFunctions.dataCache.users && window.firebaseFunctions.dataCache.users[userKey]) {
            window.firebaseFunctions.dataCache.users[userKey].kannGruppenAnlegen = kannGruppenAnlegen;
        }
        
        // News erstellen
        const usersRef = window.firebaseFunctions.getDatabaseRef(`users/${userKey}`);
        const userSnapshot = await window.firebaseDB.get(usersRef);
        const userName = userSnapshot.exists() ? userSnapshot.val().name : 'Unbekannt';
        
        if (window.newsFunctions) {
            const aktion = kannGruppenAnlegen ? 'kann jetzt Gruppen anlegen' : 'kann keine Gruppen mehr anlegen';
            await window.newsFunctions.createNewsForAction(
                'Berechtigung geändert', 
                `${userName} ${aktion}.`,
                true
            );
        }
        
        console.log('✅ Gruppen-Berechtigung geändert für:', userName);
        
    } catch (error) {
        console.error('❌ Fehler beim Ändern der Berechtigung:', error);
        alert('Fehler beim Ändern der Berechtigung: ' + error.message);
        // Checkbox zurücksetzen
        loadLehrerListe();
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
    toggleGruppenBerechtigung
};

console.log('✅ Firebase Admin-System bereit');
