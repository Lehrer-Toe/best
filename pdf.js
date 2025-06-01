// Firebase PDF-Generierung System
console.log('📄 Firebase PDF System geladen');

// PDF für Schüler erstellen
function createPDF(schuelerId) {
    console.log('📄 Erstelle PDF für Schüler:', schuelerId);
    
    if (!window.firebaseFunctions.requireAuth()) return;
    
    // Bewertung aus Cache finden
    const bewertungen = window.firebaseFunctions.getBewertungenFromCache();
    const bewertung = bewertungen.find(b => b.schuelerId === schuelerId);
    
    if (!bewertung || !bewertung.staerken) {
        alert('Keine vollständige Bewertung für PDF vorhanden.');
        return;
    }
    
    // PDF-Inhalt generieren
    const pdfContent = generatePDFContent(bewertung);
    
    // PDF anzeigen
    displayPDF(pdfContent, bewertung.schuelerName);
    console.log('✅ PDF erstellt für:', bewertung.schuelerName);
}

// PDF-Inhalt generieren
function generatePDFContent(bewertung) {
    // Briefvorlage aus Cache holen
    const briefvorlage = window.firebaseFunctions.dataCache.briefvorlage;
    const staerkenFormulierungen = window.firebaseFunctions.dataCache.staerkenFormulierungen;
    const bewertungsCheckpoints = window.firebaseFunctions.dataCache.bewertungsCheckpoints;
    
    // Fallback falls Briefvorlage nicht geladen
    const defaultBriefvorlage = {
        anrede: 'Liebe/r [NAME],\n\nim Rahmen des Projekts "Zeig, was du kannst!" hast du folgende Stärken gezeigt:',
        schluss: 'Wir gratulieren dir zu diesen Leistungen und freuen uns auf weitere erfolgreiche Projekte.\n\nMit freundlichen Grüßen\nDein Lehrerteam'
    };
    
    const vorlage = briefvorlage || defaultBriefvorlage;
    
    // Platzhalter in Briefvorlage ersetzen
    const anrede = ersetzePlatzhalter(vorlage.anrede, bewertung.schuelerName);
    const schluss = ersetzePlatzhalter(vorlage.schluss, bewertung.schuelerName);
    
    let inhalt = anrede + '\n\n';
    
    // Stärken aus Checkliste zusammenstellen
    const staerkenSaetze = [];
    
    Object.keys(bewertung.staerken).forEach(kategorie => {
        const aktivierte = bewertung.staerken[kategorie];
        if (aktivierte && aktivierte.length > 0) {
            aktivierte.forEach(index => {
                const key = `${kategorie}_${index}`;
                let formulierung = staerkenFormulierungen ? staerkenFormulierungen[key] : null;
                
                // Fallback falls Formulierung nicht existiert
                if (!formulierung) {
                    if (bewertungsCheckpoints && bewertungsCheckpoints[kategorie] && bewertungsCheckpoints[kategorie][index]) {
                        formulierung = bewertungsCheckpoints[kategorie][index];
                    } else {
                        formulierung = `Du zeigst Stärken im Bereich ${kategorie}`;
                    }
                }
                
                if (formulierung) {
                    let finalerSatz = ersetzePlatzhalter(formulierung, bewertung.schuelerName);
                    
                    // Satz formatieren (Punkt hinzufügen falls nicht vorhanden)
                    if (!finalerSatz.endsWith('.') && !finalerSatz.endsWith('!') && !finalerSatz.endsWith('?')) {
                        finalerSatz += '.';
                    }
                    
                    staerkenSaetze.push(finalerSatz);
                }
            });
        }
    });
    
    if (staerkenSaetze.length > 0) {
        inhalt += staerkenSaetze.join('\n') + '\n\n';
    }
    
    // Freitext hinzufügen
    if (bewertung.freitext) {
        const formatierterFreitext = ersetzePlatzhalter(bewertung.freitext, bewertung.schuelerName);
        inhalt += 'Weitere Beobachtungen:\n' + formatierterFreitext + '\n\n';
    }
    
    // Note hinzufügen
    inhalt += `Gesamtnote: ${bewertung.endnote}\n\n`;
    
    inhalt += schluss;
    
    return {
        titel: `Bewertung ${bewertung.schuelerName}`,
        inhalt: inhalt,
        datum: window.firebaseFunctions.formatGermanDate(),
        schueler: bewertung.schuelerName,
        thema: bewertung.thema,
        lehrer: bewertung.lehrer
    };
}

