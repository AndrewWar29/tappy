import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from './apiConfig';

export default function PagoExito() {
  const [params] = useSearchParams();
  const orderId = params.get('orderId');
  const [order, setOrder] = useState(null);
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orderId) return;
    // Cargar orden
    fetch(api(`/api/checkout/orders/${orderId}`))
      .then(r => r.json())
      .then(d => {
        if (d.ok) setOrder(d.order); else setError(d.message || 'Error cargando orden');
      })
      .catch(e => setError(e.message));
    // Cargar pagos asociados
    fetch(api(`/api/payments/by-order/${orderId}`))
      .then(r => r.json())
      .then(d => {
        if (d.ok) setPayments(d.payments || []);
      })
      .catch(() => {});
  }, [orderId]);

  if (!orderId) return <div>Falta orderId</div>;
  if (error) return <div>Pago realizado, pero no se pudo cargar la orden: {error}</div>;
  if (!order) return <div>Cargando orden...</div>;

  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <h2>¡Pago exitoso!</h2>
      <p><strong>Orden:</strong> {orderId}</p>
      <p><strong>Estado:</strong> {order.status}</p>
      <p><strong>Total:</strong> ${order.amountCLP} {order.currency}</p>

      {payments.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3>Detalle de pago</h3>
          {payments.map((p) => (
            <div key={p.id} style={{
              border: '1px solid #e5e5e5', borderRadius: 8, padding: 16, marginBottom: 12
            }}>
              <div><strong>ID pago:</strong> {p.id}</div>
              <div><strong>Estado:</strong> {p.status}</div>
              {p.authorizationCode && (<div><strong>Auth Code:</strong> {p.authorizationCode}</div>)}
              {p.responseCode !== undefined && (<div><strong>Response Code:</strong> {p.responseCode}</div>)}
              {p.paymentTypeCode && (<div><strong>Tipo:</strong> {p.paymentTypeCode}</div>)}
              {p.installmentsNumber !== undefined && (<div><strong>Cuotas:</strong> {p.installmentsNumber || 0}</div>)}
              {p.cardLast4 && (<div><strong>Tarjeta:</strong> **** **** **** {p.cardLast4}</div>)}
              {p.transactionDate && (<div><strong>Fecha transacción:</strong> {p.transactionDate}</div>)}
              {p.amount !== undefined && (<div><strong>Monto:</strong> ${p.amount}</div>)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
