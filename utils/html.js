((root, factory) => {
  const escapeHtml = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = escapeHtml;
  } else {
    root.escapeHtml = escapeHtml;
  }
})(globalThis, () => value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
})[character]));
