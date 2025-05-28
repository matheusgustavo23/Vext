// Adicione no início do arquivo
let token = localStorage.getItem('token');

// Função para verificar autenticação
function checkAuth() {
    if (!token) {
        window.location.href = '/login.html';
    }
}

// Função para fazer logout
function logout() {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
}

// Modifique todas as chamadas fetch para incluir o token
async function carregarDados() {
    try {
        const response = await fetch('http://localhost:3001/doacoes', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        // ... restante do código
    } catch (error) {
        if (error.status === 401) logout();
    }
}

// Adicione listeners para os botões sociais
document.getElementById('googleLogin').addEventListener('click', () => {
    window.location.href = '/auth/google';
});

// Adicione o tratamento de login no formulário
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const response = await fetch('http://localhost:3001/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: document.getElementById('email').value,
            password: document.getElementById('senha').value
        })
    });

    if (response.ok) {
        const { token } = await response.json();
        localStorage.setItem('token', token);
        window.location.href = '/';
    } else {
        alert('Login falhou! Verifique suas credenciais.');
    }
});

if (document.getElementById('registerForm')) {
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regSenha').value;
        const confirmPassword = document.getElementById('regConfirmarSenha').value;

        // Validação frontend
        if (password.length < 8) {
            showError('A senha deve ter pelo menos 8 caracteres');
            return;
        }

        try {
            const response = await fetch('http://localhost:3001/registrar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, confirmPassword })
            });

            const data = await response.json();
            
            if (!response.ok) {
                showError(data.error);
                return;
            }

            alert('Conta criada com sucesso! Redirecionando para login...');
            window.location.href = 'login.html';

        } catch (error) {
            showError('Erro ao conectar com o servidor');
        }
    });
}

// Função auxiliar para mostrar erros
function showError(message) {
    const errorElement = document.getElementById('registerError') || document.getElementById('loginError');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 5000);
}