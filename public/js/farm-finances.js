(function () {
    const categories = {
        income: [
            ['sales', 'Farm sales'],
            ['other-income', 'Other income']
        ],
        expense: [
            ['seeds', 'Seeds'],
            ['fertilizer', 'Fertilizer'],
            ['feed', 'Animal feed'],
            ['veterinary', 'Veterinary care'],
            ['medicine', 'Medicine'],
            ['labour', 'Labour'],
            ['transport', 'Transport'],
            ['equipment', 'Equipment'],
            ['utilities', 'Water or electricity'],
            ['other-expense', 'Other expense']
        ]
    };
    const categoryLabels = Object.fromEntries(
        Object.values(categories).flat().map(([value, label]) => [value, label])
    );
    const formatKES = new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        maximumFractionDigits: 2
    });
    let entriesHost;
    let form;
    let status;

    function authHeaders(extra = {}) {
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error('Please sign in to use farm finances.');
        return { ...extra, Authorization: `Bearer ${token}` };
    }

    function populateCategories() {
        const type = document.getElementById('financeType').value;
        const categorySelect = document.getElementById('financeCategory');
        categorySelect.replaceChildren(...categories[type].map(([value, label]) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            return option;
        }));
    }

    function formatDate(dateValue) {
        const date = new Date(dateValue);
        return Number.isNaN(date.getTime())
            ? 'Date unavailable'
            : new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium', timeZone: 'UTC' }).format(date);
    }

    function localDateValue() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function renderSummary(summary) {
        const income = Number(summary.income) || 0;
        const expenses = Number(summary.expenses) || 0;
        const profit = income - expenses;
        document.getElementById('farmFinanceSummary').innerHTML = `
            <div class="finance-metric finance-metric-income">
                <span>Total income</span><strong>${formatKES.format(income)}</strong>
            </div>
            <div class="finance-metric finance-metric-expense">
                <span>Total expenses</span><strong>${formatKES.format(expenses)}</strong>
            </div>
            <div class="finance-metric finance-metric-profit ${profit < 0 ? 'is-negative' : ''}">
                <span>Estimated balance</span><strong>${formatKES.format(profit)}</strong>
            </div>
        `;
        const count = Number(summary.entryCount) || 0;
        document.getElementById('farmFinanceRecordCount').textContent =
            `${count} ${count === 1 ? 'record' : 'records'} · private to your account`;
    }

    function renderEntries(entries, entriesLimited) {
        if (!entries.length) {
            entriesHost.innerHTML = `
                <div class="finance-empty">
                    <span aria-hidden="true">🌱</span>
                    <strong>No records yet</strong>
                    <p>Add your first farm income or expense to start seeing your estimated balance.</p>
                </div>
            `;
            return;
        }

        entriesHost.innerHTML = entries.map(entry => {
            const isIncome = entry.type === 'income';
            const amount = Number(entry.amount);
            const description = entry.description
                ? escapeHtml(entry.description)
                : escapeHtml(categoryLabels[entry.category] || 'Farm record');
            return `
                <article class="finance-entry">
                    <span class="finance-entry-icon ${isIncome ? 'is-income' : 'is-expense'}" aria-hidden="true">${isIncome ? '↗' : '↘'}</span>
                    <div class="finance-entry-copy">
                        <strong>${description}</strong>
                        <span>${escapeHtml(categoryLabels[entry.category] || 'Farm record')} · ${formatDate(entry.date)}</span>
                    </div>
                    <strong class="finance-entry-amount ${isIncome ? 'is-income' : 'is-expense'}">${isIncome ? '+' : '−'}${formatKES.format(Number.isFinite(amount) ? amount : 0)}</strong>
                    <button class="finance-entry-delete" type="button" data-finance-id="${escapeHtml(entry._id)}" aria-label="Delete ${isIncome ? 'income' : 'expense'} record">Delete</button>
                </article>
            `;
        }).join('');
        if (entriesLimited) {
            entriesHost.insertAdjacentHTML('beforeend', '<p class="finance-list-note">Showing the latest 100 records. Totals include all your records.</p>');
        }
    }

    function setStatus(message, type) {
        status.textContent = message;
        status.dataset.state = type || '';
    }

    async function loadFarmFinances() {
        if (!entriesHost) return;
        entriesHost.innerHTML = '<div class="finance-empty">Loading your records…</div>';
        try {
            const response = await fetch('/api/farm-finances', {
                headers: authHeaders(),
                cache: 'no-store'
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Could not load farm finance records.');
            renderSummary(result.summary);
            renderEntries(result.entries, result.entriesLimited);
        } catch (error) {
            console.error('Error loading farm finances:', error);
            entriesHost.innerHTML = `<div class="finance-error">${escapeHtml(error.message || 'Could not load farm finance records.')}</div>`;
        }
    }

    async function saveFinanceEntry(event) {
        event.preventDefault();
        setStatus('', '');
        const formData = new FormData(form);
        const record = Object.fromEntries(formData.entries());
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;

        try {
            const response = await fetch('/api/farm-finances', {
                method: 'POST',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(record)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Could not save this record.');
            form.reset();
            document.getElementById('financeType').value = 'expense';
            document.getElementById('financeDate').value = localDateValue();
            populateCategories();
            setStatus('Record saved.', 'success');
            await loadFarmFinances();
        } catch (error) {
            console.error('Error saving farm finance record:', error);
            setStatus(error.message || 'Could not save this record. Please try again.', 'error');
        } finally {
            submitButton.disabled = false;
        }
    }

    async function deleteFinanceEntry(entryId) {
        if (!window.confirm('Delete this farm finance record? This cannot be undone.')) return;
        try {
            const response = await fetch(`/api/farm-finances/${encodeURIComponent(entryId)}`, {
                method: 'DELETE',
                headers: authHeaders()
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Could not delete this record.');
            setStatus('Record deleted.', 'success');
            await loadFarmFinances();
        } catch (error) {
            console.error('Error deleting farm finance record:', error);
            setStatus(error.message || 'Could not delete this record. Please try again.', 'error');
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        entriesHost = document.getElementById('farmFinanceEntries');
        form = document.getElementById('farmFinanceForm');
        status = document.getElementById('farmFinanceStatus');
        if (!entriesHost || !form || !status) return;

        document.getElementById('financeDate').value = localDateValue();
        document.getElementById('financeType').addEventListener('change', populateCategories);
        form.addEventListener('submit', saveFinanceEntry);
        entriesHost.addEventListener('click', event => {
            const deleteButton = event.target.closest('[data-finance-id]');
            if (deleteButton) deleteFinanceEntry(deleteButton.dataset.financeId);
        });
        populateCategories();
    });

    window.loadFarmFinances = loadFarmFinances;
})();
