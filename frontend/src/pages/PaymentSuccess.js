import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../helpers/apiClient';
import '../styles/PaymentResult.css';

const PaymentSuccess = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const orderId = searchParams.get('orderId');

    useEffect(() => {
        const fetchOrder = async () => {
            if (!orderId) {
                setLoading(false);
                return;
            }

            try {
                const response = await apiClient.get(`/api/checkout/orders/${orderId}`);
                if (response.ok && response.order) {
                    setOrder(response.order);
                }
            } catch (error) {
                console.error('Error fetching order:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [orderId]);

    if (loading) {
        return (
            <div className="payment-result-container">
                <div className="payment-result-card">
                    <div className="loading-spinner"></div>
                    <p>Cargando información de tu pedido...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="payment-result-container">
            <div className="payment-result-card success">
                <div className="result-icon success">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                </div>

                <h1 className="result-title">¡Pago Exitoso!</h1>
                <p className="result-message">
                    Tu pago ha sido procesado correctamente.
                    {order && ` Tu número de orden es: ${orderId.substring(0, 8)}...`}
                </p>

                {order && (
                    <div className="order-summary">
                        <h3>Resumen del pedido</h3>
                        <div className="order-details">
                            <div className="detail-row">
                                <span className="detail-label">Estado:</span>
                                <span className="detail-value status-paid">Pagado</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Total:</span>
                                <span className="detail-value">${order.totalAmount?.toLocaleString() || order.amountCLP?.toLocaleString()} CLP</span>
                            </div>
                            {order.shippingInfo && (
                                <>
                                    <div className="detail-row">
                                        <span className="detail-label">Envío a:</span>
                                        <span className="detail-value">
                                            {order.shippingInfo.firstName} {order.shippingInfo.lastName}
                                        </span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="detail-label">Dirección:</span>
                                        <span className="detail-value">
                                            {order.shippingInfo.address}, {order.shippingInfo.city}, {order.shippingInfo.region}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                <div className="result-actions">
                    <button
                        className="btn-primary"
                        onClick={() => navigate('/productos')}
                    >
                        Seguir comprando
                    </button>
                    <button
                        className="btn-secondary"
                        onClick={() => navigate('/')}
                    >
                        Volver al inicio
                    </button>
                </div>

                <p className="result-note">
                    Recibirás un correo de confirmación en breve con los detalles de tu pedido.
                </p>
            </div>
        </div>
    );
};

export default PaymentSuccess;
