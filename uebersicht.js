// Firebase Übersicht-System - Realtime Database
console.log('📈 Firebase Übersicht-System geladen');

// Globale Variablen für Filter
let uebersichtFilter = {
    sortierung: 'name-az',
    status: 'alle'
};

// Übersicht laden
function loadUebersicht() {
    console.log('📈 Lade Übersicht von Firebase...');
    
    if (!window.firebaseFunctions.requireAuth()) return;
    
    // Statistiken laden
    loadLehrerStatistiken();
    
    // Schüler-Liste laden
    loadMeineSchuelerListe();
}

// Lehrer-Statistiken laden
async function loadLehrerStatistiken() {
    console.log('📊 Lade Lehrer-Statistiken...');
    
    const container = document.getElementById('lehrerStatistiken');
    if (!container) return;
    
    try {
        const currentUserName = window.firebaseFunctions.getCurrentUserName();
        
        // Gruppen des Lehrers sammeln
        const gruppen = window.firebaseFunctions.getGruppenFromCache();
        const meineGruppen = gruppen.filter(gruppe => 
            gruppe.schueler && gruppe.schueler.some(s => s.lehrer === currentUserName)
        );
        
        // Schüler sammeln
        let meineSchueler = [];
        meineGruppen.forEach(gruppe => {
            gruppe.schueler.forEach(schueler => {
                if (schueler.lehrer === currentUserName) {
                    meineSchueler.push({
                        name: schueler.name,
                        thema: gruppe.thema,
                        schuelerId: `${gruppe.id}-${schueler.name.replace(/\s/g, '-')}`,
                        fach: schueler.fach
                    });
                }
            });
        });
        
        // Bewertungen sammeln
        const bewertungen = window.firebaseFunctions.getBewertungenFromCache();
        const bewertet = bewertungen.length;
        const nichtBewertet = meineSchueler.length - bewertet;
        
        // Notendurchschnitt berechnen
        let notendurchschnitt = 0;
        if (bewertungen.length > 0) {
            const notenSumme = bewertungen.reduce((sum, b) => sum + (b.endnote || 0), 0);
            notendurchschnitt = (notenSumme / bewertungen.length).toFixed(1);
        }
        
        // Fächer-Verteilung
        const faecherCount = {};
        meineSchueler.forEach(schueler => {
            if (schueler.fach) {
                const fachName = window.firebaseFunctions.getFachNameFromGlobal(schueler.fach);
                faecherCount[fachName] = (faecherCount[fachName] || 0) + 1;
            }
        });
        
        // Letzte Bewertung
        let letzteBewertung = 'Keine';
        if (bewertungen.length > 0) {
            const sorted = bewertungen.sort((a, b) => 
                new Date(b.timestamp || b.datum) - new Date(a.timestamp || a.datum)
            );
            letzteBewertung = sorted[0].datum + ' - ' + sorted[0].schuelerName;
        }
        
        let html = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                <div class="statistik-card">
                    <h4>👥 Schüler gesamt</h4>
                    <div style="font-size: 2rem; font-weight: bold; color: #2c3e50;">${meineSchueler.length}</div>
                </div>
                
                <div class="statistik-card">
                    <h4>✅ Bewertet</h4>
                    <div style="font-size: 2rem; font-weight: bold; color: #27ae60;">${bewertet}</div>
                </div>
                
                <div class="statistik-card">
                    <h4>⏳ Ausstehend</h4>
                    <div style="font-size: 2rem; font-weight: bold; color: #e74c3c;">${nichtBewertet}</div>
                </div>
                
                <div class="statistik-card">
                    <h4>📊 Notenschnitt</h4>
                    <div style="font-size: 2rem; font-weight: bold; color: #667eea;">${notendurchschnitt || '-'}</div>
                </div>
            </div>
            
            <div style="margin-top: 2rem;">
                <h4>📚 Fächer-Verteilung</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;">
                    ${Object.entries(faecherCount).map(([fach, count]) => 
                        `<span class="fach-badge">${fach}: ${count}</span>`
                    ).join('')}
                </div>
            </div>
            
            <div style="margin-top: 2rem;">
                <h4>🕒 Letzte Bewertung</h4>
                <p>${letzteBewertung}</p>
            </div>
            
            <div style="margin-top: 2rem;">
                <h4>📈 Bewertungsfortschritt</h4>
                <div style="background: #f8f9fa; border-radius: 10px; overflow: hidden;">
                    <div style="background: #27ae60; height: 20px; width: ${(bewertet / meineSchueler.length * 100)}%; transition: width 0.3s;"></div>
                </div>
                <small>${Math.round(bewertet / meineSchueler.length * 100)}% abgeschlossen</small>
            </div>
        `;
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der Statistiken:', error);
        container.innerHTML = '<p style="color: #e74c3c;">Fehler beim Laden der Statistiken!</p>';
    }
}

// Meine Schüler-Liste laden
async function loadMeineSchuelerListe() {
    console.log('👥 Lade meine Schüler-Liste...');
    
    const container = document.getElementById('meineSchuelerListe');
    if (!container) return;
    
    try {
        const currentUserName = window.firebaseFunctions.getCurrentUserName();
        
        // Schüler aus Gruppen sammeln
        const gruppen = window.firebaseFunctions.getGruppenFromCache();
        let meineSchueler = [];
        
        gruppen.forEach(gruppe => {
            if (gruppe.schueler) {
                gruppe.schueler.forEach(schueler => {
                    if (schueler.lehrer === currentUserName) {
                        meineSchueler.push({
                            name: schueler.name,
                            thema: gruppe.thema,
                            schuelerId: `${gruppe.id}-${schueler.name.replace(/\s/g, '-')}`,
                            fach: schueler.fach,
                            fachName: schueler.fach ? window.firebaseFunctions.getFachNameFromGlobal(schueler.fach) : 'Allgemein'
                        });
                    }
                });
            }
        });
        
        // Bewertungen hinzufügen
        const bewertungen = window.firebaseFunctions.getBewertungenFromCache();
        meineSchueler.forEach(schueler => {
            const bewertung = bewertungen.find(b => b.schuelerId === schueler.schuelerId);
            schueler.bewertung = bewertung;
            schueler.status = bewertung ? 'bewertet' : 'nicht-bewertet';
        });
        
        // Filter anwenden
        const gefilterteSchueler = filterSchueler(meineSchueler);
        
        if (gefilterteSchueler.length === 0) {
            container.innerHTML = '<div class="card"><p>Keine Schüler gefunden.</p></div>';
            return;
        }
        
        let html = '';
        gefilterteSchueler.forEach(schueler => {
            const statusColor = schueler.status === 'bewertet' ? '#27ae60' : '#e74c3c';
            const statusText = schueler.status === 'bewertet' ? 'Bewertet' : 'Ausstehend';
            
            html += `
                <div class="liste-item">
                    <div>
                        <strong>${schueler.name}</strong>
                        <span class="fach-badge">${schueler.fachName}</span><br>
                        <small>Thema: ${schueler.thema}</small><br>
                        <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span>
                        ${schueler.bewertung ? `<br><small>Note: ${schueler.bewertung.endnote} | Bewertet am: ${schueler.bewertung.datum}</small>` : ''}
                    </div>
                    <div>
                        ${schueler.bewertung ? 
                            `<button class="btn" onclick="window.bewertungsFunctions && window.bewertungsFunctions.loadBewertungen(); openTab('bewerten');">Bearbeiten</button>
                             <button class="btn pdf-btn-enabled" onclick="window.pdfFunctions.createPDF('${schueler.schuelerId}')">PDF</button>` :
                            `<button class="btn" onclick="window.bewertungsFunctions && window.bewertungsFunctions.loadBewertungen(); openTab('bewerten');">Bewerten</button>`
                        }
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der Schüler-Liste:', error);
        container.innerHTML = '<div class="card"><p style="color: #e74c3c;">Fehler beim Laden der Schüler-Liste!</p></div>';
    }
}

