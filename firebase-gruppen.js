// Firebase Gruppen-System - Realtime Database - KORRIGIERT
console.log('👥 Firebase Gruppen-System geladen - Korrigierte Version');

// Globale Variablen für Gruppenbearbeitung
let aktuelleGruppeEdit = null;

// Gruppen laden und anzeigen - KORRIGIERT
function loadGruppen() {
    console.log('👥 Lade Gruppen von Firebase...');
    
    if (!window.firebaseFunctions.requireAuth()) return;
    
    const liste = document.getElementById('gruppenListe');
    if (!liste) return;
    
    // Gruppen aus Cache holen
    const alleGruppen = window.firebaseFunctions.getGruppenFromCache();
    console.log('🔍 Alle Gruppen aus Cache:', alleGruppen.length);
    
    // Gruppen für aktuellen Benutzer filtern
    const meineGruppen = filterGruppenForUser(alleGruppen);
    console.log('🔍 Gefilterte Gruppen für', window.firebaseFunctions.getCurrentUserName() + ':', meineGruppen.length);
    
    // Bewertungen für Statusanzeige laden
    const alleBewertungen = getAllBewertungsdata();
    
    // Debug: Gruppen-Struktur anzeigen
    console.log('🔍 Debug Gruppen-Struktur:');
    meineGruppen.forEach((gruppe, index) => {
        console.log(`Gruppe ${index}: ${gruppe.thema}`);
        if (gruppe.schueler && Array.isArray(gruppe.schueler)) {
            gruppe.schueler.forEach((schueler, sIndex) => {
                console.log(`  Schüler ${sIndex}:`, schueler);
                
                // KORRIGIERT: Prüfe auf unvollständige Schüler-Daten
                if (!schueler.name || !schueler.lehrer) {
                    console.warn('⚠️ Unvollständige Schüler-Daten:', schueler);
                }
            });
        }
    });
    
    let html = '';
    meineGruppen.forEach((gruppe) => {
        // Berechtigung prüfen - Admin oder beteiligte Lehrer können bearbeiten
        const currentUserName = window.firebaseFunctions.getCurrentUserName();
        const istBeteiligt = checkUserParticipation(gruppe, currentUserName);
        const kannBearbeiten = window.firebaseFunctions.isAdmin() || istBeteiligt;
        
        html += `<div class="liste-item">
            <div>
                <strong>${gruppe.thema}</strong><br>
                <small>Erstellt: ${gruppe.erstellt} von ${gruppe.ersteller || 'System'}</small><br>
                <div style="margin-top: 0.5rem;">`;
        
        if (gruppe.schueler && Array.isArray(gruppe.schueler)) {
            gruppe.schueler.forEach(schueler => {
                // KORRIGIERT: Robuste Schüler-Datenbehandlung
                const schuelerInfo = normalizeSchuelerData(schueler);
                
                if (schuelerInfo.name && schuelerInfo.lehrer) {
                    const fachInfo = schuelerInfo.fach ? 
                        ` (${window.firebaseFunctions.getFachNameFromGlobal(schuelerInfo.fach)})` : '';
                    
                    // Bewertungsstatus prüfen
                    const schuelerId = generateSchuelerId(gruppe.id, schuelerInfo.name);
                    const istBewertet = alleBewertungen.some(b => b.schuelerId === schuelerId);
                    const statusColor = istBewertet ? '#27ae60' : '#e74c3c';
                    const statusIcon = istBewertet ? '✅' : '⏳';
                    
                    html += `<div style="margin: 2px 0; padding: 3px 6px; background: ${statusColor}; color: white; border-radius: 3px; display: inline-block; margin-right: 5px; font-size: 0.85rem;">
                        ${statusIcon} ${schuelerInfo.name} → ${schuelerInfo.lehrer}${fachInfo}
                    </div><br>`;
                } else {
                    // Fallback für unvollständige Daten
                    html += `<div style="margin: 2px 0; padding: 3px 6px; background: #95a5a6; color: white; border-radius: 3px; display: inline-block; margin-right: 5px; font-size: 0.85rem;">
                        ⚠️ Unvollständige Daten: ${JSON.stringify(schueler).substring(0, 50)}...
                    </div><br>`;
                }
            });
        }
        
        html += `</div>
            </div>
            <div>
                ${kannBearbeiten ? `<button class="btn" onclick="gruppeBearbeiten('${gruppe.id}')">Bearbeiten</button>` : ''}
                ${window.firebaseFunctions.isAdmin() ? `<button class="btn btn-danger" onclick="gruppeLoeschen('${gruppe.id}')">Löschen</button>` : ''}
            </div>
        </div>`;
    });
    
    liste.innerHTML = html || '<div class="card"><p>Keine Gruppen vorhanden.</p></div>';
    
    console.log('✅ Gruppen angezeigt:', meineGruppen.length, 'für Benutzer:', currentUserName);
    
    // Lehrer- und Fach-Auswahl für neue Gruppen aktualisieren
    updateSchuelerSelects();
}

