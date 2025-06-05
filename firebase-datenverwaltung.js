// Firebase Datenverwaltung - Realtime Database
console.log('🗄️ Firebase Datenverwaltung geladen');

// Statistiken laden
async function loadStatistiken() {
    console.log('📊 Lade System-Statistiken...');
    
    if (!window.firebaseFunctions.requireAdmin()) return;
    
    const container = document.getElementById('statistiken');
    if (!container) return;
    
    try {
        // Alle Daten aus Firebase laden
        const stats = await calculateSystemStatistiken();
        
        let html = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                <div class="statistik-card">
                    <h4>👥 Benutzer</h4>
                    <div style="font-size: 2rem; font-weight: bold; color: #2c3e50;">${stats.users.total}</div>
                    <small>Davon ${stats.users.lehrer} Lehrer</small>
                </div>
                
                <div class="statistik-card">
                    <h4>🏫 Klassen</h4>
                    <div style="font-size: 2rem; font-weight: bold; color: #9b59b6;">${stats.klassen.total}</div>
                    <small>${stats.klassen.schueler} Schüler gesamt</small>
                </div>
                
                <div class="statistik-card">
                    <h4>👥 Gruppen</h4>
                    <div style="font-size: 2rem; font-weight: bold; color: #667eea;">${stats.gruppen.total}</div>
                    <small>${stats.gruppen.schueler} zugewiesene Schüler</small>
                </div>
                
                <div class="statistik-card">
                    <h4>📊 Bewertungen</h4>
                    <div style="font-size: 2rem; font-weight: bold; color: #27ae60;">${stats.bewertungen.total}</div>
                    <small>⌀ Note: ${stats.bewertungen.durchschnitt}</small>
                </div>
                
                <div class="statistik-card">
                    <h4>📰 News</h4>
                    <div style="font-size: 2rem; font-weight: bold; color: #f39c12;">${stats.news.total}</div>
                    <small>${stats.news.wichtig} wichtige</small>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
                <div class="statistik-card">
                    <h4>📚 Aktivste Fächer</h4>
                    ${Object.entries(stats.faecher).slice(0, 5).map(([fach, count]) => 
                        `<div style="display: flex; justify-content: space-between; margin: 5px 0;">
                            <span>${fach}</span>
                            <span class="fach-badge">${count}</span>
                        </div>`
                    ).join('')}
                </div>
                
                <div class="statistik-card">
                    <h4>🎯 Bewertungsfortschritt</h4>
                    <div style="background: #f8f9fa; border-radius: 10px; overflow: hidden; margin: 10px 0;">
                        <div style="background: #27ae60; height: 20px; width: ${stats.bewertungen.fortschritt}%; transition: width 0.3s;"></div>
                    </div>
                    <small>${stats.bewertungen.fortschritt}% aller Schüler bewertet</small>
                </div>
            </div>
            
            <div style="margin-top: 2rem;">
                <h4>🕒 Letzte Aktivitäten</h4>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 10px;">
                    ${stats.aktivitaeten.map(aktivitaet => 
                        `<div style="padding: 5px 0; border-bottom: 1px solid #e1e8ed;">
                            <strong>${aktivitaet.typ}</strong> - ${aktivitaet.text}
                            <br><small style="color: #666;">${aktivitaet.datum}</small>
                        </div>`
                    ).join('')}
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('❌ Fehler beim Laden der Statistiken:', error);
        container.innerHTML = '<p style="color: #e74c3c;">Fehler beim Laden der Statistiken!</p>';
    }
}