// Platzhalter ersetzen
function ersetzePlatzhalter(text, schuelerName) {
    if (!text) return '';
    
    // Alle Varianten von [NAME] ersetzen
    return text
        .replace(/\[NAME\]/g, schuelerName)
        .replace(/\[name\]/g, schuelerName)
        .replace(/\[Name\]/g, schuelerName);
}

// PDF in neuem Fenster anzeigen
function displayPDF(content, schuelerName) {
    // Schuljahr und Schuldaten aus Config
    const config = window.firebaseFunctions.dataCache.config;
    const aktuellesSchuljahr = config?.schuljahr || '2025/26';
    const schule = config?.schule || {
        name: 'Realschule Bad Schönborn',
        adresse: 'Schulstraße 12 • 76669 Bad Schönborn',
        telefon: '07253/12345',
        email: 'info@rs-badschoenborn.de'
    };
    
    // Erstelle ein neues Fenster für die PDF-Vorschau
    const popup = window.open('', '_blank', 'width=800,height=1000');
    
    const htmlContent = `
        <!DOCTYPE html>
        <html lang="de">
        <head>
            <meta charset="UTF-8">
            <title>${content.titel}</title>
            <style>
                body {
                    font-family: 'Times New Roman', serif;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 40px;
                    line-height: 1.6;
                    background: white;
                }
                .briefkopf {
                    text-align: center;
                    border-bottom: 2px solid #333;
                    margin-bottom: 40px;
                    padding-bottom: 20px;
                }
                .briefkopf h1 {
                    color: #2c3e50;
                    margin: 0;
                    font-size: 24px;
                }
                .briefkopf h2 {
                    color: #667eea;
                    margin: 10px 0 0 0;
                    font-size: 18px;
                    font-weight: normal;
                }
                .briefkopf-info {
                    font-size: 12px;
                    color: #666;
                    margin-top: 10px;
                }
                .briefkopf-fallback {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 20px;
                }
                .briefkopf-logo-fallback {
                    width: 80px;
                    height: 80px;
                    background: #667eea;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 20px;
                }
                .briefkopf-logo-fallback span {
                    font-size: 30px;
                    color: white;
                }
                .briefkopf-text {
                    text-align: left;
                }
                .datum {
                    text-align: right;
                    margin-bottom: 30px;
                    color: #666;
                }
                .inhalt {
                    margin-bottom: 40px;
                    text-align: justify;
                }
                .stärken-liste {
                    margin: 20px 0;
                    padding-left: 0;
                }
                .stärken-liste li {
                    list-style: none;
                    margin-bottom: 8px;
                    padding-left: 20px;
                    position: relative;
                }
                .stärken-liste li:before {
                    content: "✓";
                    color: #27ae60;
                    font-weight: bold;
                    position: absolute;
                    left: 0;
                }
                .note-bereich {
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 5px;
                    border-left: 4px solid #667eea;
                    margin: 20px 0;
                }
                .unterschrift {
                    margin-top: 60px;
                    border-top: 1px solid #333;
                    padding-top: 10px;
                    width: 200px;
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
                    font-size: 14px;
                    z-index: 1000;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                }
                .print-btn:hover {
                    background: #5a6fd8;
                }
                .schuljahr-info {
                    font-size: 14px;
                    color: #666;
                    text-align: center;
                    margin-bottom: 20px;
                }
                .thema-info {
                    background: #e3f2fd;
                    padding: 10px;
                    border-radius: 5px;
                    margin-bottom: 20px;
                    text-align: center;
                    font-weight: bold;
                }
                .footer-info {
                    margin-top: 40px;
                    text-align: center;
                    font-size: 12px;
                    color: #666;
                    border-top: 1px solid #ddd;
                    padding-top: 20px;
                }
                .name-highlight {
                    font-weight: bold;
                    color: #2c3e50;
                }
                .firebase-info {
                    background: #f0f9ff;
                    padding: 10px;
                    border-radius: 5px;
                    margin-bottom: 20px;
                    text-align: center;
                    font-size: 12px;
                    color: #667eea;
                }
                @media print {
                    .print-btn { display: none; }
                    body { padding: 20px; }
                    @page { margin: 2cm; }
                    .firebase-info { display: none; }
                }
            </style>
        </head>
        <body>
            <button class="print-btn" onclick="window.print()">🖨️ Drucken</button>
            
            <div class="briefkopf">
                <div class="briefkopf-fallback">
                    <div class="briefkopf-logo-fallback">
                        <span>🎺</span>
                    </div>
                    <div class="briefkopf-text">
                        <h1 style="margin: 0; color: #2c3e50;">${schule.name}</h1>
                        <div class="briefkopf-info">
                            ${schule.adresse}<br>
                            Tel: ${schule.telefon} • ${schule.email}
                        </div>
                    </div>
                </div>
                <h2>Zeig, was du kannst! - Projektbewertung</h2>
            </div>
            
            <div class="firebase-info">
                🔥 Erstellt mit Firebase Realtime Database • Automatisch synchronisiert
            </div>
            
            <div class="schuljahr-info">
                Schuljahr ${aktuellesSchuljahr}
            </div>
            
            <div class="thema-info">
                Projektthema: ${content.thema}
            </div>
            
            <div class="datum">
                ${content.datum}
            </div>
            
            <div class="inhalt">
                ${formatPDFContent(content.inhalt, content.schueler)}
            </div>
            
            <div class="unterschrift">
                ${content.lehrer}<br>
                <small>Projektbetreuung</small>
            </div>
            
            <div class="footer-info">
                Erstellt am ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE')}<br>
                <em>Generiert mit "Zeig, was du kannst!" • Firebase Edition</em><br>
                <small>Benutzer: ${window.firebaseFunctions.getCurrentUserName()} • ID: ${window.authFunctions.getUserUid()?.substring(0, 8)}...</small>
            </div>
        </body>
        </html>
    `;
    
    popup.document.write(htmlContent);
    popup.document.close();
}

