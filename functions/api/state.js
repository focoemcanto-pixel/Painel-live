export async function onRequestGet() {
  const apiUrl = 'https://script.google.com/macros/s/AKfycbxp1xY_Pqsde9Jrs9hbwVr2vTZuqQt2DU7-c5uQQJ0lmBUalNmgIIrXN1XJHNkILpJv/exec?route=state';

  const res = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }
  });

  const text = await res.text();

  return new Response(text, {
    status: res.status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
