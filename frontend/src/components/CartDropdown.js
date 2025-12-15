import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../helpers/CartContext';
import '../styles/CartDropdown.css';

const CartDropdown = ({ isOpen, onClose }) => {
    const { items, total, removeItem, clearCart, itemCount } = useCart();
    const navigate = useNavigate();
    const dropdownRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    const handleCheckout = () => {
        navigate('/checkout');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="cart-dropdown" ref={dropdownRef}>
            <div className="cart-dropdown-header">
                <h3>Carrito ({itemCount})</h3>
                <button className="cart-dropdown-close" onClick={onClose}>×</button>
            </div>

            {items.length === 0 ? (
                <div className="cart-dropdown-empty">
                    <div className="cart-empty-icon">🛒</div>
                    <p>Tu carrito está vacío</p>
                </div>
            ) : (
                <>
                    <div className="cart-dropdown-items">
                        {items.map(item => (
                            <div key={item.id} className="cart-dropdown-item">
                                <div className="cart-item-details">
                                    <div className="cart-item-name">{item.name}</div>
                                    <div className="cart-item-meta">
                                        <span className="cart-item-quantity">x{item.quantity}</span>
                                        <span className="cart-item-price">${(item.price || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                                <button
                                    className="cart-item-remove"
                                    onClick={() => removeItem(item.id)}
                                    title="Eliminar"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="cart-dropdown-footer">
                        <div className="cart-dropdown-total">
                            <span>Total:</span>
                            <span className="total-amount">${total.toLocaleString()}</span>
                        </div>

                        <button className="cart-checkout-btn" onClick={handleCheckout}>
                            Ir a Checkout
                        </button>

                        <button className="cart-clear-btn" onClick={clearCart}>
                            Vaciar carrito
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default CartDropdown;
