let allTeams = [];

document.getElementById('homeLogo').addEventListener('click', () => {
    // 2026 Standard: Simple reload
    window.location.reload();
});



document.addEventListener('DOMContentLoaded', async () => {
    // 1. SELECT UI ELEMENTS
    const dMast = document.getElementById('dMast');
    const loader = document.getElementById('loader-overlay');

    // 2. CAPTURE URL PARAMETERS (The 'Source of Truth')
    const urlParams = new URLSearchParams(window.location.search);
    const master = urlParams.get('master') || "Default";

    // --- CRITICAL IPHONE FIX: Update Canonical Link ---
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
    }
    // This tells Safari: "The official version of this page IS the one with the parameter."
    canonical.href = window.location.href; 

    // 3. UPDATE UI HEADER
    if (dMast) {
        dMast.textContent = `${master}'s Draft`;
    }

    // 4. INJECT DYNAMIC MANIFEST (For Mobile "Add to Home Screen" Personalization)
    // 1. Get the exact base path for your local server
    // This works whether your URL is http://localhost:8080/index.html or http://localhost/project/index.html
    // Clean the current URL to remove any existing junk
    const currentFullURL = new URL(window.location.href);
    // Explicitly set the master parameter for the home screen launch
    currentFullURL.searchParams.set('master', master);
    const baseUrl = currentFullURL.origin + currentFullURL.pathname.substring(0, currentFullURL.pathname.lastIndexOf('/') + 1);

   // Replace your Step 4 Blob logic with this:
const dynamicManifest = {
    "short_name": `Draft-${master}`,
    "name": `${master}'s 2026 Draft Board`,
    "start_url": window.location.href, // Explicitly uses the full current URL
    "display": "standalone",
    "background_color": "#0d1117",
    "theme_color": "#58a6ff",
    "icons": [
        { "src": `${baseUrl}Madness.png`, "sizes": "192x192", "type": "image/png" },
        { "src": `${baseUrl}Madness.png`, "sizes": "512x512", "type": "image/png" }
    ]
};

// Encode the manifest as a Base64 string for better iOS 26 support
const manifestString = JSON.stringify(dynamicManifest);
const manifestBase64 = btoa(unescape(encodeURIComponent(manifestString)));
const manifestURL = `data:application/json;base64,${manifestBase64}`;

const link = document.createElement('link');
link.rel = 'manifest';
link.href = manifestURL;
document.head.appendChild(link);


    // 5. FETCH DATA FROM GOOGLE APPS SCRIPT
    // Replace the URL with your current Web App URL
    // Replace with your New Deployment Web App URL
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyDAer6siT5ACM2vF2j1rJX3Gax0_b_sQeMZ8XGm_qY_uCYF5RmFX1YkzU9BbpknQOVKw/exec';
    const fetchUrl = `${SCRIPT_URL}?action=getDraftData&t=${Date.now()}`;

    try {
        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error('Network response was not ok');

        const jsonData = await res.json();

        // Filter all rows by the master name captured in Step 2
        // We use lowercase comparison to prevent typos from breaking the board
        allTeams = jsonData.filter(item =>
            String(item.draftMaster).trim().toLowerCase() === master.toLowerCase()
        );

        console.log(`Successfully loaded ${allTeams.length} rows for ${master}`);

        // 6. RENDER THE TABLES
        renderAll();

    } catch (err) {
        console.error("Critical Load Error:", err);
        if (dMast) dMast.textContent = "Error Loading Draft Data";
    } finally {
        // 7. HIDE THE LOADING OVERLAY
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
            }, 500);
        }
    }
});


function renderAll() {
    renderLog();
    renderStandings();
}

function renderLog() {
    const body = document.getElementById('tableBody');
    if (!body) return;

    // Use headers exactly as they appear in Column 1 of Sheet1
    const allScores = allTeams.map(t => parseFloat(t.Pts) || 0).sort((a, b) => b - a);

    body.innerHTML = allTeams.map(item => {
        const currentPts = parseFloat(item.Pts) || 0;
        const calculatedRank = allScores.indexOf(currentPts) + 1;

        // Smart logo logic: checks for external URL or local path
        let playerLogo = (item.LogoURL && item.LogoURL.toString().trim() !== "")
            ? (item.LogoURL.startsWith('http') ? item.LogoURL : `./${item.LogoURL}`)
            : "./2026 Logo.png";

        return `
            <tr>
                <td data-label="Team">${item.player || '-'}</td>
                <td data-label="#">${item.order || '-'}</td>
                <td data-label="Player">
                    <div class="player-cell">
                        <img src="${playerLogo}" class="player-logo" alt="" onerror="this.src='./2026 Logo.png';">
                        <span>${item.pick || '-'}</span>
                    </div>
                </td>
                <td data-label="Pts" style="color:#58a6ff">${item.Pts || '0'}</td>
                <td data-label="Rank">${calculatedRank}</td>
                <td data-label="Status" class="status-${item.Done?.toLowerCase()}">${item.Done || '-'}</td>
            </tr>
        `;
    }).join('');
}

function renderStandings() {
    const body = document.getElementById('leaderboardBody');
    if (!body) return;

    // 1. Group rows by player/team name and sum points
    const stats = allTeams.reduce((acc, row) => {
        const teamName = row.player || 'Unknown';
        if (!acc[teamName]) acc[teamName] = { pts: 0, left: 0 };
        acc[teamName].pts += parseFloat(row.Pts) || 0;
        if (row.Done === "In") acc[teamName].left++;
        return acc;
    }, {});

    // 2. Sort by total points (Descending)
    const sortedTeams = Object.entries(stats)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.pts - a.pts);

    // 3. Generate reference list of scores for tie-handling
    const scoreList = sortedTeams.map(t => t.pts);
    const topScore = scoreList[0] || 0;

    // 4. Render with competition ranking
    body.innerHTML = sortedTeams.map(team => {
        // Standard competition rank: finds first occurrence of this score
        const rank = scoreList.indexOf(team.pts) + 1;
        const ptsBack = Math.round(topScore - team.pts);

        return `
            <tr>
                <td data-label="Rank">${rank}</td>
                <td data-label="Team">${team.name}</td>
                <td data-label="Total">${team.pts.toFixed(1)}</td>
                <td data-label="Back">${ptsBack}</td>
                <td data-label="Left">${team.left}</td>
            </tr>
        `;
    }).join('');
}


function filterTable() {
    const q = document.getElementById('playerSearch').value.toLowerCase();
    const filtered = allTeams.filter(t => (t.player || "").toLowerCase().includes(q));
    const original = allTeams;
    allTeams = filtered;
    renderLog();
    allTeams = original;
}