export async function onRequestGet() {
  return new Response(JSON.stringify({ ok: true, hello: "world" }), {
    headers: {
      "Content-Type": "application/json"
    }
  });
}
