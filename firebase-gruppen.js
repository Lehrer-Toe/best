// Firebase Gruppen-System - Realtime Database
console.log('👥 Firebase Gruppen-System geladen');

// Globale Variablen für Gruppenbearbeitung
let aktuelleGruppeEdit = null;

// Gruppen laden und anzeigen - ERWEITERT
function loadGruppen() {
    console.log('👥 Lade Gruppen von Firebase...');
    
    if (!window.firebaseFunctions.requireAuth()) return;
    
    const liste = document.getElementById('gruppenListe');
    if (!liste) return;
    
    // UI-Berechtigung prüfen
    const isAdmin = window.firebaseFunctions.isAdmin();
    const currentUserName = window.firebaseFunctions.getCurrentUserName();
    
    // Gruppen-Erstellbereich nur für Admins anzeigen
    const erstellBereich = document.getElementById('gruppenErstellenBereich');
    if (erstellBereich) {
        erstellBereich.style.display = isAdmin ? 'block' : 'none';
    }
    
    // Gruppen aus Cache holen
    const alleGruppen = window.firebaseFunctions.getGruppenFromCache();
    
    // Gruppen filtern basierend auf Benutzerrolle
    let relevantGruppen = [];
    
    if (isAdmin) {
        // Admin sieht alle Gruppen
        relevantGruppen = alleGruppen;
        console.log('👥 Admin-Modus: Zeige alle', alleGruppen.length, 'Gruppen');
    } else {
        // Lehrer sieht nur Gruppen, in denen sie vorkommen
        relevantGruppen = alleGruppen.filter(gruppe => {
            // 1. Gruppen, die der Lehrer erstellt hat
            const istErsteller = gruppe.ersteller === currentUserName;
            
            // 2. Gruppen, in denen der Lehrer als Bewertender vorkommt
            const istBeteiligt = gruppe.schueler?.some(s => s.lehrer === currentUserName);
            
            return istErsteller || istBeteiligt;
        });
        console.log('👥 Lehrer-Modus für', currentUserName + ': Zeige', relevantGruppen.length, 'von', alleGruppen.length, 'Gruppen');
    }
    
    // Bewertungen für Statusanzeige laden
    const alleBewertungen = getAllBewertungsdata();
    
    if (relevantGruppen.length === 0) {
        liste.innerHTML = `
            <div class="card">
                <h3>Keine Gruppen gefunden</h3>
                <p>${isAdmin ? 
                    'Es wurden noch keine Gruppen erstellt. Erstellen Sie die erste Gruppe oben.' : 
                    'Sie sind noch keiner Gruppe zugewiesen. Wenden Sie sich an einen Administrator.'
                }</p>
            </div>`;
        return;
    }
    
    let html = '';
    relevantGruppen.forEach((gruppe) => {
        // Berechtigung prüfen - Admin oder beteiligte Lehrer können bearbeiten
        const istBeteiligt = gruppe.schueler?.some(s => s.lehrer === currentUserName);
        const kannBearbeiten = isAdmin || istBeteiligt;
        
        // Anzahl bewerteter Schüler ermitteln
        let bewerteteSchueler = 0;
        let gesamtSchueler = gruppe.schueler ? gruppe.schueler.length : 0;
        
        html += `<div class="liste-item">
            <div>
                <strong>${gruppe.thema}</strong><br>
                <small>Erstellt: ${gruppe.erstellt} von ${gruppe.ersteller || 'System'}</small><br>`;
        
        // Schüler-Details anzeigen
        if (gruppe.schueler && Array.isArray(gruppe.schueler)) {
            html += `<div style="margin-top: 0.5rem;">`;
            
            gruppe.schueler.forEach(schueler => {
                const fachInfo = schueler.fach ? ` (${window.firebaseFunctions.getFachNameFromGlobal(schueler.fach)})` : '';
                
                // Bewertungsstatus prüfen
                const schuelerId = `${gruppe.id}-${schueler.name.replace(/\s/g, '-')}`;
                const istBewertet = alleBewertungen.some(b => b.schuelerId === schuelerId);
                if (istBewertet) bewerteteSchueler++;
                
                const statusColor = istBewertet ? '#27ae60' : '#e74c3c'; // Grün oder Rot
                const statusIcon = istBewertet ? '✅' : '⏳';
                
                // Nur Schüler des aktuellen Lehrers oder alle (wenn Admin) hervorheben
                const istMeinSchueler = schueler.lehrer === currentUserName;
                const extraStyle = istMeinSchueler && !isAdmin ? 'border: 2px solid #3498db;' : '';
                
                html += `<div style="margin: 2px 0; padding: 3px 6px; background: ${statusColor}; color: white; border-radius: 3px; display: inline-block; margin-right: 5px; font-size: 0.85rem; ${extraStyle}">
                    ${statusIcon} ${schueler.name} → ${schueler.lehrer}${fachInfo}
                </div><br>`;
            });
            
            html += `</div>`;
            
            // Fortschrittsanzeige
            const fortschritt = gesamtSchueler > 0 ? Math.round((bewerteteSchueler / gesamtSchueler) * 100) : 0;
            const fortschrittColor = fortschritt === 100 ? '#27ae60' : fortschritt > 50 ? '#f39c12' : '#e74c3c';
            
            html += `<div style="margin-top: 0.5rem; font-size: 0.9rem;">
                <strong>Bewertungsfortschritt:</strong> 
                <span style="color: ${fortschrittColor};">${bewerteteSchueler}/${gesamtSchueler} (${fortschritt}%)</span>
                <div style="background: #ecf0f1; height: 8px; border-radius: 4px; margin-top: 3px;">
                    <div style="background: ${fortschrittColor}; height: 8px; border-radius: 4px; width: ${fortschritt}%;"></div>
                </div>
            </div>`;
        }
        
        html += `</div>
            <div>
                ${kannBearbeiten ? `<button class="btn" onclick="gruppeBearbeiten('${gruppe.id}')">Bearbeiten</button>` : ''}
                ${isAdmin ? `<button class="btn btn-danger" onclick="gruppeLoeschen('${gruppe.id}')">Löschen</button>` : ''}
            </div>
        </div>`;
    });
    
    liste.innerHTML = html;
    console.log('✅ Gruppen-Liste aktualisiert mit', relevantGruppen.length, 'Gruppen');
}

