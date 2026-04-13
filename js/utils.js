// js/utils.js - Utilitários globais compartilhados

// ============================================
// FORMATADORES
// ============================================

/**
 * Formatar valor como moeda brasileira
 * @param {number} value - Valor a formatar
 * @returns {string} Valor formatado (ex: R$ 1.234,56)
 */
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
}

/**
 * Capitalizar primeira letra
 * @param {string} string - String a capitalizar
 * @returns {string} String capitalizada
 */
function capitalizeFirst(string) {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

/**
 * Mostrar notificação toast
 * @param {string} message - Mensagem a exibir
 * @param {string} type - Tipo: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duração em ms (default: 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
  // Criar toast se não existir
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  
  toast.textContent = message;
  toast.className = 'toast';
  
  // Cores por tipo
  const colors = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6'
  };
  
  toast.style.borderLeft = `4px solid ${colors[type] || colors.info}`;
  
  // Mostrar toast
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });
  
  // Esconder após duração
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

// ============================================
// HELPERS DOM
// ============================================

/**
 * Escapar HTML para prevenir XSS
 * @param {string} str - String a escapar
 * @returns {string} String segura para HTML
 */
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

// ============================================
// ERROR HANDLING GLOBAL
// ============================================

/**
 * Handler global de erros não capturados
 */
window.addEventListener('error', (event) => {
  console.error('❌ Erro não capturado:', event.error);
  // Em produção, enviar para serviço de monitoramento
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Promise rejeitada:', event.reason);
  // Em produção, enviar para serviço de monitoramento
});

// ============================================
// EXPORTAR GLOBALMENTE
// ============================================

window.formatCurrency = formatCurrency;
window.capitalizeFirst = capitalizeFirst;
window.showToast = showToast;
window.escapeHTML = escapeHTML;

console.log('✅ utils.js carregado');
