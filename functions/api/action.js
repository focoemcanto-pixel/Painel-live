// ─────────────────────────────────────────────────────────────────────────────
// CF Pages Function: /api/action  →  proxy POST para Google Apps Script
//
// Por que proxy server-side?
//   O browser não consegue chamar script.google.com com Content-Type JSON
//   sem receber um erro de CORS/preflight, pois o GAS não responde OPTIONS.
//   Aqui no Worker o fetch não tem restrição CORS — é server-to-server.
// ─────────────────────────────────────────────────────────────────────────────

const GAS_URL = 'https://script.google.com/macros/s/AKfycbxp1xY_Pqsde9Jrs9hbwVr2vTZuqQt2DU7-c5uQQJ0lmBUalNmgIIrXN1XJHNkILpJv/exec';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

export async function onRequestPost(context) {
  let body = '';
  try {
    body = await context.request.text();

    // Validação mínima: deve ser JSON válido
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch (_) {
      return jsonResponse({ ok: false, error: 'Payload inválido: não é JSON.' }, 400);
    }

    if (!parsed.action) {
      return jsonResponse({ ok: false, error: 'Campo "action" ausente no payload.' }, 400);
    }

    // Chamada server-side ao GAS — sem restrição CORS aqui
    const gasRes = await fetch(GAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body
    });

    const text = await gasRes.text();
    console.log('RESPOSTA GAS:', text.slice(0, 300));

    // Verifica se a resposta é JSON válido antes de repassar
    try {
      JSON.parse(text);
    } catch (_) {
      // GAS retornou HTML (erro de script, redirect de login, etc.)
      console.error('GAS retornou não-JSON:', text.slice(0, 300));
      return jsonResponse({
        ok: false,
        error: 'O Google Apps Script retornou uma resposta inesperada (não-JSON). ' +
               'Verifique se o Web App está publicado corretamente e com acesso "Qualquer pessoa".',
        gasStatus: gasRes.status
      }, 502);
    }

    return new Response(text, {
      status: gasRes.status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        ...CORS_HEADERS
      }
    });

  } catch (err) {
    console.error('Erro no proxy /api/action:', err);
    return jsonResponse({
      ok: false,
      error: 'Erro interno no proxy: ' + (err.message || String(err))
    }, 500);
  }
}