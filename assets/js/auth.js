document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Simple validation simulation
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            if (email && password) {
                // Store "auth" state
                localStorage.setItem('isAuthenticated', 'true');
                localStorage.setItem('userEmail', email);

                // Set default user data if not exists
                if (!localStorage.getItem('userData')) {
                    const userData = {
                        name: 'Alex Johnson',
                        email: email,
                        weight: '82',
                        height: '184',
                        age: '28',
                        gender: 'Male',
                        goal: 'Muscle Gain'
                    };
                    localStorage.setItem('userData', JSON.stringify(userData));
                }
            }

            // Show loading state
            const btn = loginForm.querySelector('.btn-primary');
            btn.innerHTML = '<div class="loader"></div> Logging in...';
            btn.style.opacity = '0.7';
            btn.disabled = true;

            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        });
    }

    // Add CSS for loader if not present
    if (!document.getElementById('loader-style')) {
        const style = document.createElement('style');
        style.id = 'loader-style';
        style.textContent = `
            .loader {
                width: 18px;
                height: 18px;
                border: 2px solid #000;
                border-bottom-color: transparent;
                border-radius: 50%;
                display: inline-block;
                animation: rotation 1s linear infinite;
                margin-right: 10px;
            }
            @keyframes rotation {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    // Check auth on other pages (except login)
    if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
        if (localStorage.getItem('isAuthenticated') !== 'true') {
            window.location.href = 'index.html';
        }
    }
});

function socialLogin(provider) {
    alert(`${provider} login simulation... Redirecting to dashboard.`);
    localStorage.setItem('isAuthenticated', 'true');
    window.location.href = 'dashboard.html';
}

function mockSignUp() {
    alert("Sign up feature coming soon! For now, use the default credentials: admin@vitaltrack.com / password123");
}

function logout() {
    localStorage.removeItem('isAuthenticated');
    window.location.href = 'index.html';
}