// Schüler und Lehrer-Selects aktualisieren
async function updateSchuelerSelects() {
    try {
        const lehrer = window.firebaseFunctions.getLehrerFromCache();
        const faecher = window.firebaseFunctions.getFaecherFromCache();
        
        // Lehrer-Optionen
        let lehrerOptions = '';
        lehrer.forEach(l => {
            lehrerOptions += `<option value="${l.name}">${l.name}</option>`;
        });
        
        // Fach-Optionen
        let fachOptions = '';
        faecher.forEach(f => {
            fachOptions += `<option value="${f.id}">${f.name}</option>`;
        });
        
        // Alle Lehrer-Selects aktualisieren
        document.querySelectorAll('.schueler-lehrer').forEach(select => {
            select.innerHTML = '<option value="">Lehrer wählen...</option>' + lehrerOptions;
        });
        
        // Alle Fach-Selects aktualisieren
        document.querySelectorAll('.schueler-fach').forEach(select => {
            select.innerHTML = '<option value="">Fach wählen...</option>' + fachOptions;
        });
        
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

// Neue Gruppe erstellen
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
            schueler.push({ name, lehrer, fach: fach || null });
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
        
        // Berechtigung prüfen
        const currentUserName = window.firebaseFunctions.getCurrentUserName();
        const istBeteiligt = gruppe.schueler?.some(s => s.lehrer === currentUserName);
        const kannBearbeiten = window.firebaseFunctions.isAdmin() || istBeteiligt;
        
        if (!kannBearbeiten) {
            alert('Sie haben keine Berechtigung, diese Gruppe zu bearbeiten!');
            return;
        }
        
        aktuelleGruppeEdit = { ...gruppe };
        
        // Modal öffnen und Felder füllen
        const modal = document.getElementById('gruppenEditModal');
        const themaInput = document.getElementById('editGruppenThema');
        
        if (modal && themaInput) {
            themaInput.value = gruppe.thema;
            modal.classList.remove('hidden');
            buildEditSchuelerListe();
        }
        
    } catch (error) {
        console.error('❌ Fehler beim Bearbeiten der Gruppe:', error);
        alert('Fehler beim Öffnen der Gruppe: ' + error.message);
    }
}

// Edit-Schüler-Liste aufbauen
function buildEditSchuelerListe() {
    const container = document.getElementById('editSchuelerListe');
    if (!container || !aktuelleGruppeEdit) return;
    
    let html = '';
    
    aktuelleGruppeEdit.schueler.forEach((schueler, index) => {
        html += `<div class="input-group edit-schueler-item">
            <input type="text" class="edit-schueler-name" value="${schueler.name}" placeholder="Schülername">
            <select class="edit-schueler-lehrer">
                <option value="">Lehrer wählen...</option>
            </select>
            <select class="edit-schueler-fach">
                <option value="">Fach wählen...</option>
            </select>
            <button type="button" class="btn btn-danger" onclick="schuelerAusEditEntfernen(${index})">Entfernen</button>
        </div>`;
    });
    
    container.innerHTML = html;
    
    // Selects mit aktuellen Werten füllen
    updateEditSchuelerSelects();
}

