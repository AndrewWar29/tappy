import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Cart.css';
import { useCart } from '../helpers/CartContext';

export default function Cart() {
  const navigate = useNavigate();
  const { items, total, updateQuantity, removeItem, clearCart, updatePrices } = useCart();

  const goToCheckout = () => {
    if (!items.length) return;
    navigate('/checkout');
  };

  return (
    <div className="cart-container">
      <div className="cart-header">
        <h1 className="cart-title">Tu Carrito</h1>
        <p className="cart-subtitle">
          {items.length === 0 ? 'Agrega productos para comenzar' : `${items.length} ${items.length === 1 ? 'producto' : 'productos'} en tu carrito`}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="empty-cart">
          <div className="empty-cart-icon">🛒</div>
          <p className="empty-cart-text">Tu carrito está vacío</p>
        </div>
      ) : (
        <>
          <div className="cart-items">
            {items.map(item => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-content">
                  <div className="cart-item-info">
                    <div className="cart-item-name">{item.name}</div>
                    <div className="cart-item-price">${(item.price || 0).toLocaleString()}</div>
                  </div>
                  <div className="cart-item-actions">
                    <div className="quantity-control">
                      <button className="quantity-btn" onClick={() => updateQuantity(item.id, -1)}>−</button>
                      <span className="quantity-display">{item.quantity || 1}</span>
                      <button className="quantity-btn" onClick={() => updateQuantity(item.id, 1)}>+</button>
                    </div>
                    <button className="remove-btn" onClick={() => removeItem(item.id)}>
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <div className="cart-actions">
              <div className="cart-utility-buttons">
                <button className="utility-btn" onClick={clearCart}>
                  🗑️ Vaciar carrito
                </button>
                <button className="utility-btn" onClick={() => {
                  updatePrices();
                  alert('✅ Precios actualizados');
                }}>
                  🔄 Actualizar precios
                </button>
              </div>
              <div className="cart-total">
                Total: ${total.toLocaleString()}
              </div>
            </div>

            <div className="checkout-section">
              <button
                className="checkout-btn"
                onClick={goToCheckout}
              >
                💳 Proceder al pago
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
