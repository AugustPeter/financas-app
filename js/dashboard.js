// js/dashboard.js - VERSÃO CORRIGIDA COM SUPABASE-DATA.JS
let isSaving = false;
// Função principal que será chamada pelo app.js
function loadDashboardContent() {
  const dashboardContent = document.getElementById('dashboardContent');
  if (!dashboardContent) return;
  
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
        <h3>Rendas <span id="rendaCount" style="color: #94a3b8; font-size: 14px;">0 itens</span></h3>
        <div class="table-container">
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
        <h3>Despesas <span id="despesaCount" style="color: #94a3b8; font-size: 14px;">0 itens</span></h3>
        <div class="table-container">
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
        <h3>Investimentos <span id="investCount" style="color: #94a3b8; font-size: 14px;">0 itens</span></h3>
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
  
  // Inicializar tabelas com linhas vazias
  setTimeout(() => {
    addRow('renda', '', 0);
    addRow('despesa', '', 0);
    addInvest('', 0, 0);
    updateCounts();
    calc();
    // Carregamento delegado ao HUD
  }, 100);
}

// Gerar gráfico inicial
function generateInitialChart() {
  if (typeof Chart === 'undefined' || !document.getElementById('grafico')) return;
  
  // Extração otimizada de valores
  const parseCardValue = (id) => parseFloat(
    document.getElementById(id).textContent.replace(/[^\d,]/g, '').replace(',', '.')
  ) || 0;
  
  const valores = {
    renda: parseCardValue('totalRenda'),
    despesa: parseCardValue('totalDespesa'),
    invest: parseCardValue('totalInvest'),
    saldo: parseCardValue('saldo')
  };
  
  // Chamar função de atualização
  if (typeof updateChart === 'function') {
    updateChart(valores.renda, valores.despesa, valores.invest, valores.saldo);
  } else {
    createAlternativeChart(valores.renda, valores.despesa, valores.invest, valores.saldo);
  }
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
    
    // Botão CARREGAR
    const loadBtn = document.getElementById('hudLoadBtn');
    if (loadBtn && !loadBtn.hasAttribute('data-hud-configured')) {
        loadBtn.setAttribute('data-hud-configured', 'true');
        loadBtn.onclick = async function() {
            const monthIndex = document.getElementById('hudMonth').value;
            const year = document.getElementById('hudYear').value;
            const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 
                          'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        
        const selectedMonth = `${months[monthIndex]}-${year}`;
        const mesNumero = parseInt(monthIndex) + 1;
        
        console.log(`📥 Carregando dados de ${selectedMonth}...`);
        
        // Animação
        const originalText = this.innerHTML;
        const originalBg = this.style.background;
        this.innerHTML = '⏳';
        this.disabled = true;
        
        try {
            let result;
            
            if (typeof carregarMesEspecifico === 'function') {
                console.log('📥 Usando carregarMesEspecifico()');
                result = await carregarMesEspecifico(parseInt(year), mesNumero);
            }
            else if (typeof window.supabaseData !== 'undefined' && window.supabaseData.carregarMes) {
                console.log('📥 Usando window.supabaseData.carregarMes()');
                result = await window.supabaseData.carregarMes(parseInt(year), mesNumero);
            }
            else if (typeof window.supabaseData !== 'undefined' && window.supabaseData.load) {
                console.log('📥 Usando window.supabaseData.load()');
                window.supabaseData.setPeriodo(parseInt(year), mesNumero);
                result = await window.supabaseData.load();
            }
            else {
                throw new Error('Sistema de carregamento não disponível');
            }
            
            // 🔑 AGUARDAR 2 SEGUNDOS ANTES DE MOSTRAR TOAST (DOM precisa reconstruir)
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            if (result && result.success) {
                if (result.empty) {
                    limparDashboard();
                    this.innerHTML = '📭';
                    this.style.background = '#f59e0b';
                    showToast(`📭 ${selectedMonth} - Mês sem dados`, 'info');
                } else {
                    this.innerHTML = '✅';
                    this.style.background = '#059669';
                    showToast(`Dados de ${selectedMonth} carregados!`, 'success');
                }
            } else {
                limparDashboard();
                throw new Error(result ? result.error : 'Nenhum dado encontrado');
            }
        } catch (error) {
            console.error('Erro ao carregar:', error);
            limparDashboard();
            
            this.innerHTML = '📭';
            this.style.background = '#f59e0b';
            
            // 🔑 TAMBÉM AGUARDAR AQUI
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            if (error.message.includes('Nenhum dado') || error.message.includes('nenhum dado')) {
                showToast(`📭 ${selectedMonth} - Mês sem dados salvos`, 'info');
            } else {
                showToast(`Erro: ${error.message}`, 'warning');
            }
        }
        finally {
            setTimeout(() => {
                this.innerHTML = originalText;
                this.style.background = originalBg;
                this.disabled = false;
            }, 1500);
        }
    };
    }

    function limparDashboard() {
    console.log('🧹 LIMPANDO DASHBOARD...');
    
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
                addRow('despesa', '', 0);
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
            
            console.log('✅ Dashboard limpo');
        }, 100);
    } catch (error) {
        console.error('❌ Erro ao limpar dashboard:', error);
    }
}
    
    window.limparDashboard = limparDashboard;
  

    const saveBtn = document.getElementById('hudSaveBtn');
