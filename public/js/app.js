const API_URL = '/api';
let currentUser = null;
let authToken = null;
let allPosts = [];
let allVets = [];
let cartData = { items: [], totalAmount: 0 };
let notificationInterval = null;
let messageInterval = null;
let activeMessageUserId = null;
let activeMessageUserName = '';
let weatherRefreshTimer = null;
let weatherCoordinates = null;
let weatherManualLocation = null;

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    if (authToken) startAutomaticWeather();
    if (!authToken) {
        hideContentForGuests();
        if (location.hash && location.hash !== '#home') {
            history.replaceState(null, '', `${location.pathname}${location.search}#home`);
            showLogin();
        }
    }
    
    // Smooth scrolling for navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            const targetId = link.getAttribute('href').substring(1);
            if (targetId !== 'home' && !authToken) {
                requireAppLogin(targetId);
                return;
            }
            
            const target = document.getElementById(targetId);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
                
                // Update active link
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            }
        });
    });

    window.addEventListener('hashchange', () => {
        if (!authToken && location.hash && location.hash !== '#home') {
            history.replaceState(null, '', `${location.pathname}${location.search}#home`);
            requireAppLogin(location.hash.slice(1));
        }
    });
});

// Mobile menu functions
function toggleMobileMenu() {
    const panel = document.getElementById('navMenuPanel');
    const toggle = document.getElementById('mobileMenuToggle');
    const isOpen = panel.classList.toggle('mobile-active');
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
    toggle.textContent = isOpen ? 'âœ•' : 'â˜°';
}

function closeMobileMenu() {
    const panel = document.getElementById('navMenuPanel');
    const toggle = document.getElementById('mobileMenuToggle');
    panel.classList.remove('mobile-active');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation menu');
    toggle.textContent = 'â˜°';
}

// Verify the session with the server before revealing private sections.
async function checkAuth() {
    authToken = localStorage.getItem('authToken');
    const cachedUser = localStorage.getItem('currentUser');

    if (!authToken || !cachedUser) {
        clearStoredAuthentication();
        return false;
    }

    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${authToken}` },
            cache: 'no-store'
        });
        if (!response.ok) {
            clearStoredAuthentication();
            return false;
        }

        const data = await response.json();
        currentUser = data.user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        document.documentElement.classList.remove('guest-view');
        updateUIForAuthenticatedUser();
        return true;
    } catch (error) {
        console.error('Could not verify the current session:', error);
        clearStoredAuthentication();
        return false;
    }
}

function clearStoredAuthentication() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    document.documentElement.classList.add('guest-view');
}

// Hide content for guest users
function hideContentForGuests() {
    document.documentElement.classList.add('guest-view');
}

function requireAppLogin(sectionId) {
    if (!authToken) {
        showAppMessage('Please log in or create an account to access this section.', { type: 'info' });
        showLogin();
        return false;
    }

    const section = document.getElementById(sectionId);
    if (section) section.scrollIntoView({ behavior: 'smooth' });
    return true;
}

// Show content for authenticated users
function showContentForAuthenticatedUsers() {
    // Reload the page to get fresh content
    location.reload();
}

// Update UI for authenticated user
function updateUIForAuthenticatedUser() {
    document.documentElement.classList.remove('guest-view');
    document.getElementById('navAuth').classList.add('hidden');
    document.getElementById('navUser').classList.remove('hidden');
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('createPostBtn').style.display = 'block';
    document.getElementById('messagesLink').classList.remove('hidden');
    document.getElementById('myShopLink').classList.remove('hidden');
    const farmFinancesLink = document.getElementById('farmFinancesLink');
    farmFinancesLink.classList.toggle('hidden', currentUser.role !== 'farmer');
    document.getElementById('addProductBtn').style.display = 'block';
    
    // Load all content
    loadPosts();
    loadVeterinarians();
    loadProducts();
    loadConsultations();
    loadNotifications();
    loadMessageCount();
    loadConversations();
    loadMyListings(); // Load shop data
    loadMyPurchases();
    loadMySales();
    if (currentUser.role === 'farmer') loadFarmFinances();
    loadOpportunities();
    loadCart();
    loadWishlist();
    
    // Start polling for notifications and messages
    notificationInterval = setInterval(loadNotifications, 30000); // Every 30 seconds
    messageInterval = setInterval(loadMessageCount, 30000);
}

// Show/hide modals
function showModal(modalId) {
    if (!authToken && !['loginModal', 'registerModal'].includes(modalId)) {
        requireAppLogin(modalId);
        return;
    }
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function showLogin() {
    closeModal('registerModal');
    showModal('loginModal');
}

function showRegister() {
    closeModal('loginModal');
    showModal('registerModal');
}

function showVetRegistration() {
    showRegister();
    const roleSelect = document.getElementById('roleSelect');
    roleSelect.value = 'veterinarian';
    toggleRoleFields();
}

function showCreatePost() {
    if (!authToken) {
        showAppMessage('Please login to create a post', { type: 'info' });
        showLogin();
        return;
    }
    showModal('createPostModal');
}

// Toggle role-specific fields
function toggleRoleFields() {
    const role = document.getElementById('roleSelect').value;
    const farmSizeGroup = document.getElementById('farmSizeGroup');
    const specializationGroup = document.getElementById('specializationGroup');
    
    if (role === 'farmer') {
        farmSizeGroup.style.display = 'block';
        specializationGroup.style.display = 'none';
        farmSizeGroup.querySelector('input').required = true;
        specializationGroup.querySelector('input').required = false;
    } else if (role === 'veterinarian') {
        farmSizeGroup.style.display = 'none';
        specializationGroup.style.display = 'block';
        farmSizeGroup.querySelector('input').required = false;
        specializationGroup.querySelector('input').required = true;
    } else {
        farmSizeGroup.style.display = 'none';
        specializationGroup.style.display = 'none';
        farmSizeGroup.querySelector('input').required = false;
        specializationGroup.querySelector('input').required = false;
    }
}

// Authentication functions
async function register(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    // Convert tags to array
    if (data.tags) {
        data.tags = data.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    }
    
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            authToken = result.token;
            currentUser = result.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            closeModal('registerModal');
            showAlert('Registration successful! Welcome ' + currentUser.name, 'success');
            
            // Reload page to show content
            setTimeout(() => {
                location.reload();
            }, 1000);
        } else {
            showAlert(result.message || 'Registration failed', 'error');
        }
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

async function login(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        if (response.ok) {
            authToken = result.token;
            currentUser = result.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            closeModal('loginModal');
            showAlert('Login successful! Welcome ' + currentUser.name, 'success');
            
            // Reload page to show content
            setTimeout(() => {
                location.reload();
            }, 1000);
        } else {
            console.error('Login failed:', result.message);
            showAlert(result.message || 'Login failed. Check your email and password.', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('Connection error. Please try again.', 'error');
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    
    // Clear intervals
    if (notificationInterval) clearInterval(notificationInterval);
    if (messageInterval) clearInterval(messageInterval);
    
    location.replace('/');
}

// Posts functions
async function loadPosts() {
    if (!authToken) return;
    try {
        const response = await fetch(`${API_URL}/posts`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        if (!response.ok) throw new Error('Could not load community posts');
        const posts = await response.json();
        
        allPosts = posts; // Store all posts
        
        const feedContainer = document.getElementById('feedContainer');
        
        if (!authToken) {
            feedContainer.innerHTML = '<div class="empty-state"><p>Please login to view the community feed</p></div>';
            return;
        }
        
        displayPosts(posts);
    } catch (error) {
        console.error('Error loading posts:', error);
    }
}

function displayPosts(posts) {
    const feedContainer = document.getElementById('feedContainer');
    
    if (posts.length === 0) {
        feedContainer.innerHTML = '<div class="empty-state"><p>No community posts yet.</p><span>Be the first to share a tip, question, or market update with farmers across Kenya.</span></div>';
        return;
    }
    
    feedContainer.innerHTML = posts.map(post => createPostHTML(post)).join('');
}

function searchPosts() {
    const searchTerm = document.getElementById('searchPosts').value.toLowerCase();
    const category = document.getElementById('filterCategory').value;
    
    let filtered = allPosts;
    
    if (searchTerm) {
        filtered = filtered.filter(post => 
            post.title.toLowerCase().includes(searchTerm) ||
            post.content.toLowerCase().includes(searchTerm) ||
            post.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
    }
    
    if (category) {
        filtered = filtered.filter(post => post.category === category);
    }
    
    displayPosts(filtered);
}

function filterPosts() {
    searchPosts(); // Reuse search function
}

function createPostHTML(post) {
    const likes = Array.isArray(post.likes) ? post.likes : [];
    const comments = Array.isArray(post.comments) ? post.comments : [];
    const tags = Array.isArray(post.tags) ? post.tags : [];
    const author = post.author || {};
    const authorId = String(currentUser && (currentUser._id || currentUser.id) || '');
    const isLiked = authToken && likes.some(like => String(like._id || like) === authorId);
    const categoryColors = {
        general: '#3498db',
        question: '#9b59b6',
        advice: '#2ecc71',
        disease: '#e74c3c',
        weather: '#f39c12',
        marketplace: '#1abc9c',
        emergency: '#c0392b'
    };
    const category = categoryColors[post.category] ? post.category : 'general';
    const postId = escapeCartText(post._id);
    
    return `
        <div class="post-card">
            <div class="post-header">
                <div class="post-avatar">${escapeCartText(String(author.name || 'F').charAt(0).toUpperCase())}</div>
                <div class="post-info">
                    <h3>${escapeCartText(author.name || 'Farmer')}</h3>
                    <div class="post-meta">
                        ${escapeCartText(author.role || 'Farmer')} â€¢ ${escapeCartText(author.location || 'Kenya')} â€¢ ${formatDate(post.createdAt)}
                    </div>
                </div>
            </div>
            <span class="post-category" style="--post-category-color: ${categoryColors[category]}">${escapeCartText(category)}</span>
            <h3 class="post-title">${escapeCartText(post.title || 'Community post')}</h3>
            <p class="post-content">${escapeCartText(post.content || '')}</p>
            ${tags.length > 0 ? `
                <div class="post-tags">
                    ${tags.map(tag => `<span class="tag">#${escapeCartText(tag)}</span>`).join('')}
                </div>
            ` : ''}
            <div class="post-actions">
                <button class="post-action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${postId}')">
                    â¤ï¸ ${likes.length} Likes
                </button>
                <button class="post-action-btn" onclick="toggleComments('${postId}')">
                    ðŸ’¬ ${comments.length} Comments
                </button>
            </div>
            <div class="comments-section hidden" id="comments-${postId}">
                ${comments.map(comment => `
                    <div class="comment">
                        <div class="comment-author">${escapeCartText(comment.user && comment.user.name || 'Farmer')} (${escapeCartText(comment.user && comment.user.role || 'farmer')})</div>
                        <div class="comment-text">${escapeCartText(comment.text || '')}</div>
                    </div>
                `).join('')}
                ${authToken ? `
                    <form class="comment-form" onsubmit="addComment(event, '${postId}')">
                        <input type="text" class="input" placeholder="Add a comment..." required>
                        <button type="submit" class="btn btn-primary">Post</button>
                    </form>
                ` : ''}
            </div>
        </div>
    `;
}

async function createPost(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    // Convert tags to array
    if (data.tags) {
        data.tags = data.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    }
    
    try {
        const response = await fetch(`${API_URL}/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            closeModal('createPostModal');
            e.target.reset();
            loadPosts();
            showAlert('Post created successfully!', 'success');
        } else {
            const result = await response.json();
            showAlert(result.message || 'Failed to create post', 'error');
        }
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

async function toggleLike(postId) {
    if (!authToken) {
        showAlert('Please login to like posts', 'error');
        return;
    }
    
    try {
        await fetch(`${API_URL}/posts/${postId}/like`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        loadPosts();
    } catch (error) {
        console.error('Error toggling like:', error);
    }
}

// Alias for likePost (called from HTML)
async function likePost(postId) {
    return toggleLike(postId);
}

// Comment on post
async function commentPost(postId) {
    const text = await showAppPrompt('Enter your comment:', {
        title: 'Add a comment',
        multiline: true,
        submitText: 'Post comment'
    });
    if (!text || !text.trim()) return;
    
    try {
        await fetch(`${API_URL}/posts/${postId}/comment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ text })
        });
        loadPosts();
        showAlert('Comment added!', 'success');
    } catch (error) {
        console.error('Error adding comment:', error);
        showAlert('Failed to add comment', 'error');
    }
}

