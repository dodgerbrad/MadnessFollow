let allTeams = [];

document.addEventListener('DOMContentLoaded', async () => {
    const dMastElement = document.getElementById('dMast');
    if (!dMastElement) return;

    const urlParams = new URLSearchParams(window.location.search);
    const masterFromUrl = urlParams.get('master');

    if (masterFromUrl) {
        dMastElement.dataset.master = masterFromUrl;
        dMastElement.textContent = `${masterFromUrl}'s Draft`;
    }

    const masterValue = dMastElement.dataset.master; 
    const SHEET_ID = '1pLOuB4Z2oFcLum34Bq7giFXTBd5AcRywKOjUs44uozQ';

    // MUST start with https:// and use ${ } for the variable
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Change`;
    


    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Google Sheet not found.");
        
        const csvText = await response.text();
        const rows = csvText.split(/\r?\n/).map(row => row.split(','));
        const cleanRows = rows.map(row => row.map(cell => cell.replace(/^"(.*)"$/, '$1').trim()));
        
        const headers = cleanRows[0]; 
        const rawData = cleanRows.slice(1).map(row => {
            let obj = {};
            row.forEach((cell, i) => { if (headers[i]) obj[headers[i]] = cell; });
            return obj;
        });

        allTeams = rawData.filter(item => item.draftMaster === masterValue);
        
        // These calls will work because function declarations are hoisted
        renderTable(allTeams);
        renderLeaderboard();
    } catch (error) {
        console.error('Error fetching from Google Sheets:', error);
    }
});

// --- HELPER FUNCTIONS ---

function renderTable(dataArray) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    tbody.innerHTML = ""; 

    const logRankRef = [...new Set(allTeams.map(t => parseFloat(t.Pts) || 0))].sort((a, b) => b - a);

    dataArray.forEach(item => {
        const row = document.createElement('tr');
        const pts = parseFloat(item.Pts) || 0;
        const rank = (item.Pts === "-") ? "-" : (logRankRef.indexOf(pts) + 1);

        row.innerHTML = `
            <td>${item.player || 'N/A'}</td>
            <td>${item.order || '-'}</td>
            <td>${item.pick || '-'}</td>
            <td>${item.Pts}</td>
            <td>${rank}</td>
            <td>${item.Done}</td>
        `;
        tbody.appendChild(row);
    });
}

function renderLeaderboard() {
    const lbody = document.getElementById('leaderboardBody');
    if (!lbody) return;
    lbody.innerHTML = "";

    const getNumericPts = (item) => {
        const val = parseFloat(item.Pts || item.pts); 
        return isNaN(val) ? 0 : val;
    };

    // Grouping logic to count 'In' status for 'Plys Left'
    const teamStats = allTeams.reduce((acc, item) => {
        const name = item.player || 'N/A';
        if (!acc[name]) acc[name] = { totalPts: 0, plysLeft: 0 };

        acc[name].totalPts += getNumericPts(item);
        
        // Logic: Increment counter if the player's status is "In"
        if (item.Done === "In") {
            acc[name].plysLeft += 1;
        }
        return acc;
    }, {});

    const sorted = Object.entries(teamStats).sort((a, b) => b[1].totalPts - a[1].totalPts);
    const uniqueScores = [...new Set(sorted.map(s => s[1].totalPts))].sort((a, b) => b - a);
    const leaderScore = sorted.length > 0 ? sorted[0][1].totalPts : 0;

    sorted.forEach(([name, stats]) => {
        const rank = stats.totalPts === 0 ? "-" : (uniqueScores.indexOf(stats.totalPts) + 1);
        const pointsBack = stats.totalPts === 0 ? "-" : Math.round(leaderScore - stats.totalPts);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${rank}</td>
            <td>${name}</td>
            <td>${stats.totalPts}</td>
            <td>${pointsBack}</td>
            <td>${stats.plysLeft}</td>
        `;
        lbody.appendChild(row);
    });
}

function filterTable() {
    const searchTerm = document.getElementById('playerSearch').value.toLowerCase();
    const filteredData = allTeams.filter(item => (item.player || "").toLowerCase().includes(searchTerm));
    renderTable(filteredData);
    renderLeaderboard();
}