// System-Statistiken berechnen
async function calculateSystemStatistiken() {
    const stats = {
        users: { total: 0, lehrer: 0, admin: 0 },
        gruppen: { total: 0, schueler: 0 },
        klassen: { total: 0, schueler: 0 }, // NEU: Klassen-Statistiken
        bewertungen: { total: 0, durchschnitt: 0, fortschritt: 0 },
        news: { total: 0, wichtig: 0 },
        faecher: {},
        aktivitaeten: []
    };
    
    try {
        // Benutzer-Statistiken
        const usersRef = window.firebaseFunctions.getDatabaseRef('users');
        const usersSnapshot = await window.firebaseDB.get(usersRef);
        if (usersSnapshot.exists()) {
            const users = usersSnapshot.val();
            stats.users.total = Object.keys(users).length;
            stats.users.lehrer = Object.values(users).filter(u => u.role === 'lehrer').length;
            stats.users.admin = Object.values(users).filter(u => u.role === 'admin').length;
        }
        
        // Gruppen-Statistiken
        const gruppen = window.firebaseFunctions.getGruppenFromCache();
        stats.gruppen.total = gruppen.length;
        gruppen.forEach(gruppe => {
            if (gruppe.schueler) {
                stats.gruppen.schueler += gruppe.schueler.length;
                
                // Fächer zählen
                gruppe.schueler.forEach(schueler => {
                    if (schueler.fach) {
                        const fachName = window.firebaseFunctions.getFachNameFromGlobal(schueler.fach);
                        stats.faecher[fachName] = (stats.faecher[fachName] || 0) + 1;
                    }
                });
            }
        });
        
        // NEU: Klassen-Statistiken
        const klassen = window.firebaseFunctions.getKlassenFromCache();
        stats.klassen.total = klassen.length;
        klassen.forEach(klasse => {
            if (klasse.schueler) {
                stats.klassen.schueler += klasse.schueler.length;
            }
        });
        
        // Bewertungen-Statistiken
        const bewertungenRef = window.firebaseFunctions.getDatabaseRef('bewertungen');
        const bewertungenSnapshot = await window.firebaseDB.get(bewertungenRef);
        if (bewertungenSnapshot.exists()) {
            const alleBewertungen = bewertungenSnapshot.val();
            let bewertungenCount = 0;
            let notenSumme = 0;
            
            Object.values(alleBewertungen).forEach(lehrerBewertungen => {
                Object.values(lehrerBewertungen).forEach(bewertung => {
                    bewertungenCount++;
                    if (bewertung.endnote) {
                        notenSumme += bewertung.endnote;
                    }
                });
            });
            
            stats.bewertungen.total = bewertungenCount;
            stats.bewertungen.durchschnitt = bewertungenCount > 0 ? 
                (notenSumme / bewertungenCount).toFixed(1) : '0';
            stats.bewertungen.fortschritt = stats.gruppen.schueler > 0 ? 
                Math.round((bewertungenCount / stats.gruppen.schueler) * 100) : 0;
        }
        
        // News-Statistiken
        const news = window.firebaseFunctions.getNewsFromCache();
        stats.news.total = news.length;
        stats.news.wichtig = news.filter(n => n.wichtig).length;
        
        // Fächer sortieren
        stats.faecher = Object.fromEntries(
            Object.entries(stats.faecher).sort(([,a], [,b]) => b - a)
        );
        
        // Letzte Aktivitäten sammeln
        stats.aktivitaeten = getRecentActivities(gruppen, news).slice(0, 5);
        
    } catch (error) {
        console.error('❌ Fehler beim Berechnen der Statistiken:', error);
    }
    
    return stats;
}

// Letzte Aktivitäten sammeln
function getRecentActivities(gruppen, news) {
    const aktivitaeten = [];
    
    // News hinzufügen
    news.forEach(item => {
        aktivitaeten.push({
            typ: item.wichtig ? '📢 Wichtige News' : '📰 News',
            text: item.titel,
            datum: item.datum,
            timestamp: item.timestamp || item.datum
        });
    });
    
    // Gruppen hinzufügen
    gruppen.forEach(gruppe => {
        aktivitaeten.push({
            typ: '👥 Gruppe erstellt',
            text: `"${gruppe.thema}" mit ${gruppe.schueler?.length || 0} Schülern`,
            datum: gruppe.erstellt,
            timestamp: gruppe.timestamp || gruppe.erstellt
        });
    });
    
    // Nach Datum sortieren (neueste zuerst)
    return aktivitaeten.sort((a, b) => 
        new Date(b.timestamp || b.datum) - new Date(a.timestamp || a.datum)
    );
}

