// ============================================
// CONFIGURAÇÃO SUPABASE - VERSÃO FINAL SEGURA
// ============================================
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ⚠️ SUAS CREDENCIAIS AQUI ⚠️
const SUPABASE_URL = 'https://htixncglyuabopewnwpg.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0aXhuY2dseXVhYm9wZXdud3BnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzIyMjcsImV4cCI6MjA4Mjk0ODIyN30.DuCO2Cv7j9vYBGyNMCWEtagAVrKv9uCTJoNXA1jMCa0';

// ============================================
// DETECÇÃO AUTOMÁTICA DE AMBIENTE
// ============================================
const isLocalDevelopment = 
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '0.0.0.0' ||
  window.location.hostname === '' ||
  window.location.port === '5500' ||
  window.location.port === '3000' ||
  window.location.port === '8080';

// URL DINÂMICA - FUNCIONA AUTOMATICAMENTE
let SITE_URL;
let ENVIRONMENT;

if (isLocalDevelopment) {
  // DESENVOLVIMENTO LOCAL - PEGA AUTOMATICAMENTE
  const port = window.location.port || '5500';
  const hostname = window.location.hostname || '127.0.0.1';
  SITE_URL = `http://${hostname}:${port}`;
  ENVIRONMENT = 'development';
  console.log('🔧 Ambiente: DESENVOLVIMENTO LOCAL');
  console.log('🌐 Site URL detectada:', SITE_URL);
} else {
  // PRODUÇÃO - USE QUALQUER URL AQUI (não interfere no local)
  SITE_URL = 'https://financas-app.vercel.app'; // ← Pode deixar essa mesmo
  ENVIRONMENT = 'production';
  console.log('🚀 Ambiente: PRODUÇÃO');
  console.log('🌐 Site URL:', SITE_URL);
}

// ============================================
// SISTEMA DE ARMAZENAMENTO SEGURO
// ============================================
class SecureStorage {
  constructor() {
    this.currentUserId = null;
    this.isDemoMode = false;
  }
  
  // Gera chave única para cada usuário
  getStorageKey(baseKey) {
    if (this.isDemoMode) {
      return `demo_${baseKey}`; // Demo tem namespace próprio
    }
    if (this.currentUserId) {
      return `user_${this.currentUserId}_${baseKey}`; // Usuário logado
    }
    return `anonymous_${baseKey}`; // Anônimo (não deve acontecer)
  }
  
  // Salva dados de forma isolada
  setItem(key, value) {
    const secureKey = this.getStorageKey(key);
    localStorage.setItem(secureKey, JSON.stringify(value));
    console.log('💾 Salvo em:', secureKey);
  }
  
  // Recupera dados isolados
  getItem(key, defaultValue = null) {
    const secureKey = this.getStorageKey(key);
    const item = localStorage.getItem(secureKey);
    return item ? JSON.parse(item) : defaultValue;
  }
  
  // Remove dados do usuário atual
  clearUserData() {
    const prefix = this.isDemoMode ? 'demo_' : 
                   this.currentUserId ? `user_${this.currentUserId}_` : 'anonymous_';
    
    // Remove apenas as chaves deste usuário
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(prefix)) {
        localStorage.removeItem(key);
      }
    });
    
    console.log('🧹 Dados do usuário removidos');
  }
  
  // Migra dados antigos para novo formato
  migrateOldData() {
    const oldKeys = ['financeiro', 'financeGoals', 'lastSave'];
    
    oldKeys.forEach(oldKey => {
      const oldValue = localStorage.getItem(oldKey);
      if (oldValue) {
        this.setItem(oldKey, JSON.parse(oldValue));
        localStorage.removeItem(oldKey); // Remove formato antigo
      }
    });
  }
}

// Instância global do armazenamento seguro
const secureStorage = new SecureStorage();

// ============================================
// CLIENTE SUPABASE
// ============================================
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    siteURL: SITE_URL,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: {
      getItem: (key) => localStorage.getItem(key),
      setItem: (key, value) => localStorage.setItem(key, value),
      removeItem: (key) => localStorage.removeItem(key)
    },
    flowType: 'pkce'
  }
});

// ============================================
// FUNÇÕES DE DADOS COM ARMAZENAMENTO SEGURO
// ============================================

