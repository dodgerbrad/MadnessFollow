let allTeams = [];

document.getElementById('homeLogo').addEventListener('click', () => {
    // 2026 Standard: Simple reload
    window.location.reload();
});



document.addEventListener('DOMContentLoaded', async () => {
    const dMast = document.getElementById('dMast');
    const loader = document.getElementById('loader-overlay');

    const urlParams = new URLSearchParams(window.location.search);
    const master = urlParams.get('master') || "Default";

    // --- 1. Canonical & Manifest Setup ---
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
    }
    canonical.href = window.location.href;

    if (dMast) dMast.textContent = `${master}'s Draft`;

    const currentFullURL = new URL(window.location.href);
    currentFullURL.searchParams.set('master', master);
    const baseUrl = currentFullURL.origin + currentFullURL.pathname.substring(0, currentFullURL.pathname.lastIndexOf('/') + 1);

    const dynamicManifest = {
        "short_name": `Draft-${master}`,
        "name": `${master}'s 2026 Draft Board`,
        "start_url": currentFullURL.toString(),
        "display": "standalone",
        "background_color": "#0d1117",
        "theme_color": "#58a6ff",
        "icons": [
            { "src": `${baseUrl}Madness.png`, "sizes": "192x192", "type": "image/png" },
            { "src": `${baseUrl}Madness.png`, "sizes": "512x512", "type": "image/png" }
        ]
    };

    const manifestURL = `data:application/json;base64,${btoa(unescape(encodeURIComponent(JSON.stringify(dynamicManifest))))}`;
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = manifestURL;
    document.head.appendChild(link);

    // --- 2. Fetch & Static Ranking Logic ---
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyw6Br-YHLRzRkmqLrpDbTS98x53CYVrYr48S7ZddRw5z2J4TQ67WeuWq64eT1ZK1XKpg/exec';
    const fetchUrl = `${SCRIPT_URL}?action=getDraftData&t=${Date.now()}`;

    try {
        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error('Network response was not ok');

        // This defines jsonData for the whole block
        const jsonData = await res.json();

        // Filter for specific master
        const masterData = jsonData.filter(item =>
            String(item.draftMaster).trim().toLowerCase() === master.toLowerCase()
        );

        // Calculate Ranks ONCE based on this master's full list
        const masterScores = masterData.map(t => parseFloat(t.Pts) || 0).sort((a, b) => b - a);

        // Attach a permanent 'staticRank' to every item
        allTeams = masterData.map(item => {
            const pts = parseFloat(item.Pts) || 0;
            return {
                ...item,
                staticRank: masterScores.indexOf(pts) + 1
            };
        });

        console.log(`Loaded ${allTeams.length} rows with static ranking.`);
        renderAll();

    } catch (err) {
        console.error("Critical Load Error:", err);
        if (dMast) dMast.textContent = "Error Loading Draft Data";
    } finally {
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => { loader.style.display = 'none'; }, 500);
        }
    }
});



function renderAll() {
    renderLog();
    renderStandings();
}

function renderLog(dataToRender = allTeams) {
    const body = document.getElementById('tableBody');
    if (!body) return;

    body.innerHTML = dataToRender.map(item => {
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
                <td data-label="Rank">${item.staticRank}</td> <!-- Use the static rank here -->
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
    renderLog(filtered);
}
