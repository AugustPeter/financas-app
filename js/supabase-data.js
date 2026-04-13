/**
 * supabase-data.js - Gerenciamento de Dados com Supabase
 * Versão otimizada e limpa
 */

// ============================================
// ESTADO CENTRALIZADO
// ============================================

const AppState = {
  // Período
  ano: new Date().getFullYear(),
  mes: new Date().getMonth() + 1,
  
  // Flags
  isLoading: false,
  isSaving: false,
  isApplyingData: false,
  alteracoesNaoSalvas: false,
  autoSaveConfigurado: false,
  
  // Timers
  autoSaveTimeout: null,
  
  // Constantes
  DEBOUNCE_DELAY: 800,
  MESES: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
          'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
  MESES_DISPLAY: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
};

// Compatibilidade com código legado
Object.defineProperty(window, 'anoSelecionado', { get: () => AppState.ano, set: v => AppState.ano = v });
Object.defineProperty(window, 'mesSelecionado', { get: () => AppState.mes, set: v => AppState.mes = v });
Object.defineProperty(window, 'alteracoesNaoSalvas', { get: () => AppState.alteracoesNaoSalvas, set: v => AppState.alteracoesNaoSalvas = v });
Object.defineProperty(window, 'isLoadingFromServer', { get: () => AppState.isLoading, set: v => AppState.isLoading = v });

// ============================================
// HELPERS
// ============================================

const getSupabase = () => {
  if (!window.supabase) throw new Error('Supabase não configurado');
  return window.supabase;
};

const getPeriodoParaBanco = () => `${AppState.MESES[AppState.mes - 1]}-${AppState.ano}`.toLowerCase();
const getPeriodoFormatado = () => `${AppState.MESES_DISPLAY[AppState.mes - 1]} de ${AppState.ano}`;

const escapeHTML = (str) => {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
};

// ============================================
// MENSAGENS
// ============================================

