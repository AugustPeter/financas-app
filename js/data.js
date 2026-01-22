// js/data.js - OTIMIZADO - Apenas funções realmente necessárias
// Removido: getDB, saveDB, loadMonth do localStorage (substituído por Supabase)
// Mantido: Apenas utilitários globais ainda usados

// Helper para capitalizar primeira letra
function capitalizeFirst(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Toast Notification
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  
  toast.textContent = message;
  toast.className = 'toast';
  
  // Cor baseada no tipo
  if (type === 'success') {
    toast.style.borderLeft = '4px solid #10b981';
  } else if (type === 'error') {
    toast.style.borderLeft = '4px solid #ef4444';
  } else {
    toast.style.borderLeft = '4px solid #3b82f6';
  }
  
  // Mostrar toast
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Esconder após 3 segundos
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

console.log('✅ data.js otimizado carregado');