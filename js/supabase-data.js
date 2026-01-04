// js/supabase-data.js - VERSÃO SOMENTE SUPABASE
console.log('🗄️ supabase-data.js (Somente Supabase)');

// ============================================
// CONFIGURAÇÃO
// ============================================

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
// FUNÇÕES PRINCIPAIS
// ============================================

/**
 * SALVAR dados no Supabase (APENAS online)
 */
async function saveDashboardToSupabase() {
    console.log('💾 Salvando NO SUPABASE...');
    
    const supabase = getSupabase();
    
    try {
        // 1. Pegar sessão do usuário
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
            console.error('❌ Erro de sessão:', sessionError);
            throw new Error('Falha na autenticação');
        }
        
        if (!session) {
            throw new Error('Usuário não está logado');
        }
        
        const userId = session.user.id;
        const currentMonth = getCurrentMonth();
        const dashboardData = collectDashboardData();
        
        console.log(`📤 Usuário: ${userId.substring(0, 8)}... | Mês: ${currentMonth}`);
        
        // 2. Salvar DIRETAMENTE no Supabase
        const { data, error } = await supabase
            .from('finance_data')
            .upsert({
                user_id: userId,
                month: currentMonth,
                data: dashboardData,
                updated_at: new Date().toISOString()
            })
            .select();
        
        if (error) {
            console.error('❌ Erro do Supabase:', error);
            throw new Error(`Falha ao salvar: ${error.message}`);
        }
        
        console.log('✅ SALVO no Supabase com sucesso!', data[0].id);
        
        return { 
            success: true, 
            message: '✅ Dados salvos na nuvem!',
            data: data[0]
        };
        
    } catch (error) {
        console.error('❌ Falha TOTAL ao salvar:', error.message);
        
        // NÃO SALVA LOCALMENTE - mostra erro
        showError(`Falha ao salvar: ${error.message}. Verifique sua conexão.`);
        
        return { 
            success: false, 
            error: error.message 
        };
    }
}

/**
 * CARREGAR dados do Supabase (APENAS online)
 */
async function loadDashboardFromSupabase() {
    console.log('📥 Carregando DO SUPABASE...');
    
    const supabase = getSupabase();
    
    try {
        // 1. Verificar autenticação
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
            console.error('❌ Erro de sessão:', sessionError);
            throw new Error('Falha na autenticação');
        }
        
        if (!session) {
            throw new Error('Faça login para carregar dados');
        }
        
        const userId = session.user.id;
        const currentMonth = getCurrentMonth();
        
        console.log(`📋 Buscando: ${userId.substring(0, 8)}... | ${currentMonth}`);
        
        // 2. Buscar APENAS do Supabase
    const { data, error } = await supabase
    .from('finance_data')
    .select('*')
    .eq('user_id', userId)
    .eq('month', currentMonth)
    .order('updated_at', { ascending: false }) // Pega o mais recente
    .limit(1) // Apenas 1 registro
    .maybeSingle();
        
        if (error) {
            console.error('❌ Erro na busca:', error);
            throw new Error(`Falha ao buscar: ${error.message}`);
        }
        
        if (!data) {
            console.log('📭 Nenhum dado encontrado para este mês');
            return { 
                success: true, 
                message: '📭 Nenhum dado salvo ainda',
                empty: true
            };
        }
        
        console.log('✅ Dados carregados do Supabase!');
        
        // 3. Aplicar dados na interface
        applyDashboardData(data.data);
        
        return { 
            success: true, 
            message: '✅ Dados carregados da nuvem!',
            data: data.data
        };
        
    } catch (error) {
        console.error('❌ Falha TOTAL ao carregar:', error.message);
        
        // NÃO CARREGA LOCALMENTE - mostra erro
        showError(`Falha ao carregar: ${error.message}. Verifique sua conexão.`);
        
        return { 
            success: false, 
            error: error.message,
            requiresLogin: error.message.includes('login')
        };
    }
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Coletar dados da interface
 */