// Edit-Schüler-Selects aktualisieren
async function updateEditSchuelerSelects() {
    try {
        const lehrer = window.firebaseFunctions.getLehrerFromCache();
        const faecher = window.firebaseFunctions.getFaecherFromCache();
        
        // Lehrer-Optionen
        let lehrerOptions = '';
        lehrer.forEach(l => {
            lehrerOptions += `<option value="${l.name}">${l.name}</option>`;
        });
        
        // Fach-Optionen
        let fachOptions = '';
        faecher.forEach(f => {
            fachOptions += `<option value="${f.id}">${f.name}</option>`;
        });
        
        // Alle Edit-Selects aktualisieren und Werte setzen
        document.querySelectorAll('.edit-schueler-item').forEach((item, index) => {
            const schueler = aktuelleGruppeEdit.schueler[index];
            
            const lehrerSelect = item.querySelector('.edit-schueler-lehrer');
            if (lehrerSelect) {
                lehrerSelect.innerHTML = '<option value="">Lehrer wählen...</option>' + lehrerOptions;
                lehrerSelect.value = schueler.lehrer || '';
            }
            
            const fachSelect = item.querySelector('.edit-schueler-fach');
            if (fachSelect) {
                fachSelect.innerHTML = '<option value="">Fach wählen...</option>' + fachOptions;
                fachSelect.value = schueler.fach || '';
            }
        });
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der Edit-Optionen:', error);
    }
}

// Schüler aus Edit entfernen
function schuelerAusEditEntfernen(index) {
    if (!aktuelleGruppeEdit.schueler || aktuelleGruppeEdit.schueler.length <= 1) {
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
    
    aktuelleGruppeEdit.schueler.push({ name: '', lehrer: '', fach: '' });
    buildEditSchuelerListe();
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
        
        // Schüler-Daten sammeln
        const neueSchueler = [];
        const schuelerInputs = document.querySelectorAll('.edit-schueler-item');
        
        for (let item of schuelerInputs) {
            const name = item.querySelector('.edit-schueler-name')?.value.trim();
            const lehrer = item.querySelector('.edit-schueler-lehrer')?.value;
            const fach = item.querySelector('.edit-schueler-fach')?.value;
            
            if (name && lehrer) {
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
        
        if (!confirm(`Möchten Sie die Gruppe "${gruppe.thema}" wirklich löschen?\n\nDieser Vorgang kann nicht rückgängig gemacht werden!`)) {
            return;
        }
        
        const gruppenRef = window.firebaseFunctions.getDatabaseRef(`gruppen/${gruppenId}`);
        await window.firebaseDB.remove(gruppenRef);
        
        // News erstellen
        if (window.newsFunctions) {
            await window.newsFunctions.createNewsForAction(
                'Gruppe gelöscht', 
                `Die Gruppe "${gruppe.thema}" wurde gelöscht.`
            );
        }
        
        console.log('✅ Gruppe gelöscht:', gruppe.thema);
        alert(`Gruppe "${gruppe.thema}" wurde gelöscht!`);
        
    } catch (error) {
        console.error('❌ Fehler beim Löschen der Gruppe:', error);
        alert('Fehler beim Löschen der Gruppe: ' + error.message);
    }
}

// Hilfsfunktion: Alle Bewertungsdaten sammeln
function getAllBewertungsdata() {
    try {
        const alleBewertungen = [];
        const bewertungsData = window.firebaseFunctions.getBewertungenFromCache();
        
        // Bewertungen von allen Lehrern sammeln
        Object.values(bewertungsData).forEach(lehrerBewertungen => {
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
        console.error('❌ Fehler beim Sammeln der Bewertungsdaten:', error);
        return [];
    }
}

// Gruppen-Funktionen global verfügbar machen
window.gruppenFunctions = {
    loadGruppen,
    updateSchuelerSelects,
    schuelerHinzufuegen,
    schuelerEntfernen,
    gruppeErstellen,
    gruppeBearbeiten,
    gruppeEditSpeichern,
    gruppeEditAbbrechen,
    neuerSchuelerInEdit,
    schuelerAusEditEntfernen,
    gruppeLoeschen,
    getAllBewertungsdata
};

console.log('✅ Gruppen-System bereit mit erweiterten Funktionen');
