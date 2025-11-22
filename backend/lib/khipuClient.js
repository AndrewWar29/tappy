// Node.js 18+ tiene fetch nativo, no necesitamos node-fetch
// const fetch = require('node-fetch');

function getBaseConfig() {
  const apiKey = process.env.KHIPU_API_KEY;
  const baseUrl = 'https://payment-api.khipu.com/v3'; // Endpoint correcto para API 3.0
  if (!apiKey) {
    throw new Error('Falta KHIPU_API_KEY para API 3.0');
  }
  return { baseUrl, apiKey };
}

async function createPayment({ orderId, amount, email, subject, returnUrl, cancelUrl, notifyUrl, expiresInMinutes = 30 }) {
  const { baseUrl, apiKey } = getBaseConfig();
  const expiresDate = new Date(Date.now() + expiresInMinutes * 60000).toISOString();
  const body = {
    subject,
    amount,
    currency: 'CLP',
    transaction_id: orderId, // para mapear en webhook
    payer_email: email,
    return_url: returnUrl,
    cancel_url: cancelUrl,
    notify_url: notifyUrl,
    expires_date: expiresDate
  };
  const res = await fetch(`${baseUrl}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey  // Solo API key, sin Authorization Basic
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Khipu createPayment fallo: ${res.status} ${txt}`);
  }
  const data = await res.json();
  return {
    paymentId: data.payment_id,
    paymentUrl: data.payment_url,
    data
  };
}

async function getPaymentByNotification(notificationToken) {
  const { baseUrl, apiKey } = getBaseConfig();
  const url = `${baseUrl}/payments?notification_token=${encodeURIComponent(notificationToken)}`;
  const res = await fetch(url, {
    headers: { 'x-api-key': apiKey }  // Solo API key
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Khipu getPayment fallo: ${res.status} ${txt}`);
  }
  return res.json();
}

module.exports = { createPayment, getPaymentByNotification };