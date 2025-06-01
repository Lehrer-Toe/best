// Admin-Vorlagen System - NUR JSON-basiert, KEIN Firebase
console.log('⚙️ Admin-Vorlagen System geladen - JSON-basiert');

function loadAdminVorlagen() {
    console.log('⚙️ Lade Admin-Vorlagen...');
    
    if (!currentUser || currentUser.role !== 'admin') return;
    
    loadStaerkenFormulierungen();
    loadBriefvorlage();
}

function loadStaerkenFormulierungen() {
    console.log('📝 Lade Stärken-Formulierungen...');
    
    const container = document.getElementById('staerkenFormulierungen');
    if (!container) return;
    
    let html = '';
    
    // Gruppiere nach Kategorien
    Object.keys(bewertungsCheckpoints).forEach(kategorie => {
        html += `
            <div class="staerken-formulierung">
                <h4>${getKategorieIcon(kategorie)} ${kategorie}</h4>
        `;
        
        bewertungsCheckpoints[kategorie].forEach((checkpoint, index) => {
            const key = `${kategorie}_${index}`;
            const formulierung = staerkenFormulierungen[key] || checkpoint;
            
            html += `
                <div class="formulierung-item">
                    <label>${index}: ${checkpoint}</label>
                    <input type="text" 
                           value="${formulierung}" 
                           data-key="${key}"
                           placeholder="Formulierung mit [NAME] als Platzhalter"
                           onchange="formulierungGeaendert('${key}', this.value)">
                </div>
            `;
        });
        
        html += '</div>';
    });
    
    container.innerHTML = html;
}

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

function formulierungGeaendert(key, value) {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    staerkenFormulierungen[key] = value;
    console.log('✏️ Formulierung geändert:', key, '→', value);
}

function staerkenFormulierungenSpeichern() {
    if (!currentUser || currentUser.role !== 'admin') {
        alert('Keine Berechtigung!');
        return;
    }
    
    // Sammle alle Änderungen
    const inputs = document.querySelectorAll('#staerkenFormulierungen input[data-key]');
    inputs.forEach(input => {
        const key = input.getAttribute('data-key');
        const value = input.value.trim();
        if (value) {
            staerkenFormulierungen[key] = value;
        }
    });
    
    addNews('Formulierungen aktualisiert', 'Stärken-Formulierungen wurden bearbeitet.');
    alert('Formulierungen gespeichert!');
    
    console.log('✅ Stärken-Formulierungen gespeichert');
}

function loadBriefvorlage() {
    console.log('📄 Lade Briefvorlage...');
    
    const anredeTextarea = document.getElementById('briefAnrede');
    const schlussTextarea = document.getElementById('briefSchluss');
    
    if (anredeTextarea && briefvorlage.anrede) {
        anredeTextarea.value = briefvorlage.anrede;
    }
    
    if (schlussTextarea && briefvorlage.schluss) {
        schlussTextarea.value = briefvorlage.schluss;
    }
}

function briefvorlageSpeichern() {
    if (!currentUser || currentUser.role !== 'admin') {
        alert('Keine Berechtigung!');
        return;
    }
    
    const anrede = document.getElementById('briefAnrede').value.trim();
    const schluss = document.getElementById('briefSchluss').value.trim();
    
    if (!anrede || !schluss) {
        alert('Bitte füllen Sie beide Felder aus!');
        return;
    }
    
    briefvorlage.anrede = anrede;
    briefvorlage.schluss = schluss;
    
    addNews('Briefvorlage aktualisiert', 'Die Standard-Briefvorlage wurde bearbeitet.');
    alert('Briefvorlage gespeichert!');
    
    console.log('✅ Briefvorlage gespeichert');
}

// Vorlagen-Verwaltung für Lehrer
function loadVorlagen() {
    console.log('📋 Lade Vorlagen...');
    
    if (!currentUser) return;
    
    const liste = document.getElementById('vorlagenListe');
    if (!liste) return;
    
    const meineVorlagen = vorlagen[currentUser.email] || [];
    
    let html = '';
    if (meineVorlagen.length === 0) {
        html = '<div class="card"><p>Keine eigenen Vorlagen vorhanden. Nutzen Sie die Standard-Vorlage oder erstellen Sie eine neue.</p></div>';
    } else {
        meineVorlagen.forEach((vorlage, index) => {
            const gesamtGewichtung = vorlage.kategorien.reduce((sum, k) => sum + k.gewichtung, 0);
            const gewichtungStatus = gesamtGewichtung === 100 ? '✅' : '⚠️';
            
            html += `<div class="liste-item">
                <div>
                    <strong>${vorlage.name}</strong> ${gewichtungStatus}<br>
                    <small>Kategorien: ${vorlage.kategorien.map(k => `${k.name} (${k.gewichtung}%)`).join(', ')}</small><br>
                    <small>Gesamtgewichtung: ${gesamtGewichtung}%</small>
                </div>
                <div>
                    <button class="btn" onclick="vorlageBearbeiten(${index})">Bearbeiten</button>
                    <button class="btn btn-danger" onclick="vorlageLoeschen(${index})">Löschen</button>
                </div>
            </div>`;
        });
    }
    
    liste.innerHTML = html;
}

