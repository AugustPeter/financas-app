// js/supabase-data.js - VERSÃO FINAL CORRIGIDA
console.log('🗄️ supabase-data.js (Com limpeza para meses sem dados - CORRIGIDO)');

// ============================================
// CONFIGURAÇÃO
// ============================================

// VARIÁVEIS DE ANO/MÊS GLOBAIS
let anoSelecionado = new Date().getFullYear();
let mesSelecionado = new Date().getMonth() + 1; // 1-12
let modoPeriodoAtivo = false;

// Obter cliente Supabase (deve estar em window.supabase)
function getSupabase() {
    if (!window.supabase) {
        console.error('❌ ERRO: window.supabase não definido!');
        console.error('Verifique se configurou no HTML:');
        console.error('window.supabase = supabase.createClient(URL, KEY)');
        throw new Error('Supabase não configurado');
    }
    return window.supabase;
}

// ============================================
// FUNÇÕES AUXILIARES DE ANO/MÊS
// ============================================

/**
 * Obter período formatado para o banco
 */
function getPeriodoParaBanco() {
    if (modoPeriodoAtivo) {
        const meses = [
            'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
            'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
        ];
        const mesNome = meses[mesSelecionado - 1];
        return `${mesNome}-${anoSelecionado}`.toLowerCase();
    }
    
    const hoje = new Date();
    const month = hoje.toLocaleString('pt-BR', { month: 'long' });
    const year = hoje.getFullYear();
    return `${month}-${year}`.toLowerCase();
}

/**
 * Obter período formatado para exibição
 */