// Schüler filtern
function filterSchueler(schueler) {
    let gefiltert = [...schueler];
    
    // Status-Filter
    if (uebersichtFilter.status !== 'alle') {
        gefiltert = gefiltert.filter(s => s.status === uebersichtFilter.status);
    }
    
    // Sortierung
    switch (uebersichtFilter.sortierung) {
        case 'name-az':
            gefiltert.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'name-za':
            gefiltert.sort((a, b) => b.name.localeCompare(a.name));
            break;
        case 'note-auf':
            gefiltert.sort((a, b) => {
                const noteA = a.bewertung?.endnote || 7; // Unbewertete ans Ende
                const noteB = b.bewertung?.endnote || 7;
                return noteA - noteB;
            });
            break;
        case 'note-ab':
            gefiltert.sort((a, b) => {
                const noteA = a.bewertung?.endnote || 0; // Unbewertete ans Ende
                const noteB = b.bewertung?.endnote || 0;
                return noteB - noteA;
            });
            break;
        case 'datum':
            gefiltert.sort((a, b) => {
                const datumA = a.bewertung?.timestamp || '0';
                const datumB = b.bewertung?.timestamp || '0';
                return new Date(datumB) - new Date(datumA);
            });
            break;
    }
    
    return gefiltert;
}

// Übersicht-Filter aktualisieren
function updateUebersichtFilter(filterType, value) {
    uebersichtFilter[filterType] = value;
    console.log('🔍 Filter aktualisiert:', filterType, '=', value);
    
    // Schüler-Liste neu laden
    loadMeineSchuelerListe();
}