let aktuelleVorlageBearbeitung = null;

function neueVorlageErstellen() {
    const name = document.getElementById('vorlagenName').value.trim();
    if (!name) {
        alert('Bitte geben Sie einen Namen für die Vorlage ein!');
        return;
    }
    
    // Prüfe ob Name bereits existiert
    const meineVorlagen = vorlagen[currentUser.email] || [];
    if (meineVorlagen.find(v => v.name === name)) {
        alert('Eine Vorlage mit diesem Namen existiert bereits!');
        return;
    }
    
    aktuelleVorlageBearbeitung = {
        name: name,
        kategorien: [
            { name: 'Reflexion', gewichtung: 30 } // Fest verankert
        ],
        isNew: true
    };
    
    document.getElementById('vorlagenName').value = '';
    showVorlagenEditor();
}

function vorlageBearbeiten(index) {
    const meineVorlagen = vorlagen[currentUser.email] || [];
    if (index < 0 || index >= meineVorlagen.length) return;
    
    aktuelleVorlageBearbeitung = {
        ...JSON.parse(JSON.stringify(meineVorlagen[index])), // Deep copy
        originalIndex: index,
        isNew: false
    };
    
    showVorlagenEditor();
}

function showVorlagenEditor() {
    document.getElementById('vorlagenEditor').classList.remove('hidden');
    document.getElementById('vorlagenTitel').textContent = `Vorlage: ${aktuelleVorlageBearbeitung.name}`;
    
    updateKategorienListe();
    updateGewichtungAnzeige();
}

function updateKategorienListe() {
    const container = document.getElementById('kategorienListe');
    let html = '';
    
    aktuelleVorlageBearbeitung.kategorien.forEach((kategorie, index) => {
        const kannLoeschen = kategorie.name !== 'Reflexion'; // Reflexion nicht löschbar
        
        html += `<div class="card" style="margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong>${kategorie.name}</strong>
                    <span style="margin-left: 1rem; color: #666;">${kategorie.gewichtung}%</span>
                    ${kategorie.name === 'Reflexion' ? '<small style="color: #666; margin-left: 1rem;">(fest)</small>' : ''}
                </div>
                ${kannLoeschen ? `<button class="btn btn-danger btn-sm" onclick="kategorieEntfernen(${index})">Entfernen</button>` : ''}
            </div>
        </div>`;
    });
    
    container.innerHTML = html;
}

function kategorieHinzufuegen() {
    const name = document.getElementById('kategorieName').value.trim();
    const gewichtung = parseInt(document.getElementById('kategorieGewichtung').value);
    
    if (!name || !gewichtung) {
        alert('Bitte füllen Sie beide Felder aus!');
        return;
    }
    
    if (gewichtung < 1 || gewichtung > 70) {
        alert('Gewichtung muss zwischen 1 und 70% liegen!');
        return;
    }
    
    // Prüfe Gesamtgewichtung
    const aktuelleGewichtung = aktuelleVorlageBearbeitung.kategorien.reduce((sum, k) => sum + k.gewichtung, 0);
    if (aktuelleGewichtung + gewichtung > 100) {
        alert(`Gesamtgewichtung würde ${aktuelleGewichtung + gewichtung}% betragen. Maximum sind 100%!`);
        return;
    }
    
    // Prüfe ob Name bereits existiert
    if (aktuelleVorlageBearbeitung.kategorien.find(k => k.name === name)) {
        alert('Eine Kategorie mit diesem Namen existiert bereits!');
        return;
    }
    
    aktuelleVorlageBearbeitung.kategorien.push({ name, gewichtung });
    
    document.getElementById('kategorieName').value = '';
    document.getElementById('kategorieGewichtung').value = '';
    
    updateKategorienListe();
    updateGewichtungAnzeige();
}

function kategorieEntfernen(index) {
    if (aktuelleVorlageBearbeitung.kategorien[index].name === 'Reflexion') {
        alert('Reflexion kann nicht entfernt werden!');
        return;
    }
    
    aktuelleVorlageBearbeitung.kategorien.splice(index, 1);
    updateKategorienListe();
    updateGewichtungAnzeige();
}

