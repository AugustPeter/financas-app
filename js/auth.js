// js/auth.js - Gerenciamento de autenticação com Supabase

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
    try {
        const { data, error } = await window.supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password
        });
        if (error) {
            console.error('❌ Erro no login:', error.message);
            return { success: false, error: error.message };
        }
        return { success: true, user: data.user, session: data.session };
    } catch (err) {
        console.error('❌ Erro inesperado no signIn:', err);
        return { success: false, error: 'Erro inesperado: ' + err.message };
    }
}

async function signUp(email, password) {
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
        return { success: true, user: data.user, requiresEmailConfirmation: data.user?.identities?.length === 0 };
    } catch (err) {
        console.error('❌ Erro inesperado no signUp:', err);
        return { success: false, error: 'Erro inesperado: ' + err.message };
    }
}

async function signOut() {
    try {
        if (!window.supabase || !window.supabase.auth) {
            throw new Error('Supabase não disponível');
        }
        const { error } = await window.supabase.auth.signOut();
        if (error) {
            console.error('❌ Erro no logout:', error.message);
            return { success: false, error: error.message };
        }
        return { success: true };
    } catch (err) {
        console.error('❌ Erro inesperado no signOut:', err);
        return { success: false, error: 'Erro inesperado' };
    }
}

async function checkSupabaseConnection() {
    try {
        if (!window.supabase) {
            return { connected: false, error: 'Biblioteca Supabase não carregou' };
        }
        const { data, error } = await window.supabase.auth.getSession();
        if (error) {
            if (error.message.includes('session')) {
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
        <div id="loginScreen" class="login-container" role="main" aria-label="Tela de login">
            <div class="login-box">
                <div class="logo">
                    <div class="logo-icon" aria-hidden="true">💰</div>
                    <h1 class="login-title">Finanças App</h1>
                    <p class="login-subtitle">Controle suas finanças de forma simples</p>
                </div>
                
                <form id="loginForm" class="form-active" onsubmit="event.preventDefault(); handleLogin();" aria-label="Formulário de login">
                    <label for="email" class="sr-only">Email</label>
                    <input type="email" id="email" class="login-input" placeholder="seu@email.com" autocomplete="email" required aria-required="true">
                    
                    <label for="password" class="sr-only">Senha</label>
                    <input type="password" id="password" class="login-input" placeholder="Sua senha" autocomplete="current-password" required aria-required="true">
                    
                    <button type="submit" class="login-button" aria-label="Fazer login">Entrar</button>
                    
                    <div class="login-links">
                        <p>Não tem conta? <a href="#" onclick="event.preventDefault(); showSignupForm()" class="login-link" role="button">Cadastre-se</a></p>
                    </div>
                </form>
                
                <form id="signupForm" class="form-switch" onsubmit="event.preventDefault(); handleSignup();" aria-label="Formulário de cadastro">
                    <label for="signupEmail" class="sr-only">Email para cadastro</label>
                    <input type="email" id="signupEmail" class="login-input" placeholder="seu@email.com" autocomplete="email" required aria-required="true">
                    
                    <label for="signupPassword" class="sr-only">Senha para cadastro</label>
                    <input type="password" id="signupPassword" class="login-input" placeholder="Senha (mínimo 6 caracteres)" autocomplete="new-password" minlength="6" required aria-required="true">
                    
                    <button type="submit" class="signup-button" aria-label="Criar conta">Criar Conta</button>
                    
                    <div class="login-links">
                        <p>Já tem conta? <a href="#" onclick="event.preventDefault(); showLoginForm()" class="login-link" role="button">Faça login</a></p>
                    </div>
                </form>
                
                <div id="authMessage" class="auth-message" role="alert" aria-live="polite"></div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('afterbegin', loginHTML);
    
    if (!document.querySelector('#login-styles')) {
        const styles = `
            <style>
                .sr-only {
                    position: absolute;
                    width: 1px;
                    height: 1px;
                    padding: 0;
                    margin: -1px;
                    overflow: hidden;
                    clip: rect(0, 0, 0, 0);
                    white-space: nowrap;
                    border: 0;
                }
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
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    if (loginForm) {
        loginForm.classList.remove('form-active');
        loginForm.classList.add('form-switch');
    }
    if (signupForm) {
        signupForm.classList.remove('form-switch');
        signupForm.classList.add('form-active');
    }
};

window.showLoginForm = function() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.classList.remove('form-active');
        signupForm.classList.add('form-switch');
    }
    if (loginForm) {
        loginForm.classList.remove('form-switch');
        loginForm.classList.add('form-active');
    }
};

function showAuthMessage(message, type) {
    const messageEl = document.getElementById('authMessage');
    if (!messageEl) return;
    messageEl.textContent = message;
    messageEl.className = 'auth-message';
    if (type === 'error') {
        messageEl.classList.add('auth-error');
    } else if (type === 'success') {
        messageEl.classList.add('auth-success');
    } else {
        // Para 'info', usa estilo de success mas com cor diferente
        messageEl.classList.add('auth-success');
        messageEl.style.background = 'rgba(59, 130, 246, 0.2)';
        messageEl.style.color = '#3b82f6';
        messageEl.style.border = '1px solid rgba(59, 130, 246, 0.3)';
    }
    messageEl.style.display = 'block';
    setTimeout(() => {
        messageEl.style.display = 'none';
        messageEl.style.background = '';
        messageEl.style.color = '';
        messageEl.style.border = '';
    }, 5000);
}

// ============================================
// INICIALIZAÇÃO (UMA ÚNICA VEZ)
// ============================================

// Função principal de inicialização
async function initAuth() {
    console.log('🔐 Iniciando autenticação...');
    
    const connection = await checkSupabaseConnection();
    if (!connection.connected) {
        console.error('❌ Sem conexão com Supabase');
        showLoginScreen();
        return;
    }
    
    const session = await checkAuth();
    if (session) {
        showAppContent();
        createLogoutButton();
        window.dispatchEvent(new Event('userLoggedIn'));
    } else {
        showLoginScreen();
    }
    
    // Ouvir mudanças de autenticação
    window.supabase?.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
            showAppContent();
            createLogoutButton();
            window.dispatchEvent(new Event('userLoggedIn'));
        } else if (event === 'SIGNED_OUT') {
            showLoginScreen();
            window.dispatchEvent(new Event('userLoggedOut'));
        }
    });
}

// Aguardar Supabase estar pronto antes de inicializar
document.addEventListener('DOMContentLoaded', () => {
    // Se Supabase já está pronto, inicializar imediatamente
    if (window.supabaseReady && window.supabase) {
        initAuth();
    } else {
        // Caso contrário, aguardar evento supabaseReady
        window.addEventListener('supabaseReady', initAuth);
        
        // Timeout de segurança: se após 5s ainda não inicializou, mostrar login
        setTimeout(() => {
            if (!window.supabaseReady) {
                console.warn('⚠️ Timeout aguardando Supabase, mostrando login...');
                showLoginScreen();
            }
        }, 5000);
    }
});

console.log('✅ auth.js carregado');