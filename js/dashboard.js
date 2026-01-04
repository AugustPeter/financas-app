// js/dashboard.js - VERSÃO SIMPLIFICADA QUE FUNCIONA COM O NOVO APP.JS

console.log('📊 dashboard.js carregado');

// Função principal que será chamada pelo app.js
function loadDashboardContent() {
  console.log('🎯 Criando conteúdo do dashboard...');
  
  const dashboardContent = document.getElementById('dashboardContent');
  if (!dashboardContent) {
    console.error('❌ Elemento dashboardContent não encontrado!');
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
  }
  // 🔥 AQUI ESTÁ A PARTE IMPORTANTE 🔥
  // Aguardar um pouco para o canvas ser criado e então gerar o gráfico
  async function loadDataFromSupabase() {
  try {
    // 1. Buscar transações do Supabase
    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (transError) throw transError;
    
    // 2. Buscar investimentos do Supabase
    const { data: investments, error: invError } = await supabase
      .from('investments')
      .select('*');
    
    if (invError) throw invError;
    
    // 3. Limpar a tabela atual antes de carregar
    document.querySelectorAll('#transactionTable tbody tr').forEach(row => row.remove());
    document.querySelectorAll('#investmentTable tbody tr').forEach(row => row.remove());
    
    // 4. Adicionar transações do banco
    if (transactions && transactions.length > 0) {
      transactions.forEach(trans => {
        addRow(trans.type, trans.description, trans.amount);
      });
    } else {
      console.log('Nenhuma transação encontrada no banco.');
    }
    
    // 5. Adicionar investimentos do banco
    if (investments && investments.length > 0) {
      investments.forEach(inv => {
        addInvest(inv.name, inv.monthly_value, inv.total_value);
      });
    } else {
      console.log('Nenhum investimento encontrado no banco.');
    }
    
    // 6. Calcular totais
    calc();
    
    // 7. Gerar gráfico
    generateInitialChart();
    
    console.log('✅ Dados carregados do Supabase com sucesso!');
    console.log(`📊 ${transactions?.length || 0} transações carregadas`);
    console.log(`📈 ${investments?.length || 0} investimentos carregados`);
    
  } catch (error) {
    console.error('❌ Erro ao carregar dados do Supabase:', error);
    
    // Mostrar erro para o usuário
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      background: #ff4444; color: white; padding: 10px; 
      margin: 10px; border-radius: 5px; text-align: center;
    `;
    errorDiv.innerHTML = `Erro ao carregar dados: ${error.message}`;
    document.body.prepend(errorDiv);
    
    // Remover erro após 5 segundos
    setTimeout(() => errorDiv.remove(), 5000);
  }
}

// 🔥 NOVA FUNÇÃO PARA GERAR GRÁFICO INICIAL 🔥
function generateInitialChart() {
  console.log('📊 Gerando gráfico inicial...');
  
  // Verificar se Chart.js está disponível
  if (typeof Chart === 'undefined') {
    console.error('❌ Chart.js não carregado!');
    return;
  }
  
  // Verificar se canvas existe
  const canvas = document.getElementById('grafico');
  if (!canvas) {
    console.error('❌ Canvas #grafico não encontrado');
    return;
  }
  
  // Pegar os valores dos cards
  const totalRenda = parseFloat(document.getElementById('totalRenda').textContent.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
  const totalDespesa = parseFloat(document.getElementById('totalDespesa').textContent.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
  const totalInvest = parseFloat(document.getElementById('totalInvest').textContent.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
  const saldoValor = parseFloat(document.getElementById('saldo').textContent.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
  
  console.log('📈 Valores para gráfico:', { totalRenda, totalDespesa, totalInvest, saldoValor });
  
  // Usar SUA função updateChart se existir
  if (typeof updateChart === 'function') {
    console.log('🎯 Usando sua função updateChart()');
    updateChart(totalRenda, totalDespesa, totalInvest, saldoValor);
  } else {
    console.log('⚠️ Criando gráfico alternativo');
    createAlternativeChart(totalRenda, totalDespesa, totalInvest, saldoValor);
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

// HUD PERMANENTE SEM DUPLICAÇÃO - Adicionar no final do dashboard.js
let hudCreated = false; // Variável global para controlar

function createPermanentMonthHUD() {
    console.log('🎯 Tentando criar HUD permanente...');
    
    // Evitar duplicação - verificar se já existe
    if (hudCreated || document.getElementById('monthHUD')) {
        console.log('⏭️ HUD já existe, pulando...');
        return;
    }
    
    // Aguardar o DOM carregar completamente
    setTimeout(() => {
        // Verificar novamente (segurança dupla)
        if (document.getElementById('monthHUD')) {
            console.log('✅ HUD já existe (verificação dupla)');
            return;
        }
        
        // Procurar por um local bom para colocar o HUD
        const dashboardContent = document.getElementById('dashboardContent');
        
        if (!dashboardContent) {
            console.log('❌ dashboardContent não encontrado, tentando novamente em 500ms');
            setTimeout(createPermanentMonthHUD, 500);
            return;
        }
        
        console.log('✅ dashboardContent encontrado, criando HUD...');
        
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
                    <button id="hudLoadBtn" style="
                        padding: 6px 14px;
                        background: #3b82f6;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        font-size: 13px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        transition: all 0.2s;
                    ">
                        🔄 Carregar
                    </button>
                    
                    <button id="hudSaveBtn" style="
                        padding: 6px 14px;
                        background: #10b981;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        font-size: 13px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        transition: all 0.2s;
                    ">
                        💾 Salvar
                    </button>
                </div>
            </div>
        `;
        
        // Inserir o HUD
        if (summaryCards) {
            // Inserir APÓS os summary cards
            summaryCards.insertAdjacentHTML('afterend', hudHTML);
            console.log('✅ HUD inserido após summary cards');
        } else {
            // Inserir no início do dashboardContent
            dashboardContent.insertAdjacentHTML('afterbegin', hudHTML);
            console.log('✅ HUD inserido no início do dashboard');
        }
        
        // Marcar como criado
        hudCreated = true;
        console.log('✅ HUD permanente criado com sucesso');
        
        // Configurar funcionalidades
        setupHUDfunctionality();
        
    }, 1000); // Aguardar 1 segundo para garantir que tudo carregou
}

