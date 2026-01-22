// js/supabase-data.js - VERSÃO FINAL COM CORREÇÃO DO ERRO DE CONSTRAINT

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
const DEBOUNCE_DELAY = 800; // Reduzido para 800ms - salva mais rápido

// VARIÁVEL PARA CONTROLAR SE TEM ALTERAÇÕES NÃO SALVAS
let alteracoesNaoSalvas = false;

// VARIÁVEL PARA CONTROLAR SE ESTÁ CARREGANDO DADOS INICIAIS
let isLoadingInitialData = true;

// VARIÁVEL PARA CONTROLAR SE ESTÁ CARREGANDO DO SERVIDOR (evita múltiplos loads)
let isLoadingFromServer = false;

// VARIÁVEL PARA BLOQUEAR HUD DURANTE CARREGAMENTO
let hudBloqueado = false;

// ⏱️ TIMEOUT DE SEGURANÇA: Se overlay ficar preso por mais de 10s, esconde forçadamente
window.addEventListener('load', () => {
    setTimeout(() => {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay && loadingOverlay.style.display !== 'none') {
            console.warn('⚠️ Overlay ainda visível após 10 segundos - escondendo forçadamente');
            loadingOverlay.style.opacity = '0';
            loadingOverlay.style.transition = 'opacity 0.3s ease-out';
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
            }, 300);
        }
    }, 10000);
});

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
    
    // 🛑 BLOQUEAR durante carregamento inicial
    if (isLoadingInitialData) {
        return;
    }
    
    // 🛑 BLOQUEAR se já estiver salvando
    if (isSavingToSupabase) {
        return;
    }
    
    // 🛑 BLOQUEAR se estiver aplicando dados do servidor
    if (window.isApplyingData) {
        return;
    }
    
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
            
            try {
                const result = await saveDashboardToSupabase();
                if (result.success) {
                    
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
        return;
    }
    
    // SÓ CONFIGURAR se não estiver carregando dados iniciais
    if (isLoadingInitialData) {
        return;
    }
    
    // Monitorar TODOS os inputs financeiros
    function monitorarInputs() {
        try {
            // Selecionar todos os inputs relevantes
            const inputs = document.querySelectorAll(
                '#renda input, #despesa input, #invest input, ' +
                '.table-input, input[type="number"], ' +
                'input[placeholder*="Descrição"], ' +
                'input[placeholder*="Nome"], ' +
                'input[placeholder*="Aporte"], ' +
                'input[placeholder*="Meta"]'
            );
            
            // Adicionar event listeners a todos os inputs
            inputs.forEach(input => {
                try {
                    // Remover listeners antigos para evitar duplicação
                    input.removeEventListener('input', dispararAutoSave);
                    input.removeEventListener('change', dispararAutoSave);
                    
                    // Adicionar novos listeners
                    input.addEventListener('input', dispararAutoSave);
                    input.addEventListener('change', dispararAutoSave);
                } catch (err) {
                    console.warn('⚠️ Erro ao adicionar listener:', err);
                }
            });
            
            // Monitorar também cliques nos botões de remover
            const botoesRemover = document.querySelectorAll('.btn-icon');
            botoesRemover.forEach(botao => {
                try {
                    botao.removeEventListener('click', dispararAutoSave);
                    botao.addEventListener('click', function() {
                        // Pequeno delay para garantir que a linha foi removida
                        setTimeout(dispararAutoSave, 100);
                    });
                } catch (err) {
                    console.warn('⚠️ Erro ao adicionar listener no botão:', err);
                }
            });
        } catch (error) {
            console.error('❌ Erro ao monitorar inputs:', error);
        }
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
    const periodicSaveInterval = setInterval(function() {
        if (navigator.onLine && document.visibilityState === 'visible' && alteracoesNaoSalvas) {
            console.log('💾 Auto-save periódico...');
            saveDashboardToSupabase().catch(() => {
                console.log('⚠️ Falha no auto-save periódico');
            });
        }
    }, 5 * 60 * 1000); // 5 minutos
    
    // Armazenar referência para poder limpar
    window.periodicSaveInterval = periodicSaveInterval;
    
    autoSaveConfigurado = true;
}

/**
 * Mostrar notificação discreta do auto-save
 */
function mostrarNotificacaoAutoSave(mensagem) {
    // Verificar se document.body existe
    if (!document.body) {
        console.warn('⚠️ document.body não existe, não foi possível mostrar notificação');
        return;
    }
    
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
        let status = '';
        let bgColor = '#3b82f6'; // Azul default
        
        // Verificar status de conexão
        if (typeof ConnectionMonitor !== 'undefined' && !ConnectionMonitor.isConnectedToSupabase) {
            status = '📴 Sem Conexão';
            bgColor = '#ef4444'; // Vermelho
        } else if (alteracoesNaoSalvas) {
            status = '💾* Alterações';
            bgColor = '#f59e0b'; // Laranja para indicar alterações não salvas
        } else {
            status = '✅ Sincronizado';
            bgColor = '#10b981'; // Verde quando sincronizado
        }
        
        btnSalvar.innerHTML = status;
        btnSalvar.style.background = bgColor;
        
        if (!ConnectionMonitor.isConnectedToSupabase) {
            btnSalvar.title = 'Sem conexão com servidor - dados salvos localmente';
        } else if (alteracoesNaoSalvas) {
            btnSalvar.title = 'Há alterações não salvas - Clique para salvar agora';
        } else {
            btnSalvar.title = 'Todos os dados sincronizados';
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
    }
}

/**
 * Retomar auto-save
 */
function retomarAutoSave() {
    // NÃO retomar se estiver carregando dados iniciais
    if (isLoadingInitialData) {
        return;
    }
    
    ultimaAlteracao = new Date(); // Resetar para evitar save imediato
}

// ============================================
// FUNÇÕES PRINCIPAIS (COM LIMPEZA) - CORRIGIDAS
// ============================================

/**
 * SALVAR dados no Supabase - CORRIGIDO: SEM onConflict
 */
let isSavingToSupabase = false;

async function saveDashboardToSupabase(forcar = false) {
    
    // 🛑 BLOQUEAR MÚLTIPLOS SALVAMENTOS SIMULTÂNEOS
    if (isSavingToSupabase) {
        return { 
            success: false, 
            error: 'Salvamento já em andamento. Aguarde...' 
        };
    }
    
    isSavingToSupabase = true;
    
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
    } finally {
        // 🔓 SEMPRE RESETAR A FLAG APÓS TERMINAR
        setTimeout(() => {
            isSavingToSupabase = false;
        }, 500);
    }
}

