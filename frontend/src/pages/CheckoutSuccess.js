import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../helpers/apiConfig';

export default function CheckoutSuccess() {
  const [params] = useSearchParams();
  const orderId = params.get('orderId');
  const [data, setData] = useState({ order: null, payments: [] });
  const [loading, setLoading] = useState(true);
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (!orderId) return;
    let active = true;
    const load = async () => {
      try {
        const r = await fetch(api(`/api/pay-khipu/status/${orderId}`));
        const d = await r.json();
        if (!active) return;
        if (d.ok) {
          setData({ order: d.order, payments: d.payments || [] });
          // Si aún está PENDING y llevamos pocos intentos, seguir poll
          if (d.order.status === 'PENDING' && tries < 10) {
            setTimeout(() => setTries(t => t + 1), 2000);
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      } catch (e) {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [orderId, tries]);

  if (!orderId) return <div>Falta orderId</div>;
  if (loading) return <div>Confirmando pago...</div>;
  if (!data.order) return <div>No se encontró la orden.</div>;

  const { order, payments } = data;
  const paid = order.status === 'PAID';

  return (
    <div style={{ padding: 24 }}>
      <h2>{paid ? '¡Pago confirmado!' : 'Estado del pago'}</h2>
      <p><strong>Orden:</strong> {orderId}</p>
      <p><strong>Estado:</strong> {order.status}</p>
      <p><strong>Monto:</strong> ${order.amountCLP} {order.currency || 'CLP'}</p>
      {payments.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3>Pagos</h3>
          {payments.map(p => (
            <div key={p.id} style={{ border: '1px solid #ddd', padding: 12, marginBottom: 12 }}>
              <div><strong>ID pago:</strong> {p.id}</div>
              <div><strong>Proveedor:</strong> {p.provider}</div>
              <div><strong>Estado:</strong> {p.status}</div>
              <div><strong>Monto:</strong> ${p.amount}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
