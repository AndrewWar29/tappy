import React, { useEffect, useMemo, useState } from 'react';
import './Productos.css';
import { api } from './apiConfig';
import { useAuth } from './AuthContext';

// Catálogo de precios actualizados
const PRICE_CATALOG = {
  'tappy-basic': 4990,
  'tappy-premium': 4990,
  'tappy-pack10': 4990,
  // Agregar más SKUs si es necesario
};

// Función para actualizar precios obsoletos
function updateItemPrices(items) {
  return items.map(item => {
    const catalogPrice = PRICE_CATALOG[item.sku || item.id];
    if (catalogPrice && item.price !== catalogPrice) {
      return { ...item, price: catalogPrice };
    }
    return item;
  });
}

// Minimal cart persisted in localStorage under 'tappy_cart'
// Item shape: { id, name, price, quantity }
export default function Cart() {
  const { user } = useAuth();
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem('tappy_cart');
      const parsedItems = raw ? JSON.parse(raw) : [];
      // Actualizar precios al cargar
      return updateItemPrices(parsedItems);
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try { 
      localStorage.setItem('tappy_cart', JSON.stringify(items)); 
    } catch {}
  }, [items]);

  const total = useMemo(() => items.reduce((s, it) => s + (it.price || 0) * (it.quantity || 1), 0), [items]);

  const updateQty = (id, delta) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, quantity: Math.max(1, (it.quantity || 1) + delta) } : it));
  };
  const removeItem = (id) => setItems(prev => prev.filter(it => it.id !== id));
  const clear = () => setItems([]);

  const checkout = async () => {
    if (!items.length) return;
    try {
      const mapped = items.map(it => ({ sku: it.sku || it.id, name: it.name, priceCLP: it.price || 0, qty: it.quantity || 1 }));
      const r1 = await fetch(api('/api/checkout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: mapped, userId: (user && (user.id || user.uid)) || 'guest' })
      });
      const d1 = await r1.json();
      if (!d1.ok) throw new Error(d1.message || 'Error creando orden');

      const r2 = await fetch(api('/api/pay-khipu/init'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: d1.orderId, userId: (user && (user.id || user.uid)) || 'guest' })
      });
      const d2 = await r2.json();
      if (!d2.ok) throw new Error(d2.message || 'Error iniciando pago');
  window.location.href = d2.redirectUrl; // Khipu redirection
    } catch (e) {
      alert(e.message || 'No se pudo iniciar el pago');
    }
  };

  return (
    <div className="productos-container" style={{ paddingTop: 80 }}>
      <h2>Carrito</h2>
      {items.length === 0 ? (
        <p>Tu carrito está vacío.</p>
      ) : (
        <>
          <ul className="productos-list">
            {items.map(item => (
              <li key={item.id} className="producto-item">
                <div className="producto-info">
                  <div className="producto-name">{item.name}</div>
                  <div className="producto-price">${(item.price || 0).toLocaleString()}</div>
                </div>
                <div className="producto-actions">
                  <button onClick={() => updateQty(item.id, -1)}>-</button>
                  <span style={{ margin: '0 8px' }}>{item.quantity || 1}</span>
                  <button onClick={() => updateQty(item.id, 1)}>+</button>
                  <button className="buy-button" onClick={() => removeItem(item.id)} style={{ marginLeft: 12 }}>Quitar</button>
                </div>
              </li>
            ))}
          </ul>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="buy-button" onClick={clear}>Vaciar</button>
              <button className="buy-button" onClick={() => {
                const updatedItems = updateItemPrices(items);
                setItems(updatedItems);
                alert('Precios actualizados');
              }}>Actualizar precios</button>
            </div>
            <div style={{ fontWeight: 'bold' }}>Total: ${total.toLocaleString()}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button className="btn-comprar" onClick={checkout}>
              Ir a pagar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
