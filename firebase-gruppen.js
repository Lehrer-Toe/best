// Firebase Gruppen-System - Realtime Database mit Klassen-Management
console.log('👥 Firebase Gruppen-System geladen - Klassen-Version');

// Globale Variablen für Gruppenbearbeitung
let aktuelleGruppeEdit = null;
let verfuegbareSchueler = [];
let aktuellerKlassenFilter = '';

// Gruppen laden und anzeigen
function loadGruppen() {
    console.log('👥 Lade Gruppen von Firebase...');
    
    if (!window.firebaseFunctions.requireAuth()) return;
    
    const liste = document.getElementById('gruppenListe');
    if (!liste) return;
    
    // Gruppen aus Cache holen
    const gruppen = window.firebaseFunctions.getGruppenFromCache();
    
    // Bewertungen für Statusanzeige laden
    const alleBewertungen = getAllBewertungsdata();
    
    let html = '';
    gruppen.forEach((gruppe) => {
        // Berechtigung prüfen - Admin oder beteiligte Lehrer können bearbeiten
        const currentUserName = window.firebaseFunctions.getCurrentUserName();
        const istBeteiligt = gruppe.schueler?.some(s => s.lehrer === currentUserName);
        const kannBearbeiten = window.firebaseFunctions.isAdmin() || istBeteiligt;
        
        html += `<div class="liste-item">
            <div>
                <strong>${gruppe.thema}</strong><br>
                <small>Erstellt: ${gruppe.erstellt} von ${gruppe.ersteller || 'System'}</small><br>
                <div style="margin-top: 0.5rem;">`;
        
        if (gruppe.schueler && Array.isArray(gruppe.schueler)) {
            // Gruppiere Schüler nach Klassen für bessere Übersicht
            const schuelerNachKlassen = {};
            gruppe.schueler.forEach(schueler => {
                const klasse = schueler.klasse || 'Unbekannt';
                if (!schuelerNachKlassen[klasse]) {
                    schuelerNachKlassen[klasse] = [];
                }
                schuelerNachKlassen[klasse].push(schueler);
            });
            
            Object.entries(schuelerNachKlassen).forEach(([klasse, schuelerInKlasse]) => {
                html += `<div class="klassen-gruppe">
                    <strong style="color: #667eea;">${klasse}:</strong><br>`;
                
                schuelerInKlasse.forEach(schueler => {
                    const fachInfo = schueler.fach ? ` (${window.firebaseFunctions.getFachNameFromGlobal(schueler.fach)})` : '';
                    
                    // Bewertungsstatus prüfen
                    const schuelerId = `${gruppe.id}-${schueler.name.replace(/\s/g, '-')}`;
                    const istBewertet = alleBewertungen.some(b => b.schuelerId === schuelerId);
                    const statusColor = istBewertet ? '#27ae60' : '#e74c3c';
                    const statusIcon = istBewertet ? '✅' : '⏳';
                    
                    html += `<div style="margin: 2px 0 2px 20px; padding: 3px 6px; background: ${statusColor}; color: white; border-radius: 3px; display: inline-block; margin-right: 5px; font-size: 0.85rem;">
                        ${statusIcon} ${schueler.name} → ${schueler.lehrer}${fachInfo}
                    </div><br>`;
                });
                
                html += `</div>`;
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
    
    // Klassen-Filter und Schüler-Auswahl laden
    loadKlassenFilter();
    
    console.log('👥 Gruppen geladen:', gruppen.length);
}

// Alle Bewertungsdaten sammeln (für Statusanzeige)
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

// Klassen-Filter laden
async function loadKlassenFilter() {
    console.log('🏫 Lade Klassen-Filter...');
    
    try {
        const klassenRef = window.firebaseFunctions.getDatabaseRef('klassen');
        const snapshot = await window.firebaseDB.get(klassenRef);
        
        const filterSelect = document.getElementById('klassenFilter');
        if (!filterSelect) return;
        
        let options = '<option value="">Klasse wählen...</option>';
        
        if (snapshot.exists()) {
            const klassen = snapshot.val();
            Object.entries(klassen).forEach(([klassenId, klassenData]) => {
                options += `<option value="${klassenId}">${klassenData.name}</option>`;
            });
        } else {
            options += '<option value="" disabled>Keine Klassen verfügbar - Admin muss Klassen anlegen</option>';
        }
        
        filterSelect.innerHTML = options;
        
        console.log('✅ Klassen-Filter geladen');
        
    } catch (error) {
        console.error('❌ Fehler beim Laden des Klassen-Filters:', error);
        const filterSelect = document.getElementById('klassenFilter');
        if (filterSelect) {
            filterSelect.innerHTML = '<option value="">Fehler beim Laden der Klassen</option>';
        }
    }
}

// Klassen-Filter geändert
async function klassenFilterChanged() {
    const filterSelect = document.getElementById('klassenFilter');
    if (!filterSelect) return;
    
    aktuellerKlassenFilter = filterSelect.value;
    console.log('🔍 Klassen-Filter geändert:', aktuellerKlassenFilter);
    
    if (aktuellerKlassenFilter) {
        await loadVerfuegbareSchueler(aktuellerKlassenFilter);
        updateSchuelerAuswahl();
    } else {
        // Keine Klasse gewählt - Schüler-Container leeren
        const container = document.getElementById('schuelerContainer');
        if (container) {
            container.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">Bitte wählen Sie zuerst eine Klasse aus.</p>';
        }
    }
}

// Verfügbare Schüler für gewählte Klasse laden
async function loadVerfuegbareSchueler(klassenId) {
    console.log('👥 Lade verfügbare Schüler für Klasse:', klassenId);
    
    try {
        // Klassen-Daten laden
        const klassenRef = window.firebaseFunctions.getDatabaseRef(`klassen/${klassenId}`);
        const snapshot = await window.firebaseDB.get(klassenRef);
        
        if (!snapshot.exists()) {
            console.warn('Klasse nicht gefunden:', klassenId);
            verfuegbareSchueler = [];
            return;
        }
        
        const klassenData = snapshot.val();
        const alleSchuelerDerKlasse = klassenData.schueler || [];
        
        // Bereits zugewiesene Schüler ermitteln
        const gruppen = window.firebaseFunctions.getGruppenFromCache();
        const bereitsZugewieseneSchueler = new Set();
        
        gruppen.forEach(gruppe => {
            if (gruppe.schueler) {
                gruppe.schueler.forEach(schueler => {
                    if (schueler.klasse === klassenId) {
                        bereitsZugewieseneSchueler.add(schueler.schuelerId);
                    }
                });
            }
        });
        
        // Verfügbare Schüler filtern (nur noch nicht zugewiesene)
        verfuegbareSchueler = alleSchuelerDerKlasse.filter(schueler => 
            !bereitsZugewieseneSchueler.has(schueler.id)
        );
        
        console.log('✅ Verfügbare Schüler geladen:', verfuegbareSchueler.length, 'von', alleSchuelerDerKlasse.length);
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der verfügbaren Schüler:', error);
        verfuegbareSchueler = [];
    }
}

// Schüler-Auswahl UI aktualisieren
function updateSchuelerAuswahl() {
    const container = document.getElementById('schuelerContainer');
    if (!container) return;
    
    if (verfuegbareSchueler.length === 0) {
        container.innerHTML = `
            <div class="keine-schueler-info">
                <p style="color: #e74c3c; text-align: center; padding: 20px;">
                    📋 Alle Schüler dieser Klasse sind bereits Gruppen zugewiesen.<br>
                    <small>Oder die gewählte Klasse enthält keine Schüler.</small>
                </p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="schueler-auswahl-info">
            <h4>Verfügbare Schüler aus ${aktuellerKlassenFilter}</h4>
            <p style="color: #666; margin-bottom: 15px;">
                ${verfuegbareSchueler.length} Schüler verfügbar • Wählen Sie die Schüler für diese Gruppe aus
            </p>
        </div>
        <div class="schueler-grid" id="schuelerGrid">
    `;
    
    verfuegbareSchueler.forEach(schueler => {
        html += `
            <div class="schueler-auswahl-item" onclick="toggleSchuelerAuswahl('${schueler.id}')">
                <input type="checkbox" id="schueler-${schueler.id}" 
                       onchange="schuelerCheckboxChanged('${schueler.id}')">
                <label for="schueler-${schueler.id}" class="schueler-label">
                    <span class="schueler-name">${schueler.name}</span>
                </label>
                <div class="schueler-zuordnung">
                    <select class="lehrer-select" id="lehrer-${schueler.id}" disabled>
                        <option value="">Lehrer wählen...</option>
                    </select>
                    <select class="fach-select" id="fach-${schueler.id}" disabled>
                        <option value="">Fach wählen...</option>
                    </select>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
    
    // Lehrer- und Fach-Optionen laden
    loadLehrerUndFachOptionen();
}

// Lehrer- und Fach-Optionen für Selects laden
async function loadLehrerUndFachOptionen() {
    try {
        // Lehrer laden
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
        
        // Alle Selects aktualisieren
        document.querySelectorAll('.lehrer-select').forEach(select => {
            select.innerHTML = lehrerOptions;
        });
        
        document.querySelectorAll('.fach-select').forEach(select => {
            select.innerHTML = fachOptions;
        });
        
        console.log('✅ Lehrer- und Fach-Optionen geladen');
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der Optionen:', error);
    }
}

// Schüler-Auswahl togglen
function toggleSchuelerAuswahl(schuelerId) {
    const checkbox = document.getElementById(`schueler-${schuelerId}`);
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        schuelerCheckboxChanged(schuelerId);
    }
}

// Schüler Checkbox geändert
function schuelerCheckboxChanged(schuelerId) {
    const checkbox = document.getElementById(`schueler-${schuelerId}`);
    const lehrerSelect = document.getElementById(`lehrer-${schuelerId}`);
    const fachSelect = document.getElementById(`fach-${schuelerId}`);
    const item = checkbox.closest('.schueler-auswahl-item');
    
    if (checkbox.checked) {
        // Schüler ausgewählt - Selects aktivieren
        lehrerSelect.disabled = false;
        fachSelect.disabled = false;
        item.classList.add('selected');
    } else {
        // Schüler abgewählt - Selects deaktivieren und zurücksetzen
        lehrerSelect.disabled = true;
        lehrerSelect.value = '';
        fachSelect.disabled = true;
        fachSelect.value = '';
        item.classList.remove('selected');
    }
}

// Neue Gruppe erstellen (überarbeitet)
async function gruppeErstellen() {
    console.log('👥 Erstelle neue Gruppe...');
    
    if (!window.firebaseFunctions.requireAuth()) return;
    
    const themaInput = document.getElementById('gruppenThema');
    const thema = themaInput?.value.trim();
    
    if (!thema) {
        alert('Bitte geben Sie ein Thema ein!');
        return;
    }
    
    if (!aktuellerKlassenFilter) {
        alert('Bitte wählen Sie zuerst eine Klasse aus!');
        return;
    }
    
    // Ausgewählte Schüler sammeln
    const ausgewaehlteSchueler = [];
    const checkboxes = document.querySelectorAll('#schuelerGrid input[type="checkbox"]:checked');
    
    if (checkboxes.length === 0) {
        alert('Bitte wählen Sie mindestens einen Schüler aus!');
        return;
    }
    
    for (let checkbox of checkboxes) {
        const schuelerId = checkbox.id.replace('schueler-', '');
        const lehrerSelect = document.getElementById(`lehrer-${schuelerId}`);
        const fachSelect = document.getElementById(`fach-${schuelerId}`);
        
        const lehrer = lehrerSelect?.value;
        const fach = fachSelect?.value;
        
        if (!lehrer) {
            const schuelerName = verfuegbareSchueler.find(s => s.id === schuelerId)?.name || schuelerId;
            alert(`Bitte wählen Sie einen Lehrer für ${schuelerName}!`);
            return;
        }
        
        const schuelerData = verfuegbareSchueler.find(s => s.id === schuelerId);
        if (schuelerData) {
            ausgewaehlteSchueler.push({
                name: schuelerData.name,
                schuelerId: schuelerData.id,
                klasse: aktuellerKlassenFilter,
                lehrer: lehrer,
                fach: fach || null
            });
        }
    }
    
    try {
        // Gruppe zu Firebase hinzufügen
        const gruppenRef = window.firebaseFunctions.getDatabaseRef('gruppen');
        const newGruppenRef = window.firebaseDB.push(gruppenRef);
        
        const gruppe = { 
            id: newGruppenRef.key,
            thema, 
            schueler: ausgewaehlteSchueler, 
            erstellt: window.firebaseFunctions.formatGermanDate(),
            timestamp: window.firebaseFunctions.getTimestamp(),
            ersteller: window.firebaseFunctions.getCurrentUserName()
        };
        
        await window.firebaseDB.set(newGruppenRef, gruppe);
        
        // News für jeden betroffenen Lehrer erstellen
        const lehrer = [...new Set(ausgewaehlteSchueler.map(s => s.lehrer))];
        for (const lehrerName of lehrer) {
            const schuelerDesLehrers = ausgewaehlteSchueler.filter(s => s.lehrer === lehrerName).map(s => s.name);
            if (window.newsFunctions) {
                await window.newsFunctions.createNewsForAction(
                    `Neue Bewertung für ${lehrerName}`, 
                    `Gruppe "${thema}" (Klasse ${aktuellerKlassenFilter}) zugewiesen mit Schüler(n): ${schuelerDesLehrers.join(', ')}`,
                    true,
                    lehrerName
                );
            }
        }
        
        // UI zurücksetzen
        themaInput.value = '';
        document.getElementById('klassenFilter').value = '';
        aktuellerKlassenFilter = '';
        verfuegbareSchueler = [];
        
        const container = document.getElementById('schuelerContainer');
        if (container) {
            container.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">Bitte wählen Sie zuerst eine Klasse aus.</p>';
        }
        
        console.log('✅ Gruppe erstellt:', thema, 'mit', ausgewaehlteSchueler.length, 'Schülern aus Klasse', aktuellerKlassenFilter);
        
        alert(`Gruppe "${thema}" wurde erfolgreich erstellt!\n${ausgewaehlteSchueler.length} Schüler aus Klasse ${aktuellerKlassenFilter} zugewiesen.`);
        
    } catch (error) {
        console.error('❌ Fehler beim Erstellen der Gruppe:', error);
        alert('Fehler beim Erstellen der Gruppe: ' + error.message);
    }
}

// Gruppe bearbeiten (vereinfacht, da Schüler-Änderung komplexer wird)
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
        
        // Vereinfachte Bearbeitung - nur Thema und Lehrer/Fach-Zuordnungen
        const neuesThema = prompt('Neues Thema:', gruppe.thema);
        if (neuesThema === null) return; // Abgebrochen
        
        if (!neuesThema.trim()) {
            alert('Thema darf nicht leer sein!');
            return;
        }
        
        // Aktualisierte Gruppe speichern
        const updatedGruppe = {
            ...gruppe,
            thema: neuesThema.trim(),
            lastUpdate: window.firebaseFunctions.getTimestamp()
        };
        
        const gruppenRef = window.firebaseFunctions.getDatabaseRef(`gruppen/${gruppenId}`);
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
        
    } catch (error) {
        console.error('❌ Fehler beim Bearbeiten der Gruppe:', error);
        alert('Fehler beim Bearbeiten der Gruppe: ' + error.message);
    }
}

// Gruppe löschen (unverändert)
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

// Bewertungen einer Gruppe löschen (unverändert)
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
    const currentUserName = window.firebaseFunctions.getCurrentUserName();
    
    if (window.firebaseFunctions.isAdmin()) {
        return gruppen; // Admin sieht alle Gruppen
    } else {
        // Lehrer sieht nur Gruppen mit eigenen Schülern
        return gruppen.filter(gruppe => 
            gruppe.schueler && gruppe.schueler.some(s => s.lehrer === currentUserName)
        );
    }
}

// Export für andere Module
window.gruppenFunctions = {
    getGruppenForUser,
    klassenFilterChanged
};

console.log('✅ Firebase Gruppen-System bereit - Klassen-Version');