// Daten exportieren
async function datenExportieren(typ) {
    console.log('📤 Exportiere Daten:', typ);
    
    if (!window.firebaseFunctions.requireAdmin()) return;
    
    try {
        let exportData = {};
        let filename = '';
        
        switch (typ) {
            case 'alle':
                exportData = await exportAlleData();
                filename = `system-export-${new Date().toISOString().split('T')[0]}.json`;
                break;
                
            case 'bewertungen':
                exportData = await exportBewertungen();
                filename = `bewertungen-export-${new Date().toISOString().split('T')[0]}.json`;
                break;
                
            case 'gruppen':
                exportData = await exportGruppen();
                filename = `gruppen-export-${new Date().toISOString().split('T')[0]}.json`;
                break;
                
            case 'klassen':
                exportData = await exportKlassen();
                filename = `klassen-export-${new Date().toISOString().split('T')[0]}.json`;
                break;
                
            default:
                alert('Unbekannter Export-Typ!');
                return;
        }
        
        // JSON-Export erstellen
        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Download starten
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log('✅ Export erstellt:', filename);
        alert(`Export "${typ}" erfolgreich erstellt!`);
        
    } catch (error) {
        console.error('❌ Fehler beim Export:', error);
        alert('Fehler beim Export: ' + error.message);
    }
}

// Alle Daten exportieren
async function exportAlleData() {
    const exportData = {
        exportInfo: {
            typ: 'Vollständiger System-Export',
            datum: new Date().toISOString(),
            exportiert_von: window.firebaseFunctions.getCurrentUserName(),
            version: '1.0'
        }
    };
    
    // Alle Bereiche der Firebase Database laden
    const bereiche = ['users', 'gruppen', 'klassen', 'bewertungen', 'news', 'themen', 'vorlagen', 'system', 'config'];
    
    for (const bereich of bereiche) {
        try {
            const ref = window.firebaseFunctions.getDatabaseRef(bereich);
            const snapshot = await window.firebaseDB.get(ref);
            exportData[bereich] = snapshot.exists() ? snapshot.val() : {};
        } catch (error) {
            console.warn(`Bereich ${bereich} konnte nicht exportiert werden:`, error);
            exportData[bereich] = {};
        }
    }
    
    return exportData;
}

// Bewertungen exportieren
async function exportBewertungen() {
    const bewertungenRef = window.firebaseFunctions.getDatabaseRef('bewertungen');
    const snapshot = await window.firebaseDB.get(bewertungenRef);
    
    const exportData = {
        exportInfo: {
            typ: 'Bewertungen-Export',
            datum: new Date().toISOString(),
            exportiert_von: window.firebaseFunctions.getCurrentUserName()
        },
        bewertungen: snapshot.exists() ? snapshot.val() : {}
    };
    
    // Zusätzlich Gruppen für Kontext
    exportData.gruppen = window.firebaseFunctions.getGruppenFromCache();
    
    return exportData;
}

// Gruppen exportieren
async function exportGruppen() {
    const exportData = {
        exportInfo: {
            typ: 'Gruppen-Export',
            datum: new Date().toISOString(),
            exportiert_von: window.firebaseFunctions.getCurrentUserName()
        },
        gruppen: window.firebaseFunctions.getGruppenFromCache(),
        themen: window.firebaseFunctions.getThemenFromCache()
    };
    
    return exportData;
}

// NEU: Klassen exportieren
async function exportKlassen() {
    const exportData = {
        exportInfo: {
            typ: 'Klassen-Export',
            datum: new Date().toISOString(),
            exportiert_von: window.firebaseFunctions.getCurrentUserName()
        },
        klassen: window.firebaseFunctions.getKlassenFromCache()
    };
    
    return exportData;
}