function getPeriodoFormatado() {
    const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${meses[mesSelecionado - 1]} de ${anoSelecionado}`;
}

// ============================================
// FUNÇÕES PRINCIPAIS (COM LIMPEZA) - CORRIGIDAS
// ============================================

/**
 * SALVAR dados no Supabase
 */
async function saveDashboardToSupabase() {
    console.log('💾 Salvando NO SUPABASE...');
    
    const supabase = getSupabase();
    
    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
            console.error('❌ Erro de sessão:', sessionError);
            throw new Error('Falha na autenticação');
        }
        
        if (!session) {
            throw new Error('Usuário não está logado');
        }
        
        const userId = session.user.id;
        const periodoBanco = getPeriodoParaBanco();
        const dashboardData = collectDashboardData();
        
        // Adicionar informações de período aos dados
        dashboardData.periodo_info = {
            ano: anoSelecionado,
            mes: mesSelecionado,
            periodo_formatado: getPeriodoFormatado(),
            periodo_banco: periodoBanco,
            salvo_em: new Date().toISOString()
        };
        
        console.log(`📤 Usuário: ${userId.substring(0, 8)}... | Período: ${periodoBanco}`);
        
        // Salvar apenas com campos essenciais
        const dadosParaSalvar = {
            user_id: userId,
            month: periodoBanco,
            data: dashboardData,
            updated_at: new Date().toISOString()
        };
        
        const { data, error } = await supabase
            .from('finance_data')
            .upsert(dadosParaSalvar)
            .select();
        
        if (error) {
            console.error('❌ Erro do Supabase:', error);
            throw new Error(`Falha ao salvar: ${error.message}`);
        }
        
        console.log('✅ SALVO no Supabase com sucesso!', data[0].id);
        
        const mensagem = modoPeriodoAtivo 
            ? `✅ Dados salvos para ${getPeriodoFormatado()}!`
            : '✅ Dados salvos na nuvem!';
        
        showSuccess(mensagem);
        
        return { 
            success: true, 
            message: mensagem,
            periodo: periodoBanco,
            data: data[0]
        };
        
    } catch (error) {
        console.error('❌ Falha TOTAL ao salvar:', error.message);
        showError(`Falha ao salvar: ${error.message}. Verifique sua conexão.`);
        
        return { 
            success: false, 
            error: error.message 
        };
    }
}

/**
 * CARREGAR dados do Supabase - CORRIGIDO: NÃO LANÇA ERRO QUANDO NÃO TEM DADOS
 */
async function loadDashboardFromSupabase() {
    console.log('📥 Carregando DO SUPABASE...');
    
    const supabase = getSupabase();
    
    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
            console.error('❌ Erro de sessão:', sessionError);
            throw new Error('Falha na autenticação');
        }
        
        if (!session) {
            throw new Error('Faça login para carregar dados');
        }
        
        const userId = session.user.id;
        const periodoBanco = getPeriodoParaBanco();
        
        console.log(`📋 Buscando: ${userId.substring(0, 8)}... | ${periodoBanco}`);
        
        // Buscar do Supabase
        const { data, error } = await supabase
            .from('finance_data')
            .select('*')
            .eq('user_id', userId)
            .eq('month', periodoBanco)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        
        if (error) {
            console.error('❌ Erro na busca:', error);
            throw new Error(`Falha ao buscar: ${error.message}`);
        }
        
        if (!data) {
            console.log('📭 Nenhum dado encontrado para este período - LIMPANDO INTERFACE');
            
            // IMPORTANTE: Limpar toda a interface quando não há dados
            limparInterfaceDashboard();
            
            const mensagem = `📭 ${getPeriodoFormatado()} - Mês sem dados salvos`;
            showInfo(mensagem);
            
            return { 
                success: true, 
                message: mensagem,
                empty: true,
                cleaned: true
            };
        }
        
        console.log('✅ Dados carregados do Supabase!');
        
        // Verificar se os dados são do período correto
        if (data.data && data.data.periodo_info) {
            const periodoSalvo = data.data.periodo_info.periodo_banco;
            if (periodoSalvo !== periodoBanco) {
                console.log('⚠️ Dados de período diferente encontrados - limpando');
                limparInterfaceDashboard();
                showInfo(`⚠️ Dados de período diferente encontrados - ${getPeriodoFormatado()} está vazio`);
                return { 
                    success: true, 
                    message: `📭 ${getPeriodoFormatado()} está vazio`,
                    empty: true,
                    cleaned: true
                };
            }
        }
        
        // Aplicar dados na interface
        applyDashboardData(data.data);
        
        const mensagem = `✅ Dados de ${getPeriodoFormatado()} carregados!`;
        showSuccess(mensagem);
        
        return { 
            success: true, 
            message: mensagem,
            data: data.data
        };
        
    } catch (error) {
        console.error('❌ Falha TOTAL ao carregar:', error.message);
        showError(`Falha ao carregar: ${error.message}. Verifique sua conexão.`);
        
        return { 
            success: false, 
            error: error.message,
            requiresLogin: error.message.includes('login')
        };
    }
}

/**
 * Função para carregar mês específico (para integração com dashboard.js)
 * CORRIGIDA: Retorna sucesso mesmo quando não há dados
 */
async function carregarMesEspecifico(ano, mes) {
    console.log(`📅 Carregando mês específico: ${mes}/${ano}`);
    
    // Atualizar variáveis globais
    anoSelecionado = ano;
    mesSelecionado = mes;
    modoPeriodoAtivo = true;
    
    // Atualizar HUD se existir
    atualizarHUDAnoMes();
    
    // Carregar dados - usa a função principal
    return await loadDashboardFromSupabase();
}

/**
 * Função para salvar mês específico (para integração com dashboard.js)
 */
async function salvarMesEspecifico(ano, mes) {
    console.log(`📅 Salvando mês específico: ${mes}/${ano}`);
    
    // Atualizar variáveis globais
    anoSelecionado = ano;
    mesSelecionado = mes;
    modoPeriodoAtivo = true;
    
    // Atualizar HUD se existir
    atualizarHUDAnoMes();
    
    // Salvar dados
    return await saveDashboardToSupabase();
}

/**
 * LIMPAR completamente a interface do dashboard
 */
function limparInterfaceDashboard() {
    console.log('🧹 LIMPANDO TODA A INTERFACE DO DASHBOARD...');
    
    // Bloquear calc() temporariamente
    let isCleaning = true;
    const originalCalc = window.calc;
    
    if (typeof originalCalc === 'function') {
        window.calc = function() {
            if (!isCleaning) {
                return originalCalc();
            }
            console.log('⏸️ calc() bloqueado durante limpeza');
        };
    }
    
    // 1. Limpar todas as tabelas
    const tabelasParaLimpar = [
        '#renda tbody',
        '#rendaTable tbody', 
        '#despesa tbody',
        '#despesaTable tbody',
        '#invest tbody',
        '#investmentTable tbody'
    ];
    
    tabelasParaLimpar.forEach(seletor => {
        const tabela = document.querySelector(seletor);
        if (tabela) {
            tabela.innerHTML = '';
            console.log(`✅ Limpa: ${seletor}`);
        }
    });
    
    // 2. Limpar totais
    const totaisParaZerar = ['totalRenda', 'totalDespesa', 'saldo'];
    totaisParaZerar.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.textContent = 'R$ 0,00';
            console.log(`✅ Zerado: ${id}`);
        }
    });
    
    // 3. Adicionar linhas vazias para edição
    setTimeout(() => {
        isCleaning = false;
        
        // Restaurar calc()
        if (typeof originalCalc === 'function') {
            window.calc = originalCalc;
            
            // Adicionar uma linha vazia em cada tabela (se a função existir)
            if (typeof window.addRow === 'function') {
                try {
                    // Adicionar linha vazia de renda
                    window.addRow('renda', '', 0);
                    
                    // Adicionar linha vazia de despesa  
                    window.addRow('despesa', '', 0);
                } catch (e) {
                    console.log('ℹ️ Função addRow não disponível ou erro:', e.message);
                }
            }
            
            // Adicionar linha vazia de investimento
            const investTableBody = document.querySelector('#investmentTable tbody') || 
                                   document.querySelector('#invest tbody');
            
            if (investTableBody && investTableBody.innerHTML === '') {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><input class="table-input" placeholder="Nome do investimento"></td>
                    <td><input class="table-input" type="number" placeholder="Aporte" step="0.01"></td>
                    <td><input class="table-input" type="number" placeholder="Meta" step="0.01"></td>
                    <td><button class="btn-icon" onclick="removeRow(this)">✕</button></td>
                `;
                investTableBody.appendChild(row);
                
                // Adicionar eventos oninput
                row.querySelectorAll('.table-input').forEach(input => {
                    input.setAttribute('oninput', 'calc()');
                });
            }
            
            // Executar calc() para atualizar tudo
            console.log('🧮 Executando calc() após limpeza...');
            originalCalc();
        }
        
        console.log('✅ Interface completamente limpa e pronta para novo mês!');
    }, 100);
}