/**
 * CARREGAR dados do Supabase - CORRIGIDO: FORÇA ATUALIZAÇÃO DA INTERFACE
 */
async function loadDashboardFromSupabase(forcarAtualizacao = false) {
    
    // 🛑 BLOQUEAR se já estiver carregando
    if (isLoadingFromServer) {
        return { success: false, error: 'Carregamento em andamento' };
    }
    
    // 🔒 Desabilitar HUD durante carregamento
    bloquearHUD();
    
    // 👁️ Esconder HUD se for carregamento inicial (isLoadingInitialData)
    if (isLoadingInitialData) {
        esconderHUD();
    }
    
    isLoadingFromServer = true;
    
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
        
        // Verificar se os dados são do período correto
        if (data.data && data.data.periodo_info) {
            const periodoSalvo = data.data.periodo_info.periodo_banco;
            if (periodoSalvo !== periodoBanco) {
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
        
        
        // RETOMAR auto-save após 2 segundos
        setTimeout(() => {
            isLoadingInitialData = false;
            retomarAutoSave();
            
            // 🎉 Esconder overlay de carregamento quando dados chegarem
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) {
                loadingOverlay.style.opacity = '0';
                loadingOverlay.style.transition = 'opacity 0.3s ease-out';
                setTimeout(() => {
                    loadingOverlay.style.display = 'none';
                }, 300);
            }
        }, 2000);
        
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
    } finally {
        // Sempre desbloquear carregamento
        isLoadingFromServer = false;
        
        // 🎉 Garantir que overlay desapareça mesmo em caso de erro
        if (isLoadingInitialData === false) {
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay && loadingOverlay.style.display !== 'none') {
                loadingOverlay.style.opacity = '0';
                loadingOverlay.style.transition = 'opacity 0.3s ease-out';
                setTimeout(() => {
                    loadingOverlay.style.display = 'none';
                }, 300);
            }
        }
    }
}

