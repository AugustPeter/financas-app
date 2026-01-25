// ============================================
// FUNÇÕES DE NAVEGAÇÃO ENTRE TABS
// ============================================

// Variáveis globais de estado
let currentTab = 'dashboard';
let mesAtual = new Date().toLocaleDateString('pt-BR', { month: 'long' });

// Expor globalmente
Object.defineProperty(window, 'currentTab', {
  get: () => currentTab,
  set: (v) => { currentTab = v; }
});
Object.defineProperty(window, 'mesAtual', {
  get: () => mesAtual,
  set: (v) => { mesAtual = v; }
});

// Mostrar uma tab específica
function showTab(tabName) {
  // Helper local para capitalizar (caso utils.js não tenha carregado)
  const capitalize = (str) => {
    if (typeof capitalizeFirst === 'function') return capitalizeFirst(str);
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };
  
  // Atualizar tab ativa
  document.querySelectorAll('.tab, .nav-item').forEach(el => {
    el.classList.remove('active');
  });
  
  // Ativar a tab correta
  document.getElementById(`tab${capitalize(tabName)}`)?.classList.add('active');
  document.getElementById(`nav${capitalize(tabName)}`)?.classList.add('active');
  
  // Esconder todos os conteúdos
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  // Mostrar conteúdo da tab selecionada
  const tabContent = document.getElementById(`${tabName}Content`);
  if (tabContent) {
    tabContent.classList.add('active');
  }
  
  // Atualizar título do app
  const titles = {
    dashboard: 'Finanças App',
    transactions: 'Transações',
    investments: 'Investimentos',
    reports: 'Relatórios'
  };
  const appTitle = document.getElementById('appTitle');
  if (appTitle) {
    appTitle.textContent = titles[tabName];
  }
  
  // Carregar conteúdo específico da tab
  loadTabContent(tabName);
  
  currentTab = tabName;
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

// Função para alternar tema claro/escuro
function toggleDark() {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  
  // Salvar preferência
  localStorage.setItem('darkMode', isDark ? 'true' : 'false');
  
  // Atualizar ícone do botão
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) {
    themeBtn.textContent = isDark ? '☀️' : '🌙';
  }
}

// Função para mudar o mês
function changeMonth(direction) {
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const mesSelect = document.getElementById('mes');
  if (!mesSelect) return;
  
  let currentIndex = meses.indexOf(mesSelect.value);
  if (currentIndex === -1) currentIndex = new Date().getMonth();
  
  if (direction !== 0) {
    // Navegação com setas
    currentIndex += direction;
    if (currentIndex < 0) currentIndex = 11;
    if (currentIndex > 11) currentIndex = 0;
    mesSelect.value = meses[currentIndex];
  }
  
  // Atualizar mesAtual global
  window.mesAtual = mesSelect.value;
  
  // Carregar dados do mês selecionado
  if (typeof window.carregarMesEspecifico === 'function') {
    window.carregarMesEspecifico(mesSelect.value);
  } else if (typeof window.loadDashboardContent === 'function') {
    window.loadDashboardContent();
  }
}

// Aplicar tema salvo ao carregar
function applyStoredTheme() {
  const isDark = localStorage.getItem('darkMode') === 'true';
  if (isDark) {
    document.body.classList.add('dark');
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) themeBtn.textContent = '☀️';
  }
}

// Exportar funções globalmente
window.showTab = showTab;
window.loadTabContent = loadTabContent;
window.toggleDark = toggleDark;
window.changeMonth = changeMonth;
window.applyStoredTheme = applyStoredTheme;