// i18n.js - Internationalization Manager
class I18nManager {
  constructor() {
    this.currentLang = localStorage.getItem('language') || 'en';
    this.translations = {};
    this.originalTextNodes = new WeakMap();
    this.originalAttributes = new WeakMap();
    this.translationObserver = null;
    this.phraseEntries = null;
    this.supportedLanguages = [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' }
    ];
  }

  // Initialize i18n
  async init() {
    await this.loadTranslations(this.currentLang);
    this.updatePageTranslations();
    this.createLanguageSwitcher();
  }

  // Load translations from server
  async loadTranslations(lang) {
    try {
      if (!this.supportedLanguages.some(language => language.code === lang)) return false;
      const response = await fetch(`/api/translations/${lang}`);
      if (!response.ok) throw new Error('Failed to load translations');
      this.translations = await response.json();
      this.phraseEntries = null;
      this.currentLang = lang;
      localStorage.setItem('language', lang);
      document.documentElement.lang = lang === 'sw' ? 'sw' : 'en';
      return true;
    } catch (error) {
      console.error('Error loading translations:', error);
      return false;
    }
  }

  // Get translation by key
  t(key, params = {}) {
    const keys = key.split('.');
    let value = this.translations;

    for (const k of keys) {
      if (value && value[k]) {
        value = value[k];
      } else {
        console.warn(`Translation not found for key: ${key}`);
        return key;
      }
    }

    // Replace parameters in translation
    if (typeof value === 'string') {
      Object.keys(params).forEach(param => {
        value = value.replace(`{{${param}}}`, params[param]);
      });
    }

    return value;
  }

  // Change language
  async changeLanguage(lang) {
    if (await this.loadTranslations(lang)) {
      this.updatePageTranslations();
      // Dispatch custom event for components to update
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
      return true;
    }
    return false;
  }

  // Update all translations on the page
  updatePageTranslations() {
    this.updateSubtreeTranslations(document);
    const originalTitle = document.documentElement.dataset.originalTitle ||= document.title;
    document.title = this.translatePhrase(originalTitle);

    if (!this.translationObserver && document.body) {
      this.translationObserver = new MutationObserver(records => {
        records.forEach(record => record.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
            this.updateSubtreeTranslations(node);
          }
        }));
      });
      this.translationObserver.observe(document.body, { childList: true, subtree: true });
    }
  }

  translatePhrase(text) {
    if (this.currentLang === 'en') return text;
    const phrases = this.translations.site?.phrases || {};
    this.phraseEntries ||= Object.entries(phrases).sort(([left], [right]) => right.length - left.length);
    return this.phraseEntries.reduce((translated, [english, localized]) => {
      const escaped = english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const startsWithWord = /^[A-Za-z0-9]/.test(english);
      const endsWithWord = /[A-Za-z0-9]$/.test(english);
      const pattern = `${startsWithWord ? '\\b' : ''}${escaped}${endsWithWord ? '\\b' : ''}`;
      return translated.replace(new RegExp(pattern, 'g'), localized);
    }, text);
  }

  updateSubtreeTranslations(root) {
    const elements = [];
    if (root.nodeType === Node.ELEMENT_NODE) elements.push(root);
    if (root.querySelectorAll) elements.push(...root.querySelectorAll('*'));

    // Explicit keys are available for components that use the structured catalogue.
    elements.filter(element => element.hasAttribute('data-i18n')).forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translated = this.t(key);
      if (element.textContent !== translated) element.textContent = translated;
    });

    elements.filter(element => element.hasAttribute('data-i18n-placeholder')).forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      const translated = this.t(key);
      if (element.placeholder !== translated) element.placeholder = translated;
    });

    elements.filter(element => element.hasAttribute('data-i18n-title')).forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      const translated = this.t(key);
      if (element.title !== translated) element.title = translated;
    });

    elements.filter(element => element.hasAttribute('data-i18n-value')).forEach(element => {
      const key = element.getAttribute('data-i18n-value');
      const translated = this.t(key);
      if (element.value !== translated) element.value = translated;
    });

    elements.forEach(element => {
      const original = this.originalAttributes.get(element) || {};
      ['placeholder', 'title', 'aria-label'].forEach(attribute => {
        if (!element.hasAttribute(attribute)) return;
        if (!(attribute in original)) original[attribute] = element.getAttribute(attribute);
        element.setAttribute(attribute, this.translatePhrase(original[attribute]));
      });
      this.originalAttributes.set(element, original);
    });

    const textRoot = root.nodeType === Node.TEXT_NODE ? root.parentNode : root;
    if (!textRoot || !textRoot.ownerDocument && textRoot !== document) return;
    const walker = document.createTreeWalker(textRoot, NodeFilter.SHOW_TEXT);
    let textNode;
    while ((textNode = walker.nextNode())) {
      if (textNode.parentElement?.closest('[data-i18n]')) continue;
      if (!this.originalTextNodes.has(textNode)) this.originalTextNodes.set(textNode, textNode.nodeValue);
      textNode.nodeValue = this.translatePhrase(this.originalTextNodes.get(textNode));
    }
  }

  // Create language switcher UI
  createLanguageSwitcher() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    // Check if switcher already exists
    if (document.querySelector('.language-switcher')) return;

    const switcher = document.createElement('div');
    switcher.className = 'language-switcher';
    switcher.innerHTML = `
      <select id="languageSelect" class="language-select" aria-label="Choose language" title="Choose language">
        ${this.supportedLanguages.map(lang => `
          <option value="${lang.code}" ${this.currentLang === lang.code ? 'selected' : ''}>
            ${lang.nativeName}
          </option>
        `).join('')}
      </select>
    `;

    // Put the switcher in the topbar tools group
    const tools = navbar.querySelector('.nav-tools');
    const profileSection = navbar.querySelector('.navbar-right');
    if (tools) {
      tools.insertBefore(switcher, tools.firstChild);
    } else if (profileSection) {
      profileSection.insertBefore(switcher, profileSection.firstChild);
    } else {
      navbar.appendChild(switcher);
    }

    // Add change event listener
    document.getElementById('languageSelect').addEventListener('change', async (e) => {
      const newLang = e.target.value;
      e.target.disabled = true;
      const changed = await this.changeLanguage(newLang);
      if (!changed) e.target.value = this.currentLang;
      e.target.disabled = false;
    });
  }

  // Get current language
  getCurrentLanguage() {
    return this.currentLang;
  }

  // Get supported languages
  getSupportedLanguages() {
    return this.supportedLanguages;
  }
}

// Create global instance
const i18n = new I18nManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => i18n.init());
} else {
  i18n.init();
}

// Export for use in other scripts
window.i18n = i18n;