/**
 * Função para carregar mês específico (para integração com dashboard.js)
 */
async function carregarMesEspecifico(ano, mes) {
    
    // 🛑 BLOQUEAR se já estiver carregando
    if (isLoadingFromServer) {
        return { success: false, error: 'Aguarde o carregamento atual' };
    }
    
    // 🔒 Bloquear HUD imediatamente (antes de qualquer operação)
    bloquearHUD();
    
    // 👁️ Esconder HUD durante troca de mês
    esconderHUD();
    
    // FORÇAR SALVAMENTO DO MÊS ANTERIOR SE HOUVER ALTERAÇÕES
    if (alteracoesNaoSalvas && !isSavingToSupabase) {
        await saveDashboardToSupabase(true);
        // Aguardar um pouco para garantir que salvou
        await new Promise(resolve => setTimeout(resolve, 800));
    }
    
    // Aguardar um pouco mais para garantir que nada mais vai acontecer
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Atualizar variáveis globais
    anoSelecionado = ano;
    mesSelecionado = mes;
    modoPeriodoAtivo = true;
    
    // Resetar flag de renderização para permitir novo render
    if (typeof window !== 'undefined') {
        window.dashboardAlreadyRendered = false;
    }
    
    // 👁️ Manter HUD escondido durante carregamento
    esconderHUD();
    
    // Carregar dados - força atualização
    const resultado = await loadDashboardFromSupabase(true);
    
    // Manter HUD bloqueado por mais 2 segundos após carregamento completar
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 👁️ Mostrar HUD novamente
    mostrarHUD();
    desbloquearHUD();
    
    return resultado;
}

/**
 * Função para salvar mês específico (para integração com dashboard.js)
 */
async function salvarMesEspecifico(ano, mes) {
    
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
    
    // Verificar se o dashboard existe antes de limpar
    const dashboardContent = document.getElementById('dashboardContent');
    if (!dashboardContent) {
        console.warn('⚠️ Dashboard não encontrado, não é possível limpar');
        return;
    }
    
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
        };
    }
    
    // 1. Limpar todas as tabelas - MODO SEGURO (remove linhas, não innerHTML)
    const tabelasParaLimpar = [
        '#renda tbody',
        '#despesa tbody',
        '#invest tbody'
    ];
    
    tabelasParaLimpar.forEach(seletor => {
        const tabela = document.querySelector(seletor);
        if (tabela) {
            // Remover linha por linha ao invés de innerHTML = ''
            while (tabela.firstChild) {
                tabela.removeChild(tabela.firstChild);
            }
        }
    });
    
    // 2. Limpar totais
    const totaisParaZerar = ['totalRenda', 'totalDespesa', 'saldo', 'totalInvest'];
    totaisParaZerar.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.textContent = 'R$ 0,00';
        }
    });
    
    // 3. Adicionar linhas vazias para edição
    setTimeout(() => {
        isCleaning = false;
        
        // Restaurar calc()
        if (typeof originalCalc === 'function') {
            window.calc = originalCalc;
            
            // Adicionar uma linha vazia em cada tabela
            if (typeof window.addRow === 'function') {
                try {
                    window.addRow('renda', '', 0);
                    window.addRow('despesa', '', 0);
                } catch (e) {
                    console.log('ℹ️ Erro ao adicionar linhas vazias:', e.message);
                }
            }
            
            // Adicionar linha vazia de investimento
            if (typeof window.addInvest === 'function') {
                try {
                    window.addInvest('', 0, 0);
                } catch (e) {
                    console.log('ℹ️ Erro ao adicionar investimento vazio:', e.message);
                }
            }
            
            // Executar calc() para atualizar tudo
            if (typeof window.calc === 'function') {
                window.calc();
            }
        }
        
        // RETOMAR auto-save após limpeza
        setTimeout(() => {
            retomarAutoSave();
        }, 500);
    }, 100);
}

// ============================================
// FUNÇÕES PARA COLETAR E APLICAR DADOS
// ============================================

/**
 * Coletar dados da interface
 */
function collectDashboardData() {
    
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
    
    return data;
}

/**
 * Aplicar dados na interface - CORRIGIDA: FORÇA ATUALIZAÇÃO
 */
