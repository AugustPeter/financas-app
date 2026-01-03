// ============================================
// FUNÇÕES DE NAVEGAÇÃO ENTRE TABS
// ============================================

// Mostrar uma tab específica
function showTab(tabName) {
  // Atualizar tab ativa
  document.querySelectorAll('.tab, .nav-item').forEach(el => {
    el.classList.remove('active');
  });
  
  // Ativar a tab correta
  document.getElementById(`tab${capitalizeFirst(tabName)}`)?.classList.add('active');
  document.getElementById(`nav${capitalizeFirst(tabName)}`)?.classList.add('active');
  
  // Esconder todos os conteúdos
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  // Mostrar conteúdo da tab selecionada
  document.getElementById(`${tabName}Content`).classList.add('active');
  
  // Atualizar título do app
  const titles = {
    dashboard: 'Finanças App',
    transactions: 'Transações',
    investments: 'Investimentos',
    reports: 'Relatórios'
  };
  document.getElementById('appTitle').textContent = titles[tabName];
  
  // Atualizar filtros no header baseado na tab
  updateHeaderFilters(tabName);
  
  // Carregar conteúdo específico da tab
  loadTabContent(tabName);
  
  currentTab = tabName;
}

// Atualizar filtros no header
function updateHeaderFilters(tab) {
  const filtersContainer = document.getElementById('headerFilters');
  if (!filtersContainer) return;
  
  if (tab === 'dashboard') {
    filtersContainer.innerHTML = `
      <div class="month-selector">
        <button onclick="changeMonth(-1)" title="Mês anterior">←</button>
        <select id="mes" onchange="changeMonth(0)">
          <option>Janeiro</option><option>Fevereiro</option><option>Março</option>
          <option>Abril</option><option>Maio</option><option>Junho</option>
          <option>Julho</option><option>Agosto</option><option>Setembro</option>
          <option>Outubro</option><option>Novembro</option><option>Dezembro</option>
        </select>
        <button onclick="changeMonth(1)" title="Próximo mês">→</button>
      </div>
      <button class="btn" onclick="toggleDark()" id="themeToggle">🌙</button>
    `;
    
    // Definir o mês atual no select
    const mesSelect = document.getElementById('mes');
    if (mesSelect) mesSelect.value = mesAtual;
  } else {
    filtersContainer.innerHTML = `
      <button class="btn" onclick="toggleDark()" id="themeToggle">🌙</button>
    `;
  }
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

// Configurar event listeners para tabs
function setupTabListeners() {
  // Tabs desktop
  const tabIds = ['Dashboard', 'Transactions', 'Investments', 'Reports'];
  tabIds.forEach(tabId => {
    const tab = document.getElementById(`tab${tabId}`);
    if (tab) {
      tab.addEventListener('click', () => showTab(tabId.toLowerCase()));
    }
  });
  
  // Tabs mobile
  const navIds = ['Dashboard', 'Transactions', 'Investments', 'Reports'];
  navIds.forEach(navId => {
    const nav = document.getElementById(`nav${navId}`);
    if (nav) {
      nav.addEventListener('click', () => showTab(navId.toLowerCase()));
    }
  });
}