// js/dashboard.js - VERSÃO CORRIGIDA COM SUPABASE-DATA.JS
console.log('📊 dashboard.js carregando...');

// Flag para saber se já foi renderizado
let dashboardAlreadyRendered = false;

console.log('✅ dashboard.js carregado - loadDashboardContent disponível');

// Função principal que será chamada pelo app.js
function loadDashboardContent() {
  const dashboardContent = document.getElementById('dashboardContent');
  if (!dashboardContent) return;
  
  // Se já foi renderizado, não renderiza novamente (evita limpar dados)
  if (dashboardAlreadyRendered && dashboardContent.querySelector('#renda')) {
    console.log('✅ Dashboard já renderizado, pulando novo render');
    return;
  }
  
  // HTML do dashboard
  dashboardContent.innerHTML = `
    <!-- Cards de Resumo -->
    <div class="summary-cards">
      <div class="summary-card">
        <span>Renda</span>
        <h2 id="totalRenda">R$ 0,00</h2>
      </div>
      <div class="summary-card">
        <span>Despesas</span>
        <h2 id="totalDespesa">R$ 0,00</h2>
      </div>
      <div class="summary-card">
        <span>Saldo</span>
        <h2 id="saldo">R$ 0,00</h2>
      </div>
      <div class="summary-card">
        <span>Investimentos</span>
        <h2 id="totalInvest">R$ 0,00</h2>
      </div>
    </div>

    <!-- Rendas e Despesas -->
    <div class="main-grid">
      <div class="content-card">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0;">Rendas <span id="rendaCount" style="color: #64748b; font-size: 13px; font-weight: 400; margin-left: 8px;">(0 itens)</span></h3>
          <button class="btn-collapse" id="toggleRenda" onclick="toggleSection('renda')" title="Minimizar/Expandir">−</button>
        </div>
        <div class="table-container" id="rendaContainer">
          <table id="renda">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
        <button class="btn btn-add" onclick="addRow('renda')">+ Adicionar Renda</button>
      </div>
      
      <div class="content-card">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0;">Despesas <span id="despesaCount" style="color: #64748b; font-size: 13px; font-weight: 400; margin-left: 8px;">(0 itens)</span></h3>
          <button class="btn-collapse" id="toggleDespesa" onclick="toggleSection('despesa')" title="Minimizar/Expandir">−</button>
        </div>
        <div class="table-container" id="despesaContainer">
          <table id="despesa">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Pago</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
        <button class="btn btn-add" onclick="addRow('despesa')">+ Adicionar Despesa</button>
      </div>
    </div>

    <!-- Investimentos e Gráfico -->
    <div class="main-grid">
      <div class="content-card">
        <h3>Investimentos <span id="investCount" style="color: #64748b; font-size: 13px; font-weight: 400; margin-left: 8px;">(0 itens)</span></h3>
        <div class="table-container">
          <table id="invest">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Aporte</th>
                <th>Meta</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
        <button class="btn btn-add" onclick="addInvest()">+ Adicionar Investimento</button>
      </div>
      
      <div class="content-card">
        <h3>Resumo do Mês</h3>
        <div class="chart-container">
          <canvas id="grafico"></canvas>
        </div>
      </div>
    </div>
  `;
  
  // Marcar como renderizado
  dashboardAlreadyRendered = true;
  
  // Inicializar tabelas com linhas vazias
  setTimeout(() => {
    // Só adiciona linhas vazias se não houver dados ainda
    if (!document.querySelector('#renda tbody tr')) {
      addRow('renda', '', 0);
    }
    if (!document.querySelector('#despesa tbody tr')) {
      addRow('despesa', '', 0);
    }
    if (!document.querySelector('#invest tbody tr')) {
      addInvest('', 0, 0);
    }
    
    updateCounts();
    calc();
    // Carregamento delegado ao HUD
  }, 100);
}

