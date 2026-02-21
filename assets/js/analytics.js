document.addEventListener('DOMContentLoaded', () => {
    // Populate User Name
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (userData && userData.name) {
        document.getElementById('userName').textContent = userData.name.split(' ')[0];
    }

    // Initialize Charts
    initCharts();
    updateAnalyticsUI();

    // Listen for storage changes (for synchronization across tabs)
    window.addEventListener('storage', (e) => {
        if (['loggedMeals', 'loggedWorkouts', 'loggedWater'].includes(e.key)) {
            updateAnalyticsUI();
        }
    });
});

let charts = {};

function initCharts() {
    const chartConfigs = [
        { id: 'caloriesChart', label: 'Calories', color: '#00f5a0' },
        { id: 'workoutChart', label: 'Workout Minutes', color: '#a855f7' },
        { id: 'stepsChart', label: 'Steps', color: '#3b82f6' },
        { id: 'hydrationChart', label: 'Hydration (L)', color: '#0ea5e9' }
    ];

    chartConfigs.forEach(config => {
        const ctx = document.getElementById(config.id).getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, hexToRgba(config.color, 0.4));
        gradient.addColorStop(1, hexToRgba(config.color, 0));

        charts[config.id] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: config.label,
                    data: [0, 0, 0, 0, 0, 0, 0],
                    borderColor: config.color,
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    backgroundColor: gradient,
                    pointBackgroundColor: config.color,
                    pointBorderColor: 'rgba(255,255,255,0.2)',
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleColor: '#94a3b8',
                        bodyColor: '#fff',
                        padding: 12,
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
                        ticks: { color: '#94a3b8', font: { size: 10 } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8', font: { size: 10 } }
                    }
                }
            }
        });
    });
}

function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getWeeklyRange() {
    const now = new Date();
    const currentDay = now.getDay(); // 0 (Sun) to 6 (Sat)
    // Adjust to Mon-Sun (0=Mon, 6=Sun)
    const diff = currentDay === 0 ? 6 : currentDay - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const days = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        days.push(d.toDateString());
    }
    return { startOfWeek, days };
}

function updateAnalyticsUI() {
    const meals = JSON.parse(localStorage.getItem('loggedMeals')) || [];
    const workouts = JSON.parse(localStorage.getItem('loggedWorkouts')) || [];
    const waterEntries = JSON.parse(localStorage.getItem('loggedWater')) || [];

    const { startOfWeek, days } = getWeeklyRange();

    const weeklyData = {
        calories: [0, 0, 0, 0, 0, 0, 0],
        workout: [0, 0, 0, 0, 0, 0, 0],
        steps: [0, 0, 0, 0, 0, 0, 0],
        hydration: [0, 0, 0, 0, 0, 0, 0]
    };

    // Calculate Meal Data
    meals.forEach(meal => {
        if (!meal.timestamp) return;
        const date = new Date(meal.timestamp);
        const dateStr = date.toDateString();
        const index = days.indexOf(dateStr);
        if (index !== -1) {
            weeklyData.calories[index] += parseInt(meal.calories);
        }
    });

    // Calculate Workout/Steps Data
    workouts.forEach(workout => {
        // If no timestamp, we can't show it in weekly history properly, 
        // but let's assume it was today if missing (for legacy data)
        const date = workout.timestamp ? new Date(workout.timestamp) : new Date();
        const dateStr = date.toDateString();
        const index = days.indexOf(dateStr);
        if (index !== -1) {
            const duration = parseInt(workout.duration);
            weeklyData.workout[index] += duration;
            weeklyData.steps[index] += duration * 100;
        }
    });

    // Calculate Hydration Data
    waterEntries.forEach(entry => {
        const date = new Date(entry.timestamp);
        const dateStr = date.toDateString();
        const index = days.indexOf(dateStr);
        if (index !== -1) {
            weeklyData.hydration[index] += entry.amount;
        }
    });

    // Update Summary Cards
    const totalCals = weeklyData.calories.reduce((a, b) => a + b, 0);
    const totalWorkout = weeklyData.workout.reduce((a, b) => a + b, 0);
    const totalSteps = weeklyData.steps.reduce((a, b) => a + b, 0);
    const avgHydration = weeklyData.hydration.reduce((a, b) => a + b, 0) / 7;

    document.getElementById('totalWeeklyCalories').textContent = totalCals.toLocaleString();
    document.getElementById('totalWeeklyWorkout').textContent = totalWorkout.toLocaleString();
    document.getElementById('totalWeeklySteps').textContent = totalSteps.toLocaleString();
    document.getElementById('avgDailyHydration').textContent = avgHydration.toFixed(1) + 'L';

    // Update Charts
    charts.caloriesChart.data.datasets[0].data = weeklyData.calories;
    charts.workoutChart.data.datasets[0].data = weeklyData.workout;
    charts.stepsChart.data.datasets[0].data = weeklyData.steps;
    charts.hydrationChart.data.datasets[0].data = weeklyData.hydration;

    Object.values(charts).forEach(chart => chart.update());
}

// Function to clear data if needed (called from settings or console)
window.clearAllData = () => {
    localStorage.removeItem('loggedMeals');
    localStorage.removeItem('loggedWorkouts');
    localStorage.removeItem('loggedWater');
    updateAnalyticsUI();
};
