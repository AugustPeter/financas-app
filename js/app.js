// js/app.js - VERSÃO SIMPLIFICADA
console.log('App.js carregado');

// Verificar se Supabase está disponível
console.log('Supabase disponível?', !!window.supabase);


// Não tentar usar supabase diretamente, use window.supabaseClient
if (window.supabase) {
    console.log('✅ Supabase client disponível');
} else {
    console.error('❌ Supabase client não disponível');
}

// Funções básicas do app
function initApp() {
    console.log('🚀 Inicializando app...');
    
    // Configurar navegação entre tabs
    setupTabs();
    
    // Carregar dados iniciais
    loadInitialData();
}

// Configurar tabs
function setupTabs() {
    console.log('📱 Configurando tabs...');
    // Sua lógica de tabs aqui
}

// Carregar dados
async function loadInitialData() {
    console.log('📊 Carregando dados...');
    
    if (!window.supabase) {
        console.warn('⚠️ Supabase não disponível para carregar dados');
        return;
    }
    
    // Verificar se usuário está logado
    const { data: { session } } = await window.supabase.auth.getSession();

    
    if (session) {
        console.log('👤 Usuário logado:', session.user.email);
        // Carregar dados do usuário
    } else {
        console.log('👤 Usuário não logado');
    }
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', initApp);

// Exportar para debug
window.app = {
    initApp,
    setupTabs,
    loadInitialData
};