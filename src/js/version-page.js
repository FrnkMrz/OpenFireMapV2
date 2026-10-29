import { APP_VERSION } from './version.js';
import { getLang, initI18n, setLang, updatePageLanguage } from './i18n.js';

document.addEventListener('DOMContentLoaded', async () => {
    await initI18n();
    updatePageLanguage();
    document.getElementById('current-version').textContent = `v${APP_VERSION}`;

    const languageSelect = document.getElementById('version-language');
    languageSelect.value = getLang();
    languageSelect.addEventListener('change', async (event) => {
        await setLang(event.target.value);
        updateTitle();
    });
    updateTitle();
});

function updateTitle() {
    const title = document.querySelector('[data-i18n="version_hub_title"]')?.textContent;
    if (title) document.title = `${title} · OpenFireMap.org`;
}
