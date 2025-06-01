// Firebase Admin-System - Realtime Database
console.log('⚙️ Firebase Admin-System geladen');

// Admin-Vorlagen Tab laden
function loadAdminVorlagen() {
    console.log('⚙️ Lade Admin-Vorlagen...');
    
    if (!window.firebaseFunctions.requireAdmin()) return;
    
    // Alle Admin-Bereiche laden
    loadFaecherVerwaltung();
    loadCheckpointsVerwaltung();
    loadStaerkenFormulierungen();
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

// === BEWERTUNGS-CHECKPOINTS VERWALTUNG ===

async function loadCheckpointsVerwaltung() {
    console.log('📋 Lade Checkpoints-Verwaltung...');
    
    const container = document.getElementById('checkpointsVerwaltung');
    if (!container) return;
    
    try {
        // Checkpoints aus Cache holen
        const checkpoints = window.firebaseFunctions.dataCache.bewertungsCheckpoints;
        
        let html = `
            <h3>Bewertungs-Checkpoints verwalten</h3>
            <p>Diese Checkpoints stehen bei der Stärken-Bewertung zur Verfügung.</p>
        `;
        
        Object.entries(checkpoints).forEach(([kategorie, items]) => {
            html += `
                <div class="checkpoint-kategorie">
                    <h4>${getKategorieIcon(kategorie)} ${kategorie}</h4>
                    <div class="checkpoints-liste" id="checkpoints-${kategorie.replace(/\s/g, '-')}">
            `;
            
            items.forEach((text, index) => {
                html += `
                    <div class="checkpoint-item">
                        <input type="text" value="${text}" 
                               onchange="checkpointChanged('${kategorie}', ${index}, this.value)">
                        <button class="btn btn-danger btn-sm" 
                                onclick="checkpointLoeschen('${kategorie}', ${index})">Löschen</button>
                    </div>
                `;
            });
            
            html += `
                    <div class="checkpoint-item">
                        <input type="text" placeholder="Neuer Checkpoint..." 
                               id="new-checkpoint-${kategorie.replace(/\s/g, '-')}">
                        <button class="btn btn-success btn-sm" 
                                onclick="checkpointHinzufuegen('${kategorie}')">Hinzufügen</button>
                    </div>
                </div>
                </div>
            `;
        });
        
        html += `<button class="btn btn-success" onclick="checkpointsSpeichern()">Alle Änderungen speichern</button>`;
        
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

// Checkpoint geändert
function checkpointChanged(kategorie, index, neuerText) {
    console.log('📝 Checkpoint geändert:', kategorie, index, '->', neuerText);
}

// Checkpoint hinzufügen
function checkpointHinzufuegen(kategorie) {
    const inputId = `new-checkpoint-${kategorie.replace(/\s/g, '-')}`;
    const input = document.getElementById(inputId);
    const text = input?.value.trim();
    
    if (!text) {
        alert('Bitte Text eingeben!');
        return;
    }
    
    // Neuen Checkpoint zur Liste hinzufügen
    const listeId = `checkpoints-${kategorie.replace(/\s/g, '-')}`;
    const liste = document.getElementById(listeId);
    if (!liste) return;
    
    // Neues Item vor dem Eingabe-Item einfügen
    const neuesItem = document.createElement('div');
    neuesItem.className = 'checkpoint-item';
    
    // Index für neuen Checkpoint ermitteln
    const existingItems = liste.querySelectorAll('.checkpoint-item');
    const newIndex = existingItems.length - 1; // -1 wegen dem Eingabe-Item
    
    neuesItem.innerHTML = `
        <input type="text" value="${text}" 
               onchange="checkpointChanged('${kategorie}', ${newIndex}, this.value)">
        <button class="btn btn-danger btn-sm" 
                onclick="checkpointLoeschen('${kategorie}', ${newIndex})">Löschen</button>
    `;
    
    // Vor dem letzten Element (Eingabe-Item) einfügen
    const eingabeItem = liste.lastElementChild;
    liste.insertBefore(neuesItem, eingabeItem);
    
    // Eingabefeld leeren
    input.value = '';
    
    console.log('➕ Checkpoint hinzugefügt:', kategorie, text);
}

// Checkpoint löschen
function checkpointLoeschen(kategorie, index) {
    if (confirm('Checkpoint wirklich löschen?')) {
        const checkpointItem = event.target.closest('.checkpoint-item');
        if (checkpointItem) {
            checkpointItem.remove();
        }
        console.log('🗑️ Checkpoint gelöscht:', kategorie, index);
    }
}

// Checkpoints speichern
async function checkpointsSpeichern() {
    console.log('💾 Speichere Checkpoints...');
    
    if (!window.firebaseFunctions.requireAdmin()) return;
    
    try {
        const neueCheckpoints = {};
        
        // Alle Kategorien durchgehen
        const kategorien = Object.keys(window.firebaseFunctions.dataCache.bewertungsCheckpoints);
        
        kategorien.forEach(kategorie => {
            const listeId = `checkpoints-${kategorie.replace(/\s/g, '-')}`;
            const liste = document.getElementById(listeId);
            
            if (liste) {
                const items = [];
                const checkpointItems = liste.querySelectorAll('.checkpoint-item');
                
                checkpointItems.forEach(item => {
                    const input = item.querySelector('input[onchange]'); // Nur die mit onchange, nicht das Eingabe-Feld
                    if (input) {
                        const text = input.value.trim();
                        if (text) {
                            items.push(text);
                        }
                    }
                });
                
                if (items.length > 0) {
                    neueCheckpoints[kategorie] = items;
                }
            }
        });
        
        if (Object.keys(neueCheckpoints).length === 0) {
            alert('Mindestens eine Kategorie mit Checkpoints muss vorhanden sein!');
            return;
        }
        
        // Checkpoints in Firebase speichern
        const checkpointsRef = window.firebaseFunctions.getDatabaseRef('system/bewertungsCheckpoints');
        await window.firebaseDB.set(checkpointsRef, neueCheckpoints);
        
        // Cache aktualisieren
        window.firebaseFunctions.dataCache.bewertungsCheckpoints = neueCheckpoints;
        
        // Stärken-Formulierungen auch aktualisieren
        await updateStaerkenFormulierungenFromCheckpoints(neueCheckpoints);
        
        // News erstellen
        if (window.newsFunctions) {
            await window.newsFunctions.createNewsForAction(
                'Bewertungs-Checkpoints aktualisiert', 
                'Die Bewertungs-Checkpoints wurden vom Administrator aktualisiert.'
            );
        }
        
        console.log('✅ Checkpoints gespeichert');
        alert('Bewertungs-Checkpoints wurden erfolgreich gespeichert!');
        
    } catch (error) {
        console.error('❌ Fehler beim Speichern der Checkpoints:', error);
        alert('Fehler beim Speichern der Checkpoints: ' + error.message);
    }
}

// === STÄRKEN-FORMULIERUNGEN ===

async function loadStaerkenFormulierungen() {
    console.log('💪 Lade Stärken-Formulierungen...');
    
    const container = document.getElementById('staerkenFormulierungen');
    if (!container) return;
    
    try {
        const formulierungen = window.firebaseFunctions.dataCache.staerkenFormulierungen;
        const checkpoints = window.firebaseFunctions.dataCache.bewertungsCheckpoints;
        
        let html = '';
        
        Object.entries(checkpoints).forEach(([kategorie, items]) => {
            html += `
                <div class="staerken-formulierung">
                    <h4>${getKategorieIcon(kategorie)} ${kategorie}</h4>
            `;
            
            items.forEach((defaultText, index) => {
                const key = `${kategorie}_${index}`;
                const aktuelleFormulierung = formulierungen[key] || defaultText;
                
                html += `
                    <div class="formulierung-item">
                        <label>Checkpoint ${index + 1}:</label>
                        <input type="text" value="${aktuelleFormulierung}" 
                               data-key="${key}" 
                               onchange="formulierungChanged('${key}', this.value)">
                        <small style="color: #666;">Standard: ${defaultText}</small>
                    </div>
                `;
            });
            
            html += '</div>';
        });
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der Stärken-Formulierungen:', error);
        container.innerHTML = '<p style="color: #e74c3c;">Fehler beim Laden der Stärken-Formulierungen!</p>';
    }
}

// Formulierung geändert
function formulierungChanged(key, neueFormulierung) {
    console.log('📝 Formulierung geändert:', key, '->', neueFormulierung);
}

// Stärken-Formulierungen speichern
async function staerkenFormulierungenSpeichern() {
    console.log('💾 Speichere Stärken-Formulierungen...');
    
    if (!window.firebaseFunctions.requireAdmin()) return;
    
    try {
        const neueFormulierungen = {};
        
        // Alle Formulierungs-Inputs sammeln
        const inputs = document.querySelectorAll('input[data-key]');
        inputs.forEach(input => {
            const key = input.getAttribute('data-key');
            const value = input.value.trim();
            if (key && value) {
                neueFormulierungen[key] = value;
            }
        });
        
        // Formulierungen in Firebase speichern
        const formulierungenRef = window.firebaseFunctions.getDatabaseRef('system/staerkenFormulierungen');
        await window.firebaseDB.set(formulierungenRef, neueFormulierungen);
        
        // Cache aktualisieren
        window.firebaseFunctions.dataCache.staerkenFormulierungen = neueFormulierungen;
        
        // News erstellen
        if (window.newsFunctions) {
            await window.newsFunctions.createNewsForAction(
                'Stärken-Formulierungen aktualisiert', 
                'Die Stärken-Formulierungen wurden vom Administrator aktualisiert.'
            );
        }
        
        console.log('✅ Stärken-Formulierungen gespeichert');
        alert('Stärken-Formulierungen wurden erfolgreich gespeichert!');
        
    } catch (error) {
        console.error('❌ Fehler beim Speichern der Stärken-Formulierungen:', error);
        alert('Fehler beim Speichern der Stärken-Formulierungen: ' + error.message);
    }
}

// Stärken-Formulierungen von Checkpoints aktualisieren
async function updateStaerkenFormulierungenFromCheckpoints(neueCheckpoints) {
    try {
        const aktuelleFormulierungen = window.firebaseFunctions.dataCache.staerkenFormulierungen;
        const neueFormulierungen = {};
        
        // Alle neuen Checkpoints durchgehen
        Object.entries(neueCheckpoints).forEach(([kategorie, items]) => {
            items.forEach((text, index) => {
                const key = `${kategorie}_${index}`;
                // Behalte bestehende Formulierung oder nutze Checkpoint-Text
                neueFormulierungen[key] = aktuelleFormulierungen[key] || text;
            });
        });
        
        // Formulierungen in Firebase speichern
        const formulierungenRef = window.firebaseFunctions.getDatabaseRef('system/staerkenFormulierungen');
        await window.firebaseDB.set(formulierungenRef, neueFormulierungen);
        
        // Cache aktualisieren
        window.firebaseFunctions.dataCache.staerkenFormulierungen = neueFormulierungen;
        
        console.log('✅ Stärken-Formulierungen automatisch aktualisiert');
        
    } catch (error) {
        console.error('❌ Fehler beim Auto-Update der Stärken-Formulierungen:', error);
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
