import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '../styles/PaymentResult.css';

const PaymentError = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('orderId');

    return (
        <div className="payment-result-container">
            <div className="payment-result-card error">
                <div className="result-icon error">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                </div>

                <h1 className="result-title">Pago Rechazado</h1>
                <p className="result-message">
                    Lo sentimos, tu pago no pudo ser procesado.
                    Por favor, intenta nuevamente con otro método de pago.
                </p>

                {orderId && (
                    <div className="order-info error-info">
                        <p className="info-text">
                            <strong>Referencia:</strong> {orderId.substring(0, 8)}...
                        </p>
                        <p className="info-text">
                            Tu orden aún está disponible y no ha sido pagada.
                        </p>
                    </div>
                )}

                <div className="error-reasons">
                    <h3>Posibles causas:</h3>
                    <ul>
                        <li>Fondos insuficientes en tu cuenta</li>
                        <li>Tarjeta vencida o bloqueada</li>
                        <li>Datos incorrectos de la tarjeta</li>
                        <li>Transacción cancelada por el usuario</li>
                        <li>Límite de compra excedido</li>
                    </ul>
                </div>

                <div className="result-actions">
                    <button
                        className="btn-primary"
                        onClick={() => navigate('/checkout')}
                    >
                        Intentar nuevamente
                    </button>
                    <button
                        className="btn-secondary"
                        onClick={() => navigate('/cart')}
                    >
                        Volver al carrito
                    </button>
                </div>

                <p className="result-note">
                    Si el problema persiste, por favor contacta a tu banco o
                    prueba con otro método de pago.
                </p>
            </div>
        </div>
    );
};

export default PaymentError;