if (saveBtn && !saveBtn.hasAttribute('data-hud-configured')) {
    saveBtn.setAttribute('data-hud-configured', 'true');
    let lastSaveTime = 0; // CORRIGIDO: variável no escopo correto
    
    saveBtn.onclick = async function(e) {
        // 🛑 BLOQUEAR MÚLTIPLOS CLIQUES
        const now = Date.now();
        if (isSaving || (now - lastSaveTime) < 3500) {
            console.log('⚠️ Salvamento já em andamento, ignorando novo clique');
            if ((now - lastSaveTime) < 3500) {
                console.log(`⏳ Aguarde ${Math.ceil((lastSaveTime + 3500 - now) / 1000)}s`);
            }
            return;
        }
        
        e.preventDefault();
        e.stopPropagation();
        isSaving = true;
        lastSaveTime = now;
        
        console.log('💾 Botão Salvar clicado');
        
        const monthIndex = document.getElementById('hudMonth').value;
        const year = document.getElementById('hudYear').value;
        const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 
                      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        
        const selectedMonth = `${months[monthIndex]}-${year}`;
        const mesNumero = parseInt(monthIndex) + 1;
        
        console.log(`💾 Salvando dados em ${selectedMonth} (mês ${mesNumero}/${year})...`);
        
        // Animação
        const originalText = this.innerHTML;
        const originalBg = this.style.background;
        this.innerHTML = '⏳ Salvando...';
        this.style.background = '#f59e0b';
        this.disabled = true;
        
        try {
            let result;
            
            if (typeof salvarMesEspecifico === 'function') {
                console.log('💾 Usando salvarMesEspecifico()');
                result = await salvarMesEspecifico(parseInt(year), mesNumero);
            }
            else if (typeof window.supabaseData !== 'undefined' && window.supabaseData.salvarMes) {
                console.log('💾 Usando window.supabaseData.salvarMes()');
                result = await window.supabaseData.salvarMes(parseInt(year), mesNumero);
            }
            else if (typeof window.supabaseData !== 'undefined' && window.supabaseData.save) {
                console.log('💾 Usando window.supabaseData.save()');
                window.supabaseData.setPeriodo(parseInt(year), mesNumero);
                result = await window.supabaseData.save();
            }
            else {
                throw new Error('Sistema de salvamento não disponível');
            }
            
            if (result && result.success) {
                this.innerHTML = '✅ Salvo!';
                this.style.background = '#059669';
                showToast(`Dados salvos em ${selectedMonth}!`, 'success');
            } else {
                throw new Error(result ? result.error : 'Erro ao salvar');
            }
            
        } catch (error) {
            console.error('Erro ao salvar:', error);
            this.innerHTML = '❌ Erro!';
            this.style.background = '#dc2626';
            showToast(`Erro ao salvar: ${error.message}`, 'error');
        }
        finally {
            // 🔓 LIBERAR O BLOQUEIO APÓS 3.5 SEGUNDOS (TEMPO SUFICIENTE)
            setTimeout(() => {
                this.innerHTML = originalText;
                this.style.background = originalBg;
                this.disabled = false;
                isSaving = false;  // ← LIBERADO AQUI
                console.log('✅ Botão Salvar liberado para novo salvamento');
            }, 3500);  // ← AUMENTADO PARA 3.5 SEGUNDOS
        }
    };
}
    
    // Quando mudar mês/ano
    const monthEl = document.getElementById('hudMonth');
    const yearEl = document.getElementById('hudYear');
    
    if (monthEl && yearEl && !monthEl.hasAttribute('data-hud-configured')) {
        monthEl.setAttribute('data-hud-configured', 'true');
        yearEl.setAttribute('data-hud-configured', 'true');
        
        const updateDisplay = async () => {
            const monthIndex = parseInt(monthEl.value);
            const year = parseInt(yearEl.value);
            const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            
            console.log(`📅 Período selecionado: ${months[monthIndex]}/${year}`);
            
            // Opcional: Atualizar título da página
            const pageTitle = document.querySelector('h1');
            if (pageTitle) {
                const baseTitle = pageTitle.textContent.replace(/ - .*/, '');
                pageTitle.textContent = `${baseTitle} - ${months[monthIndex]}/${year}`;
            }
            
            // 🚀 CARREGAMENTO AUTOMÁTICO ao mudar período
            console.log('🔄 Carregando dados automaticamente...');
            if (window.carregarMes) {
                await window.carregarMes(year, monthIndex + 1);
            }
        };
        
        monthEl.onchange = updateDisplay;
        yearEl.onchange = updateDisplay;
        
        // Atualizar inicialmente
        updateDisplay();
    }
    
    // Marcar como configurado
    hudSetupDone = true;
    console.log('✅ HUD configurado com sucesso');
}

