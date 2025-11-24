import React, { useState } from 'react';
import '../styles/PaymentMethodModal.css';

const PaymentMethodModal = ({ isOpen, onClose, onSelect, total, isLoading, loadingMethod }) => {
  const [selectedMethod, setSelectedMethod] = useState(null);

  if (!isOpen) return null;

  const handleSelect = () => {
    if (selectedMethod) {
      onSelect(selectedMethod);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="payment-method-modal" onClick={handleOverlayClick}>
      <div className="payment-method-content">
        <button className="close-btn" onClick={onClose}>×</button>

        <div className="payment-method-header">
          <h2 className="payment-method-title">Elige tu método de pago</h2>
          <p className="payment-method-subtitle">
            Total a pagar: <strong>${total.toLocaleString()}</strong>
          </p>
        </div>

        <div className="payment-methods">
          <div
            className={`payment-method-option ${selectedMethod === 'khipu' ? 'selected' : ''} ${isLoading && loadingMethod === 'khipu' ? 'loading' : ''}`}
            onClick={() => !isLoading && setSelectedMethod('khipu')}
            style={{ cursor: isLoading ? 'not-allowed' : 'pointer' }}
          >
            <div className="payment-method-info">
              <div className="payment-method-icon khipu">
                {isLoading && loadingMethod === 'khipu' ? (
                  <div className="loading-dot"></div>
                ) : (
                  '💳'
                )}
              </div>
              <div className="payment-method-details">
                <div className="payment-method-name">
                  Khipu
                  {isLoading && loadingMethod === 'khipu' && (
                    <span className="loading-text"> - Procesando...</span>
                  )}
                </div>
                <div className="payment-method-description">
                  {isLoading && loadingMethod === 'khipu'
                    ? 'Conectando con Khipu, por favor espera...'
                    : 'Paga con tu banco favorito de forma rápida y segura'
                  }
                </div>
                <div className="payment-method-badges">
                  <span className="payment-badge instant">Instantáneo</span>
                  <span className="payment-badge secure">Seguro</span>
                  <span className="payment-badge">Todos los bancos</span>
                </div>
              </div>
            </div>
          </div>

          <div
            className={`payment-method-option ${selectedMethod === 'webpay' ? 'selected' : ''} ${isLoading && loadingMethod === 'webpay' ? 'loading' : ''}`}
            onClick={() => !isLoading && setSelectedMethod('webpay')}
            style={{ cursor: isLoading ? 'not-allowed' : 'pointer' }}
          >
            <div className="payment-method-info">
              <div className="payment-method-icon webpay">
                {isLoading && loadingMethod === 'webpay' ? (
                  <div className="loading-dot"></div>
                ) : (
                  '🏦'
                )}
              </div>
              <div className="payment-method-details">
                <div className="payment-method-name">
                  Webpay Plus
                  {isLoading && loadingMethod === 'webpay' && (
                    <span className="loading-text"> - Procesando...</span>
                  )}
                </div>
                <div className="payment-method-description">
                  {isLoading && loadingMethod === 'webpay'
                    ? 'Conectando con Webpay, por favor espera...'
                    : 'Paga con tarjeta de débito o crédito de forma segura'
                  }
                </div>
                <div className="payment-method-badges">
                  <span className="payment-badge secure">Seguro</span>
                  <span className="payment-badge">Visa</span>
                  <span className="payment-badge">Mastercard</span>
                  <span className="payment-badge">RedCompra</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button
            className="modal-btn cancel"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </button>
          <button
            className="modal-btn primary"
            onClick={handleSelect}
            disabled={!selectedMethod || isLoading}
          >
            {isLoading ? (
              <>
                <div className="loading-dot"></div>
                Procesando...
              </>
            ) : (
              'Continuar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodModal;