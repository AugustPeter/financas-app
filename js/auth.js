// js/auth.js - Gerenciamento de autenticação com Supabase

console.log('🔐 auth.js carregado');
function showAppContent() {
    console.log("📱 Mostrando conteúdo do app...");
    
    // Esconder tela de login
    const loginScreen = document.getElementById('loginScreen');
    if (loginScreen) {
        loginScreen.style.display = 'none';
    }

    // Mostrar o conteúdo do app
    const appContent = document.getElementById('appContent');
    if (appContent) {
        appContent.style.display = 'block';
    }
}
// Verificar se Supabase está disponível
if (!window.supabase) {
  console.error('❌ Supabase não carregou!');
} else {
    console.log('✅ Supabase disponível no auth.js');
}
function showAuthScreen() {
    console.log('🖥️ Mostrando tela de autenticação...');
    
    // Se já existe tela de login, mostra
    const loginScreen = document.getElementById('loginScreen');
    if (loginScreen) {
        loginScreen.style.display = 'flex';
        return;
    }
    
    // Se não existe, cria
    createLoginScreen();
}
// ============================================
// FUNÇÕES DE AUTENTICAÇÃO
// ============================================

// Verificar se usuário está autenticado
async function checkAuth() {
    console.log('🔍 Verificando autenticação...');

    try {
        const { data: { session }, error } = await window.supabase.auth.getSession();

        if (error) {
            console.error('❌ Erro ao verificar sessão:', error.message);
            return null;
        }

        if (session) {
            console.log('✅ Usuário autenticado:', session.user.email);
            return session;  // Sessão válida
        } else {
            console.log('👤 Usuário não autenticado');
            return null;  // Usuário não autenticado
        }
    } catch (err) {
        console.error('❌ Erro inesperado no checkAuth:', err);
        return null;  // Retorna null se ocorrer um erro inesperado
    }
}

// Fazer login com email e senha
async function signIn(email, password) {
    console.log('🔑 Tentando login com:', email);

    try {
        const { data, error } = await window.supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password
        });

        if (error) {
            console.error('❌ Erro no login:', error.message);
            return { 
                success: false, 
                error: error.message 
            };
        }

        console.log('✅ Login realizado:', data.user.email);
        showAppContent();  // Chama a função para mostrar o conteúdo do app
        return { 
            success: true, 
            user: data.user,
            session: data.session
        };
    } catch (err) {
        console.error('❌ Erro inesperado no signIn:', err);
        return { 
            success: false, 
            error: 'Erro inesperado: ' + err.message
        };
    }
}

// Registrar novo usuário
async function signUp(email, password) {
    console.log('📝 Registrando novo usuário:', email);
    
    try {
        if (!window.supabase || !window.supabase.auth) {
            throw new Error('Supabase não disponível');
        }
        
        // Validações básicas
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
            return { 
                success: false, 
                error: error.message,
                code: error.code
            };
        }

        console.log('✅ Registro realizado:', data.user?.email);
        return { 
            success: true, 
            user: data.user,
            requiresEmailConfirmation: data.user?.identities?.length === 0
        };
    } catch (err) {
        console.error('❌ Erro inesperado no signUp:', err);
        return { 
            success: false, 
            error: 'Erro inesperado: ' + err.message
        };
    }
}

// Fazer logout
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

// Verificar conexão com Supabase
async function checkSupabaseConnection() {
    console.log('🔗 Testando conexão com Supabase...');
    
    try {
        if (!window.supabase) {
            return { 
                connected: false, 
                error: 'Biblioteca Supabase não carregou' 
            };
        }
        
        // Teste simples - tentar pegar sessão
        const { data, error } = await window.supabase.auth.getSession();
        
        if (error) {
            // Pode ser apenas "Não autenticado", o que é normal
            if (error.message.includes('session')) {
                console.log('⚠️ Sem sessão ativa (normal)');
                return { connected: true, hasSession: false };
            }
            return { connected: false, error: error.message };
        }
        
        return { 
            connected: true, 
            hasSession: !!data.session,
            session: data.session
        };
        
    } catch (err) {
        console.error('❌ Erro ao testar conexão:', err);
        return { connected: false, error: err.message };
    }
}

// ============================================
// FUNÇÕES DE UI PARA AUTENTICAÇÃO
// ============================================

// Mostrar tela de login
function showLoginScreen() {
    console.log('🖥️ Mostrando tela de login...');
    
    // Esconder conteúdo do app
    const appContent = document.getElementById('appContent');
    if (appContent) {
        appContent.style.display = 'none';
    }
    
    // Mostrar tela de login (se já existe)
    const loginScreen = document.getElementById('loginScreen');
    if (loginScreen) {
        loginScreen.style.display = 'flex';
        return;
    }
    
    // Se não existe, criar dinamicamente
    createLoginScreen();
}

// Mostrar conteúdo do app


