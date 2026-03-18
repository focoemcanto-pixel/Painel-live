const API_URL = 'https://script.google.com/macros/s/AKfycbxp1xY_Pqsde9Jrs9hbwVr2vTZuqQt2DU7-c5uQQJ0lmBUalNmgIIrXN1XJHNkILpJv/exec';

window.api = {
  async state() {
    const res = await fetch(API_URL + '?route=state', {
      method: 'GET',
      cache: 'no-store'
    });
    return res.json();
  },

  async config() {
    const res = await fetch(API_URL + '?route=config', {
      method: 'GET',
      cache: 'no-store'
    });
    return res.json();
  },

  async action(payload) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  }
};
