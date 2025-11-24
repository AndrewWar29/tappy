import React, { useEffect, useMemo, useState } from 'react';
import '../styles/Cart.css';
import { api } from '../helpers/apiConfig';
import { useAuth } from '../helpers/AuthContext';
import PaymentMethodModal from '../components/PaymentMethodModal';

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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [loadingMethod, setLoadingMethod] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem('tappy_cart', JSON.stringify(items));
    } catch { }
  }, [items]);

  const total = useMemo(() => items.reduce((s, it) => s + (it.price || 0) * (it.quantity || 1), 0), [items]);

  const updateQty = (id, delta) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, quantity: Math.max(1, (it.quantity || 1) + delta) } : it));
  };
  const removeItem = (id) => setItems(prev => prev.filter(it => it.id !== id));
  const clear = () => setItems([]);

  const initiateCheckout = () => {
    if (!items.length) return;
    setShowPaymentModal(true);
  };

  const processPayment = async (paymentMethod) => {
    setLoadingMethod(paymentMethod);
    setIsProcessingPayment(true);

    try {
      const mapped = items.map(it => ({ sku: it.sku || it.id, name: it.name, priceCLP: it.price || 0, qty: it.quantity || 1 }));
      console.log('🛒 Enviando checkout:', { items: mapped, userId: (user && (user.id || user.uid)) || 'guest' });

      const r1 = await fetch(api('/api/checkout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: mapped, userId: (user && (user.id || user.uid)) || 'guest' })
      });

      console.log('📦 Respuesta checkout:', r1.status, r1.statusText);
      const d1 = await r1.json();
      console.log('📦 Datos checkout:', d1);

      if (!d1.ok) throw new Error(d1.message || 'Error creando orden');

      const paymentData = { orderId: d1.orderId, userId: (user && (user.id || user.uid)) || 'guest' };
      const endpoint = paymentMethod === 'khipu' ? '/api/pay-khipu/init' : '/api/pay-webpay/init';

      console.log(`💳 Enviando pago ${paymentMethod}:`, paymentData);

      const r2 = await fetch(api(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });

      console.log(`💳 Respuesta ${paymentMethod}:`, r2.status, r2.statusText);
      const d2 = await r2.json();
      console.log(`💳 Datos ${paymentMethod}:`, d2);

      if (!d2.ok) throw new Error(d2.message || 'Error iniciando pago');

      // Small delay to show the loading state before redirect
      await new Promise(resolve => setTimeout(resolve, 1000));

      window.location.href = d2.redirectUrl; // Redirect to payment
    } catch (e) {
      console.error('❌ Error en checkout:', e);
      alert(e.message || 'No se pudo iniciar el pago');
      setIsProcessingPayment(false);
      setLoadingMethod(null);
      setShowPaymentModal(true); // Keep modal open on error
    }
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
                      <button className="quantity-btn" onClick={() => updateQty(item.id, -1)}>−</button>
                      <span className="quantity-display">{item.quantity || 1}</span>
                      <button className="quantity-btn" onClick={() => updateQty(item.id, 1)}>+</button>
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
                <button className="utility-btn" onClick={clear}>
                  🗑️ Vaciar carrito
                </button>
                <button className="utility-btn" onClick={() => {
                  const updatedItems = updateItemPrices(items);
                  setItems(updatedItems);
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
                onClick={initiateCheckout}
                disabled={isProcessingPayment}
              >
                {isProcessingPayment ? '⏳ Procesando...' : '💳 Proceder al pago'}
              </button>
            </div>
          </div>
        </>
      )}

      <PaymentMethodModal
        isOpen={showPaymentModal}
        onClose={() => {
          if (!isProcessingPayment) {
            setShowPaymentModal(false);
            setLoadingMethod(null);
          }
        }}
        onSelect={processPayment}
        total={total}
        isLoading={isProcessingPayment}
        loadingMethod={loadingMethod}
      />
    </div>
  );
}
