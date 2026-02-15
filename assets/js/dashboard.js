let progressChart;
document.addEventListener('DOMContentLoaded', () => {
    // Populate User Name
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (userData && userData.name) {
        document.getElementById('welcomeText').textContent = `Good Morning, ${userData.name.split(' ')[0]}`;
    }

    // Initialize Chart
    const ctx = document.getElementById('progressChart').getContext('2d');

    // Custom Glow Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(0, 245, 160, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 245, 160, 0)');

    progressChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Calories Consumed',
                data: [0, 0, 0, 0, 0, 0, 0],
                borderColor: '#00f5a0',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                backgroundColor: gradient,
                pointBackgroundColor: '#00f5a0',
                pointBorderColor: 'rgba(255,255,255,0.2)',
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
                    ticks: { color: '#94a3b8', font: { size: 12 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8', font: { size: 12 } }
                }
            }
        }
    });

    updateDashboardUI();

    // Animate Circular Progress
    const circle = document.getElementById('goalCircle');
    if (circle) {
        // Circumference is ~440 (2 * pi * 70)
        // Offset = 440 * (1 - percentage/100)
        // Let's say 70% completed
        const percentage = 70;
        const offset = 440 - (440 * percentage / 100);
        setTimeout(() => {
            circle.style.strokeDashoffset = offset;
        }, 500);
    }
});

// State Management
let meals = JSON.parse(localStorage.getItem('loggedMeals')) || [];
let workouts = JSON.parse(localStorage.getItem('loggedWorkouts')) || [];
let waterIntake = parseFloat(localStorage.getItem('waterIntake')) || 0;

// Constants for goals
const DAILY_CALORIE_GOAL = 2845;
const DAILY_PROTEIN_GOAL = 150;
const DAILY_WATER_GOAL = 3.0;

function calculateWeeklyData() {
    const weeklyCals = [0, 0, 0, 0, 0, 0, 0];
    const now = new Date();

    // Get the start of the current week (Monday)
    const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday...
    const diff = currentDay === 0 ? 6 : currentDay - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - diff);
    startOfWeek.setHours(0, 0, 0, 0);

    meals.forEach(meal => {
        if (meal.timestamp) {
            const mealDate = new Date(meal.timestamp);
            if (mealDate >= startOfWeek) {
                let dayIndex = mealDate.getDay();
                // Map Sunday (0) to index 6, Monday (1) to index 0...
                let chartIndex = dayIndex === 0 ? 6 : dayIndex - 1;
                weeklyCals[chartIndex] += parseInt(meal.calories);
            }
        }
    });
    return weeklyCals;
}

function calculateStats() {
    const totals = meals.reduce((acc, meal) => {
        // Only count today's meals for the summary cards
        const mealDate = meal.timestamp ? new Date(meal.timestamp) : new Date();
        const now = new Date();
        if (mealDate.toDateString() === now.toDateString()) {
            acc.calories += parseInt(meal.calories);
            acc.protein += parseInt(meal.protein);
        }
        return acc;
    }, { calories: 0, protein: 0 });

    const totalWorkoutTime = workouts.reduce((acc, workout) => acc + parseInt(workout.duration), 0);

    return {
        caloriesConsumed: totals.calories,
        dailyGoal: DAILY_CALORIE_GOAL,
        proteinConsumed: totals.protein,
        proteinGoal: DAILY_PROTEIN_GOAL,
        waterConsumed: waterIntake,
        waterGoal: DAILY_WATER_GOAL,
        workoutDuration: totalWorkoutTime,
        steps: totalWorkoutTime * 100,
        weeklyData: calculateWeeklyData()
    };
}

function saveState() {
    localStorage.setItem('loggedMeals', JSON.stringify(meals));
    localStorage.setItem('loggedWorkouts', JSON.stringify(workouts));
    localStorage.setItem('waterIntake', waterIntake.toString());
}

