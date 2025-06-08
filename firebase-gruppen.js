// Firebase Gruppen-System - Realtime Database mit Klassen-Integration und Berechtigungen
console.log('👥 Firebase Gruppen-System geladen (mit Berechtigungsprüfung)');

// Globale Variablen für Gruppenbearbeitung
let aktuelleGruppeEdit = null;
let ausgewaehlteSchueler = [];

// Gruppen laden und anzeigen
function loadGruppen() {
    console.log('👥 Lade Gruppen von Firebase...');
    
    if (!window.firebaseFunctions.requireAuth()) return;
    
    // Berechtigungen prüfen und UI anpassen
    checkGruppenAnlegenBerechtigung();
    
    const liste = document.getElementById('gruppenListe');
    if (!liste) return;
    
    // Gruppen für aktuellen Lehrer laden
    const meineGruppen = getMeineGruppen();
    
    // Bewertungen für Statusanzeige laden
    const alleBewertungen = getAllBewertungsdata();
    
    let html = '';
    meineGruppen.forEach((gruppe) => {
        // Berechtigung prüfen - nur Ersteller kann bearbeiten
        const kannBearbeiten = gruppe.ersteller === window.firebaseFunctions.getCurrentUserName();
        
        html += `<div class="liste-item">
            <div>
                <strong>${gruppe.thema}</strong><br>
                <small>Erstellt: ${gruppe.erstellt} von ${gruppe.ersteller || 'System'}</small><br>
                <div style="margin-top: 0.5rem;">`;
        
        if (gruppe.schueler && Array.isArray(gruppe.schueler)) {
            gruppe.schueler.forEach(schueler => {
                const fachInfo = schueler.fach ? ` (${window.firebaseFunctions.getFachNameFromGlobal(schueler.fach)})` : '';
                
                // Bewertungsstatus prüfen
                const schuelerId = `${gruppe.id}-${schueler.vorname}-${schueler.nachname}`.replace(/\s/g, '-');
                const istBewertet = alleBewertungen.some(b => b.schuelerId === schuelerId);
                const statusColor = istBewertet ? '#27ae60' : '#e74c3c';
                const statusIcon = istBewertet ? '✅' : '⏳';
                
                html += `<div style="margin: 2px 0; padding: 3px 6px; background: ${statusColor}; color: white; border-radius: 3px; display: inline-block; margin-right: 5px; font-size: 0.85rem;">
                    ${statusIcon} ${schueler.vorname} ${schueler.nachname} → ${schueler.lehrer}${fachInfo}
                </div><br>`;
            });
        }
        
        html += `</div>
            </div>
            <div>
                ${kannBearbeiten ? `<button class="btn" onclick="gruppeBearbeiten('${gruppe.id}')">Bearbeiten</button>` : ''}
                ${window.firebaseFunctions.isAdmin() || kannBearbeiten ? `<button class="btn btn-danger" onclick="gruppeLoeschen('${gruppe.id}')">Löschen</button>` : ''}
            </div>
        </div>`;
    });
    
    liste.innerHTML = html || '<div class="card"><p>Keine Gruppen vorhanden oder zugewiesen.</p></div>';
    
    // Klassen-Auswahl für neue Gruppen aktualisieren
    updateKlassenauswahlForGruppen();
    
    console.log('👥 Gruppen geladen:', meineGruppen.length, 'für aktuellen Benutzer');
}

