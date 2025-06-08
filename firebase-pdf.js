// Firebase PDF-Generierung System
console.log('📄 Firebase PDF System geladen');

// PDF für Schüler erstellen (DOCX-Vorlage verwenden)
async function createPDF(schuelerId) {
    console.log('📄 Erstelle PDF für Schüler:', schuelerId);

    if (!window.firebaseFunctions.requireAuth()) return;

    // Externe Bibliotheken sicherstellen
    try {
        await loadDocxLibraries();
    } catch (libErr) {
        console.error('❌ Konnte DOCX-Bibliotheken nicht laden:', libErr);
        alert('Fehler beim Laden der Word-Bibliotheken.');
        return;
    }

    // Bewertung aus Cache finden
    const bewertungen = window.firebaseFunctions.getBewertungenFromCache();
    const bewertung = bewertungen.find(b => b.schuelerId === schuelerId);

    if (!bewertung || !bewertung.staerken) {
        alert('Keine vollständige Bewertung für PDF vorhanden.');
        return;
    }

    // Daten für DOCX zusammenstellen
    const docxData = generateDocxData(bewertung);

    try {
        const docxBlob = await generateDocxFromTemplate(docxData);
        // Hier wird die displayDocxPDF Funktion aufgerufen, die den DOCX-Blob rendert
        displayDocxPDF(docxBlob, docxData);
        console.log('✅ PDF erstellt für:', bewertung.schuelerName);
    } catch (err) {
        console.error('❌ Fehler bei der DOCX-Erstellung:', err);
        alert('Fehler beim Erstellen des PDFs.');
    }
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

// DOCX-Vorlage laden und Platzhalter ersetzen
async function generateDocxFromTemplate(data) {
    const response = await fetch('./Vorlage_PDF.docx');
    const arrayBuffer = await response.arrayBuffer();
    const zip = new PizZip(arrayBuffer);
    let xml = zip.file('word/document.xml').asText();

    xml = xml
        .replace('[Betreff]', data.betreff)
        .replace('[Anrede]', data.anrede)
        .replace('[Textbox]', data.textbox)
        .replace('[Grussformel]', data.grussformel);

    zip.file('word/document.xml', xml);
    return zip.generate({ type: 'blob' });
}

// DOCX im neuen Fenster rendern und Drucken ermöglichen
function displayDocxPDF(blob, data) {
    const popup = window.open('', '_blank', 'width=800,height=1000');

    const html = `
        <!DOCTYPE html>
        <html lang="de">
        <head>
            <meta charset="UTF-8">
            <title>${data.betreff}</title>
            <style>
                body { margin:0; padding:20px; font-family:'Times New Roman', serif; }
                .print-btn { position:fixed; top:10px; right:10px; background:#667eea; color:#fff; border:none; padding:10px 20px; border-radius:5px; cursor:pointer; z-index:1000; }
            </style>
            <script src="https://cdn.jsdelivr.net/npm/docx-preview@0.3.5/dist/docx-preview.min.js"></script>
        </head>
        <body>
            <button class="print-btn" onclick="window.print()">🖨️ Drucken</button>
            <div id="docx-container"></div>
        </body>
        </html>`;

    popup.document.write(html);
    popup.document.close();

    const load = () => {
        if (popup.docx && popup.document.getElementById('docx-container')) {
            popup.docx.renderAsync(blob, popup.document.getElementById('docx-container'));
        } else {
            setTimeout(load, 100);
        }
    };
    load();
}

// Daten für die DOCX-Vorlage vorbereiten
function generateDocxData(bewertung) {
    const briefvorlage = window.firebaseFunctions.dataCache.briefvorlage;
    const staerkenFormulierungen = window.firebaseFunctions.dataCache.staerkenFormulierungen;
    const bewertungsCheckpoints = window.firebaseFunctions.dataCache.bewertungsCheckpoints;

    const defaultBriefvorlage = {
        anrede: 'Liebe/r [NAME],\n\nim Rahmen des Projekts "Zeig, was du kannst!" hast du folgende Stärken gezeigt:',
        schluss: 'Wir gratulieren dir zu diesen Leistungen und freuen uns auf weitere erfolgreiche Projekte.\n\nMit freundlichen Grüßen\nDein Lehrerteam'
    };

    const vorlage = briefvorlage || defaultBriefvorlage;

    const anrede = ersetzePlatzhalter(vorlage.anrede, bewertung.schuelerName);
    const grussformel = ersetzePlatzhalter(vorlage.schluss, bewertung.schuelerName);

    let textbox = '';
    const saetze = [];

    Object.keys(bewertung.staerken).forEach(kategorie => {
        const aktivierte = bewertung.staerken[kategorie];
        if (aktivierte && aktivierte.length > 0) {
            aktivierte.forEach(index => {
                const key = `${kategorie}_${index}`;
                let formulierung = staerkenFormulierungen ? staerkenFormulierungen[key] : null;
                if (!formulierung) {
                    if (bewertungsCheckpoints && bewertungsCheckpoints[kategorie] && bewertungsCheckpoints[kategorie][index]) {
                        formulierung = bewertungsCheckpoints[kategorie][index];
                    } else {
                        formulierung = `Du zeigst Stärken im Bereich ${kategorie}`;
                    }
                }

                if (formulierung) {
                    let satz = ersetzePlatzhalter(formulierung, bewertung.schuelerName);
                    if (!satz.endsWith('.') && !satz.endsWith('!') && !satz.endsWith('?')) {
                        satz += '.';
                    }
                    saetze.push(satz);
                }
            });
        }
    });

    if (saetze.length > 0) {
        textbox += saetze.join('\n') + '\n\n';
    }

    if (bewertung.freitext) {
        const formatierterFreitext = ersetzePlatzhalter(bewertung.freitext, bewertung.schuelerName);
        textbox += formatierterFreitext + '\n\n';
    }

    textbox += `Gesamtnote: ${bewertung.endnote}`;

    return {
        betreff: `Projektbewertung - ${bewertung.schuelerName}`,
        anrede,
        textbox,
        grussformel,
        datum: window.firebaseFunctions.formatGermanDate(),
        thema: bewertung.thema,
        lehrer: bewertung.lehrer,
        schueler: bewertung.schuelerName
    };
}

// PDF in neuem Fenster anzeigen - KORRIGIERT mit Briefkopf-Bild
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
                .briefkopf-bild {
                    width: 100%;
                    max-width: 600px;
                    height: auto;
                    margin-bottom: 20px;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
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
                .bild-fehler {
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 8px;
                    border: 2px dashed #ddd;
                    text-align: center;
                    color: #666;
                    margin-bottom: 20px;
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
            
            <div class="briefkopf">
                <img src="./briefkopf.png" alt="Briefkopf" class="briefkopf-bild" 
                    onerror="this.style.display='none'; document.getElementById('briefkopf-fallback').style.display='block';">
                
                <div id="briefkopf-fallback" class="briefkopf-fallback" style="display: none;">
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
                <em>Generiert mit "Zeig, was du kannst!" Bewertungssystem</em><br>
                <small>Benutzer: ${window.firebaseFunctions.getCurrentUserName()}</small>
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

// Benötigte DOCX-Bibliotheken dynamisch laden
function loadDocxLibraries() {
    const head = document.head || document.getElementsByTagName('head')[0];

    function add(src) {
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = () => reject(new Error('Script failed: ' + src));
            head.appendChild(s);
        });
    }

    const tasks = [];
    if (typeof window.PizZip === 'undefined') {
        tasks.push(add('https://cdnjs.cloudflare.com/ajax/libs/pizzip/3.2.5/pizzip.min.js'));
    }
    if (typeof window.docxtemplater === 'undefined') {
        tasks.push(add('https://cdnjs.cloudflare.com/ajax/libs/docxtemplater/3.37.2/docxtemplater.min.js'));
    }
    if (typeof window.docx === 'undefined') {
        tasks.push(add('https://cdn.jsdelivr.net/npm/docx-preview@0.3.5/dist/docx-preview.min.js'));
    }

    return Promise.all(tasks);
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