// Gráfico alternativo caso sua função não exista
function createAlternativeChart(renda, despesa, investimento, saldo) {
  const canvas = document.getElementById('grafico');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Destruir gráfico anterior se existir
  if (window.dashboardChart) {
    window.dashboardChart.destroy();
  }
  
  window.dashboardChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Renda', 'Despesas', 'Investimentos', 'Saldo'],
      datasets: [{
        label: 'Valores (R$)',
        data: [renda, despesa, investimento, saldo],
        backgroundColor: [
          'rgba(34, 197, 94, 0.7)',    // Verde para renda
          'rgba(239, 68, 68, 0.7)',    // Vermelho para despesas
          'rgba(99, 102, 241, 0.7)',   // Azul para investimentos
          saldo >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)'  // Verde ou vermelho para saldo
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(239, 68, 68)',
          'rgb(99, 102, 241)',
          saldo >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
        ],
        borderWidth: 2,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `R$ ${context.raw.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
            }
          }
        }
      }
    }
  });
}

// HUD PERMANENTE SEM DUPLICAÇÃO
let hudCreated = false;

function createPermanentMonthHUD() {
  if (hudCreated || document.getElementById('monthHUD')) return;
    
  setTimeout(() => {
    if (document.getElementById('monthHUD')) return;
    
    const dashboardContent = document.getElementById('dashboardContent');
    if (!dashboardContent) {
      setTimeout(createPermanentMonthHUD, 500);
      return;
    }
        
        // LOCAL ESPECÍFICO: Após os summary-cards
        const summaryCards = dashboardContent.querySelector('.summary-cards');
        
        // Criar HUD HTML
        const hudHTML = `
            <div id="monthHUD" style="
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                margin: 20px auto;
                padding: 12px 20px;
                background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                border-radius: 12px;
                border: 1px solid #334155;
                max-width: 500px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                z-index: 100;
            ">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="color: #e2e8f0; font-weight: 500; font-size: 14px;">📅</span>
                    <span style="color: #cbd5e1; font-size: 14px;">Período:</span>
                </div>
                
                <div style="display: flex; gap: 8px;">
                    <select id="hudMonth" style="
                        padding: 6px 12px;
                        background: #0f172a;
                        color: white;
                        border: 1px solid #475569;
                        border-radius: 6px;
                        font-size: 14px;
                        cursor: pointer;
                        min-width: 100px;
                    ">
                        <option value="0">Janeiro</option>
                        <option value="1">Fevereiro</option>
                        <option value="2">Março</option>
                        <option value="3">Abril</option>
                        <option value="4">Maio</option>
                        <option value="5">Junho</option>
                        <option value="6">Julho</option>
                        <option value="7">Agosto</option>
                        <option value="8">Setembro</option>
                        <option value="9">Outubro</option>
                        <option value="10">Novembro</option>
                        <option value="11">Dezembro</option>
                    </select>
                    
                    <select id="hudYear" style="
                        padding: 6px 12px;
                        background: #0f172a;
                        color: white;
                        border: 1px solid #475569;
                        border-radius: 6px;
                        font-size: 14px;
                        cursor: pointer;
                        min-width: 90px;
                    ">
                        <option value="2023">2023</option>
                        <option value="2024">2024</option>
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                    </select>
                </div>
                
                <div style="display: flex; gap: 8px;">

                    
                    
                </div>
            </div>
        `;
        
        // Inserir o HUD
        if (summaryCards) {
            summaryCards.insertAdjacentHTML('afterend', hudHTML);
        } else {
            dashboardContent.insertAdjacentHTML('afterbegin', hudHTML);
        }
        
        hudCreated = true;
        setupHUDfunctionality();
    }, 1000);
}

// Configurar funcionalidade do HUD
let hudSetupDone = false;

// Função limparDashboard - definida fora para estar disponível globalmente
function limparDashboard() {
    try {
        // Limpar todas as tabelas
        ['renda', 'despesa', 'invest'].forEach(tipo => {
            const tbody = document.querySelector(`#${tipo} tbody`);
            if (tbody) {
                tbody.innerHTML = '';
            }
        });
        
        // Zerar totais - COM VERIFICAÇÃO
        const totalRendaEl = document.getElementById('totalRenda');
        const totalDespesaEl = document.getElementById('totalDespesa');
        const totalInvestEl = document.getElementById('totalInvest');
        const saldoEl = document.getElementById('saldo');
        
        if (totalRendaEl) totalRendaEl.textContent = 'R$ 0,00';
        if (totalDespesaEl) totalDespesaEl.textContent = 'R$ 0,00';
        if (totalInvestEl) totalInvestEl.textContent = 'R$ 0,00';
        if (saldoEl) saldoEl.textContent = 'R$ 0,00';
        
        // Atualizar contagens
        if (typeof updateCounts === 'function') {
            updateCounts();
        }
        
        // Adicionar uma linha vazia em cada tabela
        setTimeout(() => {
            if (typeof addRow === 'function') {
                addRow('renda', '', 0);
                addRow('despesa', '', 0, false);
            }
            if (typeof addInvest === 'function') {
                addInvest('', 0, 0);
            }
            
            // Atualizar gráfico
            if (typeof updateChart === 'function') {
                updateChart(0, 0, 0, 0);
            } else if (window.dashboardChart) {
                createAlternativeChart(0, 0, 0, 0);
            }
        }, 100);
    } catch (error) {
        console.error('❌ Erro ao limpar dashboard:', error);
    }
}

