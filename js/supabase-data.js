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
    console.log('📋 Coletando dados da interface...');
    
    const data = {
        rendas: [],
        despesas: [],
        investimentos: [],
        totais: {},
        ultima_atualizacao: new Date().toISOString()
    };
    
    // Encontrar tabelas DINAMICAMENTE
    const findTable = (possibleIds) => {
        for (const id of possibleIds) {
            const table = document.getElementById(id);
            if (table) return table.querySelector('tbody');
        }
        return null;
    };
    
    // Coletar rendas
    const rendaTbody = findTable(['rendaTable', 'renda', 'incomeTable', 'tableRendas']);
    if (rendaTbody) {
        rendaTbody.querySelectorAll('tr').forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 2) {
                const descricao = cells[0].textContent || cells[0].querySelector('input')?.value || '';
                const valorText = cells[1].textContent || cells[1].querySelector('input')?.value || '0';
                const valor = parseFloat(valorText.replace(/[^\d,.-]/g, '').replace(',', '.'));
                
                if (descricao.trim() || !isNaN(valor)) {
                    data.rendas.push({ 
                        descricao: descricao.trim(), 
                        valor: isNaN(valor) ? 0 : valor 
                    });
                }
            }
        });
    }
    
    // Coletar despesas
    const despesaTbody = findTable(['despesaTable', 'despesa', 'expensesTable', 'tableDespesas']);
    if (despesaTbody) {
        despesaTbody.querySelectorAll('tr').forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 2) {
                const descricao = cells[0].textContent || cells[0].querySelector('input')?.value || '';
                const valorText = cells[1].textContent || cells[1].querySelector('input')?.value || '0';
                const valor = parseFloat(valorText.replace(/[^\d,.-]/g, '').replace(',', '.'));
                
                if (descricao.trim() || !isNaN(valor)) {
                    data.despesas.push({ 
                        descricao: descricao.trim(), 
                        valor: isNaN(valor) ? 0 : valor 
                    });
                }
            }
        });
    }
    
    // Coletar totais
    const getTotal = (elementId) => {
        const el = document.getElementById(elementId);
        if (!el) return 0;
        const text = el.textContent || '';
        return parseFloat(text.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
    };
    
    data.totais = {
        renda: getTotal('totalRenda'),
        despesa: getTotal('totalDespesa'),
        saldo: getTotal('saldo')
    };
    
    console.log('📦 Dados coletados:', data);
    return data;
}

/**
 * Aplicar dados na interface
 */
function applyDashboardData(data) {
    console.log('🔄 Aplicando dados na interface...');
    
    if (!data) {
        console.log('⚠️ Nenhum dado para aplicar');
        return;
    }
    
    // 1. Limpar tabelas atuais
    const clearTable = (tableId) => {
        const table = document.getElementById(tableId);
        if (table && table.querySelector('tbody')) {
            table.querySelector('tbody').innerHTML = '';
        }
    };
    
    ['rendaTable', 'despesaTable', 'renda', 'despesa'].forEach(clearTable);
    
    // 2. Verificar se addRow existe
    if (typeof window.addRow !== 'function') {
        console.error('❌ addRow não encontrado!');
        showError('Função addRow não encontrada. O dashboard não pode carregar dados.');
        return;
    }
    
    // 3. Adicionar rendas
    if (data.rendas && Array.isArray(data.rendas)) {
        data.rendas.forEach(item => {
            if (item.descricao || item.valor) {
                window.addRow('renda', item.descricao, item.valor);
            }
        });
    }
    
    // 4. Adicionar despesas
    if (data.despesas && Array.isArray(data.despesas)) {
        data.despesas.forEach(item => {
            if (item.descricao || item.valor) {
                window.addRow('despesa', item.descricao, item.valor);
            }
        });
    }
    
    // 5. Recalcular totais
    if (typeof window.calc === 'function') {
        setTimeout(() => {
            window.calc();
            console.log('✅ Cálculos atualizados');
        }, 100);
    }
    
    console.log('✅ Dados aplicados na interface!');
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