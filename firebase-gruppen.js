// Debug-Script für Gruppen-Datenanalyse
// Dieses Script kann in der Browser-Konsole ausgeführt werden

console.log('🐛 Debug-Script für Gruppen-Datenanalyse gestartet');

// Hauptfunktion für vollständige Datenanalyse
function analyzeGruppenData() {
    console.log('=== GRUPPEN-DATENANALYSE ===');
    
    if (!window.firebaseFunctions) {
        console.error('❌ Firebase Funktionen nicht verfügbar');
        return;
    }
    
    const gruppen = window.firebaseFunctions.getGruppenFromCache();
    console.log(`📊 Analysiere ${gruppen.length} Gruppen...`);
    
    let totalSchueler = 0;
    let problematischeSchueler = 0;
    let fehlerDetails = [];
    
    gruppen.forEach((gruppe, gruppenIndex) => {
        console.log(`\n--- Gruppe ${gruppenIndex + 1}: "${gruppe.thema}" ---`);
        console.log(`Erstellt von: ${gruppe.ersteller || 'Unbekannt'}`);
        console.log(`Erstellt am: ${gruppe.erstellt || 'Unbekannt'}`);
        
        if (!gruppe.schueler || !Array.isArray(gruppe.schueler)) {
            console.warn(`⚠️ Keine Schüler-Array in Gruppe "${gruppe.thema}"`);
            return;
        }
        
        console.log(`Anzahl Schüler: ${gruppe.schueler.length}`);
        
        gruppe.schueler.forEach((schueler, schuelerIndex) => {
            totalSchueler++;
            console.log(`  Schüler ${schuelerIndex + 1}:`, schueler);
            
            // Analysiere Schüler-Datenstruktur
            const analysis = analyzeSchuelerStructure(schueler, gruppenIndex, schuelerIndex);
            
            if (analysis.hasIssues) {
                problematischeSchueler++;
                fehlerDetails.push({
                    gruppe: gruppe.thema,
                    gruppenIndex,
                    schuelerIndex,
                    issues: analysis.issues,
                    originalData: schueler
                });
                
                console.warn(`    ⚠️ Probleme gefunden:`, analysis.issues);
            } else {
                console.log(`    ✅ Datenstruktur OK`);
            }
            
            // Zeige normalisierte Daten
            if (window.gruppenFunctions && window.gruppenFunctions.normalizeSchuelerData) {
                const normalized = window.gruppenFunctions.normalizeSchuelerData(schueler);
                console.log(`    🔧 Normalisiert:`, normalized);
            }
        });
    });
    
    console.log('\n=== ZUSAMMENFASSUNG ===');
    console.log(`Gruppen gesamt: ${gruppen.length}`);
    console.log(`Schüler gesamt: ${totalSchueler}`);
    console.log(`Problematische Schüler: ${problematischeSchueler}`);
    console.log(`Erfolgsquote: ${((totalSchueler - problematischeSchueler) / totalSchueler * 100).toFixed(1)}%`);
    
    if (fehlerDetails.length > 0) {
        console.log('\n=== DETAILLIERTE FEHLERANALYSE ===');
        fehlerDetails.forEach((fehler, index) => {
            console.log(`\nFehler ${index + 1}:`);
            console.log(`  Gruppe: ${fehler.gruppe}`);
            console.log(`  Position: Gruppe ${fehler.gruppenIndex}, Schüler ${fehler.schuelerIndex}`);
            console.log(`  Probleme:`, fehler.issues);
            console.log(`  Original-Daten:`, fehler.originalData);
        });
        
        console.log('\n=== REPARATUR-EMPFEHLUNGEN ===');
        generateRepairRecommendations(fehlerDetails);
    }
    
    return {
        totalGruppen: gruppen.length,
        totalSchueler,
        problematischeSchueler,
        fehlerDetails,
        erfolgsquote: ((totalSchueler - problematischeSchueler) / totalSchueler * 100).toFixed(1)
    };
}

// Analysiere einzelne Schüler-Datenstruktur
function analyzeSchuelerStructure(schueler, gruppenIndex, schuelerIndex) {
    const issues = [];
    let hasIssues = false;
    
    // Typ-Prüfung
    if (!schueler || typeof schueler !== 'object') {
        issues.push('Schüler ist kein Objekt');
        hasIssues = true;
        return { hasIssues, issues };
    }
    
    // Name-Prüfung
    if (!schueler.name && !schueler.schuelerName && !(schueler.vorname && schueler.nachname)) {
        issues.push('Kein Name gefunden (name, schuelerName oder vorname+nachname)');
        hasIssues = true;
    }
    
    // Lehrer-Prüfung
    if (!schueler.lehrer && !schueler.lehrerName) {
        issues.push('Kein Lehrer zugewiesen (lehrer oder lehrerName)');
        hasIssues = true;
    }
    
    // Fach-Prüfung (optional, aber warnen wenn merkwürdig)
    if (schueler.fach && typeof schueler.fach !== 'string') {
        issues.push('Fach hat unerwarteten Typ');
        hasIssues = true;
    }
    
    // Unerwartete Eigenschaften
    const expectedProps = ['name', 'schuelerName', 'vorname', 'nachname', 'lehrer', 'lehrerName', 'fach', 'fachKuerzel'];
    const actualProps = Object.keys(schueler);
    const unexpectedProps = actualProps.filter(prop => !expectedProps.includes(prop));
    
    if (unexpectedProps.length > 0) {
        issues.push(`Unerwartete Eigenschaften: ${unexpectedProps.join(', ')}`);
        // Nicht als kritischer Fehler markieren
    }
    
    return { hasIssues, issues };
}