async function getDB() {
  // 1. Se for modo demo, só usa localStorage
  if (secureStorage.isDemoMode) {
    console.log('🎮 Modo demo - usando dados locais');
    return secureStorage.getItem('financeiro', {});
  }
  
  // 2. Se usuário logado, tenta buscar do Supabase
  if (currentUser) {
    try {
      console.log('🌐 Buscando dados do Supabase...');
      
      const { data, error } = await supabase
        .from('finance_data')
        .select('data')
        .eq('user_id', currentUser.id)
        .eq('month', mesAtual)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      // Se encontrou no Supabase
      if (data && data.data) {
        console.log('✅ Dados encontrados no Supabase');
        
        // Salva cópia local
        secureStorage.setItem('financeiro', data.data);
        secureStorage.setItem('lastServerSync', new Date().toISOString());
        
        return data.data;
      }
      
    } catch (error) {
      console.error('❌ Erro ao buscar do Supabase:', error);
    }
  }
  
  // 3. Fallback: usa localStorage
  console.log('📱 Usando dados locais (cache/offline)');
  return secureStorage.getItem('financeiro', {});
}

async function saveDB(db) {
  console.log('💾 Salvando dados...');
  
  // 1. Sempre salva localmente primeiro
  secureStorage.setItem('financeiro', db);
  secureStorage.setItem('lastSave', new Date().toISOString());
  
  // 2. Se for demo, para por aqui
  if (secureStorage.isDemoMode) {
    console.log('🎮 Modo demo - salvado apenas localmente');
    return true;
  }
  
  // 3. Se usuário logado, tenta salvar no Supabase
  if (currentUser) {
    try {
      const { error } = await supabase
        .from('finance_data')
        .upsert({
          user_id: currentUser.id,
          month: mesAtual,
          data: db,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,month'
        });
      
      if (error) throw error;
      
      console.log('✅ Dados salvos no Supabase');
      return true;
      
    } catch (error) {
      console.error('❌ Erro ao salvar no Supabase:', error);
      
      // Marca como pendente para sincronizar depois
      secureStorage.setItem('pendingSync', true);
      secureStorage.setItem('pendingData', db);
      
      return false;
    }
  }
  
  return false;
}

// ============================================
// FUNÇÃO DE DEMO (SEM LOGIN)
// ============================================

async function startDemoMode() {
  console.log('🚀 Iniciando modo demonstração...');
  
  // Configura storage para modo demo
  secureStorage.isDemoMode = true;
  secureStorage.currentUserId = null;
  
  // Cria dados de demonstração
  const demoData = {
    Janeiro: {
      renda: [
        ['Salário', '3000'],
        ['Freelance', '500']
      ],
      despesa: [
        ['Aluguel', '1000', false],
        ['Mercado', '400', true],
        ['Transporte', '200', false]
      ],
      invest: [
        ['Tesouro Direto', '500', '5000']
      ],
      saldo: 1900,
      updatedAt: new Date().toISOString()
    }
  };
  
  const demoGoals = [
    {
      goal: 'Viagem para praia',
      value: 2000,
      current: 500,
      createdAt: new Date().toISOString()
    },
    {
      goal: 'Notebook novo',
      value: 3500,
      current: 1200,
      createdAt: new Date().toISOString()
    }
  ];
  
  // Salva dados de demo
  secureStorage.setItem('financeiro', demoData);
  secureStorage.setItem('financeGoals', demoGoals);
  
  // Mostra app
  showToast('Modo demonstração ativado!', 'success');
  
  setTimeout(() => {
    showAppContent();
  }, 1000);
}

// ============================================
// INICIALIZAÇÃO SEGURA
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Inicializando...');
  console.log('📊 Ambiente:', ENVIRONMENT);
  console.log('🌐 URL:', SITE_URL);
  
  // 1. Migra dados antigos (se houver)
  secureStorage.migrateOldData();
  
  // 2. Tenta recuperar sessão do Supabase
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (!error && session) {
      // Usuário já logado
      currentUser = session.user;
      secureStorage.currentUserId = currentUser.id;
      secureStorage.isDemoMode = false;
      
      console.log('✅ Sessão recuperada:', currentUser.email);
      showAppContent();
      return;
    }
  } catch (error) {
    console.error('❌ Erro ao verificar sessão:', error);
  }
  
  // 3. Se não tem sessão, mostra tela de login
  showAuthScreen();
});