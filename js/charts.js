// ============================================
// FUNÇÕES DE GRÁFICOS
// ============================================

let chart = null;
let hist = null;
let categoryChart = null;

// Atualizar gráfico principal
function updateChart(r, d, i, s) {
  const canvas = document.getElementById('grafico');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  if (chart) chart.destroy();
  
  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Renda', 'Despesas', 'Invest.', 'Saldo'],
      datasets: [{
        data: [r, d, i, s],
        backgroundColor: [
          'rgba(34, 197, 94, 0.7)',
          'rgba(239, 68, 68, 0.7)',
          'rgba(99, 102, 241, 0.7)',
          s >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)'
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(239, 68, 68)',
          'rgb(99, 102, 241)',
          s >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
        ],
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              return formatCurrency(context.raw);
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return formatCurrency(value);
            }
          }
        }
      }
    }
  });
}

// Atualizar histórico
function updateHistory() {
  const canvas = document.getElementById('historico');
  if (!canvas) return;
  
  const data = getDB();
  const months = Object.keys(data).slice(-6); // Últimos 6 meses
  
  const saldos = months.map(m => data[m].saldo || 0);
  const investimentos = months.map(m => 
    Array.isArray(data[m].invest) 
      ? data[m].invest.reduce((t, i) => t + Number(i[1] || 0), 0)
      : 0
  );
  
  const ctx = canvas.getContext('2d');
  
  if (hist) hist.destroy();
  
  hist = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [
        {
          label: 'Saldo',
          data: saldos,
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: true
        },
        {
          label: 'Investimentos',
          data: investimentos,
          borderColor: 'rgb(99, 102, 241)',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          borderWidth: 2,
          borderDash: [5, 5],
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
            }
          }
        }
      },
      scales: {
        y: {
          ticks: {
            callback: function(value) {
              return formatCurrency(value);
            }
          }
        }
      }
    }
  });
}

// Atualizar gráfico de categorias
function updateCategoryChart() {
  const canvas = document.getElementById('categoryChart');
  if (!canvas) return;
  
  const db = getDB();
  const monthData = db[mesAtual];
  
  if (!monthData || !monthData.despesa) {
    // Sem dados para gráfico
    return;
  }
  
  // Agrupar despesas por categoria (simples - baseado na primeira palavra)
  const categories = {};
  monthData.despesa.forEach(([desc, value]) => {
    const category = desc.split(' ')[0] || 'Outros';
    categories[category] = (categories[category] || 0) + parseFloat(value || 0);
  });
  
  const ctx = canvas.getContext('2d');
  
  if (categoryChart) categoryChart.destroy();
  
  categoryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(categories),
      datasets: [{
        data: Object.values(categories),
        backgroundColor: [
          '#ef4444', '#f97316', '#f59e0b', '#84cc16',
          '#10b981', '#06b6d4', '#6366f1', '#8b5cf6',
          '#ec4899', '#6b7280'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.label}: ${formatCurrency(context.raw)}`;
            }
          }
        }
      }
    }
  });
}

// Atualizar gráfico de evolução patrimonial
function updateWealthChart() {
  const canvas = document.getElementById('wealthChart');
  if (!canvas) return;
  
  const db = getDB();
  const months = Object.keys(db);
  
  if (months.length === 0) return;
  
  const wealthData = months.map(month => {
    const data = db[month];
    return data.saldo || 0;
  });
  
  const cumulativeWealth = [];
  let cumulative = 0;
  wealthData.forEach(value => {
    cumulative += value;
    cumulativeWealth.push(cumulative);
  });
  
  const ctx = canvas.getContext('2d');
  
  if (wealthChart) wealthChart.destroy();
  
  wealthChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: 'Patrimônio Acumulado',
        data: cumulativeWealth,
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderWidth: 3,
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Patrimônio: ${formatCurrency(context.raw)}`;
            }
          }
        }
      },
      scales: {
        y: {
          ticks: {
            callback: function(value) {
              return formatCurrency(value);
            }
          }
        }
      }
    }
  });
}