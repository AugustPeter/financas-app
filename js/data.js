// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
let mesAtual = 'Janeiro';
let currentTab = 'dashboard';

// ============================================
// FUNÇÕES DE GERENCIAMENTO DE DADOS
// ============================================

// Gerenciamento de dados
function getDB() {
  const db = localStorage.getItem('financeiro');
  return db ? JSON.parse(db) : {};
}

function saveDB(db) {
  localStorage.setItem('financeiro', JSON.stringify(db));
  localStorage.setItem('lastSave', new Date().toISOString());
}

// Formatar moeda
function formatCurrency(value) {
  return 'R$ ' + value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Helper para capitalizar primeira letra
function capitalizeFirst(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Obter dados da tabela
function getData(id) {
  const rows = document.querySelectorAll(`#${id} tbody tr`);
  return Array.from(rows).map(tr => {
    const inputs = tr.querySelectorAll('input');
    // Para renda, não incluir checkbox
    if (id === 'renda') {
      return Array.from(inputs).map(input => input.value);
    } else {
      // Para despesas, incluir checkbox
      return Array.from(inputs).map(input => {
        if (input.type === 'checkbox') return input.checked;
        return input.value;
      });
    }
  });
}

// Soma de valores em uma tabela
function sumTable(id, colIndex = 1) {
  const rows = document.querySelectorAll(`#${id} tbody tr`);
  return Array.from(rows).reduce((total, tr) => {
    const valueInput = tr.querySelectorAll('input')[1];
    return total + (valueInput ? (parseFloat(valueInput.value) || 0) : 0);
  }, 0);
}

// Carregar mês
function loadMonth() {
  // Limpar tabelas se existirem
  const tables = ['renda', 'despesa', 'invest'];
  tables.forEach(table => {
    const tbody = document.querySelector(`#${table} tbody`);
    if (tbody) tbody.innerHTML = '';
  });
  
  const data = getDB()[mesAtual];
  
  if (!data) {
    // Mês sem dados
    resetDisplays();
    return;
  }
  
  // Carregar dados existentes
  if (data.renda) {
    data.renda.forEach(r => {
      // Renda: apenas descrição e valor
      addRow('renda', r[0], r[1]);
    });
  }
  
  if (data.despesa) {
    data.despesa.forEach(d => {
      // Despesa: descrição, valor e pago
      addRow('despesa', d[0], d[1], d[2]);
    });
  }
  
  if (data.invest) {
    data.invest.forEach(i => addInvest(i[0], i[1], i[2]));
  }
  
  calc();
}

function resetDisplays() {
  const elements = ['totalRenda', 'totalDespesa', 'totalInvest', 'saldo'];
  elements.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = 'R$ 0,00';
  });
  
  const saldoEl = document.getElementById('saldo');
  if (saldoEl) saldoEl.className = 'positive';
  
  updateCounts();
}

// Atualizar contagens
function updateCounts() {
  const rendaCount = document.querySelectorAll('#renda tbody tr').length;
  const despesaCount = document.querySelectorAll('#despesa tbody tr').length;
  
  const rendaCountEl = document.getElementById('rendaCount');
  const despesaCountEl = document.getElementById('despesaCount');
  
  if (rendaCountEl) {
    rendaCountEl.textContent = `${rendaCount} ${rendaCount === 1 ? 'item' : 'itens'}`;
  }
  
  if (despesaCountEl) {
    despesaCountEl.textContent = `${despesaCount} ${despesaCount === 1 ? 'item' : 'itens'}`;
  }
}

// Alterar mês
function changeMonth(direction) {
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  
  const select = document.getElementById('mes');
  let currentIndex = months.indexOf(mesAtual);
  
  if (direction === -1) {
    currentIndex = (currentIndex - 1 + 12) % 12;
  } else if (direction === 1) {
    currentIndex = (currentIndex + 1) % 12;
  } else if (select) {
    currentIndex = months.indexOf(select.value);
  }
  
  mesAtual = months[currentIndex];
  if (select) select.value = mesAtual;
  localStorage.setItem('currentMonth', mesAtual);
  
  loadMonth();
  showToast(`Mês alterado para ${mesAtual}`, 'info');
}

// Tema escuro/claro
function toggleDark() {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('dark', isDark);
  
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.textContent = isDark ? '☀️' : '🌙';
  }
  showToast(`Tema ${isDark ? 'escuro' : 'claro'} ativado`, 'info');
}

// Toast Notification
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  
  toast.textContent = message;
  toast.className = 'toast';
  
  // Cor baseada no tipo
  if (type === 'success') {
    toast.style.borderLeft = '4px solid var(--green)';
  } else if (type === 'error') {
    toast.style.borderLeft = '4px solid var(--red)';
  } else {
    toast.style.borderLeft = '4px solid var(--primary)';
  }
  
  // Mostrar toast
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Esconder após 3 segundos
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Atualizar status online/offline
function updateOnlineStatus() {
  const indicator = document.getElementById('offlineIndicator');
  if (!navigator.onLine) {
    indicator.classList.add('show');
    showToast('Você está offline. Os dados serão salvos localmente.', 'info');
  } else {
    indicator.classList.remove('show');
  }
}

// Configurar PWA
function setupPWA() {
  // Botão de instalação
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    const installBtn = document.getElementById('installButton');
    if (installBtn) {
      installBtn.style.display = 'block';
      
      installBtn.addEventListener('click', async () => {
        e.prompt();
        const { outcome } = await e.userChoice;
        console.log(`Instalação: ${outcome}`);
        installBtn.style.display = 'none';
      });
    }
  });
  
  // Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.log('Service Worker falhou:', err);
    });
  }
}