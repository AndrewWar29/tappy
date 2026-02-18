import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../helpers/apiClient';
import '../styles/PaymentResult.css';

const PaymentError = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [order, setOrder] = useState(null);
    const [payment, setPayment] = useState(null);
    const [loading, setLoading] = useState(true);
    const orderId = searchParams.get('orderId');

    useEffect(() => {
        const fetchData = async () => {
            if (!orderId) {
                setLoading(false);
                return;
            }

            try {
                // Fetch Order
                const orderRes = await apiClient.get(`/api/checkout/orders/${orderId}`);
                if (orderRes.ok && orderRes.order) {
                    setOrder(orderRes.order);
                }

                // Fetch Payment (to get failure reason)
                try {
                    const paymentRes = await apiClient.get(`/api/payments/by-order/${orderId}`);
                    if (paymentRes.ok && paymentRes.payments && paymentRes.payments.length > 0) {
                        // Assuming the last payment is the relevant one
                        // Ideally backend should sort, but we can sort here by createdAt if string ISO
                        const sorted = paymentRes.payments.sort((a, b) =>
                            new Date(b.createdAt) - new Date(a.createdAt)
                        );
                        setPayment(sorted[0]);
                    }
                } catch (e) {
                    console.warn('Could not fetch payment details', e);
                }

            } catch (error) {
                console.error('Error fetching details:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [orderId]);

    const getErrorMessage = (p) => {
        if (!p) return null;
        // Transbank codes: https://www.transbankdevelopers.cl/referencia/webpay#codigos-de-respuesta
        // But we store what Webpay returns.
        // If responseCode is available:
        const code = p.responseCode;
        if (code !== undefined && code !== null) {
            if (code === -1) return "Rechazo de la transacción (posiblemente fondos insuficientes o tarjeta bloqueada).";
            if (code === -2) return "Transacción suspendida (intente nuevamente).";
            if (code === -3) return "Error en transacción.";
            if (code === -4) return "Transacción rechazada (seguridad).";
            if (code === -5) return "Rechazo de tasa.";
        }
        return p.status === 'FAILED' ? "La transacción fue rechazada por el banco." : null;
    };

    if (loading) {
        return (
            <div className="payment-result-container">
                <div className="payment-result-card">
                    <div className="loading-spinner"></div>
                    <p>Verificando estado del pago...</p>
                </div>
            </div>
        );
    }

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
                    {getErrorMessage(payment) && (
                        <span style={{ display: 'block', marginTop: '0.5rem', fontWeight: 'bold' }}>
                            {getErrorMessage(payment)}
                        </span>
                    )}
                </p>

                {orderId && (
                    <div className="order-info error-info">
                        <p className="info-text">
                            <strong>Referencia:</strong> {orderId.substring(0, 8)}...
                        </p>
                        <p className="info-text">
                            Tu orden ({order ? `$${(order.totalAmount || order.amountCLP)?.toLocaleString()}` : ''}) guarda tus productos para que intentes nuevamente.
                        </p>
                    </div>
                )}

                {order && order.items && (
                    <div className="order-summary" style={{ textAlign: 'left', background: 'transparent', padding: 0 }}>
                        <h3>Resumen del intento</h3>
                        <div className="order-details">
                            {order.items.map((item, index) => (
                                <div key={index} className="detail-row">
                                    <span className="detail-label">
                                        {item.qty}x {item.name || item.sku}
                                    </span>
                                    <span className="detail-value">
                                        ${(item.priceCLP * item.qty).toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="error-reasons">
                    <h3>Sugerencias:</h3>
                    <ul>
                        <li>Revisa si tienes fondos suficientes.</li>
                        <li>Verifica que tu tarjeta esté habilitada para compras web.</li>
                        <li>Intenta con otra tarjeta o método de pago.</li>
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
                    Si el problema persiste, contacta a tu banco.
                </p>
            </div>
        </div>
    );
};

export default PaymentError;
