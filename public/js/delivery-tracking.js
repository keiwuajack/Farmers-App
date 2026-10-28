// Delivery Tracking Manager
class DeliveryTrackingManager {
  constructor() {
    this.currentOrderId = null;
    this.map = null;
    this.deliveryMarker = null;
    this.trackingInterval = null;
  }

  // Show tracking modal
  async showTrackingModal(orderId) {
    this.currentOrderId = orderId;
    
    const modal = document.getElementById('deliveryTrackingModal');
    if (!modal) {
      this.createTrackingModal();
    }

    document.getElementById('deliveryTrackingModal').style.display = 'block';
    await this.loadDeliveryTracking(orderId);
    
    // Setup Socket.IO listener for real-time updates
    if (window.chatManager?.socket) {
      chatManager.socket.on('delivery-update', (data) => {
        if (data.orderId === this.currentOrderId) {
          this.handleDeliveryUpdate(data);
        }
      });
    }
  }

  // Create tracking modal
  createTrackingModal() {
    const modal = document.createElement('div');
    modal.id = 'deliveryTrackingModal';
    modal.className = 'modal modal-large';
    modal.innerHTML = `
      <div class="modal-content">
        <span class="close" onclick="deliveryTrackingManager.closeTrackingModal()">&times;</span>
        <h2>🚚 Track Your Delivery</h2>
        
        <div class="tracking-container">
          <div class="tracking-map" id="trackingMap">
            <div class="map-placeholder">
              <p>📍 Loading delivery location...</p>
            </div>
          </div>

          <div class="tracking-info">
            <div id="deliveryPersonInfo"></div>
            <div id="deliveryStatus"></div>
            <div id="deliveryTimeline"></div>
            <div id="deliveryActions"></div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // Load delivery tracking
  async loadDeliveryTracking(orderId) {
    try {
      const response = await fetch(`/api/delivery/${encodeURIComponent(orderId)}/track`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to load tracking info');

      const order = await response.json();
      this.displayDeliveryInfo(order);
    } catch (error) {
      console.error('Error loading delivery tracking:', error);
      showNotification('Failed to load delivery tracking', 'error');
    }
  }

  // Display delivery information
  displayDeliveryInfo(order) {
    // Delivery person info
    if (order.deliveryPerson && order.deliveryPerson.name) {
      const personInfo = document.getElementById('deliveryPersonInfo');
      personInfo.innerHTML = `
        <div class="delivery-person-card">
          <div class="driver-avatar">🚚</div>
          <div class="driver-info">
            <h4>${order.deliveryPerson.name}</h4>
            <p>📞 ${order.deliveryPerson.phone}</p>
            <p>🚗 ${order.deliveryPerson.vehicle || 'Vehicle details unavailable'}</p>
          </div>
          <a href="tel:${order.deliveryPerson.phone}" class="btn btn-primary btn-sm">
            Call Driver
          </a>
        </div>
      `;
    }

    // Delivery status
    const statusInfo = document.getElementById('deliveryStatus');
    statusInfo.innerHTML = `
      <div class="delivery-status-card">
        <div class="status-badge status-${order.status}">${order.status}</div>
        ${order.estimatedDelivery ? `
          <p class="eta">
            <strong>Estimated Arrival:</strong> 
            ${new Date(order.estimatedDelivery).toLocaleString()}
          </p>
        ` : ''}
        ${order.currentLocation ? `
          <p class="current-location">
            📍 ${order.currentLocation.address}
            <br>
            <small>Updated: ${new Date(order.currentLocation.updatedAt).toLocaleTimeString()}</small>
          </p>
        ` : ''}
      </div>
    `;

    // Delivery timeline
    if (order.trackingHistory && order.trackingHistory.length > 0) {
      const timeline = document.getElementById('deliveryTimeline');
      timeline.innerHTML = `
        <h4>Delivery History</h4>
        <div class="timeline">
          ${order.trackingHistory.map(track => `
            <div class="timeline-item">
              <div class="timeline-marker">📍</div>
              <div class="timeline-content">
                <p class="timeline-location">${track.address || 'Location update'}</p>
                <p class="timeline-time">${new Date(track.timestamp).toLocaleString()}</p>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Display map
    this.displayMap(order.currentLocation);

    // Delivery actions
    const actionsDiv = document.getElementById('deliveryActions');
    if (order.status === 'delivered' && !order.receiptConfirmed) {
      actionsDiv.innerHTML = `
        <button class="btn btn-primary btn-block" onclick="deliveryTrackingManager.confirmReceipt()">
          ✅ Confirm Receipt
        </button>
      `;
    } else if (order.receiptConfirmed) {
      actionsDiv.innerHTML = `
        <div class="alert alert-success">
          ✅ Delivery confirmed. Thank you!
        </div>
      `;
    }

    // Show proof of delivery if available
    if (order.proofOfDelivery) {
      actionsDiv.innerHTML += `
        <div class="proof-of-delivery">
          <h4>Proof of Delivery</h4>
          ${order.proofOfDelivery.signature ? `
            <img src="${order.proofOfDelivery.signature}" alt="Signature" class="delivery-signature">
          ` : ''}
          ${order.proofOfDelivery.photo ? `
            <img src="${order.proofOfDelivery.photo}" alt="Delivery Photo" class="delivery-photo">
          ` : ''}
          ${order.proofOfDelivery.notes ? `
            <p><strong>Notes:</strong> ${order.proofOfDelivery.notes}</p>
          ` : ''}
        </div>
      `;
    }
  }

  // Display map
  displayMap(location) {
    const mapContainer = document.getElementById('trackingMap');
    
    if (!location) {
      mapContainer.innerHTML = '<div class="map-placeholder"><p>Location not available yet</p></div>';
      return;
    }

    // Simple map representation (in production, use Google Maps or Leaflet)
    mapContainer.innerHTML = `
      <div class="simple-map">
        <div class="map-marker" style="
          top: 50%; 
          left: 50%; 
          transform: translate(-50%, -50%);
        ">
          📍
        </div>
        <div class="map-info">
          <p><strong>Current Location:</strong></p>
          <p>${location.address}</p>
          ${Number.isFinite(Number(location.latitude)) && Number.isFinite(Number(location.longitude)) ? `
            <p class="text-muted">Lat: ${Number(location.latitude).toFixed(6)}, Lon: ${Number(location.longitude).toFixed(6)}</p>
          ` : ''}
        </div>
      </div>
    `;
  }

  // Handle real-time delivery update
  handleDeliveryUpdate(data) {
    const { location, deliveryPerson } = data;
    
    // Update current location
    const locationEl = document.querySelector('.current-location');
    if (locationEl) {
      locationEl.innerHTML = `
        📍 ${location.address}
        <br>
        <small>Updated: ${new Date(location.updatedAt).toLocaleTimeString()}</small>
      `;
    }

    // Update map
    this.displayMap(location);

    // Show notification
    showNotification(`Delivery update: Now at ${location.address}`, 'info');

    // Reload full tracking data
    this.loadDeliveryTracking(this.currentOrderId);
  }

  // Confirm receipt
  async confirmReceipt() {
    try {
      const response = await fetch(`/api/delivery/${encodeURIComponent(this.currentOrderId)}/confirm-receipt`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to confirm receipt');

      showNotification('Thank you! Delivery confirmed.', 'success');
      this.loadDeliveryTracking(this.currentOrderId);
    } catch (error) {
      showNotification(error.message, 'error');
    }
  }

  // Close tracking modal
  closeTrackingModal() {
    document.getElementById('deliveryTrackingModal').style.display = 'none';
    this.currentOrderId = null;
    
    // Remove Socket.IO listener
    if (window.chatManager?.socket) {
      chatManager.socket.off('delivery-update');
    }
  }
}

// Global instance
const deliveryTrackingManager = new DeliveryTrackingManager();
window.deliveryTrackingManager = deliveryTrackingManager;
