// js/supabase-config.js
console.log('🔧 Configurando Supabase...');

const SUPABASE_URL = 'https://htixncglyuabopewnwpg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0aXhuY2dseXVhYm9wZXdud3BnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzIyMjcsImV4cCI6MjA4Mjk0ODIyN30.DuCO2Cv7j9vYBGyNMCWEtagAVrKv9uCTJoNXA1jMCa0';

// Verificação básica
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Credenciais do Supabase não configuradas');
  window.supabase = null;
} else {
  try {
    window.supabase = supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );

    console.log('✅ Supabase pronto');
  } catch (err) {
    console.error('❌ Erro ao criar client:', err);
    window.supabase = null;
  }
}
