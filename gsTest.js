let allTeams = [];

// Replace with your New Deployment Web App URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxA8wKm4QjiRZ9GJvkd63RxoPsAv4QO7bvD6cKrERALy2eJungpU6Wp8EZlm_bdxG0_qg/exec';

document.addEventListener('DOMContentLoaded', async () => {
    const dMast = document.getElementById('dMast');
    const urlParams = new URLSearchParams(window.location.search);
    const master = urlParams.get('master') || "Default";
    dMast.textContent = `${master}'s Draft`;

    // Fetch JSON directly from your script
    const url = `${SCRIPT_URL}?action=getDraftData`;

    try {
        const res = await fetch(url);
        const jsonData = await res.json(); // Direct JSON parsing

        // Filter by the master from the URL
        allTeams = jsonData.filter(item => item.draftMaster === master);

        renderAll();
    } catch (err) {
        console.error("JSON Load Error:", err);
        dMast.textContent = "Error Loading Data via API";
    }
});

function renderAll() {
    renderLog();
    renderStandings();
}

function renderLog() {
    const body = document.getElementById('tableBody');
    if (!body) return; // Safety check

    // 1. Calculate ranks based on current points
    const allScores = allTeams.map(t => parseFloat(t.Pts) || 0).sort((a, b) => b - a);

    // 2. Map through data to create rows
    body.innerHTML = allTeams.map(item => {
        const currentPts = parseFloat(item.Pts) || 0;
        const calculatedRank = allScores.indexOf(currentPts) + 1;

        /**
         * LOGO LOGIC FOR GITHUB:
         * 1. If LogoURL starts with "http", use it directly (External Link).
         * 2. If it's a path like "logos/team.png", it adds "./" (Local GitHub Folder).
         * 3. If empty, it uses your "2026 Logo.png" as a fallback.
         */
        let playerLogo;
        if (item.LogoURL && item.LogoURL.trim() !== "") {
            playerLogo = item.LogoURL.startsWith('http') ? item.LogoURL : `./${item.LogoURL}`;
        } else {
            playerLogo = "./2026 Logo.png";
        }

        return `
            <tr>
                <td data-label="Team">${item.player}</td>
                <td data-label="#">${item.order}</td>
                <td data-label="Player">
                    <div class="player-cell">
                        <img src="${playerLogo}" class="player-logo" alt="" onerror="this.src='./2026 Logo.png';">
                        <span>${item.pick}</span>
                    </div>
                </td>
                <td data-label="Pts" style="color:#58a6ff">${item.Pts}</td>
                <td data-label="Rank">${calculatedRank}</td>
                <td data-label="Status" class="status-${item.Done?.toLowerCase()}">${item.Done}</td>
            </tr>
        `;
    }).join('');
}



function renderStandings() {
    const body = document.getElementById('leaderboardBody');
    if (!body) return;

    // 1. Aggregate stats
    const stats = allTeams.reduce((acc, teamRow) => {
        const teamName = teamRow.player || 'Unknown';
        if (!acc[teamName]) acc[teamName] = { pts: 0, left: 0 };
        acc[teamName].pts += parseFloat(teamRow.Pts) || 0;
        if (teamRow.Done === "In") acc[teamName].left++;
        return acc;
    }, {});

    // 2. Sort teams by points descending
    const sortedTeams = Object.entries(stats).sort((a, b) => b[1].pts - a[1].pts);

    // 3. Create a reference list of total scores for ranking ties
    const totalScoresList = sortedTeams.map(t => t[1].pts);
    const topScore = totalScoresList[0] || 0;

    // 4. Render the rows (The fix is using [name, teamData] instead of 'item')
    body.innerHTML = sortedTeams.map(([name, teamData]) => {
        const overallRank = totalScoresList.indexOf(teamData.pts) + 1;

        return `
            <tr>
                <td data-label="Rank">${overallRank}</td>
                <td data-label="Team">${name}</td>
                <td data-label="Total">${teamData.pts}</td>
                <td data-label="Back">${Math.round(topScore - teamData.pts)}</td>
                <td data-label="Left">${teamData.left}</td>
            </tr>
        `;
    }).join('');
}



function filterTable() {
    const q = document.getElementById('playerSearch').value.toLowerCase();
    const filtered = allTeams.filter(t => t.player.toLowerCase().includes(q));
    // Temporary override of global data for the log view
    const original = allTeams;
    allTeams = filtered;
    renderLog();
    allTeams = original;
}