// Configurar funcionalidade do HUD (com proteção contra duplicação)
let hudSetupDone = false;

function setupHUDfunctionality() {
    // Evitar configuração duplicada
    if (hudSetupDone) {
        console.log('⏭️ HUD já configurado, pulando...');
        return;
    }
    
    const now = new Date();
    const monthSelect = document.getElementById('hudMonth');
    const yearSelect = document.getElementById('hudYear');
    
    if (!monthSelect || !yearSelect) {
        console.log('❌ Elementos do HUD não encontrados, tentando novamente...');
        setTimeout(setupHUDfunctionality, 500);
        return;
    }
    
    // Configurar valores atuais
    monthSelect.value = now.getMonth();
    yearSelect.value = now.getFullYear();
    
    console.log('🔧 Configurando botões do HUD...');
    
    // Botão CARREGAR
// MODIFIQUE ESTA PARTE DO SEU dashboard.js (na função setupHUDfunctionality)

const loadBtn = document.getElementById('hudLoadBtn');
if (loadBtn && !loadBtn.hasAttribute('data-hud-configured')) {
    loadBtn.setAttribute('data-hud-configured', 'true');
    loadBtn.onclick = async function() {
        console.log('🔄 Botão Carregar clicado');
        
        const monthIndex = document.getElementById('hudMonth').value;
        const year = document.getElementById('hudYear').value;
        const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 
                      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        
        const selectedMonth = `${months[monthIndex]}-${year}`;
        
        console.log(`📥 Carregando dados de ${selectedMonth}...`);
        
        // Animação
        const originalText = this.innerHTML;
        this.innerHTML = '⏳';
        this.disabled = true;
        
        try {
            // Primeiro tenta do localStorage (sempre disponível)
            const key = `financas_dashboard_${selectedMonth}`;
            const dataStr = localStorage.getItem(key);
            
            if (dataStr) {
                const data = JSON.parse(dataStr);
                applyDashboardData(data);
                this.innerHTML = '✅';
                this.style.background = '#059669';
                showToast(`Dados de ${selectedMonth} carregados!`, 'success');
            } else {
                // Tentar usar as funções disponíveis do supabase-data.js
                let result;
                
                // Opção 1: Função específica para mês
                if (typeof carregarMes === 'function') {
                    // Converter mês index (0-11) para número (1-12)
                    const mesNumero = parseInt(monthIndex) + 1;
                    result = await carregarMes(parseInt(year), mesNumero);
                }
                // Opção 2: Função principal
                else if (typeof loadDashboardFromSupabase === 'function') {
                    // Precisamos configurar o período no supabase-data.js primeiro
                    if (typeof window.supabaseData !== 'undefined' && window.supabaseData.setPeriodo) {
                        const mesNumero = parseInt(monthIndex) + 1;
                        window.supabaseData.setPeriodo(parseInt(year), mesNumero);
                    }
                    result = await loadDashboardFromSupabase();
                }
                // Opção 3: Função de carregar mês específico
                else if (typeof window.supabaseData !== 'undefined' && window.supabaseData.load) {
                    result = await window.supabaseData.load();
                }
                else {
                    throw new Error('Função de carregamento não disponível');
                }
                
                if (result && result.success) {
                    if (result.empty) {
                        // MÊS SEM DADOS - LIMPA A TELA
                        limparDashboard();
                        this.innerHTML = '📭';
                        this.style.background = '#f59e0b';
                        showToast(`📭 ${selectedMonth} - Mês sem dados (tela limpa)`, 'info');
                    } else {
                        this.innerHTML = '✅';
                        this.style.background = '#059669';
                        showToast(`Dados de ${selectedMonth} carregados!`, 'success');
                    }
                } else {
                    // SE NÃO TEVE SUCESSO, LIMPA A TELA
                    limparDashboard();
                    throw new Error(result ? result.error : 'Nenhum dado encontrado');
                }
            }
        } catch (error) {
            console.error('Erro ao carregar:', error);
            
            // SEMPRE LIMPA A TELA EM CASO DE ERRO OU SEM DADOS
            limparDashboard();
            
            this.innerHTML = '📭';
            this.style.background = '#f59e0b';
            
            // Mostra mensagem mais amigável
            if (error.message.includes('Nenhum dado') || error.message.includes('nenhum dado')) {
                showToast(`📭 ${selectedMonth} - Mês sem dados salvos`, 'info');
            } else {
                showToast(`Erro: ${error.message}`, 'warning');
            }
        }
        
        setTimeout(() => {
            this.innerHTML = originalText;
            this.style.background = '#3b82f6';
            this.disabled = false;
        }, 1500);
    };
}
    function limparDashboard() {
    console.log('🧹 LIMPANDO DASHBOARD...');
    
    // Limpar todas as tabelas
    ['renda', 'despesa', 'invest'].forEach(tipo => {
        const tbody = document.querySelector(`#${tipo} tbody`);
        if (tbody) {
            tbody.innerHTML = '';
        }
    });
    
    // Zerar totais
    document.getElementById('totalRenda').textContent = 'R$ 0,00';
    document.getElementById('totalDespesa').textContent = 'R$ 0,00';
    document.getElementById('totalInvest').textContent = 'R$ 0,00';
    document.getElementById('saldo').textContent = 'R$ 0,00';
    
    // Atualizar contagens
    updateCounts();
    
    // Adicionar uma linha vazia em cada tabela
    setTimeout(() => {
        addRow('renda', '', 0);
        addRow('despesa', '', 0);
        addInvest('', 0, 0);
        
        // Atualizar gráfico
        if (typeof updateChart === 'function') {
            updateChart(0, 0, 0, 0);
        }
        
        console.log('✅ Dashboard limpo');
    }, 100);
}

// Adicione também ao window
window.limparDashboard = limparDashboard;
    // Botão SALVAR
    const saveBtn = document.getElementById('hudSaveBtn');
    if (saveBtn && !saveBtn.hasAttribute('data-hud-configured')) {
        saveBtn.setAttribute('data-hud-configured', 'true');
        saveBtn.onclick = async function() {
            console.log('💾 Botão Salvar clicado');
            
            const monthIndex = document.getElementById('hudMonth').value;
            const year = document.getElementById('hudYear').value;
            const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 
                          'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
            
            const selectedMonth = `${months[monthIndex]}-${year}`;
            
            console.log(`💾 Salvando dados em ${selectedMonth}...`);
            
            // Animação
            const originalText = this.innerHTML;
            const originalBg = this.style.background;
            this.innerHTML = '💾';
            this.disabled = true;
            
            try {
                // 1. Salvar no localStorage (sempre funciona)
                const data = collectDashboardData();
                const key = `financas_dashboard_${selectedMonth}`;
                
                localStorage.setItem(key, JSON.stringify(data));
                console.log(`✅ Salvo localmente em: ${selectedMonth}`);
                
                // 2. Tentar salvar no Supabase também (se disponível)
                if (typeof saveDashboardToSupabase === 'function') {
                    try {
                        await saveDashboardToSupabase();
                        console.log('✅ Também salvo no Supabase');
                    } catch (supabaseError) {
                        console.log('⚠️ Supabase falhou, mas local está salvo');
                    }
                }
                
                // Feedback
                this.innerHTML = '✅';
                this.style.background = '#059669';
                showToast(`Dados salvos em ${selectedMonth}!`, 'success');
                
            } catch (error) {
                console.error('Erro ao salvar:', error);
                this.innerHTML = '❌';
                this.style.background = '#dc2626';
                showToast(`Erro ao salvar: ${error.message}`, 'error');
            }
            
            setTimeout(() => {
                this.innerHTML = originalText;
                this.style.background = originalBg;
                this.disabled = false;
            }, 1500);
        };
    }
    
    // Quando mudar mês/ano
    const monthEl = document.getElementById('hudMonth');
    const yearEl = document.getElementById('hudYear');
    
    if (monthEl && yearEl && !monthEl.hasAttribute('data-hud-configured')) {
        monthEl.setAttribute('data-hud-configured', 'true');
        yearEl.setAttribute('data-hud-configured', 'true');
        
        const updateDisplay = () => {
            const monthIndex = monthEl.value;
            const year = yearEl.value;
            const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            
            console.log(`📅 Período selecionado: ${months[monthIndex]}/${year}`);
            
            // Opcional: Atualizar título da página
            const pageTitle = document.querySelector('h1');
            if (pageTitle) {
                const baseTitle = pageTitle.textContent.replace(/ - .*/, '');
                pageTitle.textContent = `${baseTitle} - ${months[monthIndex]}/${year}`;
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
            }, 1000);
        };
    }
    
    // 3. Inicialização imediata se o DOM já estiver pronto
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        console.log('⚡ DOM já pronto, inicializando HUD agora...');
        setTimeout(() => {
            initMonthHUD();
        }, 500);
    }
    
    hudInitialized = true;
    console.log('✅ Sistema HUD inicializado com sucesso');
}

