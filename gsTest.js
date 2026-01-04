let allTeams = [];

// Replace with your New Deployment Web App URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyDAer6siT5ACM2vF2j1rJX3Gax0_b_sQeMZ8XGm_qY_uCYF5RmFX1YkzU9BbpknQOVKw/exec';



document.addEventListener('DOMContentLoaded', async () => {
    const loader = document.getElementById('loader-overlay');
    const dMast = document.getElementById('dMast');
    const urlParams = new URLSearchParams(window.location.search);
    const master = urlParams.get('master') || "Default";
    dMast.textContent = `${master}'s Draft`;

    const url = `${SCRIPT_URL}?action=getDraftData`;

    try {
        const res = await fetch(url);
        const jsonData = await res.json();

        allTeams = jsonData.filter(item =>
            String(item.draftMaster).trim().toLowerCase() === master.toLowerCase()
        );

        renderAll();
    } catch (err) {
        console.error("Load Error:", err);
    } finally {
        // HIDE LOADER: Fade out and then remove
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.display = 'none';
        }, 500); // Matches the 0.5s CSS transition
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