function updateGewichtungAnzeige() {
    const gesamtGewichtung = aktuelleVorlageBearbeitung.kategorien.reduce((sum, k) => sum + k.gewichtung, 0);
    const anzeige = document.getElementById('aktuelleGewichtung');
    const status = document.getElementById('gewichtungStatus');
    
    anzeige.textContent = `${gesamtGewichtung}%`;
    
    if (gesamtGewichtung === 100) {
        status.className = 'gewichtung-anzeige';
    } else {
        status.className = 'gewichtung-anzeige gewichtung-warnung';
    }
}

function vorlageSpeichern() {
    const gesamtGewichtung = aktuelleVorlageBearbeitung.kategorien.reduce((sum, k) => sum + k.gewichtung, 0);
    
    if (gesamtGewichtung !== 100) {
        alert(`Gesamtgewichtung muss 100% betragen! Aktuell: ${gesamtGewichtung}%`);
        return;
    }
    
    if (!vorlagen[currentUser.email]) {
        vorlagen[currentUser.email] = [];
    }
    
    const vorlageData = {
        name: aktuelleVorlageBearbeitung.name,
        kategorien: [...aktuelleVorlageBearbeitung.kategorien]
    };
    
    if (aktuelleVorlageBearbeitung.isNew) {
        vorlagen[currentUser.email].push(vorlageData);
        addNews('Neue Vorlage', `Bewertungsvorlage "${vorlageData.name}" wurde erstellt.`);
    } else {
        vorlagen[currentUser.email][aktuelleVorlageBearbeitung.originalIndex] = vorlageData;
        addNews('Vorlage bearbeitet', `Bewertungsvorlage "${vorlageData.name}" wurde aktualisiert.`);
    }
    
    vorlagenEditorSchließen();
    loadVorlagen();
    
    console.log('✅ Vorlage gespeichert:', vorlageData.name);
}

function vorlageLoeschen(index) {
    const meineVorlagen = vorlagen[currentUser.email] || [];
    if (index < 0 || index >= meineVorlagen.length) return;
    
    const vorlage = meineVorlagen[index];
    if (confirm(`Vorlage "${vorlage.name}" wirklich löschen?`)) {
        meineVorlagen.splice(index, 1);
        addNews('Vorlage gelöscht', `Bewertungsvorlage "${vorlage.name}" wurde entfernt.`);
        loadVorlagen();
        console.log('🗑️ Vorlage gelöscht:', vorlage.name);
    }
}

function vorlagenEditorSchließen() {
    document.getElementById('vorlagenEditor').classList.add('hidden');
    aktuelleVorlageBearbeitung = null;
}

// Übersicht für Lehrer
function loadUebersicht() {
    console.log('📈 Lade Übersicht...');
    
    if (!currentUser || currentUser.role === 'admin') return;
    
    loadLehrerStatistiken();
    loadMeineSchuelerListe();
}

function loadLehrerStatistiken() {
    const container = document.getElementById('lehrerStatistiken');
    if (!container) return;
    
    // Sammle meine Schüler
    const meineSchueler = [];
    gruppen.forEach(gruppe => {
        gruppe.schueler.forEach(schueler => {
            if (schueler.lehrer === currentUser.name) {
                meineSchueler.push({
                    name: schueler.name,
                    thema: gruppe.thema,
                    schuelerId: `${gruppe.id}-${schueler.name.replace(/\s/g, '-')}`
                });
            }
        });
    });
    
    const meineBewertungen = bewertungen.filter(b => b.lehrer === currentUser.name);
    const bewertet = meineBewertungen.length;
    const offen = meineSchueler.length - bewertet;
    
    // Notendurchschnitt berechnen
    let durchschnitt = '-';
    if (meineBewertungen.length > 0) {
        const summe = meineBewertungen.reduce((sum, b) => sum + b.endnote, 0);
        durchschnitt = (summe / meineBewertungen.length).toFixed(2);
    }
    
    container.innerHTML = `
        <div class="statistik-card">
            <h4>Meine Statistiken</h4>
            <p><strong>Zugewiesene Schüler:</strong> ${meineSchueler.length}</p>
            <p><strong>Bewertete Schüler:</strong> ${bewertet}</p>
            <p><strong>Offene Bewertungen:</strong> ${offen}</p>
            <p><strong>Notendurchschnitt:</strong> ${durchschnitt}</p>
        </div>
    `;
}

