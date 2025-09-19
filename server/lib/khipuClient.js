const fetch = require('node-fetch');

function getBaseConfig() {
  const receiverId = process.env.KHIPU_RECEIVER_ID;
  const secret = process.env.KHIPU_SECRET;
  const baseUrl = process.env.KHIPU_BASE_URL || 'https://khipu.com/api/2.0';
  if (!receiverId || !secret) {
    throw new Error('Faltan credenciales Khipu (KHIPU_RECEIVER_ID / KHIPU_SECRET)');
  }
  const authHeader = 'Basic ' + Buffer.from(`${receiverId}:${secret}`).toString('base64');
  return { baseUrl, authHeader, receiverId };
}

async function createPayment({ orderId, amount, email, subject, returnUrl, cancelUrl, notifyUrl, expiresInMinutes = 30 }) {
  const { baseUrl, authHeader } = getBaseConfig();
  const apiKey = process.env.KHIPU_API_KEY;
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
      Authorization: authHeader,
      ...(apiKey ? { 'x-api-key': apiKey } : {})
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
  const { baseUrl, authHeader } = getBaseConfig();
  const apiKey = process.env.KHIPU_API_KEY;
  const url = `${baseUrl}/payments?notification_token=${encodeURIComponent(notificationToken)}`;
  const res = await fetch(url, {
    headers: { Authorization: authHeader, ...(apiKey ? { 'x-api-key': apiKey } : {}) }
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Khipu getPayment fallo: ${res.status} ${txt}`);
  }
  return res.json();
}

module.exports = { createPayment, getPaymentByNotification };