// NEUE FUNKTION: Gruppen für Benutzer filtern - KORRIGIERT
function filterGruppenForUser(alleGruppen) {
    const currentUserName = window.firebaseFunctions.getCurrentUserName();
    
    console.log('🔍 Filtere Gruppen für:', currentUserName, 'von', alleGruppen.length, 'Gruppen');
    
    if (window.firebaseFunctions.isAdmin()) {
        console.log('👑 Admin-Benutzer: Zeige alle Gruppen');
        return alleGruppen;
    }
    
    const gefiltert = alleGruppen.filter(gruppe => {
        // Prüfe ob Benutzer Ersteller ist
        const istErsteller = gruppe.ersteller === currentUserName;
        
        // Prüfe ob Benutzer als Lehrer in der Gruppe beteiligt ist
        const istBeteiligt = checkUserParticipation(gruppe, currentUserName);
        
        console.log(`✅ Gruppe berechtigt: ${gruppe.thema} Ersteller: ${istErsteller} Beteiligt: ${istBeteiligt}`);
        
        return istErsteller || istBeteiligt;
    });
    
    console.log('🔍 Gefilterte Gruppen:', gefiltert.length);
    return gefiltert;
}

// NEUE FUNKTION: Prüfe Benutzer-Beteiligung an Gruppe
function checkUserParticipation(gruppe, userName) {
    if (!gruppe.schueler || !Array.isArray(gruppe.schueler)) {
        return false;
    }
    
    return gruppe.schueler.some(schueler => {
        const normalizedSchueler = normalizeSchuelerData(schueler);
        return normalizedSchueler.lehrer === userName;
    });
}

// NEUE FUNKTION: Schüler-Daten normalisieren - KORRIGIERT
function normalizeSchuelerData(schueler) {
    if (!schueler || typeof schueler !== 'object') {
        return { name: '', lehrer: '', fach: null };
    }
    
    // Verschiedene mögliche Datenstrukturen unterstützen
    return {
        name: schueler.name || schueler.schuelerName || schueler.vorname + ' ' + schueler.nachname || '',
        lehrer: schueler.lehrer || schueler.lehrerName || '',
        fach: schueler.fach || schueler.fachKuerzel || null
    };
}

// NEUE FUNKTION: Schüler-ID generieren
function generateSchuelerId(gruppenId, schuelerName) {
    return `${gruppenId}-${schuelerName.replace(/\s/g, '-')}`;
}

// Alle Bewertungsdaten sammeln (für Statusanzeige) - UNVERÄNDERT
function getAllBewertungsdata() {
    try {
        const alleBewertungen = [];
        const bewertungsCache = window.firebaseFunctions.dataCache.bewertungen || {};
        
        // Durch alle Lehrer-Bewertungen gehen
        Object.values(bewertungsCache).forEach(lehrerBewertungen => {
            if (lehrerBewertungen && typeof lehrerBewertungen === 'object') {
                Object.values(lehrerBewertungen).forEach(bewertung => {
                    if (bewertung && bewertung.schuelerId) {
                        alleBewertungen.push(bewertung);
                    }
                });
            }
        });
        
        return alleBewertungen;
    } catch (error) {
        console.error('❌ Fehler beim Laden der Bewertungsdaten:', error);
        return [];
    }
}