// PDF-Inhalt formatieren
function formatPDFContent(text, schuelerName) {
    // Text formatieren für bessere Darstellung
    const paragraphs = text.split('\n\n');
    let formatted = '';
    
    paragraphs.forEach(paragraph => {
        if (paragraph.trim()) {
            if (paragraph.includes('Du ') && !paragraph.includes('Gesamtnote:')) {
                // Stärken als Liste formatieren
                const saetze = paragraph.split('\n').filter(s => s.trim());
                if (saetze.length > 1) {
                    formatted += '<ul class="stärken-liste">';
                    saetze.forEach(satz => {
                        if (satz.trim()) {
                            const hervorgehobenerSatz = satz.replace(
                                new RegExp(`\\b${schuelerName}\\b`, 'gi'), 
                                `<span class="name-highlight">${schuelerName}</span>`
                            );
                            formatted += `<li>${hervorgehobenerSatz}</li>`;
                        }
                    });
                    formatted += '</ul>';
                } else {
                    const hervorgehobenerText = paragraph.replace(
                        new RegExp(`\\b${schuelerName}\\b`, 'gi'), 
                        `<span class="name-highlight">${schuelerName}</span>`
                    );
                    formatted += `<p>${hervorgehobenerText}</p>`;
                }
            } else if (paragraph.includes('Gesamtnote:')) {
                formatted += `<div class="note-bereich"><strong>${paragraph}</strong></div>`;
            } else {
                const hervorgehobenerText = paragraph.replace(
                    new RegExp(`\\b${schuelerName}\\b`, 'gi'), 
                    `<span class="name-highlight">${schuelerName}</span>`
                );
                formatted += `<p>${hervorgehobenerText}</p>`;
            }
        }
    });
    
    return formatted;
}

// PDF-Button Status prüfen
function updatePDFButtonStatus(schuelerId) {
    const bewertungen = window.firebaseFunctions.getBewertungenFromCache();
    const bewertung = bewertungen.find(b => b.schuelerId === schuelerId);
    const button = document.querySelector(`[onclick*="${schuelerId}"]`);
    
    if (button && button.textContent.includes('PDF')) {
        const verfuegbar = bewertung && bewertung.endnote && bewertung.staerken && Object.keys(bewertung.staerken).length > 0;
        
        if (verfuegbar) {
            button.className = button.className.replace('pdf-btn-disabled', 'pdf-btn-enabled');
            button.removeAttribute('disabled');
        } else {
            button.className = button.className.replace('pdf-btn-enabled', 'pdf-btn-disabled');
            button.setAttribute('disabled', 'true');
        }
    }
}

// Alle PDF-Buttons aktualisieren
function updateAllPDFButtons() {
    const bewertungen = window.firebaseFunctions.getBewertungenFromCache();
    bewertungen.forEach(bewertung => {
        updatePDFButtonStatus(bewertung.schuelerId);
    });
}

// Export für andere Module
window.pdfFunctions = {
    createPDF,
    updatePDFButtonStatus,
    updateAllPDFButtons
};

console.log('✅ Firebase PDF System bereit');
