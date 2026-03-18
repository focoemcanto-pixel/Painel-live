window.api = {
  async state() {
    const res = await fetch("/api/state", { cache: "no-store" });
    return res.json();
  },

  async config() {
    const res = await fetch("/api/config", { cache: "no-store" });
    return res.json();
  },

  async action(payload) {
    const res = await fetch("/api/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return res.json();
  }
};