// Iniciar o sistema
initializeHUDSystem();

// Função auxiliar para remover HUDs duplicados manualmente
function cleanupDuplicateHUDs() {
    const hudElements = document.querySelectorAll('[id*="monthHUD"], [id*="hudMonth"], [id*="hudYear"]');
    console.log(`🔍 Encontrados ${hudElements.length} elementos relacionados ao HUD`);
    
    // Manter apenas o primeiro HUD
    const mainHUD = document.getElementById('monthHUD');
    if (mainHUD) {
        let removedCount = 0;
        
        // Remover outros elementos HUD
        document.querySelectorAll('div').forEach(div => {
            if (div !== mainHUD && 
                (div.id.includes('monthHUD') || 
                 div.querySelector('[id*="hudMonth"]') || 
                 div.querySelector('[id*="hudYear"]'))) {
                div.remove();
                removedCount++;
            }
        });
        
        if (removedCount > 0) {
            console.log(`🧹 Removidos ${removedCount} HUD(s) duplicado(s)`);
            showToast(`Removidos ${removedCount} HUD(s) duplicados`, 'info');
        }
    }
}

// Exportar funções úteis
window.createPermanentMonthHUD = createPermanentMonthHUD;
window.setupHUDfunctionality = setupHUDfunctionality;
window.cleanupDuplicateHUDs = cleanupDuplicateHUDs;
window.initMonthHUD = initMonthHUD;
// ============================================
// FUNÇÕES DO DASHBOARD (mantenha as suas)
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
  calc(); // 🔥 IMPORTANTE: Chamar calc() para atualizar saldo
  
  
}

