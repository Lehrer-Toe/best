// Firebase Klassen-System
console.log('🏫 Firebase Klassen-System geladen');

// Klassen laden und anzeigen
function loadKlassen() {
    if (!window.firebaseFunctions.requireAdmin()) return;

    const liste = document.getElementById('klassenListe');
    if (!liste) return;

    const klassen = window.firebaseFunctions.getKlassenFromCache();
    let html = '';
    klassen.forEach(klasse => {
        html += `<div class="liste-item">
            <div>
                <strong>${klasse.name}</strong> <small>(${klasse.schuljahr})</small><br>
                <small>${klasse.schueler ? klasse.schueler.length : 0} Schüler</small>
            </div>
            <button class="btn btn-danger" onclick="klasseLoeschen('${klasse.id}')">Löschen</button>
        </div>`;
    });

    liste.innerHTML = html || '<div class="card"><p>Keine Klassen vorhanden.</p></div>';

    updateKlassenSelect();
}

// Klasse anlegen
async function klasseAnlegen() {
    if (!window.firebaseFunctions.requireAdmin()) return;

    const input = document.getElementById('klassenName');
    const name = input ? input.value.trim() : '';
    if (!name) {
        alert('Bitte Klassenbezeichnung eingeben!');
        return;
    }

    const schuljahr = window.firebaseFunctions.dataCache.config?.schuljahr || '';
    const klassenRef = window.firebaseFunctions.getDatabaseRef('klassen');
    const newRef = window.firebaseDB.push(klassenRef);
    const klasse = { id: newRef.key, name, schuljahr, schueler: [] };
    await window.firebaseDB.set(newRef, klasse);
    input.value = '';
}

// Klasse löschen
async function klasseLoeschen(id) {
    if (!window.firebaseFunctions.requireAdmin()) return;
    if (!confirm('Klasse wirklich löschen?')) return;

    const ref = window.firebaseFunctions.getDatabaseRef(`klassen/${id}`);
    await window.firebaseDB.remove(ref);
}

// Schüler-Datei hochladen
async function schuelerDateiHochladen() {
    if (!window.firebaseFunctions.requireAdmin()) return;

    const dateiInput = document.getElementById('schuelerDatei');
    const klasseSelect = document.getElementById('klasseAuswahlUpload');
    const orderSelect = document.getElementById('namenReihenfolge');

    const file = dateiInput?.files?.[0];
    const klasseId = klasseSelect?.value;
    const order = orderSelect?.value || 'vorname';

    if (!file || !klasseId) {
        alert('Bitte Datei und Klasse wählen!');
        return;
    }

    const text = await file.arrayBuffer();
    let names = [];

    if (file.name.endsWith('.xlsx')) {
        const xlsx = await import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
        const workbook = xlsx.read(text);
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(firstSheet, { header: 1 });
        data.forEach(row => {
            if (row[0]) names.push(row.join(' '));
        });
    } else {
        const decoder = new TextDecoder('utf-8');
        const content = decoder.decode(text);
        names = content.split(/\r?\n/).filter(r => r.trim());
    }

    const schueler = names.map(line => {
        let vorname = '';
        let nachname = '';
        const parts = line.split(/[;,\s]+/).filter(p => p);
        if (order === 'nachname') {
            [nachname, vorname] = parts;
        } else {
            [vorname, nachname] = parts;
        }
        return { vorname, nachname };
    });

    const ref = window.firebaseFunctions.getDatabaseRef(`klassen/${klasseId}/schueler`);
    const snapshot = await window.firebaseDB.get(ref);
    const bestehende = snapshot.exists() ? snapshot.val() : [];
    await window.firebaseDB.set(ref, [...bestehende, ...schueler]);
    dateiInput.value = '';
    alert('Schülerliste importiert.');
}

// Klassen für Auswahl aktualisieren
function updateKlassenSelect() {
    const selects = document.querySelectorAll('.klasse-auswahl');
    const klassen = window.firebaseFunctions.getKlassenFromCache();
    const options = ['<option value="">Klasse wählen...</option>'];
    klassen.forEach(k => {
        options.push(`<option value="${k.id}">${k.name}</option>`);
    });
    selects.forEach(sel => { sel.innerHTML = options.join(''); });
}

// Utils für andere Module
function getKlassenFromCache() {
    return Object.values(window.firebaseFunctions.dataCache.klassen || {});
}

function getSchuelerForKlasse(id) {
    const klasse = window.firebaseFunctions.dataCache.klassen?.[id];
    return klasse?.schueler || [];
}

window.klassenFunctions = {
    loadKlassen,
    updateKlassenSelect,
    getKlassenFromCache,
    getSchuelerForKlasse
};

console.log('✅ Firebase Klassen-System bereit');
