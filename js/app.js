// js/app.js - VERSÃO SOMENTE DASHBOARD

console.log('🚀 App.js carregado - Somente Dashboard');

// Estado do app
window.appState = {
  currentTab: 'dashboard',
  isAuthenticated: false
};

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', async function() {
  console.log('📋 DOM carregado - Iniciando dashboard...');
  
  try {
    // 1. Verificar se já está autenticado (deixe isso para o auth.js)
    // O auth.js deve mostrar/esconder telas
    
    // 2. Criar estrutura do dashboard
    createDashboardStructure();
    
    // 3. Configurar navegação
    setupNavigation();
    
    // 4. Carregar dashboard
    loadDashboard();
    
    console.log('✅ Dashboard inicializado com sucesso');
    
  } catch (error) {
    console.error('❌ Erro ao inicializar dashboard:', error);
    showError('Erro ao carregar dashboard. Recarregue a página.');
  }
});

// Criar estrutura do dashboard (APENAS CONTEÚDO DO APP)
function createDashboardStructure() {
  const appContainer = document.getElementById('appContent') || document.body;
  
  // Se já existe conteúdo, não recriar
  if (document.getElementById('dashboardContent')) {
    console.log('📊 Estrutura do dashboard já existe');
    return;
  }
  
  console.log('🏗️ Criando estrutura do dashboard...');
  
  // Limpar container
  appContainer.innerHTML = '';
  
  // Criar apenas o conteúdo do dashboard (sem login)
  appContainer.innerHTML = `
    <!-- Header -->
    <header class="app-header">
      <div class="header-content">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="logo-small">💰</div>
          <h1>Finanças App</h1>
          <!-- O botão de logout fica no auth.js -->
        </div>
      </div>
    </header>
    
    <!-- Navegação por Tabs -->
    <div class="tabs-container">
      <div class="tabs">
        <button class="tab active" data-tab="dashboard">📊 Dashboard</button>
        <button class="tab" data-tab="transactions">💸 Transações</button>
        <button class="tab" data-tab="investments">📈 Investimentos</button>
        <button class="tab" data-tab="reports">📋 Relatórios</button>
      </div>
    </div>
    
    <!-- Container principal -->
    <div class="container">
      <!-- Conteúdo das Tabs -->
      <div id="dashboardContent" class="tab-content active"></div>
      <div id="transactionsContent" class="tab-content"></div>
      <div id="investmentsContent" class="tab-content"></div>
      <div id="reportsContent" class="tab-content"></div>
    </div>
    
    <!-- Navegação Mobile -->
    <nav class="bottom-nav">
      <button class="nav-item active" data-tab="dashboard">
        <span>📊</span>
        <small>Dashboard</small>
      </button>
      <button class="nav-item" data-tab="transactions">
        <span>💸</span>
        <small>Transações</small>
      </button>
      <button class="nav-item" data-tab="investments">
        <span>📈</span>
        <small>Investir</small>
      </button>
      <button class="nav-item" data-tab="reports">
        <span>📋</span>
        <small>Relatórios</small>
      </button>
    </nav>
    
    <!-- Toast Notifications -->
    <div id="toast" class="toast"></div>
  `;
  
  // Adicionar estilos CSS se necessário
  addDashboardStyles();
}