// Expor globalmente imediatamente
window.limparDashboard = limparDashboard;

function setupHUDfunctionality() {
    if (hudSetupDone) return;
    
    const monthSelect = document.getElementById('hudMonth');
    const yearSelect = document.getElementById('hudYear');
    
    if (!monthSelect || !yearSelect) {
        setTimeout(setupHUDfunctionality, 500);
        return;
    }
    
    // Configurar valores atuais
    const now = new Date();
    monthSelect.value = now.getMonth();
    yearSelect.value = now.getFullYear();
    
    // Quando mudar mês/ano
    const monthEl = document.getElementById('hudMonth');
    const yearEl = document.getElementById('hudYear');
    
    if (monthEl && yearEl && !monthEl.hasAttribute('data-hud-configured')) {
        monthEl.setAttribute('data-hud-configured', 'true');
        yearEl.setAttribute('data-hud-configured', 'true');
        
        // 🔒 Guardar último valor válido para poder reverter
        let lastValidMonth = monthEl.value;
        let lastValidYear = yearEl.value;
        let isUpdating = false; // Flag local para evitar chamadas simultâneas
        
        const updateDisplay = async () => {
            // 🛑 Bloquear completamente se já está carregando ou atualizando
            if (isUpdating || window.isLoadingFromServer || window.hudBloqueado) {
                console.log('⏭️ Carregamento bloqueado - revertendo seletores');
                // Reverter seletores para valor anterior
                monthEl.value = lastValidMonth;
                yearEl.value = lastValidYear;
                return;
            }
            
            // 🔒 Marcar que está atualizando
            isUpdating = true;
            
            // 🔒 Desabilitar selects durante carregamento
            monthEl.disabled = true;
            yearEl.disabled = true;
            
            const monthIndex = parseInt(monthEl.value);
            const year = parseInt(yearEl.value);
            const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            
            console.log(`📅 Período selecionado: ${months[monthIndex]}/${year}`);
            
            try {
                // 🚀 CARREGAMENTO ao mudar período
                console.log('🔄 Carregando dados automaticamente...');
                if (typeof carregarMesEspecifico === 'function') {
                    await carregarMesEspecifico(year, monthIndex + 1);
                }
                
                // ✅ Sucesso - atualizar últimos valores válidos
                lastValidMonth = monthEl.value;
                lastValidYear = yearEl.value;
                
            } catch (error) {
                console.error('❌ Erro ao carregar:', error);
                // Reverter em caso de erro
                monthEl.value = lastValidMonth;
                yearEl.value = lastValidYear;
            } finally {
                // 🔓 Reabilitar selects após 0.5s extra
                await new Promise(resolve => setTimeout(resolve, 500));
                monthEl.disabled = false;
                yearEl.disabled = false;
                isUpdating = false;
            }
        };
        
        monthEl.onchange = updateDisplay;
        yearEl.onchange = updateDisplay;
        
        // Atualizar inicialmente
        updateDisplay();
    }
    
    // Marcar como configurado
    hudSetupDone = true;
}