function applyDashboardData(data) {
    console.log('🔄 Aplicando dados na interface...');
    
    // Marcar que está aplicando dados (bloqueia auto-save)
    window.isApplyingData = true;
    
    if (!data) {
        console.log('ℹ️ Nenhum dado para aplicar');
        window.isApplyingData = false;
        return;
    }
    
    // Verificar se o dashboard existe
    const dashboardContent = document.getElementById('dashboardContent');
    if (!dashboardContent) {
        console.warn('⚠️ Dashboard não encontrado, não é possível aplicar dados');
        console.warn('⚠️ Aguardando dashboard estar pronto...');
        
        // Tentar novamente após 500ms
        setTimeout(() => {
            if (document.getElementById('dashboardContent')) {
                console.log('✅ Dashboard pronto, aplicando dados agora...');
                applyDashboardData(data);
            } else {
                console.error('❌ Dashboard ainda não está pronto após espera');
            }
        }, 500);
        return;
    }
    
    // Verificar se dashboard já tem dados (não precisa limpar)
    const rendaTbody = document.querySelector('#renda tbody');
    const despesaTbody = document.querySelector('#despesa tbody');
    
    // Se já tem linhas, limpar antes de aplicar novos dados
    const temDados = rendaTbody && rendaTbody.children.length > 0;
    
    if (temDados) {
        console.log('🧹 Limpando dados antigos...');
        limparInterfaceDashboard();
    }
    
    // Esperar um pouco para garantir que a limpeza terminou (se necessário)
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
            
            // Desmarcar flag de aplicação
            window.isApplyingData = false;
        }, 200);
    }, 300);
}

// ============================================
// CONTROLE DE HUD
// ============================================

/**
 * Bloquear interação com HUD durante carregamento
 */
function bloquearHUD() {
    hudBloqueado = true;
    console.log('🔒 HUD BLOQUEADO - Carregando dados');
    const hud = document.getElementById('hud-periodo-container');
    if (hud) {
        // Ocultar completamente
        hud.style.display = 'none';
        hud.style.visibility = 'hidden';
        hud.style.opacity = '0';
        hud.style.pointerEvents = 'none';
        
        // Desabilitar selects e botões
        const selects = hud.querySelectorAll('select, button');
        selects.forEach(el => {
            el.disabled = true;
            el.setAttribute('disabled', 'disabled');
        });
    }
}

/**
 * Desbloquear interação com HUD
 */
function desbloquearHUD() {
    hudBloqueado = false;
    console.log('🔓 HUD DESBLOQUEADO - Pronto para usar');
    const hud = document.getElementById('hud-periodo-container');
    if (hud) {
        // Mostrar novamente
        hud.style.display = 'flex';
        hud.style.visibility = 'visible';
        hud.style.opacity = '1';
        hud.style.pointerEvents = 'auto';
        
        // Habilitar selects e botões
        const selects = hud.querySelectorAll('select, button');
        selects.forEach(el => {
            el.disabled = false;
            el.removeAttribute('disabled');
        });
    }
}

/**
 * Esconder HUD durante carregamento inicial
 */
function esconderHUD() {
    const hud = document.getElementById('hud-periodo-container');
    if (hud) {
        hud.style.display = 'none';
        hud.style.visibility = 'hidden';
    }
}

/**
 * Mostrar HUD quando carregamento acabar
 */
