(function () {
    let toastRegion;
    let activeDialog;

    function getToastRegion() {
        if (!toastRegion || !toastRegion.isConnected) {
            toastRegion = document.createElement('div');
            toastRegion.className = 'app-toast-region';
            toastRegion.setAttribute('aria-live', 'polite');
            toastRegion.setAttribute('aria-relevant', 'additions text');
            document.body.appendChild(toastRegion);
        }
        return toastRegion;
    }

    function showAppMessage(message, options) {
        const settings = options || {};
        const type = ['success', 'error', 'warning', 'info'].includes(settings.type)
            ? settings.type
            : 'info';
        const toast = document.createElement('div');
        const text = document.createElement('span');
        const close = document.createElement('button');
        let timeoutId;

        toast.className = `app-toast app-toast--${type}`;
        toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
        text.className = 'app-toast__text';
        text.textContent = String(message);
        close.className = 'app-toast__close';
        close.type = 'button';
        close.setAttribute('aria-label', 'Dismiss message');
        close.textContent = '\u00d7';
        close.addEventListener('click', dismiss);
        toast.append(text, close);
        getToastRegion().appendChild(toast);

        function dismiss() {
            if (timeoutId) window.clearTimeout(timeoutId);
            toast.remove();
        }

        const duration = Number.isFinite(settings.duration) ? settings.duration : 6000;
        if (duration > 0) timeoutId = window.setTimeout(dismiss, duration);
        return toast;
    }

    function closeDialog(value) {
        if (!activeDialog) return;
        const { backdrop, previousFocus, resolve } = activeDialog;
        activeDialog = null;
        backdrop.remove();
        if (previousFocus && previousFocus.isConnected) previousFocus.focus();
        resolve(value);
    }

    function openDialog(message, options, promptMode) {
        if (activeDialog) closeDialog(null);

        const settings = options || {};
        const previousFocus = document.activeElement;
        const backdrop = document.createElement('div');
        const dialog = document.createElement('section');
        const title = document.createElement('h2');
        const body = document.createElement('p');
        const actions = document.createElement('div');
        const cancel = document.createElement('button');
        const submit = document.createElement('button');
        let input;

        backdrop.className = 'app-dialog-backdrop';
        dialog.className = 'app-dialog';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        title.className = 'app-dialog__title';
        title.id = 'app-dialog-title';
        title.textContent = settings.title || (promptMode ? 'Your response' : 'Please confirm');
        body.className = 'app-dialog__message';
        body.id = 'app-dialog-message';
        body.textContent = String(message);
        dialog.setAttribute('aria-labelledby', title.id);
        dialog.setAttribute('aria-describedby', body.id);
        actions.className = 'app-dialog__actions';
        cancel.className = 'app-dialog__button app-dialog__button--cancel';
        cancel.type = 'button';
        cancel.textContent = settings.cancelText || 'Cancel';
        submit.className = 'app-dialog__button';
        submit.type = 'button';
        submit.textContent = settings.submitText || (promptMode ? 'Submit' : 'Continue');
        dialog.append(title, body);

        if (promptMode) {
            input = settings.multiline
                ? document.createElement('textarea')
                : document.createElement('input');
            input.className = 'app-dialog__input';
            input.setAttribute('aria-label', settings.inputLabel || String(message));
            input.placeholder = settings.placeholder || '';
            input.required = settings.required === true;
            if (input instanceof HTMLInputElement) {
                input.type = settings.inputType || 'text';
                if (settings.min !== undefined) input.min = String(settings.min);
                if (settings.max !== undefined) input.max = String(settings.max);
                if (settings.step !== undefined) input.step = String(settings.step);
            }
            input.value = settings.defaultValue || '';
            dialog.appendChild(input);
        }

        actions.append(cancel, submit);
        dialog.appendChild(actions);
        backdrop.appendChild(dialog);
        document.body.appendChild(backdrop);

        return new Promise(resolve => {
            activeDialog = { backdrop, previousFocus, resolve };
            cancel.addEventListener('click', () => closeDialog(null));
            submit.addEventListener('click', () => {
                if (promptMode && input instanceof HTMLInputElement && !input.checkValidity()) {
                    showAppMessage(settings.validationMessage || 'Enter a valid value before continuing.', {
                        type: 'warning'
                    });
                    input.focus();
                    return;
                }
                closeDialog(promptMode ? input.value : true);
            });
            backdrop.addEventListener('click', event => {
                if (event.target === backdrop) closeDialog(null);
            });
            dialog.addEventListener('keydown', event => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    closeDialog(null);
                } else if (event.key === 'Enter' && promptMode && !settings.multiline) {
                    event.preventDefault();
                    if (input instanceof HTMLInputElement && !input.checkValidity()) {
                        showAppMessage(settings.validationMessage || 'Enter a valid value before continuing.', {
                            type: 'warning'
                        });
                        input.focus();
                        return;
                    }
                    closeDialog(input.value);
                } else if (event.key === 'Tab') {
                    const focusable = Array.from(dialog.querySelectorAll('button, input, textarea'));
                    const first = focusable[0];
                    const last = focusable[focusable.length - 1];
                    if (event.shiftKey && document.activeElement === first) {
                        event.preventDefault();
                        last.focus();
                    } else if (!event.shiftKey && document.activeElement === last) {
                        event.preventDefault();
                        first.focus();
                    }
                }
            });
            (input || submit).focus();
        });
    }

    window.showAppMessage = showAppMessage;
    window.showAppConfirm = (message, options) => openDialog(message, options, false);
    window.showAppPrompt = (message, options) => openDialog(message, options, true);
    window.showNotification = (message, options) => showAppMessage(
        message,
        typeof options === 'string' ? { type: options } : options
    );
    window.alert = message => {
        showAppMessage(message, { type: 'info' });
    };
})();