// Lehrer- und Fach-Selects aktualisieren
function updateSchuelerSelects() {
    console.log('👨‍🏫 Aktualisiere Lehrer- und Fach-Auswahl...');
    
    // Lehrer aus Firebase laden
    loadLehrerForSelects();
    
    // Fächer aus Cache holen
    const faecher = window.firebaseFunctions.getAllFaecher();
    const fachOptions = Object.entries(faecher)
        .map(([kuerzel, name]) => `<option value="${kuerzel}">${name}</option>`)
        .join('');
    
    const fachSelects = document.querySelectorAll('.schueler-fach');
    fachSelects.forEach(select => {
        select.innerHTML = '<option value="">Fach wählen...</option>' + fachOptions;
    });
    
    console.log('✅ Fach-Selects aktualisiert');
}

// Lehrer für Selects laden
async function loadLehrerForSelects() {
    try {
        const usersRef = window.firebaseFunctions.getDatabaseRef('users');
        const snapshot = await window.firebaseDB.get(usersRef);
        
        let lehrerOptions = '';
        if (snapshot.exists()) {
            const users = snapshot.val();
            Object.values(users).forEach(user => {
                if (user.role === 'lehrer') {
                    lehrerOptions += `<option value="${user.name}">${user.name}</option>`;
                }
            });
        }
        
        const lehrerSelects = document.querySelectorAll('.schueler-lehrer');
        lehrerSelects.forEach(select => {
            select.innerHTML = '<option value="">Lehrer wählen...</option>' + lehrerOptions;
        });
        
        console.log('✅ Lehrer-Selects aktualisiert');
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der Lehrer:', error);
    }
}

// Schüler-Zeile hinzufügen
function schuelerHinzufuegen() {
    const container = document.getElementById('schuelerListe');
    if (!container) return;
    
    const newRow = document.createElement('div');
    newRow.className = 'input-group schueler-row';
    
    newRow.innerHTML = `
        <input type="text" placeholder="Schülername" class="schueler-name">
        <select class="schueler-lehrer">
            <option value="">Lehrer wählen...</option>
        </select>
        <select class="schueler-fach">
            <option value="">Fach wählen...</option>
        </select>
        <button type="button" class="btn btn-danger" onclick="schuelerEntfernen(this)">Entfernen</button>
    `;
    
    container.appendChild(newRow);
    
    // Neue Selects mit Optionen füllen
    updateSchuelerSelects();
    
    console.log('➕ Schüler-Zeile hinzugefügt');
}

// Schüler-Zeile entfernen
function schuelerEntfernen(button) {
    const rows = document.querySelectorAll('.schueler-row');
    if (rows.length > 1) {
        button.parentElement.remove();
        console.log('➖ Schüler-Zeile entfernt');
    } else {
        alert('Mindestens ein Schüler muss vorhanden sein!');
    }
}