function mostrarHUD() {
    const hud = document.getElementById('hud-periodo-container');
    if (hud) {
        hud.style.display = 'flex';
        hud.style.visibility = 'visible';
    }
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
        // 🛑 Bloquear se já está carregando
        if (isLoadingFromServer || hudBloqueado) {
            console.log('⏭️ Mudança de ano bloqueada - carregamento em andamento');
            selectAno.value = anoSelecionado; // Reverter valor
            return;
        }
        
        anoSelecionado = parseInt(this.value);
        labelPeriodo.textContent = getPeriodoFormatado();
        modoPeriodoAtivo = true;
        btnModo.style.background = '#10b981';
        
        // FORÇAR SALVAMENTO ANTES DE MUDAR DE ANO
        if (alteracoesNaoSalvas) {
            console.log('💾 Forçando salvamento ao mudar de ano...');
            saveDashboardToSupabase(true);
        }
        
        // CARREGAR novo ano
        console.log(`📅 Carregando ano: ${anoSelecionado}`);
        carregarMesEspecifico(anoSelecionado, mesSelecionado);
    });
    
    selectMes.addEventListener('change', function() {
        // 🛑 Bloquear se já está carregando
        if (isLoadingFromServer || hudBloqueado) {
            console.log('⏭️ Mudança de mês bloqueada - carregamento em andamento');
            selectMes.value = mesSelecionado; // Reverter valor
            return;
        }
        
        mesSelecionado = parseInt(this.value);
        labelPeriodo.textContent = getPeriodoFormatado();
        modoPeriodoAtivo = true;
        btnModo.style.background = '#10b981';
        
        // FORÇAR SALVAMENTO ANTES DE MUDAR DE MÊS
        if (alteracoesNaoSalvas) {
            console.log('💾 Forçando salvamento ao mudar de mês...');
            saveDashboardToSupabase(true);
        }
        
        // CARREGAR novo mês
        console.log(`📅 Carregando mês: ${mesSelecionado}`);
        carregarMesEspecifico(anoSelecionado, mesSelecionado);
    });
    
    btnCarregar.addEventListener('click', async function() {
        // 🛑 Bloquear se já está carregando
        if (isLoadingFromServer || hudBloqueado) {
            console.log('⏭️ Carregamento bloqueado - operação em andamento');
            return;
        }
        
        const originalHTML = this.innerHTML;
        this.disabled = true;
        this.innerHTML = '📥 Carregando...';
        this.style.background = '#6b7280';
        
        try {
            // Bloquear HUD antes de carregar
            bloquearHUD();
            
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
        
        // Manter bloqueado por 2 segundos e depois desbloquear
        // MAS: Só desbloquear se não estiver em carregamento de mês (isLoadingFromServer será true)
        setTimeout(() => {
            this.innerHTML = originalHTML;
            this.style.background = '#3b82f6';
            this.disabled = false;
            // Só desbloquear se não estiver carregando de outro lugar
            if (!isLoadingFromServer && !hudBloqueado) {
                desbloquearHUD();
            }
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
    
    // Verificar se document.body existe
    if (!document.body) {
        console.warn('⚠️ document.body não existe, não foi possível mostrar erro');
        return;
    }
    
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
    // Verificar se document.body existe
    if (!document.body) {
        console.warn('⚠️ document.body não existe, não foi possível mostrar sucesso');
        return;
    }
    
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
    
    setTimeout(() => {
        if (successDiv && successDiv.parentElement) {
            successDiv.remove();
        }
    }, 3000);
}

function showInfo(message) {
    // Verificar se document.body existe
    if (!document.body) {
        console.warn('⚠️ document.body não existe, não foi possível mostrar info');
        return;
    }
    
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
    
    // RESETAR flag de carregamento inicial
    isLoadingInitialData = true;
    
    setTimeout(async () => {
        try {
            const supabase = getSupabase();
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
                console.log('🌐 Usuário logado');
                
                // Configurar callbacks do Connection Monitor
                setupConnectionMonitorCallbacks();
                
                // Tentar restaurar dados de backup local se houver
                try {
                    await ConnectionMonitor.restoreFromBackup();
                } catch (error) {
                    console.log('ℹ️ Nenhum backup para restaurar');
                }
                
                if (window.location.hash.includes('dashboard') || 
                    document.querySelector('[data-page="dashboard"]')) {
                    
                    // Criar HUD
                    console.log('🎮 Criando HUD...');
                    criarHUDAnoMes();
                    
                    // Carregar dados do servidor (irá popular automaticamente)
                    console.log('📊 Carregando dados...');
                    await loadDashboardFromSupabase(true);
                    
                    // LIBERAR AUTO-SAVE E INICIALIZAR APÓS CARREGAR OS DADOS
                    setTimeout(() => {
                        // Só desbloquear se não estiver em carregamento de mês
                        if (!isLoadingFromServer) {
                            isLoadingInitialData = false;
                            console.log('✅ Carregamento inicial concluído - auto-save liberado');
                            configurarAutoSave();
                            
                            // 👁️ Mostrar HUD agora que carregamento terminou
                            mostrarHUD();
                            desbloquearHUD();
                        }
                    }, 5000); // 5 segundos para garantir que tudo foi aplicado
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

/**
 * Limpar recursos ao fazer logout
 */
window.limparRecursos = function() {
    console.log('🧹 Limpando recursos...');
    
    // Limpar auto-save timeout
    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = null;
    }
    
    // Limpar interval periódico
    if (window.periodicSaveInterval) {
        clearInterval(window.periodicSaveInterval);
        window.periodicSaveInterval = null;
    }
    
    // Resetar flags
    autoSaveConfigurado = false;
    alteracoesNaoSalvas = false;
    isSavingToSupabase = false;
    
    console.log('✅ Recursos limpos');
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

// ============================================
// INTEGRAÇÃO COM CONNECTION MONITOR
// ============================================

/**
 * Configurar callbacks do Connection Monitor
 */
function setupConnectionMonitorCallbacks() {
    if (typeof ConnectionMonitor === 'undefined') {
        console.warn('⚠️ ConnectionMonitor não disponível');
        return;
    }
    
    // Quando a conexão é perdida
    ConnectionMonitor.onConnectionLost = async function() {
        console.log('⚠️ Conexão perdida - ativando modo offline');
        mostrarNotificacaoDesconexao();
        
        // Se houver alterações, tentar salvar em localStorage
        if (alteracoesNaoSalvas) {
            const dadosBackup = collectDashboardData();
            localStorage.setItem('dashboardBackup', JSON.stringify({
                data: dadosBackup,
                timestamp: new Date().toISOString(),
                periodo: getPeriodoParaBanco()
            }));
            console.log('💾 Dados salvos em backup local');
        }
    };
    
    // Quando a conexão é restaurada
    ConnectionMonitor.onConnectionRestored = async function() {
        console.log('✅ Conexão restaurada - sincronizando...');
        removerNotificacaoDesconexao();
        
        // Tentar restaurar dados de backup
        const backupRestaurado = await ConnectionMonitor.restoreFromBackup();
        
        // Se houver dados em backup local
        if (!backupRestaurado) {
            const backupLocal = localStorage.getItem('dashboardBackup');
            if (backupLocal) {
                try {
                    const backup = JSON.parse(backupLocal);
                    const agora = new Date();
                    const timeBackup = new Date(backup.timestamp);
                    
                    // Se backup foi criado recentemente (últimos 30 min)
                    if (agora - timeBackup < 30 * 60 * 1000) {
                        console.log('🔄 Restaurando dados do backup local...');
                        applyDashboardData(backup.data);
                        
                        // Salvar no Supabase
                        await saveDashboardToSupabase(true);
                        localStorage.removeItem('dashboardBackup');
                    }
                } catch (error) {
                    console.error('Erro ao restaurar backup:', error);
                }
            }
        }
        
        // Recarregar dados do Supabase
        try {
            await loadDashboardFromSupabase(true);
            showSuccess('✅ Dados sincronizados!');
        } catch (error) {
            console.error('Erro ao sincronizar:', error);
        }
    };
    
    console.log('✅ Callbacks do Connection Monitor configurados');
}

/**
 * Mostrar notificação de desconexão
 */
let notificacaoDesconexao = null;
function mostrarNotificacaoDesconexao() {
    if (notificacaoDesconexao) return;
    
    notificacaoDesconexao = document.createElement('div');
    notificacaoDesconexao.id = 'notificacao-desconexao';
    notificacaoDesconexao.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #ef4444;
        color: white;
        padding: 12px 20px;
        text-align: center;
        font-weight: 600;
        z-index: 10000;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    notificacaoDesconexao.innerHTML = '📴 Sem conexão - tentando reconectar...';
    document.body.appendChild(notificacaoDesconexao);
    
    // Adicionar margem ao body para não sobrepor conteúdo
    if (document.body) {
        document.body.style.paddingTop = '50px';
    }
}

/**
 * Remover notificação de desconexão
 */
function removerNotificacaoDesconexao() {
    if (notificacaoDesconexao && notificacaoDesconexao.parentElement) {
        notificacaoDesconexao.remove();
        notificacaoDesconexao = null;
    }
    
    if (document.body) {
        document.body.style.paddingTop = '0';
    }
}

console.log('✅ supabase-data.js (com correção de constraint) pronto!');