import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { api } from './apiConfig';

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user || !user.uid) {
        setLoading(false);
        return;
      }
      try {
        const uid = user.id || user.uid;
        const res = await fetch(api(`/api/checkout/orders-by-user/${encodeURIComponent(uid)}`));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setOrders(Array.isArray(data.orders) ? data.orders : []);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Error cargando órdenes');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user]);

  if (!user) return <div style={{ paddingTop: 80 }}>Inicia sesión para ver tus órdenes.</div>;
  if (loading) return <div style={{ paddingTop: 80 }}>Cargando…</div>;
  if (error) return <div style={{ paddingTop: 80 }}>Error: {error}</div>;

  return (
    <div style={{ paddingTop: 80, padding: 16 }}>
      <h2>Mis Órdenes</h2>
      {orders.length === 0 ? (
        <p>No tienes órdenes todavía.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {orders.map(o => (
            <li key={o.orderId} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div><strong>Orden:</strong> {o.orderId}</div>
                  <div><strong>Estado:</strong> {o.status || 'N/A'}</div>
                  <div><strong>Fecha:</strong> {o.createdAt ? new Date(o.createdAt).toLocaleString() : '—'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div><strong>Total:</strong> ${Number(o.amount || 0).toLocaleString()}</div>
                </div>
              </div>
              {Array.isArray(o.items) && o.items.length > 0 && (
                <ul style={{ marginTop: 8 }}>
                  {o.items.map((it, idx) => (
                    <li key={idx}>{it.name} × {it.quantity || 1} — ${Number(it.price || 0).toLocaleString()}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
