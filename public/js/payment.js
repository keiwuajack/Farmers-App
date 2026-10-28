class PaymentManager {
  constructor() {
    this.queue = [];
    this.currentOrder = null;
    this.phoneNumber = '';
    this.paymentReference = null;
    this.statusCheckInterval = null;
  }

  showPaymentModal(orders, phoneNumber) {
    this.queue = (Array.isArray(orders) ? orders : [orders]).map(order => ({
      orderId: order._id || order.orderId,
      amount: Number(order.totalAmount || order.amount)
    }));
    this.phoneNumber = phoneNumber || '';
    this.ensurePaymentModal();

    const modal = document.getElementById('paymentModal');
    modal.classList.add('active');
    this.startNextPayment();
  }

  ensurePaymentModal() {
    if (document.getElementById('paymentModal')) return;

    const modal = document.createElement('div');
    modal.id = 'paymentModal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="paymentTitle">
        <button type="button" class="close" aria-label="Close payment" onclick="paymentManager.closePaymentModal()">&times;</button>
        <h2 id="paymentTitle">📱 M-Pesa checkout</h2>
        <p class="payment-demo-note">Demo only: no real STK push is sent and no money is collected.</p>
        <div id="paymentSummary"></div>
        <form id="paymentForm" onsubmit="paymentManager.initializePayment(event)">
          <div class="form-group">
            <label for="paymentPhone">M-Pesa phone number</label>
            <input id="paymentPhone" name="phoneNumber" type="tel" class="input" autocomplete="tel" inputmode="tel"
              pattern="(?:\\+254|0)?[17][0-9]{8}" title="Enter a Kenyan mobile number with 9 subscriber digits" required>
          </div>
          <button type="submit" class="btn btn-primary btn-block">Show simulated prompt</button>
        </form>
        <div id="paymentInstructions" class="hidden"></div>
        <div id="paymentStatus" aria-live="polite"></div>
      </div>`;
    document.body.appendChild(modal);
  }

  async startNextPayment() {
    if (!this.queue.length) {
      this.currentOrder = null;
      document.getElementById('paymentSummary').innerHTML = '<p>All cart payments have been handled.</p>';
      document.getElementById('paymentForm').classList.add('hidden');
      document.getElementById('paymentInstructions').classList.add('hidden');
      document.getElementById('paymentStatus').innerHTML = '<button class="btn btn-primary" onclick="paymentManager.closePaymentModal()">Done</button>';
      return;
    }

    this.currentOrder = this.queue.shift();
    this.paymentReference = null;
    document.getElementById('paymentPhone').value = this.phoneNumber;
    document.getElementById('paymentSummary').innerHTML =
      `<p>Order <strong>#${escapePaymentText(this.currentOrder.orderId.slice(-8))}</strong></p><h3>${formatPaymentKES(this.currentOrder.amount)}</h3>` +
      (this.queue.length ? `<p>There are ${this.queue.length + 1} orders to pay for, one M-Pesa prompt per seller.</p>` : '');
    document.getElementById('paymentForm').classList.remove('hidden');
    document.getElementById('paymentInstructions').classList.add('hidden');
    document.getElementById('paymentStatus').innerHTML = '';
  }

  async initializePayment(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity() || !this.currentOrder) return;
    const submitButton = form.querySelector('[type="submit"]');
    submitButton.disabled = true;

    try {
      const response = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`
        },
        body: JSON.stringify({
          orderId: this.currentOrder.orderId,
          paymentMethod: 'mpesa',
          phoneNumber: form.elements.phoneNumber.value
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Could not show the payment prompt.');

      this.phoneNumber = form.elements.phoneNumber.value;
      this.paymentReference = result.paymentReference;
      document.getElementById('paymentForm').classList.add('hidden');
      const instructions = document.getElementById('paymentInstructions');
      instructions.classList.remove('hidden');
      instructions.innerHTML = `
        <div class="payment-instructions">
          <h3>Simulated M-Pesa prompt</h3>
          <p>${escapePaymentText(result.instructions)}</p>
          <p><strong>Phone:</strong> ${escapePaymentText(result.phoneNumber)}</p>
          <p><strong>Reference:</strong> ${escapePaymentText(result.paymentReference)}</p>
          <div class="payment-simulation-actions">
            <button class="btn btn-primary" type="button" onclick="paymentManager.simulateOutcome('success')">Simulate approval</button>
            <button class="btn btn-outline" type="button" onclick="paymentManager.simulateOutcome('failed')">Simulate decline</button>
          </div>
        </div>`;
    } catch (error) {
      showNotification(error.message, 'error');
    } finally {
      submitButton.disabled = false;
    }
  }

  async simulateOutcome(outcome) {
    if (!this.currentOrder) return;
    const buttons = document.querySelectorAll('.payment-simulation-actions button');
    buttons.forEach(button => { button.disabled = true; });

    try {
      const response = await fetch(`/api/payments/simulate/${encodeURIComponent(this.currentOrder.orderId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`
        },
        body: JSON.stringify({ outcome })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Could not update simulated payment.');

      document.getElementById('paymentInstructions').classList.add('hidden');
      const status = document.getElementById('paymentStatus');
      if (outcome === 'success') {
        status.innerHTML = `<div class="payment-success"><h3>✅ Simulated payment approved</h3><p>Order #${escapePaymentText(this.currentOrder.orderId.slice(-8))} is confirmed.</p>${this.queue.length ? '<button type="button" class="btn btn-primary" onclick="paymentManager.startNextPayment()">Continue to next order</button>' : '<button type="button" class="btn btn-primary" onclick="paymentManager.closePaymentModal()">Done</button>'}</div>`;
        if (!this.queue.length) {
          if (typeof loadMyPurchases === 'function') loadMyPurchases();
          if (typeof loadMySales === 'function') loadMySales();
        }
      } else {
        status.innerHTML = `<div class="payment-error"><h3>Payment declined in simulation</h3><p>The order remains unpaid. You can retry or close this window.</p><button type="button" class="btn btn-primary" onclick="paymentManager.retryPayment()">Retry prompt</button></div>`;
      }
    } catch (error) {
      showNotification(error.message, 'error');
      buttons.forEach(button => { button.disabled = false; });
    }
  }

  retryPayment() {
    document.getElementById('paymentInstructions').classList.add('hidden');
    document.getElementById('paymentStatus').innerHTML = '';
    document.getElementById('paymentForm').classList.remove('hidden');
  }

  async checkPaymentStatus(orderId) {
    const id = orderId || (this.currentOrder && this.currentOrder.orderId);
    if (!id) throw new Error('An order ID is required to verify payment.');
    const response = await fetch(`/api/payments/verify/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` }
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Could not verify payment.');
    return result;
  }

  closePaymentModal() {
    if (this.statusCheckInterval) clearInterval(this.statusCheckInterval);
    const modal = document.getElementById('paymentModal');
    if (modal) modal.classList.remove('active');
    this.queue = [];
    this.currentOrder = null;
    this.paymentReference = null;
  }

  async requestRefund(orderId) {
    try {
      const response = await fetch(`/api/payments/refund/${encodeURIComponent(orderId)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` }
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Refund processing is unavailable.');
      showNotification('Refund request submitted successfully', 'success');
    } catch (error) {
      showNotification(error.message, 'error');
    }
  }
}

function escapePaymentText(value) {
  return String(value || '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function formatPaymentKES(amount) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount || 0);
}

const paymentManager = new PaymentManager();
window.paymentManager = paymentManager;
