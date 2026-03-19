// CF Pages Function: GET /api/state  →  proxy para GAS ?route=state

const GAS_URL = 'https://script.google.com/macros/s/AKfycbxp1xY_Pqsde9Jrs9hbwVr2vTZuqQt2DU7-c5uQQJ0lmBUalNmgIIrXN1XJHNkILpJv/exec';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...CORS_HEADERS
    }
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestGet() {
  try {
    const res = await fetch(GAS_URL + '?route=state', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    const text = await res.text();

    // Valida se é JSON
    try {
      JSON.parse(text);
    } catch (_) {
      console.error('GAS /state retornou não-JSON:', text.slice(0, 300));
      return jsonResponse({
        ok: false,
        error: 'O Google Apps Script retornou uma resposta inesperada. ' +
               'Verifique se o Web App está publicado corretamente.',
        gasStatus: res.status
      }, 502);
    }

    return new Response(text, {
      status: res.status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        ...CORS_HEADERS
      }
    });
  } catch (err) {
    console.error('Erro no proxy /api/state:', err);
    return jsonResponse({
      ok: false,
      error: 'Erro interno ao buscar estado: ' + (err.message || String(err))
    }, 500);
  }
}