// Neue Gruppe erstellen - KORRIGIERT für bessere Datenstruktur
async function gruppeErstellen() {
    console.log('👥 Erstelle neue Gruppe...');
    
    if (!window.firebaseFunctions.requireAuth()) return;
    
    const themaInput = document.getElementById('gruppenThema');
    const thema = themaInput?.value.trim();
    
    if (!thema) {
        alert('Bitte geben Sie ein Thema ein!');
        return;
    }

    const schuelerRows = document.querySelectorAll('.schueler-row');
    const schueler = [];
    
    for (let row of schuelerRows) {
        const name = row.querySelector('.schueler-name')?.value.trim();
        const lehrer = row.querySelector('.schueler-lehrer')?.value;
        const fach = row.querySelector('.schueler-fach')?.value;
        
        if (name && lehrer) {
            // KORRIGIERT: Konsistente Datenstruktur
            schueler.push({ 
                name: name, 
                lehrer: lehrer, 
                fach: fach || null 
            });
        } else if (name) {
            alert(`Bitte wählen Sie einen Lehrer für ${name}!`);
            return;
        }
    }

    if (schueler.length === 0) {
        alert('Bitte fügen Sie mindestens einen Schüler hinzu!');
        return;
    }

    try {
        // Gruppe zu Firebase hinzufügen
        const gruppenRef = window.firebaseFunctions.getDatabaseRef('gruppen');
        const newGruppenRef = window.firebaseDB.push(gruppenRef);
        
        const gruppe = { 
            id: newGruppenRef.key,
            thema, 
            schueler, 
            erstellt: window.firebaseFunctions.formatGermanDate(),
            timestamp: window.firebaseFunctions.getTimestamp(),
            ersteller: window.firebaseFunctions.getCurrentUserName()
        };
        
        await window.firebaseDB.set(newGruppenRef, gruppe);
        
        // News für jeden betroffenen Lehrer erstellen
        const lehrer = [...new Set(schueler.map(s => s.lehrer))];
        for (const lehrerName of lehrer) {
            const schuelerDesLehrers = schueler.filter(s => s.lehrer === lehrerName).map(s => s.name);
            if (window.newsFunctions) {
                await window.newsFunctions.createNewsForAction(
                    `Neue Bewertung für ${lehrerName}`, 
                    `Gruppe "${thema}" zugewiesen mit Schüler(n): ${schuelerDesLehrers.join(', ')}`,
                    true,
                    lehrerName // Spezifischer Empfänger
                );
            }
        }
        
        // Felder zurücksetzen
        themaInput.value = '';
        document.querySelectorAll('.schueler-name').forEach(input => input.value = '');
        document.querySelectorAll('.schueler-lehrer').forEach(select => select.value = '');
        document.querySelectorAll('.schueler-fach').forEach(select => select.value = '');
        
        console.log('✅ Gruppe erstellt:', thema, 'mit', schueler.length, 'Schülern');
        
        alert(`Gruppe "${thema}" wurde erfolgreich erstellt!`);
        
    } catch (error) {
        console.error('❌ Fehler beim Erstellen der Gruppe:', error);
        alert('Fehler beim Erstellen der Gruppe: ' + error.message);
    }
}

// Gruppe bearbeiten
async function gruppeBearbeiten(gruppenId) {
    console.log('👥 Bearbeite Gruppe:', gruppenId);
    
    if (!window.firebaseFunctions.requireAuth()) return;
    
    try {
        // Gruppe aus Cache finden
        const gruppen = window.firebaseFunctions.getGruppenFromCache();
        const gruppe = gruppen.find(g => g.id === gruppenId);
        
        if (!gruppe) {
            alert('Gruppe nicht gefunden!');
            return;
        }
        
        aktuelleGruppeEdit = gruppe;
        await showGruppenEditModal();
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der Gruppe:', error);
        alert('Fehler beim Laden der Gruppe: ' + error.message);
    }
}

// Gruppen-Edit Modal anzeigen
async function showGruppenEditModal() {
    const modal = document.getElementById('gruppenEditModal');
    if (!modal) return;
    
    modal.classList.remove('hidden');
    
    // Thema setzen
    const themaInput = document.getElementById('editGruppenThema');
    if (themaInput) {
        themaInput.value = aktuelleGruppeEdit.thema;
    }
    
    // Schüler-Liste aufbauen
    await buildEditSchuelerListe();
}