// Meine Schüler exportieren
async function meineSchuelerExportieren() {
    console.log('📤 Exportiere meine Schüler-Daten...');
    
    if (!window.firebaseFunctions.requireAuth()) return;
    
    try {
        const currentUserName = window.firebaseFunctions.getCurrentUserName();
        
        // Daten sammeln
        const gruppen = window.firebaseFunctions.getGruppenFromCache();
        const bewertungen = window.firebaseFunctions.getBewertungenFromCache();
        
        const exportData = {
            lehrer: currentUserName,
            exportDatum: new Date().toISOString(),
            schüler: [],
            statistiken: {}
        };
        
        // Schüler sammeln
        gruppen.forEach(gruppe => {
            if (gruppe.schueler) {
                gruppe.schueler.forEach(schueler => {
                    if (schueler.lehrer === currentUserName) {
                        const schuelerId = `${gruppe.id}-${schueler.name.replace(/\s/g, '-')}`;
                        const bewertung = bewertungen.find(b => b.schuelerId === schuelerId);
                        
                        exportData.schüler.push({
                            name: schueler.name,
                            thema: gruppe.thema,
                            fach: schueler.fach,
                            fachName: schueler.fach ? window.firebaseFunctions.getFachNameFromGlobal(schueler.fach) : 'Allgemein',
                            bewertung: bewertung || null
                        });
                    }
                });
            }
        });
        
        // Statistiken hinzufügen
        const bewertet = bewertungen.length;
        const gesamt = exportData.schüler.length;
        const notendurchschnitt = bewertet > 0 ? 
            (bewertungen.reduce((sum, b) => sum + b.endnote, 0) / bewertet).toFixed(1) : null;
        
        exportData.statistiken = {
            gesamt,
            bewertet,
            nichtBewertet: gesamt - bewertet,
            fortschritt: Math.round((bewertet / gesamt) * 100),
            notendurchschnitt
        };
        
        // JSON-Export erstellen
        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Download starten
        const link = document.createElement('a');
        link.href = url;
        link.download = `meine-schueler-${currentUserName}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log('✅ Export erstellt:', exportData.schüler.length, 'Schüler');
        alert(`Export erfolgreich erstellt!\n${exportData.schüler.length} Schüler exportiert.`);
        
    } catch (error) {
        console.error('❌ Fehler beim Export:', error);
        alert('Fehler beim Export: ' + error.message);
    }
}

// Druckansicht öffnen
function druckansichtÖffnen() {
    console.log('🖨️ Öffne Druckansicht...');
    
    if (!window.firebaseFunctions.requireAuth()) return;
    
    // Druckansicht in neuem Fenster
    const popup = window.open('', '_blank', 'width=800,height=1000');
    
    generateDruckansicht(popup);
}

// Druckansicht generieren
async function generateDruckansicht(popup) {
    try {
        const currentUserName = window.firebaseFunctions.getCurrentUserName();
        
        // Daten sammeln
        const gruppen = window.firebaseFunctions.getGruppenFromCache();
        const bewertungen = window.firebaseFunctions.getBewertungenFromCache();
        
        let meineSchueler = [];
        gruppen.forEach(gruppe => {
            if (gruppe.schueler) {
                gruppe.schueler.forEach(schueler => {
                    if (schueler.lehrer === currentUserName) {
                        const schuelerId = `${gruppe.id}-${schueler.name.replace(/\s/g, '-')}`;
                        const bewertung = bewertungen.find(b => b.schuelerId === schuelerId);
                        
                        meineSchueler.push({
                            name: schueler.name,
                            thema: gruppe.thema,
                            fach: schueler.fach ? window.firebaseFunctions.getFachNameFromGlobal(schueler.fach) : 'Allgemein',
                            bewertung
                        });
                    }
                });
            }
        });
        
        // Sortieren
        meineSchueler.sort((a, b) => a.name.localeCompare(b.name));
        
        // Statistiken
        const bewertet = bewertungen.length;
        const gesamt = meineSchueler.length;
        const notendurchschnitt = bewertet > 0 ? 
            (bewertungen.reduce((sum, b) => sum + b.endnote, 0) / bewertet).toFixed(1) : 'N/A';
        
        const config = window.firebaseFunctions.dataCache.config;
        const schuljahr = config?.schuljahr || '2025/26';
        
        const htmlContent = `
            <!DOCTYPE html>
            <html lang="de">
            <head>
                <meta charset="UTF-8">
                <title>Übersicht ${currentUserName} - ${schuljahr}</title>
                <style>
                    body {
                        font-family: 'Times New Roman', serif;
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 40px;
                        line-height: 1.6;
                        background: white;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 40px;
                        border-bottom: 2px solid #333;
                        padding-bottom: 20px;
                    }
                    .header h1 {
                        color: #2c3e50;
                        margin: 0;
                    }
                    .statistiken {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                        gap: 20px;
                        margin: 30px 0;
                        padding: 20px;
                        background: #f8f9fa;
                        border-radius: 10px;
                    }
                    .stat-item {
                        text-align: center;
                    }
                    .stat-value {
                        font-size: 2rem;
                        font-weight: bold;
                        color: #667eea;
                    }
                    .schueler-tabelle {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 30px 0;
                    }
                    .schueler-tabelle th,
                    .schueler-tabelle td {
                        border: 1px solid #ddd;
                        padding: 12px;
                        text-align: left;
                    }
                    .schueler-tabelle th {
                        background: #2c3e50;
                        color: white;
                    }
                    .schueler-tabelle tr:nth-child(even) {
                        background: #f9f9f9;
                    }
                    .status-bewertet {
                        color: #27ae60;
                        font-weight: bold;
                    }
                    .status-ausstehend {
                        color: #e74c3c;
                        font-weight: bold;
                    }
                    .print-btn {
                        position: fixed;
                        top: 10px;
                        right: 10px;
                        background: #667eea;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        z-index: 1000;
                    }
                    @media print {
                        .print-btn { display: none; }
                        body { padding: 20px; }
                        @page { margin: 2cm; }
                    }
                </style>
            </head>
            <body>
                <button class="print-btn" onclick="window.print()">🖨️ Drucken</button>
                
                <div class="header">
                    <h1>Übersicht: ${currentUserName}</h1>
                    <p>Schuljahr ${schuljahr} • Stand: ${new Date().toLocaleDateString('de-DE')}</p>
                </div>
                
                <div class="statistiken">
                    <div class="stat-item">
                        <div class="stat-value">${gesamt}</div>
                        <div>Schüler gesamt</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${bewertet}</div>
                        <div>Bewertet</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${gesamt - bewertet}</div>
                        <div>Ausstehend</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${notendurchschnitt}</div>
                        <div>⌀ Note</div>
                    </div>
                </div>
                
                <table class="schueler-tabelle">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Fach</th>
                            <th>Thema</th>
                            <th>Status</th>
                            <th>Note</th>
                            <th>Datum</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${meineSchueler.map(schueler => `
                            <tr>
                                <td>${schueler.name}</td>
                                <td>${schueler.fach}</td>
                                <td>${schueler.thema}</td>
                                <td class="${schueler.bewertung ? 'status-bewertet' : 'status-ausstehend'}">
                                    ${schueler.bewertung ? 'Bewertet' : 'Ausstehend'}
                                </td>
                                <td>${schueler.bewertung ? schueler.bewertung.endnote : '-'}</td>
                                <td>${schueler.bewertung ? schueler.bewertung.datum : '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #666;">
                    Erstellt am ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE')}<br>
                    <em>Generiert mit "Zeig, was du kannst!" • Firebase Edition</em>
                </div>
            </body>
            </html>
        `;
        
        popup.document.write(htmlContent);
        popup.document.close();
        
    } catch (error) {
        console.error('❌ Fehler bei Druckansicht:', error);
        popup.document.write('<html><body><p>Fehler beim Generieren der Druckansicht!</p></body></html>');
        popup.document.close();
    }
}

// Export für andere Module
window.uebersichtFunctions = {
    loadUebersicht,
    updateUebersichtFilter,
    meineSchuelerExportieren,
    druckansichtÖffnen
};

console.log('✅ Firebase Übersicht-System bereit');
