let allTeams = [];

document.addEventListener('DOMContentLoaded', async () => {
    const dMast = document.getElementById('dMast');
    const urlParams = new URLSearchParams(window.location.search);
    const master = urlParams.get('master') || "Default";

    dMast.textContent = `${master}'s Draft`;

    // REPLACE THIS with your actual Published CSV link
    const SHEET_ID = '1pLOuB4Z2oFcLum34Bq7giFXTBd5AcRywKOjUs44uozQ';
    const url = `https://docs.google.com/spreadsheets/d/e/2PACX-1vSqMpZdzLDdyKl1HqHtx4t_UUpJx6F7I4JhOGD5JhSyMFq9xY11Psl-HFrpPMBZzKh1efH074NOlz5B/pub?gid=1466103352&single=true&output=csv`;

    try {
        const res = await fetch(url);
        const data = await res.text();

        // CSV Parsing logic
        const rows = data.split('\n').map(row => row.split(',').map(cell => cell.replace(/^"(.*)"$/, '$1').trim()));
        const headers = rows[0];

        allTeams = rows.slice(1).map(row => {
            let obj = {};
            row.forEach((val, i) => obj[headers[i]] = val);
            return obj;
        }).filter(item => item.draftMaster === master);

        renderAll();
    } catch (err) {
        console.error("Load Error:", err);
        dMast.textContent = "Error Loading Sheet - Is it Published to Web?";
    }
});

function renderAll() {
    renderLog();
    renderStandings();
}

function renderLog() {
    const body = document.getElementById('tableBody');
    const allScores = allTeams.map(t => parseFloat(t.Pts) || 0).sort((a, b) => b - a);

    body.innerHTML = allTeams.map(item => {
        const currentPts = parseFloat(item.Pts) || 0;
        const calculatedRank = allScores.indexOf(currentPts) + 1;

        // The Fix: If LogoURL is missing, it shows a generic sports icon
        // Correcting the variable and adding the full https:// protocol
        const imgUrl = (item.LogoURL && item.LogoURL.trim() !== "")
            ? item.LogoURL
            : "cdn-icons-png.flaticon.com"; // Full URL required


        return `
            <tr>
                <td data-label="Team">${item.player}</td>
                <td data-label="#">${item.order}</td>
                <td data-label="Player">
                    <div class="player-cell">
                        <img src="${imgUrl}" alt="" class="player-logo">
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
