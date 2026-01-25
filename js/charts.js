// js/charts.js - Otimizado (reuso de instâncias, cache de canvas, updates eficientes)

(function () {
  // Cache de canvases e instâncias Chart
  const ChartManager = {
    instances: new Map(),
    canvases: new Map(),

    getCanvas(id) {
      if (this.canvases.has(id)) return this.canvases.get(id);
      const el = document.getElementById(id);
      if (el) this.canvases.set(id, el);
      return el;
    },

    getInstance(id) {
      return this.instances.get(id) || null;
    },

    destroy(id) {
      const inst = this.getInstance(id);
      if (inst && typeof inst.destroy === 'function') inst.destroy();
      this.instances.delete(id);
      const canvas = this.getCanvas(id);
      if (canvas) canvas._chartInstance = null;
    },

    createOrUpdate(id, createConfigFn) {
      const canvas = this.getCanvas(id);
      if (!canvas || typeof Chart === 'undefined') return null;
      const ctx = canvas.getContext('2d');

      const existing = this.getInstance(id);
      const config = createConfigFn();
      if (existing) {
        existing.data = config.data;
        existing.options = config.options;
        existing.update();
        return existing;
      } else {
        const inst = new Chart(ctx, config);
        this.instances.set(id, inst);
        canvas._chartInstance = inst;
        return inst;
      }
    }
  };

  // Safe formatter (falls back if formatCurrency not yet available)
  function safeFormatCurrency(value) {
    return typeof formatCurrency === 'function' 
      ? formatCurrency(value)
      : 'R$ ' + Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Base chart options reused
  function baseOptions(tooltipLabelCallback) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: tooltipLabelCallback || ((ctx) => safeFormatCurrency(ctx.raw))
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (v) => safeFormatCurrency(v)
          }
        }
      }
    };
  }

  // Atualizar gráfico principal (Renda, Despesa, Invest., Saldo)
  function updateChart(r = 0, d = 0, i = 0, s = 0) {
    const id = 'grafico';
    ChartManager.createOrUpdate(id, () => ({
      type: 'bar',
      data: {
        labels: ['Renda', 'Despesas', 'Invest.', 'Saldo'],
        datasets: [{
          data: [r, d, i, s],
          backgroundColor: [
            'rgba(34,197,94,0.8)',
            'rgba(239,68,68,0.8)',
            'rgba(99,102,241,0.8)',
            s >= 0 ? 'rgba(34,197,94,0.8)' : 'rgba(239,68,68,0.8)'
          ],
          borderColor: [
            'rgb(34,197,94)',
            'rgb(239,68,68)',
            'rgb(99,102,241)',
            s >= 0 ? 'rgb(34,197,94)' : 'rgb(239,68,68)'
          ],
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: baseOptions()
    }));
  }

  // Exportar funções globalmente (compatibilidade)
  window.updateChart = updateChart;
})();