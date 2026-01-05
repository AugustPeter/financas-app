// js/supabase-config.js
const SUPABASE_URL = 'https://htixncglyuabopewnwpg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0aXhuY2dseXVhYm9wZXdud3BnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzIyMjcsImV4cCI6MjA4Mjk0ODIyN30.DuCO2Cv7j9vYBGyNMCWEtagAVrKv9uCTJoNXA1jMCa0';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  window.supabase = null;
} else {
  window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
}
