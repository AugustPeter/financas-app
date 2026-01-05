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
      if (inst && typeof inst.destroy === 'function') {
        try { inst.destroy(); } catch (e) {}
      }
      this.instances.delete(id);
      const canvas = this.getCanvas(id);
      if (canvas && canvas._chartInstance) {
        try { canvas._chartInstance = null; } catch (e) {}
      }
    },

    createOrUpdate(id, createConfigFn) {
      const canvas = this.getCanvas(id);
      if (!canvas || typeof Chart === 'undefined') return null;
      const ctx = canvas.getContext('2d');

      const existing = this.getInstance(id);
      const config = createConfigFn();
      if (existing) {
        // Update data & options in place to avoid re-creating canvas conflicts
        existing.data = config.data;
        existing.options = config.options;
        try { existing.update(); } catch (e) {
          // Fallback: destroy and recreate if update fails
          this.destroy(id);
          const inst = new Chart(ctx, config);
          this.instances.set(id, inst);
          try { canvas._chartInstance = inst; } catch (e) {}
          return inst;
        }
        return existing;
      } else {
        const inst = new Chart(ctx, config);
        this.instances.set(id, inst);
        try { canvas._chartInstance = inst; } catch (e) {}
        return inst;
      }
    }
  };

  // Safe formatter (falls back if formatCurrency not yet available)
  function safeFormatCurrency(value) {
    if (typeof formatCurrency === 'function') {
      try { return formatCurrency(value); } catch (e) { /* ignore */ }
    }
    return 'R$ ' + Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  // Histórico (últimos N meses) - lê do getDB()
  function updateHistory(limit = 6) {
    const id = 'historico';
    const db = typeof getDB === 'function' ? getDB() : {};
    const months = Object.keys(db);
    if (months.length === 0) return;

    const slice = months.slice(-limit);
    const saldos = slice.map(m => (db[m].saldo || 0));
    const investimentos = slice.map(m =>
      Array.isArray(db[m].invest)
        ? db[m].invest.reduce((t, it) => t + Number(it[1] || 0), 0)
        : 0
    );

    ChartManager.createOrUpdate(id, () => ({
      type: 'line',
      data: {
        labels: slice,
        datasets: [
          {
            label: 'Saldo',
            data: saldos,
            borderColor: 'rgb(34,197,94)',
            backgroundColor: 'rgba(34,197,94,0.08)',
            borderWidth: 3,
            tension: 0.35,
            fill: true
          },
          {
            label: 'Investimentos',
            data: investimentos,
            borderColor: 'rgb(99,102,241)',
            backgroundColor: 'rgba(99,102,241,0.08)',
            borderWidth: 2,
            borderDash: [5, 5],
            tension: 0.35,
            fill: true
          }
        ]
      },
      options: baseOptions((ctx) => `${ctx.dataset.label}: ${safeFormatCurrency(ctx.raw)}`)
    }));
  }

  // Gráfico de categorias (despesas)
  function updateCategoryChart() {
    const id = 'categoryChart';
    const db = typeof getDB === 'function' ? getDB() : {};
    const monthKey = typeof mesAtual !== 'undefined' ? mesAtual : null;
    const monthData = monthKey ? db[monthKey] : null;
    if (!monthData || !Array.isArray(monthData.despesa) || monthData.despesa.length === 0) {
      // Destroy existing chart if no data
      ChartManager.destroy(id);
      return;
    }

    const categories = {};
    monthData.despesa.forEach(([desc = '', val = 0]) => {
      const cat = String(desc).split(' ')[0] || 'Outros';
      categories[cat] = (categories[cat] || 0) + (parseFloat(val) || 0);
    });

    const labels = Object.keys(categories);
    const data = Object.values(categories);

    ChartManager.createOrUpdate(id, () => ({
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: [
            '#ef4444','#f97316','#f59e0b','#84cc16','#10b981','#06b6d4','#6366f1','#8b5cf6','#ec4899','#6b7280'
          ].slice(0, labels.length)
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.label}: ${safeFormatCurrency(ctx.raw)}`
            }
          }
        }
      }
    }));
  }

  // Gráfico de evolução patrimonial (wealth)
  function updateWealthChart() {
    const id = 'wealthChart';
    const db = typeof getDB === 'function' ? getDB() : {};
    const months = Object.keys(db);
    if (months.length === 0) {
      ChartManager.destroy(id);
      return;
    }

    const wealthData = months.map(m => db[m].saldo || 0);
    const cumulative = [];
    let cum = 0;
    wealthData.forEach(v => { cum += Number(v || 0); cumulative.push(cum); });

    ChartManager.createOrUpdate(id, () => ({
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          label: 'Patrimônio Acumulado',
          data: cumulative,
          borderColor: 'rgb(99,102,241)',
          backgroundColor: 'rgba(99,102,241,0.08)',
          borderWidth: 3,
          tension: 0.35,
          fill: true
        }]
      },
      options: baseOptions((ctx) => `Patrimônio: ${safeFormatCurrency(ctx.raw)}`)
    }));
  }

  // Exportar funções globalmente (compatibilidade)
  window.updateChart = updateChart;
  window.updateHistory = updateHistory;
  window.updateCategoryChart = updateCategoryChart;
  window.updateWealthChart = updateWealthChart;
})();