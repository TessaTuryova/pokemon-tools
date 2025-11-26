// ------- Load updated_pokemon.csv into memory -------

let evoData = {};

async function loadCSV() {
    const response = await fetch("updated_pokemon.csv");
    const text = await response.text();

    const rows = text.trim().split("\n").slice(1); // skip header
    rows.forEach(row => {
        const cols = row.split(",");

        const name = cols[0].trim().toLowerCase();
        const dex = parseInt(cols[1].trim());
        const stage = parseInt(cols[5] || "1");
        const evoFrom = cols[6] ? cols[6].trim().toLowerCase() : null;

        evoData[name] = {
            dex: dex,
            stage: stage,
            evolves_from: evoFrom
        };
    });
}

loadCSV();


// -------- constants ----------

const untradables = new Set([
    "mew", "celebi", "jirachi", "deoxys", "darkrai", "shaymin",
    "victini", "keldeo", "meloetta", "genesect", "diancie",
    "hoopa", "volcanion", "marshadow", "zarude"
]);


// ---------- Nidoran name helpers ----------

// convert input name to canonical CSV name
function normalizeName(name) {
    let low = name.toLowerCase().trim();

    // Input like "Nidoran♀"
    if (low.includes("♀")) return "nidoran-f";
    if (low.includes("♂")) return "nidoran-m";

    // Input like "Nidoran (whatever)" → treat as both variants? NO → assume user input matches dex numbers
    // If it's exactly Nidoran by dex number:
    if (low === "nidoran f" || low === "nidoran-f") return "nidoran-f";
    if (low === "nidoran m" || low === "nidoran-m") return "nidoran-m";

    return low;
}

// convert canonical name to search string with correct symbol
function formatName(name) {
    if (name === "nidoran-f") return "Nidoran♀";
    if (name === "nidoran-m") return "Nidoran♂";

    // default capitalize
    return name.charAt(0).toUpperCase() + name.slice(1);
}


// -------- helpers ----------

// helper na odstránenie zátvoriek a trim
function cleanName(raw) {
    return raw.replace(/\(.*?\)/g, "").trim();
}

function isPokemonName(line) {
    return /^[A-Za-z♀♂][A-Za-z0-9'♀♂\-\s]*$/.test(line.trim());
}

function normalizeName(name) {
    let low = name.toLowerCase();
    if (low.includes("♀")) return "nidoran-f";
    if (low.includes("♂")) return "nidoran-m";
    if (low === "nidoran f" || low === "nidoran-f") return "nidoran-f";
    if (low === "nidoran m" || low === "nidoran-m") return "nidoran-m";
    return low;
}

async function processData() {
    if (Object.keys(evoData).length === 0) {
        alert("Loading Pokémon database... please try again in 1 sec.");
        return;
    }

    const input = document.getElementById("input").value;
    const lines = input.split("\n").map(l => l.trim());
    const baseNames = [];

    let i = 0;
    while (i < lines.length - 1) {
        const rawName = lines[i];
        const dex = lines[i + 1];

        const cleaned = cleanName(rawName); // <--- vyčistíme názov pred validáciou

        if (isPokemonName(cleaned) && /^\d{4}$/.test(dex)) {
            let canonical = normalizeName(cleaned);

            // FIX pre Nidoran podľa dex čísla
            if (canonical === "nidoran") {
                const dexNum = parseInt(dex);
                if (dexNum === 29) canonical = "nidoran-f";
                if (dexNum === 32) canonical = "nidoran-m";
            }

            if (!untradables.has(canonical)) {
                baseNames.push(canonical);
            }

            i += 2;
        } else {
            i += 1;
        }
    }

    // Build final search set
    const finalSet = new Set();
    baseNames.forEach(p => {
        if (!evoData[p]) return;
        finalSet.add(p);

        // pridáme predchádzajúcu evolúciu
        if (evoData[p].stage > 1) {
            const prev = evoData[p].evolves_from;
            if (prev && !untradables.has(prev)) {
                finalSet.add(prev);
            }
        }
    });

    // Sort by dex number
    const sorted = [...finalSet].sort((a, b) => {
        const dexA = evoData[a]?.dex ?? 99999;
        const dexB = evoData[b]?.dex ?? 99999;
        return dexA - dexB;
    });

    const finalOutput = sorted.map(n => {
        if (n === "nidoran-f") return "Nidoran♀";
        if (n === "nidoran-m") return "Nidoran♂";
        return n.charAt(0).toUpperCase() + n.slice(1);
    });

    document.getElementById("output").value = finalOutput.join(", ");
}

// -------- Copy to clipboard function --------
function copyToClipboard() {
    const outputText = document.getElementById("output").value;
    
    if (!outputText) {
        alert("Nie je čo kopírovať. Najprv vygeneruj output!");
        return;
    }
    
    navigator.clipboard.writeText(outputText).then(() => {
        const copyButton = document.getElementById("copy-button");
        const originalText = copyButton.textContent;
        
        // Change button text to show success
        copyButton.textContent = "✓ Skopírované!";
        copyButton.style.background = "linear-gradient(135deg, #4CAF50, #45a049)";
        
        // Reset after 2 seconds
        setTimeout(() => {
            copyButton.textContent = originalText;
            copyButton.style.background = "";
        }, 2000);
    }).catch(err => {
        alert("Chyba pri kopírovaní: " + err);
    });
}

