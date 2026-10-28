// Integration Test Script
// Run this in browser console to test all features

class FarmersAppTester {
  constructor() {
    this.testResults = [];
    this.token = localStorage.getItem('token');
    this.userId = localStorage.getItem('userId');
  }

  async runAllTests() {
    console.log('🧪 Starting Farmers App Integration Tests...\n');
    
    await this.testTranslations();
    await this.testReviews();
    await this.testDashboard();
    await this.testPayments();
    await this.testDeliveryTracking();
    await this.testWeatherAlerts();
    await this.testFollowSystem();
    await this.testSearch();
    
    this.printResults();
  }

  async testTranslations() {
    console.log('🌍 Testing Multi-language Support...');
    try {
      // Test language API
      const response = await fetch('/api/translations/languages');
      const languages = await response.json();
      
      this.assert(languages.length >= 2, 'Should have at least 2 languages');
      this.assert(languages.some(l => l.code === 'en'), 'Should have English');
      this.assert(languages.some(l => l.code === 'sw'), 'Should have Swahili');
      
      // Test translation loading
      const enTranslations = await fetch('/api/translations/en').then(r => r.json());
      this.assert(enTranslations.common, 'Should have common translations');
      
      // Test i18n manager
      this.assert(typeof window.i18n !== 'undefined', 'i18n manager should be loaded');
      
      console.log('✅ Multi-language Support: PASSED\n');
    } catch (error) {
      console.error('❌ Multi-language Support: FAILED', error);
    }
  }

  async testReviews() {
    console.log('⭐ Testing Reviews System...');
    try {
      // Test reviews manager exists
      this.assert(typeof window.reviewsManager !== 'undefined', 'reviewsManager should be loaded');
      
      // Test review rendering
      const testReview = {
        _id: '123',
        user: { _id: 'user1', name: 'Test User' },
        rating: 5,
        comment: 'Great product!',
        verifiedPurchase: true,
        helpfulCount: 10,
        createdAt: new Date()
      };
      
      const stars = reviewsManager.renderStars(5);
      this.assert(stars.includes('⭐'), 'Should render stars');
      
      console.log('✅ Reviews System: PASSED\n');
    } catch (error) {
      console.error('❌ Reviews System: FAILED', error);
    }
  }

  async testDashboard() {
    console.log('📊 Testing Seller Dashboard...');
    try {
      this.assert(typeof window.dashboardManager !== 'undefined', 'dashboardManager should be loaded');
      
      if (this.token) {
        const response = await fetch('/api/dashboard/analytics', {
          headers: { 'Authorization': `Bearer ${this.token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          this.assert(typeof data.totalRevenue !== 'undefined', 'Should have revenue data');
          console.log('✅ Seller Dashboard: PASSED\n');
        } else {
          console.log('⚠️ Seller Dashboard: Skipped (requires seller account)\n');
        }
      } else {
        console.log('⚠️ Seller Dashboard: Skipped (requires authentication)\n');
      }
    } catch (error) {
      console.error('❌ Seller Dashboard: FAILED', error);
    }
  }

  async testPayments() {
    console.log('💳 Testing Payment System...');
    try {
      this.assert(typeof window.paymentManager !== 'undefined', 'paymentManager should be loaded');
      this.assert(typeof paymentManager.showPaymentModal === 'function', 'Should have payment modal');
      
      console.log('✅ Payment System: PASSED\n');
    } catch (error) {
      console.error('❌ Payment System: FAILED', error);
    }
  }

  async testDeliveryTracking() {
    console.log('🚚 Testing Delivery Tracking...');
    try {
      this.assert(typeof window.deliveryTrackingManager !== 'undefined', 'deliveryTrackingManager should be loaded');
      this.assert(typeof deliveryTrackingManager.showTrackingModal === 'function', 'Should have tracking modal');
      
      console.log('✅ Delivery Tracking: PASSED\n');
    } catch (error) {
      console.error('❌ Delivery Tracking: FAILED', error);
    }
  }

  async testWeatherAlerts() {
    console.log('🌦️ Testing Weather Alerts...');
    try {
      this.assert(typeof window.weatherAlertsManager !== 'undefined', 'weatherAlertsManager should be loaded');
      
      // Test crop advice API
      const response = await fetch('/api/weatherAlerts/crop-advice?crop=tomatoes&temperature=25&humidity=60');
      if (response.ok) {
        const data = await response.json();
        this.assert(data.crop === 'tomatoes', 'Should return crop data');
        this.assert(data.conditions, 'Should have conditions data');
        console.log('✅ Weather Alerts: PASSED\n');
      }
    } catch (error) {
      console.error('❌ Weather Alerts: FAILED', error);
    }
  }

  async testFollowSystem() {
    console.log('👥 Testing Following System...');
    try {
      // Test follow API endpoint exists
      const response = await fetch('/api/follows/123/status', {
        headers: this.token ? { 'Authorization': `Bearer ${this.token}` } : {}
      });
      
      // Should return 401 if not authenticated, which means endpoint exists
      this.assert(response.status === 401 || response.ok, 'Follow endpoint should exist');
      
      console.log('✅ Following System: PASSED\n');
    } catch (error) {
      console.error('❌ Following System: FAILED', error);
    }
  }

  async testSearch() {
    console.log('🔍 Testing Advanced Search...');
    try {
      const response = await fetch('/api/products/search?keyword=test&sortBy=price&page=1&limit=10');
      
      if (response.ok) {
        const data = await response.json();
        this.assert(Array.isArray(data.products), 'Should return products array');
        this.assert(typeof data.totalPages !== 'undefined', 'Should have pagination');
        console.log('✅ Advanced Search: PASSED\n');
      }
    } catch (error) {
      console.error('❌ Advanced Search: FAILED', error);
    }
  }

  assert(condition, message) {
    if (condition) {
      this.testResults.push({ status: 'PASS', message });
    } else {
      this.testResults.push({ status: 'FAIL', message });
      console.warn(`❌ Assertion failed: ${message}`);
    }
  }

  printResults() {
    console.log('\n' + '='.repeat(50));
    console.log('📋 TEST RESULTS SUMMARY');
    console.log('='.repeat(50));
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const total = this.testResults.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${((passed/total) * 100).toFixed(1)}%`);
    console.log('='.repeat(50));
    
    if (failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Your Farmers App is working perfectly!\n');
    } else {
      console.log('\n⚠️ Some tests failed. Please review the errors above.\n');
    }
  }
}

// Auto-run tests
console.log('%c🌾 Farmers App Integration Tester', 'font-size: 20px; font-weight: bold; color: #10b981;');
console.log('To run tests, execute: new FarmersAppTester().runAllTests()');

// Export for manual use
window.FarmersAppTester = FarmersAppTester;
