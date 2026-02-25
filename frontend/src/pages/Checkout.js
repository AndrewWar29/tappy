import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../helpers/CartContext';
import { useAuth } from '../helpers/AuthContext';
import { apiClient } from '../helpers/apiClient';
import '../styles/Checkout.css';

const CHILEAN_REGIONS = [
    'Arica y Parinacota',
    'Tarapacá',
    'Antofagasta',
    'Atacama',
    'Coquimbo',
    'Valparaíso',
    'Metropolitana de Santiago',
    'Libertador General Bernardo O\'Higgins',
    'Maule',
    'Ñuble',
    'Biobío',
    'La Araucanía',
    'Los Ríos',
    'Los Lagos',
    'Aisén del General Carlos Ibáñez del Campo',
    'Magallanes y de la Antártica Chilena'
];

const SHIPPING_OPTIONS = [
    { id: 'starken', name: 'Starken', cost: 3000 },
    { id: 'chilexpress', name: 'Chilexpress', cost: 3000 },
    { id: 'blueexpress', name: 'BlueExpress', cost: 3000 }
];

const Checkout = () => {
    const navigate = useNavigate();
    const { items, total, clearCart, updateQuantity, removeItem } = useCart();
    const { user, isAuthenticated } = useAuth();

    const isVerified = user?.isVerified === true;

    // Scroll to top when entering checkout
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const [formData, setFormData] = useState({
        email: user?.email || '',
        firstName: user?.name?.split(' ')[0] || '',
        lastName: user?.name?.split(' ').slice(1).join(' ') || '',
        address: '',
        apartment: '',
        city: '',
        region: '',
        postalCode: '',
        phone: user?.whatsapp || '',
        shippingMethod: 'starken',
        paymentMethod: 'webpay'
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const shippingCost = SHIPPING_OPTIONS.find(opt => opt.id === formData.shippingMethod)?.cost || 0;
    const finalTotal = total + shippingCost;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.email) newErrors.email = 'Email es requerido';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email inválido';

        if (!formData.firstName) newErrors.firstName = 'Nombre es requerido';
        if (!formData.lastName) newErrors.lastName = 'Apellido es requerido';
        if (!formData.address) newErrors.address = 'Dirección es requerida';
        if (!formData.city) newErrors.city = 'Ciudad es requerida';
        if (!formData.region) newErrors.region = 'Región es requerida';
        if (!formData.phone) newErrors.phone = 'Teléfono es requerido';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            alert('Por favor completa todos los campos requeridos');
            return;
        }

        if (!isAuthenticated || !isVerified) {
            alert('Debes crear una cuenta y verificar tu correo para continuar');
            return;
        }

        if (items.length === 0) {
            alert('Tu carrito está vacío');
            return;
        }

        setLoading(true);

        try {
            // Create checkout order
            const mapped = items.map(it => ({
                sku: it.sku || it.id,
                name: it.name,
                priceCLP: it.price || 0,
                qty: it.quantity || 1
            }));

            const orderData = {
                items: mapped,
                userId: (user && (user.id || user.uid)) || 'guest',
                shippingInfo: {
                    email: formData.email,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    address: formData.address,
                    apartment: formData.apartment,
                    city: formData.city,
                    region: formData.region,
                    postalCode: formData.postalCode,
                    phone: formData.phone,
                    shippingMethod: formData.shippingMethod,
                    shippingCost: shippingCost
                }
            };

            const checkoutRes = await apiClient.post('/api/checkout', orderData);

            if (!checkoutRes.ok) {
                throw new Error(checkoutRes.message || 'Error creando orden');
            }

            // Initialize payment
            const endpoint = formData.paymentMethod === 'khipu'
                ? '/api/pay-khipu/init'
                : '/api/pay-webpay/init';

            const paymentRes = await apiClient.post(endpoint, {
                orderId: checkoutRes.orderId,
                userId: (user && (user.id || user.uid)) || 'guest'
            });

            if (!paymentRes.ok) {
                throw new Error(paymentRes.message || 'Error iniciando pago');
            }

            // Clear cart on successful payment init
            clearCart();

            // Redirect to payment gateway
            window.location.href = paymentRes.redirectUrl;
        } catch (error) {
            console.error('Error en checkout:', error);
            alert(error.message || 'Error al procesar el pago');
            setLoading(false);
        }
    };

    if (items.length === 0) {
        return (
            <div className="checkout-container">
                <div className="checkout-empty">
                    <h2>Tu carrito está vacío</h2>
                    <p>Agrega productos para continuar con la compra</p>
                    <button onClick={() => navigate('/productos')} className="btn-return">
                        Ver Productos
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="checkout-container">
            <div className="checkout-content">
                {/* Left Column - Form */}
                <div className="checkout-form-section">
                    <h1 className="checkout-logo">Tappy</h1>

                    <form onSubmit={handleSubmit}>
                        {/* Account Section */}
                        <div className="checkout-section">
                            <h2 className="section-title">Cuenta</h2>

                            {!isAuthenticated ? (
                                <div className="auth-required-box">
                                    <div className="auth-required-icon">🔒</div>
                                    <p className="auth-required-text">
                                        Para completar tu compra necesitas una cuenta Tappy con correo verificado.
                                    </p>
                                    <div className="auth-required-actions">
                                        <button
                                            type="button"
                                            className="auth-btn auth-btn-primary"
                                            onClick={() => navigate('/register', { state: { from: '/checkout' } })}
                                        >
                                            Crear cuenta
                                        </button>
                                        <button
                                            type="button"
                                            className="auth-btn auth-btn-secondary"
                                            onClick={() => navigate('/login', { state: { from: '/checkout' } })}
                                        >
                                            Ya tengo cuenta
                                        </button>
                                    </div>
                                </div>
                            ) : !isVerified ? (
                                <div className="auth-required-box auth-verify-box">
                                    <div className="auth-required-icon">📧</div>
                                    <p className="auth-required-text">
                                        Tu correo <strong>{user.email}</strong> aún no está verificado.
                                        Revisa tu bandeja de entrada para el código de verificación.
                                    </p>
                                    <button
                                        type="button"
                                        className="auth-btn auth-btn-primary"
                                        onClick={() => navigate('/verify-email', { state: { email: user.email, from: '/checkout' } })}
                                    >
                                        Verificar correo
                                    </button>
                                </div>
                            ) : (
                                <div className="auth-verified-box">
                                    <span className="auth-verified-icon">✅</span>
                                    <div className="auth-verified-info">
                                        <span className="auth-verified-email">{user.email}</span>
                                        <span className="auth-verified-label">Correo verificado</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Delivery Section */}
                        <div className="checkout-section">
                            <h2 className="section-title">Entrega</h2>

                            <div className="form-row">
                                <div className="form-group">
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        placeholder="Nombre *"
                                        className={errors.firstName ? 'error' : ''}
                                    />
                                    {errors.firstName && <span className="error-text">{errors.firstName}</span>}
                                </div>
                                <div className="form-group">
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        placeholder="Apellido *"
                                        className={errors.lastName ? 'error' : ''}
                                    />
                                    {errors.lastName && <span className="error-text">{errors.lastName}</span>}
                                </div>
                            </div>

                            <div className="form-group">
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="Dirección *"
                                    className={errors.address ? 'error' : ''}
                                />
                                {errors.address && <span className="error-text">{errors.address}</span>}
                            </div>

                            <div className="form-group">
                                <input
                                    type="text"
                                    name="apartment"
                                    value={formData.apartment}
                                    onChange={handleChange}
                                    placeholder="Apartamento, suite, etc. (opcional)"
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <input
                                        type="text"
                                        name="postalCode"
                                        value={formData.postalCode}
                                        onChange={handleChange}
                                        placeholder="Código postal (opcional)"
                                    />
                                </div>
                                <div className="form-group">
                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleChange}
                                        placeholder="Ciudad *"
                                        className={errors.city ? 'error' : ''}
                                    />
                                    {errors.city && <span className="error-text">{errors.city}</span>}
                                </div>
                            </div>

                            <div className="form-group">
                                <select
                                    name="region"
                                    value={formData.region}
                                    onChange={handleChange}
                                    className={errors.region ? 'error' : ''}
                                >
                                    <option value="">Selecciona región</option>
                                    {CHILEAN_REGIONS.map(region => (
                                        <option key={region} value={region}>{region}</option>
                                    ))}
                                </select>
                                {errors.region && <span className="error-text">{errors.region}</span>}
                            </div>

                            <div className="form-group">
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="Teléfono *"
                                    className={errors.phone ? 'error' : ''}
                                />
                                {errors.phone && <span className="error-text">{errors.phone}</span>}
                            </div>
                        </div>

                        {/* Shipping Method Section */}
                        <div className="checkout-section">
                            <h2 className="section-title">Método de envío</h2>
                            <div className="shipping-options">
                                {SHIPPING_OPTIONS.map(option => (
                                    <label key={option.id} className="shipping-option">
                                        <input
                                            type="radio"
                                            name="shippingMethod"
                                            value={option.id}
                                            checked={formData.shippingMethod === option.id}
                                            onChange={handleChange}
                                        />
                                        <span className="shipping-name">{option.name}</span>
                                        <span className="shipping-cost">${option.cost.toLocaleString()}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Payment Method Section */}
                        <div className="checkout-section">
                            <h2 className="section-title">Método de pago</h2>
                            <p className="section-subtitle">Todas las transacciones son seguras y encriptadas.</p>
                            <div className="payment-options">
                                <label className="payment-option">
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="webpay"
                                        checked={formData.paymentMethod === 'webpay'}
                                        onChange={handleChange}
                                    />
                                    <span className="payment-name">Webpay</span>
                                </label>
                                <label className="payment-option">
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="khipu"
                                        checked={formData.paymentMethod === 'khipu'}
                                        onChange={handleChange}
                                    />
                                    <span className="payment-name">Khipu</span>
                                </label>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="checkout-submit-btn"
                            disabled={loading || !isAuthenticated || !isVerified}
                        >
                            {loading ? 'Procesando...' : !isAuthenticated ? '🔒 Inicia sesión para pagar' : !isVerified ? '📧 Verifica tu correo para pagar' : 'Proceder al Pago'}
                        </button>
                    </form>
                </div>

                {/* Right Column - Order Summary */}
                <div className="checkout-summary-section">
                    <h2 className="summary-title">Resumen del pedido</h2>

                    <div className="summary-items">
                        {items.map(item => (
                            <div key={item.id} className="summary-item">
                                <div className="summary-item-top">
                                    <span className="summary-item-name">{item.name}</span>
                                    <button
                                        className="summary-remove-btn"
                                        onClick={() => removeItem(item.id)}
                                        title="Eliminar producto"
                                    >
                                        ✕
                                    </button>
                                </div>
                                <div className="summary-item-bottom">
                                    <div className="summary-quantity-control">
                                        <button
                                            className="summary-qty-btn"
                                            onClick={() => updateQuantity(item.id, -1)}
                                            disabled={item.quantity <= 1}
                                        >
                                            −
                                        </button>
                                        <span className="summary-qty-display">{item.quantity || 1}</span>
                                        <button
                                            className="summary-qty-btn"
                                            onClick={() => updateQuantity(item.id, 1)}
                                        >
                                            +
                                        </button>
                                    </div>
                                    <span className="summary-item-price">
                                        ${((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="summary-totals">
                        <div className="summary-row">
                            <span>Subtotal</span>
                            <span>${total.toLocaleString()}</span>
                        </div>
                        <div className="summary-row">
                            <span>Envío</span>
                            <span>${shippingCost.toLocaleString()}</span>
                        </div>
                        <div className="summary-row summary-total">
                            <span>Total</span>
                            <span className="total-amount">${finalTotal.toLocaleString()} CLP</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