// Sistema de inicialização inteligente
function initMonthHUD() {
    console.log('🚀 Inicializando sistema HUD...');
    
    // Limpar HUDs duplicados se existirem
    const existingHUDs = document.querySelectorAll('#monthHUD');
    if (existingHUDs.length > 1) {
        console.log(`🧹 Removendo ${existingHUDs.length - 1} HUD(s) duplicado(s)`);
        for (let i = 1; i < existingHUDs.length; i++) {
            existingHUDs[i].remove();
        }
    }
    
    // Criar HUD se não existir
    if (!document.getElementById('monthHUD')) {
        createPermanentMonthHUD();
    } else {
        console.log('✅ HUD já existe, apenas configurando...');
        setupHUDfunctionality();
    }
}

// Gerenciador de inicialização único
let hudInitialized = false;
let isAutoLoadingData = false; // Flag para evitar múltiplos carregamentos

function initializeHUDSystem() {
    if (hudInitialized) {
        console.log('⏭️ Sistema HUD já inicializado');
        return;
    }
    
    console.log('🎯 Iniciando sistema HUD...');
    
    // 1. Quando o DOM carregar
    document.addEventListener('DOMContentLoaded', function() {
        console.log('📋 DOM carregado, agendando HUD...');
        
        // Aguardar um pouco para o dashboard carregar
        setTimeout(() => {
            initMonthHUD();
            
            // ❌ NÃO carregar automaticamente na inicialização
            console.log('ℹ️ Dashboard pronto - troque o mês/ano ou clique em Carregar');
        }, 1500);
    });
    
    // 2. Se o dashboard for recarregado dinamicamente
    if (typeof loadDashboardContent === 'function') {
        console.log('🔁 Monitorando recarregamentos do dashboard...');
        
        // Sobrescrever com proteção
        const originalLoadDashboard = loadDashboardContent;
        window.loadDashboardContent = function() {
            console.log('🔄 Dashboard recarregando, HUD será recriado...');
            
            // Resetar flags
            hudCreated = false;
            hudSetupDone = false;
            
            // Chamar função original
            originalLoadDashboard();
            
            // Recriar HUD após um delay
            setTimeout(() => {
                initMonthHUD();
                
                // NÃO carregar automaticamente aqui (já vai carregar no updateDisplay)
            }, 1000);
        };
    }
    
    // 3. Inicialização imediata se o DOM já estiver pronto
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        console.log('⚡ DOM já pronto, inicializando HUD agora...');
        setTimeout(() => {
            initMonthHUD();
            
            // ❌ NÃO carregar automaticamente na inicialização
            console.log('ℹ️ HUD pronto - troque o mês/ano ou clique em Carregar');
        }, 500);
    }
    
    hudInitialized = true;
    console.log('✅ Sistema HUD inicializado com sucesso');
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
  
  const tr = document.createElement('tr');
  
  if (tipo === 'renda') {
    tr.innerHTML = `
      <td><input class="table-input" value="${descricao}" oninput="calc()" placeholder="Descrição"></td>
      <td><input class="table-input" type="number" value="${valor}" oninput="calc()" placeholder="0.00" step="0.01"></td>
      <td><button class="btn-icon" onclick="removeRow(this)">✕</button></td>
    `;
  } else if (tipo === 'despesa') {
    tr.innerHTML = `
      <td><input class="table-input" value="${descricao}" oninput="calc()" placeholder="Descrição"></td>
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
  
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input class="table-input" value="${nome}" oninput="calc()" placeholder="Nome"></td>
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
  } else if (window.dashboardChart) {
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
      countEl.textContent = `${count} ite${count === 1 ? 'm' : 'ns'}`;
    }
  });
}

// Formatar moeda
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// ============================================
// INTEGRAÇÃO COM SUPABASE - SIMPLIFICADA
// ============================================

// Função para carregar dados do Supabase
async function loadFromCloud() {
    console.log('🔄 Carregando dados do Supabase...');
    
    showToast('⏳ Carregando dados...', 'info');
    
    try {
        let result;
        
        // Opção 1: Usar a função específica do supabase-data.js
        if (typeof window.supabaseData !== 'undefined' && window.supabaseData.load) {
            result = await window.supabaseData.load();
        }
        // Opção 2: Usar a função global
        else if (typeof loadDashboardFromSupabase === 'function') {
            result = await loadDashboardFromSupabase();
        }
        else {
            throw new Error('Sistema de carregamento não disponível');
        }
        
        if (result && result.success) {
            if (result.empty) {
                showToast('📭 Mês sem dados salvos', 'info');
            } else {
                showToast('✅ Dados carregados com sucesso!', 'success');
            }
            return result;
        } else {
            const errorMsg = result ? result.error : 'Erro desconhecido';
            showToast(`❌ Erro: ${errorMsg}`, 'error');
            return { success: false, error: errorMsg };
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar:', error);
        showToast(`❌ Erro: ${error.message}`, 'error');
        return { success: false, error: error.message };
    }
}

// Função para salvar dados no Supabase
async function saveToCloud() {
    console.log('💾 Salvando dados no Supabase...');
    
    showToast('⏳ Salvando dados...', 'info');
    
    try {
        let result;
        
        // Opção 1: Usar a função específica do supabase-data.js
        if (typeof window.supabaseData !== 'undefined' && window.supabaseData.save) {
            result = await window.supabaseData.save();
        }
        // Opção 2: Usar a função global
        else if (typeof saveDashboardToSupabase === 'function') {
            result = await saveDashboardToSupabase(true);
        }
        else {
            throw new Error('Sistema de salvamento não disponível');
        }
        
        if (result && result.success) {
            showToast('✅ Dados salvos com sucesso!', 'success');
            return result;
        } else {
            const errorMsg = result ? result.error : 'Erro desconhecido';
            showToast(`❌ Erro: ${errorMsg}`, 'error');
            return { success: false, error: errorMsg };
        }
        
    } catch (error) {
        console.error('❌ Erro ao salvar:', error);
        showToast(`❌ Erro: ${error.message}`, 'error');
        return { success: false, error: error.message };
    }
}

// Função para mostrar toast
function showToast(message, type = 'info', duration = 3000) {
    // Verificar se document.body e document.head existem
    if (!document.body || !document.head) {
        console.warn('⚠️ DOM não está pronto, showToast abortado:', message);
        return;
    }
    
    // Remover toasts antigos
    const oldToasts = document.querySelectorAll('.toast-message');
    oldToasts.forEach(toast => {
        if (toast.parentElement) toast.parentElement.remove();
    });
    
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    const icon = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
    `;
    
    toast.innerHTML = `
        <span style="font-size: 16px;">${icon[type] || icon.info}</span>
        <span>${message}</span>
    `;
    
    // Verificação extra antes de adicionar
    if (document.body) {
        document.body.appendChild(toast);
    } else {
        console.warn('⚠️ document.body desapareceu, não foi possível mostrar toast');
        return;
    }
    
    // Adicionar estilo de animação
    if (!document.querySelector('#toast-animation')) {
        const style = document.createElement('style');
        style.id = 'toast-animation';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        if (document.head) {
            document.head.appendChild(style);
        }
    }
    
    // Remover após duração
    setTimeout(() => {
        if (toast && toast.parentElement) {
            toast.remove();
        }
    }, duration);
}

// Adicionar botões de gerenciamento de dados


// Adicionar botões quando dashboard carregar


// ============================================
// EXPORTAR FUNÇÕES GLOBAIS
// ============================================

window.addRow = addRow;
window.addInvest = addInvest;
window.removeRow = removeRow;
window.calc = calc;
window.updateCounts = updateCounts;
window.formatCurrency = formatCurrency;
window.loadFromCloud = loadFromCloud;
window.saveToCloud = saveToCloud;
window.showToast = showToast;
window.loadDashboardContent = loadDashboardContent;
window.limparDashboard = function() {
    console.log('🧹 Limpando dashboard...');
    
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
    
    // Adicionar linhas vazias
    setTimeout(() => {
        addRow('renda', '', 0);
        addRow('despesa', '', 0);
        addInvest('', 0, 0);
        updateCounts();
        calc();
    }, 100);
};

console.log('✅ dashboard.js (corrigido e integrado) pronto!');