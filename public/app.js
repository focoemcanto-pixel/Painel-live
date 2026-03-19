// URL do Google Apps Script Web App
// Allows override via localStorage so users can configure their own deployment
const _defaultApiUrl = 'https://script.google.com/macros/s/AKfycbxp1xY_Pqsde9Jrs9hbwVr2vTZuqQt2DU7-c5uQQJ0lmBUalNmgIIrXN1XJHNkILpJv/exec';
window.apiUrl = localStorage.getItem('apiUrl') || _defaultApiUrl;

function _assertJson(res) {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const statusInfo = res.ok ? '' : ` (HTTP ${res.status})`;
    throw new Error(
      'API retornou HTML em vez de JSON' + statusInfo + '. ' +
      'Verifique se a URL da API está correta e se o Web App está publicado. ' +
      'Clique em "⚙️ API" no topo para configurar.'
    );
  }
}

window.api = {
  async state() {
    const res = await fetch(window.apiUrl + "?route=state", { cache: "no-store" });
    _assertJson(res);
    return res.json();
  },

  async config() {
    const res = await fetch(window.apiUrl + "?route=config", { cache: "no-store" });
    _assertJson(res);
    return res.json();
  },

  async action(payload) {
    const res = await fetch(window.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    _assertJson(res);
    return res.json();
  }
};