// Generiere Reparatur-Empfehlungen
function generateRepairRecommendations(fehlerDetails) {
    console.log('🔧 REPARATUR-EMPFEHLUNGEN:');
    
    const commonIssues = {};
    fehlerDetails.forEach(fehler => {
        fehler.issues.forEach(issue => {
            commonIssues[issue] = (commonIssues[issue] || 0) + 1;
        });
    });
    
    console.log('\n📊 Häufigste Probleme:');
    Object.entries(commonIssues)
        .sort(([,a], [,b]) => b - a)
        .forEach(([issue, count]) => {
            console.log(`  ${count}x: ${issue}`);
        });
    
    console.log('\n💡 Empfohlene Aktionen:');
    
    if (commonIssues['Kein Name gefunden (name, schuelerName oder vorname+nachname)']) {
        console.log('1. Schüler ohne Namen sollten manuell korrigiert werden');
        console.log('   - Gruppen bearbeiten und fehlende Namen hinzufügen');
    }
    
    if (commonIssues['Kein Lehrer zugewiesen (lehrer oder lehrerName)']) {
        console.log('2. Schüler ohne Lehrer sollten zugewiesen werden');
        console.log('   - Gruppen bearbeiten und Lehrer auswählen');
    }
    
    console.log('3. Die neue normalizesSchuelerData() Funktion sollte die meisten Probleme automatisch beheben');
    console.log('4. Bei kritischen Fehlern: Gruppe löschen und neu erstellen');
}

// Exportiere problematische Daten für manuelle Bearbeitung
function exportProblematicData() {
    const analysis = analyzeGruppenData();
    
    if (analysis.fehlerDetails.length === 0) {
        console.log('✅ Keine problematischen Daten gefunden');
        return;
    }
    
    const exportData = {
        analyseDatum: new Date().toISOString(),
        totalGruppen: analysis.totalGruppen,
        totalSchueler: analysis.totalSchueler,
        problematischeSchueler: analysis.problematischeSchueler,
        erfolgsquote: analysis.erfolgsquote,
        fehlerDetails: analysis.fehlerDetails
    };
    
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `gruppen-debug-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('📁 Debug-Daten exportiert');
}

// Cache-Analyse
function analyzeCacheStatus() {
    console.log('=== CACHE-STATUS ===');
    
    if (!window.firebaseFunctions || !window.firebaseFunctions.dataCache) {
        console.error('❌ Kein Zugriff auf dataCache');
        return;
    }
    
    const cache = window.firebaseFunctions.dataCache;
    
    Object.entries(cache).forEach(([key, value]) => {
        if (value && typeof value === 'object') {
            const entries = Object.keys(value).length;
            console.log(`${key}: ${entries} Einträge`);
        } else {
            console.log(`${key}: ${typeof value} (${value ? 'gesetzt' : 'leer'})`);
        }
    });
}

// Test der Normalisierungsfunktion
function testNormalization() {
    console.log('=== TEST DER NORMALISIERUNG ===');
    
    if (!window.gruppenFunctions || !window.gruppenFunctions.normalizeSchuelerData) {
        console.error('❌ Normalisierungsfunktion nicht verfügbar');
        return;
    }
    
    const testCases = [
        { name: 'Max Mustermann', lehrer: 'Töllner', fach: 'M' },
        { schuelerName: 'Anna Schmidt', lehrerName: 'Weber' },
        { vorname: 'Tom', nachname: 'Klein', lehrer: 'Müller' },
        {},
        null,
        undefined,
        'invalid'
    ];
    
    testCases.forEach((testCase, index) => {
        console.log(`\nTest ${index + 1}:`, testCase);
        try {
            const result = window.gruppenFunctions.normalizeSchuelerData(testCase);
            console.log('  Ergebnis:', result);
            console.log('  Status:', result.name && result.lehrer ? '✅' : '⚠️');
        } catch (error) {
            console.error('  Fehler:', error.message);
        }
    });
}

// Hauptfunktionen global verfügbar machen für Console-Nutzung
window.debugGruppen = {
    analyze: analyzeGruppenData,
    export: exportProblematicData,
    cacheStatus: analyzeCacheStatus,
    testNormalization: testNormalization,
    
    // Schnellzugriff-Funktionen
    quick: () => {
        console.log('🚀 Schnellanalyse gestartet...');
        const result = analyzeGruppenData();
        if (result.problematischeSchueler === 0) {
            console.log('🎉 Alle Daten sind korrekt!');
        } else {
            console.log(`⚠️ ${result.problematischeSchueler} problematische Schüler gefunden`);
            console.log('📋 Führe debugGruppen.export() aus um Details zu exportieren');
        }
        return result;
    }
};

console.log('✅ Debug-Script geladen');
console.log('📝 Verfügbare Funktionen:');
console.log('  debugGruppen.analyze() - Vollständige Analyse');
console.log('  debugGruppen.quick() - Schnellanalyse');
console.log('  debugGruppen.export() - Probleme exportieren');
console.log('  debugGruppen.cacheStatus() - Cache-Status');
console.log('  debugGruppen.testNormalization() - Test Normalisierung');
console.log('💡 Starte mit: debugGruppen.quick()');
