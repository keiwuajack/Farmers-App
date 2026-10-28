const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Get available languages
router.get('/languages', (req, res) => {
  try {
    const languages = [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' }
    ];
    res.json(languages);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get languages', error: error.message });
  }
});

// Get translations for a specific language
router.get('/:lang', (req, res) => {
  try {
    const { lang } = req.params;
    const filePath = path.join(__dirname, '../locales', `${lang}.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Language not found' });
    }

    const translations = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(translations);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load translations', error: error.message });
  }
});

// Get specific translation key
router.get('/:lang/:key', (req, res) => {
  try {
    const { lang, key } = req.params;
    const filePath = path.join(__dirname, '../locales', `${lang}.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Language not found' });
    }

    const translations = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const keys = key.split('.');
    let value = translations;

    for (const k of keys) {
      value = value[k];
      if (!value) {
        return res.status(404).json({ message: 'Translation key not found' });
      }
    }

    res.json({ key, value });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get translation', error: error.message });
  }
});

module.exports = router;