// Sistema de inicialização inteligente
function initMonthHUD() {
    console.log('🚀 Inicializando sistema HUD...');
    
    // Limpar HUDs duplicados se existirem
    const existingHUDs = document.querySelectorAll('#monthHUD');
    if (existingHUDs.length > 1) {
        for (let i = 1; i < existingHUDs.length; i++) {
            existingHUDs[i].remove();
        }
    }
    
    // Criar HUD se não existir
    if (!document.getElementById('monthHUD')) {
        createPermanentMonthHUD();
    } else {
        setupHUDfunctionality();
    }
}

// Gerenciador de inicialização único
let hudInitialized = false;

function initializeHUDSystem() {
    if (hudInitialized) {
        return;
    }
    
    // 1. Quando o DOM carregar
    document.addEventListener('DOMContentLoaded', function() {
        
        // Aguardar um pouco para o dashboard carregar
        setTimeout(() => {
            initMonthHUD();
        }, 1500);
    });
    
    // 2. Se o dashboard for recarregado dinamicamente
    if (typeof loadDashboardContent === 'function') {
        
        // Sobrescrever com proteção
        const originalLoadDashboard = loadDashboardContent;
        window.loadDashboardContent = function() {
            
            // Resetar flags
            hudCreated = false;
            hudSetupDone = false;
            
            // Chamar função original
            originalLoadDashboard();
            
            // Recriar HUD após um delay
            setTimeout(() => {
                initMonthHUD();
            }, 1000);
        };
    }
    
    // 3. Inicialização imediata se o DOM já estiver pronto
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(() => {
            initMonthHUD();
        }, 500);
    }
    
    hudInitialized = true;
}

// Iniciar o sistema
initializeHUDSystem();

// ============================================
// FUNÇÕES DO DASHBOARD
// ============================================

