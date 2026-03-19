// ─────────────────────────────────────────────────────────────────────────────
// API LAYER — Painel Broadcast • Foco em Canto
//
// ESTRATÉGIA DE COMUNICAÇÃO:
//   • Leituras (state, config) → GET /api/state  e GET /api/config
//     (Cloudflare Pages Functions que fazem proxy server-side para o GAS)
//   • Ações  → POST /api/action
//     (idem — evita preflight CORS ao chamar GAS diretamente do browser)
//
//   O frontend NUNCA chama script.google.com diretamente.
//   Isso elimina o problema de preflight/CORS por completo.
//
//   A variável window.apiUrl é mantida apenas para compatibilidade com o modal
//   de configuração ⚙️ API e para uso futuro (Worker customizado).
// ─────────────────────────────────────────────────────────────────────────────

const _defaultApiUrl = 'https://script.google.com/macros/s/AKfycbxp1xY_Pqsde9Jrs9hbwVr2vTZuqQt2DU7-c5uQQJ0lmBUalNmgIIrXN1XJHNkILpJv/exec';
window.apiUrl = localStorage.getItem('apiUrl') || _defaultApiUrl;

// Timeout padrão para todas as requisições (ms)
const API_TIMEOUT_MS = 20000;

/**
 * Fetch com AbortController timeout.
 * Lança TypeError com mensagem clara se timeout ou erro de rede.
 */
async function _fetchComTimeout(url, options = {}, timeoutMs = API_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new TypeError(
        `Timeout: o servidor demorou mais de ${timeoutMs / 1000}s para responder. ` +
        'Verifique sua conexão e se o Google Apps Script está publicado.'
      );
    }
    // Erro de rede genérico — mensagem mais amigável
    throw new TypeError(
      'Falha de rede ao contatar a API. ' +
      'Verifique sua conexão com a internet e se o Web App está publicado. ' +
      'Detalhe: ' + (err.message || String(err))
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Parse seguro de resposta JSON.
 * Aceita respostas mesmo sem Content-Type correto (GAS às vezes retorna
 * text/html em erros de script) e tenta extrair JSON de qualquer forma.
 * Em caso de falha, retorna { ok: false, error, rawText }.
 */
async function _parseJson(res) {
  const text = await res.text();
  if (!text || !text.trim()) {
    return { ok: false, error: 'Resposta vazia do servidor.' };
  }
  // Tenta parsear JSON independente do Content-Type
  try {
    return JSON.parse(text);
  } catch (_) {
    // Não é JSON — provavelmente HTML de erro do GAS ou do CF
    const snippet = text.slice(0, 200).replace(/\s+/g, ' ').trim();
    const httpStatus = res.status;
    const isHtml = text.trim().startsWith('<');
    if (isHtml && httpStatus === 200) {
      throw new Error(
        'A API retornou uma página HTML em vez de JSON. ' +
        'Isso geralmente significa que a URL do Google Apps Script está incorreta ' +
        'ou o Web App não está publicado como "Qualquer pessoa". ' +
        'Clique em "⚙️ API" para reconfigurar.'
      );
    }
    throw new Error(
      `Resposta inválida (HTTP ${httpStatus}): ${snippet}`
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROTAS DO PROXY (Cloudflare Pages Functions)
// Sempre relativos — funcionam em qualquer domínio sem hardcode.
// ─────────────────────────────────────────────────────────────────────────────
const _PROXY = {
  state:  '/api/state',
  config: '/api/config',
  action: '/api/action'
};

window.api = {
  /**
   * Lê o estado atual (GET /api/state → GAS ?route=state)
   */
  async state() {
    const res = await _fetchComTimeout(_PROXY.state, { cache: 'no-store' });
    return _parseJson(res);
  },

  /**
   * Lê a configuração (GET /api/config → GAS ?route=config)
   */
  async config() {
    const res = await _fetchComTimeout(_PROXY.config, { cache: 'no-store' });
    return _parseJson(res);
  },

  /**
   * Envia uma ação (POST /api/action → GAS doPost)
   *
   * O corpo é enviado como texto simples ao proxy CF.
   * O proxy CF faz a chamada server-side ao GAS — sem preflight no browser.
   *
   * Nota: NÃO enviamos Content-Type: application/json daqui ao proxy CF,
   * pois o proxy já sabe o que espera. Isso mantém a requisição "simples"
   * do ponto de vista do browser e evita qualquer preflight residual.
   */
  async action(payload) {
    const body = JSON.stringify(payload);
    const res = await _fetchComTimeout(_PROXY.action, {
      method: 'POST',
      // text/plain;charset=utf-8 é um Content-Type "simples" (sem preflight)
      // O proxy CF lê o body como texto e repassa ao GAS.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body
    });
    return _parseJson(res);
  }
};