function toggleComments(postId) {
    const commentsSection = document.getElementById(`comments-${postId}`);
    commentsSection.classList.toggle('hidden');
}

async function addComment(e, postId) {
    e.preventDefault();
    const input = e.target.querySelector('input');
    const text = input.value;
    
    try {
        const response = await fetch(`${API_URL}/posts/${postId}/comment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ text })
        });
        
        if (response.ok) {
            input.value = '';
            loadPosts();
        }
    } catch (error) {
        console.error('Error adding comment:', error);
    }
}

// Weather functions
async function getWeather() {
    if (!requireAppLogin('weather')) return;
    const location = document.getElementById('weatherLocation').value;
    if (!location.trim()) return getWeatherForCurrentLocation();
    
    try {
        setWeatherStatus('Loading weatherâ€¦');
        const response = await fetch(`${API_URL}/weather?location=${encodeURIComponent(location.trim())}`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        const data = await response.json();
        
        if (response.ok) {
            displayWeather(data);
            weatherCoordinates = null;
            weatherManualLocation = location.trim();
            setWeatherStatus(`Weather for ${data.location.name} updated ${new Date().toLocaleTimeString()}.`);
        } else {
            setWeatherStatus(data.message || 'Could not load weather.');
        }
    } catch (error) {
        setWeatherStatus('Weather service is unavailable. Please try again.');
    }
}

function setWeatherStatus(message) {
    const status = document.getElementById('weatherStatus');
    if (status) status.textContent = message;
}

function requestBrowserLocation(fresh = false) {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('This browser does not provide location access.'));
        navigator.geolocation.getCurrentPosition(
            position => resolve({ lat: position.coords.latitude, lon: position.coords.longitude }),
            error => reject(new Error(error.code === 1 ? 'Location permission was denied. Enter a town name or allow location access.' : 'Could not determine your location. Enter a town name and try again.')),
            { enableHighAccuracy: false, timeout: 12000, maximumAge: fresh ? 0 : 600000 }
        );
    });
}

async function fetchWeatherForCoordinates(coordinates) {
    setWeatherStatus('Finding your local weatherâ€¦');
    const query = new URLSearchParams({ lat: coordinates.lat, lon: coordinates.lon });
    const response = await fetch(`${API_URL}/weather?${query}`, {
        headers: { Authorization: `Bearer ${authToken}` },
        cache: 'no-store'
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Could not load local weather.');
    weatherCoordinates = coordinates;
    displayWeather(data);
    setWeatherStatus(`Live local weather for ${data.location.name} Â· updated ${new Date().toLocaleTimeString()}. Refreshes every 10 minutes.`);
}

async function getWeatherForCurrentLocation() {
    if (!requireAppLogin('weather')) return;
    try {
        weatherManualLocation = null;
        const coordinates = await requestBrowserLocation();
        await fetchWeatherForCoordinates(coordinates);
    } catch (error) {
        setWeatherStatus(error.message);
    }
}

async function startAutomaticWeather() {
    if (weatherRefreshTimer) clearInterval(weatherRefreshTimer);
    try {
        const coordinates = await requestBrowserLocation();
        await fetchWeatherForCoordinates(coordinates);
        weatherRefreshTimer = setInterval(() => {
            if (document.visibilityState === 'visible') {
                if (weatherManualLocation) {
                    getWeather();
                } else {
                    requestBrowserLocation(true)
                        .then(fetchWeatherForCoordinates)
                        .catch(error => setWeatherStatus(error.message));
                }
            }
        }, 10 * 60 * 1000);
    } catch (error) {
        setWeatherStatus(`${error.message} You can still search by town name.`);
    }
}

function displayWeather(data) {
    const container = document.getElementById('weatherContainer');
    
    container.innerHTML = `
        <div class="weather-current">
            <h3>${escapeCartText(data.location.name)}, ${escapeCartText(data.location.country)}</h3>
            <div class="weather-header">
                <div>
                    <div class="weather-temp">${Math.round(data.current.temperature)}Â°C</div>
                    <div>${escapeCartText(data.current.description)}</div>
                </div>
                <div class="weather-icon">
                    <img src="https://openweathermap.org/img/wn/${escapeCartText(data.current.icon)}@2x.png" alt="Weather icon">
                </div>
            </div>
            <div class="weather-details">
                <div class="weather-detail">
                    <div class="weather-detail-label">Feels Like</div>
                    <div class="weather-detail-value">${Math.round(data.current.feelsLike)}Â°C</div>
                </div>
                <div class="weather-detail">
                    <div class="weather-detail-label">Humidity</div>
                    <div class="weather-detail-value">${data.current.humidity}%</div>
                </div>
                <div class="weather-detail">
                    <div class="weather-detail-label">Wind Speed</div>
                    <div class="weather-detail-value">${data.current.windSpeed} m/s</div>
                </div>
                <div class="weather-detail">
                    <div class="weather-detail-label">Pressure</div>
                    <div class="weather-detail-value">${data.current.pressure} hPa</div>
                </div>
            </div>
        </div>
        
        <div>
            <h3>Forecast</h3>
            <div class="weather-forecast">
                ${data.forecast.map(item => `
                    <div class="forecast-item">
                        <div>${formatTime(item.date)}</div>
                        <img src="https://openweathermap.org/img/wn/${escapeCartText(item.icon)}.png" alt="Weather icon">
                        <div>${Math.round(item.temperature)}Â°C</div>
                        <div>${escapeCartText(item.description)}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Veterinarians functions
async function loadVeterinarians() {
    if (!authToken) return;
    try {
        const response = await fetch(`${API_URL}/users/vets`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        if (!response.ok) throw new Error('Could not load veterinarians');
        const vets = await response.json();
        
        allVets = vets; // Store all vets
        displayVets(vets);
    } catch (error) {
        console.error('Error loading veterinarians:', error);
        document.getElementById('vetsContainer').innerHTML = `
            <div class="vet-empty-state">
                <div class="vet-empty-icon" aria-hidden="true">ðŸ“¡</div>
                <h3>Veterinarians could not be loaded</h3>
                <p>Check your connection and try again.</p>
                <button type="button" class="btn btn-outline" onclick="loadVeterinarians()">Try again</button>
            </div>
        `;
    }
}

function displayVets(vets) {
    const container = document.getElementById('vetsContainer');
    
    if (vets.length === 0) {
        const searching = document.getElementById('searchVets').value.trim();
        container.innerHTML = searching ? `
            <div class="vet-empty-state">
                <div class="vet-empty-icon" aria-hidden="true">ðŸ”Ž</div>
                <h3>No matching veterinarians</h3>
                <p>Try a different name, specialty, or location.</p>
            </div>
        ` : `
            <div class="vet-empty-state">
                <div class="vet-empty-icon" aria-hidden="true">ðŸ©º</div>
                <h3>Be the first veterinarian in the directory</h3>
                <p>Veterinarians can create an account to add their specialty and location, then appear here for farmers to find.</p>
                <button type="button" class="btn btn-primary" onclick="showVetRegistration()">Register as a veterinarian</button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = vets.map(vet => `
        <div class="vet-card">
            <div class="vet-card-header">
                <div class="vet-avatar">${escapeCartText(String(vet.name || 'V').charAt(0).toUpperCase())}</div>
                <div class="vet-heading">
                    <h3 class="vet-name">${escapeCartText(vet.name)}</h3>
                    <div class="vet-specialization">${escapeCartText(vet.specialization)}</div>
                </div>
            </div>
            <div class="vet-info">
                <p><span aria-hidden="true">ðŸ“</span><span>${escapeCartText(vet.location)}</span></p>
                <p><span aria-hidden="true">ðŸ“ž</span><span>${escapeCartText(vet.phone)}</span></p>
                ${vet.bio ? `<p class="vet-bio">${escapeCartText(vet.bio)}</p>` : ''}
            </div>
            ${authToken && currentUser.role === 'farmer' ? `
                <button class="btn btn-primary btn-block" onclick="requestConsultation('${escapeCartText(vet._id)}')">
                    Request Consultation
                </button>
                <button class="btn btn-outline btn-block" onclick="startConversation('${vet._id}')" style="margin-top: 0.5rem;">
                    ðŸ’¬ Message
                </button>
            ` : ''}
        </div>
    `).join('');
}

function searchVets() {
    const searchTerm = document.getElementById('searchVets').value.toLowerCase();
    
    if (!searchTerm) {
        displayVets(allVets);
        return;
    }
    
    const filtered = allVets.filter(vet =>
        vet.name.toLowerCase().includes(searchTerm) ||
        vet.specialization.toLowerCase().includes(searchTerm) ||
        vet.location.toLowerCase().includes(searchTerm)
    );
    
    displayVets(filtered);
}

function requestConsultation(vetId) {
    const vetName = allVets.find(vet => String(vet._id) === String(vetId))?.name || 'Veterinarian';
    document.getElementById('selectedVetId').value = vetId;
    document.getElementById('selectedVetName').value = vetName;
    showModal('consultationModal');
}

async function createConsultation(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    try {
        const response = await fetch(`${API_URL}/consultations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            closeModal('consultationModal');
            e.target.reset();
            loadConsultations();
            showAlert('Consultation request sent successfully!', 'success');
        } else {
            const result = await response.json();
            showAlert(result.message || 'Failed to create consultation', 'error');
        }
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

async function loadConsultations() {
    if (!authToken) return;
    
    try {
        const response = await fetch(`${API_URL}/consultations`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const consultations = await response.json();
        
        const container = document.getElementById('consultationsContainer');
        
        if (consultations.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No consultations yet</p></div>';
            return;
        }
        
        container.innerHTML = consultations.map(consultation => `
            <div class="post-card">
                <h3>${escapeCartText(consultation.subject)}</h3>
                <p><strong>Status:</strong> <span class="post-category">${escapeCartText(consultation.status)}</span></p>
                <p><strong>Farmer:</strong> ${escapeCartText(consultation.farmer.name)} (${escapeCartText(consultation.farmer.location)})</p>
                <p><strong>Veterinarian:</strong> ${escapeCartText(consultation.veterinarian.name)} (${escapeCartText(consultation.veterinarian.specialization)})</p>
                <p><strong>Description:</strong> ${escapeCartText(consultation.description)}</p>
                <p><small>${formatDate(consultation.createdAt)}</small></p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading consultations:', error);
    }
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        if (diffHours === 0) {
            const diffMinutes = Math.floor(diffTime / (1000 * 60));
            return `${diffMinutes} minutes ago`;
        }
        return `${diffHours} hours ago`;
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString();
    }
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function showAlert(message, type) {
    return showAppMessage(message, { type, duration: 5000 });
}

// Notifications functions
async function loadNotifications() {
    if (!authToken) return;
    
    try {
        const response = await fetch(`${API_URL}/notifications/unread-count`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        
        const badge = document.getElementById('notificationBadge');
        if (data.count > 0) {
            badge.textContent = data.count;
            badge.style.display = 'inline';
        } else {
            badge.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

async function toggleNotifications() {
    const dropdown = document.getElementById('notificationsDropdown');
    const isHidden = dropdown.classList.contains('hidden');
    
    if (isHidden) {
        // Load and show notifications
        closeCart();
        document.getElementById('wishlistDropdown').classList.add('hidden');
        dropdown.classList.remove('hidden');
        await loadNotificationsList();
    } else {
        dropdown.classList.add('hidden');
    }
}

async function loadNotificationsList() {
    try {
        const response = await fetch(`${API_URL}/notifications`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const notifications = await response.json();
        
        const list = document.getElementById('notificationsList');
        
        if (notifications.length === 0) {
            list.innerHTML = '<div class="empty-state"><p>No notifications</p></div>';
            return;
        }
        
        list.innerHTML = notifications.map(notif => `
            <div class="notification-item ${notif.isRead ? '' : 'unread'}" onclick="markNotificationRead('${escapeCartText(notif._id)}')">
                <div class="notification-content">
                    <div class="notification-icon">${getNotificationIcon(notif.type)}</div>
                    <div class="notification-text">
                        <strong>${escapeCartText(notif.from && notif.from.name || 'Farmers App')}</strong> ${escapeCartText(notif.message)}
                        <div class="notification-time">${formatDate(notif.createdAt)}</div>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading notifications list:', error);
    }
}

function getNotificationIcon(type) {
    const icons = {
        'like': 'â¤ï¸',
        'comment': 'ðŸ’¬',
        'consultation': 'ðŸ©º',
        'post': 'ðŸ“',
        'message': 'âœ‰ï¸'
    };
    return Object.prototype.hasOwnProperty.call(icons, type) ? icons[type] : 'ðŸ””';
}

async function markNotificationRead(notifId) {
    try {
        await fetch(`${API_URL}/notifications/${notifId}/read`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        loadNotifications();
        loadNotificationsList();
    } catch (error) {
        console.error('Error marking notification read:', error);
    }
}

async function markAllNotificationsRead() {
    try {
        await fetch(`${API_URL}/notifications/read-all`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        loadNotifications();
        loadNotificationsList();
    } catch (error) {
        console.error('Error marking all notifications read:', error);
    }
}

// Close notifications when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('notificationsDropdown');
    const btn = document.getElementById('notificationBtn');
    
    if (dropdown && !dropdown.contains(e.target) && !btn.contains(e.target)) {
        dropdown.classList.add('hidden');
    }
});

// Messages functions
async function loadMessageCount() {
    if (!authToken) return;
    
    try {
        const response = await fetch(`${API_URL}/messages/unread/count`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Could not load unread messages.');
        
        const badge = document.getElementById('messagesBadge');
        if (!badge) return;
        if (data.count > 0) {
            badge.textContent = data.count;
            badge.style.display = 'inline';
        } else {
            badge.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading message count:', error);
    }
}

async function loadConversations(selectedUserId = activeMessageUserId) {
    if (!authToken) return;

    try {
        const response = await fetch(`${API_URL}/messages/conversations`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        const conversations = await response.json();
        if (!response.ok) throw new Error(conversations.message || 'Could not load conversations.');

        const list = document.getElementById('conversationsList');
        if (!list) return;
        list.replaceChildren();

        if (!conversations.length) {
            const emptyState = document.createElement('div');
            const message = document.createElement('p');
            emptyState.className = 'empty-state';
            message.textContent = 'No conversations yet. Choose Message on a veterinarian profile to start chatting.';
            emptyState.appendChild(message);
            list.appendChild(emptyState);
            return;
        }

        conversations.forEach(conversation => {
            const user = conversation.user;
            const userId = String(user._id);
            const item = document.createElement('button');
            const avatar = document.createElement('span');
            const info = document.createElement('span');
            const name = document.createElement('strong');
            const preview = document.createElement('span');
            const isActive = userId === String(selectedUserId || '');

            item.type = 'button';
            item.className = `conversation-item${isActive ? ' active' : ''}`;
            item.setAttribute('aria-current', isActive ? 'true' : 'false');
            avatar.className = 'conversation-avatar';
            avatar.textContent = String(user.name || '?').charAt(0).toUpperCase();
            info.className = 'conversation-info';
            name.textContent = user.name || 'Farmer';
            preview.className = 'conversation-preview';
            preview.textContent = conversation.lastMessage?.text || 'No messages yet';
            info.append(name, preview);
            item.append(avatar, info);

            if (conversation.unreadCount > 0) {
                const unread = document.createElement('span');
                unread.className = 'unread-badge';
                unread.textContent = String(conversation.unreadCount);
                item.appendChild(unread);
            }

            item.addEventListener('click', () => startConversation(userId, user.name));
            list.appendChild(item);
        });

        if (!activeMessageUserId && conversations.length) {
            const first = conversations[0];
            activeMessageUserId = String(first.user._id);
            activeMessageUserName = first.user.name || 'Farmer';
            await loadMessages(activeMessageUserId, activeMessageUserName);
        }
    } catch (error) {
        console.error('Error loading conversations:', error);
        showAppMessage(error.message || 'Could not load conversations.', { type: 'error' });
    }
}

async function startConversation(userId, userName) {
    if (!authToken) {
        showAppMessage('Please log in to send messages.', { type: 'info' });
        return;
    }

    const recipientId = String(userId || '');
    let recipientName = userName || allVets.find(vet => String(vet._id) === recipientId)?.name;
    if (!recipientName) {
        try {
            const response = await fetch(`${API_URL}/users/${encodeURIComponent(recipientId)}`, {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            const recipient = await response.json();
            if (!response.ok) throw new Error(recipient.message || 'Could not find this user.');
            recipientName = recipient.name;
        } catch (error) {
            showAppMessage(error.message || 'Could not open this conversation.', { type: 'error' });
            return;
        }
    }

    activeMessageUserId = recipientId;
    activeMessageUserName = recipientName;
    const messagesLink = document.querySelector('[href="#messages"]');
    if (messagesLink) messagesLink.click();
    await loadMessages(recipientId, recipientName);
    await Promise.all([
        loadConversations(recipientId),
        loadMessageCount()
    ]);
}

async function loadMessages(userId, userName) {
    try {
        const response = await fetch(`${API_URL}/messages/${userId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const messages = await response.json();
        if (!response.ok) throw new Error(messages.message || 'Could not load this conversation.');

        const chatContainer = document.getElementById('messagesChat');
        if (!chatContainer) return;
        chatContainer.replaceChildren();

        const header = document.createElement('div');
        const title = document.createElement('h3');
        const messageList = document.createElement('div');
        header.className = 'chat-header';
        title.textContent = userName || activeMessageUserName || 'Conversation';
        header.appendChild(title);
        messageList.className = 'chat-messages';
        messageList.id = 'chatMessages';

        if (!messages.length) {
            const emptyState = document.createElement('p');
            emptyState.className = 'empty-state';
            emptyState.textContent = 'No messages yet. Start the conversation below.';
            messageList.appendChild(emptyState);
        }

        const currentUserId = String(currentUser && (currentUser._id || currentUser.id) || '');
        messages.forEach(message => {
            const bubble = document.createElement('div');
            const content = document.createElement('div');
            const timestamp = document.createElement('time');
            const senderId = String(message.sender && (message.sender._id || message.sender) || '');
            bubble.className = `message-bubble ${senderId === currentUserId ? 'sent' : 'received'}`;
            content.textContent = message.text;
            timestamp.className = 'message-time';
            timestamp.dateTime = message.createdAt;
            timestamp.textContent = new Date(message.createdAt).toLocaleString();
            bubble.append(content, timestamp);
            messageList.appendChild(bubble);
        });

        const form = document.createElement('form');
        const input = document.createElement('textarea');
        const sendButton = document.createElement('button');
        form.className = 'chat-input-form';
        input.className = 'input';
        input.name = 'message';
        input.placeholder = 'Write a message...';
        input.maxLength = 2000;
        input.required = true;
        input.setAttribute('aria-label', 'Message');
        sendButton.type = 'submit';
        sendButton.className = 'btn btn-primary';
        sendButton.textContent = 'Send';
        form.append(input, sendButton);
        form.addEventListener('submit', event => sendMessage(event, userId));
        chatContainer.append(header, messageList, form);

        const chatMessages = document.getElementById('chatMessages');
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (error) {
        console.error('Error loading messages:', error);
        showAppMessage(error.message || 'Could not load this conversation.', { type: 'error' });
    }
}

// Open chat with a user
function openChat(userId, userName) {
    
    if (!authToken) {
        showAlert('Please login to send messages', 'error');
        return;
    }
    
    // Switch to messages tab
    const messagesTab = document.querySelector('[data-section="messages"]');
    if (messagesTab) {
        messagesTab.click();
    }
    
    // Load messages with this user
    loadMessages(userId, userName);
    showAlert(`Chat opened with ${userName}`, 'success');
}

// Book consultation
async function bookConsultation() {
    showAlert('Consultation booking - Coming soon!', 'info');
}

// Switch consultation tab
function switchConsultationTab(tab) {
    // TODO: Implement tab switching
}

// Update consultation status
async function updateConsultationStatus(consultationId, status) {
    showAlert('Consultation status update - Coming soon!', 'info');
}

// Show delivery tracking
function showTracking(orderId) {
    showOrderTracking(orderId);
}

async function sendMessage(e, recipientId) {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.message;
    const text = input.value.trim();
    if (!text) return;
    const sendButton = form.querySelector('button[type="submit"]');
    sendButton.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ recipient: recipientId, text })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Could not send message.');

        input.value = '';
        await Promise.all([
            loadMessages(recipientId, activeMessageUserName),
            loadConversations(recipientId),
            loadMessageCount()
        ]);
    } catch (error) {
        console.error('Error sending message:', error);
        showAppMessage(error.message || 'Could not send message.', { type: 'error' });
    } finally {
        sendButton.disabled = false;
    }
}

// ==================== MARKETPLACE FUNCTIONS ====================

let allProducts = [];
let selectedProduct = null;

// Load all products
async function loadProducts() {
    if (!authToken) return;
    try {
        const response = await fetch(`${API_URL}/products`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        const data = await response.json();
        const products = data.products || data; // Handle both formats
        allProducts = products;
        displayProducts(products);
    } catch (error) {
        console.error('âŒ Error loading products:', error);
        document.getElementById('productsContainer').innerHTML = 
            '<p class="no-data">âŒ Error loading products. Please refresh the page.</p>';
    }
}

// Display products in grid
function displayProducts(products) {
    const container = document.getElementById('productsContainer');
    
    if (products.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No products available yet.</p><span>List a fresh harvest, livestock item, or input to start the market moving.</span></div>';
        return;
    }
    
    // Product category emojis
    const categoryIcons = {
        crops: 'ðŸŒ¾',
        vegetables: 'ðŸ¥•',
        fruits: 'ðŸŽ',
        grains: 'ðŸŒ½',
        livestock: 'ðŸ„',
        poultry: 'ðŸ”',
        dairy: 'ðŸ¥›',
        eggs: 'ðŸ¥š',
        seeds: 'ðŸŒ±',
        fertilizers: 'ðŸ§ª',
        pesticides: 'ðŸ’Š',
        equipment: 'ðŸšœ',
        tools: 'ðŸ”§',
        machinery: 'âš™ï¸',
        organic: 'ðŸŒ¿',
        processed: 'ðŸ“¦',
        mushrooms: 'ðŸ„',
        herbs: 'ðŸŒ¿',
        spices: 'ðŸŒ¶ï¸',
        honey: 'ðŸ¯',
        fish: 'ðŸŸ',
        nuts: 'ðŸ¥œ',
        coffee: 'â˜•',
        tea: 'ðŸµ',
        other: 'ðŸ›’'
    };
    
    container.innerHTML = products.map(product => `
        <div class="product-card">
            <div class="product-image" onclick="showProductDetails('${escapeCartText(product._id)}')">
            ${Object.prototype.hasOwnProperty.call(categoryIcons, product.category) ? categoryIcons[product.category] : 'ðŸŒ¾'}
            </div>
            ${product.isOrganic ? '<div class="organic-badge">âœ“ Organic</div>' : ''}
            <div class="product-card-content" onclick="showProductDetails('${escapeCartText(product._id)}')">
                <div class="product-category">${escapeCartText(product.category)}</div>
                <h3 class="product-title">${escapeCartText(product.name)}</h3>
                <p class="product-description">${escapeCartText(String(product.description || '').substring(0, 100))}${String(product.description || '').length > 100 ? '...' : ''}</p>
                <div class="product-meta">
                    <div class="product-price">
                        KSH ${Number(product.price).toLocaleString()}/${escapeCartText(product.unit)}
                        ${product.isNegotiable ? '<span class="negotiable-tag">Negotiable</span>' : ''}
                    </div>
                    <div class="product-seller">ðŸ‘¤ ${escapeCartText(product.seller && product.seller.name || 'Unknown seller')}</div>
                    <div class="product-location">ðŸ“ ${escapeCartText(product.location)}</div>
                    <div class="product-quantity">ðŸ“¦ ${Number(product.quantity)} ${escapeCartText(product.unit)} available</div>
                </div>
                <div class="product-stats">
                    <span>â¤ï¸ ${product.likes ? product.likes.length : 0}</span>
                    <span>â­ ${product.averageRating ? product.averageRating.toFixed(1) : 'N/A'}</span>
                    <span>ðŸ‘ï¸ ${product.views || 0} views</span>
                </div>
            </div>
            <div style="display: flex; gap: 0.5rem; padding: 0 1rem 1rem;">
                <button class="btn btn-primary" onclick="event.stopPropagation(); addToCart('${escapeCartText(product._id)}')" style="flex: 1;">
                    ðŸ›’ Cart
                </button>
                <button class="btn btn-outline" onclick="event.stopPropagation(); addToWishlist('${escapeCartText(product._id)}')" style="flex: 1; background: rgba(239, 68, 68, 0.1); border-color: #ef4444; color: #ef4444;">
                    â¤ï¸ Wishlist
                </button>
            </div>
        </div>
    `).join('');
}

// Search products
function searchProducts() {
    const searchTerm = document.getElementById('searchProducts').value.toLowerCase();
    const filtered = allProducts.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm) ||
        product.category.toLowerCase().includes(searchTerm)
    );
    displayProducts(filtered);
}

// Filter products
async function filterProducts() {
    const category = document.getElementById('filterProductCategory').value;
    const organic = document.getElementById('organicFilter').checked ? 'true' : '';
    const county = document.getElementById('filterProductCounty').value;
    
    let url = `${API_URL}/products?`;
    if (category) url += `category=${category}&`;
    if (organic) url += `isOrganic=${organic}&`;
    if (county) url += `location=${encodeURIComponent(county)}&`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Could not filter products');
        const data = await response.json();
        const products = data.products || data;
        allProducts = products;
        displayProducts(products);
    } catch (error) {
        console.error('Error filtering products:', error);
        showAlert('Could not filter products. Please try again.', 'error');
    }
}

// Show add product modal
function showAddProduct() {
    if (!authToken) {
        showAppMessage('Please login to add a product', { type: 'info' });
        showLogin();
        return;
    }
    showModal('addProductModal');
}

// Add new product
async function addProduct(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    // Convert isOrganic and isNegotiable to boolean
    data.isOrganic = data.isOrganic === 'true';
    data.isNegotiable = data.isNegotiable === 'true';
    
    try {
        const response = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            closeModal('addProductModal');
            e.target.reset();
            loadProducts();
            loadMyListings();
            showAlert('Product added successfully!', 'success');
        } else {
            const error = await response.json();
            showAlert(error.message || 'Failed to add product', 'error');
        }
    } catch (error) {
        console.error('Error adding product:', error);
        showAlert('Failed to add product', 'error');
    }
}

// Show product details
async function showProductDetails(productId) {
    try {
        const response = await fetch(`${API_URL}/products/${productId}`, {
            headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('âŒ Product not found:', errorData);
            showAppMessage('Product not found: ' + (errorData.message || 'Unknown error'), { type: 'error' });
            return;
        }
        
        const product = await response.json();
        selectedProduct = product;
        
        const isOwner = currentUser && (product.seller._id === currentUser._id || product.seller._id === currentUser.id);
        const canBuy = currentUser && !isOwner && product.status === 'available' && product.quantity > 0;
        
        
        document.getElementById('productDetailContent').innerHTML = `
            <div class="product-detail-header">
                <div>
                    <h2>${escapeCartText(product.name)}</h2>
                    <div class="product-category">${escapeCartText(product.category)}</div>
                    ${product.isOrganic ? '<span class="organic-badge">Organic</span>' : ''}
                </div>
                <div class="product-price-large">
                    KSH ${Number(product.price).toLocaleString()}/${escapeCartText(product.unit)}
                    ${product.isNegotiable ? '<div class="negotiable-tag">Negotiable</div>' : ''}
                </div>
            </div>
            
            <div class="product-detail-meta">
                <div><strong>Seller:</strong> ${escapeCartText(product.seller ? product.seller.name : 'Unknown')}</div>
                <div><strong>Location:</strong> ${escapeCartText(product.location)}</div>
                <div><strong>Available:</strong> ${Number(product.quantity)} ${escapeCartText(product.unit)}</div>
                <div><strong>Rating:</strong> â­ ${product.averageRating ? product.averageRating.toFixed(1) : 'N/A'} (${product.reviews ? product.reviews.length : 0} reviews)</div>
            </div>
            
            <div class="product-description">
                <h4>Description</h4>
                <p>${escapeCartText(product.description)}</p>
            </div>
            
            ${product.images && product.images.length > 0 ? `
                <div class="product-images">
                    ${product.images.map(img => `<img src="${escapeCartText(img)}" alt="${escapeCartText(product.name)}">`).join('')}
                </div>
            ` : ''}
            
            <div class="product-reviews">
                <h4>Reviews (${product.reviews ? product.reviews.length : 0})</h4>
                ${product.reviews && product.reviews.length > 0 ? product.reviews.map(review => `
                    <div class="review-item">
                        <div class="review-header">
                            <strong>${escapeCartText(review.user && review.user.name || 'Farmer')}</strong>
                            <span>â­ ${review.rating}/5</span>
                        </div>
                        <p>${escapeCartText(review.comment)}</p>
                        <small>${formatDate(review.createdAt)}</small>
                    </div>
                `).join('') : '<p>No reviews yet</p>'}
            </div>
            
            <div class="product-detail-actions">
                ${canBuy ? `<button onclick="showPlaceOrder('${escapeCartText(product._id)}')" class="btn btn-primary">ðŸ›’ Buy Now</button>` : ''}
                ${isOwner ? `
                    <button onclick="editProduct('${escapeCartText(product._id)}')" class="btn btn-secondary">âœï¸ Edit</button>
                    <button onclick="deleteProduct('${escapeCartText(product._id)}')" class="btn btn-danger">ðŸ—‘ï¸ Delete</button>
                ` : ''}
                ${!isOwner && authToken ? `<button onclick="likeProduct('${product._id}')" class="btn">â¤ï¸ Like</button>` : ''}
            </div>
        `;
        
        showModal('productDetailModal');
    } catch (error) {
        console.error('Error loading product details:', error);
    }
}

// Like a product
async function likeProduct(productId) {
    if (!authToken) {
        showAppMessage('Please login to like products', { type: 'info' });
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/products/${productId}/like`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            showProductDetails(productId); // Refresh
            loadProducts(); // Refresh list
        }
    } catch (error) {
        console.error('Error liking product:', error);
    }
}

// Show place order modal
function showPlaceOrder(productId) {
    closeModal('productDetailModal');
    
    // Set the product ID in the hidden form field
    const productIdField = document.getElementById('orderProductId');
    if (productIdField) {
        productIdField.value = productId;
    } else {
        console.error('âŒ orderProductId field not found!');
    }
    
    // Set selectedProduct for calculating total
    // Find the product from allProducts array
    selectedProduct = allProducts.find(p => p._id === productId);
    
    if (!selectedProduct) {
        // If not in allProducts, try to get it from the API
        fetch(`${API_URL}/products/${productId}`)
            .then(r => r.json())
            .then(product => {
                selectedProduct = product;
                document.getElementById('orderQuantity').value = 1;
                updateOrderTotal();
            })
            .catch(err => {
                console.error('âŒ Failed to load product:', err);
                showAlert('Failed to load product details', 'error');
            });
    } else {
        document.getElementById('orderQuantity').value = 1;
        updateOrderTotal();
    }
    
    showModal('placeOrderModal');
}

// Update order total
function updateOrderTotal() {
    if (!selectedProduct) return;
    
    const quantity = parseInt(document.getElementById('orderQuantity').value) || 0;
    const total = quantity * selectedProduct.price;
    const totalElement = document.getElementById('orderTotalDisplay');
    if (totalElement) {
        totalElement.textContent = `Total: KSH ${total.toLocaleString()}`;
    }
}

// Place order
async function placeOrder(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    // Debug: Log the data being sent
    
    // Validate product ID exists
    if (!data.product) {
        showAlert('Error: Product ID is missing. Please try again.', 'error');
        console.error('âŒ No product ID in form data');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            const result = await response.json();
            const orders = result.orders || (result._id ? [result] : []);
            closeModal('placeOrderModal');
            e.target.reset();
            selectedProduct = null;
            loadProducts();
            loadMyPurchases();
            showAlert('Order placed successfully!', 'success');
            if (data.paymentMethod === 'mpesa') {
                paymentManager.showPaymentModal(orders, data.buyerPhone);
            }
        } else {
            const error = await response.json();
            console.error('âŒ Order error:', error);
            showAlert(error.message || 'Failed to place order', 'error');
        }
    } catch (error) {
        console.error('âŒ Error placing order:', error);
        showAlert('Failed to place order', 'error');
    }
}

// Switch shop tabs
function switchShopTab(tab) {
    // Update active tab
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Update content - hide all shop content sections
    document.querySelectorAll('.shop-content').forEach(content => content.classList.add('hidden'));
    document.getElementById(`shop-${tab}`).classList.remove('hidden');
    
    // Load data
    if (tab === 'listings') loadMyListings();
    else if (tab === 'sales') loadMySales();
    else if (tab === 'purchases') loadMyPurchases();
}

// Load my product listings
async function loadMyListings() {
    if (!authToken) return;
    
    try {
        const response = await fetch(`${API_URL}/products/my/listings`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const products = await response.json();
        
        const container = document.getElementById('myListingsContainer');
        if (products.length === 0) {
            container.innerHTML = `
                <div class="shop-empty-state">
                    <div class="shop-empty-icon" aria-hidden="true">ðŸ§º</div>
                    <div class="shop-empty-copy">
                        <span class="shop-empty-eyebrow">MY SHOP</span>
                        <h3>Your shop is ready for its first listing</h3>
                        <p>Products you list for sale will appear here. Browse the Marketplace to see products from other farmers.</p>
                        <button type="button" class="btn btn-primary" onclick="showAddProduct()">âž• List a product</button>
                    </div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = products.map(product => `
            <div class="order-card">
                <div class="order-header">
                    <h4>${escapeCartText(product.name)}</h4>
                    <span class="status-badge status-${escapeCartText(product.status)}">${escapeCartText(product.status)}</span>
                </div>
                <div class="order-details">
                    <p><strong>Category:</strong> ${escapeCartText(product.category)}</p>
                    <p><strong>Price:</strong> KSH ${Number(product.price).toLocaleString()}/${escapeCartText(product.unit)}</p>
                    <p><strong>Available:</strong> ${Number(product.quantity)} ${escapeCartText(product.unit)}</p>
                    <p><strong>Likes:</strong> ${product.likes ? product.likes.length : 0} | <strong>Views:</strong> ${product.views || 0}</p>
                    <p><strong>Rating:</strong> ${product.averageRating ? product.averageRating.toFixed(1) : 'N/A'} (${product.reviews ? product.reviews.length : 0} reviews)</p>
                </div>
                <div class="order-actions">
                    <button onclick="showProductDetails('${escapeCartText(product._id)}')" class="btn btn-sm">View</button>
                    <button onclick="deleteProduct('${escapeCartText(product._id)}')" class="btn btn-sm btn-danger">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading my listings:', error);
    }
}

// Load my sales
async function loadMySales() {
    if (!authToken) return;
    
    try {
        const response = await fetch(`${API_URL}/orders/my/sales`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const orders = await response.json();
        
        
        const container = document.getElementById('mySalesContainer');
        if (orders.length === 0) {
            container.innerHTML = '<p class="no-data">No sales yet</p>';
            return;
        }
        
        container.innerHTML = orders.map(order => {
            const productName = order.product ? order.product.name : (order.productName || 'Product unavailable');
            const buyerName = order.buyer ? order.buyer.name : 'Buyer unavailable';
            if (!order || !order._id) return '';
            var safeProductName = escapeCartText(productName || 'Product');
            var safeSellerName = escapeCartText(buyerName || 'Buyer');
            var html = '';
            html += '<div class="order-card">';
            html +=   '<div class="order-header">';
            html +=     '<h4>Order #' + order._id.substring(0, 8) + '</h4>';
            html +=     '<span class="status-badge status-' + escapeCartText(order.status) + '">' + escapeCartText(order.status ? order.status.toUpperCase() : '') + '</span>';
            html +=   '</div>';
            html +=   '<div class="order-details">';
            html +=     '<div class="order-details-col">';
            html +=       '<p><strong>Product:</strong> ' + safeProductName + (!order.product ? ' <span style="color: #999;">(deleted)</span>' : '') + '</p>';
            html +=       '<p><strong>Seller:</strong> ' + safeSellerName + '</p>';
            html +=       '<p><strong>Delivery:</strong> ' + escapeCartText(order.deliveryMethod || '') + '</p>';
            html +=       '<p><strong>Payment:</strong> ' + escapeCartText(order.paymentMethod || '') + '</p>';
            html +=     '</div>';
            html +=     '<div class="order-details-col right">';
            html +=       '<p><strong>Qty:</strong> ' + (order.quantity || '') + '</p>';
            html +=       '<p><strong>Total:</strong> KSH ' + ((order.totalAmount || 0).toLocaleString()) + '</p>';
            html +=       '<p><strong>Date:</strong> ' + (order.createdAt ? formatDate(order.createdAt) : '') + '</p>';
            html +=     '</div>';
            html +=   '</div>';
            html +=   '<div class="order-actions">';
            html +=     '<button onclick="showOrderTracking(\'' + escapeCartText(order._id) + '\')" class="btn btn-sm btn-primary">ðŸ“ Track Order</button>';
            // Review button temporarily removed to fix syntax error
            if (order.status === 'pending') {
                html += '<button onclick="cancelOrder(\'' + escapeCartText(order._id) + '\')" class="btn btn-sm btn-danger">âŒ Cancel</button>';
            }
            html +=   '</div>';
            html += '</div>';
            return html;
        }).filter(Boolean).join('');
    } catch (error) {
        console.error('Error loading sales:', error);
    }
}

// Load my purchases
async function loadMyPurchases() {
    if (!authToken) return;
    
    try {
        const response = await fetch(`${API_URL}/orders/my/purchases`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const orders = await response.json();
        
        
        const container = document.getElementById('myPurchasesContainer');
        if (orders.length === 0) {
            container.innerHTML = '<p class="no-data">No purchases yet</p>';
            return;
        }
        
        container.innerHTML = orders.map(order => {
                var productName = escapeCartText(order.product ? order.product.name : (order.productName || 'Product unavailable'));
                var sellerName = escapeCartText(order.seller ? order.seller.name : 'Seller unavailable');
                var productId = order.product ? order.product._id : null;
                var html = '';
                html += '<div class="order-card">';
                html +=   '<div class="order-header">';
                html +=     '<h4>Order #' + order._id.substring(0, 8) + '</h4>';
                html +=     '<span class="status-badge status-' + escapeCartText(order.status) + '">' + escapeCartText(order.status ? order.status.toUpperCase() : '') + '</span>';
                html +=   '</div>';
                html +=   '<div class="order-details">';
                html +=     '<p><strong>Product:</strong> ' + productName + (!order.product ? ' <span style="color: #999;">(deleted)</span>' : '') + '</p>';
                html +=     '<p><strong>Seller:</strong> ' + sellerName + '</p>';
                html +=     '<p><strong>Qty:</strong> ' + (order.quantity || '') + ' | <strong>Total:</strong> KSH ' + ((order.totalAmount || 0).toLocaleString()) + '</p>';
                html +=     '<p><strong>Delivery:</strong> ' + escapeCartText(order.deliveryMethod || '') + '</p>';
                html +=     '<p><strong>Payment:</strong> ' + escapeCartText(order.paymentMethod || '') + '</p>';
                html +=     '<p><strong>Date:</strong> ' + (order.createdAt ? formatDate(order.createdAt) : '') + '</p>';
                html +=   '</div>';
                html +=   '<div class="order-actions">';
                html +=     '<button onclick="showOrderTracking(\'' + escapeCartText(order._id) + '\')" class="btn btn-sm btn-primary">ðŸ“ Track Order</button>';
                // Review button (delivered, not yet reviewed)
                if (order.status === 'delivered' && productId && !(order.reviews && order.reviews.find && order.reviews.find(function(r){return r.user === currentUser.id;}))) {
                    html += '<button onclick="addProductReview(\'' + productId + '\', \'" + order._id + "\')" class="btn btn-sm">â­ Review</button>';
                }
                // Cancel button (pending)
                if (order.status === 'pending') {
                    html += '<button onclick="cancelOrder(\'' + escapeCartText(order._id) + '\')" class="btn btn-sm btn-danger">âŒ Cancel</button>';
                }
                html +=   '</div>';
                html += '</div>';
                return html;
        }).filter(Boolean).join('');
    } catch (error) {
        console.error('Error loading purchases:', error);
    }
}

// Cancel order
async function cancelOrder(orderId) {
    if (!await showAppConfirm('Are you sure you want to cancel this order?', {
        title: 'Cancel order',
        submitText: 'Cancel order'
    })) return;
    
    try {
        const response = await fetch(`${API_URL}/orders/${orderId}/cancel`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            loadMyPurchases();
            showAlert('Order cancelled', 'success');
        }
    } catch (error) {
        console.error('Error cancelling order:', error);
    }
}

// Edit product
async function editProduct(productId) {
    // Fetch product details
    try {
        const response = await fetch(`${API_URL}/products/${productId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const product = await response.json();
        
        // Populate edit form (you can create a modal for this)
        // For now, just show an alert
        showAlert('Edit feature - Coming soon! Product: ' + product.name, 'info');
        
        // TODO: Create edit modal and form
    } catch (error) {
        console.error('Error loading product for edit:', error);
        showAlert('Failed to load product', 'error');
    }
}

// Show order details
async function showOrderDetails(orderId) {
    try {
        const response = await fetch(`${API_URL}/orders/${orderId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) {
            showAlert('Failed to load order details', 'error');
            return;
        }
        
        const order = await response.json();
        
        // Show order details in an alert for now
        showAppMessage(`Order Details:\n\nProduct: ${order.productName}\nQuantity: ${order.quantity}\nTotal: KSH ${order.totalAmount}\nStatus: ${order.status}\nDelivery: ${order.deliveryAddress}`, {
            type: 'info',
            duration: 10000
        });
        
    } catch (error) {
        console.error('Error loading order details:', error);
        showAlert('Failed to load order details', 'error');
    }
}

// Delete product
async function deleteProduct(productId) {
    if (!await showAppConfirm('Are you sure you want to delete this product?', {
        title: 'Delete product',
        submitText: 'Delete'
    })) return;
    
    try {
        const response = await fetch(`${API_URL}/products/${productId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            loadMyListings();
            loadProducts();
            showAlert('Product deleted', 'success');
        }
    } catch (error) {
        console.error('Error deleting product:', error);
    }
}

// Add product review
async function addProductReview(productId, orderId) {
    const rating = await showAppPrompt('Rate this product (1-5):', {
        title: 'Product rating',
        inputType: 'number',
        min: 1,
        max: 5,
        step: 1,
        inputLabel: 'Rating from 1 to 5'
    });
    if (rating === null || !rating || Number(rating) < 1 || Number(rating) > 5) return;

    const comment = await showAppPrompt('Write your review:', {
        title: 'Product review',
        multiline: true,
        submitText: 'Submit review'
    });
    if (!comment) return;
    
    fetch(`${API_URL}/products/${productId}/review`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: rating, comment: comment, orderId: orderId })
    })
    .then(response => response.json())
    .then(data => {
        showAlert('Review submitted!', 'success');
        loadMyPurchases();
    })
    .catch(error => {
        console.error('Error submitting review:', error);
        showAlert('Failed to submit review', 'error');
    });
}

// Load cart from server
async function loadCart() {
    if (!authToken) return;
    try {
        const response = await fetch(`${API_URL}/cart`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            cartData = await response.json();
            renderCart();
            updateCartBadge();
        } else {
            throw new Error(`Could not load cart (${response.status})`);
        }
    } catch (error) {
        console.error('Error loading cart:', error);
        showAlert('Could not load your cart. Please try again.', 'error');
    }
}

function escapeCartText(value) {
    return escapeHtml(value);
}

function formatKES(amount) {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        maximumFractionDigits: 0
    }).format(Number(amount) || 0);
}

// Render cart items
function renderCart() {
    const cartItemsList = document.getElementById('cartItemsList');
    const cartFooter = document.getElementById('cartFooter');
    const cartTotalAmount = document.getElementById('cartTotalAmount');
    if (!cartItemsList || !cartFooter || !cartTotalAmount) return;
    
    if (!cartData.items || cartData.items.length === 0) {
        cartItemsList.innerHTML = '<div class="empty-state"><p>Your cart is empty</p></div>';
        cartFooter.classList.add('hidden');
        return;
    }
    
    cartFooter.classList.remove('hidden');
    cartTotalAmount.textContent = formatKES(cartData.totalAmount);
    
    cartItemsList.innerHTML = cartData.items.map(item => {
        const product = item.product;
        if (!product) {
            return `<div class="cart-item"><div class="cart-item-details"><div class="cart-item-name">Unavailable product</div><div class="cart-item-price">Remove this item to continue.</div></div><button class="cart-item-remove" onclick="removeFromCart('${item._id}')" aria-label="Remove unavailable product">ðŸ—‘ï¸</button></div>`;
        }
        const productName = escapeCartText(product.name);
        
        return `
            <div class="cart-item">
                ${product.images && product.images.length > 0
                    ? `<img src="${escapeCartText(product.images[0])}" alt="${productName}" class="cart-item-image">`
                    : '<div class="cart-item-image cart-item-placeholder" aria-hidden="true">ðŸŒ¾</div>'}
                <div class="cart-item-details">
                    <div class="cart-item-name">${productName}</div>
                    <div class="cart-item-price">${formatKES(item.price)} / ${escapeCartText(product.unit)}</div>
                    <div class="cart-item-quantity">
                        <button class="qty-btn" onclick="updateCartQuantity('${item._id}', ${item.quantity - 1})">-</button>
                        <span>${item.quantity}</span>
                        <button class="qty-btn" onclick="updateCartQuantity('${item._id}', ${item.quantity + 1})">+</button>
                        <span style="margin-left: auto; font-weight: 600; color: #10b981;">
                            ${formatKES(item.price * item.quantity)}
                        </span>
                    </div>
                </div>
                <button class="cart-item-remove" onclick="removeFromCart('${item._id}')">ðŸ—‘ï¸</button>
            </div>
        `;
    }).join('');
}

function toggleCart() {
    if (!authToken) {
        showAppMessage('Please log in to use your cart.', { type: 'info' });
        showLogin();
        return;
    }
    const drawer = document.getElementById('cartDropdown');
    const backdrop = document.getElementById('cartBackdrop');
    const willOpen = drawer.classList.contains('hidden');
    document.getElementById('wishlistDropdown').classList.add('hidden');
    document.getElementById('notificationsDropdown').classList.add('hidden');
    drawer.classList.toggle('hidden', !willOpen);
    backdrop.classList.toggle('hidden', !willOpen);
    document.getElementById('cartBtn').setAttribute('aria-expanded', String(willOpen));
    if (willOpen) loadCart();
}

function closeCart() {
    document.getElementById('cartDropdown').classList.add('hidden');
    document.getElementById('cartBackdrop').classList.add('hidden');
    document.getElementById('cartBtn').setAttribute('aria-expanded', 'false');
}

// Add to cart
async function addToCart(productId) {
    if (!authToken) {
        showAlert('Please login to add items to cart', 'error');
        showLogin();
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/cart/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ productId, quantity: 1 })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            cartData = result;
            renderCart();
            updateCartBadge();
            showAlert('Added to cart!', 'success');
        } else {
            showAlert(result.message || 'Failed to add to cart', 'error');
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        showAlert('Error adding to cart', 'error');
    }
}

// Update cart item quantity
async function updateCartQuantity(itemId, newQuantity) {
    if (newQuantity < 1) {
        removeFromCart(itemId);
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/cart/update/${itemId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ quantity: newQuantity })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            cartData = result;
            renderCart();
            updateCartBadge();
        } else {
            showAlert(result.message || 'Failed to update quantity', 'error');
        }
    } catch (error) {
        console.error('Error updating cart:', error);
    }
}

// Remove item from cart
async function removeFromCart(itemId) {
    try {
        const response = await fetch(`${API_URL}/cart/remove/${itemId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            cartData = await response.json();
            renderCart();
            updateCartBadge();
            showAlert('Item removed from cart', 'success');
        }
    } catch (error) {
        console.error('Error removing from cart:', error);
    }
}

// Clear cart
async function clearCart(silent = false) {
    if (!silent && !await showAppConfirm('Are you sure you want to clear your cart?', {
        title: 'Clear cart',
        submitText: 'Clear cart'
    })) return false;
    
    try {
        const response = await fetch(`${API_URL}/cart/clear`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            cartData = result.cart;
            renderCart();
            updateCartBadge();
            if (!silent) showAlert('Cart cleared', 'success');
            return true;
        }
        throw new Error(`Could not clear cart (${response.status})`);
    } catch (error) {
        console.error('Error clearing cart:', error);
        if (!silent) showAlert('Could not clear your cart. Please try again.', 'error');
        return false;
    }
}

// Update cart badge
function updateCartBadge() {
    const cartBadge = document.getElementById('cartBadge');
    const itemCount = cartData.items ? cartData.items.reduce((total, item) => total + item.quantity, 0) : 0;
    
    if (cartBadge) {
        cartBadge.textContent = itemCount;
        cartBadge.style.display = itemCount > 0 ? 'inline-block' : 'none';
    }
}

// Proceed to checkout
function proceedToCheckout() {
    if (!cartData.items || cartData.items.length === 0) {
        showAlert('Your cart is empty', 'error');
        return;
    }
    if (cartData.items.some(item => !item.product)) {
        showAlert('Remove unavailable products from your cart before checkout.', 'error');
        return;
    }
    
    closeCart();
    
    // Show checkout modal
    showCheckoutModal();
}

// Show checkout modal
function showCheckoutModal() {
    const existingModal = document.getElementById('checkoutModal');
    if (existingModal) existingModal.remove();
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'checkoutModal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="closeModal('checkoutModal')">&times;</span>
            <h2>ðŸ’³ Checkout</h2>
            <div style="margin-bottom: 2rem;">
                <h3 style="margin-bottom: 1rem;">Order Summary</h3>
                ${cartData.items.map(item => `
                    <div style="display: flex; justify-content: space-between; padding: 0.5rem 0;">
                        <span>${escapeCartText(item.product && item.product.name || 'Unavailable product')} (x${item.quantity})</span>
                        <strong>${formatKES(item.price * item.quantity)}</strong>
                    </div>
                `).join('')}
                <div style="border-top: 2px solid #e5e7eb; margin-top: 1rem; padding-top: 1rem; display: flex; justify-content: space-between; font-size: 1.2rem;">
                    <strong>Total:</strong>
                    <strong style="color: #10b981;">${formatKES(cartData.totalAmount)}</strong>
                </div>
            </div>
            <form id="checkoutForm" onsubmit="placeCartOrder(event)">
                <div class="form-group">
                    <label>ðŸ“ Delivery Address</label>
                    <textarea name="deliveryAddress" class="input" autocomplete="shipping street-address" rows="3" required placeholder="Enter your full delivery address"></textarea>
                </div>
                <div class="form-group">
                    <label>ðŸ“± Contact Number</label>
                    <input type="tel" name="contactNumber" class="input" autocomplete="tel" inputmode="tel" required placeholder="+254 7XX XXX XXX" pattern="(?:\\+254|0)?[17][0-9]{8}" title="Enter a Kenyan mobile number with 9 subscriber digits">
                </div>
                <div class="form-group">
                    <label>ðŸ’³ Payment Method</label>
                    <select name="paymentMethod" class="input" required>
                        <option value="">Select payment method...</option>
                        <option value="mpesa">M-Pesa (simulated prompt)</option>
                        <option value="on-delivery">Cash on Delivery</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>ðŸ“ Additional Notes (Optional)</label>
                    <textarea name="notes" class="input" rows="2" placeholder="Any special instructions..."></textarea>
                </div>
                <p class="payment-demo-note">M-Pesa is in demo mode. No real payment will be sent or collected.</p>
                <button type="submit" class="btn btn-primary btn-block">Place Order</button>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Place cart order (from checkout)
async function placeCartOrder(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const orderData = {
        items: cartData.items.map(item => ({
            product: item.product && item.product._id,
            quantity: item.quantity,
            price: item.price
        })),
        deliveryAddress: formData.get('deliveryAddress'),
        contactNumber: formData.get('contactNumber'),
        paymentMethod: formData.get('paymentMethod'),
        notes: formData.get('notes')
    };
    
    try {
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(orderData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            const orders = result.orders || (result._id ? [result] : []);
            const cartCleared = await clearCart(true);
            closeModal('checkoutModal');
            if (!orders.length) throw new Error('The order response did not include any orders.');
            showAlert(`Placed ${orders.length} order${orders.length === 1 ? '' : 's'} successfully.`, 'success');
            if (!cartCleared) {
                showAlert('The order was placed, but the cart could not be cleared. Clear it before placing another order.', 'error');
            }
            
            // Navigate to My Shop to see orders
            document.querySelector('[href="#my-shop"]').click();
            if (formData.get('paymentMethod') === 'mpesa') {
                paymentManager.showPaymentModal(orders, formData.get('contactNumber'));
            }
        } else {
            showAlert(result.message || 'Failed to place order', 'error');
        }
    } catch (error) {
        console.error('Error placing order:', error);
        showAlert(error.message || 'Error placing order. Please try again.', 'error');
    }
}

// ===== WISHLIST FUNCTIONS =====
let wishlistData = { products: [] };

// Toggle wishlist dropdown
function toggleWishlist() {
    const wishlistDropdown = document.getElementById('wishlistDropdown');
    const notificationsDropdown = document.getElementById('notificationsDropdown');
    
    // Close other dropdowns
    closeCart();
    notificationsDropdown.classList.add('hidden');
    
    wishlistDropdown.classList.toggle('hidden');
    
    if (!wishlistDropdown.classList.contains('hidden')) {
        loadWishlist();
    }
}

// Load wishlist from server
async function loadWishlist() {
    try {
        const response = await fetch(`${API_URL}/wishlist`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            wishlistData = await response.json();
            renderWishlist();
            updateWishlistBadge();
        }
    } catch (error) {
        console.error('Error loading wishlist:', error);
    }
}

// Render wishlist items
function renderWishlist() {
    const wishlistItemsList = document.getElementById('wishlistItemsList');
    
    if (!wishlistData.products || wishlistData.products.length === 0) {
        wishlistItemsList.innerHTML = '<div class="empty-state"><p>Your wishlist is empty</p></div>';
        return;
    }
    
    wishlistItemsList.innerHTML = wishlistData.products.map(item => {
        const product = item.product;
        const imageUrl = product.images && product.images.length > 0 
            ? product.images[0] 
            : 'https://via.placeholder.com/100';
        
        return `
            <div class="cart-item">
                <img src="${escapeCartText(imageUrl)}" alt="${escapeCartText(product.name)}" class="cart-item-image" onclick="showProductDetails('${escapeCartText(product._id)}')">
                <div class="cart-item-details">
                    <div class="cart-item-name">${escapeCartText(product.name)}</div>
                    <div class="cart-item-price">${formatKES(product.price)} / ${escapeCartText(product.unit)}</div>
                    <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem;">
                        <button class="btn btn-sm btn-primary" onclick="moveToCart('${escapeCartText(product._id)}')" style="flex: 1;">
                            ðŸ›’ Move to Cart
                        </button>
                    </div>
                </div>
                <button class="cart-item-remove" onclick="removeFromWishlist('${escapeCartText(product._id)}')">ðŸ—‘ï¸</button>
            </div>
        `;
    }).join('');
}

// Add to wishlist
async function addToWishlist(productId) {
    if (!authToken) {
        showAlert('Please login to add items to wishlist', 'error');
        showLogin();
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/wishlist/add/${productId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            wishlistData = result;
            updateWishlistBadge();
            showAlert('Added to wishlist! â¤ï¸', 'success');
        } else {
            showAlert(result.message || 'Failed to add to wishlist', 'error');
        }
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        showAlert('Error adding to wishlist', 'error');
    }
}

// Remove from wishlist
async function removeFromWishlist(productId) {
    try {
        const response = await fetch(`${API_URL}/wishlist/remove/${productId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            wishlistData = await response.json();
            renderWishlist();
            updateWishlistBadge();
            showAlert('Removed from wishlist', 'success');
        }
    } catch (error) {
        console.error('Error removing from wishlist:', error);
    }
}

// Clear wishlist
async function clearWishlist() {
    if (!await showAppConfirm('Are you sure you want to clear your wishlist?', {
        title: 'Clear wishlist',
        submitText: 'Clear wishlist'
    })) return;
    
    try {
        const response = await fetch(`${API_URL}/wishlist/clear`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            wishlistData = result.wishlist;
            renderWishlist();
            updateWishlistBadge();
            showAlert('Wishlist cleared', 'success');
        }
    } catch (error) {
        console.error('Error clearing wishlist:', error);
    }
}

// Move wishlist item to cart
async function moveToCart(productId) {
    try {
        const response = await fetch(`${API_URL}/wishlist/move-to-cart/${productId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            wishlistData = result.wishlist;
            cartData = result.cart;
            renderWishlist();
            updateWishlistBadge();
            updateCartBadge();
            showAlert('Moved to cart! ðŸ›’', 'success');
        } else {
            showAlert(result.message || 'Failed to move to cart', 'error');
        }
    } catch (error) {
        console.error('Error moving to cart:', error);
    }
}

// Update wishlist badge
function updateWishlistBadge() {
    const wishlistBadge = document.getElementById('wishlistBadge');
    const itemCount = wishlistData.products ? wishlistData.products.length : 0;
    
    if (wishlistBadge) {
        wishlistBadge.textContent = itemCount;
        wishlistBadge.style.display = itemCount > 0 ? 'inline-block' : 'none';
    }
}

// Initialize wishlist on page load
if (authToken) {
    loadWishlist();
}

// ===== ORDER TRACKING FUNCTIONS =====

// Show order tracking modal
async function showOrderTracking(orderId) {
    try {
        const response = await fetch(`${API_URL}/orders/${orderId}/tracking`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            showAlert(errorData.message || 'Failed to load tracking information', 'error');
            return;
        }
        
        const data = await response.json();
        const { order, tracking } = data;
        const orderSellerId = order.seller && order.seller._id
            ? order.seller._id.toString()
            : String(order.seller);
        const signedInUserId = currentUser && (currentUser.id || currentUser._id);
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'trackingModal';
        
        const statusSteps = [
            { key: 'pending', label: 'Order Placed', icon: 'ðŸ“' },
            { key: 'confirmed', label: 'Confirmed', icon: 'âœ…' },
            { key: 'processing', label: 'Processing', icon: 'âš™ï¸' },
            { key: 'shipped', label: 'Shipped', icon: 'ðŸšš' },
            { key: 'delivered', label: 'Delivered', icon: 'ðŸ“¦' }
        ];
        
        const currentIndex = statusSteps.findIndex(s => s.key === order.status);
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px;">
                <span class="close" onclick="closeModal('trackingModal')">&times;</span>
                <h2>ðŸ“ Order Tracking</h2>
                
                <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 1.5rem; border-radius: 12px; margin-bottom: 2rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h3 style="margin: 0;">Order #${order._id.substring(0, 8)}</h3>
                            <p style="margin: 0.5rem 0 0; opacity: 0.9;">${escapeCartText(order.productName)}</p>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 1.5rem; font-weight: 700;">KSH ${order.totalAmount.toLocaleString()}</div>
                            <div style="opacity: 0.9;">${order.quantity} items</div>
                        </div>
                    </div>
                </div>
                
                <div class="tracking-timeline">
                    ${statusSteps.map((step, index) => {
                        const isCompleted = index <= currentIndex;
                        const isCurrent = index === currentIndex;
                        return `
                            <div class="tracking-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}">
                                <div class="step-icon">${step.icon}</div>
                                <div class="step-content">
                                    <div class="step-label">${step.label}</div>
                                    ${isCompleted && tracking.history[index] ? `
                                        <div class="step-time">${new Date(tracking.history[index].timestamp).toLocaleString()}</div>
                                        ${tracking.history[index].note ? `<div class="step-note">${escapeCartText(tracking.history[index].note)}</div>` : ''}
                                    ` : ''}
                                </div>
                                ${index < statusSteps.length - 1 ? '<div class="step-line"></div>' : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div style="background: #f9fafb; padding: 1.5rem; border-radius: 12px; margin-top: 2rem;">
                    <h3 style="margin-top: 0;">Delivery Information</h3>
                    <div style="display: grid; gap: 0.75rem;">
                        <div><strong>ðŸ“ Address:</strong> ${escapeCartText(order.deliveryAddress)}</div>
                        <div><strong>ðŸ“± Contact:</strong> ${escapeCartText(order.buyerPhone)}</div>
                        <div><strong>ðŸ’³ Payment:</strong> ${escapeCartText(order.paymentMethod)}</div>
                        <div><strong>ðŸ“… Estimated Delivery:</strong> ${escapeCartText(tracking.estimatedDelivery)}</div>
                        ${order.currentLocation ? `
                            <div><strong>ðŸšš Latest delivery location:</strong> ${escapeCartText(order.currentLocation.address || 'Location updated')}
                                <small>(${order.currentLocation.updatedAt ? new Date(order.currentLocation.updatedAt).toLocaleString() : 'time unavailable'})</small>
                            </div>
                        ` : '<div><strong>ðŸšš Delivery tracking:</strong> Waiting for a location update.</div>'}
                        ${order.deliveryTracking && order.deliveryTracking.length ? `
                            <div><strong>Recent tracking updates:</strong>
                                <ul>${order.deliveryTracking.slice(-5).reverse().map(update => `
                                    <li>${escapeCartText(update.address || 'Location update')} â€” ${update.timestamp ? new Date(update.timestamp).toLocaleString() : ''}</li>
                                `).join('')}</ul>
                            </div>
                        ` : ''}
                        ${order.notes ? `<div><strong>ðŸ“ Notes:</strong> ${escapeCartText(order.notes)}</div>` : ''}
                    </div>
                </div>
                
                ${orderSellerId === String(signedInUserId) ? `
                    <div style="margin-top: 2rem;">
                        <h3>Update Order Status</h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.75rem; margin-top: 1rem;">
                            <button onclick="updateOrderStatus('${order._id}', 'confirmed')" class="btn btn-sm" ${order.status !== 'pending' ? 'disabled' : ''}>
                                âœ… Confirm
                            </button>
                            <button onclick="updateOrderStatus('${order._id}', 'processing')" class="btn btn-sm" ${!['confirmed', 'pending'].includes(order.status) ? 'disabled' : ''}>
                                âš™ï¸ Process
                            </button>
                            <button onclick="updateOrderStatus('${order._id}', 'shipped')" class="btn btn-sm" ${order.status !== 'processing' ? 'disabled' : ''}>
                                ðŸšš Ship
                            </button>
                            <button onclick="updateOrderStatus('${order._id}', 'delivered')" class="btn btn-sm" ${order.status !== 'shipped' ? 'disabled' : ''}>
                                ðŸ“¦ Deliver
                            </button>
                        </div>
                        ${order.status === 'shipped' ? `
                            <form class="delivery-location-form" onsubmit="updateDeliveryLocation(event, '${order._id}')">
                                <h4>Share a delivery location update</h4>
                                <input class="input" name="address" autocomplete="address-line1" placeholder="Current town, landmark or route" required>
                                <button type="button" class="btn btn-sm" onclick="captureDeliveryCoordinates(this.form)">Use my current GPS location</button>
                                <div class="form-row">
                                    <input class="input" name="latitude" type="number" step="any" placeholder="Latitude (optional)">
                                    <input class="input" name="longitude" type="number" step="any" placeholder="Longitude (optional)">
                                </div>
                                <button type="submit" class="btn btn-sm btn-primary">Update tracking</button>
                            </form>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `;
        
        document.body.appendChild(modal);
    } catch (error) {
        console.error('Error showing tracking:', error);
        showAlert('Error loading tracking information', 'error');
    }
}

async function updateDeliveryLocation(event, orderId) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const data = Object.fromEntries(formData.entries());
    data.latitude = data.latitude === '' ? undefined : Number(data.latitude);
    data.longitude = data.longitude === '' ? undefined : Number(data.longitude);

    try {
        const response = await fetch(`${API_URL}/delivery/${encodeURIComponent(orderId)}/location`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${authToken}`
            },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Could not update delivery location');
        closeModal('trackingModal');
        await showOrderTracking(orderId);
        showAlert('Delivery tracking updated.', 'success');
    } catch (error) {
        console.error('Error updating delivery location:', error);
        showAlert(error.message, 'error');
    }
}

function captureDeliveryCoordinates(form) {
    if (!navigator.geolocation) {
        showAlert('GPS location is not available in this browser.', 'error');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
            form.elements.latitude.value = coords.latitude;
            form.elements.longitude.value = coords.longitude;
            showAlert('GPS coordinates added. Add a town or landmark before updating.', 'success');
        },
        (error) => {
            console.error('Could not read GPS location:', error);
            showAlert('Could not access your location. Check browser permissions or enter a location manually.', 'error');
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

// Update order status function (enhanced)
async function updateOrderStatus(orderId, newStatus) {
    const note = await showAppPrompt(`Add a note for ${newStatus} status (optional):`, {
        title: 'Add an order update',
        multiline: true,
        submitText: 'Update status'
    });
    if (note === null) return;
    
    try {
        const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ status: newStatus, note })
        });
        
        
        if (response.ok) {
            showAlert(`Order status updated to ${newStatus}`, 'success');
            closeModal('trackingModal');
            loadMySales();
            loadMyPurchases();
        } else {
            const errorData = await response.json().catch(() => ({}));
            console.error('âŒ Status update error:', errorData);
            showAlert(errorData.message || 'Failed to update order status', 'error');
        }
    } catch (error) {
        console.error('Error updating order status:', error);
        showAlert('Error updating order status', 'error');
    }
}

// ==================== EXPOSE FUNCTIONS TO WINDOW (FOR ONCLICK HANDLERS) ====================
window.toggleMobileMenu = toggleMobileMenu;
window.showLogin = showLogin;
window.showRegister = showRegister;
window.login = login;
window.register = register;
window.logout = logout;
window.toggleRoleFields = toggleRoleFields;
window.showModal = showModal;
window.closeModal = closeModal;
window.showCreatePost = showCreatePost;
window.createPost = createPost;
window.likePost = likePost;
window.commentPost = commentPost;
window.showAddProduct = showAddProduct;
window.addProduct = addProduct;
window.showProductDetails = showProductDetails;
window.likeProduct = likeProduct;
window.showPlaceOrder = showPlaceOrder;
window.updateOrderTotal = updateOrderTotal;
window.placeOrder = placeOrder;
window.switchShopTab = switchShopTab;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.addToCart = addToCart;
window.toggleCart = toggleCart;
window.closeCart = closeCart;
window.proceedToCheckout = proceedToCheckout;
window.updateCartQuantity = updateCartQuantity;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
window.addToWishlist = addToWishlist;
window.showOrderDetails = showOrderDetails;
window.updateOrderStatus = updateOrderStatus;
window.cancelOrder = cancelOrder;
window.openChat = openChat;
window.sendMessage = sendMessage;
window.bookConsultation = bookConsultation;
window.switchConsultationTab = switchConsultationTab;
window.updateConsultationStatus = updateConsultationStatus;
window.showTracking = showTracking;
window.showOrderTracking = showOrderTracking;
window.updateDeliveryLocation = updateDeliveryLocation;
window.captureDeliveryCoordinates = captureDeliveryCoordinates;
window.proceedToCheckout = proceedToCheckout;
window.placeCartOrder = placeCartOrder;
window.processPayment = function() { showAlert('Payment processing - Coming soon!', 'info'); };