// Adicionar linha
function addRow(tipo, descricao = '', valor = 0, pago = false) {
  const tbody = document.querySelector(`#${tipo} tbody`);
  if (!tbody) return;
  
  // Escapar descricao para prevenir XSS
  const safeDescricao = typeof escapeHTML === 'function' ? escapeHTML(descricao) : String(descricao || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  const tr = document.createElement('tr');
  
  if (tipo === 'renda') {
    tr.innerHTML = `
      <td><input class="table-input" value="${safeDescricao}" oninput="calc()" placeholder="Descrição"></td>
      <td><input class="table-input" type="number" value="${valor}" oninput="calc()" placeholder="0.00" step="0.01"></td>
      <td><button class="btn-icon" onclick="removeRow(this)">✕</button></td>
    `;
  } else if (tipo === 'despesa') {
    tr.innerHTML = `
      <td><input class="table-input" value="${safeDescricao}" oninput="calc()" placeholder="Descrição"></td>
      <td><input class="table-input" type="number" value="${valor}" oninput="calc()" placeholder="0.00" step="0.01"></td>
      <td><input type="checkbox" class="check-pago" ${pago ? 'checked' : ''} onchange="calc()"></td>
      <td><button class="btn-icon" onclick="removeRow(this)">✕</button></td>
    `;
  }
  
  tbody.appendChild(tr);
  updateCounts();
  calc();
}

// Adicionar investimento
function addInvest(nome = '', aporte = 0, meta = 0) {
  const tbody = document.querySelector('#invest tbody');
  if (!tbody) return;
  
  // Escapar nome para prevenir XSS
  const safeNome = typeof escapeHTML === 'function' ? escapeHTML(nome) : String(nome || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input class="table-input" value="${safeNome}" oninput="calc()" placeholder="Nome"></td>
    <td><input class="table-input" type="number" value="${aporte}" oninput="calc()" placeholder="Aporte" step="0.01"></td>
    <td><input class="table-input" type="number" value="${meta}" oninput="calc()" placeholder="Meta" step="0.01"></td>
    <td><button class="btn-icon" onclick="removeRow(this)">✕</button></td>
  `;
  
  tbody.appendChild(tr);
  updateCounts();
  calc();
}

// Remover linha
function removeRow(button) {
  const tr = button.closest('tr');
  if (tr) {
    tr.remove();
    updateCounts();
    calc();
  }
}

// Cache de elementos DOM (otimização)
const calcElements = {};

// Calcular totais
function calc() {
  // Cache de elementos (lazy load)
  if (!calcElements.totalRenda) {
    calcElements.totalRenda = document.getElementById('totalRenda');
    calcElements.totalDespesa = document.getElementById('totalDespesa');
    calcElements.totalInvest = document.getElementById('totalInvest');
    calcElements.saldo = document.getElementById('saldo');
  }
  
  const { totalRenda: totalRendaEl, totalDespesa: totalDespesaEl, 
          totalInvest: totalInvestEl, saldo: saldoEl } = calcElements;
  
  if (!totalRendaEl || !totalDespesaEl || !totalInvestEl || !saldoEl) return;
  
  // Cálculos otimizados com reduce
  const totalRenda = Array.from(document.querySelectorAll('#renda input[type="number"]'))
    .reduce((sum, input) => sum + (parseFloat(input.value) || 0), 0);
  
  const totalDespesa = Array.from(document.querySelectorAll('#despesa input[type="number"]'))
    .reduce((sum, input) => sum + (parseFloat(input.value) || 0), 0);
  
  const totalInvest = Array.from(document.querySelectorAll('#invest tbody tr'))
    .reduce((sum, row) => {
      const aporteInput = row.querySelector('td:nth-child(2) input');
      return sum + (aporteInput ? (parseFloat(aporteInput.value) || 0) : 0);
    }, 0);
  
  const saldoValor = totalRenda - totalDespesa - totalInvest;
  
  // Atualizar displays
  totalRendaEl.textContent = formatCurrency(totalRenda);
  totalDespesaEl.textContent = formatCurrency(totalDespesa);
  totalInvestEl.textContent = formatCurrency(totalInvest);
  
  saldoEl.textContent = formatCurrency(saldoValor);
  saldoEl.className = saldoValor >= 0 ? 'positive' : 'negative';
  
  // ========== 6. ATUALIZAR CONTAGENS ==========
  updateCounts();
  
  // Atualizar gráfico
  if (typeof updateChart === 'function') {
    updateChart(totalRenda, totalDespesa, totalInvest, saldoValor);
  } else if (window.dashboardChart && window.dashboardChart.data && window.dashboardChart.data.datasets && window.dashboardChart.data.datasets[0]) {
    window.dashboardChart.data.datasets[0].data = [totalRenda, totalDespesa, totalInvest, saldoValor];
    window.dashboardChart.data.datasets[0].backgroundColor[3] = saldoValor >= 0 
      ? 'rgba(34, 197, 94, 0.7)' 
      : 'rgba(239, 68, 68, 0.7)';
    window.dashboardChart.data.datasets[0].borderColor[3] = saldoValor >= 0 
      ? 'rgb(34, 197, 94)' 
      : 'rgb(239, 68, 68)';
    window.dashboardChart.update();
  }
  
  // Auto-save (debounced)
  if (typeof dispararAutoSave === 'function') {
    clearTimeout(window.autoSaveTimeout);
    window.autoSaveTimeout = setTimeout(dispararAutoSave, 100);
  }
}

// Atualizar contagens (otimizado)
function updateCounts() {
  const tables = ['renda', 'despesa', 'invest'];
  tables.forEach(tableId => {
    const countEl = document.getElementById(`${tableId}Count`);
    if (countEl) {
      const count = document.querySelectorAll(`#${tableId} tbody tr`).length;
      countEl.textContent = count === 1 ? '(1 item)' : `(${count} itens)`;
    }
  });
}

