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

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Calories Burned',
                data: [2100, 2400, 1900, 2800, 2200, 2600, 2450],
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
let waterIntake = parseFloat(localStorage.getItem('waterIntake')) || 0;

// Constants for goals
const DAILY_CALORIE_GOAL = 2845;
const DAILY_PROTEIN_GOAL = 150;
const DAILY_WATER_GOAL = 3.0;

function calculateStats() {
    const totals = meals.reduce((acc, meal) => {
        acc.calories += parseInt(meal.calories);
        acc.protein += parseInt(meal.protein);
        return acc;
    }, { calories: 0, protein: 0 });

    return {
        caloriesConsumed: totals.calories,
        dailyGoal: DAILY_CALORIE_GOAL,
        proteinConsumed: totals.protein,
        proteinGoal: DAILY_PROTEIN_GOAL,
        waterConsumed: waterIntake,
        waterGoal: DAILY_WATER_GOAL
    };
}

function saveState() {
    localStorage.setItem('loggedMeals', JSON.stringify(meals));
    localStorage.setItem('waterIntake', waterIntake.toString());
}

function updateDashboardUI() {
    const stats = calculateStats();
    const totalCalsEl = document.getElementById('totalCalories');
    const leftCalsEl = document.getElementById('caloriesLeft');
    const progressLabel = document.getElementById('progressLabel');
    const proteinStatusEl = document.getElementById('proteinStatus');
    const goalCircle = document.getElementById('goalCircle');
    const mealList = document.getElementById('mealList');

    if (totalCalsEl) totalCalsEl.textContent = stats.caloriesConsumed.toLocaleString();

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
    const waterVisualizer = document.getElementById('waterVisualizer');

    if (waterValueEl) waterValueEl.textContent = stats.waterConsumed.toFixed(1);

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
}

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

function openMealModal() {
    const modal = document.getElementById('mealModal');
    modal.style.display = 'flex';
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
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Update state
    const newMeal = { name, calories, protein, time };
    meals.push(newMeal);

    // Persist
    saveState();

    // Update UI
    updateDashboardUI();

    // Success feedback
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

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    updateDashboardUI();
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