// Remover linha
function removeRow(button) {
  const tr = button.closest('tr');
  if (tr) {
    tr.remove();
    calc();
  }
}

// Calcular totais
function calc() {
  console.log('🧮 Calculando totais...');
  
  // ========== 1. CALCULAR RENDAS ==========
  const rendaInputs = document.querySelectorAll('#renda input[type="number"]');
  let totalRenda = 0;
  rendaInputs.forEach(input => {
    totalRenda += parseFloat(input.value) || 0;
  });
  
  // ========== 2. CALCULAR DESPESAS ==========
  const despesaInputs = document.querySelectorAll('#despesa input[type="number"]');
  let totalDespesa = 0;
  despesaInputs.forEach(input => {
    totalDespesa += parseFloat(input.value) || 0;
  });
  
  // ========== 3. CALCULAR INVESTIMENTOS (CORRIGIDO) ==========
  const investRows = document.querySelectorAll('#invest tbody tr');
  let totalInvest = 0;
  
  investRows.forEach(row => {
    // Pegar o input de APORTE (segunda coluna - index 1)
    const aporteInput = row.querySelector('td:nth-child(2) input');
    if (aporteInput) {
      totalInvest += parseFloat(aporteInput.value) || 0;
    }
  });
  
  // ========== 4. CALCULAR SALDO (CORRIGIDO - SUBTRAI INVESTIMENTOS) ==========
  const saldoValor = totalRenda - totalDespesa - totalInvest;
  
  console.log('📊 Totais calculados:', {
    renda: totalRenda,
    despesa: totalDespesa,
    investimento: totalInvest,
    saldo: saldoValor
  });
  
  // ========== 5. ATUALIZAR DISPLAYS ==========
  document.getElementById('totalRenda').textContent = formatCurrency(totalRenda);
  document.getElementById('totalDespesa').textContent = formatCurrency(totalDespesa);
  document.getElementById('totalInvest').textContent = formatCurrency(totalInvest);
  
  const saldoEl = document.getElementById('saldo');
  if (saldoEl) {
    saldoEl.textContent = formatCurrency(saldoValor);
    saldoEl.className = saldoValor >= 0 ? 'positive' : 'negative';
  }
  
  // ========== 6. ATUALIZAR CONTAGENS ==========
  updateCounts();
  
  // ========== 7. SALVAR NO BANCO DE DADOS (se tiver) ==========
 async function saveToSupabase() {
  try {
    // Coletar todas as transações da tabela atual
    const rendas = getData('renda');  // Sua função que pega dados da tabela
    const despesas = getData('despesa');
    const investimentos = getData('invest');
    
    // Preparar dados para o Supabase
    const transactionsToSave = [];
    
    // Adicionar rendas
    rendas.forEach(item => {
      transactionsToSave.push({
        type: 'renda',
        description: item.descricao || item.description,
        amount: parseFloat(item.valor || item.amount),
        category: item.categoria || 'geral',
        created_at: new Date().toISOString()
      });
    });
    
    // Adicionar despesas
    despesas.forEach(item => {
      transactionsToSave.push({
        type: 'despesa',
        description: item.descricao || item.description,
        amount: parseFloat(item.valor || item.amount),
        category: item.categoria || 'geral',
        created_at: new Date().toISOString()
      });
    });
    
    // 2. Enviar para o Supabase
    if (transactionsToSave.length > 0) {
      const { data, error } = await supabase
        .from('transactions')
        .upsert(transactionsToSave, { onConflict: 'description,created_at' });
      
      if (error) {
        console.error('❌ Erro ao salvar no Supabase:', error);
      } else {
        console.log('✅ Dados salvos no Supabase:', data);
      }
    }
    
    // 3. Salvar investimentos separadamente
    const investmentsToSave = investimentos.map(item => ({
      name: item.nome || item.name,
      monthly_value: parseFloat(item.mensal || item.monthly_value),
      total_value: parseFloat(item.total || item.total_value),
      created_at: new Date().toISOString()
    }));
    
    if (investmentsToSave.length > 0) {
      const { data, error } = await supabase
        .from('investments')
        .upsert(investmentsToSave, { onConflict: 'name,created_at' });
      
      if (error) {
        console.error('❌ Erro ao salvar investimentos:', error);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral ao salvar:', error);
  }
}
  
  // ========== 8. ATUALIZAR GRÁFICO (CORRIGIDO) ==========
  if (typeof updateChart === 'function') {
    // Passar os 4 valores: renda, despesa, investimento, saldo
    updateChart(totalRenda, totalDespesa, totalInvest, saldoValor);
    console.log('📈 Gráfico atualizado com valores:', [totalRenda, totalDespesa, totalInvest, saldoValor]);
  } else if (window.dashboardChart) {
    // Atualizar gráfico alternativo
    window.dashboardChart.data.datasets[0].data = [totalRenda, totalDespesa, totalInvest, saldoValor];
    window.dashboardChart.data.datasets[0].backgroundColor[3] = saldoValor >= 0 
      ? 'rgba(34, 197, 94, 0.7)' 
      : 'rgba(239, 68, 68, 0.7)';
    window.dashboardChart.data.datasets[0].borderColor[3] = saldoValor >= 0 
      ? 'rgb(34, 197, 94)' 
      : 'rgb(239, 68, 68)';
    window.dashboardChart.update();
  }
}

// Atualizar contagens
function updateCounts() {
  const tables = ['renda', 'despesa', 'invest'];
  tables.forEach(tableId => {
    const count = document.querySelectorAll(`#${tableId} tbody tr`).length;
    const countEl = document.getElementById(`${tableId}Count`);
    if (countEl) {
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

// Exportar funções globais
window.addRow = addRow;
window.addInvest = addInvest;
window.removeRow = removeRow;
window.calc = calc;

// Função para formatar moeda (se não tiver)
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// Função para atualizar contagens
function updateCounts() {
  const tables = ['renda', 'despesa', 'invest'];
  
  tables.forEach(tableId => {
    const rows = document.querySelectorAll(`#${tableId} tbody tr`).length;
    const countElement = document.getElementById(`${tableId}Count`);
    if (countElement) {
      countElement.textContent = `${rows} ite${rows === 1 ? 'm' : 'ns'}`;
    }
  });
}

// Função para remover linha
function removeRow(button) {
  const tr = button.closest('tr');
  if (tr) {
    tr.remove();
    updateCounts();
    calc(); // 🔥 IMPORTANTE: Recalcular após remover
  }
}


// ============================================
// INTEGRAÇÃO COM SUPABASE
// ============================================


async function saveDashboardData() {
    console.log('💾 Salvando dados do dashboard...');
    
    if (typeof saveDashboardToSupabase === 'function') {
        const result = await saveDashboardToSupabase();
        
        if (result.success) {
            showToast('✅ Dados salvos com sucesso!', 'success');
        } else {
            showToast('⚠️ ' + (result.message || 'Erro ao salvar'), 'warning');
        }
        
        return result;
    } else {
        console.error('❌ Função saveDashboardToSupabase não encontrada');
        showToast('❌ Erro: Sistema de salvamento não carregado', 'error');
        return { success: false, error: 'Função não disponível' };
    }
}

// Atualizar a função calc() para usar a função correta
const originalCalc = window.calc;
window.calc = function() {
    // Executar cálculo original
    if (originalCalc) originalCalc();
    
    // Salvar automaticamente (com debounce)
    if (typeof saveDashboardToSupabase === 'function') {
        setTimeout(async () => {
            await saveDashboardToSupabase();
        }, 2000);
    }
};

// Adicionar botões de salvar/carregar no dashboard
function addDataManagementButtons() {
    const dashboardContent = document.getElementById('dashboardContent');
    if (!dashboardContent) return;
    
    // Verificar se já tem botões
    if (document.getElementById('dataManagementButtons')) return;
    
    const buttonsHtml = `
        <div id="dataManagementButtons" style="display: flex; gap: 10px; margin: 20px 0; justify-content: center;">
            <button onclick="loadFromCloud()" class="btn" style="background: #3b82f6;">
                🔄 Carregar Dados
            </button>
            <button onclick="saveDashboardData()" class="btn" style="background: #10b981;">
                💾 Salvar Dados
            </button>
            <button onclick="exportData()" class="btn" style="background: #8b5cf6;">
                📤 Exportar
            </button>
        </div>
    `;
    
    // Inserir depois dos summary cards
    const summaryCards = dashboardContent.querySelector('.summary-cards');
    if (summaryCards) {
        summaryCards.insertAdjacentHTML('afterend', buttonsHtml);
    }
}

// Função para exportar dados
async function exportData() {
    if (typeof collectDashboardData !== 'function') {
        showToast('❌ Função de exportação não disponível', 'error');
        return;
    }
    
    const data = collectDashboardData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financas-${getCurrentMonth()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('📤 Dados exportados com sucesso!', 'success');
}

// Helper para getCurrentMonth (se não existir no supabase-data.js)
function getCurrentMonth() {
    const date = new Date();
    const month = date.toLocaleString('pt-BR', { month: 'long' });
    const year = date.getFullYear();
    return `${month}-${year}`.toLowerCase();
}

// Adicionar botões quando dashboard carregar
setTimeout(addDataManagementButtons, 2000);

// Exportar funções
window.saveDashboardData = saveDashboardData;
window.loadDashboardData = loadFromCloud;
window.exportData = exportData;

async function testSupabase() {
    if (window.supabaseData && window.supabaseData.testConnection) {
        const result = await window.supabaseData.testConnection();
        
        if (result) {
            showToast('✅ Conexão com Supabase OK!', 'success');
        } else {
            showToast('❌ Problema com conexão Supabase', 'error');
        }
    } else {
        showToast('❌ Função de teste não disponível', 'error');
    }
};

// Função para salvar dados no Supabase



console.log('✅ dashboard.js pronto para uso');