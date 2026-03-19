export async function onRequestPost(context) {
  try {
    const body = await context.request.text();
    console.log('ACTION RECEBIDA:', body);

    const apiUrl = 'https://script.google.com/macros/s/AKfycbxp1xY_Pqsde9Jrs9hbwVr2vTZuqQt2DU7-c5uQQJ0lmBUalNmgIIrXN1XJHNkILpJv/exec';

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body
    });

    const text = await res.text();
    console.log('RESPOSTA GS:', text);

    return new Response(text, {
      status: res.status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      ok: false,
      error: String(err.message || err)
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