function updateDashboardUI() {
    const stats = calculateStats();
    const totalCalsEl = document.getElementById('totalCalories');
    const workoutTimeEl = document.getElementById('totalWorkoutDuration');
    const dailyStepsEl = document.getElementById('dailyStepsValue');
    const dailyStepsSummaryEl = document.getElementById('dailyStepsSummary');
    const leftCalsEl = document.getElementById('caloriesLeft');
    const progressLabel = document.getElementById('progressLabel');
    const proteinStatusEl = document.getElementById('proteinStatus');
    const goalCircle = document.getElementById('goalCircle');
    const mealList = document.getElementById('mealList');

    if (totalCalsEl) totalCalsEl.textContent = stats.caloriesConsumed.toLocaleString();
    if (workoutTimeEl) workoutTimeEl.textContent = `${stats.workoutDuration} min`;

    if (dailyStepsEl) dailyStepsEl.textContent = stats.steps.toLocaleString();
    if (dailyStepsSummaryEl) {
        const kValue = (stats.steps / 1000).toFixed(1);
        dailyStepsSummaryEl.textContent = `${kValue}k`;
    }

    // Logic change: Only show "Left to eat" after at least one meal is added
    if (leftCalsEl && progressLabel) {
        if (meals.length === 0) {
            leftCalsEl.textContent = "0";
            progressLabel.textContent = "Consumed";
        } else {
            const left = stats.dailyGoal - stats.caloriesConsumed;
            leftCalsEl.textContent = (left > 0 ? left : 0).toLocaleString();
            progressLabel.textContent = "Left to eat";
        }
    }

    if (proteinStatusEl) proteinStatusEl.textContent = `${stats.proteinConsumed}g / ${stats.proteinGoal}g`;

    // Protein Bar Logic: Clamp at 100% and change color if exceeded
    const proteinBar = document.getElementById('proteinBar');
    if (proteinBar) {
        const proteinPercentage = (stats.proteinConsumed / stats.proteinGoal) * 100;
        const clampedProteinPercentage = Math.min(proteinPercentage, 100);
        proteinBar.style.width = `${clampedProteinPercentage}%`;

        // Optional: Change to a success color (light blue/green) if goal met
        if (stats.proteinConsumed >= stats.proteinGoal) {
            proteinBar.style.background = '#00f5a0'; // Bright success green
            proteinBar.style.boxShadow = '0 0 10px rgba(0, 245, 160, 0.3)';
        } else {
            proteinBar.style.background = 'var(--primary)';
            proteinBar.style.boxShadow = 'none';
        }
    }

    // Update Circle
    const percentage = (stats.caloriesConsumed / stats.dailyGoal) * 100;
    const offset = 440 - (440 * (Math.min(percentage, 100)) / 100);
    if (goalCircle) {
        goalCircle.style.strokeDashoffset = offset;
    }

    // Update Hydration
    const waterValueEl = document.getElementById('waterValue');
    const topWaterIntakeEl = document.getElementById('topWaterIntake');
    const waterPercentageEl = document.getElementById('waterPercentage');
    const waterVisualizer = document.getElementById('waterVisualizer');

    const formattedWater = stats.waterConsumed.toFixed(1) + 'L';
    if (waterValueEl) waterValueEl.textContent = stats.waterConsumed.toFixed(1);
    if (topWaterIntakeEl) topWaterIntakeEl.textContent = formattedWater;

    if (waterPercentageEl) {
        const waterPct = Math.min(Math.round((stats.waterConsumed / stats.waterGoal) * 100), 100);
        waterPercentageEl.textContent = waterPct + '%';
    }

    if (waterVisualizer) {
        const bars = waterVisualizer.querySelectorAll('div');
        const totalBars = bars.length;
        const waterPercentage = (stats.waterConsumed / stats.waterGoal) * 100;

        bars.forEach((bar, index) => {
            const barThreshold = (index / totalBars) * 100;
            const nextThreshold = ((index + 1) / totalBars) * 100;

            let height = 0;
            if (waterPercentage >= nextThreshold) {
                height = 100 - (index * 10);
            } else if (waterPercentage > barThreshold) {
                const partialPercentage = (waterPercentage - barThreshold) / (100 / totalBars);
                height = partialPercentage * (100 - (index * 10));
            }

            bar.style.height = `${Math.max(height, 5)}%`;
            if (waterPercentage >= 100) {
                bar.style.background = '#00f5a0';
            } else {
                bar.style.background = '#3b82f6';
            }
        });
    }

    // Update Weekly Chart
    if (progressChart) {
        progressChart.data.datasets[0].data = stats.weeklyData;
        progressChart.update();
    }

    // Render Meals
    if (mealList) {
        if (meals.length === 0) {
            mealList.innerHTML = '<div style="text-align: center; color: var(--text-dim); padding: 20px;">No meals logged today</div>';
        } else {
            mealList.innerHTML = meals.slice().reverse().map((meal, idx) => {
                const originalIndex = meals.length - 1 - idx;
                return `
                <div class="meal-item" id="meal-${originalIndex}">
                    <div class="meal-info">
                        <div class="meal-icon">
                            <i data-lucide="utensils"></i>
                        </div>
                        <div class="meal-details">
                            <h4>${meal.name}</h4>
                            <p>${meal.time}</p>
                        </div>
                    </div>
                    <div class="meal-actions">
                         <div class="meal-stats">
                            <div class="meal-cals">+${meal.calories} kcal</div>
                            <div class="meal-macros">${meal.protein}g protein</div>
                        </div>
                        <button class="delete-btn" onclick="deleteMeal(${originalIndex})" title="Delete Meal">
                            <i data-lucide="trash-2" style="width: 16px;"></i>
                        </button>
                    </div>
                </div>
            `;
            }).join('');
            lucide.createIcons();
        }
    }

    // Render Workouts
    const workoutList = document.getElementById('workoutList');
    if (workoutList) {
        if (workouts.length === 0) {
            workoutList.innerHTML = '<div style="text-align: center; color: var(--text-dim); padding: 20px;">No workouts logged today</div>';
        } else {
            workoutList.innerHTML = workouts.slice().reverse().map((workout, idx) => {
                const originalIndex = workouts.length - 1 - idx;
                return `
                <div class="meal-item" id="workout-${originalIndex}">
                    <div class="meal-info">
                        <div class="meal-icon" style="background: rgba(168, 85, 247, 0.1); color: #a855f7;">
                            <i data-lucide="activity"></i>
                        </div>
                        <div class="meal-details">
                            <h4>${workout.type}</h4>
                            <p>${workout.intensity} Intensity • ${workout.time}</p>
                        </div>
                    </div>
                    <div class="meal-actions">
                         <div class="meal-stats">
                            <div class="meal-cals" style="color: #a855f7;">${workout.duration} min</div>
                        </div>
                        <button class="delete-btn" onclick="deleteWorkout(${originalIndex})" title="Delete Workout">
                            <i data-lucide="trash-2" style="width: 16px;"></i>
                        </button>
                    </div>
                </div>
            `;
            }).join('');
            lucide.createIcons();
        }
    }
}

