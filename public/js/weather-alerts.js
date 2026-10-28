// Weather Alerts Manager
class WeatherAlertsManager {
  constructor() {
    this.userLocation = null;
    this.alerts = [];
  }

  // Get user location
  async getUserLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        position => {
          this.userLocation = {
            lat: position.coords.latitude,
            lon: position.coords.longitude
          };
          resolve(this.userLocation);
        },
        error => reject(error)
      );
    });
  }

  // Load weather alerts
  async loadAlerts(lat, lon) {
    try {
      const location = lat && lon ? { lat, lon } : await this.getUserLocation();
      
      const response = await fetch(`/api/weatherAlerts?lat=${location.lat}&lon=${location.lon}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` }
      });
      if (!response.ok) throw new Error('Failed to load weather alerts');

      const data = await response.json();
      this.alerts = data.alerts;
      this.displayAlerts(data);
    } catch (error) {
      console.error('Error loading weather alerts:', error);
      showNotification('Failed to load weather alerts', 'error');
    }
  }

  // Display alerts
  displayAlerts(data) {
    const container = document.getElementById('weatherAlerts');
    if (!container) return;

    if (data.alerts.length === 0) {
      container.innerHTML = `
        <div class="weather-status good">
          <h3>✅ No Weather Alerts</h3>
          <p>Current conditions are favorable for farming</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <h3>⚠️ Weather Alerts for Your Area</h3>
      <div class="alerts-grid">
        ${data.alerts.map(alert => this.renderAlert(alert)).join('')}
      </div>
    `;
  }

  // Render individual alert
  renderAlert(alert) {
    const severityClass = alert.severity === 'severe' ? 'alert-danger' : 'alert-warning';
    const icon = this.getAlertIcon(alert.type);

    return `
      <div class="alert ${severityClass}">
        <div class="alert-header">
          <span class="alert-icon">${icon}</span>
          <h4>${this.getAlertTitle(alert.type)}</h4>
        </div>
        <p>${alert.message}</p>
        ${alert.recommendations ? `
          <div class="alert-recommendations">
            <strong>Recommendations:</strong>
            <ul>
              ${alert.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  }

  // Get alert icon
  getAlertIcon(type) {
    const icons = {
      heat_wave: '🌡️',
      frost_warning: '❄️',
      strong_winds: '💨',
      heavy_rain: '🌧️',
      high_humidity: '💧'
    };
    return icons[type] || '⚠️';
  }

  // Get alert title
  getAlertTitle(type) {
    const titles = {
      heat_wave: 'Heat Wave Warning',
      frost_warning: 'Frost Warning',
      strong_winds: 'Strong Wind Alert',
      heavy_rain: 'Heavy Rain Forecast',
      high_humidity: 'High Humidity Alert'
    };
    return titles[type] || 'Weather Alert';
  }

  // Get crop advice
  async getCropAdvice(crop, temperature, humidity) {
    try {
      const params = new URLSearchParams({ crop, temperature, humidity });
      const response = await fetch(`/api/weatherAlerts/crop-advice?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` }
      });
      
      if (!response.ok) throw new Error('Failed to get crop advice');

      const data = await response.json();
      this.displayCropAdvice(data);
    } catch (error) {
      console.error('Error getting crop advice:', error);
    }
  }

  // Display crop advice
  displayCropAdvice(data) {
    const container = document.getElementById('cropAdvice');
    if (!container) return;

    const tempStatus = data.conditions.temperature.status;
    const humidityStatus = data.conditions.humidity.status;

    container.innerHTML = `
      <div class="crop-advice-card">
        <h3>🌾 ${data.crop.charAt(0).toUpperCase() + data.crop.slice(1)} Growing Conditions</h3>
        
        <div class="conditions-grid">
          <div class="condition-item ${tempStatus === 'optimal' ? 'good' : 'warning'}">
            <h4>🌡️ Temperature</h4>
            <p>Current: ${data.conditions.temperature.current}°C</p>
            <p>Ideal: ${data.conditions.temperature.ideal[0]}-${data.conditions.temperature.ideal[1]}°C</p>
            <span class="status-badge ${tempStatus}">${tempStatus.replace('_', ' ')}</span>
          </div>

          <div class="condition-item ${humidityStatus === 'optimal' ? 'good' : 'warning'}">
            <h4>💧 Humidity</h4>
            <p>Current: ${data.conditions.humidity.current}%</p>
            <p>Ideal: ${data.conditions.humidity.ideal[0]}-${data.conditions.humidity.ideal[1]}%</p>
            <span class="status-badge ${humidityStatus}">${humidityStatus.replace('_', ' ')}</span>
          </div>
        </div>

        ${data.advice.length > 0 ? `
          <div class="advice-section">
            <h4>💡 Recommendations</h4>
            <ul>
              ${data.advice.map(tip => `<li>${tip}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${data.warnings.length > 0 ? `
          <div class="warnings-section">
            <h4>⚠️ Warnings</h4>
            <ul>
              ${data.warnings.map(warning => `<li>${warning}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  }

  // Subscribe to weather alerts
  async subscribeToAlerts(location, crops) {
    try {
      const response = await fetch('/api/weatherAlerts/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          location: location.name,
          latitude: location.lat,
          longitude: location.lon,
          crops
        })
      });

      if (!response.ok) throw new Error('Failed to subscribe');

      const data = await response.json();
      showNotification('Successfully subscribed to weather alerts!', 'success');
    } catch (error) {
      showNotification(error.message, 'error');
    }
  }

  // Show subscription form
  showSubscriptionForm() {
    const modal = document.getElementById('weatherSubscriptionModal');
    if (!modal) {
      this.createSubscriptionModal();
    }
    document.getElementById('weatherSubscriptionModal').style.display = 'block';
  }

  // Create subscription modal
  createSubscriptionModal() {
    const modal = document.createElement('div');
    modal.id = 'weatherSubscriptionModal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <span class="close" onclick="document.getElementById('weatherSubscriptionModal').style.display='none'">&times;</span>
        <h2>Subscribe to Weather Alerts</h2>
        
        <form id="weatherSubscriptionForm" onsubmit="weatherAlertsManager.handleSubscription(event)">
          <div class="form-group">
            <label>Location Name</label>
            <input type="text" name="locationName" class="input" required placeholder="e.g., Nairobi">
          </div>

          <div class="form-group">
            <label>Select Your Crops</label>
            <div class="checkbox-group">
              <label><input type="checkbox" name="crops" value="tomatoes"> Tomatoes</label>
              <label><input type="checkbox" name="crops" value="maize"> Maize</label>
              <label><input type="checkbox" name="crops" value="beans"> Beans</label>
              <label><input type="checkbox" name="crops" value="potatoes"> Potatoes</label>
              <label><input type="checkbox" name="crops" value="cabbage"> Cabbage</label>
            </div>
          </div>

          <button type="submit" class="btn btn-primary btn-block">Subscribe</button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // Handle subscription form
  async handleSubscription(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    
    try {
      const location = await this.getUserLocation();
      const crops = formData.getAll('crops');
      
      if (crops.length === 0) {
        showNotification('Please select at least one crop', 'error');
        return;
      }

      await this.subscribeToAlerts({
        name: formData.get('locationName'),
        lat: location.lat,
        lon: location.lon
      }, crops);

      document.getElementById('weatherSubscriptionModal').style.display = 'none';
    } catch (error) {
      showNotification(error.message, 'error');
    }
  }
}

// Global instance
const weatherAlertsManager = new WeatherAlertsManager();
window.weatherAlertsManager = weatherAlertsManager;
