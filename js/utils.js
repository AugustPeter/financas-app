/**
 * utils.js - Utilitários Globais
 * Versão otimizada com padrões modernos
 */

// ============================================
// FORMATADORES
// ============================================

const Formatters = {
  /**
   * Formatar valor como moeda brasileira
   */
  currency(value) {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num || 0);
  },

  /**
   * Formatar número com separadores brasileiros
   */
  number(value, decimals = 2) {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value || 0);
  },

  /**
   * Formatar data brasileira
   */
  date(date, options = {}) {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      ...options
    });
  },

  /**
   * Capitalizar primeira letra
   */
  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
};

// ============================================
// SANITIZAÇÃO E SEGURANÇA
// ============================================

const Security = {
  /**
   * Escapar HTML para prevenir XSS
   */
  escapeHTML(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  },

  /**
   * Sanitizar input numérico
   */
  sanitizeNumber(value, fallback = 0) {
    const num = parseFloat(String(value).replace(',', '.'));
    return isNaN(num) ? fallback : num;
  }
};

// ============================================
// NOTIFICAÇÕES TOAST
// ============================================

const Toast = {
  container: null,

  init() {
    if (this.container) return;
    this.container = document.createElement('div');
    this.container.id = 'toast-container';
    this.container.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `;
    document.body.appendChild(this.container);
  },

  show(message, type = 'info', duration = 3000) {
    this.init();

    const colors = {
      success: { bg: '#10b981', icon: '✓' },
      error: { bg: '#ef4444', icon: '✕' },
      warning: { bg: '#f59e0b', icon: '⚠' },
      info: { bg: '#3b82f6', icon: 'ℹ' }
    };

    const config = colors[type] || colors.info;

    const toast = document.createElement('div');
    toast.style.cssText = `
      background: ${config.bg};
      color: white;
      padding: 12px 20px;
      border-radius: 12px;
      font-weight: 500;
      font-size: 14px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      gap: 10px;
      opacity: 0;
      transform: translateY(20px) scale(0.9);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: auto;
    `;
    toast.innerHTML = `<span>${config.icon}</span><span>${Security.escapeHTML(message)}</span>`;

    this.container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0) scale(1)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-20px) scale(0.9)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  success(msg, duration) { this.show(msg, 'success', duration); },
  error(msg, duration) { this.show(msg, 'error', duration || 5000); },
  warning(msg, duration) { this.show(msg, 'warning', duration); },
  info(msg, duration) { this.show(msg, 'info', duration); }
};

// ============================================
// HELPERS
// ============================================

const Timing = {
  debounce(fn, delay = 300) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

const Storage = {
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  },

  get(key, fallback = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch (e) {
      return fallback;
    }
  },

  remove(key) {
    localStorage.removeItem(key);
  }
};

// ============================================
// ERROR HANDLING
// ============================================

window.addEventListener('error', (e) => console.error('❌ Erro:', e.error?.message || e.message));
window.addEventListener('unhandledrejection', (e) => console.error('❌ Promise rejeitada:', e.reason));

// ============================================
// EXPORTAR GLOBALMENTE
// ============================================

window.formatCurrency = Formatters.currency;
window.capitalizeFirst = Formatters.capitalize;
window.escapeHTML = Security.escapeHTML;
window.showToast = (msg, type, duration) => Toast.show(msg, type, duration);
window.Utils = { Formatters, Security, Toast, Timing, Storage };

console.log('✅ utils.js carregado');
