// Firebase PDF-Generierung System
console.log('📄 Firebase PDF System geladen');

/**
 * Erstellt ein PDF für einen Schüler basierend auf einer DOCX-Vorlage und Bewertungsdaten.
 * Lädt notwendige DOCX-Bibliotheken dynamisch.
 * @param {string} schuelerId - Die ID des Schülers, für den das PDF erstellt werden soll.
 */
async function createPDF(schuelerId) {
    console.log('📄 Erstelle PDF für Schüler:', schuelerId);

    // Sicherstellen, dass der Benutzer authentifiziert ist (Funktion muss in window.firebaseFunctions existieren)
    if (!window.firebaseFunctions || typeof window.firebaseFunctions.requireAuth !== 'function' || !window.firebaseFunctions.requireAuth()) {
        console.warn('Authentifizierung erforderlich oder firebaseFunctions.requireAuth nicht verfügbar.');
        // Optional: Hier eine spezifischere Fehlermeldung oder Umleitung hinzufügen
        alert('Für diese Aktion ist eine Authentifizierung erforderlich.');
        return;
    }

    // Externe Bibliotheken sicherstellen (PizZip, docxtemplater, docx-preview)
    try {
        await loadDocxLibraries();
        console.log('✅ DOCX-Bibliotheken erfolgreich geladen.');
    } catch (libErr) {
        console.error('❌ Konnte DOCX-Bibliotheken nicht laden:', libErr);
        alert('Fehler beim Laden der erforderlichen Word-Bibliotheken. Bitte versuchen Sie es später erneut oder überprüfen Sie Ihre Internetverbindung/Ad-Blocker.');
        return;
    }

    // Bewertung aus Cache finden
    const bewertungen = window.firebaseFunctions.getBewertungenFromCache();
    const bewertung = bewertungen.find(b => b.schuelerId === schuelerId);

    if (!bewertung || !bewertung.staerken) {
        alert('Keine vollständige Bewertung für PDF vorhanden. Bitte stellen Sie sicher, dass Stärken und eine Endnote eingetragen sind.');
        return;
    }

    // Daten für DOCX zusammenstellen, die in die Vorlage eingefügt werden
    const docxData = generateDocxData(bewertung);

    try {
        // DOCX-Datei aus Vorlage generieren
        const docxBlob = await generateDocxFromTemplate(docxData);
        // Generiertes DOCX im neuen Fenster anzeigen und Drucken ermöglichen
        displayDocxPDF(docxBlob, docxData);
        console.log('✅ PDF (DOCX-Vorschau) erfolgreich erstellt für:', bewertung.schuelerName);
    } catch (err) {
        console.error('❌ Fehler bei der DOCX-Erstellung oder Anzeige:', err);
        alert('Fehler beim Erstellen oder Anzeigen des PDFs. Detaillierte Fehlerinformationen finden Sie in der Browser-Konsole.');
    }
}

/**
 * Generiert den Textinhalt für das PDF/DOCX basierend auf der Schülerbewertung.
 * Verwendet Vorlagen und Platzhalter.
 * @param {object} bewertung - Das Bewertungsobjekt des Schülers.
 * @returns {object} Ein Objekt mit formatierten Inhalten für das Dokument.
 */