// Edit-Schüler-Liste aufbauen - KORRIGIERT
async function buildEditSchuelerListe() {
    const container = document.getElementById('editSchuelerListe');
    if (!container || !aktuelleGruppeEdit) return;
    
    // Lehrer laden für Selects
    const usersRef = window.firebaseFunctions.getDatabaseRef('users');
    const snapshot = await window.firebaseDB.get(usersRef);
    
    let lehrerOptions = '<option value="">Lehrer wählen...</option>';
    if (snapshot.exists()) {
        const users = snapshot.val();
        Object.values(users).forEach(user => {
            if (user.role === 'lehrer') {
                lehrerOptions += `<option value="${user.name}">${user.name}</option>`;
            }
        });
    }
    
    // Fach-Optionen
    const faecher = window.firebaseFunctions.getAllFaecher();
    const fachOptions = '<option value="">Fach wählen...</option>' + 
        Object.entries(faecher)
            .map(([kuerzel, name]) => `<option value="${kuerzel}">${name}</option>`)
            .join('');
    
    let html = '';
    
    if (aktuelleGruppeEdit.schueler && Array.isArray(aktuelleGruppeEdit.schueler)) {
        aktuelleGruppeEdit.schueler.forEach((schueler, index) => {
            // KORRIGIERT: Normalisiere Schüler-Daten
            const normalizedSchueler = normalizeSchuelerData(schueler);
            
            html += `
                <div class="edit-schueler-item">
                    <input type="text" value="${normalizedSchueler.name}" class="edit-schueler-name" data-index="${index}">
                    <select class="edit-schueler-lehrer" data-index="${index}">
                        ${lehrerOptions.replace(`value="${normalizedSchueler.lehrer}"`, `value="${normalizedSchueler.lehrer}" selected`)}
                    </select>
                    <select class="edit-schueler-fach" data-index="${index}">
                        ${fachOptions.replace(`value="${normalizedSchueler.fach || ''}"`, `value="${normalizedSchueler.fach || ''}" selected`)}
                    </select>
                    <button class="btn btn-danger" onclick="editSchuelerEntfernen(${index})">Entfernen</button>
                </div>
            `;
        });
    }
    
    container.innerHTML = html;
}

// Schüler in Edit entfernen
function editSchuelerEntfernen(index) {
    if (aktuelleGruppeEdit.schueler.length <= 1) {
        alert('Mindestens ein Schüler muss vorhanden sein!');
        return;
    }
    
    aktuelleGruppeEdit.schueler.splice(index, 1);
    buildEditSchuelerListe();
}

// Neuen Schüler in Edit hinzufügen
function neuerSchuelerInEdit() {
    if (!aktuelleGruppeEdit.schueler) {
        aktuelleGruppeEdit.schueler = [];
    }
    
    // KORRIGIERT: Konsistente Datenstruktur
    aktuelleGruppeEdit.schueler.push({ name: '', lehrer: '', fach: null });
    buildEditSchuelerListe();
}

// Gruppen-Edit speichern - KORRIGIERT
async function gruppeEditSpeichern() {
    console.log('💾 Speichere Gruppen-Änderungen...');
    
    if (!window.firebaseFunctions.requireAuth() || !aktuelleGruppeEdit) return;
    
    try {
        // Daten aus Formular sammeln
        const themaInput = document.getElementById('editGruppenThema');
        const neuesThema = themaInput?.value.trim();
        
        if (!neuesThema) {
            alert('Bitte geben Sie ein Thema ein!');
            return;
        }
        
        // Schüler-Daten sammeln
        const neueSchueler = [];
        const schuelerInputs = document.querySelectorAll('.edit-schueler-item');
        
        for (let item of schuelerInputs) {
            const name = item.querySelector('.edit-schueler-name')?.value.trim();
            const lehrer = item.querySelector('.edit-schueler-lehrer')?.value;
            const fach = item.querySelector('.edit-schueler-fach')?.value;
            
            if (name && lehrer) {
                // KORRIGIERT: Konsistente Datenstruktur
                neueSchueler.push({ name, lehrer, fach: fach || null });
            } else if (name) {
                alert(`Bitte wählen Sie einen Lehrer für ${name}!`);
                return;
            }
        }
        
        if (neueSchueler.length === 0) {
            alert('Mindestens ein Schüler muss vorhanden sein!');
            return;
        }
        
        // Aktualisierte Gruppe speichern
        const updatedGruppe = {
            ...aktuelleGruppeEdit,
            thema: neuesThema,
            schueler: neueSchueler,
            lastUpdate: window.firebaseFunctions.getTimestamp()
        };
        
        const gruppenRef = window.firebaseFunctions.getDatabaseRef(`gruppen/${aktuelleGruppeEdit.id}`);
        await window.firebaseDB.set(gruppenRef, updatedGruppe);
        
        // News erstellen
        if (window.newsFunctions) {
            await window.newsFunctions.createNewsForAction(
                'Gruppe aktualisiert', 
                `Die Gruppe "${neuesThema}" wurde bearbeitet.`
            );
        }
        
        console.log('✅ Gruppe aktualisiert:', neuesThema);
        
        alert(`Gruppe "${neuesThema}" wurde erfolgreich aktualisiert!`);
        gruppeEditAbbrechen();
        
    } catch (error) {
        console.error('❌ Fehler beim Speichern der Gruppe:', error);
        alert('Fehler beim Speichern der Gruppe: ' + error.message);
    }
}