// Adicionar estilos específicos do dashboard
function addDashboardStyles() {
  // Verificar se os estilos já existem
  if (document.querySelector('#dashboard-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'dashboard-styles';
  style.textContent = `
    .logo-small {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #3b82f6 0%, #10b981 100%);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }
    
    .app-header {
      background: #1e293b;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid #334155;
    }
    
    .header-content {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .app-header h1 {
      margin: 0;
      font-size: 1.5rem;
      color: white;
    }
    
    .tabs-container {
      background: #1e293b;
      border-bottom: 1px solid #334155;
    }
    
    .tabs {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      padding: 0 1.5rem;
    }
    
    .tab {
      padding: 1rem 1.5rem;
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 1rem;
      cursor: pointer;
      border-bottom: 3px solid transparent;
      transition: all 0.3s;
    }
    
    .tab:hover {
      color: white;
      background: rgba(255, 255, 255, 0.05);
    }
    
    .tab.active {
      color: #3b82f6;
      border-bottom-color: #3b82f6;
      font-weight: 600;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1.5rem;
    }
    
    .tab-content {
      display: none;
    }
    
    .tab-content.active {
      display: block;
    }
    
    .bottom-nav {
      display: none;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: #1e293b;
      border-top: 1px solid #334155;
      padding: 0.5rem;
    }
    
    .nav-item {
      flex: 1;
      background: none;
      border: none;
      color: #94a3b8;
      padding: 0.5rem;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
    }
    
    .nav-item.active {
      color: #3b82f6;
    }
    
    .nav-item span {
      font-size: 1.5rem;
    }
    
    .nav-item small {
      font-size: 0.75rem;
    }
    
    .toast {
      position: fixed;
      bottom: 1rem;
      left: 50%;
      transform: translateX(-50%);
      background: #1e293b;
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      border-left: 4px solid #3b82f6;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      display: none;
      z-index: 1000;
      max-width: 90%;
    }
    
    @media (max-width: 768px) {
      .tabs-container {
        display: none;
      }
      
      .bottom-nav {
        display: flex;
      }
    }
  `;
  
  document.head.appendChild(style);
}

// Configurar navegação entre tabs
function setupNavigation() {
  console.log('📍 Configurando navegação...');
  
  // Desktop tabs
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('tab')) {
      e.preventDefault();
      const tabName = e.target.getAttribute('data-tab');
      switchTab(tabName);
    }
    
    if (e.target.classList.contains('nav-item')) {
      e.preventDefault();
      const tabName = e.target.getAttribute('data-tab');
      switchTab(tabName);
    }
  });
  
  // Seletor de mês (se existir no seu dashboard)
  const monthSelector = document.querySelector('.month-selector');
  if (monthSelector) {
    monthSelector.addEventListener('change', function() {
      console.log('📅 Mês alterado:', this.value);
      if (typeof loadMonth === 'function') {
        loadMonth();
      }
    });
  }
}

// Alternar entre tabs
function switchTab(tabName) {
  console.log(`📋 Alternando para tab: ${tabName}`);
  
  // Atualizar estado
  window.appState.currentTab = tabName;
  
  // Atualizar UI das tabs
  document.querySelectorAll('.tab, .nav-item').forEach(el => {
    el.classList.remove('active');
    if (el.getAttribute('data-tab') === tabName) {
      el.classList.add('active');
    }
  });
  
  // Esconder todos os conteúdos
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  // Mostrar conteúdo da tab atual
  const contentId = `${tabName}Content`;
  const activeContent = document.getElementById(contentId);
  if (activeContent) {
    activeContent.classList.add('active');
  }
  
  // Carregar conteúdo específico da tab
  loadTabContent(tabName);
}

// Carregar conteúdo da tab
function loadTabContent(tabName) {
  console.log(`📂 Carregando conteúdo: ${tabName}`);
  
  switch(tabName) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'transactions':
      loadTransactions();
      break;
    case 'investments':
      loadInvestments();
      break;
    case 'reports':
      loadReports();
      break;
  }
}