function generatePDFContent(bewertung) {
    // Briefvorlage und Formulierungen aus Cache holen
    const briefvorlage = window.firebaseFunctions.dataCache.briefvorlage;
    const staerkenFormulierungen = window.firebaseFunctions.dataCache.staerkenFormulierungen;
    const bewertungsCheckpoints = window.firebaseFunctions.dataCache.bewertungsCheckpoints;
    
    // Fallback falls Briefvorlage nicht geladen ist
    const defaultBriefvorlage = {
        anrede: 'Liebe/r [NAME],\n\nim Rahmen des Projekts "Zeig, was du kannst!" hast du folgende Stärken gezeigt:',
        schluss: 'Wir gratulieren dir zu diesen Leistungen und freuen uns auf weitere erfolgreiche Projekte.\n\nMit freundlichen Grüßen\nDein Lehrerteam'
    };
    
    const vorlage = briefvorlage || defaultBriefvorlage;
    
    // Platzhalter in Anrede und Schluss ersetzen
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
                
                // Fallback falls spezifische Formulierung nicht existiert
                if (!formulierung) {
                    if (bewertungsCheckpoints && bewertungsCheckpoints[kategorie] && bewertungsCheckpoints[kategorie][index]) {
                        formulierung = bewertungsCheckpoints[kategorie][index]; // Nutze Checkpoint-Text als Fallback
                    } else {
                        formulierung = `Du zeigst Stärken im Bereich ${kategorie}`; // Allgemeiner Fallback
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
    
    // Freitext hinzufügen, falls vorhanden
    if (bewertung.freitext) {
        const formatierterFreitext = ersetzePlatzhalter(bewertung.freitext, bewertung.schuelerName);
        inhalt += 'Weitere Beobachtungen:\n' + formatierterFreitext + '\n\n';
    }
    
    // Gesamtnote hinzufügen
    inhalt += `Gesamtnote: ${bewertung.endnote}\n\n`;
    
    // Schlussformel anhängen
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

/**
 * Ersetzt den Platzhalter '[NAME]' (case-insensitive) durch den Schülernamen im Text.
 * @param {string} text - Der ursprüngliche Text.
 * @param {string} schuelerName - Der Name des Schülers.
 * @returns {string} Der Text mit ersetzten Platzhaltern.
 */
function ersetzePlatzhalter(text, schuelerName) {
    if (!text) return '';
    
    // Alle Varianten von [NAME] ersetzen (case-insensitive)
    return text
        .replace(/\[NAME\]/gi, schuelerName); // 'gi' für global und case-insensitive
}

/**
 * Lädt eine DOCX-Vorlage, ersetzt Platzhalter darin und generiert ein neues DOCX-Blob.
 * Erfordert die PizZip und docxtemplater Bibliotheken.
 * @param {object} data - Die Daten, die in die DOCX-Vorlage eingefügt werden sollen.
 * @returns {Promise<Blob>} Ein Promise, das mit einem Blob der generierten DOCX-Datei aufgelöst wird.
 */
async function generateDocxFromTemplate(data) {
    // Annahme: Vorlage_PDF.docx liegt im selben Verzeichnis wie die HTML/JS-Datei
    const response = await fetch('./Vorlage_PDF.docx');
    if (!response.ok) {
        throw new Error(`DOCX-Vorlage konnte nicht geladen werden: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    
    // PizZip wird benötigt, um die DOCX-Datei als ZIP zu entpacken
    const zip = new PizZip(arrayBuffer);
    
    // docxtemplater ist hier die gängige Bibliothek für komplexere Vorlagen
    // Für die hier gezeigte einfache String-Ersetzung wäre docxtemplater selbst overkill,
    // aber es ist gut, wenn die Absicht ist, eine echte docxtemplater-Vorlage zu nutzen.
    // Wenn es nur um einfache String-Ersetzung in XML geht, ist der aktuelle Ansatz ok.
    // ACHTUNG: Die aktuelle Implementierung ersetzt Platzhalter DIREKT im XML.
    // Eine korrekte docxtemplater-Nutzung sähe so aus:
    /*
    const doc = new window.docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
    });
    doc.setData(data);
    doc.render();
    return doc.get  Zip().generate({ type: 'blob' });
    */
    // Da deine Vorlage einfache String-Ersetzung verwendet, bleibt der folgende Code.
    // Für komplexere Vorlagen mit Schleifen, Bedingungen etc. müsste docxtemplater eingesetzt werden.

    let xml = zip.file('word/document.xml').asText();

    // Platzhalter im XML der DOCX-Datei ersetzen
    xml = xml
        .replace(/\[Betreff\]/g, data.betreff || '')
        .replace(/\[Anrede\]/g, data.anrede || '')
        .replace(/\[Textbox\]/g, data.textbox || '')
        .replace(/\[Grussformel\]/g, data.grussformel || '')
        .replace(/\[Datum\]/g, data.datum || '')
        .replace(/\[Thema\]/g, data.thema || '')
        .replace(/\[Lehrer\]/g, data.lehrer || '')
        .replace(/\[Schueler\]/g, data.schueler || '');

    zip.file('word/document.xml', xml);
    return zip.generate({ type: 'blob' });
}

/**
 * Zeigt eine generierte DOCX-Datei (als Blob) in einem neuen Browserfenster an
 * und ermöglicht das Drucken. Verwendet die docx-preview Bibliothek.
 * @param {Blob} blob - Der Blob der DOCX-Datei.
 * @param {object} data - Zusätzliche Daten, z.B. für den Titel des Popup-Fensters.
 */
function displayDocxPDF(blob, data) {
    const popup = window.open('', '_blank', 'width=800,height=1000');

    // HTML-Struktur für das Popup-Fenster mit docx-preview Integration
    const html = `
        <!DOCTYPE html>
        <html lang="de">
        <head>
            <meta charset="UTF-8">
            <title>${data.betreff || 'Dokument Vorschau'}</title>
            <style>
                body { margin:0; padding:20px; font-family:'Times New Roman', serif; }
                .print-btn { position:fixed; top:10px; right:10px; background:#667eea; color:#fff; border:none; padding:10px 20px; border-radius:5px; cursor:pointer; z-index:1000; }
                @media print {
                    .print-btn { display: none; }
                }
            </style>
            <script src="https://cdn.jsdelivr.net/npm/docx-preview@0.3.5/dist/docx-preview.min.js"></script>
        </head>
        <body>
            <button class="print-btn" onclick="window.print()">🖨️ Drucken</button>
            <div id="docx-container" style="width: 100%; height: auto; min-height: 800px; border: 1px solid #ddd; padding: 20px;"></div>
        </body>
        </html>`;

    popup.document.write(html);
    popup.document.close();

    // Warten, bis docx-preview geladen und das Container-Element verfügbar ist
    const loadAndRenderDocx = () => {
        if (popup.docx && popup.document.getElementById('docx-container')) {
            // Optionen für docx-preview, z.B. um Bilder in der DOCX zu rendern
            const docxPreviewOptions = {
                className: "docx-wrapper", // Klasse für den Wrapper
                inWrapper: true,           // Inhalt in einem Wrapper
                ignoreStyles: false,       // Styles aus der DOCX übernehmen
                breakPages: true,          // Seitenumbrüche beachten
                debug: false               // Debug-Infos ausgeben
            };
            popup.docx.renderAsync(blob, popup.document.getElementById('docx-container'), null, docxPreviewOptions)
                .then(() => console.log('DOCX-Preview erfolgreich gerendert.'))
                .catch(err => console.error('Fehler beim Rendern des DOCX-Previews:', err));
        } else {
            setTimeout(loadAndRenderDocx, 100); // Erneut versuchen, wenn noch nicht bereit
        }
    };
    loadAndRenderDocx();
}

/**
 * Bereitet die Daten für die DOCX-Vorlage vor.
 * Enthält Logik zur Formatierung von Stärken und Freitext.
 * @param {object} bewertung - Das Bewertungsobjekt des Schülers.
 * @returns {object} Ein Objekt mit vorbereiteten Daten für die DOCX-Vorlage.
 */
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

    let textbox = ''; // Dies wird der Haupttextbereich in der DOCX-Vorlage
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
        // Trennen der Sätze mit Linebreaks für die DOCX-Textbox
        textbox += saetze.join('\n') + '\n\n';
    }

    if (bewertung.freitext) {
        const formatierterFreitext = ersetzePlatzhalter(bewertung.freitext, bewertung.schuelerName);
        textbox += formatierterFreitext + '\n\n';
    }

    textbox += `Gesamtnote: ${bewertung.endnote}`;

    // Rückgabe der Daten, die in die DOCX-Vorlage eingefügt werden sollen
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


// WICHTIG: Die Funktion `displayPDF` wird nicht mehr direkt von `createPDF` aufgerufen,
// da `createPDF` jetzt `displayDocxPDF` verwendet.
// `displayPDF` ist nur noch für den Fall nützlich, dass du eine HTML-basierte PDF-Vorschau
// (nicht basierend auf der DOCX-Vorlage) anzeigen möchtest.
// Ich lasse sie hier, da sie Teil deines ursprünglichen Codes war.
/**
 * Zeigt einen PDF-Inhalt in einem neuen Fenster an, mit Briefkopf und Formatierung.
 * Diese Funktion ist für eine HTML-basierte PDF-Vorschau, nicht für DOCX-generierte PDFs.
 * @param {object} content - Der Inhalt des PDFs (Titel, Inhaltstext, etc.).
 * @param {string} schuelerName - Der Name des Schülers zur Personalisierung.
 */
function displayPDF(content, schuelerName) {
    // Schuljahr und Schuldaten aus Config holen (Annahme: firebaseFunctions.dataCache ist verfügbar)
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

/**
 * Formatiert den reinen Textinhalt für die HTML-basierte PDF-Vorschau
 * (displayPDF). Konvertiert Absätze, Listen und hebt den Schülernamen hervor.
 * @param {string} text - Der unformatierte Textinhalt.
 * @param {string} schuelerName - Der Name des Schülers für die Hervorhebung.
 * @returns {string} Der HTML-formatierte Inhalt.
 */
function formatPDFContent(text, schuelerName) {
    // Text formatieren für bessere Darstellung
    const paragraphs = text.split('\n\n');
    let formatted = '';
    
    paragraphs.forEach(paragraph => {
        if (paragraph.trim()) {
            // Wenn der Absatz "Du" enthält und nicht die Gesamtnote, behandle es als Stärkenliste
            if (paragraph.includes('Du ') && !paragraph.includes('Gesamtnote:')) {
                const saetze = paragraph.split('\n').filter(s => s.trim());
                if (saetze.length > 1) { // Mehrere Sätze könnten eine Liste sein
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
                } else { // Einzelner Satz als normaler Absatz
                    const hervorgehobenerText = paragraph.replace(
                        new RegExp(`\\b${schuelerName}\\b`, 'gi'), 
                        `<span class="name-highlight">${schuelerName}</span>`
                    );
                    formatted += `<p>${hervorgehobenerText}</p>`;
                }
            } else if (paragraph.includes('Gesamtnote:')) {
                // Gesamtnote in einem speziellen Bereich hervorheben
                formatted += `<div class="note-bereich"><strong>${paragraph}</strong></div>`;
            } else {
                // Reguläre Absätze mit Namenshervorhebung
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

/**
 * Lädt die benötigten externen JavaScript-Bibliotheken dynamisch von CDNs.
 * Überprüft vor dem Laden, ob die Bibliotheken bereits verfügbar sind.
 * @returns {Promise<void>} Ein Promise, das aufgelöst wird, wenn alle Bibliotheken geladen sind, oder abgewiesen wird, wenn ein Laden fehlschlägt.
 */
function loadDocxLibraries() {
    const head = document.head || document.getElementsByTagName('head')[0];

    // Hilfsfunktion zum Laden eines einzelnen Skripts
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
    // Überprüfen, ob PizZip bereits geladen ist
    if (typeof window.PizZip === 'undefined') {
        tasks.push(add('https://cdnjs.cloudflare.com/ajax/libs/pizzip/3.2.5/pizzip.min.js'));
    }
    // Überprüfen, ob docxtemplater bereits geladen ist
    if (typeof window.docxtemplater === 'undefined') {
        tasks.push(add('https://cdnjs.cloudflare.com/ajax/libs/docxtemplater/3.37.2/docxtemplater.min.js'));
    }
    // Überprüfen, ob docx-preview bereits geladen ist (window.docx ist das Hauptobjekt)
    if (typeof window.docx === 'undefined') {
        tasks.push(add('https://cdn.jsdelivr.net/npm/docx-preview@0.3.5/dist/docx-preview.min.js'));
    }

    return Promise.all(tasks);
}

/**
 * Aktualisiert den Status eines PDF-Buttons (aktiviert/deaktiviert)
 * basierend darauf, ob eine vollständige Bewertung für den Schüler vorhanden ist.
 * @param {string} schuelerId - Die ID des Schülers.
 */
function updatePDFButtonStatus(schuelerId) {
    const bewertungen = window.firebaseFunctions.getBewertungenFromCache();
    const bewertung = bewertungen.find(b => b.schuelerId === schuelerId);
    // Annahme: Der Button hat einen onclick-Handler, der die schuelerId enthält,
    // z.B. onclick="createPDF('schueler123')"
    const button = document.querySelector(`[onclick*="${schuelerId}"]`);
    
    if (button && button.textContent.includes('PDF')) { // Nur Buttons mit "PDF" Text prüfen
        const verfuegbar = bewertung && bewertung.endnote && bewertung.staerken && Object.keys(bewertung.staerken).length > 0;
        
        if (verfuegbar) {
            button.classList.remove('pdf-btn-disabled');
            button.classList.add('pdf-btn-enabled');
            button.removeAttribute('disabled');
        } else {
            button.classList.remove('pdf-btn-enabled');
            button.classList.add('pdf-btn-disabled');
            button.setAttribute('disabled', 'true');
        }
    }
}

/**
 * Aktualisiert den Status aller PDF-Buttons auf der Seite.
 */
function updateAllPDFButtons() {
    // Stellen Sie sicher, dass firebaseFunctions und getBewertungenFromCache existieren
    if (window.firebaseFunctions && typeof window.firebaseFunctions.getBewertungenFromCache === 'function') {
        const bewertungen = window.firebaseFunctions.getBewertungenFromCache();
        if (bewertungen) {
            bewertungen.forEach(bewertung => {
                updatePDFButtonStatus(bewertung.schuelerId);
            });
        } else {
            console.warn('Bewertungen-Cache ist leer oder nicht verfügbar.');
            // Alle PDF-Buttons deaktivieren, wenn keine Bewertungen vorhanden sind
            document.querySelectorAll('[onclick*="createPDF"]').forEach(button => {
                if (button.textContent.includes('PDF')) {
                    button.classList.remove('pdf-btn-enabled');
                    button.classList.add('pdf-btn-disabled');
                    button.setAttribute('disabled', 'true');
                }
            });
        }
    } else {
        console.error('window.firebaseFunctions oder getBewertungenFromCache ist nicht definiert.');
    }
}

// Export der relevanten Funktionen für andere Module oder globalen Zugriff
window.pdfFunctions = {
    createPDF,
    updatePDFButtonStatus,
    updateAllPDFButtons,
    // Falls displayPDF noch extern genutzt werden soll
    displayPDF, 
    // Intern genutzte Funktionen können auch bei Bedarf exportiert werden
    generateDocxData,
    generateDocxFromTemplate,
    displayDocxPDF
};

console.log('✅ Firebase PDF System bereit');
