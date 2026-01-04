// js/supabase-data.js - VERSÃO FINAL COM CORREÇÃO DO ERRO DE CONSTRAINT
console.log('🗄️ supabase-data.js (Com correção de constraint)');

// ============================================
// CONFIGURAÇÃO
// ============================================

// VARIÁVEIS DE ANO/MÊS GLOBAIS
let anoSelecionado = new Date().getFullYear();
let mesSelecionado = new Date().getMonth() + 1; // 1-12
let modoPeriodoAtivo = false;

// VARIÁVEIS DE AUTO-SAVE
let autoSaveConfigurado = false;
let autoSaveTimeout = null;
let ultimaAlteracao = null;
const DEBOUNCE_DELAY = 2000; // Salva 2 segundos após a última alteração

// VARIÁVEL PARA CONTROLAR SE TEM ALTERAÇÕES NÃO SALVAS
let alteracoesNaoSalvas = false;

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
// SISTEMA DE AUTO-SAVE AUTOMÁTICO
// ============================================

/**
 * Disparar auto-save com debounce
 */
function dispararAutoSave() {
    // Marcar que há alterações não salvas
    alteracoesNaoSalvas = true;
    
    // Limpar timeout anterior
    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
    }
    
    // Registrar hora da alteração
    ultimaAlteracao = new Date();
    
    // Atualizar HUD se existir
    atualizarStatusNaoSalvasHUD();
    
    // Agendar novo save
    autoSaveTimeout = setTimeout(async () => {
        if (navigator.onLine) {
            console.log('💾 Auto-save disparado...');
            
            try {
                const result = await saveDashboardToSupabase();
                if (result.success) {
                    console.log('✅ Auto-save concluído');
                    
                    alteracoesNaoSalvas = false;
                    atualizarStatusNaoSalvasHUD();
                }
            } catch (error) {
                console.log('⚠️ Auto-save falhou:', error.message);
            }
        }
    }, DEBOUNCE_DELAY);
}

/**
 * Configurar auto-save automático
 */
function configurarAutoSave() {
    if (autoSaveConfigurado) {
        console.log('⏭️ Auto-save já configurado');
        return;
    }
    
    console.log('💾 Configurando auto-save automático...');
    
    // Monitorar TODOS os inputs financeiros
    function monitorarInputs() {
        // Selecionar todos os inputs relevantes
        const inputs = document.querySelectorAll(
            '#renda input, #despesa input, #invest input, ' +
            '.table-input, input[type="number"], ' +
            'input[placeholder*="Descrição"], ' +
            'input[placeholder*="Nome"], ' +
            'input[placeholder*="Aporte"], ' +
            'input[placeholder*="Meta"]'
        );
        
        console.log(`🔍 Monitorando ${inputs.length} inputs para auto-save`);
        
        // Adicionar event listeners a todos os inputs
        inputs.forEach(input => {
            // Remover listeners antigos para evitar duplicação
            input.removeEventListener('input', dispararAutoSave);
            input.removeEventListener('change', dispararAutoSave);
            
            // Adicionar novos listeners
            input.addEventListener('input', dispararAutoSave);
            input.addEventListener('change', dispararAutoSave);
        });
        
        // Monitorar também cliques nos botões de remover
        const botoesRemover = document.querySelectorAll('.btn-icon');
        botoesRemover.forEach(botao => {
            botao.removeEventListener('click', dispararAutoSave);
            botao.addEventListener('click', function() {
                // Pequeno delay para garantir que a linha foi removida
                setTimeout(dispararAutoSave, 100);
            });
        });
    }
    
    // Executar monitoramento imediatamente
    setTimeout(monitorarInputs, 500);
    
    // Re-monitorar quando o conteúdo mudar (para inputs dinâmicos)
    const observer = new MutationObserver(function(mutations) {
        let inputsAdicionados = false;
        
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        if (node.matches && (
                            node.matches('input') || 
                            node.querySelector && node.querySelector('input')
                        )) {
                            inputsAdicionados = true;
                        }
                    }
                });
            }
        });
        
        if (inputsAdicionados) {
            setTimeout(monitorarInputs, 300);
        }
    });
    
    // Observar mudanças no body
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Salvar quando o usuário sair da página
    window.addEventListener('beforeunload', function(event) {
        if (navigator.onLine && alteracoesNaoSalvas) {
            console.log('💾 Tentando salvar alterações não salvas antes de sair...');
            
            // Tentar salvar de forma síncrona
            try {
                // Não podemos fazer async no beforeunload, mas podemos tentar
                saveDashboardToSupabase().then(() => {
                    console.log('✅ Alterações salvas antes de sair');
                }).catch(() => {
                    console.log('⚠️ Não foi possível salvar antes de sair');
                });
            } catch (error) {
                console.log('⚠️ Erro ao tentar salvar antes de sair:', error);
            }
        }
    });
    
    // Salvar também quando a página perder foco
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'hidden' && navigator.onLine && alteracoesNaoSalvas) {
            console.log('💾 Salvando ao perder foco...');
            saveDashboardToSupabase().catch(() => {
                console.log('⚠️ Falha ao salvar ao perder foco');
            });
        }
    });
    
    // Salvar periodicamente a cada 5 minutos também (backup)
    setInterval(function() {
        if (navigator.onLine && document.visibilityState === 'visible' && alteracoesNaoSalvas) {
            console.log('💾 Auto-save periódico...');
            saveDashboardToSupabase().catch(() => {
                console.log('⚠️ Falha no auto-save periódico');
            });
        }
    }, 5 * 60 * 1000); // 5 minutos
    
    autoSaveConfigurado = true;
    console.log('✅ Auto-save configurado');
}

