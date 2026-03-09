// ------- Load updated_pokemon.csv into memory -------

let evoData = {};

// why dis not work
const infoContent = `1) idem na godex/collection

2) dam filter na 'need'

3) dam alt+a a ctrl+c

4) pacnem do input okna a dám generuj

5) voila, vysledny string output okne (aj s base mon verziami, zoradene podľa dex num, vyradene veci čo sa nedaju trejdiť)

PS: mínus varianty`;

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
function normalizeName(name, dexNum = null) {
    let low = name.toLowerCase().trim();

    // Explicit symbol handling
    if (low.includes("♀")) return "nidoran-f";
    if (low.includes("♂")) return "nidoran-m";

    // Text variants
    if (low === "nidoran f" || low === "nidoran-f") return "nidoran-f";
    if (low === "nidoran m" || low === "nidoran-m") return "nidoran-m";

    // If it's exactly "nidoran", we **must** use DEX to decide
    if (low === "nidoran" && dexNum !== null) {
        if (dexNum === 29) return "nidoran-f";
        if (dexNum === 32) return "nidoran-m";
    }

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

async function processData() {
    if (Object.keys(evoData).length === 0) {
        alert("Loading Pokémon database... please try again in 1 sec.");
        return;
    }

    const input = document.getElementById("input").value;
    // split but KEEP empty lines as empty strings, then trim individual lines
    const rawLines = input.split("\n").map(l => l.replace(/\r/g, "")); // remove CR if any
    // normalize: trim each line but keep empties as ""
    const lines = rawLines.map(l => l.trim());

    const baseNames = [];

    let idx = 0;
    while (idx < lines.length) {
        // skip empty lines until we find a candidate name
        if (!lines[idx]) {
            idx++;
            continue;
        }

        // collect consecutive non-empty lines until we hit an empty line or end
        const block = [];
        while (idx < lines.length && lines[idx]) {
            block.push(lines[idx]);
            idx++;
        }

        // Heuristic: in a block like:
        // [ "Baxcalibur", "Baxcalibur" ]  (then next block may contain "0998")
        // or the dex could be on the same block as the name if formatting differs.
        // We'll look forward up to 3 following blocks/lines for the nearest dex number.
        // First, check if the block itself contains a dex line (e.g., last line is digits).
        let nameCandidate = null;
        let dexCandidate = null;

        // Try to find a dex within the current block (prefer last numeric line)
        for (let j = block.length - 1; j >= 0; j--) {
            const maybeDex = block[j].trim();
            if (/^\d{3,4}$/.test(maybeDex)) {
                dexCandidate = maybeDex;
                // pick the most plausible name before it: the last non-numeric cleaned line
                for (let k = j - 1; k >= 0; k--) {
                    const maybeName = cleanName(block[k]);
                    if (isPokemonName(maybeName)) {
                        nameCandidate = maybeName;
                        break;
                    }
                }
                break;
            }
        }

        // If no dex found in current block, look ahead up to next 3 non-empty lines blocks
        if (!dexCandidate) {
            let lookIdx = idx; // idx points to first line after current block
            let lookAheadCount = 0;
            while (lookIdx < lines.length && lookAheadCount < 6 && !dexCandidate) {
                // skip empties
                if (!lines[lookIdx]) {
                    lookIdx++;
                    continue;
                }
                const maybe = lines[lookIdx].trim();
                if (/^\d{3,4}$/.test(maybe)) {
                    dexCandidate = maybe;
                    break;
                }
                lookIdx++;
                lookAheadCount++;
            }
            // choose nameCandidate as last non-numeric line in the original block
            for (let k = block.length - 1; k >= 0; k--) {
                const maybeName = cleanName(block[k]);
                if (isPokemonName(maybeName)) {
                    nameCandidate = maybeName;
                    break;
                }
            }
        }

        // If we still don't have a nameCandidate but the block has a non-numeric line, take first
        if (!nameCandidate) {
            for (let k = 0; k < block.length; k++) {
                const maybeName = cleanName(block[k]);
                if (isPokemonName(maybeName)) {
                    nameCandidate = maybeName;
                    break;
                }
            }
        }

        // Final validations
        if (nameCandidate) {
            // If name appears repeated ("Baxcalibur", "Baxcalibur"), remove duplicates by picking one
            // cleanName already stripped parentheses so it's fine.
            let canonical = normalizeName(nameCandidate);

            // If the canonical is still "nidoran" and we have a dexCandidate, use dex to disambiguate
            if (canonical === "nidoran" && dexCandidate !== null) {
                const dexNum = parseInt(dexCandidate);
                if (dexNum === 29) canonical = "nidoran-f";
                if (dexNum === 32) canonical = "nidoran-m";
            }

            // Only include if we know this pokemon in evoData and it's tradable
            if (!untradables.has(canonical) && evoData[canonical]) {
                baseNames.push(canonical);
            } else if (!evoData[canonical]) {
                // try a fallback: lowercase cleaned name lookup (handles capitalizations)
                const fallback = nameCandidate.toLowerCase();
                if (evoData[fallback] && !untradables.has(fallback)) {
                    baseNames.push(fallback);
                }
            }
        }

        // continue from idx (we already advanced past the current block)
    } // end while over lines

    // remove duplicates while preserving insertion order
    const uniqueBase = [...new Set(baseNames)];

    // Build final search set (recursively add all previous stages)
    const finalSet = new Set();
    uniqueBase.forEach(p => {
        if (!evoData[p]) return;
        
        let current = p;
        // Recursively go back to all previous evolution stages
        while (current && evoData[current]) {
            finalSet.add(current);
            if (evoData[current].stage > 1) {
                const prev = evoData[current].evolves_from;
                if (prev && !untradables.has(prev)) {
                    current = prev;
                } else {
                    break;
                }
            } else {
                break;
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

// -------- Info Modal Functions --------
function openInfoModal() {
    const modal = document.getElementById("infoModal");
    const infoText = document.getElementById("infoText");
    infoText.textContent = infoContent;
    modal.style.display = "block";
}

function closeInfoModal() {
    const modal = document.getElementById("infoModal");
    modal.style.display = "none";
}

// Close modal when clicking outside of it
window.onclick = function(event) {
    const modal = document.getElementById("infoModal");
    if (event.target === modal) {
        modal.style.display = "none";
    }
}

