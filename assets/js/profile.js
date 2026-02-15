document.addEventListener('DOMContentLoaded', () => {
    const profileForm = document.getElementById('profileForm');

    // Load existing data
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (userData) {
        document.getElementById('pName').value = userData.name || '';
        document.getElementById('pEmail').value = userData.email || '';
        document.getElementById('pWeight').value = userData.weight || '';
        document.getElementById('pHeight').value = userData.height || '';
        document.getElementById('pAge').value = userData.age || '';
        document.getElementById('pGoal').value = userData.goal || 'Muscle Gain';

        document.getElementById('displayUserName').textContent = userData.name || 'User';
        document.getElementById('displayUserEmail').textContent = userData.email || '';
    }

    if (profileForm) {
        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const updatedData = {
                name: document.getElementById('pName').value,
                email: document.getElementById('pEmail').value,
                weight: document.getElementById('pWeight').value,
                height: document.getElementById('pHeight').value,
                age: document.getElementById('pAge').value,
                goal: document.getElementById('pGoal').value
            };

            localStorage.setItem('userData', JSON.stringify(updatedData));

            // Update display
            document.getElementById('displayUserName').textContent = updatedData.name;
            document.getElementById('displayUserEmail').textContent = updatedData.email;

            // Show success animation or alert
            const btn = profileForm.querySelector('.btn-primary');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i data-lucide="check"></i> Saved!';
            lucide.createIcons();
            btn.style.background = '#10b981';

            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '';
                lucide.createIcons();
            }, 2000);
        });
    }
});
