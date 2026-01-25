// js/supabase-config.js
// ⚠️ NOTA: Em produção, estas chaves devem vir de variáveis de ambiente
// A chave "anon" é segura para client-side, mas configure RLS no Supabase!

const SUPABASE_URL = 'https://htixncglyuabopewnwpg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0aXhuY2dseXVhYm9wZXdud3BnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzIyMjcsImV4cCI6MjA4Mjk0ODIyN30.DuCO2Cv7j9vYBGyNMCWEtagAVrKv9uCTJoNXA1jMCa0';

// Flag para indicar se Supabase está pronto
window.supabaseReady = false;

// Aguardar Supabase carregar (pode demorar com defer)
function initSupabase() {
  if (typeof supabase === 'undefined') {
    console.warn('⏳ Aguardando Supabase carregar...');
    setTimeout(initSupabase, 100);
    return;
  }
  
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Configuração Supabase ausente');
    window.supabase = null;
    return;
  }
  
  try {
    window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    
    window.supabaseReady = true;
    console.log('✅ Supabase inicializado');
    window.dispatchEvent(new Event('supabaseReady'));
  } catch (error) {
    console.error('❌ Erro ao inicializar Supabase:', error);
    window.supabase = null;
  }
}

// Iniciar quando DOM carregar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSupabase);
} else {
  initSupabase();
}

console.log('✅ supabase-config.js carregado');