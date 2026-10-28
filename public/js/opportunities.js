const kenyaCounties = [
    'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu', 'Garissa',
    'Homa Bay', 'Isiolo', 'Kajiado', 'Kakamega', 'Kericho', 'Kiambu', 'Kilifi',
    'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia', 'Lamu',
    'Machakos', 'Makueni', 'Mandera', 'Marsabit', 'Meru', 'Migori', 'Mombasa',
    "Murang'a", 'Nairobi', 'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua',
    'Nyeri', 'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River', 'Tharaka-Nithi',
    'Trans Nzoia', 'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot'
];

const opportunityIntents = {
    land: [['sale', 'For sale'], ['rent', 'For lease']],
    rental: [['rent', 'For rent']],
    bnb: [['rent', 'Stay / booking']],
    job: [['hire', 'Hiring']],
    worker: [['seeking', 'Seeking work']]
};

let selectedOpportunityType = '';
let opportunitySearchTimeout;
let opportunityRequestId = 0;

document.addEventListener('DOMContentLoaded', () => {
    const countySelects = ['heroCounty', 'filterProductCounty', 'opportunityCounty', 'opportunityFormCounty'];
    countySelects.forEach((id) => {
        const select = document.getElementById(id);
        if (!select) return;
        kenyaCounties.forEach((county) => {
            const option = document.createElement('option');
            option.value = county;
            option.textContent = `${county} County`;
            select.appendChild(option);
        });
    });
    updateOpportunityIntents();
});

function escapeOpportunityText(value) {
    return String(value || '').replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}

function searchOpportunitiesFromHero() {
    if (typeof requireAppLogin === 'function' && !requireAppLogin('opportunities')) return;
    document.getElementById('opportunitySearch').value = document.getElementById('heroSearch').value;
    document.getElementById('opportunityCounty').value = document.getElementById('heroCounty').value;
    loadOpportunities();
}

function filterOpportunities(type) {
    selectedOpportunityType = type;
    document.querySelectorAll('.opportunity-filter').forEach((button) => {
        button.classList.toggle('active', button.dataset.opportunityType === type);
    });
    loadOpportunities();
}

async function loadOpportunities() {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    const container = document.getElementById('opportunitiesContainer');
    if (!container) return;
    const requestId = ++opportunityRequestId;
    const params = new URLSearchParams();
    if (selectedOpportunityType) params.set('type', selectedOpportunityType);
    const county = document.getElementById('opportunityCounty').value;
    const search = document.getElementById('opportunitySearch').value.trim();
    if (county) params.set('county', county);
    if (search) params.set('search', search);

    try {
        const response = await fetch(`/api/opportunities?${params.toString()}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Unable to load opportunities');
        const opportunities = await response.json();
        if (requestId === opportunityRequestId) renderOpportunities(opportunities);
    } catch (error) {
        console.error('Error loading opportunities:', error);
        if (requestId === opportunityRequestId) {
            container.innerHTML = '<div class="opportunity-empty"><strong>We could not load listings.</strong><span>Please try again in a moment.</span></div>';
        }
    }
}

function scheduleOpportunitySearch() {
    clearTimeout(opportunitySearchTimeout);
    opportunitySearchTimeout = setTimeout(loadOpportunities, 250);
}

function renderOpportunities(opportunities) {
    const container = document.getElementById('opportunitiesContainer');
    if (!opportunities.length) {
        container.innerHTML = '<div class="opportunity-empty"><strong>Nothing listed just yet.</strong><span>Be the first to share an opportunity with farmers across Kenya.</span><button class="btn btn-primary" onclick="showOpportunityForm()">Post the first listing</button></div>';
        return;
    }

    const labels = {
        land: 'Land',
        rental: 'Farm rental',
        bnb: 'Farm stay',
        job: 'Farm job',
        worker: 'Worker profile'
    };
    const icons = { land: '🌾', rental: '🏡', bnb: '🛏️', job: '🧑‍🌾', worker: '🤝' };
    container.innerHTML = opportunities.map((item) => {
        const price = Number(item.price) > 0
            ? `<strong class="opportunity-price">KES ${Number(item.price).toLocaleString()}${item.priceUnit ? ` <small>${escapeOpportunityText(item.priceUnit)}</small>` : ''}</strong>`
            : '<strong class="opportunity-price">Price on request</strong>';
        const ownerId = item.owner && (item.owner._id || item.owner);
        const signedInUserId = currentUser && (currentUser._id || currentUser.id);
        const closeButton = authToken && signedInUserId && String(ownerId) === String(signedInUserId)
            ? `<button class="opportunity-close" onclick="closeOpportunity('${escapeOpportunityText(item._id)}')">Mark filled</button>`
            : '';
        const phoneHref = String(item.contactPhone || '').replace(/[^\d+]/g, '');
        return `<article class="opportunity-card">
            <div class="opportunity-card-top"><span class="opportunity-icon">${icons[item.type] || '🌱'}</span><span class="opportunity-tag">${labels[item.type] || 'Opportunity'}</span><span class="opportunity-intent">${escapeOpportunityText(item.intent)}</span></div>
            <h3>${escapeOpportunityText(item.title)}</h3>
            <p class="opportunity-description">${escapeOpportunityText(item.description)}</p>
            <div class="opportunity-location">📍 ${escapeOpportunityText(item.location)}, ${escapeOpportunityText(item.county)} County</div>
            <div class="opportunity-card-footer">${price}<div class="opportunity-actions"><a class="opportunity-contact" href="tel:${phoneHref}">Contact ${escapeOpportunityText(item.owner && item.owner.name ? item.owner.name : 'poster')}</a>${closeButton}</div></div>
        </article>`;
    }).join('');
}

function updateOpportunityIntents() {
    const type = document.getElementById('opportunityType').value;
    const intentSelect = document.getElementById('opportunityIntent');
    intentSelect.innerHTML = opportunityIntents[type].map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
    const unitInput = document.getElementById('opportunityPriceUnit');
    const placeholders = {
        land: 'per acre',
        rental: 'per month',
        bnb: 'per night',
        job: 'per day / month',
        worker: 'per day'
    };
    unitInput.placeholder = placeholders[type];
}

function showOpportunityForm() {
    if (!authToken) {
        showLogin();
        showAlert('Sign in to post an opportunity.', 'error');
        return;
    }
    showModal('opportunityModal');
}

async function submitOpportunity(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
        const response = await fetch('/api/opportunities', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${authToken}`
            },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Could not publish this listing');
        form.reset();
        updateOpportunityIntents();
        closeModal('opportunityModal');
        await loadOpportunities();
        showAlert('Your opportunity is now live across Kenya.', 'success');
    } catch (error) {
        console.error('Error posting opportunity:', error);
        showAlert(error.message, 'error');
    }
}

async function closeOpportunity(id) {
    try {
        const response = await fetch(`/api/opportunities/${encodeURIComponent(id)}/close`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${authToken}` }
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Could not close listing');
        await loadOpportunities();
        showAlert('Listing marked as filled.', 'success');
    } catch (error) {
        console.error('Error closing opportunity:', error);
        showAlert(error.message, 'error');
    }
}
