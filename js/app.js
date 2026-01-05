// js/app.js - VERSÃO OTIMIZADA E LEVE
// Objetivo: criar dashboard de forma eficiente, com cache de DOM e proteção contra loads duplicados

(function () {
  // Estado global leve
  window.appState = { currentTab: 'dashboard', isAuthenticated: false };

  // Cache de elementos e flags
  const AppCache = {
    appRoot: null,
    appContent: null,
    dashboardContent: null,
    toast: null,
    isInitialized: false,
    isDashboardLoading: false,
    init() {
      this.appRoot = document.getElementById('app') || document.body;
      this.appContent = document.getElementById('appContent') || this._createAppContent();
      this.dashboardContent = document.getElementById('dashboardContent');
      this.toast = document.getElementById('toast');
      this.isInitialized = true;
    },
    _createAppContent() {
      const el = document.createElement('div');
      el.id = 'appContent';
      this.appRoot.appendChild(el);
      return el;
    },
    refreshDashboardRef() {
      this.dashboardContent = document.getElementById('dashboardContent');
    }
  };

  // Injetar estilos do dashboard (apenas uma vez)
  function addDashboardStyles() {
    if (document.getElementById('dashboard-styles')) return;
    const style = document.createElement('style');
    style.id = 'dashboard-styles';
    style.textContent = `
      .container { max-width:1200px; margin:0 auto; padding:1.5rem; }
      .tab-content { display:none; } .tab-content.active { display:block; }
      .bottom-nav { display:none; position:fixed; bottom:0; left:0; right:0; background:#1e293b; border-top:1px solid #334155; padding:.5rem; }
      .nav-item { flex:1; background:none; border:none; color:#94a3b8; padding:.5rem; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:.25rem; }
      .nav-item.active { color:#3b82f6; }
      .toast { position:fixed; bottom:1rem; left:50%; transform:translateX(-50%); background:#1e293b; color:white; padding:.75rem 1.5rem; border-radius:.5rem; display:none; z-index:1000; }
      @media (max-width:768px){ .tabs-container{display:none;} .bottom-nav{display:flex;} }
    `;
    document.head.appendChild(style);
  }

  // Cria estrutura do dashboard usando template para reduzir reflow
  function createDashboardStructure() {
    AppCache.init();
    if (document.getElementById('dashboardContent')) return;

    addDashboardStyles();

    const tpl = document.createElement('template');
    tpl.innerHTML = `
      <div>
        <div class="container">
          <div id="dashboardContent" class="tab-content active"></div>
          <div id="transactionsContent" class="tab-content"></div>
          <div id="investmentsContent" class="tab-content"></div>
          <div id="reportsContent" class="tab-content"></div>
        </div>

        <nav class="bottom-nav">
          <button class="nav-item active" data-tab="dashboard"><span>📊</span><small>Dashboard</small></button>
          <button class="nav-item" data-tab="transactions"><span>💸</span><small>Transações</small></button>
          <button class="nav-item" data-tab="investments"><span>📈</span><small>Investir</small></button>
          <button class="nav-item" data-tab="reports"><span>📋</span><small>Relatórios</small></button>
        </nav>

        <div id="toast" class="toast" aria-live="polite"></div>
      </div>
    `.trim();

    // Aplica template de forma eficiente
    AppCache.appContent.innerHTML = '';
    AppCache.appContent.appendChild(tpl.content.cloneNode(true));
    AppCache.refreshDashboardRef();
  }

  // Navegação e delegação (delegação limitada ao appContent)
  function setupNavigation() {
    if (!AppCache.appContent) AppCache.init();

    AppCache.appContent.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('[data-tab]');
      if (!tabBtn) return;
      e.preventDefault();
      const tabName = tabBtn.getAttribute('data-tab');
      switchTab(tabName);
    });

    // month selector change handled by HUD or components that create it
  }

  // Alternar tab de forma eficiente
  function switchTab(tabName) {
    if (!AppCache.appContent) AppCache.init();
    if (!tabName || window.appState.currentTab === tabName) return;
    window.appState.currentTab = tabName;

    const selectors = AppCache.appContent.querySelectorAll('.tab, .nav-item');
    selectors.forEach(el => el.classList.toggle('active', el.getAttribute('data-tab') === tabName));

    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `${tabName}Content`);
    });

    loadTabContent(tabName);
  }

  // Carregar conteúdo conforme a tab
  function loadTabContent(tabName) {
    switch (tabName) {
      case 'dashboard': loadDashboard(); break;
      case 'transactions': if (typeof loadTransactions === 'function') loadTransactions(); break;
      case 'investments': if (typeof loadInvestments === 'function') loadInvestments(); break;
      case 'reports': if (typeof loadReports === 'function') loadReports(); break;
    }
  }

  // Debounced/simple guard loader para o dashboard
  async function loadDashboard() {
    AppCache.init();
    if (AppCache.isDashboardLoading) return;
    AppCache.isDashboardLoading = true;

    try {
      const dashboardContent = document.getElementById('dashboardContent');
      if (!dashboardContent) {
        AppCache.isDashboardLoading = false;
        return;
      }

      // Se já existe conteúdo e não está num estado "Carregando", evita recarregar
      const contentTrim = dashboardContent.innerHTML.trim();
      if (contentTrim && !contentTrim.includes('Carregando')) {
        AppCache.isDashboardLoading = false;
        return;
      }

      // Marcar loading UI rápido para UX
      dashboardContent.innerHTML = `
        <div style="text-align:center;padding:3rem">
          <div style="font-size:3rem;margin-bottom:1rem">📊</div>
          <h2>Carregando Dashboard...</h2>
          <p>Por favor aguarde.</p>
        </div>
      `;

      // Defer para próxima pintura e então chamar loadDashboardContent
      await new Promise(resolve => requestAnimationFrame(() => resolve()));
      if (typeof loadDashboardContent === 'function') {
        loadDashboardContent();
      } else {
        dashboardContent.innerHTML = `
          <div style="text-align:center;padding:3rem;color:#ef4444">
            <h2>Erro ao carregar dashboard</h2>
            <p>Função loadDashboardContent não encontrada.</p>
            <button id="retryDashboard" style="padding:.75rem 1.5rem;background:#3b82f6;color:#fff;border:none;border-radius:.5rem;cursor:pointer">Tentar novamente</button>
          </div>
        `;
        const retry = document.getElementById('retryDashboard');
        if (retry) retry.addEventListener('click', loadDashboard);
      }
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      AppCache.isDashboardLoading = false;
    }
  }

  // Funções leves para conteúdo de fallback
  function loadTransactions() {
    const content = document.getElementById('transactionsContent');
    if (!content) return;
    content.innerHTML = `<div style="padding:2rem;text-align:center"><h2>💸 Transações</h2><p>Em desenvolvimento</p></div>`;
  }

  function loadInvestments() {
    const content = document.getElementById('investmentsContent');
    if (!content) return;
    content.innerHTML = `<div style="padding:2rem;text-align:center"><h2>📈 Investimentos</h2><p>Em desenvolvimento</p></div>`;
  }

  function loadReports() {
    const content = document.getElementById('reportsContent');
    if (!content) return;
    content.innerHTML = `<div style="padding:2rem;text-align:center"><h2>📋 Relatórios</h2><p>Em desenvolvimento</p></div>`;
  }

  // Toast utilitário
  function showToast(message, duration = 3000) {
    AppCache.init();
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.style.display = 'block';
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => { toast.style.display = 'none'; }, duration);
  }

  // Expor funções úteis para o resto do app
  window.switchTab = switchTab;
  window.loadDashboard = loadDashboard;
  window.showToast = showToast;

  // Inicialização quando DOM pronto — auth.js deve decidir visibilidade
  document.addEventListener('DOMContentLoaded', () => {
    AppCache.init();
    createDashboardStructure();
    setupNavigation();

    // Chamar loadDashboard mas sem forçar se auth.js vai controlar a exibição
    loadDashboard();
  });
})();