// Berechtigungsprüfung für Gruppen anlegen
async function checkGruppenAnlegenBerechtigung() {
    console.log('🔐 Prüfe Berechtigung zum Anlegen von Gruppen...');
    
    try {
        // Admin hat immer Berechtigung
        if (window.firebaseFunctions.isAdmin()) {
            console.log('✅ Admin - volle Berechtigung');
            showGruppenAnlegenUI(true);
            return true;
        }
        
        // Für Lehrer: Berechtigung aus Firebase prüfen
        const currentUser = window.currentUser;
        if (!currentUser || currentUser.role !== 'lehrer') {
            console.log('❌ Kein Lehrer eingeloggt');
            showGruppenAnlegenUI(false);
            return false;
        }
        
        // Benutzer-Daten aus Firebase laden
        const userEmail = window.authFunctions.getUserEmail();
        const sanitizedEmail = window.firebaseFunctions.sanitizeEmail(userEmail);
        const userRef = window.firebaseFunctions.getDatabaseRef(`users/${sanitizedEmail}`);
        const snapshot = await window.firebaseDB.get(userRef);
        
        if (!snapshot.exists()) {
            console.log('❌ Benutzerdaten nicht gefunden');
            showGruppenAnlegenUI(false);
            return false;
        }
        
        const userData = snapshot.val();
        const kannGruppenAnlegen = userData.berechtigungen?.kannGruppenAnlegen !== false;
        
        console.log('🔐 Berechtigung zum Gruppen anlegen:', kannGruppenAnlegen);
        showGruppenAnlegenUI(kannGruppenAnlegen);
        
        return kannGruppenAnlegen;
        
    } catch (error) {
        console.error('❌ Fehler bei Berechtigungsprüfung:', error);
        // Im Fehlerfall: Sicherheitshalber verbieten
        showGruppenAnlegenUI(false);
        return false;
    }
}

// UI für Gruppen anlegen anzeigen/verstecken
function showGruppenAnlegenUI(berechtigt) {
    console.log('🎨 Aktualisiere Gruppen-UI, berechtigt:', berechtigt);
    
    try {
        // Suche die Card mit der Gruppenanlage
        const cards = document.querySelectorAll('#gruppen .card');
        let gruppenAnlegenCard = null;
        
        cards.forEach(card => {
            const h3 = card.querySelector('h3');
            if (h3 && h3.textContent === 'Neue Gruppe anlegen') {
                gruppenAnlegenCard = card;
            }
        });
        
        if (gruppenAnlegenCard) {
            // Toggle-Button holen
            const toggleBtn = document.getElementById('gruppenToggleBtn');

            if (berechtigt) {
                // Zeige normale UI und Toggle-Button
                gruppenAnlegenCard.style.display = 'block';
                if (toggleBtn) toggleBtn.style.display = 'flex';

                // Eventuellen Hinweis entfernen
                const hinweis = document.getElementById('keineGruppenBerechtigung');
                if (hinweis) hinweis.remove();

                console.log('✅ Gruppen-Anlegen UI angezeigt');
            } else {
                // Verstecke UI und Toggle-Button
                gruppenAnlegenCard.style.display = 'none';
                if (toggleBtn) toggleBtn.style.display = 'none';

                // Bereich sicher schließen
                const bereich = document.getElementById('gruppenErstellenBereich');
                if (bereich) bereich.classList.remove('active');

                // Hinweis entfernen, falls vorhanden
                const hinweis = document.getElementById('keineGruppenBerechtigung');
                if (hinweis) hinweis.remove();

                console.log('⚠️ Gruppen-Anlegen UI ausgeblendet (keine Berechtigung)');
            }
        } else {
            console.warn('⚠️ Gruppen-Anlegen Card nicht gefunden');
        }
        
    } catch (error) {
        console.error('❌ Fehler beim Aktualisieren der UI:', error);
    }
}