// Daten löschen
async function datenLoeschen(typ) {
    console.log('🗑️ Lösche Daten:', typ);
    
    if (!window.firebaseFunctions.requireAdmin()) return;
    
    let confirmText = '';
    let bereiche = [];
    
    switch (typ) {
        case 'bewertungen':
            confirmText = 'ALLE BEWERTUNGEN löschen?\n\nDies kann nicht rückgängig gemacht werden!';
            bereiche = ['bewertungen'];
            break;
            
        case 'klassen':
            confirmText = 'ALLE KLASSEN löschen?\n\nDies löscht auch alle zugehörigen Gruppen und Bewertungen!';
            bereiche = ['klassen'];
            break;
            
        case 'gruppen':
            confirmText = 'ALLE GRUPPEN löschen?\n\nDies löscht auch alle zugehörigen Bewertungen!';
            bereiche = ['gruppen', 'bewertungen'];
            break;
            
        case 'news':
            confirmText = 'ALLE NEWS löschen?\n\nDies kann nicht rückgängig gemacht werden!';
            bereiche = ['news'];
            break;
            
        case 'alle':
            confirmText = 'WIRKLICH ALLE DATEN LÖSCHEN?\n\nDies löscht:\n- Alle Klassen\n- Alle Gruppen\n- Alle Bewertungen\n- Alle News\n- Alle Themen\n- Alle Vorlagen\n\nDIES KANN NICHT RÜCKGÄNGIG GEMACHT WERDEN!';
            bereiche = ['klassen', 'gruppen', 'bewertungen', 'news', 'themen', 'vorlagen'];
            break;
            
        default:
            alert('Unbekannter Lösch-Typ!');
            return;
    }
    
    if (!confirm(confirmText)) {
        return;
    }
    
    // Doppelte Bestätigung für "alle"
    if (typ === 'alle') {
        const confirmation = prompt('Um ALLE DATEN zu löschen, geben Sie "ALLES LÖSCHEN" ein:');
        if (confirmation !== 'ALLES LÖSCHEN') {
            alert('Löschvorgang abgebrochen.');
            return;
        }
    }
    
    try {
        // Bereiche löschen
        for (const bereich of bereiche) {
            const ref = window.firebaseFunctions.getDatabaseRef(bereich);
            await window.firebaseDB.remove(ref);
            console.log(`✅ ${bereich} gelöscht`);
        }
        
        // News erstellen über das Löschen
        if (window.newsFunctions && typ !== 'news') {
            await window.newsFunctions.createNewsForAction(
                'Daten gelöscht', 
                `Administrator hat ${typ === 'alle' ? 'alle Daten' : typ} gelöscht.`,
                true
            );
        }
        
        console.log('✅ Löschvorgang abgeschlossen');
        alert(`${typ === 'alle' ? 'Alle Daten' : typ} wurden erfolgreich gelöscht!`);
        
        // Seite neu laden um Cache zu leeren
        if (confirm('Seite neu laden um Änderungen zu sehen?')) {
            window.location.reload();
        }
        
    } catch (error) {
        console.error('❌ Fehler beim Löschen:', error);
        alert('Fehler beim Löschen: ' + error.message);
    }
}