// Carregar dashboard
function loadDashboard() {
  console.log('📊 Carregando dashboard...');
  
  const dashboardContent = document.getElementById('dashboardContent');
  if (!dashboardContent) {
    console.error('❌ Elemento dashboardContent não encontrado');
    return;
  }
  
  // Se já carregou, não recarregar
  if (dashboardContent.innerHTML.trim() !== '' && 
      !dashboardContent.innerHTML.includes('Carregando')) {
    console.log('✅ Dashboard já carregado');
    return;
  }
  
  // Mostrar loading
  dashboardContent.innerHTML = `
    <div style="text-align: center; padding: 3rem;">
      <div style="font-size: 3rem; margin-bottom: 1rem;">📊</div>
      <h2>Carregando Dashboard...</h2>
      <p>Por favor, aguarde.</p>
    </div>
  `;
  
  // Aguardar um pouco e carregar o dashboard.js
  setTimeout(() => {
    if (typeof loadDashboardContent === 'function') {
      console.log('🎯 Chamando loadDashboardContent do dashboard.js');
      loadDashboardContent();
    } else {
      console.error('❌ loadDashboardContent não encontrada');
      dashboardContent.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: #ef4444;">
          <h2>Erro ao carregar dashboard</h2>
          <p>A função loadDashboardContent não foi encontrada.</p>
          <button onclick="loadDashboard()" style="
            padding: 0.75rem 1.5rem;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 0.5rem;
            cursor: pointer;
            margin-top: 1rem;
          ">
            Tentar novamente
          </button>
        </div>
      `;
    }
  }, 500);
}

// Carregar transações
function loadTransactions() {
  console.log('💸 Carregando transações...');
  
  const content = document.getElementById('transactionsContent');
  if (!content) return;
  
  content.innerHTML = `
    <div style="padding: 2rem; text-align: center;">
      <h2 style="margin-bottom: 1rem;">💸 Transações</h2>
      <p>Funcionalidade em desenvolvimento</p>
      <p style="color: #94a3b8; margin-top: 1rem;">
        Em breve você poderá gerenciar suas transações aqui.
      </p>
    </div>
  `;
}

// Carregar investimentos
function loadInvestments() {
  console.log('📈 Carregando investimentos...');
  
  const content = document.getElementById('investmentsContent');
  if (!content) return;
  
  content.innerHTML = `
    <div style="padding: 2rem; text-align: center;">
      <h2 style="margin-bottom: 1rem;">📈 Investimentos</h2>
      <p>Funcionalidade em desenvolvimento</p>
      <p style="color: #94a3b8; margin-top: 1rem;">
        Em breve você poderá acompanhar seus investimentos aqui.
      </p>
    </div>
  `;
}

// Carregar relatórios
function loadReports() {
  console.log('📋 Carregando relatórios...');
  
  const content = document.getElementById('reportsContent');
  if (!content) return;
  
  content.innerHTML = `
    <div style="padding: 2rem; text-align: center;">
      <h2 style="margin-bottom: 1rem;">📋 Relatórios</h2>
      <p>Funcionalidade em desenvolvimento</p>
      <p style="color: #94a3b8; margin-top: 1rem;">
        Em breve você poderá gerar relatórios detalhados aqui.
      </p>
    </div>
  `;
}

// Função para mostrar toast (compatível com auth.js)
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) {
    console.log(`Toast (${type}): ${message}`);
    return;
  }
  
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.style.display = 'block';
  
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

// Função para mostrar erro
function showError(message) {
  const appContainer = document.getElementById('appContent') || document.body;
  appContainer.innerHTML = `
    <div style="
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0b1220;
      color: white;
      padding: 2rem;
      text-align: center;
    ">
      <div>
        <h1 style="color: #ef4444; margin-bottom: 1rem;">⚠️ Erro</h1>
        <p style="margin-bottom: 1.5rem;">${message}</p>
        <div style="display: flex; gap: 1rem; justify-content: center;">
          <button onclick="location.reload()" style="
            padding: 0.75rem 1.5rem;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 0.5rem;
            cursor: pointer;
          ">
            🔄 Recarregar
          </button>
          <button onclick="loadDashboard()" style="
            padding: 0.75rem 1.5rem;
            background: #10b981;
            color: white;
            border: none;
            border-radius: 0.5rem;
            cursor: pointer;
          ">
            📊 Tentar Dashboard
          </button>
        </div>
      </div>
    </div>
  `;
}

// Funções auxiliares globais
window.switchTab = switchTab;
window.loadDashboard = loadDashboard;
window.showToast = showToast;

// Exportar para debug
window.app = {
  switchTab,
  loadDashboard,
  loadTransactions,
  loadInvestments,
  loadReports,
  state: window.appState
};

console.log('✅ App.js pronto - Dashboard apenas');