// Meine Gruppen holen (erstellt oder zum Prüfen)
function getMeineGruppen() {
    const alleGruppen = window.firebaseFunctions.getGruppenFromCache();
    const currentUserName = window.firebaseFunctions.getCurrentUserName();
    
    if (window.firebaseFunctions.isAdmin()) {
        return alleGruppen; // Admin sieht alle Gruppen
    }
    
    // Lehrer sieht nur:
    // 1. Gruppen die er erstellt hat
    // 2. Gruppen bei denen er Schüler zu bewerten hat
    return alleGruppen.filter(gruppe => {
        // Ersteller-Check
        if (gruppe.ersteller === currentUserName) {
            return true;
        }
        
        // Prüfungs-Check (hat Schüler in der Gruppe)
        if (gruppe.schueler && gruppe.schueler.some(s => s.lehrer === currentUserName)) {
            return true;
        }
        
        return false;
    });
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

// Klassen-Auswahl für Gruppen aktualisieren
function updateKlassenauswahlForGruppen() {
    const klassenSelect = document.getElementById('gruppenKlasseSelect');
    if (!klassenSelect) return;
    
    const klassen = window.firebaseFunctions.getKlassenFromCache();
    
    let html = '<option value="">Klasse auswählen...</option>';
    klassen.forEach(klasse => {
        const schuelerAnzahl = klasse.schueler ? klasse.schueler.length : 0;
        html += `<option value="${klasse.id}">${klasse.name} (${klasse.schuljahr}) - ${schuelerAnzahl} Schüler</option>`;
    });
    
    klassenSelect.innerHTML = html;
}

// Klasse für Gruppe gewählt
function klasseGewaehlt() {
    const klassenSelect = document.getElementById('gruppenKlasseSelect');
    const schuelerContainer = document.getElementById('verfuegbareSchueler');
    
    const klasseId = klassenSelect.value;
    
    if (!klasseId) {
        schuelerContainer.innerHTML = '<p>Bitte wählen Sie eine Klasse aus.</p>';
        ausgewaehlteSchueler = [];
        updateAusgewaehlteSchuelerAnzeige();
        return;
    }
    
    // Verfügbare Schüler der Klasse laden
    const verfuegbareSchueler = window.klassenFunctions.getVerfuegbareSchueler(klasseId);
    
    if (verfuegbareSchueler.length === 0) {
        schuelerContainer.innerHTML = '<p>Alle Schüler dieser Klasse sind bereits in Gruppen eingeteilt.</p>';
        ausgewaehlteSchueler = [];
        updateAusgewaehlteSchuelerAnzeige();
        return;
    }
    
    // Schüler-Auswahl anzeigen
    let html = '<h4>Verfügbare Schüler auswählen:</h4><div class="schueler-auswahl-grid">';
    
    verfuegbareSchueler.forEach((schueler, index) => {
        html += `
            <div class="schueler-auswahl-item">
                <input type="checkbox" id="schueler-${index}" class="schueler-checkbox" onchange="schuelerToggle('${klasseId}', ${index}, this.checked)">
                <label for="schueler-${index}">${schueler.vorname} ${schueler.nachname}</label>
            </div>
        `;
    });
    
    html += '</div>';
    schuelerContainer.innerHTML = html;
    
    // Reset ausgewählte Schüler
    ausgewaehlteSchueler = [];
    updateAusgewaehlteSchuelerAnzeige();
}

// Schüler auswählen/abwählen
function schuelerToggle(klasseId, schuelerIndex, isChecked) {
    const checkbox = document.getElementById(`schueler-${schuelerIndex}`);
    const verfuegbareSchueler = window.klassenFunctions.getVerfuegbareSchueler(klasseId);
    const schueler = verfuegbareSchueler[schuelerIndex];

    if (!schueler) return;

    if (isChecked === undefined) {
        isChecked = checkbox.checked;
    } else {
        checkbox.checked = isChecked;
    }

    if (isChecked) {
        // Schüler hinzufügen
        if (!ausgewaehlteSchueler.find(s => s.vorname === schueler.vorname && s.nachname === schueler.nachname)) {
            ausgewaehlteSchueler.push({
                ...schueler,
                klasseId: klasseId,
                lehrer: '', // Wird später zugewiesen
                fach: ''    // Wird später zugewiesen
            });
        }
    } else {
        // Schüler entfernen
        ausgewaehlteSchueler = ausgewaehlteSchueler.filter(s =>
            !(s.vorname === schueler.vorname && s.nachname === schueler.nachname)
        );
    }
    
    updateAusgewaehlteSchuelerAnzeige();
}

// Anzeige der ausgewählten Schüler aktualisieren
async function updateAusgewaehlteSchuelerAnzeige() {
    const container = document.getElementById('ausgewaehlteSchuelerAnzeige');
    if (!container) return;
    
    if (ausgewaehlteSchueler.length === 0) {
        container.innerHTML = '<p>Keine Schüler ausgewählt.</p>';
        return;
    }
    
    let html = '<h4>Ausgewählte Schüler - Lehrer und Fach zuweisen:</h4>';
    
    const lehrerOptions = await getLehrerOptions();
    const fachOptions = getFachOptions();

    ausgewaehlteSchueler.forEach((schueler, index) => {
        html += `
            <div class="ausgewaehlter-schueler-item">
                <span class="schueler-name">${schueler.vorname} ${schueler.nachname}</span>
                <select class="schueler-lehrer-select" onchange="lehrerZuweisen(${index}, this.value)">
                    <option value="">Lehrer wählen...</option>
                    ${lehrerOptions}
                </select>
                <select class="schueler-fach-select" onchange="fachZuweisen(${index}, this.value)">
                    <option value="">Fach wählen...</option>
                    ${fachOptions}
                </select>
                <button class="btn btn-danger btn-sm" onclick="ausgewaehltenSchuelerEntfernen(${index})">Entfernen</button>
            </div>
        `;
    });
    
    container.innerHTML = html;

    // Gewählte Lehrer/Fächer wiederherstellen
    container.querySelectorAll('.schueler-lehrer-select').forEach((sel, i) => {
        sel.value = ausgewaehlteSchueler[i].lehrer || '';
    });
    container.querySelectorAll('.schueler-fach-select').forEach((sel, i) => {
        sel.value = ausgewaehlteSchueler[i].fach || '';
    });
}

// Lehrer-Optionen für Select generieren
let cachedLehrerOptions = null;
async function getLehrerOptions() {
    if (cachedLehrerOptions !== null) {
        return cachedLehrerOptions;
    }
    try {
        const usersRef = window.firebaseFunctions.getDatabaseRef('users');
        const snapshot = await window.firebaseDB.get(usersRef);
        if (snapshot.exists()) {
            const users = snapshot.val();
            const lehrer = Object.values(users)
                .filter(u => u.role === 'lehrer')
                .map(u => u.name);
            cachedLehrerOptions = lehrer
                .map(name => `<option value="${name}">${name}</option>`)
                .join('');
        } else {
            cachedLehrerOptions = '';
        }
    } catch (error) {
        console.error('❌ Fehler beim Laden der Lehrer:', error);
        cachedLehrerOptions = '';
    }
    return cachedLehrerOptions;
}

// Fach-Optionen für Select generieren
function getFachOptions() {
    const faecher = window.firebaseFunctions.getAllFaecher();
    return Object.entries(faecher)
        .map(([kuerzel, name]) => `<option value="${kuerzel}">${name}</option>`)
        .join('');
}

// Lehrer einem ausgewählten Schüler zuweisen
function lehrerZuweisen(index, lehrer) {
    if (ausgewaehlteSchueler[index]) {
        ausgewaehlteSchueler[index].lehrer = lehrer;
    }
}

// Fach einem ausgewählten Schüler zuweisen
function fachZuweisen(index, fach) {
    if (ausgewaehlteSchueler[index]) {
        ausgewaehlteSchueler[index].fach = fach;
    }
}

// Ausgewählten Schüler entfernen
function ausgewaehltenSchuelerEntfernen(index) {
    const schueler = ausgewaehlteSchueler[index];
    if (!schueler) return;
    
    // Checkbox zurücksetzen
    const verfuegbareSchueler = window.klassenFunctions.getVerfuegbareSchueler(schueler.klasseId);
    const originalIndex = verfuegbareSchueler.findIndex(s => 
        s.vorname === schueler.vorname && s.nachname === schueler.nachname
    );
    
    if (originalIndex !== -1) {
        const checkbox = document.getElementById(`schueler-${originalIndex}`);
        if (checkbox) checkbox.checked = false;
    }
    
    // Aus ausgewählten entfernen
    ausgewaehlteSchueler.splice(index, 1);
    updateAusgewaehlteSchuelerAnzeige();
}

// Neue Gruppe erstellen
async function gruppeErstellen() {
    console.log('👥 Erstelle neue Gruppe...');
    
    if (!window.firebaseFunctions.requireAuth()) return;
    
    // Berechtigungsprüfung
    const darfGruppenAnlegen = await checkGruppenAnlegenBerechtigung();
    if (!darfGruppenAnlegen) {
        alert('Sie haben keine Berechtigung, neue Gruppen anzulegen.');
        console.log('❌ Gruppenerstellung abgebrochen - keine Berechtigung');
        return;
    }
    
    const themaInput = document.getElementById('gruppenThema');
    const thema = themaInput?.value.trim();
    
    if (!thema) {
        alert('Bitte geben Sie ein Thema ein!');
        return;
    }

    if (ausgewaehlteSchueler.length === 0) {
        alert('Bitte wählen Sie mindestens einen Schüler aus!');
        return;
    }

    // Prüfen ob alle Schüler Lehrer und Fach zugewiesen haben
    const unvollstaendig = ausgewaehlteSchueler.filter(s => !s.lehrer || !s.fach);
    if (unvollstaendig.length > 0) {
        alert('Bitte weisen Sie allen Schülern einen Lehrer und ein Fach zu!');
        return;
    }

    try {
        // Gruppe zu Firebase hinzufügen
        const gruppenRef = window.firebaseFunctions.getDatabaseRef('gruppen');
        const newGruppenRef = window.firebaseDB.push(gruppenRef);
        
        const gruppe = { 
            id: newGruppenRef.key,
            thema, 
            schueler: ausgewaehlteSchueler.map(s => ({
                vorname: s.vorname,
                nachname: s.nachname,
                klasseId: s.klasseId,
                lehrer: s.lehrer,
                fach: s.fach
            })),
            erstellt: window.firebaseFunctions.formatGermanDate(),
            timestamp: window.firebaseFunctions.getTimestamp(),
            ersteller: window.firebaseFunctions.getCurrentUserName()
        };
        
        await window.firebaseDB.set(newGruppenRef, gruppe);
        
        // News für jeden betroffenen Lehrer erstellen
        const lehrer = [...new Set(ausgewaehlteSchueler.map(s => s.lehrer))];
        for (const lehrerName of lehrer) {
            const schuelerDesLehrers = ausgewaehlteSchueler
                .filter(s => s.lehrer === lehrerName)
                .map(s => `${s.vorname} ${s.nachname}`);
                
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
        document.getElementById('gruppenKlasseSelect').value = '';
        document.getElementById('verfuegbareSchueler').innerHTML = '<p>Bitte wählen Sie eine Klasse aus.</p>';
        document.getElementById('ausgewaehlteSchuelerAnzeige').innerHTML = '<p>Keine Schüler ausgewählt.</p>';
        ausgewaehlteSchueler = [];
        
        console.log('✅ Gruppe erstellt:', thema, 'mit', gruppe.schueler.length, 'Schülern');
        
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
        
        // Berechtigung prüfen - nur Ersteller kann bearbeiten
        if (gruppe.ersteller !== window.firebaseFunctions.getCurrentUserName() && !window.firebaseFunctions.isAdmin()) {
            alert('Sie können nur eigene Gruppen bearbeiten!');
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

// Edit-Schüler-Liste aufbauen
async function buildEditSchuelerListe() {
    const container = document.getElementById('editSchuelerListe');
    if (!container || !aktuelleGruppeEdit) return;
    
    // Lehrer laden für Selects
    const lehrerOptions = await getLehrerOptions();
    
    // Fach-Optionen
    const fachOptions = getFachOptions();
    
    let html = '';
    
    if (aktuelleGruppeEdit.schueler && Array.isArray(aktuelleGruppeEdit.schueler)) {
        aktuelleGruppeEdit.schueler.forEach((schueler, index) => {
            html += `
                <div class="edit-schueler-item-erweitert">
                    <span class="schueler-name">${schueler.vorname} ${schueler.nachname}</span>
                    <select class="edit-schueler-lehrer" data-index="${index}">
                        <option value="">Lehrer wählen...</option>
                        ${lehrerOptions.replace(`value="${schueler.lehrer}"`, `value="${schueler.lehrer}" selected`)}
                    </select>
                    <select class="edit-schueler-fach" data-index="${index}">
                        <option value="">Fach wählen...</option>
                        ${fachOptions.replace(`value="${schueler.fach || ''}"`, `value="${schueler.fach || ''}" selected`)}
                    </select>
                    <button class="btn btn-danger btn-sm" onclick="editSchuelerEntfernen(${index})">Entfernen</button>
                </div>
            `;
        });
    }
    
    container.innerHTML = html;
    
    // Event-Listener für Änderungen hinzufügen
    container.querySelectorAll('.edit-schueler-lehrer').forEach(select => {
        select.addEventListener('change', function() {
            const index = parseInt(this.getAttribute('data-index'));
            aktuelleGruppeEdit.schueler[index].lehrer = this.value;
        });
    });
    
    container.querySelectorAll('.edit-schueler-fach').forEach(select => {
        select.addEventListener('change', function() {
            const index = parseInt(this.getAttribute('data-index'));
            aktuelleGruppeEdit.schueler[index].fach = this.value;
        });
    });
}

// Schüler in Edit entfernen
function editSchuelerEntfernen(index) {
    if (aktuelleGruppeEdit.schueler.length <= 1) {
        alert('Mindestens ein Schüler muss vorhanden sein!');
        return;
    }
    
    const schueler = aktuelleGruppeEdit.schueler[index];
    if (confirm(`${schueler.vorname} ${schueler.nachname} aus der Gruppe entfernen?\n\nDer Schüler wird wieder für neue Gruppen verfügbar.`)) {
        aktuelleGruppeEdit.schueler.splice(index, 1);
        buildEditSchuelerListe();
    }
}

// Gruppen-Edit speichern
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
        
        if (aktuelleGruppeEdit.schueler.length === 0) {
            alert('Mindestens ein Schüler muss vorhanden sein!');
            return;
        }
        
        // Prüfen ob alle Schüler Lehrer und Fach haben
        const unvollstaendig = aktuelleGruppeEdit.schueler.filter(s => !s.lehrer || !s.fach);
        if (unvollstaendig.length > 0) {
            alert('Bitte weisen Sie allen Schülern einen Lehrer und ein Fach zu!');
            return;
        }
        
        // Aktualisierte Gruppe speichern
        const updatedGruppe = {
            ...aktuelleGruppeEdit,
            thema: neuesThema,
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
    try {
        // Gruppe aus Cache finden
        const gruppen = window.firebaseFunctions.getGruppenFromCache();
        const gruppe = gruppen.find(g => g.id === gruppenId);
        
        if (!gruppe) {
            alert('Gruppe nicht gefunden!');
            return;
        }
        
        // Berechtigung prüfen
        const kannLoeschen = window.firebaseFunctions.isAdmin() || 
                           gruppe.ersteller === window.firebaseFunctions.getCurrentUserName();
                           
        if (!kannLoeschen) {
            alert('Sie können nur eigene Gruppen löschen!');
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
    return getMeineGruppen();
}

// Export für andere Module
window.gruppenFunctions = {
    getGruppenForUser,
    updateKlassenauswahlForGruppen,
    checkGruppenAnlegenBerechtigung
};

console.log('✅ Firebase Gruppen-System bereit (mit Berechtigungsprüfung)');