// Lehrer hinzufügen
async function lehrerHinzufuegen() {
    console.log('👨‍🏫 Füge neuen Lehrer hinzu...');
    
    if (!window.firebaseFunctions.requireAdmin()) return;
    
    const nameInput = document.getElementById('lehrerName');
    const emailInput = document.getElementById('lehrerEmail');
    const passwordInput = document.getElementById('lehrerPasswort');
    
    const name = nameInput?.value.trim();
    const email = emailInput?.value.trim();
    const password = passwordInput?.value.trim();
    
    if (!name || !email || !password) {
        alert('Bitte alle Felder ausfüllen!');
        return;
    }
    
    if (!email.includes('@')) {
        alert('Bitte eine gültige E-Mail-Adresse eingeben!');
        return;
    }
    
    try {
        // 1. Benutzer in Firebase Authentication anlegen
        // Hinweis: Dies erfordert Admin-SDK - hier nur Platzhalter
        console.log('Erstelle Firebase Auth User für:', email);
        
        // 2. Benutzer-Daten in Database speichern
        const sanitizedEmail = window.firebaseFunctions.sanitizeEmail(email);
        const userRef = window.firebaseFunctions.getDatabaseRef(`users/${sanitizedEmail}`);
        
        await window.firebaseDB.set(userRef, {
            name,
            email,
            role: 'lehrer',
            erstellt: window.firebaseFunctions.formatGermanDate(),
            timestamp: window.firebaseFunctions.getTimestamp()
        });
        
        // 3. Standard-Vorlagen für neuen Lehrer erstellen
        const vorlagenRef = window.firebaseFunctions.getDatabaseRef(`vorlagen/${sanitizedEmail}`);
        
        // Standard-Vorlagen
        const standardVorlagen = {
            'standard-projekt': {
                name: 'Standard Projekt',
                kategorien: [
                    { name: 'Reflexion', gewichtung: 30 },
                    { name: 'Inhalt', gewichtung: 40 },
                    { name: 'Präsentation', gewichtung: 30 }
                ],
                erstellt: window.firebaseFunctions.formatGermanDate(),
                timestamp: window.firebaseFunctions.getTimestamp(),
                ersteller: 'System'
            }
        };
        
        await window.firebaseDB.set(vorlagenRef, standardVorlagen);
        
        // Eingabefelder leeren
        nameInput.value = '';
        emailInput.value = '';
        passwordInput.value = 'lehrer123';
        
        // News erstellen
        if (window.newsFunctions) {
            await window.newsFunctions.createNewsForAction(
                'Neuer Lehrer', 
                `${name} wurde als neuer Lehrer hinzugefügt.`,
                true
            );
        }
        
        console.log('✅ Lehrer hinzugefügt:', name);
        alert(`Lehrer "${name}" wurde erfolgreich hinzugefügt!\n\nHinweis: Der Benutzer muss sich erst in Firebase Authentication registrieren.`);
        
        // Lehrer-Liste neu laden
        if (window.adminFunctions && window.adminFunctions.loadLehrer) {
            window.adminFunctions.loadLehrer();
        }
        
    } catch (error) {
        console.error('❌ Fehler beim Hinzufügen des Lehrers:', error);
        alert('Fehler beim Hinzufügen des Lehrers: ' + error.message);
    }
}

// Lehrer löschen
async function lehrerLoeschen(userKey, lehrerName) {
    if (!window.firebaseFunctions.requireAdmin()) return;
    
    if (!confirm(`Lehrer "${lehrerName}" wirklich löschen?\n\nDies löscht auch alle zugehörigen Bewertungen und Vorlagen!`)) {
        return;
    }
    
    try {
        // Benutzer aus Database löschen
        const userRef = window.firebaseFunctions.getDatabaseRef(`users/${userKey}`);
        await window.firebaseDB.remove(userRef);
        
        // Bewertungen des Lehrers löschen
        const bewertungenRef = window.firebaseFunctions.getDatabaseRef(`bewertungen/${userKey}`);
        await window.firebaseDB.remove(bewertungenRef);
        
        // Vorlagen des Lehrers löschen
        const vorlagenRef = window.firebaseFunctions.getDatabaseRef(`vorlagen/${userKey}`);
        await window.firebaseDB.remove(vorlagenRef);
        
        // News erstellen
        if (window.newsFunctions) {
            await window.newsFunctions.createNewsForAction(
                'Lehrer entfernt', 
                `${lehrerName} wurde als Lehrer entfernt.`,
                true
            );
        }
        
        console.log('🗑️ Lehrer gelöscht:', lehrerName);
        alert(`Lehrer "${lehrerName}" wurde gelöscht.`);
        
        // Lehrer-Liste neu laden
        if (window.adminFunctions && window.adminFunctions.loadLehrer) {
            window.adminFunctions.loadLehrer();
        }
        
    } catch (error) {
        console.error('❌ Fehler beim Löschen des Lehrers:', error);
        alert('Fehler beim Löschen des Lehrers: ' + error.message);
    }
}

// Export für andere Module
window.datenverwaltungFunctions = {
    loadStatistiken,
    datenExportieren,
    datenLoeschen,
    lehrerHinzufuegen,
    lehrerLoeschen
};

console.log('✅ Firebase Datenverwaltung bereit');
