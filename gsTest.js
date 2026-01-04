let allTeams = [];

// Replace with your New Deployment Web App URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxA8wKm4QjiRZ9GJvkd63RxoPsAv4QO7bvD6cKrERALy2eJungpU6Wp8EZlm_bdxG0_qg/exec';



document.addEventListener('DOMContentLoaded', async () => {
    const dMast = document.getElementById('dMast');
    const urlParams = new URLSearchParams(window.location.search);
    const master = urlParams.get('master') || "Default";
    dMast.textContent = `${master}'s Draft`;

    const url = `${SCRIPT_URL}?action=getDraftData`;

    try {
        const res = await fetch(url);
        const jsonData = await res.json();
        
        // Filter by draftMaster (Case sensitive to your Sheet header)
        allTeams = jsonData.filter(item => item.draftMaster === master);
        
        renderAll();
    } catch (err) {
        console.error("Load Error:", err);
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

    const stats = allTeams.reduce((acc, row) => {
        const team = row.player || 'Unknown';
        if (!acc[team]) acc[team] = { pts: 0, left: 0 };
        acc[team].pts += parseFloat(row.Pts) || 0;
        if (row.Done === "In") acc[team].left++;
        return acc;
    }, {});

    const sorted = Object.entries(stats).sort((a, b) => b[1].pts - a[1].pts);
    const topScore = sorted.length > 0 ? sorted[0][1].pts : 0;

    body.innerHTML = sorted.map(([name, data], i) => {
        return `
            <tr>
                <td data-label="Rank">${i + 1}</td>
                <td data-label="Team">${name}</td>
                <td data-label="Total">${data.pts}</td>
                <td data-label="Back">${Math.round(topScore - data.pts)}</td>
                <td data-label="Left">${data.left}</td>
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