function collectDashboardData() {
    console.log('📋 COLETANDO DADOS - VERSÃO CORRIGIDA DEFINITIVA');
    
    const data = {
        rendas: [],
        despesas: [],
        investimentos: [], // ← SERÁ PREENCHIDO
        totais: {},
        ultima_atualizacao: new Date().toISOString()
    };
    
    // 1. RENDAS (tabela #renda)
    const rendaTable = document.getElementById('renda');
    if (rendaTable?.querySelector('tbody')) {
        rendaTable.querySelectorAll('tbody tr').forEach(row => {
            const inputs = row.querySelectorAll('input');
            if (inputs.length >= 2) {
                data.rendas.push({
                    descricao: (inputs[0].value || '').trim(),
                    valor: parseFloat(inputs[1].value) || 0
                });
            }
        });
        console.log(`📈 ${data.rendas.length} rendas coletadas`);
    }
    
    // 2. DESPESAS (tabela #despesa)
    const despesaTable = document.getElementById('despesa');
    if (despesaTable?.querySelector('tbody')) {
        despesaTable.querySelectorAll('tbody tr').forEach(row => {
            const inputs = row.querySelectorAll('input');
            if (inputs.length >= 2) {
                data.despesas.push({
                    descricao: (inputs[0].value || '').trim(),
                    valor: parseFloat(inputs[1].value) || 0
                });
            }
        });
        console.log(`📉 ${data.despesas.length} despesas coletadas`);
    }
    
    // 3. ✅✅✅ INVESTIMENTOS (tabela #invest) - VERSÃO QUE FUNCIONA
    const investTable = document.getElementById('invest');
    console.log('🔍 Procurando tabela #invest:', !!investTable);
    
    if (investTable) {
        const tbody = investTable.querySelector('tbody');
        console.log('Tbody encontrado?', !!tbody);
        
        if (tbody) {
            const rows = tbody.querySelectorAll('tr');
            console.log(`📊 Encontrei ${rows.length} linhas`);
            
            rows.forEach((row, index) => {
                // Buscar TODOS os inputs da linha
                const inputs = row.querySelectorAll('input');
                console.log(`Linha ${index + 1}: ${inputs.length} inputs`);
                
                // Precisa ter pelo menos 3 inputs (Nome, Aporte, Meta)
                if (inputs.length >= 3) {
                    const investimento = {
                        nome: (inputs[0].value || '').trim(),
                        aporte: parseFloat(inputs[1].value) || 0,
                        meta: parseFloat(inputs[2].value) || 0
                    };
                    
                    console.log(`   → "${investimento.nome}" | ${investimento.aporte} | ${investimento.meta}`);
                    
                    // ✅✅✅ ADICIONAR SEMPRE - NÃO FILTRAR
                    data.investimentos.push(investimento);
                } else {
                    console.log(`   ⚠️ Linha com apenas ${inputs.length} inputs`);
                }
            });
            
            console.log(`🎉 TOTAL: ${data.investimentos.length} investimentos coletados`);
        }
    } else {
        console.error('❌ Tabela #invest não encontrada!');
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
    
    console.log('📦 RESUMO FINAL:', {
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
    
    if (!data) return;
    
    // VARIÁVEL DE CONTROLE - impede calc() múltiplo
    let isApplyingData = true;
    const originalCalc = window.calc;
    
    // 1. Substituir temporariamente calc() para evitar chamadas múltiplas
    if (typeof originalCalc === 'function') {
        window.calc = function() {
            if (!isApplyingData) {
                console.log('🧮 calc() executado normalmente');
                return originalCalc();
            }
            console.log('⏸️ calc() bloqueado durante aplicação de dados');
        };
    }
    
    // 2. Limpar tabelas rapidamente
    console.log('🧹 Limpando tabelas...');
    
    const tables = [
        '#rendaTable tbody', '#renda tbody',
        '#despesaTable tbody', '#despesa tbody', 
        '#investmentTable tbody', '#invest tbody'
    ];
    
    tables.forEach(selector => {
        const table = document.querySelector(selector);
        if (table) table.innerHTML = '';
    });
    
    console.log('💰 Todas as tabelas limpas');
    
    // 3. Aplicar TODOS os dados de uma vez (sem cálculos intermediários)
    
    // Aplicar rendas
    if (data.rendas && Array.isArray(data.rendas) && data.rendas.length > 0) {
        console.log(`📈 Aplicando ${data.rendas.length} rendas`);
        
        if (typeof window.addRow === 'function') {
            data.rendas.forEach(item => {
                // Adiciona mas calc() bloqueado não roda
                window.addRow('renda', item.descricao, item.valor);
            });
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
    }
    
    // Aplicar investimentos
    if (data.investimentos && Array.isArray(data.investimentos) && data.investimentos.length > 0) {
        console.log(`💰 APLICANDO ${data.investimentos.length} INVESTIMENTOS`);
        
        let investTableBody = document.querySelector('#investmentTable tbody') || 
                             document.querySelector('#invest tbody');
        
        if (investTableBody) {
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
            console.log(`✅ ${data.investimentos.length} investimentos aplicados`);
        }
    }
    
    // 4. AGORA restaurar calc() e executar APENAS UMA VEZ
    setTimeout(() => {
        console.log('🎯 Finalizando aplicação...');
        isApplyingData = false; // Libera calc()
        
        // Restaurar função original
        if (typeof originalCalc === 'function') {
            window.calc = originalCalc;
            
            // Adicionar eventos oninput APÓS restaurar calc()
            document.querySelectorAll('.table-input').forEach(input => {
                if (!input.hasAttribute('data-events-added')) {
                    input.setAttribute('oninput', 'calc()');
                    input.setAttribute('data-events-added', 'true');
                }
            });
            
            // Executar calc() UMA ÚNICA VEZ
            console.log('🧮 Executando cálculo FINAL...');
            originalCalc();
        }
        
        console.log('✅ Dados aplicados e cálculo executado UMA VEZ');
    }, 150);
    
    console.log('✅ applyDashboardData concluído (calc será chamado em 150ms)');
}
/**
 * Obter mês atual
 */
function getCurrentMonth() {
    const date = new Date();
    const month = date.toLocaleString('pt-BR', { month: 'long' });
    const year = date.getFullYear();
    return `${month}-${year}`.toLowerCase();
}

/**
 * Mostrar erro na interface
 */
function showError(message) {
    console.error('🚨 ERRO:', message);
    
    // Criar ou atualizar elemento de erro
    let errorDiv = document.getElementById('supabase-error');
    
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'supabase-error';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 15px;
            border-radius: 8px;
            z-index: 9999;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        document.body.appendChild(errorDiv);
    }
    
    errorDiv.innerHTML = `
        <strong>⚠️ Erro de Conexão</strong>
        <p style="margin: 8px 0; font-size: 14px;">${message}</p>
        <button onclick="this.parentElement.remove()" 
                style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
            Fechar
        </button>
    `;
    
    // Remover após 10 segundos
    setTimeout(() => {
        if (errorDiv && errorDiv.parentElement) {
            errorDiv.remove();
        }
    }, 10000);
}

/**
 * Mostrar sucesso
 */
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 15px;
        border-radius: 8px;
        z-index: 9999;
    `;
    successDiv.textContent = message;
    document.body.appendChild(successDiv);
    
    setTimeout(() => successDiv.remove(), 3000);
}

// ============================================
// TESTE DE CONEXÃO
// ============================================

async function testSupabaseConnection() {
    console.log('🔍 Testando conexão Supabase...');
    
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('❌ Falha na conexão:', error);
            return false;
        }
        
        console.log('✅ Conexão OK | Usuário:', data.session ? 'Logado' : 'Não logado');
        return true;
        
    } catch (error) {
        console.error('❌ Erro no teste:', error);
        return false;
    }
}

// ============================================
// AUTO-SAVE (somente se online)
// ============================================

function setupAutoSave() {
    console.log('💾 Configurando auto-save online...');
    
    // Salvar quando o usuário modificar dados
    const saveOnChange = () => {
        if (navigator.onLine) {
            saveDashboardToSupabase().then(result => {
                if (result.success) {
                    console.log('💾 Auto-save concluído');
                }
            });
        }
    };
    
    // Monitorar mudanças nas tabelas
    const tables = ['rendaTable', 'despesaTable', 'renda', 'despesa'];
    tables.forEach(tableId => {
        const table = document.getElementById(tableId);
        if (table) {
            table.addEventListener('input', saveOnChange);
            table.addEventListener('change', saveOnChange);
        }
    });
    
    // Salvar quando sair da página (se online)
    window.addEventListener('beforeunload', () => {
        if (navigator.onLine) {
            saveDashboardToSupabase();
        }
    });
}

// ============================================
// INICIALIZAÇÃO AUTOMÁTICA
// ============================================

// Iniciar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando sistema Supabase...');
    
    // Esperar 1 segundo para tudo carregar
    setTimeout(async () => {
        try {
            const connected = await testSupabaseConnection();
            
            if (connected) {
                console.log('🌐 Conexão Supabase OK - Modo ONLINE');
                
                // Se estiver na dashboard, carregar dados
                if (window.location.hash.includes('dashboard') || 
                    document.querySelector('[data-page="dashboard"]')) {
                    
                    console.log('📊 Carregando dados da dashboard...');
                    await loadDashboardFromSupabase();
                    setupAutoSave();
                }
            } else {
                showError('Não conectado ao Supabase. Dados não serão salvos.');
            }
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
        }
    }, 1000);
});

// ============================================
// EXPORTAR PARA USO GLOBAL
// ============================================

// Exportar funções principais
window.supabaseData = {
    save: saveDashboardToSupabase,
    load: loadDashboardFromSupabase,
    test: testSupabaseConnection
};

// Aliases para facilitar
window.saveToCloud = saveDashboardToSupabase;
window.loadFromCloud = loadDashboardFromSupabase;

// Botão de teste (para desenvolvimento)
window.testSave = () => {
    saveDashboardToSupabase().then(result => {
        if (result.success) {
            alert('✅ Teste OK! Dados salvos no Supabase.');
        } else {
            alert(`❌ Falha: ${result.error}`);
        }
    });
};

console.log('✅ supabase-data.js (online-only) pronto!');