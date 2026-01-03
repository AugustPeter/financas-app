// js/supabase-config.js
console.log('🔧 Configurando Supabase...');

// SUAS CREDENCIAIS - SUBSTITUA COM AS DO SEU PROJETO
const SUPABASE_URL = 'https://htixncglyuabopewnwpg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0aXhuY2dseXVhYm9wZXdud3BnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzIyMjcsImV4cCI6MjA4Mjk0ODIyN30.DuCO2Cv7j9vYBGyNMCWEtagAVrKv9uCTJoNXA1jMCa0';

// Verificar se credenciais estão presentes
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || 
    SUPABASE_URL.includes('xxxx') || 
    SUPABASE_ANON_KEY.includes('...')) {
  console.error('❌ ERRO: Configure suas credenciais do Supabase em supabase-config.js');
  console.error('URL:', SUPABASE_URL);
  console.error('Key (primeiros chars):', SUPABASE_ANON_KEY?.substring(0, 20));
  
  // Usar valores de teste (vão falhar, mas pelo menos não quebra)
  window.supabaseClient = null;
} else {
  try {
    // Criar cliente Supabase
    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    
    console.log('✅ Supabase configurado com sucesso!');
    console.log('URL:', SUPABASE_URL);
    
    // Testar conexão
    testConnection();
    
  } catch (error) {
    console.error('❌ Erro ao configurar Supabase:', error);
    window.supabaseClient = null;
  }
}

// Função para testar conexão
async function testConnection() {
  if (!window.supabaseClient) {
    console.warn('⚠️ Supabase client não disponível');
    return;
  }
  
  try {
    console.log('🔗 Testando conexão com Supabase...');
    
    const { data, error } = await window.supabaseClient.auth.getSession();
    
    if (error) {
      console.warn('⚠️ Erro na sessão (pode ser normal):', error.message);
    } else {
      console.log('✅ Conexão estabelecida!');
      console.log('Sessão ativa:', data.session ? 'Sim' : 'Não');
    }
  } catch (err) {
    console.error('❌ Erro no teste de conexão:', err.message);
  }
}

// Exportar para uso em outros arquivos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { supabase: window.supabaseClient };
}