// Formatar moeda - usa função global se disponível
function formatCurrency(value) {
  if (window.formatCurrency && window.formatCurrency !== formatCurrency) {
    return window.formatCurrency(value);
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
}

// ============================================
// EXPORTAR FUNÇÕES GLOBAIS
// ============================================

window.addRow = addRow;
window.addInvest = addInvest;
window.removeRow = removeRow;
window.calc = calc;
window.updateCounts = updateCounts;
window.formatCurrency = formatCurrency;
window.loadDashboardContent = loadDashboardContent;
window.limparDashboard = limparDashboard;
window.toggleSection = toggleSection;

// ================================================
// FUNÇÕES DE COLLAPSE/EXPAND PARA RENDAS E DESPESAS
// ================================================

// Objeto para rastrear estado das seções
const sectionStates = {
    renda: localStorage.getItem('renda-expanded') !== 'false',
    despesa: localStorage.getItem('despesa-expanded') !== 'false'
};

// Restaurar estado ao carregar
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (!sectionStates.renda) toggleSection('renda', false);
        if (!sectionStates.despesa) toggleSection('despesa', false);
    }, 500);
});

function toggleSection(type, save = true) {
    const container = document.getElementById(`${type}Container`);
    const button = document.getElementById(`toggle${type.charAt(0).toUpperCase() + type.slice(1)}`);
    const card = container?.parentElement;
    
    if (!container || !button || !card) return;
    
    const isHidden = container.style.display === 'none';
    
    if (isHidden) {
        // Expandir
        container.style.display = 'block';
        container.style.animation = 'slideDown 0.3s ease-out';
        card.style.minHeight = 'auto';
        button.textContent = '−';
        button.title = 'Minimizar';
        sectionStates[type] = true;
    } else {
        // Minimizar
        container.style.animation = 'slideUp 0.3s ease-out';
        setTimeout(() => {
            container.style.display = 'none';
            card.style.minHeight = '0';
        }, 300);
        button.textContent = '+';
        button.title = 'Expandir';
        sectionStates[type] = false;
    }
    
    // Salvar estado no localStorage
    if (save) {
        localStorage.setItem(`${type}-expanded`, sectionStates[type]);
    }
}

// Adicionar CSS para animações
const style = document.createElement('style');
style.textContent = `
    .btn-collapse {
        background: none;
        border: none;
        font-size: 24px;
        color: #64748b;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s ease;
        flex-shrink: 0;
    }
    
    .btn-collapse:hover {
        background-color: rgba(100, 116, 139, 0.1);
        color: #0f172a;
        transform: scale(1.1);
    }
    
    #rendaContainer,
    #despesaContainer {
        transition: max-height 0.3s ease, opacity 0.3s ease, visibility 0.3s ease;
        overflow: hidden;
    }
    
    .content-card {
        transition: all 0.3s ease;
    }
    
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes slideUp {
        from {
            opacity: 1;
            transform: translateY(0);
        }
        to {
            opacity: 0;
            transform: translateY(-10px);
        }
    }
`;
document.head.appendChild(style);

console.log('✅ dashboard.js (corrigido e integrado) pronto!');