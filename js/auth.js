// js/auth.js - Gerenciamento de autenticação com Supabase

console.log('🔐 auth.js carregado');

// ============================================
// FUNÇÕES DE AUTENTICAÇÃO
// ============================================

async function checkAuth() {
    try {
        const { data: { session }, error } = await window.supabase.auth.getSession();
        if (error) throw error;
        
        if (session) {
            return session;
        } else {
            return null;
        }
    } catch (err) {
        return null;
    }
}

async function signIn(email, password) {
    console.log('🔑 Tentando login com:', email);
    try {
        const { data, error } = await window.supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password
        });
        if (error) {
            console.error('❌ Erro no login:', error.message);
            return { success: false, error: error.message };
        }
        console.log('✅ Login realizado:', data.user.email);
        return { success: true, user: data.user, session: data.session };
    } catch (err) {
        console.error('❌ Erro inesperado no signIn:', err);
        return { success: false, error: 'Erro inesperado: ' + err.message };
    }
}

async function signUp(email, password) {
    console.log('📝 Registrando novo usuário:', email);
    try {
        if (!window.supabase || !window.supabase.auth) {
            throw new Error('Supabase não disponível');
        }
        if (!email || !email.includes('@')) {
            return { success: false, error: 'Email inválido' };
        }
        if (!password || password.length < 6) {
            return { success: false, error: 'Senha precisa ter pelo menos 6 caracteres' };
        }
        const { data, error } = await window.supabase.auth.signUp({
            email: email.trim(),
            password: password,
            options: {
                emailRedirectTo: window.location.origin
            }
        });
        if (error) {
            console.error('❌ Erro no registro:', error.message);
            return { success: false, error: error.message, code: error.code };
        }
        console.log('✅ Registro realizado:', data.user?.email);
        return { success: true, user: data.user, requiresEmailConfirmation: data.user?.identities?.length === 0 };
    } catch (err) {
        console.error('❌ Erro inesperado no signUp:', err);
        return { success: false, error: 'Erro inesperado: ' + err.message };
    }
}

async function signOut() {
    console.log('🚪 Fazendo logout...');
    try {
        if (!window.supabase || !window.supabase.auth) {
            throw new Error('Supabase não disponível');
        }
        const { error } = await window.supabase.auth.signOut();
        if (error) {
            console.error('❌ Erro no logout:', error.message);
            return { success: false, error: error.message };
        }
        console.log('✅ Logout realizado com sucesso');
        return { success: true };
    } catch (err) {
        console.error('❌ Erro inesperado no signOut:', err);
        return { success: false, error: 'Erro inesperado' };
    }
}

async function checkSupabaseConnection() {
    console.log('🔗 Testando conexão com Supabase...');
    try {
        if (!window.supabase) {
            return { connected: false, error: 'Biblioteca Supabase não carregou' };
        }
        const { data, error } = await window.supabase.auth.getSession();
        if (error) {
            if (error.message.includes('session')) {
                console.log('⚠️ Sem sessão ativa (normal)');
                return { connected: true, hasSession: false };
            }
            return { connected: false, error: error.message };
        }
        return { connected: true, hasSession: !!data.session, session: data.session };
    } catch (err) {
        console.error('❌ Erro ao testar conexão:', err);
        return { connected: false, error: err.message };
    }
}

// ============================================
// FUNÇÕES DE UI
// ============================================

function showAppContent() {
    console.log("📱 Mostrando conteúdo do app...");
    const loginScreen = document.getElementById('loginScreen');
    if (loginScreen) {
        loginScreen.style.display = 'none';
        loginScreen.classList.add('hidden');
    }
    document.body.classList.remove('login-active');
    const appContent = document.getElementById('appContent');
    if (appContent) {
        appContent.style.display = 'block';
        appContent.classList.add('visible');
    }
}

function showLoginScreen() {
    console.log('🖥️ Mostrando tela de login...');
    document.body.classList.add('login-active');
    const appContent = document.getElementById('appContent');
    if (appContent) {
        appContent.style.display = 'none';
        appContent.classList.remove('visible');
    }
    const loginScreen = document.getElementById('loginScreen');
    if (loginScreen) {
        loginScreen.style.display = 'flex';
        loginScreen.classList.remove('hidden');
        return;
    }
    createLoginScreen();
}

