// Product Reviews Management
class ReviewsManager {
  constructor() {
    this.currentProductId = null;
    this.currentPage = 1;
  }

  // Load reviews for a product
  async loadReviews(productId, page = 1) {
    try {
      this.currentProductId = productId;
      this.currentPage = page;

      const response = await fetch(`/api/reviews/product/${productId}?page=${page}&limit=10`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token') || ''}` }
      });
      if (!response.ok) throw new Error('Failed to load reviews');

      const data = await response.json();
      this.displayReviews(data);
      this.displayPagination(data);
    } catch (error) {
      console.error('Error loading reviews:', error);
      showNotification('Failed to load reviews', 'error');
    }
  }

  // Display reviews
  displayReviews(data) {
    const container = document.getElementById('reviewsList');
    if (!container) return;

    if (data.reviews.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>⭐ No reviews yet</p>
          <p class="text-muted">Be the first to review this product!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = data.reviews.map(review => `
      <div class="review-card" data-review-id="${review._id}">
        <div class="review-header">
          <div class="review-user">
            <div class="user-avatar">${review.user.name.charAt(0).toUpperCase()}</div>
            <div>
              <h4>${review.user.name}</h4>
              <div class="review-meta">
                ${this.renderStars(review.rating)}
                ${review.verifiedPurchase ? '<span class="verified-badge">✓ Verified Purchase</span>' : ''}
              </div>
            </div>
          </div>
          <span class="review-date">${new Date(review.createdAt).toLocaleDateString()}</span>
        </div>
        <p class="review-comment">${review.comment}</p>
        <div class="review-actions">
          <button class="btn btn-sm" onclick="reviewsManager.markHelpful('${review._id}')">
            👍 Helpful (${review.helpfulCount})
          </button>
          ${this.canEditReview(review) ? `
            <button class="btn btn-sm" onclick="reviewsManager.editReview('${review._id}')">✏️ Edit</button>
            <button class="btn btn-sm btn-danger" onclick="reviewsManager.deleteReview('${review._id}')">🗑️ Delete</button>
          ` : ''}
        </div>
      </div>
    `).join('');
  }

  // Render star rating
  renderStars(rating) {
    const fullStars = Math.floor(rating);
    const emptyStars = 5 - fullStars;
    return '⭐'.repeat(fullStars) + '☆'.repeat(emptyStars);
  }

  // Check if user can edit review
  canEditReview(review) {
    const userId = localStorage.getItem('userId');
    return userId && review.user._id === userId;
  }

  // Display pagination
  displayPagination(data) {
    const container = document.getElementById('reviewsPagination');
    if (!container || data.totalPages <= 1) {
      if (container) container.innerHTML = '';
      return;
    }

    let pagination = '<div class="pagination">';
    
    if (data.currentPage > 1) {
      pagination += `<button class="btn btn-sm" onclick="reviewsManager.loadReviews('${this.currentProductId}', ${data.currentPage - 1})">Previous</button>`;
    }
    
    pagination += `<span>Page ${data.currentPage} of ${data.totalPages}</span>`;
    
    if (data.currentPage < data.totalPages) {
      pagination += `<button class="btn btn-sm" onclick="reviewsManager.loadReviews('${this.currentProductId}', ${data.currentPage + 1})">Next</button>`;
    }
    
    pagination += '</div>';
    container.innerHTML = pagination;
  }

  // Show review form
  showReviewForm(productId, productName) {
    const modal = document.getElementById('reviewModal');
    if (!modal) {
      this.createReviewModal();
    }

    this.currentProductId = productId;
    document.getElementById('reviewProductName').textContent = productName;
    document.getElementById('reviewForm').reset();
    document.getElementById('reviewModal').style.display = 'block';
  }

  // Create review modal
  createReviewModal() {
    const modal = document.createElement('div');
    modal.id = 'reviewModal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <span class="close" onclick="document.getElementById('reviewModal').style.display='none'">&times;</span>
        <h2>Write a Review</h2>
        <p class="text-muted">for <span id="reviewProductName"></span></p>
        
        <form id="reviewForm" onsubmit="reviewsManager.submitReview(event)">
          <div class="form-group">
            <label>Rating *</label>
            <div class="star-rating-input" id="starRatingInput">
              ${[5,4,3,2,1].map(n => `
                <input type="radio" name="rating" id="star${n}" value="${n}" required>
                <label for="star${n}">⭐</label>
              `).join('')}
            </div>
          </div>
          
          <div class="form-group">
            <label>Your Review *</label>
            <textarea name="comment" class="input" rows="4" required 
              placeholder="Share your experience with this product..."></textarea>
          </div>
          
          <button type="submit" class="btn btn-primary btn-block">Submit Review</button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // Submit review
  async submitReview(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          productId: this.currentProductId,
          rating: parseInt(formData.get('rating')),
          comment: formData.get('comment')
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit review');
      }

      showNotification('Review submitted successfully!', 'success');
      document.getElementById('reviewModal').style.display = 'none';
      this.loadReviews(this.currentProductId);
    } catch (error) {
      showNotification(error.message, 'error');
    }
  }

  // Mark review as helpful
  async markHelpful(reviewId) {
    try {
      const response = await fetch(`/api/reviews/${reviewId}/helpful`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to mark as helpful');

      showNotification('Thank you for your feedback!', 'success');
      this.loadReviews(this.currentProductId, this.currentPage);
    } catch (error) {
      showNotification(error.message, 'error');
    }
  }

  // Edit review
  async editReview(reviewId) {
    // Load review data and populate form
    const reviewCard = document.querySelector(`[data-review-id="${reviewId}"]`);
    const comment = reviewCard.querySelector('.review-comment').textContent;
    const rating = reviewCard.querySelectorAll('.review-meta')[0].textContent.split('⭐').length - 1;

    this.showReviewForm(this.currentProductId, 'Edit Review');
    document.querySelector('[name="comment"]').value = comment;
    document.querySelector(`[name="rating"][value="${rating}"]`).checked = true;

    // Update form to use PUT instead of POST
    const form = document.getElementById('reviewForm');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);

      try {
        const response = await fetch(`/api/reviews/${reviewId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            rating: parseInt(formData.get('rating')),
            comment: formData.get('comment')
          })
        });

        if (!response.ok) throw new Error('Failed to update review');

        showNotification('Review updated successfully!', 'success');
        document.getElementById('reviewModal').style.display = 'none';
        this.loadReviews(this.currentProductId, this.currentPage);
      } catch (error) {
        showNotification(error.message, 'error');
      }
    };
  }

  // Delete review
  async deleteReview(reviewId) {
    if (!await showAppConfirm('Are you sure you want to delete this review?', {
      title: 'Delete review',
      submitText: 'Delete'
    })) return;

    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete review');

      showNotification('Review deleted successfully', 'success');
      this.loadReviews(this.currentProductId, this.currentPage);
    } catch (error) {
      showNotification(error.message, 'error');
    }
  }
}

// Global instance
const reviewsManager = new ReviewsManager();
window.reviewsManager = reviewsManager;
