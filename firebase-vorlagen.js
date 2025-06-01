// Firebase Vorlagen-System - Realtime Database
console.log('📋 Firebase Vorlagen-System geladen');

// Globale Variablen für Vorlagen-Editor
let aktuelleVorlage = null;
let aktuelleKategorien = [];

// Vorlagen laden und anzeigen
function loadVorlagen() {
    console.log('📋 Lade Vorlagen von Firebase...');
    
    if (!window.firebaseFunctions.requireAuth()) return;
    
    const liste = document.getElementById('vorlagenListe');
    if (!liste) return;
    
    loadMeineVorlagen();
}

// Eigene Vorlagen des Lehrers laden
async function loadMeineVorlagen() {
    try {
        const userEmail = window.authFunctions.getUserEmail();
        const sanitizedEmail = window.firebaseFunctions.sanitizeEmail(userEmail);
        
        const vorlagenRef = window.firebaseFunctions.getDatabaseRef(`vorlagen/${sanitizedEmail}`);
        const snapshot = await window.firebaseDB.get(vorlagenRef);
        
        const liste = document.getElementById('vorlagenListe');
        if (!liste) return;
        
        let html = '';
        
        if (snapshot.exists()) {
            const vorlagen = snapshot.val();
            
            Object.entries(vorlagen).forEach(([key, vorlage]) => {
                // Gewichtungs-Summe berechnen
                const summe = vorlage.kategorien.reduce((acc, kat) => acc + kat.gewichtung, 0);
                const farbe = summe === 100 ? '#27ae60' : '#e74c3c';
                
                html += `
                    <div class="liste-item">
                        <div>
                            <strong>${vorlage.name}</strong><br>
                            <small>Kategorien: ${vorlage.kategorien.length} | 
                            Gewichtung: <span style="color: ${farbe}">${summe}%</span></small><br>
                            <div style="margin-top: 0.5rem;">
                                ${vorlage.kategorien.map(k => `${k.name} (${k.gewichtung}%)`).join(', ')}
                            </div>
                        </div>
                        <div>
                            <button class="btn" onclick="vorlageBearbeiten('${key}')">Bearbeiten</button>
                            <button class="btn btn-danger" onclick="vorlageLoeschen('${key}')">Löschen</button>
                        </div>
                    </div>
                `;
            });
        }
        
        if (!html) {
            html = '<div class="card"><p>Keine Vorlagen vorhanden. Erstellen Sie eine neue Vorlage!</p></div>';
        }
        
        liste.innerHTML = html;
        
        console.log('📋 Vorlagen geladen');
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der Vorlagen:', error);
        const liste = document.getElementById('vorlagenListe');
        if (liste) {
            liste.innerHTML = '<div class="card"><p style="color: #e74c3c;">Fehler beim Laden der Vorlagen!</p></div>';
        }
    }
}

// Neue Vorlage erstellen
function neueVorlageErstellen() {
    console.log('📋 Erstelle neue Vorlage...');
    
    if (!window.firebaseFunctions.requireAuth()) return;
    
    const nameInput = document.getElementById('vorlagenName');
    const name = nameInput?.value.trim();
    
    if (!name) {
        alert('Bitte geben Sie einen Namen für die Vorlage ein!');
        return;
    }
    
    // Neue Vorlage initialisieren
    aktuelleVorlage = {
        name: name,
        kategorien: [
            { name: 'Reflexion', gewichtung: 30 } // Reflexion ist immer dabei
        ]
    };
    
    aktuelleKategorien = [...aktuelleVorlage.kategorien];
    
    // Editor anzeigen
    showVorlagenEditor();
    
    // Eingabefeld leeren
    nameInput.value = '';
}

// Vorlage bearbeiten
async function vorlageBearbeiten(vorlagenKey) {
    console.log('📋 Bearbeite Vorlage:', vorlagenKey);
    
    if (!window.firebaseFunctions.requireAuth()) return;
    
    try {
        const userEmail = window.authFunctions.getUserEmail();
        const sanitizedEmail = window.firebaseFunctions.sanitizeEmail(userEmail);
        
        const vorlageRef = window.firebaseFunctions.getDatabaseRef(`vorlagen/${sanitizedEmail}/${vorlagenKey}`);
        const snapshot = await window.firebaseDB.get(vorlageRef);
        
        if (!snapshot.exists()) {
            alert('Vorlage nicht gefunden!');
            return;
        }
        
        aktuelleVorlage = { 
            ...snapshot.val(), 
            key: vorlagenKey 
        };
        aktuelleKategorien = [...aktuelleVorlage.kategorien];
        
        showVorlagenEditor();
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der Vorlage:', error);
        alert('Fehler beim Laden der Vorlage: ' + error.message);
    }
}