const showMessage = (message, type = 'info') => {
  if (!document.body) return;
  
  const colors = { error: '#ef4444', success: '#10b981', info: '#3b82f6' };
  const icons = { error: '✕', success: '✓', info: 'ℹ' };
  
  const div = document.createElement('div');
  div.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: ${colors[type] || colors.info};
    color: white;
    padding: 14px 20px;
    border-radius: 12px;
    z-index: 9999;
    max-width: 320px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.25);
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 500;
    animation: slideIn 0.3s ease;
  `;
  div.innerHTML = `<span style="font-size:18px">${icons[type] || icons.info}</span><span>${escapeHTML(message)}</span>`;
  document.body.appendChild(div);
  
  setTimeout(() => {
    div.style.opacity = '0';
    div.style.transform = 'translateX(20px)';
    setTimeout(() => div.remove(), 300);
  }, type === 'error' ? 5000 : 3000);
};

const showError = msg => showMessage(msg, 'error');
const showSuccess = msg => showMessage(msg, 'success');
const showInfo = msg => showMessage(msg, 'info');

// ============================================
// AUTO-SAVE
// ============================================

function dispararAutoSave() {
  if (AppState.isLoading || AppState.isSaving || AppState.isApplyingData) return;
  
  AppState.alteracoesNaoSalvas = true;
  atualizarStatusHUD();
  
  clearTimeout(AppState.autoSaveTimeout);
  AppState.autoSaveTimeout = setTimeout(async () => {
    if (navigator.onLine && !AppState.isSaving) {
      const result = await saveDashboardToSupabase();
      if (result.success) {
        AppState.alteracoesNaoSalvas = false;
        atualizarStatusHUD();
      }
    }
  }, AppState.DEBOUNCE_DELAY);
}

function configurarAutoSave() {
  if (AppState.autoSaveConfigurado || AppState.isLoading) return;
  
  // Observer para novos inputs
  const observer = new MutationObserver(() => {
    document.querySelectorAll('#renda input, #despesa input, #invest input').forEach(input => {
      if (!input._autoSaveAttached) {
        input.addEventListener('input', dispararAutoSave);
        input._autoSaveAttached = true;
      }
    });
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Salvar ao sair da página
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && AppState.alteracoesNaoSalvas) {
      saveDashboardToSupabase();
    }
  });
  
  AppState.autoSaveConfigurado = true;
}

// ============================================
// SALVAR DADOS
// ============================================

async function saveDashboardToSupabase(forcar = false) {
  if (AppState.isSaving) return { success: false, error: 'Salvamento em andamento' };
  
  AppState.isSaving = true;
  
  try {
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Faça login');
    
    const userId = session.user.id;
    const periodo = getPeriodoParaBanco();
    const dashboardData = collectDashboardData();
    
    dashboardData.periodo_info = {
      ano: AppState.ano,
      mes: AppState.mes,
      periodo_formatado: getPeriodoFormatado(),
      salvo_em: new Date().toISOString()
    };
    
    const dadosParaSalvar = {
      user_id: userId,
      month: periodo,
      data: dashboardData,
      updated_at: new Date().toISOString()
    };
    
    // Upsert
    const { data: existing } = await supabase
      .from('finance_data')
      .select('id')
      .eq('user_id', userId)
      .eq('month', periodo)
      .maybeSingle();
    
    if (existing) {
      const { error } = await supabase
        .from('finance_data')
        .update(dadosParaSalvar)
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('finance_data')
        .insert(dadosParaSalvar);
      if (error) throw error;
    }
    
    AppState.alteracoesNaoSalvas = false;
    atualizarStatusHUD();
    
    if (forcar) showSuccess(`Salvo: ${getPeriodoFormatado()}`);
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Erro ao salvar:', error);
    if (forcar) showError(`Erro: ${error.message}`);
    return { success: false, error: error.message };
  } finally {
    setTimeout(() => AppState.isSaving = false, 300);
  }
}

// ============================================
// CARREGAR DADOS
// ============================================

async function loadDashboardFromSupabase() {
  return carregarMesEspecifico(AppState.ano, AppState.mes);
}

async function carregarMesEspecifico(ano, mes) {
  if (AppState.isLoading) {
    showInfo('Aguarde...');
    return { success: false };
  }
  
  AppState.isLoading = true;
  setHUDVisibility(false);
  
  try {
    // Salvar alterações pendentes
    if (AppState.alteracoesNaoSalvas && !AppState.isSaving) {
      await saveDashboardToSupabase(true);
      await new Promise(r => setTimeout(r, 200));
    }
    
    AppState.ano = ano;
    AppState.mes = mes;
    
    limparInterface();
    
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Faça login');
    
    const { data, error } = await supabase
      .from('finance_data')
      .select('data')
      .eq('user_id', session.user.id)
      .eq('month', getPeriodoParaBanco())
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    
    if (!data) {
      adicionarLinhasVazias();
      return { success: true, empty: true };
    }
    
    aplicarDados(data.data);
    
    setTimeout(configurarAutoSave, 500);
    
    return { success: true, data: data.data };
    
  } catch (error) {
    console.error('❌ Erro ao carregar:', error);
    showError(`Erro: ${error.message}`);
    adicionarLinhasVazias();
    return { success: false, error: error.message };
  } finally {
    await new Promise(r => setTimeout(r, 200));
    AppState.isLoading = false;
    setHUDVisibility(true);
  }
}

// ============================================
// INTERFACE
// ============================================

function limparInterface() {
  AppState.alteracoesNaoSalvas = false;
  
  ['#renda tbody', '#despesa tbody', '#invest tbody'].forEach(sel => {
    const el = document.querySelector(sel);
    if (el) el.innerHTML = '';
  });
  
  ['totalRenda', 'totalDespesa', 'saldo', 'totalInvest'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = 'R$ 0,00';
  });
}

function adicionarLinhasVazias() {
  if (window.addRow) {
    try { window.addRow('renda', '', 0); } catch(e) {}
    try { window.addRow('despesa', '', 0, false); } catch(e) {}
  }
  if (window.addInvest) {
    try { window.addInvest('', 0, 0); } catch(e) {}
  }
  if (window.calc) window.calc();
}

function aplicarDados(data) {
  if (!data) {
    adicionarLinhasVazias();
    return;
  }
  
  AppState.isApplyingData = true;
  
  const originalCalc = window.calc;
  window.calc = () => {};
  
  // Rendas
  (data.rendas?.length ? data.rendas : [{ descricao: '', valor: 0 }]).forEach(item => {
    window.addRow?.('renda', item.descricao, item.valor);
  });
  
  // Despesas
  (data.despesas?.length ? data.despesas : [{ descricao: '', valor: 0 }]).forEach(item => {
    window.addRow?.('despesa', item.descricao, item.valor, item.pago);
  });
  
  // Investimentos
  (data.investimentos?.length ? data.investimentos : [{ nome: '', aporte: 0, meta: 0 }]).forEach(item => {
    window.addInvest?.(item.nome, item.aporte, item.meta);
  });
  
  window.calc = originalCalc;
  originalCalc?.();
  
  AppState.isApplyingData = false;
}

function limparInterfaceDashboard(addEmpty = true) {
  limparInterface();
  if (addEmpty) adicionarLinhasVazias();
}

// ============================================
// COLETA DE DADOS
// ============================================

function collectDashboardData() {
  const data = {
    rendas: [],
    despesas: [],
    investimentos: [],
    totais: {},
    ultima_atualizacao: new Date().toISOString()
  };
  
  // Rendas
  document.querySelectorAll('#renda tbody tr').forEach(row => {
    const inputs = row.querySelectorAll('input');
    if (inputs.length >= 2) {
      const descricao = (inputs[0].value || '').trim();
      const valor = parseFloat(inputs[1].value) || 0;
      if (descricao || valor > 0) {
        data.rendas.push({ descricao, valor });
      }
    }
  });
  
  // Despesas
  document.querySelectorAll('#despesa tbody tr').forEach(row => {
    const inputs = row.querySelectorAll('input');
    const checkbox = row.querySelector('input[type="checkbox"]');
    if (inputs.length >= 2) {
      const descricao = (inputs[0].value || '').trim();
      const valor = parseFloat(inputs[1].value) || 0;
      if (descricao || valor > 0) {
        data.despesas.push({ descricao, valor, pago: checkbox?.checked || false });
      }
    }
  });
  
  // Investimentos
  document.querySelectorAll('#invest tbody tr').forEach(row => {
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
  
  // Totais
  const getValue = id => {
    const el = document.getElementById(id);
    if (!el) return 0;
    return parseFloat(el.textContent.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
  };
  
  data.totais = {
    renda: getValue('totalRenda'),
    despesa: getValue('totalDespesa'),
    saldo: getValue('saldo')
  };
  
  return data;
}

// ============================================
// HUD
// ============================================

function setHUDVisibility(visible) {
  const hud = document.getElementById('hud-periodo-container');
  if (hud) {
    hud.style.opacity = visible ? '1' : '0.5';
    hud.style.pointerEvents = visible ? 'auto' : 'none';
    hud.querySelectorAll('select, button').forEach(el => el.disabled = !visible);
  }
}

function atualizarStatusHUD() {
  const btn = document.getElementById('hud-btn-salvar');
  if (!btn) return;
  
  const online = typeof ConnectionMonitor !== 'undefined' ? ConnectionMonitor.isConnectedToSupabase : navigator.onLine;
  
  if (!online) {
    btn.innerHTML = '📴 Offline';
    btn.style.background = '#ef4444';
  } else if (AppState.alteracoesNaoSalvas) {
    btn.innerHTML = '💾 Salvar';
    btn.style.background = '#f59e0b';
  } else {
    btn.innerHTML = '✓ Salvo';
    btn.style.background = '#10b981';
  }
}

function criarHUDAnoMes() {
  if (document.getElementById('hud-periodo-container')) {
    atualizarHUDAnoMes();
    return;
  }
  
  const hud = document.createElement('div');
  hud.id = 'hud-periodo-container';
  hud.style.cssText = `
    position: fixed;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 12px 24px;
    border-radius: 16px;
    z-index: 9998;
    display: flex;
    align-items: center;
    gap: 16px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.25);
    transition: all 0.3s ease;
  `;
  
  const selectStyle = `
    padding: 10px 32px 10px 14px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.2);
    background: #1e293b url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='white' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E") no-repeat right 10px center;
    color: white;
    font-weight: 600;
    cursor: pointer;
    -webkit-appearance: none;
    appearance: none;
    font-size: 14px;
  `;
  
  // Ano
  const selectAno = document.createElement('select');
  selectAno.id = 'hud-select-ano';
  selectAno.style.cssText = selectStyle;
  for (let ano = 2020; ano <= 2030; ano++) {
    const opt = document.createElement('option');
    opt.value = ano;
    opt.textContent = ano;
    opt.style.cssText = 'background: #1e293b; color: white;';
    if (ano === AppState.ano) opt.selected = true;
    selectAno.appendChild(opt);
  }
  
  // Mês
  const selectMes = document.createElement('select');
  selectMes.id = 'hud-select-mes';
  selectMes.style.cssText = selectStyle;
  AppState.MESES_DISPLAY.forEach((mes, i) => {
    const opt = document.createElement('option');
    opt.value = i + 1;
    opt.textContent = mes;
    opt.style.cssText = 'background: #1e293b; color: white;';
    if (i + 1 === AppState.mes) opt.selected = true;
    selectMes.appendChild(opt);
  });
  
  // Label
  const label = document.createElement('div');
  label.id = 'hud-label-periodo';
  label.textContent = getPeriodoFormatado();
  label.style.cssText = 'font-weight: 700; font-size: 15px; min-width: 140px; text-align: center;';
  
  // Botão salvar
  const btnSalvar = document.createElement('button');
  btnSalvar.id = 'hud-btn-salvar';
  btnSalvar.innerHTML = '✓ Salvo';
  btnSalvar.style.cssText = `
    background: #10b981;
    color: white;
    border: none;
    border-radius: 10px;
    padding: 10px 20px;
    cursor: pointer;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.2s;
  `;
  
  // Botão limpar
  const btnLimpar = document.createElement('button');
  btnLimpar.id = 'hud-btn-limpar';
  btnLimpar.innerHTML = '🗑️';
  btnLimpar.title = 'Limpar tela';
  btnLimpar.style.cssText = `
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 10px;
    padding: 10px 14px;
    cursor: pointer;
    font-size: 16px;
    transition: all 0.2s;
  `;
  
  hud.append(selectAno, selectMes, label, btnSalvar, btnLimpar);
  document.body.appendChild(hud);
  
  // Eventos
  const handleChange = async () => {
    if (AppState.isLoading) return;
    const novoAno = parseInt(selectAno.value);
    const novoMes = parseInt(selectMes.value);
    if (novoAno === AppState.ano && novoMes === AppState.mes) return;
    await carregarMesEspecifico(novoAno, novoMes);
    label.textContent = getPeriodoFormatado();
  };
  
  selectAno.addEventListener('change', handleChange);
  selectMes.addEventListener('change', handleChange);
  
  btnSalvar.addEventListener('click', async () => {
    if (!AppState.isSaving) await saveDashboardToSupabase(true);
  });
  
  btnLimpar.addEventListener('click', () => {
    if (confirm(`Limpar dados de ${getPeriodoFormatado()}?`)) {
      limparInterfaceDashboard();
      showInfo('Tela limpa');
    }
  });
  
  // Hover effects
  [btnSalvar, btnLimpar].forEach(btn => {
    btn.addEventListener('mouseenter', () => btn.style.transform = 'scale(1.05)');
    btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1)');
  });
  
  atualizarStatusHUD();
}

function atualizarHUDAnoMes() {
  const selectAno = document.getElementById('hud-select-ano');
  const selectMes = document.getElementById('hud-select-mes');
  const label = document.getElementById('hud-label-periodo');
  
  if (selectAno) selectAno.value = AppState.ano;
  if (selectMes) selectMes.value = AppState.mes;
  if (label) label.textContent = getPeriodoFormatado();
  
  atualizarStatusHUD();
}

// ============================================
// INICIALIZAÇÃO
// ============================================

async function initSupabaseData() {
  try {
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('⏳ Aguardando login...');
      return;
    }
    
    // Aguardar dashboard
    await new Promise(resolve => {
      const check = () => {
        if (document.querySelector('#renda tbody')) resolve();
        else setTimeout(check, 100);
      };
      check();
    });
    
    criarHUDAnoMes();
    await loadDashboardFromSupabase();
    
    setTimeout(() => {
      configurarAutoSave();
      setHUDVisibility(true);
    }, 500);
    
  } catch (error) {
    console.error('❌ Erro na inicialização:', error);
  }
}

// Timeout de segurança para overlay
window.addEventListener('load', () => {
  setTimeout(() => {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay && overlay.style.display !== 'none') {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.style.display = 'none', 300);
    }
  }, 10000);
});

// Inicializar
window.initSupabaseData = initSupabaseData;
document.addEventListener('DOMContentLoaded', () => setTimeout(initSupabaseData, 500));

// ============================================
// EXPORTAR
// ============================================

window.limparDashboard = limparInterfaceDashboard;
window.carregarMesEspecifico = carregarMesEspecifico;
window.salvarMesEspecifico = async (ano, mes) => {
  AppState.ano = ano;
  AppState.mes = mes;
  atualizarHUDAnoMes();
  return saveDashboardToSupabase(true);
};
window.collectDashboardData = collectDashboardData;
window.applyDashboardData = aplicarDados;
window.atualizarStatusNaoSalvasHUD = atualizarStatusHUD;
window.saveDashboardToSupabase = saveDashboardToSupabase;
window.dispararAutoSave = dispararAutoSave;
window.limparRecursos = () => {
  clearTimeout(AppState.autoSaveTimeout);
  AppState.autoSaveConfigurado = false;
  AppState.alteracoesNaoSalvas = false;
};

// CSS animações
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }
`;
document.head.appendChild(style);

console.log('✅ supabase-data.js carregado');