// Criar tela de login dinamicamente
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
    
    // Adicionar ao body
    document.body.insertAdjacentHTML('afterbegin', loginHTML);
    
    // Adicionar CSS se não existir
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
                .login-button {
                    width: 100%;
                    padding: 14px;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 10px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                }
                .signup-button {
                    width: 100%;
                    padding: 14px;
                    background: #10b981;
                    color: white;
                    border: none;
                    border-radius: 10px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
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
            </style>
        `;
        document.head.insertAdjacentHTML('beforeend', styles);
    }
}

// ============================================
// HANDLERS PARA OS BOTÕES (expostos globalmente)
// ============================================

// Handler para login
window.handleLogin = async function() {
    const email = document.getElementById('email')?.value;
    const password = document.getElementById('password')?.value;
    const messageEl = document.getElementById('authMessage');
    
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
            // Disparar evento de login bem-sucedido
            window.dispatchEvent(new Event('userLoggedIn'));
        }, 1000);
    } else {
        showAuthMessage('Erro: ' + result.error, 'error');
    }
};

// Handler para cadastro
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
            setTimeout(showLoginForm, 2000);
        } else {
            showAuthMessage('Conta criada com sucesso!', 'success');
            setTimeout(() => {
                showAppContent();
                window.dispatchEvent(new Event('userLoggedIn'));
            }, 1000);
        }
    } else {
        showAuthMessage('Erro: ' + result.error, 'error');
    }
};

// Handler para logout
window.handleLogout = async function() {
    console.log("Tentando fazer logout...");
    const result = await signOut();  // Certifique-se de que 'signOut' está definido corretamente
    
    if (result.success) {
        showToast('Logout realizado com sucesso', 'success');
        setTimeout(() => {
            showLoginScreen();
            window.dispatchEvent(new Event('userLoggedOut'));
        }, 500);
    } else {
        showToast('Erro ao sair: ' + result.error, 'error');
    }
};

// Funções de UI auxiliares
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

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// ============================================
// INICIALIZAÇÃO
// ============================================

// Inicializar quando DOM carregar
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Iniciando sistema de autenticação...');
    
    // Aguardar um pouco para garantir que Supabase carregou
    setTimeout(async () => {
        // Testar conexão com Supabase
        const connection = await checkSupabaseConnection();
        
        if (!connection.connected) {
            console.error('❌ Não conectado ao Supabase');
            showToast('Modo offline ativado - Dados locais', 'warning');
            // Mostrar tela de login mesmo offline
            showLoginScreen();
            return;
        }
        
        console.log('✅ Conectado ao Supabase');
        
        // Verificar autenticação
        const session = await checkAuth();
        
        if (session) {
            console.log('✅ Usuário já logado, mostrando app');
            showAppContent();
            window.dispatchEvent(new Event('userLoggedIn'));
        } else {
            console.log('👤 Mostrando tela de login');
            showLoginScreen();
        }
        
        // Ouvir mudanças de autenticação
        window.supabase?.auth.onAuthStateChange((event, session) => {
            console.log('🔄 Mudança de autenticação:', event);
            
            if (event === 'SIGNED_IN') {
                showAppContent();
                window.dispatchEvent(new Event('userLoggedIn'));
            } else if (event === 'SIGNED_OUT') {
                showLoginScreen();
                window.dispatchEvent(new Event('userLoggedOut'));
            }
        });
        
    }, 1000);
});
// Função para mostrar o formulário de login
// ============================================
// BOTÃO DE SAIR SIMPLES
// ============================================

/**
 * Criar botão de sair
 */
function createLogoutButton() {
    console.log('🚪 Criando botão de sair...');
    
    // Remover botão antigo se existir
    const oldButton = document.getElementById('logoutButton');
    if (oldButton) oldButton.remove();
    
    // Criar botão
    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'logoutButton';
    logoutBtn.innerHTML = '🚪 Sair';
    
    // Estilos simples
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
    
    // Efeito hover
    logoutBtn.onmouseover = () => logoutBtn.style.background = '#dc2626';
    logoutBtn.onmouseout = () => logoutBtn.style.background = '#ef4444';
    
    // Ação de sair
    logoutBtn.onclick = async () => {
        if (confirm('Deseja realmente sair da conta?')) {
            logoutBtn.disabled = true;
            logoutBtn.innerHTML = 'Saindo...';
            
            try {
                await supabase.auth.signOut();
                window.location.reload();
            } catch (error) {
                console.error('Erro ao sair:', error);
                alert('Erro ao sair da conta');
                logoutBtn.disabled = false;
                logoutBtn.innerHTML = '🚪 Sair';
            }
        }
    };
    
    // Adicionar ao body
    document.body.appendChild(logoutBtn);
    console.log('✅ Botão de sair criado');
}

// ============================================
// EXECUTAR QUANDO USUÁRIO ESTIVER LOGADO
// ============================================

// Executar quando autenticação mudar
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        setTimeout(createLogoutButton, 500);
    }
    
    if (event === 'SIGNED_OUT') {
        const logoutBtn = document.getElementById('logoutButton');
        if (logoutBtn) logoutBtn.remove();
    }
});

// Executar também quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(createLogoutButton, 1000);
});

console.log('✅ Sistema de logout carregado');
// Exportar funções para uso em outros arquivos
window.auth = {
    showLoginForm,
    showSignupForm
};