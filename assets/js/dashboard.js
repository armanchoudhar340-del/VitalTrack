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
let stats = JSON.parse(localStorage.getItem('dashStats')) || {
    caloriesConsumed: 0,
    dailyGoal: 2845,
    proteinConsumed: 0,
    proteinGoal: 150
};

let meals = JSON.parse(localStorage.getItem('loggedMeals')) || [];

function saveState() {
    localStorage.setItem('dashStats', JSON.stringify(stats));
    localStorage.setItem('loggedMeals', JSON.stringify(meals));
}

function updateDashboardUI() {
    const totalCalsEl = document.getElementById('totalCalories');
    const leftCalsEl = document.getElementById('caloriesLeft');
    const proteinStatusEl = document.getElementById('proteinStatus');
    const goalCircle = document.getElementById('goalCircle');
    const mealList = document.getElementById('mealList');

    if (totalCalsEl) totalCalsEl.textContent = stats.caloriesConsumed.toLocaleString();

    const left = stats.dailyGoal - stats.caloriesConsumed;
    if (leftCalsEl) leftCalsEl.textContent = (left > 0 ? left : 0).toLocaleString();

    if (proteinStatusEl) proteinStatusEl.textContent = `${stats.proteinConsumed}g / ${stats.proteinGoal}g`;

    // Update Circle
    const percentage = (stats.caloriesConsumed / stats.dailyGoal) * 100;
    const offset = 440 - (440 * (Math.min(percentage, 100)) / 100);
    if (goalCircle) {
        goalCircle.style.strokeDashoffset = offset;
    }

    // Render Meals
    if (mealList) {
        if (meals.length === 0) {
            mealList.innerHTML = '<div style="text-align: center; color: var(--text-dim); padding: 20px;">No meals logged today</div>';
        } else {
            // Give each meal an index so we can delete it
            mealList.innerHTML = meals.slice().reverse().map((meal, idx) => {
                // The actual index in the original 'meals' array
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
    const mealData = meals[index];

    if (!mealData) return;

    // Add fade out animation
    if (mealEl) {
        mealEl.classList.add('meal-fade-out');
    }

    setTimeout(() => {
        // Update stats
        stats.caloriesConsumed -= mealData.calories;
        stats.proteinConsumed -= mealData.protein;

        // Ensure stats don't go negative
        if (stats.caloriesConsumed < 0) stats.caloriesConsumed = 0;
        if (stats.proteinConsumed < 0) stats.proteinConsumed = 0;

        // Remove from array
        meals.splice(index, 1);

        // Persist
        saveState();

        // Update UI
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
    stats.caloriesConsumed += calories;
    stats.proteinConsumed += protein;

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

let currentWater = 1.8;
function addWater() {
    if (currentWater < 3.0) {
        currentWater += 0.25;
        if (currentWater > 3.0) currentWater = 3.0;
        document.getElementById('waterValue').textContent = currentWater.toFixed(1);
    }
}
