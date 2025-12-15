import React from 'react';
import { api } from '../helpers/apiConfig';
import '../styles/Productos.css';
import { useAuth } from '../helpers/AuthContext';
import { useCart } from '../helpers/CartContext';

const Productos = () => {
  const { user } = useAuth();
  const { addItem } = useCart();

  const addToCart = (sku, name, price) => {
    addItem({ id: sku, sku, name, price });
    alert('✓ Agregado al carrito');
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
        <div className="productos-logo-icon">
          <svg viewBox="0 0 300 282" className="productos-logo-svg">
            <g transform="translate(0.000000,282.000000) scale(0.100000,-0.100000)" className="productos-logo-path">
              <path d="M533 2735 c-168 -46 -294 -172 -338 -340 -13 -51 -15 -185 -15 -975 0 -978 -1 -956 50 -1064 29 -60 119 -158 175 -191 23 -14 68 -35 101 -47 l59 -23 925 0 c993 0 966 -1 1072 51 68 34 160 124 196 192 64 120 62 85 62 1087 0 856 -1 914 -19 977 -45 166 -171 290 -336 333 -85 22 -1851 22 -1932 0z m1940 -35 c156 -48 274 -176 307 -333 12 -58 10 -1864 -2 -1906 -53 -178 -205 -310 -382 -330 -124 -14 -1803 -6 -1851 9 -84 25 -149 62 -200 114 -51 50 -106 142 -122 202 -13 49 -15 1829 -3 1904 21 122 115 252 221 305 107 55 83 54 1060 54 882 1 909 0 972 -19z" />
              <path d="M1370 2444 c-219 -27 -403 -121 -546 -277 -76 -83 -103 -129 -111 -182 -5 -41 -3 -47 29 -79 32 -32 38 -34 72 -26 46 10 59 21 103 87 41 62 146 161 200 189 21 10 40 22 43 26 3 4 48 21 100 39 86 28 107 31 225 32 145 2 235 -17 344 -73 87 -44 203 -141 255 -213 25 -35 57 -69 71 -75 57 -26 129 20 129 81 0 99 -179 285 -360 375 -177 89 -359 120 -554 96z m301 -40 c161 -30 317 -110 446 -228 70 -65 143 -167 143 -202 0 -33 -34 -64 -69 -64 -24 0 -37 10 -74 63 -102 143 -250 245 -428 293 -47 13 -100 18 -199 17 -157 0 -247 -21 -364 -87 -75 -42 -204 -158 -238 -215 -49 -83 -84 -100 -126 -61 -30 28 -29 78 4 126 122 181 316 312 534 358 89 20 270 19 371 0z" />
              <path d="M1390 2134 c-120 -23 -228 -82 -320 -174 -149 -149 -182 -283 -78 -319 48 -17 91 9 130 78 44 77 121 152 192 185 71 34 86 38 160 42 167 9 319 -75 413 -230 54 -88 117 -105 168 -44 33 39 32 73 -6 146 -63 120 -219 249 -359 294 -64 20 -241 33 -300 22z m232 -35 c147 -30 313 -150 391 -280 50 -86 48 -139 -8 -153 -37 -9 -59 7 -95 71 -123 218 -396 302 -617 191 -74 -37 -159 -122 -197 -196 -39 -76 -87 -94 -125 -46 -25 32 -21 58 23 134 72 125 225 241 362 274 72 17 195 20 266 5z" />
            </g>
          </svg>
        </div>

        <h1 className="productos-title">Nuestros Productos</h1>
        <h2 className="productos-subtitle">Tarjetas NFC personalizadas</h2>
        <p className="productos-description">
          Conecta con tus clientes de manera instantánea con nuestras tarjetas NFC de alta calidad.
          Cada tarjeta incluye tu perfil digital personalizado y tecnología NFC de última generación.
        </p>
      </div>

      <div className="productos-grid">
        <div className="producto-card">
          <div className="producto-icon">💎</div>
          <h3>Tarjeta Básica</h3>
          <p className="precio">$4.990</p>
          <ul className="producto-features">
            <li><span className="feature-icon">✨</span>Tarjeta NFC personalizada</li>
            <li><span className="feature-icon">📱</span>Perfil digital incluido</li>
            <li><span className="feature-icon">🎨</span>Diseño estándar</li>
            <li><span className="feature-icon">🔧</span>Configuración incluida</li>
          </ul>
          <div className="producto-buttons">
            <button className="btn-primary" onClick={() => comprar(4990)}>
              <span className="btn-icon">🚀</span>
              Comprar ahora
            </button>
            <button className="btn-secondary" onClick={() => addToCart('tappy-basic', 'Tarjeta Básica', 4990)}>
              <span className="btn-icon">🛒</span>
              Agregar al carrito
            </button>
          </div>
        </div>

        <div className="producto-card featured">
          <div className="featured-badge">Más Popular</div>
          <div className="producto-icon">⭐</div>
          <h3>Tarjeta Premium</h3>
          <p className="precio">$4.990</p>
          <ul className="producto-features">
            <li><span className="feature-icon">✨</span>Tarjeta NFC personalizada</li>
            <li><span className="feature-icon">📱</span>Perfil digital incluido</li>
            <li><span className="feature-icon">🎨</span>Diseño personalizado</li>
            <li><span className="feature-icon">🎯</span>Soporte prioritario</li>
            <li><span className="feature-icon">💎</span>Acabado premium</li>
          </ul>
          <div className="producto-buttons">
            <button className="btn-primary" onClick={() => comprar(4990)}>
              <span className="btn-icon">🚀</span>
              Comprar ahora
            </button>
            <button className="btn-secondary" onClick={() => addToCart('tappy-premium', 'Tarjeta Premium', 4990)}>
              <span className="btn-icon">🛒</span>
              Agregar al carrito
            </button>
          </div>
        </div>

        <div className="producto-card">
          <div className="producto-icon">🏢</div>
          <h3>Pack Empresarial</h3>
          <p className="precio">$4.990</p>
          <ul className="producto-features">
            <li><span className="feature-icon">📦</span>10 tarjetas NFC</li>
            <li><span className="feature-icon">👥</span>Perfiles digitales incluidos</li>
            <li><span className="feature-icon">🏢</span>Branding empresarial</li>
            <li><span className="feature-icon">🎧</span>Soporte dedicado</li>
            <li><span className="feature-icon">📊</span>Dashboard empresarial</li>
          </ul>
          <div className="producto-buttons">
            <button className="btn-primary" onClick={() => comprar(4990)}>
              <span className="btn-icon">🚀</span>
              Comprar ahora
            </button>
            <button className="btn-secondary" onClick={() => addToCart('tappy-pack10', 'Pack Empresarial (10)', 4990)}>
              <span className="btn-icon">🛒</span>
              Agregar al carrito
            </button>
          </div>
        </div>
      </div>

      <div className="productos-features-section">
        <h2 className="features-title">¿Por qué elegir Tappy?</h2>
        <div className="features-grid">
          <div className="feature-item">
            <div className="feature-icon-large">⚡</div>
            <h3>Conexión Instantánea</h3>
            <p>Solo acerca la tarjeta a cualquier teléfono para compartir tu información</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon-large">🔒</div>
            <h3>Seguro y Confiable</h3>
            <p>Tecnología NFC segura con encriptación de última generación</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon-large">🎨</div>
            <h3>Totalmente Personalizable</h3>
            <p>Diseña tu tarjeta y perfil exactamente como quieres</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Productos;
