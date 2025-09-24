import React from 'react';
import { api } from './apiConfig';
import './Productos.css';
import { useAuth } from './AuthContext';

const Productos = () => {
  const { user } = useAuth();
  const addToCart = (sku, name, price) => {
    try {
      const raw = localStorage.getItem('tappy_cart');
      const current = raw ? JSON.parse(raw) : [];
      const existing = current.find(it => it.id === sku);
      if (existing) existing.quantity = (existing.quantity || 1) + 1;
      else current.push({ id: sku, sku, name, price, quantity: 1 });
      localStorage.setItem('tappy_cart', JSON.stringify(current));
      alert('Agregado al carrito');
    } catch {}
  };

  const comprar = async (precio) => {
    try {
      const items = [{ sku: 'tappy-card', name: 'Tarjeta NFC', priceCLP: precio, qty: 1 }];
      const r1 = await fetch(api('/api/checkout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, userId: (user && (user.id || user.uid)) || 'web-user' })
      });
      const d1 = await r1.json();
      if (!d1.ok) throw new Error(d1.message || 'Error creando orden');

      const r2 = await fetch(api('/api/pay-webpay/init'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: d1.orderId, userId: (user && (user.id || user.uid)) || 'web-user' })
      });
      const d2 = await r2.json();
      if (!d2.ok) throw new Error(d2.message || 'Error iniciando pago');
      window.location.href = d2.redirectUrl;
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="productos-container">
      <div className="productos-hero">
        <h1>Nuestros Productos</h1>
        <p>Tarjetas NFC personalizadas para tu negocio</p>
      </div>
      
      <div className="productos-grid">
        <div className="producto-card">
          <h3>Tarjeta Básica</h3>
          <p className="precio">$4.990</p>
          <ul>
            <li>Tarjeta NFC personalizada</li>
            <li>Perfil digital incluido</li>
            <li>Diseño estándar</li>
          </ul>
          <div style={{ display: 'grid', gap: 8 }}>
            <button className="btn-comprar" onClick={() => comprar(4990)}>Comprar ahora</button>
            <button className="btn-comprar" style={{ background: '#10b981' }} onClick={() => addToCart('tappy-basic', 'Tarjeta Básica', 4990)}>Agregar al carrito</button>
          </div>
        </div>
        
        <div className="producto-card featured">
          <h3>Tarjeta Premium</h3>
          <p className="precio">$4.990</p>
          <ul>
            <li>Tarjeta NFC personalizada</li>
            <li>Perfil digital incluido</li>
            <li>Diseño personalizado</li>
            <li>Soporte prioritario</li>
          </ul>
          <div style={{ display: 'grid', gap: 8 }}>
            <button className="btn-comprar" onClick={() => comprar(4990)}>Comprar ahora</button>
            <button className="btn-comprar" style={{ background: '#10b981' }} onClick={() => addToCart('tappy-premium', 'Tarjeta Premium', 4990)}>Agregar al carrito</button>
          </div>
        </div>
        
        <div className="producto-card">
          <h3>Pack Empresarial</h3>
          <p className="precio">$4.990</p>
          <ul>
            <li>10 tarjetas NFC</li>
            <li>Perfiles digitales incluidos</li>
            <li>Branding empresarial</li>
            <li>Soporte dedicado</li>
          </ul>
          <div style={{ display: 'grid', gap: 8 }}>
            <button className="btn-comprar" onClick={() => comprar(4990)}>Comprar ahora</button>
            <button className="btn-comprar" style={{ background: '#10b981' }} onClick={() => addToCart('tappy-pack10', 'Pack Empresarial (10)', 4990)}>Agregar al carrito</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Productos;
