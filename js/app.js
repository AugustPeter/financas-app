// ============================================
// INICIALIZAÇÃO DO APP
// ============================================
// App.js - Verificar carregamento
console.log('App.js carregado');
console.log('Supabase disponível?', typeof supabase !== 'undefined');
console.log('Supabase auth disponível?', supabase?.auth ? 'Sim' : 'Não');

// Verificar variáveis de configuração
console.log('SUPABASE_URL definida?', SUPABASE_URL ? 'Sim' : 'Não');
console.log('SUPABASE_ANON_KEY definida?', SUPABASE_ANON_KEY ? 'Sim' : 'Não');
// Inicialização do app
function initApp() {
  console.log('Inicializando app...');
  
  // Configurar tema salvo
  if (localStorage.getItem('dark') === 'true') {
    document.body.classList.add('dark');
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.textContent = '☀️';
    }
  }
  
  // Carregar mês atual do localStorage ou usar atual
  const savedMonth = localStorage.getItem('currentMonth');
  if (savedMonth) {
    mesAtual = savedMonth;
  } else {
    // Definir mês atual
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const now = new Date();
    mesAtual = months[now.getMonth()];
  }
  
  // Configurar navegação
  setupTabListeners();
  
  // Configurar PWA
  setupPWA();
  
  // Verificar conexão
  updateOnlineStatus();
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  
  // Carregar dashboard inicial
  showTab('dashboard');
  
  // Carregar metas
  updateGoalsList();
  
  showToast('App financeiro carregado!', 'success');
}

// Carregar conteúdo da tab
function loadTabContent(tabName) {
  switch(tabName) {
    case 'dashboard':
      loadDashboardContent();
      break;
    case 'transactions':
      loadTransactionsContent();
      break;
    case 'investments':
      loadInvestmentsContent();
      break;
    case 'reports':
      loadReportsContent();
      break;
  }
}

// ============================================
// EVENT LISTENERS GLOBAIS
// ============================================

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initApp);

// Adicionar listeners para os botões que podem não estar disponíveis no DOM inicial
document.addEventListener('click', function(event) {
  // Delegar eventos para funções globais
  if (event.target.matches('.btn-icon')) {
    const tr = event.target.closest('tr');
    if (tr) {
      tr.remove();
      if (typeof calc === 'function') calc();
    }
  }
});