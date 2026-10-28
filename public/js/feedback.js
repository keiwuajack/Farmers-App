document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('feedbackForm');
    if (!form) return;

    const status = document.getElementById('feedbackStatus');
    const submitButton = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        status.textContent = '';
        submitButton.disabled = true;

        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());
        payload.rating = Number(payload.rating);

        try {
            const response = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const responseText = await response.text();
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Feedback endpoint returned a non-JSON response:', {
                    status: response.status,
                    contentType: response.headers.get('content-type')
                });
                throw new Error(
                    `The feedback service returned an unexpected response (HTTP ${response.status}). ` +
                    'Please refresh the app and try again. If the issue continues, the shared link may be pointing to an outdated server.'
                );
            }
            if (!response.ok) throw new Error(result.message || 'Could not send feedback.');

            status.textContent = result.message;
            status.dataset.state = 'success';
            form.reset();
        } catch (error) {
            status.textContent = error.message || 'Could not send feedback. Please try again.';
            status.dataset.state = 'error';
        } finally {
            submitButton.disabled = false;
        }
    });
});