// Gruppen-Edit abbrechen
function gruppeEditAbbrechen() {
    const modal = document.getElementById('gruppenEditModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    aktuelleGruppeEdit = null;
}

// Gruppe löschen
async function gruppeLoeschen(gruppenId) {
    if (!window.firebaseFunctions.requireAdmin()) return;
    
    try {
        // Gruppe aus Cache finden
        const gruppen = window.firebaseFunctions.getGruppenFromCache();
        const gruppe = gruppen.find(g => g.id === gruppenId);
        
        if (!gruppe) {
            alert('Gruppe nicht gefunden!');
            return;
        }
        
        if (confirm(`Gruppe "${gruppe.thema}" wirklich löschen?\n\nDies löscht auch alle zugehörigen Bewertungen!`)) {
            // Gruppe löschen
            const gruppenRef = window.firebaseFunctions.getDatabaseRef(`gruppen/${gruppenId}`);
            await window.firebaseDB.remove(gruppenRef);
            
            // Zugehörige Bewertungen löschen
            await deleteGruppenBewertungen(gruppenId);
            
            // News erstellen
            if (window.newsFunctions) {
                await window.newsFunctions.createNewsForAction(
                    'Gruppe gelöscht', 
                    `Die Gruppe "${gruppe.thema}" wurde gelöscht.`
                );
            }
            
            console.log('🗑️ Gruppe gelöscht:', gruppe.thema);
            
            alert(`Gruppe "${gruppe.thema}" wurde gelöscht.`);
        }
        
    } catch (error) {
        console.error('❌ Fehler beim Löschen der Gruppe:', error);
        alert('Fehler beim Löschen der Gruppe: ' + error.message);
    }
}

// Bewertungen einer Gruppe löschen
async function deleteGruppenBewertungen(gruppenId) {
    try {
        const bewertungenRef = window.firebaseFunctions.getDatabaseRef('bewertungen');
        const snapshot = await window.firebaseDB.get(bewertungenRef);
        
        if (snapshot.exists()) {
            const alleBewertungen = snapshot.val();
            
            // Durch alle Lehrer-Bewertungen gehen
            for (const [lehrerEmail, bewertungen] of Object.entries(alleBewertungen)) {
                for (const [bewertungId, bewertung] of Object.entries(bewertungen)) {
                    // Prüfen ob Bewertung zu dieser Gruppe gehört
                    if (bewertung.schuelerId && bewertung.schuelerId.startsWith(gruppenId + '-')) {
                        const bewertungRef = window.firebaseFunctions.getDatabaseRef(`bewertungen/${lehrerEmail}/${bewertungId}`);
                        await window.firebaseDB.remove(bewertungRef);
                        console.log('🗑️ Bewertung gelöscht:', bewertungId);
                    }
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Fehler beim Löschen der Gruppen-Bewertungen:', error);
    }
}

// Gruppen-Daten für andere Module bereitstellen
function getGruppenForUser() {
    const gruppen = window.firebaseFunctions.getGruppenFromCache();
    return filterGruppenForUser(gruppen);
}

// Export für andere Module
window.gruppenFunctions = {
    getGruppenForUser,
    updateSchuelerSelects,
    normalizeSchuelerData,
    generateSchuelerId
};

console.log('✅ Firebase Gruppen-System bereit - Korrigierte Version');