function createLoginScreen() {
    const loginHTML = `
        <div id="loginScreen" class="login-container">
            <div class="login-box">
                <div class="logo">
                    <div class="logo-icon">💰</div>
                    <h1 class="login-title">Finanças App</h1>
                    <p class="login-subtitle">Controle suas finanças de forma simples</p>
                </div>
                
                <div id="loginForm" class="form-active">
                    <input type="email" id="email" class="login-input" placeholder="seu@email.com" autocomplete="email">
                    <input type="password" id="password" class="login-input" placeholder="Sua senha" autocomplete="current-password">
                    <button onclick="handleLogin()" class="login-button">Entrar</button>
                    
                    <div class="login-links">
                        <p>Não tem conta? <a onclick="showSignupForm()" class="login-link">Cadastre-se</a></p>
                    </div>
                </div>
                
                <div id="signupForm" class="form-switch">
                    <input type="email" id="signupEmail" class="login-input" placeholder="seu@email.com" autocomplete="email">
                    <input type="password" id="signupPassword" class="login-input" placeholder="Senha (mínimo 6 caracteres)" autocomplete="new-password">
                    <button onclick="handleSignup()" class="signup-button">Criar Conta</button>
                    
                    <div class="login-links">
                        <p>Já tem conta? <a onclick="showLoginForm()" class="login-link">Faça login</a></p>
                    </div>
                </div>
                
                <div id="authMessage" class="auth-message"></div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('afterbegin', loginHTML);
    
    if (!document.querySelector('#login-styles')) {
        const styles = `
            <style>
                .login-container {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #0b1220;
                    padding: 20px;
                    font-family: 'Inter', sans-serif;
                }
                .login-box {
                    background: #1e293b;
                    padding: 40px;
                    border-radius: 16px;
                    width: 100%;
                    max-width: 400px;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
                }
                .login-title {
                    text-align: center;
                    color: white;
                    margin-bottom: 10px;
                    font-size: 24px;
                    font-weight: 700;
                }
                .login-subtitle {
                    text-align: center;
                    color: #94a3b8;
                    margin-bottom: 30px;
                    font-size: 14px;
                }
                .login-input {
                    width: 100%;
                    padding: 14px;
                    margin-bottom: 16px;
                    border-radius: 10px;
                    border: 1px solid #334155;
                    background: #0f172a;
                    color: white;
                    font-size: 16px;
                }
                .login-button, .signup-button {
                    width: 100%;
                    padding: 14px;
                    color: white;
                    border: none;
                    border-radius: 10px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                }
                .login-button {
                    background: #3b82f6;
                }
                .signup-button {
                    background: #10b981;
                }
                .login-links {
                    text-align: center;
                    margin-top: 20px;
                    color: #94a3b8;
                    font-size: 14px;
                }
                .login-link {
                    color: #60a5fa;
                    cursor: pointer;
                    text-decoration: none;
                }
                .auth-message {
                    margin-top: 15px;
                    padding: 12px;
                    border-radius: 8px;
                    text-align: center;
                    font-size: 14px;
                    display: none;
                }
                .auth-success {
                    background: rgba(16, 185, 129, 0.2);
                    color: #10b981;
                    border: 1px solid rgba(16, 185, 129, 0.3);
                }
                .auth-error {
                    background: rgba(239, 68, 68, 0.2);
                    color: #ef4444;
                    border: 1px solid rgba(239, 68, 68, 0.3);
                }
                .logo {
                    text-align: center;
                    margin-bottom: 20px;
                }
                .logo-icon {
                    font-size: 48px;
                    margin-bottom: 10px;
                }
                .form-switch {
                    display: none;
                }
                .form-active {
                    display: block;
                }
            </style>
        `;
        document.head.insertAdjacentHTML('beforeend', styles);
    }
}

function createLogoutButton() {
    const oldButton = document.getElementById('logoutButton');
    if (oldButton) oldButton.remove();
    
    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'logoutButton';
    logoutBtn.innerHTML = '🚪 Sair';
    logoutBtn.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 10px 20px;
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-family: 'Inter', sans-serif;
        font-weight: 500;
        font-size: 14px;
        z-index: 1000;
        transition: background 0.2s;
    `;
    
    logoutBtn.onmouseover = () => logoutBtn.style.background = '#dc2626';
    logoutBtn.onmouseout = () => logoutBtn.style.background = '#ef4444';
    
    logoutBtn.onclick = async () => {
        if (confirm('Deseja realmente sair da conta?')) {
            logoutBtn.disabled = true;
            logoutBtn.innerHTML = 'Saindo...';
            
            // Limpar recursos antes do logout
            if (typeof window.limparRecursos === 'function') {
                try {
                    window.limparRecursos();
                } catch (err) {
                    console.error('⚠️ Erro ao limpar recursos:', err);
                }
            }
            
            const result = await signOut();
            if (result.success) {
                showLoginScreen();
                logoutBtn.remove();
            } else {
                alert('Erro ao sair da conta');
                logoutBtn.disabled = false;
                logoutBtn.innerHTML = '🚪 Sair';
            }
        }
    };
    
    document.body.appendChild(logoutBtn);
}

