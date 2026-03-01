import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Productos.css';
import { useCart } from '../helpers/CartContext';
import nfcCard from '../assets/nfc_card.png';

const PRODUCT = {
  sku: 'tappy-nfc-card',
  name: 'Tarjeta NFC Tappy',
  price: 10000,
  description: 'Comparte tu perfil digital al instante con solo acercar la tarjeta a cualquier smartphone.',
  features: [
    { icon: '📱', text: 'Compatible con cualquier smartphone' },
    { icon: '⚡', text: 'Transferencia instantánea sin apps' },
    { icon: '🎨', text: 'Diseño personalizado con tu marca' },
    { icon: '🔗', text: 'Perfil digital incluido y editable' },
    { icon: '♾️', text: 'Sin límite de usos ni suscripción' },
  ]
};

const Productos = () => {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [addedEffect, setAddedEffect] = useState(false);

  const handleAddToCart = () => {
    for (let i = 0; i < qty; i++) {
      addItem({
        id: PRODUCT.sku,
        sku: PRODUCT.sku,
        name: PRODUCT.name,
        price: PRODUCT.price,
        priceCLP: PRODUCT.price,
      });
    }
    setAddedEffect(true);
    setTimeout(() => setAddedEffect(false), 1500);
  };

  const handleBuyNow = () => {
    for (let i = 0; i < qty; i++) {
      addItem({
        id: PRODUCT.sku,
        sku: PRODUCT.sku,
        name: PRODUCT.name,
        price: PRODUCT.price,
        priceCLP: PRODUCT.price,
      });
    }
    navigate('/checkout');
  };

  return (
    <div className="productos-container">

      {/* Hero */}
      <div className="productos-hero">
        <span className="productos-tag">Tecnología NFC</span>
        <h1 className="productos-title">Tu identidad digital,<br />en la palma de tu mano</h1>
        <p className="productos-description">
          Una sola tarjeta. Todos tus datos. Compártelos al instante con cualquier persona.
        </p>
      </div>

      {/* Product Section */}
      <div className="producto-showcase">

        {/* Image Panel */}
        <div className="producto-image-panel">
          <div className="producto-image-glow"></div>
          <img
            src={nfcCard}
            alt="Tarjeta NFC Tappy"
            className="producto-image"
          />
          <div className="producto-image-badge">
            <span>✦</span> Tecnología NFC
          </div>
        </div>

        {/* Info Panel */}
        <div className="producto-info-panel">
          <h2 className="producto-name">{PRODUCT.name}</h2>
          <p className="producto-desc">{PRODUCT.description}</p>

          <div className="producto-price-row">
            <span className="producto-price">${PRODUCT.price.toLocaleString('es-CL')}</span>
            <span className="producto-price-label">CLP / unidad</span>
          </div>

          <ul className="producto-features">
            {PRODUCT.features.map((f, i) => (
              <li key={i} className="producto-feature-item">
                <span className="feature-emoji">{f.icon}</span>
                <span>{f.text}</span>
              </li>
            ))}
          </ul>

          {/* Quantity selector */}
          <div className="producto-qty-row">
            <span className="qty-label">Cantidad:</span>
            <div className="qty-control">
              <button className="qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
              <span className="qty-value">{qty}</span>
              <button className="qty-btn" onClick={() => setQty(q => q + 1)}>+</button>
            </div>
            <span className="qty-total">
              Total: <strong>${(PRODUCT.price * qty).toLocaleString('es-CL')}</strong>
            </span>
          </div>

          {/* Actions */}
          <div className="producto-actions">
            <button
              className={`btn-comprar ${addedEffect ? 'added' : ''}`}
              onClick={handleBuyNow}
            >
              🚀 Comprar ahora
            </button>
            <button
              className={`btn-carrito ${addedEffect ? 'added' : ''}`}
              onClick={handleAddToCart}
            >
              {addedEffect ? '✓ Agregado' : '🛒 Agregar al carrito'}
            </button>
          </div>

          <p className="producto-shipping-note">
            🚚 Envío a todo Chile · 🔒 Pago seguro con Webpay
          </p>
        </div>
      </div>

      {/* Why Tappy */}
      <div className="productos-features-section">
        <h2 className="features-title">¿Por qué elegir Tappy?</h2>
        <div className="features-grid">
          {[
            { icon: '⚡', title: 'Conexión Instantánea', desc: 'Solo acerca la tarjeta a cualquier teléfono para compartir tu información al instante.' },
            { icon: '🎨', title: 'Totalmente Personalizable', desc: 'Tu nombre, logo, redes sociales y contacto en un solo lugar editable.' },
            { icon: '♾️', title: 'Sin Costos Adicionales', desc: 'Sin apps, sin suscripciones. Paga una vez y úsala para siempre.' },
          ].map((f, i) => (
            <div className="feature-item" key={i}>
              <div className="feature-icon-large">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Productos;
