/**
 * app.js - Aplicação Principal
 * Versão otimizada e limpa
 */

(function() {
  'use strict';

  // ============================================
  // ESTADO
  // ============================================

  const App = {
    state: {
      currentTab: 'dashboard',
      isAuthenticated: false,
      isDashboardLoading: false
    },
    cache: {
      appContent: null,
      dashboardContent: null
    }
  };

  // ============================================
  // INICIALIZAÇÃO
  // ============================================

  function init() {
    cacheElements();
    createAppStructure();
    setupNavigation();
    loadInitialTab();
    setupMobileOptimizations();
  }

  function cacheElements() {
    App.cache.appContent = document.getElementById('appContent') || createAppContent();
  }

  function createAppContent() {
    const el = document.createElement('div');
    el.id = 'appContent';
    (document.getElementById('app') || document.body).appendChild(el);
    return el;
  }

  // ============================================
  // ESTRUTURA
  // ============================================

  function createAppStructure() {
    if (document.getElementById('dashboardContent')) return;

    addAppStyles();

    App.cache.appContent.innerHTML = `
      <div class="container">
        <div id="dashboardContent" class="tab-content active"></div>
        <div id="transactionsContent" class="tab-content"></div>
        <div id="investmentsContent" class="tab-content"></div>
        <div id="reportsContent" class="tab-content"></div>
      </div>
      <div id="toast" class="toast"></div>
    `;

    App.cache.dashboardContent = document.getElementById('dashboardContent');
  }

  function addAppStyles() {
    if (document.getElementById('app-styles')) return;

    const style = document.createElement('style');
    style.id = 'app-styles';
    style.textContent = `
      .container { 
        max-width: 1200px; 
        margin: 0 auto; 
        padding: 1.5rem;
        padding-top: 70px;
      }
      .tab-content { display: none; }
      .tab-content.active { display: block; }
      .toast { 
        position: fixed; 
        bottom: 1rem; 
        left: 50%; 
        transform: translateX(-50%); 
        background: #1e293b; 
        color: white; 
        padding: 0.75rem 1.5rem; 
        border-radius: 0.5rem; 
        display: none; 
        z-index: 10000; 
      }
      .toast.show { display: block; }
      
      @media (max-width: 768px) {
        .container { 
          padding: 1rem;
          padding-top: 70px;
          padding-bottom: 80px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ============================================
  // NAVEGAÇÃO
  // ============================================

  function setupNavigation() {
    App.cache.appContent.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('[data-tab]');
      if (tabBtn) {
        e.preventDefault();
        switchTab(tabBtn.getAttribute('data-tab'));
      }
    });
  }

  function switchTab(tabName) {
    if (!tabName || App.state.currentTab === tabName) return;
    
    App.state.currentTab = tabName;

    // Atualizar tabs ativas
    document.querySelectorAll('.tab, .nav-item').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-tab') === tabName);
    });

    // Atualizar conteúdo ativo
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `${tabName}Content`);
    });

    loadTabContent(tabName);
  }

  function loadTabContent(tabName) {
    const loaders = {
      dashboard: loadDashboard,
      transactions: () => typeof loadTransactionsContent === 'function' && loadTransactionsContent(),
      investments: () => typeof loadInvestmentsContent === 'function' && loadInvestmentsContent(),
      reports: () => typeof loadReportsContent === 'function' && loadReportsContent()
    };

    if (loaders[tabName]) loaders[tabName]();
  }

  function loadInitialTab() {
    loadDashboard();
  }

  // ============================================
  // DASHBOARD
  // ============================================

  async function loadDashboard() {
    if (App.state.isDashboardLoading) return;
    App.state.isDashboardLoading = true;

    try {
      const container = document.getElementById('dashboardContent');
      if (!container) return;

      // Já renderizado?
      if (container.querySelector('#renda')) return;

      // Aguardar função estar disponível
      if (typeof loadDashboardContent === 'function') {
        loadDashboardContent();
      } else {
        await waitForFunction('loadDashboardContent', 5000);
        if (typeof loadDashboardContent === 'function') {
          loadDashboardContent();
        } else {
          showDashboardError(container);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      App.state.isDashboardLoading = false;
    }
  }

  function waitForFunction(name, timeout = 5000) {
    return new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        if (typeof window[name] === 'function') {
          resolve(true);
        } else if (Date.now() - start > timeout) {
          resolve(false);
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  function showDashboardError(container) {
    container.innerHTML = `
      <div style="text-align:center;padding:3rem;color:#ef4444">
        <h2>Erro ao carregar</h2>
        <p>Não foi possível carregar o dashboard.</p>
        <button onclick="location.reload()" style="margin-top:1rem;padding:.75rem 1.5rem;background:#3b82f6;color:#fff;border:none;border-radius:.5rem;cursor:pointer">
          Recarregar
        </button>
      </div>
    `;
  }

  // ============================================
  // MOBILE
  // ============================================

  function setupMobileOptimizations() {
    // Touch device class
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      document.body?.classList.add('touch-device');
    }

    // Prevenir zoom duplo-toque
    let lastTouch = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouch <= 300) e.preventDefault();
      lastTouch = now;
    }, { passive: false });

    // Scroll optimization
    if (CSS.supports('overscroll-behavior', 'contain')) {
      document.body.style.overscrollBehavior = 'contain';
    }
  }

  // ============================================
  // EXPORTAR
  // ============================================

  window.appState = App.state;
  window.switchTab = switchTab;
  window.loadDashboard = loadDashboard;

  // ============================================
  // INICIAR
  // ============================================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('✅ app.js carregado');
})();