function deleteWorkout(index) {
    const workoutEl = document.getElementById(`workout-${index}`);
    if (index < 0 || index >= workouts.length) return;
    if (workoutEl) workoutEl.classList.add('meal-fade-out');
    setTimeout(() => {
        workouts.splice(index, 1);
        saveState();
        updateDashboardUI();
    }, 400);
}

window.deleteWorkout = deleteWorkout;

function deleteMeal(index) {
    const mealEl = document.getElementById(`meal-${index}`);

    if (index < 0 || index >= meals.length) return;

    if (mealEl) {
        mealEl.classList.add('meal-fade-out');
    }

    setTimeout(() => {
        meals.splice(index, 1);
        saveState();
        updateDashboardUI();
    }, 400);
}

window.deleteMeal = deleteMeal;

// Modal Controllers
function openMealModal() {
    const modal = document.getElementById('mealModal');
    modal.style.display = 'flex';

    // Set default date to today
    const dateInput = document.getElementById('mealDateInput');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }

    setTimeout(() => modal.classList.add('active'), 10);
}

function closeMealModal() {
    const modal = document.getElementById('mealModal');
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
        document.getElementById('mealForm').reset();
    }, 300);
}

// Global scope functions
window.logMeal = openMealModal;
window.closeMealModal = closeMealModal;

document.getElementById('mealForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('mealName').value;
    const calories = parseInt(document.getElementById('mealCalories').value);
    const protein = parseInt(document.getElementById('mealProtein').value);
    const dateValue = document.getElementById('mealDateInput').value;
    const now = new Date();

    let mealDate;
    if (dateValue) {
        mealDate = new Date(dateValue);
        // Use current time for the meal time field
        mealDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
    } else {
        mealDate = now;
    }

    const time = mealDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMeal = { name, calories, protein, time, timestamp: mealDate.getTime() };
    meals.push(newMeal);
    saveState();
    updateDashboardUI();
    const saveBtn = e.target.querySelector('button[type="submit"]');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i data-lucide="check"></i> Saved!';
    lucide.createIcons();
    setTimeout(() => {
        closeMealModal();
        saveBtn.innerHTML = originalText;
        lucide.createIcons();
    }, 800);
});

function openWorkoutModal() {
    const modal = document.getElementById('workoutModal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeWorkoutModal() {
    const modal = document.getElementById('workoutModal');
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
        document.getElementById('workoutForm').reset();
    }, 300);
}

window.logWorkout = openWorkoutModal;
window.closeWorkoutModal = closeWorkoutModal;

document.getElementById('workoutForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const type = document.getElementById('workoutType').value;
    const duration = parseInt(document.getElementById('workoutDuration').value);
    const intensity = document.getElementById('workoutIntensity').value;
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newWorkout = { type, duration, intensity, time };
    workouts.push(newWorkout);
    saveState();
    updateDashboardUI();

    const saveBtn = e.target.querySelector('button[type="submit"]');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i data-lucide="check"></i> Saved!';
    lucide.createIcons();

    setTimeout(() => {
        closeWorkoutModal();
        saveBtn.innerHTML = originalText;
        lucide.createIcons();
    }, 800);
});


// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    // updateDashboardUI is called inside DOMContentLoaded after chart init
});

function openResetWaterModal() {
    const modal = document.getElementById('resetWaterModal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    }
}

function closeResetWaterModal() {
    const modal = document.getElementById('resetWaterModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 300);
    }
}

function confirmResetWater() {
    waterIntake = 0;
    saveState();
    updateDashboardUI();
    closeResetWaterModal();
}

window.openResetWaterModal = openResetWaterModal;
window.closeResetWaterModal = closeResetWaterModal;
window.confirmResetWater = confirmResetWater;

function addWater() {
    if (waterIntake < DAILY_WATER_GOAL) {
        waterIntake += 0.25;
        if (waterIntake > DAILY_WATER_GOAL) waterIntake = DAILY_WATER_GOAL;
        saveState();
        updateDashboardUI();
    }
}

window.addWater = addWater;