// ============================================
// FUNÇÕES PARA COLETAR E APLICAR DADOS
// ============================================

/**
 * Coletar dados da interface
 */
function collectDashboardData() {
    console.log('📋 COLETANDO DADOS...');
    
    const data = {
        rendas: [],
        despesas: [],
        investimentos: [],
        totais: {},
        ultima_atualizacao: new Date().toISOString()
    };
    
    // 1. RENDAS
    const rendaTable = document.getElementById('renda');
    if (rendaTable?.querySelector('tbody')) {
        rendaTable.querySelectorAll('tbody tr').forEach(row => {
            const inputs = row.querySelectorAll('input');
            if (inputs.length >= 2) {
                const descricao = (inputs[0].value || '').trim();
                const valor = parseFloat(inputs[1].value) || 0;
                
                // Só adiciona se tiver conteúdo
                if (descricao || valor > 0) {
                    data.rendas.push({ descricao, valor });
                }
            }
        });
        console.log(`📈 ${data.rendas.length} rendas coletadas`);
    }
    
    // 2. DESPESAS
    const despesaTable = document.getElementById('despesa');
    if (despesaTable?.querySelector('tbody')) {
        despesaTable.querySelectorAll('tbody tr').forEach(row => {
            const inputs = row.querySelectorAll('input');
            if (inputs.length >= 2) {
                const descricao = (inputs[0].value || '').trim();
                const valor = parseFloat(inputs[1].value) || 0;
                
                if (descricao || valor > 0) {
                    data.despesas.push({ descricao, valor });
                }
            }
        });
        console.log(`📉 ${data.despesas.length} despesas coletadas`);
    }
    
    // 3. INVESTIMENTOS
    const investTable = document.getElementById('invest');
    if (investTable) {
        const tbody = investTable.querySelector('tbody');
        if (tbody) {
            tbody.querySelectorAll('tr').forEach(row => {
                const inputs = row.querySelectorAll('input');
                if (inputs.length >= 3) {
                    const nome = (inputs[0].value || '').trim();
                    const aporte = parseFloat(inputs[1].value) || 0;
                    const meta = parseFloat(inputs[2].value) || 0;
                    
                    if (nome || aporte > 0 || meta > 0) {
                        data.investimentos.push({ nome, aporte, meta });
                    }
                }
            });
            console.log(`🎯 ${data.investimentos.length} investimentos coletados`);
        }
    }
    
    // 4. TOTAIS
    const getElementValue = (id) => {
        const el = document.getElementById(id);
        if (!el) return 0;
        const text = el.textContent || '';
        return parseFloat(text.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
    };
    
    data.totais = {
        renda: getElementValue('totalRenda'),
        despesa: getElementValue('totalDespesa'),
        saldo: getElementValue('saldo')
    };
    
    console.log('📦 RESUMO:', {
        rendas: data.rendas.length,
        despesas: data.despesas.length,
        investimentos: data.investimentos.length
    });
    
    return data;
}

/**
 * Aplicar dados na interface
 */
function applyDashboardData(data) {
    console.log('🔄 Aplicando dados na interface...');
    
    if (!data) {
        console.log('ℹ️ Nenhum dado para aplicar');
        return;
    }
    
    // Limpar primeiro
    limparInterfaceDashboard();
    
    // Esperar um pouco para garantir que a limpeza terminou
    setTimeout(() => {
        // VARIÁVEL DE CONTROLE
        let isApplyingData = true;
        const originalCalc = window.calc;
        
        if (typeof originalCalc === 'function') {
            window.calc = function() {
                if (!isApplyingData) {
                    return originalCalc();
                }
                console.log('⏸️ calc() bloqueado durante aplicação');
            };
        }
        
        // Aplicar rendas
        if (data.rendas && Array.isArray(data.rendas) && data.rendas.length > 0) {
            console.log(`📈 Aplicando ${data.rendas.length} rendas`);
            
            if (typeof window.addRow === 'function') {
                data.rendas.forEach(item => {
                    window.addRow('renda', item.descricao, item.valor);
                });
            }
        } else {
            // Adicionar linha vazia se não houver rendas
            if (typeof window.addRow === 'function') {
                window.addRow('renda', '', 0);
            }
        }
        
        // Aplicar despesas  
        if (data.despesas && Array.isArray(data.despesas) && data.despesas.length > 0) {
            console.log(`📉 Aplicando ${data.despesas.length} despesas`);
            
            if (typeof window.addRow === 'function') {
                data.despesas.forEach(item => {
                    window.addRow('despesa', item.descricao, item.valor);
                });
            }
        } else {
            // Adicionar linha vazia se não houver despesas
            if (typeof window.addRow === 'function') {
                window.addRow('despesa', '', 0);
            }
        }
        
        // Aplicar investimentos
        const investTableBody = document.querySelector('#investmentTable tbody') || 
                               document.querySelector('#invest tbody');
        
        if (investTableBody) {
            if (data.investimentos && Array.isArray(data.investimentos) && data.investimentos.length > 0) {
                console.log(`💰 Aplicando ${data.investimentos.length} investimentos`);
                
                data.investimentos.forEach(item => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><input class="table-input" value="${item.nome || ''}" placeholder="Nome"></td>
                        <td><input class="table-input" type="number" value="${item.aporte || 0}" placeholder="Aporte" step="0.01"></td>
                        <td><input class="table-input" type="number" value="${item.meta || 0}" placeholder="Meta" step="0.01"></td>
                        <td><button class="btn-icon" onclick="removeRow(this)">✕</button></td>
                    `;
                    investTableBody.appendChild(row);
                });
            } else {
                // Adicionar linha vazia se não houver investimentos
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><input class="table-input" placeholder="Nome do investimento"></td>
                    <td><input class="table-input" type="number" placeholder="Aporte" step="0.01"></td>
                    <td><input class="table-input" type="number" placeholder="Meta" step="0.01"></td>
                    <td><button class="btn-icon" onclick="removeRow(this)">✕</button></td>
                `;
                investTableBody.appendChild(row);
            }
        }
        
        // Finalizar
        setTimeout(() => {
            isApplyingData = false;
            
            if (typeof originalCalc === 'function') {
                window.calc = originalCalc;
                
                // Adicionar eventos
                document.querySelectorAll('.table-input').forEach(input => {
                    if (!input.hasAttribute('data-events-added')) {
                        input.setAttribute('oninput', 'calc()');
                        input.setAttribute('data-events-added', 'true');
                    }
                });
                
                // Executar cálculo
                console.log('🧮 Executando cálculo FINAL...');
                originalCalc();
            }
            
            console.log('✅ Dados aplicados com sucesso!');
        }, 200);
    }, 300);
}

// ============================================
// HUD DE CONTROLE DE ANO/MÊS
// ============================================

/**
 * Criar HUD para selecionar ano/mês
 */
function criarHUDAnoMes() {
    console.log('🎮 Criando HUD de ano/mês...');
    
    if (document.getElementById('hud-periodo-container')) {
        atualizarHUDAnoMes();
        return;
    }
    
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    
    const container = document.createElement('div');
    container.id = 'hud-periodo-container';
    container.style.cssText = `
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 12px 20px;
        border-radius: 15px;
        z-index: 9998;
        display: flex;
        align-items: center;
        gap: 15px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.2);
        min-width: 400px;
        max-width: 600px;
        justify-content: center;
    `;
    
    // Botão modo período
    const btnModo = document.createElement('button');
    btnModo.id = 'hud-btn-modo';
    btnModo.innerHTML = '📅';
    btnModo.title = modoPeriodoAtivo ? 'Modo Período Ativo' : 'Modo Período Inativo';
    btnModo.style.cssText = `
        background: ${modoPeriodoAtivo ? '#10b981' : '#6b7280'};
        color: white;
        border: none;
        border-radius: 8px;
        width: 40px;
        height: 40px;
        cursor: pointer;
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s;
    `;
    
    // Select de Ano
    const selectAno = document.createElement('select');
    selectAno.id = 'hud-select-ano';
    selectAno.style.cssText = `
        padding: 8px 12px;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.3);
        background: rgba(255,255,255,0.1);
        color: white;
        font-weight: bold;
        cursor: pointer;
        outline: none;
    `;
    
    for (let ano = 2020; ano <= 2030; ano++) {
        const option = document.createElement('option');
        option.value = ano;
        option.textContent = ano;
        if (ano === anoSelecionado) option.selected = true;
        selectAno.appendChild(option);
    }
    
    // Select de Mês
    const selectMes = document.createElement('select');
    selectMes.id = 'hud-select-mes';
    selectMes.style.cssText = selectAno.style.cssText;
    
    const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    meses.forEach((mes, index) => {
        const option = document.createElement('option');
        option.value = index + 1;
        option.textContent = mes;
        if ((index + 1) === mesSelecionado) option.selected = true;
        selectMes.appendChild(option);
    });
    
    // Label do período
    const labelPeriodo = document.createElement('div');
    labelPeriodo.id = 'hud-label-periodo';
    labelPeriodo.textContent = getPeriodoFormatado();
    labelPeriodo.style.cssText = `
        font-weight: bold;
        font-size: 16px;
        min-width: 200px;
        text-align: center;
        padding: 0 10px;
    `;
    
    // Botão de Carregar
    const btnCarregar = document.createElement('button');
    btnCarregar.id = 'hud-btn-carregar';
    btnCarregar.innerHTML = '📥 Carregar';
    btnCarregar.title = 'Carregar dados deste mês (ou limpar se vazio)';
    btnCarregar.style.cssText = `
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 10px 20px;
        cursor: pointer;
        font-weight: bold;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.3s;
    `;
    
    // Botão de Salvar
    const btnSalvar = document.createElement('button');
    btnSalvar.id = 'hud-btn-salvar';
    btnSalvar.innerHTML = '💾 Salvar';
    btnSalvar.style.cssText = btnCarregar.style.cssText;
    
    // Botão Limpar
    const btnLimpar = document.createElement('button');
    btnLimpar.id = 'hud-btn-limpar';
    btnLimpar.innerHTML = '🗑️ Limpar';
    btnLimpar.title = 'Limpar todos os dados da tela';
    btnLimpar.style.cssText = `
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 10px 15px;
        cursor: pointer;
        font-weight: bold;
        display: flex;
        align-items: center;
        gap: 5px;
        transition: all 0.3s;
    `;
    
    // Montar HUD
    container.appendChild(btnModo);
    container.appendChild(selectAno);
    container.appendChild(selectMes);
    container.appendChild(labelPeriodo);
    container.appendChild(btnCarregar);
    container.appendChild(btnSalvar);
    container.appendChild(btnLimpar);
    
    document.body.appendChild(container);
    
    // Event Listeners
    btnModo.addEventListener('click', function() {
        modoPeriodoAtivo = !modoPeriodoAtivo;
        this.style.background = modoPeriodoAtivo ? '#10b981' : '#6b7280';
        this.title = modoPeriodoAtivo ? 'Modo Período Ativo' : 'Modo Período Inativo';
        
        if (!modoPeriodoAtivo) {
            anoSelecionado = anoAtual;
            mesSelecionado = mesAtual;
            selectAno.value = anoSelecionado;
            selectMes.value = mesSelecionado;
            labelPeriodo.textContent = getPeriodoFormatado();
        }
        
        console.log(`📅 Modo período: ${modoPeriodoAtivo ? 'ATIVO' : 'INATIVO'}`);
    });
    
    selectAno.addEventListener('change', function() {
        anoSelecionado = parseInt(this.value);
        labelPeriodo.textContent = getPeriodoFormatado();
        modoPeriodoAtivo = true;
        btnModo.style.background = '#10b981';
    });
    
    selectMes.addEventListener('change', function() {
        mesSelecionado = parseInt(this.value);
        labelPeriodo.textContent = getPeriodoFormatado();
        modoPeriodoAtivo = true;
        btnModo.style.background = '#10b981';
    });
    
    btnCarregar.addEventListener('click', async function() {
        const originalHTML = this.innerHTML;
        this.disabled = true;
        this.innerHTML = '📥 Carregando...';
        this.style.background = '#6b7280';
        
        try {
            const result = await loadDashboardFromSupabase();
            
            if (result.success) {
                if (result.empty) {
                    this.innerHTML = '📭 Vazio';
                    this.style.background = '#f59e0b';
                    showInfo(`✅ ${getPeriodoFormatado()} está limpo e pronto para uso!`);
                } else {
                    this.innerHTML = '✅ Carregado!';
                    this.style.background = '#10b981';
                }
            } else {
                this.innerHTML = '❌ Erro';
                this.style.background = '#ef4444';
            }
        } catch (error) {
            this.innerHTML = '❌ Erro';
            this.style.background = '#ef4444';
        }
        
        setTimeout(() => {
            this.innerHTML = originalHTML;
            this.style.background = '#3b82f6';
            this.disabled = false;
        }, 2000);
    });
    
    btnSalvar.addEventListener('click', async function() {
        const originalHTML = this.innerHTML;
        this.disabled = true;
        this.innerHTML = '💾 Salvando...';
        this.style.background = '#6b7280';
        
        try {
            const result = await saveDashboardToSupabase();
            
            if (result.success) {
                this.innerHTML = '✅ Salvo!';
                this.style.background = '#10b981';
            } else {
                this.innerHTML = '❌ Erro';
                this.style.background = '#ef4444';
            }
        } catch (error) {
            this.innerHTML = '❌ Erro';
            this.style.background = '#ef4444';
        }
        
        setTimeout(() => {
            this.innerHTML = originalHTML;
            this.style.background = '#3b82f6';
            this.disabled = false;
        }, 2000);
    });
    
    btnLimpar.addEventListener('click', function() {
        if (confirm(`Tem certeza que deseja limpar todos os dados de ${getPeriodoFormatado()}?`)) {
            limparInterfaceDashboard();
            showInfo(`✅ ${getPeriodoFormatado()} limpo!`);
        }
    });
    
    console.log('✅ HUD de ano/mês criado');
}

/**
 * Atualizar HUD existente
 */
function atualizarHUDAnoMes() {
    const selectAno = document.getElementById('hud-select-ano');
    const selectMes = document.getElementById('hud-select-mes');
    const labelPeriodo = document.getElementById('hud-label-periodo');
    const btnModo = document.getElementById('hud-btn-modo');
    
    if (selectAno) selectAno.value = anoSelecionado;
    if (selectMes) selectMes.value = mesSelecionado;
    if (labelPeriodo) labelPeriodo.textContent = getPeriodoFormatado();
    if (btnModo) {
        btnModo.style.background = modoPeriodoAtivo ? '#10b981' : '#6b7280';
        btnModo.title = modoPeriodoAtivo ? 'Modo Período Ativo' : 'Modo Período Inativo';
    }
}

// ============================================
// FUNÇÕES DE MENSAGENS
// ============================================

function showError(message) {
    console.error('🚨 ERRO:', message);
    
    let errorDiv = document.getElementById('supabase-error');
    
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'supabase-error';
        errorDiv.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 15px;
            border-radius: 8px;
            z-index: 9997;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        document.body.appendChild(errorDiv);
    }
    
    errorDiv.innerHTML = `
        <strong>⚠️ Erro</strong>
        <p style="margin: 8px 0; font-size: 14px;">${message}</p>
        <button onclick="this.parentElement.remove()" 
                style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
            Fechar
        </button>
    `;
    
    setTimeout(() => {
        if (errorDiv && errorDiv.parentElement) {
            errorDiv.remove();
        }
    }, 10000);
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 15px;
        border-radius: 8px;
        z-index: 9997;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    successDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span>✅</span>
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(successDiv);
    
    setTimeout(() => successDiv.remove(), 3000);
}

function showInfo(message) {
    const infoDiv = document.createElement('div');
    infoDiv.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: #3b82f6;
        color: white;
        padding: 15px;
        border-radius: 8px;
        z-index: 9997;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        font-size: 14px;
    `;
    infoDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span>ℹ️</span>
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(infoDiv);
    
    setTimeout(() => {
        if (infoDiv && infoDiv.parentElement) {
            infoDiv.remove();
        }
    }, 5000);
}

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando sistema Supabase...');
    
    setTimeout(async () => {
        try {
            const supabase = getSupabase();
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
                console.log('🌐 Usuário logado - Criando HUD...');
                
                if (window.location.hash.includes('dashboard') || 
                    document.querySelector('[data-page="dashboard"]')) {
                    
                    criarHUDAnoMes();
                    
                    // Carregar dados do mês atual automaticamente
                    console.log('📊 Carregando dados do mês atual...');
                    await loadDashboardFromSupabase();
                }
            } else {
                console.log('👤 Usuário não está logado');
            }
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
        }
    }, 1000);
});

// ============================================
// EXPORTAR PARA USO GLOBAL - ATUALIZADO
// ============================================

window.supabaseData = {
    save: saveDashboardToSupabase,
    load: loadDashboardFromSupabase,
    limpar: limparInterfaceDashboard,
    toggleHUD: () => {
        const hud = document.getElementById('hud-periodo-container');
        if (!hud) {
            criarHUDAnoMes();
        } else {
            hud.style.display = hud.style.display === 'none' ? 'flex' : 'none';
        }
    },
    getPeriodo: getPeriodoFormatado,
    // NOVAS FUNÇÕES PARA INTEGRAÇÃO
    carregarMes: carregarMesEspecifico,
    salvarMes: salvarMesEspecifico,
    setPeriodo: (ano, mes) => {
        anoSelecionado = ano;
        mesSelecionado = mes;
        modoPeriodoAtivo = true;
        atualizarHUDAnoMes();
    }
};

// Aliases para facilitar
window.saveToCloud = saveDashboardToSupabase;
window.loadFromCloud = loadDashboardFromSupabase;
window.limparDashboard = limparInterfaceDashboard;
window.carregarMes = carregarMesEspecifico;
window.salvarMes = salvarMesEspecifico;

// Função para integração com dashboard.js
window.carregarDadosDashboard = async function(ano, mes) {
    try {
        return await carregarMesEspecifico(ano, mes);
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

window.salvarDadosDashboard = async function(ano, mes) {
    try {
        return await salvarMesEspecifico(ano, mes);
    } catch (error) {
        console.error('❌ Erro ao salvar dados:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

console.log('✅ supabase-data.js (corrigido e integrado) pronto!');