// ============================================
// HANDLERS GLOBAIS
// ============================================

window.handleLogin = async function() {
    const email = document.getElementById('email')?.value;
    const password = document.getElementById('password')?.value;
    if (!email || !password) {
        showAuthMessage('Preencha email e senha', 'error');
        return;
    }
    showAuthMessage('Entrando...', 'info');
    const result = await signIn(email, password);
    if (result.success) {
        showAuthMessage('Login realizado! Carregando...', 'success');
        setTimeout(() => {
            showAppContent();
            createLogoutButton();
            window.dispatchEvent(new Event('userLoggedIn'));
        }, 1000);
    } else {
        showAuthMessage('Erro: ' + result.error, 'error');
    }
};

window.handleSignup = async function() {
    const email = document.getElementById('signupEmail')?.value;
    const password = document.getElementById('signupPassword')?.value;
    if (!email || !password) {
        showAuthMessage('Preencha email e senha', 'error');
        return;
    }
    if (password.length < 6) {
        showAuthMessage('Senha precisa ter no mínimo 6 caracteres', 'error');
        return;
    }
    showAuthMessage('Criando conta...', 'info');
    const result = await signUp(email, password);
    if (result.success) {
        if (result.requiresEmailConfirmation) {
            showAuthMessage('Conta criada! Verifique seu email para confirmar.', 'success');
            setTimeout(window.showLoginForm, 2000);
        } else {
            showAuthMessage('Conta criada com sucesso!', 'success');
            setTimeout(() => {
                showAppContent();
                createLogoutButton();
                window.dispatchEvent(new Event('userLoggedIn'));
            }, 1000);
        }
    } else {
        showAuthMessage('Erro: ' + result.error, 'error');
    }
};

window.handleLogout = async function() {
    const result = await signOut();
    if (result.success) {
        showLoginScreen();
        window.dispatchEvent(new Event('userLoggedOut'));
    } else {
        alert('Erro ao sair: ' + result.error);
    }
};

window.showSignupForm = function() {
    document.getElementById('loginForm').classList.remove('form-active');
    document.getElementById('loginForm').classList.add('form-switch');
    document.getElementById('signupForm').classList.remove('form-switch');
    document.getElementById('signupForm').classList.add('form-active');
};

window.showLoginForm = function() {
    document.getElementById('signupForm').classList.remove('form-active');
    document.getElementById('signupForm').classList.add('form-switch');
    document.getElementById('loginForm').classList.remove('form-switch');
    document.getElementById('loginForm').classList.add('form-active');
};

function showAuthMessage(message, type) {
    const messageEl = document.getElementById('authMessage');
    if (!messageEl) return;
    messageEl.textContent = message;
    messageEl.className = 'auth-message';
    messageEl.classList.add(type === 'error' ? 'auth-error' : 'auth-success');
    messageEl.style.display = 'block';
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 5000);
}

// ============================================
// INICIALIZAÇÃO (UMA ÚNICA VEZ)
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Iniciando autenticação...');
    
    const connection = await checkSupabaseConnection();
    if (!connection.connected) {
        console.error('❌ Sem conexão com Supabase');
        showLoginScreen();
        return;
    }
    
    const session = await checkAuth();
    if (session) {
        console.log('✅ Usuário logado');
        showAppContent();
        createLogoutButton();
        window.dispatchEvent(new Event('userLoggedIn'));
    } else {
        console.log('👤 Mostrando login');
        showLoginScreen();
    }
    
    // Ouvir mudanças de autenticação
    window.supabase?.auth.onAuthStateChange((event, session) => {
        console.log('🔄 Auth mudou:', event);
        if (event === 'SIGNED_IN') {
            showAppContent();
            createLogoutButton();
            window.dispatchEvent(new Event('userLoggedIn'));
        } else if (event === 'SIGNED_OUT') {
            showLoginScreen();
            window.dispatchEvent(new Event('userLoggedOut'));
        }
    });
});

console.log('✅ auth.js pronto');