/**
 * Mostrar notificação discreta do auto-save
 */
function mostrarNotificacaoAutoSave(mensagem) {
    // Verificar se já existe uma notificação
    let notificacao = document.getElementById('auto-save-notification');
    
    if (!notificacao) {
        notificacao = document.createElement('div');
        notificacao.id = 'auto-save-notification';
        notificacao.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(16, 185, 129, 0.95);
            color: white;
            padding: 10px 16px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 9998;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
            opacity: 0;
            transform: translateY(10px);
            transition: all 0.3s ease;
            max-width: 300px;
        `;
        document.body.appendChild(notificacao);
    }
    
    notificacao.innerHTML = `
        <span style="font-size: 16px;">💾</span>
        <span>${mensagem}</span>
    `;
    
    // Mostrar com animação
    setTimeout(() => {
        notificacao.style.opacity = '1';
        notificacao.style.transform = 'translateY(0)';
    }, 10);
    
    // Esconder após 2 segundos
    setTimeout(() => {
        notificacao.style.opacity = '0';
        notificacao.style.transform = 'translateY(10px)';
        
        // Remover após animação
        setTimeout(() => {
            if (notificacao.parentElement) {
                notificacao.remove();
            }
        }, 300);
    }, 2000);
}

/**
 * Atualizar status de alterações não salvas no HUD
 */
function atualizarStatusNaoSalvasHUD() {
    const btnSalvar = document.getElementById('hud-btn-salvar');
    if (btnSalvar) {
        if (alteracoesNaoSalvas) {
            btnSalvar.innerHTML = '💾* Salvar';
            btnSalvar.style.background = '#f59e0b'; // Laranja para indicar alterações não salvas
            btnSalvar.title = 'Há alterações não salvas - Clique para salvar';
        } else {
            btnSalvar.innerHTML = '💾 Salvar';
            btnSalvar.style.background = '#3b82f6'; // Azul normal
            btnSalvar.title = 'Salvar dados';
        }
    }
}

/**
 * Pausar auto-save temporariamente (útil durante carregamento de dados)
 */
function pausarAutoSave() {
    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = null;
        console.log('⏸️ Auto-save pausado temporariamente');
    }
}

/**
 * Retomar auto-save
 */
function retomarAutoSave() {
    console.log('▶️ Auto-save retomado');
    ultimaAlteracao = new Date(); // Resetar para evitar save imediato
}

// ============================================
// FUNÇÕES PRINCIPAIS (COM LIMPEZA) - CORRIGIDAS
// ============================================

/**
 * SALVAR dados no Supabase - CORRIGIDO: SEM onConflict
 */
async function saveDashboardToSupabase(forcar = false) {
    console.log('💾 Salvando NO SUPABASE...', forcar ? '(FORÇADO)' : '');
    
    // Cancelar auto-save pendente se estiver salvando manualmente
    if (forcar && autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = null;
    }
    
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
            salvo_em: new Date().toISOString(),
            forçado: forcar
        };
        
        console.log(`📤 Usuário: ${userId.substring(0, 8)}... | Período: ${periodoBanco}`);
        
        // Salvar apenas com campos essenciais
        const dadosParaSalvar = {
            user_id: userId,
            month: periodoBanco,
            data: dashboardData,
            updated_at: new Date().toISOString()
        };
        
        // Primeiro, verificar se já existe um registro para este user_id e month
        const { data: existingData, error: fetchError } = await supabase
            .from('finance_data')
            .select('id')
            .eq('user_id', userId)
            .eq('month', periodoBanco)
            .maybeSingle();
        
        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 é "no rows returned"
            console.error('❌ Erro ao verificar dados existentes:', fetchError);
            throw new Error(`Falha ao verificar dados: ${fetchError.message}`);
        }
        
        let result;
        if (existingData) {
            // Atualizar registro existente
            console.log('📝 Atualizando registro existente ID:', existingData.id);
            const { data, error } = await supabase
                .from('finance_data')
                .update(dadosParaSalvar)
                .eq('id', existingData.id)
                .select();
            
            if (error) {
                console.error('❌ Erro ao atualizar:', error);
                throw new Error(`Falha ao atualizar: ${error.message}`);
            }
            
            result = data;
        } else {
            // Inserir novo registro
            console.log('📝 Inserindo novo registro');
            const { data, error } = await supabase
                .from('finance_data')
                .insert(dadosParaSalvar)
                .select();
            
            if (error) {
                console.error('❌ Erro ao inserir:', error);
                throw new Error(`Falha ao inserir: ${error.message}`);
            }
            
            result = data;
        }
        
        console.log('✅ SALVO no Supabase com sucesso!');
        
        // Resetar flag de alterações não salvas
        alteracoesNaoSalvas = false;
        atualizarStatusNaoSalvasHUD();
        
        const mensagem = modoPeriodoAtivo 
            ? `✅ Dados salvos para ${getPeriodoFormatado()}!`
            : '✅ Dados salvos na nuvem!';
        
        // Não mostra mensagem grande no auto-save, só no manual
        if (forcar || !autoSaveTimeout) {
            showSuccess(mensagem);
        }
        
        return { 
            success: true, 
            message: mensagem,
            periodo: periodoBanco,
            data: result ? result[0] : null
        };
        
    } catch (error) {
        console.error('❌ Falha TOTAL ao salvar:', error.message);
        
        // Só mostra erro se não for auto-save
        if (forcar || !autoSaveTimeout) {
            showError(`Falha ao salvar: ${error.message}. Verifique sua conexão.`);
        }
        
        return { 
            success: false, 
            error: error.message 
        };
    }
}

/**
 * CARREGAR dados do Supabase - CORRIGIDO: FORÇA ATUALIZAÇÃO DA INTERFACE
 */
async function loadDashboardFromSupabase(forcarAtualizacao = false) {
    console.log('📥 Carregando DO SUPABASE...', forcarAtualizacao ? '(FORÇADO)' : '');
    
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
            
            
            return { 
                success: true, 
                message: mensagem,
                empty: true,
                cleaned: true
            };
        }
        
        console.log('✅ Dados carregados do Supabase!', 'Atualizado em:', data.updated_at);
        
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
        
        // PAUSAR auto-save durante aplicação de dados
        pausarAutoSave();
        
        // Resetar flag de alterações não salvas
        alteracoesNaoSalvas = false;
        atualizarStatusNaoSalvasHUD();
        
        // Aplicar dados na interface
        applyDashboardData(data.data);
        
        const mensagem = `✅ Dados de ${getPeriodoFormatado()} carregados!`;
        
        
        // RETOMAR auto-save após 1 segundo
        setTimeout(() => {
            retomarAutoSave();
        }, 1000);
        
        return { 
            success: true, 
            message: mensagem,
            data: data.data,
            updated_at: data.updated_at
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
 */
async function carregarMesEspecifico(ano, mes) {
    console.log(`📅 Carregando mês específico: ${mes}/${ano}`);
    
    // Verificar se há alterações não salvas no mês atual
    if (alteracoesNaoSalvas) {
        if (confirm(`Há alterações não salvas no mês atual. Deseja salvar antes de carregar ${mes}/${ano}?`)) {
            await saveDashboardToSupabase(true);
        }
    }
    
    // Atualizar variáveis globais
    anoSelecionado = ano;
    mesSelecionado = mes;
    modoPeriodoAtivo = true;
    
    // Atualizar HUD se existir
    atualizarHUDAnoMes();
    
    // Carregar dados - força atualização
    return await loadDashboardFromSupabase(true);
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
    
    // Salvar dados - forçado
    return await saveDashboardToSupabase(true);
}

/**
 * LIMPAR completamente a interface do dashboard
 */
function limparInterfaceDashboard() {
    console.log('🧹 LIMPANDO TODA A INTERFACE DO DASHBOARD...');
    
    // PAUSAR auto-save durante limpeza
    pausarAutoSave();
    
    // Resetar flag de alterações não salvas
    alteracoesNaoSalvas = false;
    atualizarStatusNaoSalvasHUD();
    
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
        
        // RETOMAR auto-save após limpeza
        setTimeout(() => {
            retomarAutoSave();
        }, 500);
        
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
 * Aplicar dados na interface - CORRIGIDA: FORÇA ATUALIZAÇÃO
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
                    
                    // Adicionar eventos oninput
                    row.querySelectorAll('.table-input').forEach(input => {
                        input.setAttribute('oninput', 'calc()');
                    });
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
                
                // Adicionar eventos oninput
                row.querySelectorAll('.table-input').forEach(input => {
                    input.setAttribute('oninput', 'calc()');
                });
            }
        }
        
        // Finalizar
        setTimeout(() => {
            isApplyingData = false;
            
            if (typeof originalCalc === 'function') {
                window.calc = originalCalc;
                
                // Adicionar eventos para todos os inputs
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
// HUD DE CONTROLE DE ANO/MÊS - CORRIGIDO
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
    btnCarregar.title = 'Carregar dados deste mês (dados mais recentes do servidor)';
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
    btnSalvar.title = 'Salvar dados (sobrescreve servidor)';
    
    
    // Botão Limpar
    const btnLimpar = document.createElement('button');
    btnLimpar.id = 'hud-btn-limpar';
    btnLimpar.innerHTML = '🗑️ Limpar';
    btnLimpar.title = 'Limpar todos os dados da tela (não afeta servidor)';
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
    
    // Atualizar status inicial
    atualizarStatusNaoSalvasHUD();
    
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
        // Perguntar se quer salvar alterações não salvas
        
        
        const originalHTML = this.innerHTML;
        this.disabled = true;
        this.innerHTML = '📥 Carregando...';
        this.style.background = '#6b7280';
        
        try {
            // Forçar carregamento dos dados mais recentes
            const result = await loadDashboardFromSupabase(true);
            
            if (result.success) {
                if (result.empty) {
                    this.innerHTML = '📭 Vazio';
                    this.style.background = '#f59e0b';
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
            // Forçar salvamento
            const result = await saveDashboardToSupabase(true);
            
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
            atualizarStatusNaoSalvasHUD();
        }, 2000);
    });
    
    btnLimpar.addEventListener('click', function() {
        if (confirm(`Tem certeza que deseja limpar todos os dados de ${getPeriodoFormatado()}?\n\nIsso só limpa a tela, os dados no servidor permanecem.`)) {
            limparInterfaceDashboard();
            showInfo(`✅ ${getPeriodoFormatado()} limpo da tela!`);
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
    
    // Atualizar status de alterações não salvas
    atualizarStatusNaoSalvasHUD();
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
                    await loadDashboardFromSupabase(true); // Forçar carregamento inicial
                    
                    // INICIALIZAR O AUTO-SAVE APÓS CARREGAR OS DADOS
                    setTimeout(() => {
                        configurarAutoSave();
                    }, 2000);
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
    save: () => saveDashboardToSupabase(true), // Sempre força salvamento
    load: () => loadDashboardFromSupabase(true), // Sempre força carregamento
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
    carregarMes: carregarMesEspecifico,
    salvarMes: salvarMesEspecifico,
    setPeriodo: (ano, mes) => {
        anoSelecionado = ano;
        mesSelecionado = mes;
        modoPeriodoAtivo = true;
        atualizarHUDAnoMes();
    },
    temAlteracoesNaoSalvas: () => alteracoesNaoSalvas,
    forcarSalvamento: () => saveDashboardToSupabase(true),
    forcarCarregamento: () => loadDashboardFromSupabase(true)
};

// Aliases para facilitar
window.saveToCloud = () => saveDashboardToSupabase(true);
window.loadFromCloud = () => loadDashboardFromSupabase(true);
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

console.log('✅ supabase-data.js (com correção de constraint) pronto!');