function loadMeineSchuelerListe() {
    const liste = document.getElementById('meineSchuelerListe');
    if (!liste) return;
    
    // Sammle alle meine Schüler mit Bewertungen
    const meineSchueler = [];
    gruppen.forEach(gruppe => {
        gruppe.schueler.forEach(schueler => {
            if (schueler.lehrer === currentUser.name) {
                const schuelerId = `${gruppe.id}-${schueler.name.replace(/\s/g, '-')}`;
                const bewertung = bewertungen.find(b => b.schuelerId === schuelerId);
                
                meineSchueler.push({
                    name: schueler.name,
                    thema: gruppe.thema,
                    schuelerId: schuelerId,
                    bewertung: bewertung,
                    status: bewertung ? 'bewertet' : 'offen'
                });
            }
        });
    });
    
    if (meineSchueler.length === 0) {
        liste.innerHTML = '<div class="card"><p>Keine Schüler zugewiesen.</p></div>';
        return;
    }
    
    // Filter und Sortierung anwenden
    let gefilterteSchueler = [...meineSchueler];
    
    // Status-Filter
    if (uebersichtFilter.status !== 'alle') {
        gefilterteSchueler = gefilterteSchueler.filter(s => s.status === uebersichtFilter.status);
    }
    
    // Sortierung
    gefilterteSchueler.sort((a, b) => {
        switch (uebersichtFilter.sortierung) {
            case 'name-za':
                return b.name.localeCompare(a.name);
            case 'note-auf':
                if (!a.bewertung && !b.bewertung) return 0;
                if (!a.bewertung) return 1;
                if (!b.bewertung) return -1;
                return a.bewertung.endnote - b.bewertung.endnote;
            case 'note-ab':
                if (!a.bewertung && !b.bewertung) return 0;
                if (!a.bewertung) return 1;
                if (!b.bewertung) return -1;
                return b.bewertung.endnote - a.bewertung.endnote;
            case 'datum':
                if (!a.bewertung && !b.bewertung) return 0;
                if (!a.bewertung) return 1;
                if (!b.bewertung) return -1;
                return new Date(b.bewertung.datum) - new Date(a.bewertung.datum);
            default: // name-az
                return a.name.localeCompare(b.name);
        }
    });
    
    let html = '';
    gefilterteSchueler.forEach(schueler => {
        const statusClass = schueler.status === 'bewertet' ? 'bewertet' : 'nicht-bewertet';
        const statusText = schueler.status === 'bewertet' ? 'Bewertet' : 'Offen';
        const note = schueler.bewertung ? ` - Note: ${schueler.bewertung.endnote}` : '';
        const datum = schueler.bewertung ? ` - ${schueler.bewertung.datum}` : '';
        
        html += `<div class="liste-item">
            <div>
                <strong>${schueler.name}</strong><br>
                <small>Thema: ${schueler.thema}</small><br>
                <span class="status-badge ${statusClass}">${statusText}${note}${datum}</span>
            </div>
            <div>
                ${schueler.bewertung ? 
                    `<button class="btn pdf-btn-enabled" onclick="generatePDF('${schueler.schuelerId}')">PDF</button>` :
                    ''}
            </div>
        </div>`;
    });
    
    liste.innerHTML = html;
}

// Filter-Funktionen für Übersicht (globale Funktionen)
let uebersichtFilter = {
    sortierung: 'name-az',
    status: 'alle'
};

function updateUebersichtFilter(typ, wert) {
    uebersichtFilter[typ] = wert;
    loadMeineSchuelerListe(); // Neu laden mit Filter
}

function meineSchuelerExportieren() {
    if (!currentUser) return;
    
    // Sammle alle meine Daten
    const meineSchueler = [];
    gruppen.forEach(gruppe => {
        gruppe.schueler.forEach(schueler => {
            if (schueler.lehrer === currentUser.name) {
                const schuelerId = `${gruppe.id}-${schueler.name.replace(/\s/g, '-')}`;
                const bewertung = bewertungen.find(b => b.schuelerId === schuelerId);
                
                meineSchueler.push({
                    schueler: schueler.name,
                    thema: gruppe.thema,
                    fach: schueler.fach,
                    bewertung: bewertung || null
                });
            }
        });
    });
    
    const exportData = {
        lehrer: currentUser.name,
        exportDatum: new Date().toISOString(),
        schuljahr: schuljahr,
        schueler: meineSchueler
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentUser.name}_${schuljahr.replace('/', '-')}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('📤 Meine Daten exportiert');
}

function druckansichtÖffnen() {
    // Einfache Druckansicht für Übersicht
    window.print();
}

console.log('✅ Admin-Vorlagen System vollständig geladen');