// Vorlagen-Editor anzeigen
function showVorlagenEditor() {
    const editor = document.getElementById('vorlagenEditor');
    const liste = document.getElementById('vorlagenListe');
    const titel = document.getElementById('vorlagenTitel');
    
    if (editor) editor.classList.remove('hidden');
    if (liste) liste.classList.add('hidden');
    if (titel) titel.textContent = `Vorlage: ${aktuelleVorlage.name}`;
    
    updateKategorienListe();
    updateGewichtungStatus();
}

// Kategorien-Liste aktualisieren
function updateKategorienListe() {
    const container = document.getElementById('kategorienListe');
    if (!container) return;
    
    let html = '';
    
    aktuelleKategorien.forEach((kategorie, index) => {
        const istReflexion = kategorie.name === 'Reflexion';
        const disabled = istReflexion ? 'disabled' : '';
        const readonly = istReflexion ? 'readonly' : '';
        
        html += `
            <div class="liste-item">
                <div>
                    <strong>${kategorie.name}</strong> 
                    ${istReflexion ? '<em>(fest)</em>' : ''}
                    <br>
                    <small>Gewichtung: ${kategorie.gewichtung}%</small>
                </div>
                <div>
                    <input type="text" value="${kategorie.name}" 
                           onchange="kategorieNameChanged(${index}, this.value)"
                           ${readonly} style="width: 120px; margin-right: 10px;">
                    <input type="number" value="${kategorie.gewichtung}" 
                           onchange="kategorieGewichtungChanged(${index}, this.value)"
                           min="1" max="70" ${disabled} style="width: 80px; margin-right: 10px;">
                    ${!istReflexion ? `<button class="btn btn-danger btn-sm" onclick="kategorieEntfernen(${index})">Entfernen</button>` : ''}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Kategorie-Name geändert
function kategorieNameChanged(index, neuerName) {
    if (aktuelleKategorien[index] && aktuelleKategorien[index].name !== 'Reflexion') {
        aktuelleKategorien[index].name = neuerName.trim();
        updateKategorienListe();
    }
}

// Kategorie-Gewichtung geändert
function kategorieGewichtungChanged(index, neueGewichtung) {
    const gewichtung = parseInt(neueGewichtung);
    
    if (gewichtung >= 1 && gewichtung <= 70) {
        aktuelleKategorien[index].gewichtung = gewichtung;
        updateGewichtungStatus();
    }
}

// Kategorie hinzufügen
function kategorieHinzufuegen() {
    const nameInput = document.getElementById('kategorieName');
    const gewichtungInput = document.getElementById('kategorieGewichtung');
    
    const name = nameInput?.value.trim();
    const gewichtung = parseInt(gewichtungInput?.value);
    
    if (!name) {
        alert('Bitte geben Sie einen Kategorie-Namen ein!');
        return;
    }
    
    if (!gewichtung || gewichtung < 1 || gewichtung > 70) {
        alert('Bitte geben Sie eine Gewichtung zwischen 1 und 70 ein!');
        return;
    }
    
    // Prüfen ob Name bereits existiert
    if (aktuelleKategorien.some(k => k.name.toLowerCase() === name.toLowerCase())) {
        alert('Eine Kategorie mit diesem Namen existiert bereits!');
        return;
    }
    
    // Prüfen ob Gewichtung nicht überschreitet
    const aktuelleGewichtung = aktuelleKategorien.reduce((acc, k) => acc + k.gewichtung, 0);
    if (aktuelleGewichtung + gewichtung > 100) {
        alert(`Die Gesamtgewichtung würde ${aktuelleGewichtung + gewichtung}% betragen. Maximum sind 100%!`);
        return;
    }
    
    // Kategorie hinzufügen
    aktuelleKategorien.push({ name, gewichtung });
    
    // Eingabefelder leeren
    nameInput.value = '';
    gewichtungInput.value = '';
    
    updateKategorienListe();
    updateGewichtungStatus();
    
    console.log('➕ Kategorie hinzugefügt:', name, gewichtung + '%');
}

// Kategorie entfernen
function kategorieEntfernen(index) {
    if (aktuelleKategorien[index]?.name === 'Reflexion') {
        alert('Die Reflexion-Kategorie kann nicht entfernt werden!');
        return;
    }
    
    const kategorie = aktuelleKategorien[index];
    if (confirm(`Kategorie "${kategorie.name}" wirklich entfernen?`)) {
        aktuelleKategorien.splice(index, 1);
        updateKategorienListe();
        updateGewichtungStatus();
        
        console.log('➖ Kategorie entfernt:', kategorie.name);
    }
}

// Gewichtung-Status aktualisieren
function updateGewichtungStatus() {
    const container = document.getElementById('gewichtungStatus');
    const anzeige = document.getElementById('aktuelleGewichtung');
    
    if (!container || !anzeige) return;
    
    const summe = aktuelleKategorien.reduce((acc, k) => acc + k.gewichtung, 0);
    anzeige.textContent = summe + '%';
    
    // Farbe basierend auf Summe
    if (summe === 100) {
        container.className = 'gewichtung-anzeige';
        container.style.color = '#27ae60';
    } else {
        container.className = 'gewichtung-anzeige gewichtung-warnung';
        container.style.color = '#e74c3c';
    }
}

// Vorlage speichern
async function vorlageSpeichern() {
    console.log('💾 Speichere Vorlage...');
    
    if (!window.firebaseFunctions.requireAuth() || !aktuelleVorlage) return;
    
    // Validierung
    const summe = aktuelleKategorien.reduce((acc, k) => acc + k.gewichtung, 0);
    if (summe !== 100) {
        alert(`Die Gesamtgewichtung beträgt ${summe}%. Sie muss genau 100% betragen!`);
        return;
    }
    
    if (aktuelleKategorien.length < 2) {
        alert('Eine Vorlage muss mindestens 2 Kategorien haben!');
        return;
    }
    
    try {
        const userEmail = window.authFunctions.getUserEmail();
        const sanitizedEmail = window.firebaseFunctions.sanitizeEmail(userEmail);
        
        const vorlageData = {
            name: aktuelleVorlage.name,
            kategorien: [...aktuelleKategorien],
            erstellt: aktuelleVorlage.erstellt || window.firebaseFunctions.formatGermanDate(),
            lastUpdate: window.firebaseFunctions.getTimestamp(),
            ersteller: window.firebaseFunctions.getCurrentUserName()
        };
        
        let vorlageRef;
        
        if (aktuelleVorlage.key) {
            // Bestehende Vorlage aktualisieren
            vorlageRef = window.firebaseFunctions.getDatabaseRef(`vorlagen/${sanitizedEmail}/${aktuelleVorlage.key}`);
        } else {
            // Neue Vorlage erstellen
            const vorlagenRef = window.firebaseFunctions.getDatabaseRef(`vorlagen/${sanitizedEmail}`);
            vorlageRef = window.firebaseDB.push(vorlagenRef);
            vorlageData.erstellt = window.firebaseFunctions.formatGermanDate();
        }
        
        await window.firebaseDB.set(vorlageRef, vorlageData);
        
        // News erstellen
        if (window.newsFunctions) {
            const aktion = aktuelleVorlage.key ? 'aktualisiert' : 'erstellt';
            await window.newsFunctions.createNewsForAction(
                `Vorlage ${aktion}`, 
                `Die Bewertungsvorlage "${aktuelleVorlage.name}" wurde ${aktion}.`
            );
        }
        
        console.log('✅ Vorlage gespeichert:', aktuelleVorlage.name);
        
        alert(`Vorlage "${aktuelleVorlage.name}" wurde erfolgreich gespeichert!`);
        vorlagenEditorSchließen();
        
    } catch (error) {
        console.error('❌ Fehler beim Speichern der Vorlage:', error);
        alert('Fehler beim Speichern der Vorlage: ' + error.message);
    }
}

// Vorlagen-Editor schließen
function vorlagenEditorSchließen() {
    const editor = document.getElementById('vorlagenEditor');
    const liste = document.getElementById('vorlagenListe');
    
    if (editor) editor.classList.add('hidden');
    if (liste) liste.classList.remove('hidden');
    
    aktuelleVorlage = null;
    aktuelleKategorien = [];
    
    // Vorlagen neu laden
    loadMeineVorlagen();
}

// Vorlage löschen
async function vorlageLoeschen(vorlagenKey) {
    if (!window.firebaseFunctions.requireAuth()) return;
    
    try {
        const userEmail = window.authFunctions.getUserEmail();
        const sanitizedEmail = window.firebaseFunctions.sanitizeEmail(userEmail);
        
        const vorlageRef = window.firebaseFunctions.getDatabaseRef(`vorlagen/${sanitizedEmail}/${vorlagenKey}`);
        const snapshot = await window.firebaseDB.get(vorlageRef);
        
        if (!snapshot.exists()) {
            alert('Vorlage nicht gefunden!');
            return;
        }
        
        const vorlage = snapshot.val();
        
        if (confirm(`Vorlage "${vorlage.name}" wirklich löschen?\n\nHinweis: Bestehende Bewertungen mit dieser Vorlage bleiben erhalten.`)) {
            await window.firebaseDB.remove(vorlageRef);
            
            // News erstellen
            if (window.newsFunctions) {
                await window.newsFunctions.createNewsForAction(
                    'Vorlage gelöscht', 
                    `Die Bewertungsvorlage "${vorlage.name}" wurde gelöscht.`
                );
            }
            
            console.log('🗑️ Vorlage gelöscht:', vorlage.name);
            
            alert(`Vorlage "${vorlage.name}" wurde gelöscht.`);
            loadMeineVorlagen();
        }
        
    } catch (error) {
        console.error('❌ Fehler beim Löschen der Vorlage:', error);
        alert('Fehler beim Löschen der Vorlage: ' + error.message);
    }
}

// Vorlagen für Dropdown laden (für Bewertungs-System)
async function getVorlagenForDropdown() {
    if (!window.firebaseFunctions.requireAuth()) return [];
    
    try {
        const userEmail = window.authFunctions.getUserEmail();
        const sanitizedEmail = window.firebaseFunctions.sanitizeEmail(userEmail);
        
        const vorlagenRef = window.firebaseFunctions.getDatabaseRef(`vorlagen/${sanitizedEmail}`);
        const snapshot = await window.firebaseDB.get(vorlagenRef);
        
        if (snapshot.exists()) {
            const vorlagen = snapshot.val();
            return Object.values(vorlagen).map(vorlage => ({
                value: vorlage.name,
                text: vorlage.name,
                kategorien: vorlage.kategorien
            }));
        }
        
        return [];
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der Vorlagen für Dropdown:', error);
        return [];
    }
}

// Standard-Vorlagen erstellen (für neue Lehrer)
async function createDefaultVorlagen() {
    if (!window.firebaseFunctions.requireAuth()) return;
    
    try {
        const userEmail = window.authFunctions.getUserEmail();
        const sanitizedEmail = window.firebaseFunctions.sanitizeEmail(userEmail);
        
        // Prüfen ob schon Vorlagen existieren
        const vorlagenRef = window.firebaseFunctions.getDatabaseRef(`vorlagen/${sanitizedEmail}`);
        const snapshot = await window.firebaseDB.get(vorlagenRef);
        
        if (snapshot.exists()) {
            console.log('Benutzer hat bereits Vorlagen');
            return;
        }
        
        // Standard-Vorlagen erstellen
        const standardVorlagen = [
            {
                name: 'Standard Projekt',
                kategorien: [
                    { name: 'Reflexion', gewichtung: 30 },
                    { name: 'Inhalt', gewichtung: 40 },
                    { name: 'Präsentation', gewichtung: 30 }
                ]
            },
            {
                name: 'Teamarbeit',
                kategorien: [
                    { name: 'Reflexion', gewichtung: 30 },
                    { name: 'Zusammenarbeit', gewichtung: 35 },
                    { name: 'Ergebnis', gewichtung: 35 }
                ]
            }
        ];
        
        for (const vorlageData of standardVorlagen) {
            const newVorlageRef = window.firebaseDB.push(vorlagenRef);
            await window.firebaseDB.set(newVorlageRef, {
                ...vorlageData,
                erstellt: window.firebaseFunctions.formatGermanDate(),
                timestamp: window.firebaseFunctions.getTimestamp(),
                ersteller: window.firebaseFunctions.getCurrentUserName()
            });
        }
        
        console.log('✅ Standard-Vorlagen erstellt');
        
    } catch (error) {
        console.error('❌ Fehler beim Erstellen der Standard-Vorlagen:', error);
    }
}

// Export für andere Module
window.vorlagenFunctions = {
    getVorlagenForDropdown,
    createDefaultVorlagen
};

console.log('✅ Firebase Vorlagen-System bereit');
