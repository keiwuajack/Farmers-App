function normalizeKenyanMobile(phone) {
  const raw = String(phone || '').trim();
  if (!/^\+?[\d\s()-]+$/.test(raw)) return null;
  const digits = raw.replace(/\D/g, '');
  const subscriber = digits.startsWith('254')
    ? digits.slice(3)
    : digits.startsWith('0')
      ? digits.slice(1)
      : digits;

  if (!/^[17]\d{8}$/.test(subscriber)) return null;
  return `+254${subscriber}`;
}

module.exports = { normalizeKenyanMobile };
