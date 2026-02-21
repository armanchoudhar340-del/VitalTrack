// Cycle Insights Logic

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const emptyState = document.getElementById('emptyState');
    const insightsGrid = document.getElementById('insightsGrid');

    const progressDayText = document.getElementById('progressDayText');
    const timelineProgress = document.getElementById('timelineProgress');
    const phaseLabel = document.getElementById('phaseLabel');
    const phaseDescription = document.getElementById('phaseDescription');
    const phaseIcon = document.getElementById('phaseIcon');

    const ovulationCountdown = document.getElementById('ovulationCountdown');
    const ovulationDateText = document.getElementById('ovulationDateText');
    const fertilityScoreText = document.getElementById('fertilityScoreText');
    const fertilityStatusText = document.getElementById('fertilityStatusText');

    const nextPeriodDateText = document.getElementById('nextPeriodDateText');
    const nextPeriodDaysLeft = document.getElementById('nextPeriodDaysLeft');
    const historyTableBody = document.getElementById('historyTableBody');

    const logoutBtn = document.getElementById('logoutBtn');

    const systemToday = new Date();
    systemToday.setHours(0, 0, 0, 0);

    // Initialize
    function init() {
        const periods = getPeriodData();
        const dateKeys = Object.keys(periods).sort();

        if (dateKeys.length === 0) {
            emptyState.style.display = 'block';
            insightsGrid.style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            insightsGrid.style.display = 'grid';
            renderInsights(periods, dateKeys);
        }

        setupEventListeners();
    }

    function setupEventListeners() {
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('isAuthenticated');
                window.location.href = 'index.html';
            });
        }
    }

    function getPeriodData() {
        const data = localStorage.getItem('periods');
        return data ? JSON.parse(data) : {};
    }

    function renderInsights(periods, dateKeys) {
        const cycleInfo = getCycleInfo(periods, dateKeys);
        const prediction = getPredictionData(periods, dateKeys);

        // 1. Current Progress
        if (cycleInfo.day !== "N/A" && typeof cycleInfo.day === 'number') {
            const avgLen = prediction.avgLength || 28;
            progressDayText.innerText = `Day ${cycleInfo.day} of ${avgLen}`;
            const percentage = Math.min(100, Math.max(0, (cycleInfo.day / avgLen) * 100));
            timelineProgress.style.width = `${percentage}%`;

            phaseLabel.innerText = cycleInfo.phase;
            phaseDescription.innerText = getPhaseMessage(cycleInfo.phase);
            updatePhaseIcon(cycleInfo.phase);
        } else {
            progressDayText.innerText = cycleInfo.day === "Upcoming" ? "Period Pending" : "N/A";
            timelineProgress.style.width = "0%";
            phaseLabel.innerText = "Upcoming Period";
            phaseDescription.innerText = "You are currently waiting for your next period to start.";
        }

        // 2. Ovulation & Fertility
        if (prediction.nextDate) {
            // Ovulation is usually 14 days before next period
            const ovDate = new Date(prediction.nextDate);
            ovDate.setDate(ovDate.getDate() - 14);

            const diff = Math.round((ovDate - systemToday) / (1000 * 60 * 60 * 24));

            if (diff > 0) {
                ovulationCountdown.innerText = diff;
                ovulationDateText.innerText = ovDate.toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' });
            } else if (diff === 0) {
                ovulationCountdown.innerText = "0";
                ovulationDateText.innerText = "Ovulation Today!";
            } else {
                ovulationCountdown.innerText = "--";
                ovulationDateText.innerText = "Passed this cycle";
            }

            // Fertility Score (Heuristic)
            const fScore = calculateFertilityScore(cycleInfo.day, avgLen);
            fertilityScoreText.innerText = `${fScore}%`;
            fertilityStatusText.innerText = getFertilityStatus(fScore);
        }

        // 3. Next Period
        if (prediction.nextDate) {
            nextPeriodDateText.innerText = prediction.nextDate.toLocaleDateString('default', { month: 'short', day: 'numeric' });
            const diff = Math.round((prediction.nextDate - systemToday) / (1000 * 60 * 60 * 24));
            nextPeriodDaysLeft.innerText = diff > 0 ? diff : (diff === 0 ? "0" : "Late");
        }

        // 4. Past History
        renderHistory(periods, dateKeys);

        lucide.createIcons();
    }

    function getCycleInfo(periods, dateKeys) {
        const prediction = getPredictionData(periods, dateKeys);
        const avgLen = prediction.avgLength || 28;
        const startDates = getStartDates(periods, dateKeys);
        const pastStarts = startDates.filter(d => d <= systemToday).sort((a, b) => b - a);

        if (pastStarts.length === 0) return { day: "Upcoming", phase: "N/A" };

        const lastStart = pastStarts[0];
        const diffDays = Math.floor((systemToday - lastStart) / (1000 * 60 * 60 * 24)) + 1;

        const ovulationDay = avgLen - 14;
        let phase = "";

        if (diffDays <= 5) phase = "Menstrual Phase";
        else if (diffDays < ovulationDay) phase = "Follicular Phase";
        else if (diffDays === ovulationDay) phase = "Ovulation Day";
        else if (diffDays <= avgLen) phase = "Luteal Phase";
        else phase = "Late Phase";

        return { day: diffDays, phase: phase, ovulationDay: ovulationDay };
    }

    function getStartDates(periods, dateKeys) {
        const startDates = [];
        dateKeys.forEach(key => {
            const d = new Date(key);
            const prev = new Date(d);
            prev.setDate(d.getDate() - 1);
            const prevKey = `${prev.getFullYear()}-${(prev.getMonth() + 1).toString().padStart(2, '0')}-${prev.getDate().toString().padStart(2, '0')}`;
            if (!periods[prevKey]) startDates.push(d);
        });
        return startDates;
    }

    function getPredictionData(periods, dateKeys) {
        const startDates = getStartDates(periods, dateKeys);
        if (startDates.length === 0) return { avgLength: 28, nextDate: null };

        let avgLength = 28;
        if (startDates.length >= 2) {
            let total = 0;
            for (let i = 1; i < startDates.length; i++) {
                total += (startDates[i] - startDates[i - 1]) / (1000 * 60 * 60 * 24);
            }
            avgLength = Math.round(total / (startDates.length - 1));
        }

        const lastStart = startDates[startDates.length - 1];
        const nextDate = new Date(lastStart);
        nextDate.setDate(lastStart.getDate() + avgLength);

        return { avgLength, nextDate };
    }

    function getPhaseMessage(phase) {
        switch (phase) {
            case "Menstrual Phase": return "Your period is active. Focus on rest and iron-rich foods.";
            case "Follicular Phase": return "Estrogen is rising. Ideal time for new projects and exercise.";
            case "Ovulation Day": return "The egg is released. Your fertility is at its highest today.";
            case "Luteal Phase": return "Progesterone is high. You might notice heightened sensitivity and PMS.";
            default: return "Track your daily symptoms for more personalized insights.";
        }
    }

    function updatePhaseIcon(phase) {
        if (!phaseIcon) return;
        let iconName = "sparkles";
        if (phase === "Menstrual Phase") iconName = "droplets";
        if (phase === "Ovulation Day") iconName = "heart";
        if (phase === "Luteal Phase") iconName = "moon";
        phaseIcon.setAttribute('data-lucide', iconName);
    }

    function calculateFertilityScore(day, avgLen) {
        if (typeof day !== 'number') return 5;
        const ovulationDay = avgLen - 14;
        const dist = Math.abs(day - ovulationDay);

        if (dist === 0) return 98;
        if (dist === 1) return 88;
        if (dist === 2) return 72;
        if (dist === 3) return 45;
        if (dist <= 5) return 20;
        return 5;
    }

    function getFertilityStatus(score) {
        if (score > 80) return "Peak Fertility";
        if (score > 50) return "High Fertility";
        if (score > 20) return "Moderate Fertility";
        return "Low Fertility";
    }

    function renderHistory(periods, dateKeys) {
        const startDates = getStartDates(periods, dateKeys).sort((a, b) => b - a);
        historyTableBody.innerHTML = '';

        if (startDates.length === 0) {
            historyTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No history yet</td></tr>';
            return;
        }

        startDates.forEach((start, index) => {
            const nextStart = startDates[index - 1]; // Because we sorted b-a
            let length = "N/A";
            if (nextStart) {
                length = `${Math.round((nextStart - start) / (1000 * 60 * 60 * 24))} days`;
            }

            // Count period duration
            let duration = 0;
            const temp = new Date(start);
            while (periods[`${temp.getFullYear()}-${(temp.getMonth() + 1).toString().padStart(2, '0')}-${temp.getDate().toString().padStart(2, '0')}`]) {
                duration++;
                temp.setDate(temp.getDate() + 1);
                if (duration > 15) break; // Safeguard
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${start.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                <td>${length}</td>
                <td>${duration} days</td>
                <td><span style="color: var(--primary);">Regular</span></td>
            `;
            historyTableBody.appendChild(row);
        });
    }

    init();
});
