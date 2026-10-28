// Seller Dashboard & Analytics
class DashboardManager {
  constructor() {
    this.analytics = null;
  }

  // Load dashboard
  async loadDashboard() {
    try {
      await Promise.all([
        this.loadAnalytics(),
        this.loadInventoryAlerts(),
        this.loadBuyerInsights()
      ]);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      showNotification('Failed to load dashboard', 'error');
    }
  }

  // Load analytics
  async loadAnalytics() {
    try {
      const response = await fetch('/api/dashboard/analytics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to load analytics');

      this.analytics = await response.json();
      this.displayAnalytics();
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  }

  // Display analytics
  displayAnalytics() {
    const container = document.getElementById('dashboardAnalytics');
    if (!container) return;

    container.innerHTML = `
      <div class="dashboard-grid">
        <!-- Key Metrics -->
        <div class="metric-card">
          <div class="metric-icon">💰</div>
          <div class="metric-content">
            <h3>KES ${this.analytics.totalRevenue.toLocaleString()}</h3>
            <p>Total Revenue</p>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon">📦</div>
          <div class="metric-content">
            <h3>${this.analytics.totalOrders}</h3>
            <p>Total Orders</p>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon">⏳</div>
          <div class="metric-content">
            <h3>${this.analytics.pendingOrders}</h3>
            <p>Pending Orders</p>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon">✅</div>
          <div class="metric-content">
            <h3>${this.analytics.completedOrders}</h3>
            <p>Completed Orders</p>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon">⭐</div>
          <div class="metric-content">
            <h3>${this.analytics.averageRating.toFixed(1)}</h3>
            <p>Average Rating</p>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon">🏪</div>
          <div class="metric-content">
            <h3>${this.analytics.totalProducts}</h3>
            <p>Total Products</p>
          </div>
        </div>
      </div>

      <!-- Monthly Revenue Chart -->
      <div class="chart-card">
        <h3>Monthly Revenue</h3>
        <div id="revenueChart" class="chart-container"></div>
      </div>

      <!-- Top Products -->
      <div class="table-card">
        <h3>Top Selling Products</h3>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Units Sold</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              ${this.analytics.topProducts.map(item => `
                <tr>
                  <td>
                    <div class="product-cell">
                      ${item.product.images?.[0] ? 
                        `<img src="/${item.product.images[0]}" alt="${item.product.name}" class="product-thumb">` : 
                        '<div class="product-thumb">📦</div>'
                      }
                      <span>${item.product.name}</span>
                    </div>
                  </td>
                  <td>${item.totalSold}</td>
                  <td>KES ${item.revenue.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.renderRevenueChart();
  }

  // Render revenue chart
  renderRevenueChart() {
    const container = document.getElementById('revenueChart');
    if (!container || !this.analytics) return;

    const maxRevenue = Math.max(...this.analytics.monthlyRevenue.map(m => m.revenue));
    
    container.innerHTML = `
      <div class="bar-chart">
        ${this.analytics.monthlyRevenue.map(month => `
          <div class="bar-wrapper">
            <div class="bar" style="height: ${(month.revenue / maxRevenue) * 200}px">
              <span class="bar-value">KES ${month.revenue.toLocaleString()}</span>
            </div>
            <span class="bar-label">${month.month}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Load inventory alerts
  async loadInventoryAlerts() {
    try {
      const response = await fetch('/api/dashboard/inventory-alerts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to load alerts');

      const alerts = await response.json();
      this.displayInventoryAlerts(alerts);
    } catch (error) {
      console.error('Error loading inventory alerts:', error);
    }
  }

  // Display inventory alerts
  displayInventoryAlerts(alerts) {
    const container = document.getElementById('inventoryAlerts');
    if (!container) return;

    const totalAlerts = alerts.lowStock.length + alerts.outOfStock.length;
    
    if (totalAlerts === 0) {
      container.innerHTML = '<p class="text-muted">✅ No inventory alerts</p>';
      return;
    }

    container.innerHTML = `
      <div class="alerts-list">
        ${alerts.outOfStock.map(item => `
          <div class="alert alert-danger">
            <strong>🚫 Out of Stock:</strong> ${item.product.name}
            <button class="btn btn-sm btn-primary" onclick="updateStock('${item.product._id}')">
              Restock
            </button>
          </div>
        `).join('')}
        
        ${alerts.lowStock.map(item => `
          <div class="alert alert-warning">
            <strong>⚠️ Low Stock:</strong> ${item.product.name} (${item.quantity} remaining)
            <button class="btn btn-sm btn-primary" onclick="updateStock('${item.product._id}')">
              Update Stock
            </button>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Load buyer insights
  async loadBuyerInsights() {
    try {
      const response = await fetch('/api/dashboard/buyer-insights', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to load buyer insights');

      const insights = await response.json();
      this.displayBuyerInsights(insights);
    } catch (error) {
      console.error('Error loading buyer insights:', error);
    }
  }

  // Display buyer insights
  displayBuyerInsights(insights) {
    const container = document.getElementById('buyerInsights');
    if (!container) return;

    if (insights.topBuyers.length === 0) {
      container.innerHTML = '<p class="text-muted">No buyer data yet</p>';
      return;
    }

    container.innerHTML = `
      <h3>Top Customers</h3>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Orders</th>
              <th>Total Spent</th>
            </tr>
          </thead>
          <tbody>
            ${insights.topBuyers.map(buyer => `
              <tr>
                <td>${buyer.buyer.name}</td>
                <td>${buyer.totalOrders}</td>
                <td>KES ${buyer.totalSpent.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
}

// Global instance
const dashboardManager = new DashboardManager();
window.dashboardManager = dashboardManager;

// Update stock helper function
async function updateStock(productId) {
  const quantity = await showAppPrompt('Enter new stock quantity:', {
    title: 'Update stock',
    inputType: 'number',
    min: 0,
    step: 1,
    required: true,
    submitText: 'Save stock'
  });
  if (quantity === null || quantity.trim() === '') return;
  if (!Number.isInteger(Number(quantity)) || Number(quantity) < 0) {
    showAppMessage('Stock quantity must be a whole number of zero or more.', { type: 'warning' });
    return;
  }

  try {
    const response = await fetch(`/api/products/${productId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ quantity: parseInt(quantity) })
    });

    if (!response.ok) throw new Error('Failed to update stock');

    showNotification('Stock updated successfully', 'success');
    dashboardManager.loadInventoryAlerts();
  } catch (error) {
    showNotification(error.message, 'error');
  }
}
