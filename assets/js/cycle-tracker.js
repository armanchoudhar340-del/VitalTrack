// Cycle Tracker Logic

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const calendarGrid = document.getElementById('calendarGrid');
    const currentMonthTitle = document.getElementById('currentMonth');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');

    const logModal = document.getElementById('logModal');
    const modalTitle = document.getElementById('modalTitle');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    const saveLogBtn = document.getElementById('saveLogBtn');
    const logNotes = document.getElementById('logNotes');
    const logoutBtn = document.getElementById('logoutBtn');
    const toast = document.getElementById('toast');
    const resetCalendarBtn = document.getElementById('resetCalendarBtn');

    // Marking Buttons
    const markPeriodBtn = document.getElementById('markPeriodBtn');
    const markFertileBtn = document.getElementById('markFertileBtn');
    const clearMarkingBtn = document.getElementById('clearMarkingBtn');

    // Reusable Insight Modal Elements
    const insightModal = document.getElementById('insightModal');
    const insightTitle = document.getElementById('insightTitle');
    const insightBody = document.getElementById('insightBody');
    const closeInsightBtn = document.getElementById('closeInsightBtn');
    const closeInsightFooterBtn = document.getElementById('closeInsightFooterBtn');
    const insightActionBtn = document.getElementById('insightActionBtn');

    // Summary Card Elements
    const cycleDayCard = document.getElementById('cycleDayCard');
    const nextPeriodCard = document.getElementById('nextPeriodCard');
    const ovulationCard = document.getElementById('ovulationCard');
    const fertileWindowCard = document.getElementById('fertileWindowCard');

    // State
    const systemToday = new Date();
    let viewDate = new Date(systemToday.getFullYear(), systemToday.getMonth(), 1);
    let selectedDateKey = ''; // Format: cycle-YYYY-MM-DD
    let selectedDayStatus = null;

    // Initialize
    function init() {
        renderCalendar();
        setupEventListeners();
        updateNextPeriod();
        updateCycleDay();
        updateOvulationCard();
        updateFertilityCard();
    }

    function setupEventListeners() {
        prevMonthBtn.addEventListener('click', () => {
            viewDate.setMonth(viewDate.getMonth() - 1);
            renderCalendar();
        });

        nextMonthBtn.addEventListener('click', () => {
            viewDate.setMonth(viewDate.getMonth() + 1);
            renderCalendar();
        });

        if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
        if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);
        if (saveLogBtn) saveLogBtn.addEventListener('click', saveLog);

        if (markPeriodBtn) markPeriodBtn.addEventListener('click', () => setMarking('period'));
        if (markFertileBtn) markFertileBtn.addEventListener('click', () => setMarking('fertile'));
        if (clearMarkingBtn) clearMarkingBtn.addEventListener('click', () => setMarking(null));

        if (cycleDayCard) cycleDayCard.addEventListener('click', () => openInsight('cycle-day'));
        if (nextPeriodCard) nextPeriodCard.addEventListener('click', () => openInsight('next-period'));
        if (ovulationCard) ovulationCard.addEventListener('click', () => openInsight('ovulation'));
        if (fertileWindowCard) fertileWindowCard.addEventListener('click', () => openInsight('fertile-window'));

        if (closeInsightBtn) closeInsightBtn.addEventListener('click', closeInsight);
        if (closeInsightFooterBtn) closeInsightFooterBtn.addEventListener('click', closeInsight);
        if (insightActionBtn) {
            insightActionBtn.addEventListener('click', () => {
                closeInsight();
                window.location.href = 'cycle-insights.html';
            });
        }

        [logModal, insightModal].forEach(modal => {
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) modal.classList.remove('active');
                });
            }
        });

        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('isAuthenticated');
                window.location.href = 'index.html';
            });
        }

        if (resetCalendarBtn) {
            resetCalendarBtn.addEventListener('click', resetCalendar);
        }
    }

    function resetCalendar() {
        if (confirm("Are you sure you want to reset all cycle data?")) {
            const keysToRemove = ['periods'];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('cycle-')) keysToRemove.push(key);
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
            renderCalendar();
            updateNextPeriod();
            showToast("Calendar reset successfully!");
        }
    }

    function setMarking(status) {
        selectedDayStatus = status;
        markPeriodBtn.classList.remove('active');
        markFertileBtn.classList.remove('active');
        if (status === 'period') markPeriodBtn.classList.add('active');
        if (status === 'fertile') markFertileBtn.classList.add('active');
    }

    // --- Data Management Functions ---

    function getPeriodData() {
        const data = localStorage.getItem('periods');
        return data ? JSON.parse(data) : {};
    }

    function savePeriodData(periods) {
        localStorage.setItem('periods', JSON.stringify(periods));
    }

    function markPeriod(startDateKey) {
        const periods = getPeriodData();
        const start = getDateFromKey(startDateKey);
        for (let i = 0; i < 7; i++) {
            const current = new Date(start);
            current.setDate(start.getDate() + i);
            const dateStr = getKeyFromDate(current).replace('cycle-', '');
            periods[dateStr] = true;
        }
        savePeriodData(periods);
    }

    function clearPeriodOnDate(dateKey) {
        const periods = getPeriodData();
        const dateStr = dateKey.replace('cycle-', '');
        delete periods[dateStr];
        savePeriodData(periods);
    }

    function getKeyFromDate(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `cycle-${year}-${month}-${day}`;
    }

    function getDateFromKey(key) {
        const parts = key.split('-');
        return new Date(parseInt(parts[1]), parseInt(parts[2]) - 1, parseInt(parts[3]));
    }

    function loadSavedLog(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }

    // --- Prediction Logic ---

    function getPredictionData() {
        const periods = getPeriodData();
        const sortedDates = Object.keys(periods).map(d => new Date(d)).sort((a, b) => a - b);
        if (sortedDates.length === 0) return { avgLength: 28, nextDate: null, predictedDates: [] };

        // Identify start dates of real periods
        const startDates = [];
        if (sortedDates.length > 0) startDates.push(sortedDates[0]);
        for (let i = 1; i < sortedDates.length; i++) {
            const diff = (sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24);
            if (diff > 7) startDates.push(sortedDates[i]); // New period block
        }

        // Calculate average cycle length (using last 3 starts if available)
        let avgLength = 28;
        if (startDates.length >= 2) {
            const lastStarts = startDates.slice(-4); // Last 4 gives 3 intervals
            let totalDays = 0;
            let count = 0;
            for (let i = 1; i < lastStarts.length; i++) {
                totalDays += (lastStarts[i] - lastStarts[i - 1]) / (1000 * 60 * 60 * 24);
                count++;
            }
            avgLength = Math.round(totalDays / count);
        }

        // Predict next date
        const lastStart = startDates[startDates.length - 1];
        const nextDate = new Date(lastStart);
        nextDate.setDate(lastStart.getDate() + avgLength);

        // Generate 7-day predicted range
        const predictedDates = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(nextDate);
            d.setDate(nextDate.getDate() + i);
            const ds = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
            if (!periods[ds]) predictedDates.push(ds); // Only if no real period
        }

        return { avgLength, nextDate, predictedDates };
    }

    // --- End Section ---

    function openInsight(type) {
        let title = '';
        let bodyHtml = '';
        const prediction = getPredictionData();

        switch (type) {
            case 'cycle-day':
                title = 'Cycle Details';
                const cycleInfo = getCycleInfo();

                if (cycleInfo.day === "N/A") {
                    bodyHtml = `
                        <div class="info-box glass">
                            <i data-lucide="info" class="text-pink"></i>
                            <p>No period data logged yet. Start logging your period to see cycle insights.</p>
                        </div>`;
                } else {
                    bodyHtml = `
                        <div class="details-list">
                            <div class="detail-row"><span>Current Cycle Day</span><strong>Day ${cycleInfo.day}</strong></div>
                            <div class="detail-row"><span>Phase</span><strong class="text-pink">${cycleInfo.phase}</strong></div>
                            <div class="detail-row"><span>Days since last period start</span><strong>${cycleInfo.day - 1} days</strong></div>
                        </div>
                        <div class="info-box glass">
                            <i data-lucide="info" class="text-pink"></i>
                            <p>${getPhaseMessage(cycleInfo.phase)}</p>
                        </div>`;
                }
                break;
            case 'next-period':
                title = 'Next Period Prediction';
                const options = { month: 'long', day: 'numeric', year: 'numeric' };
                const formatted = prediction.nextDate ? prediction.nextDate.toLocaleDateString('default', options) : "Not enough data";
                bodyHtml = `
                    <div class="details-list">
                        <div class="detail-row"><span>Expected Date</span><strong>${formatted}</strong></div>
                        <div class="detail-row"><span>Prediction Accuracy</span><strong class="text-purple">Based on last ${prediction.avgLength}-day avg</strong></div>
                    </div>`;
                break;
            default:
                title = 'Details';
                bodyHtml = '<p>Check back after logging more data.</p>';
        }

        insightTitle.innerText = title;
        insightBody.innerHTML = bodyHtml;
        insightModal.classList.add('active');
        lucide.createIcons();
    }

    function closeInsight() {
        insightModal.classList.remove('active');
    }

    function updateNextPeriod() {
        const nextValue = document.getElementById('nextPeriodValue');
        const nextSub = document.getElementById('nextPeriodSubtext');
        if (!nextValue) return;

        const prediction = getPredictionData();
        if (!prediction.nextDate) {
            nextValue.innerText = "Log period to predict";
            nextSub.innerText = "Need 1+ logs";
            return;
        }

        const diff = Math.round((prediction.nextDate - systemToday) / (1000 * 60 * 60 * 24));
        const formatted = prediction.nextDate.toLocaleDateString('default', { month: 'short', day: 'numeric' });

        if (diff < 0) {
            nextValue.innerText = "Period is late";
            nextValue.style.color = "var(--red)";
        } else if (diff === 0) {
            nextValue.innerText = "Starting Today";
            nextValue.style.color = "var(--pink)";
        } else {
            nextValue.innerText = `${diff} days left`;
            nextValue.style.color = "var(--purple)";
        }
        nextSub.innerText = `Expected on ${formatted}`;
    }

    function getCycleInfo() {
        const periods = getPeriodData();
        const dateKeys = Object.keys(periods).sort();

        if (dateKeys.length === 0) return { day: "N/A", phase: "No data" };

        // Find all start dates (dates where previous day is not a period)
        const startDates = [];
        dateKeys.forEach(key => {
            const d = new Date(key);
            const prev = new Date(d);
            prev.setDate(d.getDate() - 1);
            const prevKey = `${prev.getFullYear()}-${(prev.getMonth() + 1).toString().padStart(2, '0')}-${prev.getDate().toString().padStart(2, '0')}`;
            if (!periods[prevKey]) startDates.push(d);
        });

        // Find most recent start date that is <= Today
        const pastStarts = startDates.filter(d => d <= systemToday).sort((a, b) => b - a);

        if (pastStarts.length === 0) return { day: "Upcoming", phase: "N/A" };

        const lastStart = pastStarts[0];
        const diffDays = Math.floor((systemToday - lastStart) / (1000 * 60 * 60 * 24)) + 1;

        let phase = "";
        if (diffDays <= 5) phase = "Menstrual Phase";
        else if (diffDays <= 13) phase = "Follicular Phase";
        else if (diffDays === 14) phase = "Ovulation Day";
        else if (diffDays <= 28) phase = "Luteal Phase";
        else phase = "Late Phase / New Cycle";

        return { day: diffDays, phase: phase };
    }

    function getPhaseMessage(phase) {
        switch (phase) {
            case "Menstrual Phase": return "Your period is currently active. Stay hydrated and rest.";
            case "Follicular Phase": return "Estrogen is rising. You might feel more energetic and social.";
            case "Ovulation Day": return "The egg is released. Fertility is at its peak.";
            case "Luteal Phase": return "Progesterone is high. You might experience PMS symptoms.";
            default: return "Track your cycle daily for better accuracy.";
        }
    }

    function calculateCycleDay() {
        const info = getCycleInfo();
        return (info.day === "N/A" || info.day === "Upcoming") ? null : info.day;
    }

    function calculateOvulationCountdown() {
        const cycleDay = calculateCycleDay();
        if (cycleDay === null) return { value: "--", subtext: "No data entered" };

        const prediction = getPredictionData();
        const cycleLength = prediction.avgLength || 28;
        const ovulationDay = cycleLength - 14;

        if (cycleDay < ovulationDay) {
            const diff = ovulationDay - cycleDay;
            return { value: `${diff} days left`, subtext: "Fertility rising" };
        } else if (cycleDay === ovulationDay) {
            return { value: "Ovulation Today", subtext: "Peak opportunity" };
        } else {
            return { value: "Passed this cycle", subtext: "Fertility window closed" };
        }
    }

    function calculateFertilityScore() {
        const cycleDay = calculateCycleDay();
        if (cycleDay === null) return { score: "--", status: "No data entered" };

        if (cycleDay >= 10 && cycleDay <= 15) return { score: "90%", status: "Peak Fertility" };
        if (cycleDay >= 7 && cycleDay <= 17) return { score: "60%", status: "High Fertility" };
        return { score: "20%", status: "Low Fertility" };
    }

    function updateOvulationCard() {
        const valEl = document.getElementById('ovulationValue');
        const subEl = document.getElementById('ovulationSubtext');
        if (!valEl || !subEl) return;

        const data = calculateOvulationCountdown();
        valEl.innerText = data.value;
        subEl.innerText = data.subtext;
    }

    function updateFertilityCard() {
        const valEl = document.getElementById('fertilityValue');
        const subEl = document.getElementById('fertilitySubtext');
        if (!valEl || !subEl) return;

        const data = calculateFertilityScore();
        valEl.innerText = data.score;
        subEl.innerText = data.status;
    }

    function updateCycleDay() {
        const valEl = document.getElementById('cycleDayValue');
        const subEl = document.getElementById('cycleDaySubtext');
        if (!valEl || !subEl) return;

        const cycleDay = calculateCycleDay();
        const info = getCycleInfo();

        if (cycleDay === null) {
            valEl.innerText = "--";
            subEl.innerText = "No data entered";
        } else {
            valEl.innerText = `Day ${cycleDay}`;
            subEl.innerText = info.phase;
        }
    }

    function renderCalendar() {
        calendarGrid.innerHTML = '';
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const periods = getPeriodData();
        const { predictedDates } = getPredictionData();

        currentMonthTitle.innerText = `${viewDate.toLocaleString('default', { month: 'long' })} ${year}`;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const prevLast = new Date(year, month, 0).getDate();

        for (let i = firstDay; i > 0; i--) {
            const d = document.createElement('div');
            d.classList.add('calendar-day', 'inactive');
            d.innerText = prevLast - i + 1;
            calendarGrid.appendChild(d);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const d = document.createElement('div');
            d.classList.add('calendar-day');
            d.innerText = i;

            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
            if (i === systemToday.getDate() && month === systemToday.getMonth() && year === systemToday.getFullYear()) {
                d.classList.add('today');
            }

            if (periods[dateStr]) {
                d.classList.add('real-period');
            } else if (predictedDates.includes(dateStr)) {
                d.classList.add('predicted-period');
            }

            const log = loadSavedLog(`cycle-${dateStr}`);
            if (log) {
                if (log.status === 'fertile') d.classList.add('fertile');
                if (log.notes || (log.symptoms && log.symptoms.length > 0)) d.classList.add('has-data');
            }

            d.addEventListener('click', () => openModal(i, month, year, `cycle-${dateStr}`));
            calendarGrid.appendChild(d);
        }

        const remaining = 42 - calendarGrid.children.length;
        for (let i = 1; i <= remaining; i++) {
            const d = document.createElement('div');
            d.classList.add('calendar-day', 'inactive');
            d.innerText = i;
            calendarGrid.appendChild(d);
        }
        lucide.createIcons();
    }

    function openModal(day, month, year, dateKey) {
        selectedDateKey = dateKey;
        modalTitle.innerText = `Log for ${new Date(year, month, day).toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' })}`;
        resetModalForm();
        const periods = getPeriodData();
        if (periods[dateKey.replace('cycle-', '')]) setMarking('period');
        const log = loadSavedLog(dateKey);
        if (log) {
            if (log.status === 'fertile') setMarking('fertile');
            if (log.symptoms) document.querySelectorAll('input[name="symptom"]').forEach(cb => cb.checked = log.symptoms.includes(cb.value));
            if (log.notes) logNotes.value = log.notes;
        }
        logModal.classList.add('active');
        lucide.createIcons();
    }

    function closeModal() {
        logModal.classList.remove('active');
    }

    function resetModalForm() {
        document.querySelectorAll('input[name="symptom"]').forEach(cb => cb.checked = false);
        logNotes.value = '';
        setMarking(null);
    }

    function saveLog() {
        const symptoms = Array.from(document.querySelectorAll('input[name="symptom"]:checked')).map(cb => cb.value);
        if (selectedDayStatus === 'period') markPeriod(selectedDateKey);
        else clearPeriodOnDate(selectedDateKey);

        const data = { status: selectedDayStatus === 'fertile' ? 'fertile' : null, symptoms, notes: logNotes.value, timestamp: new Date().toISOString() };
        if (!data.status && symptoms.length === 0 && !logNotes.value.trim()) localStorage.removeItem(selectedDateKey);
        else localStorage.setItem(selectedDateKey, JSON.stringify(data));

        showToast("Log saved successfully!");
        closeModal();
        renderCalendar();
        updateNextPeriod();
        updateCycleDay();
        updateOvulationCard();
        updateFertilityCard();
    }

    function showToast(msg = "Saved!") {
        const toastSpan = toast.querySelector('span');
        toastSpan.innerText = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    }

    init();
});
