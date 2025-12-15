import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

const CartContext = createContext();

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart debe usarse dentro de CartProvider');
    }
    return context;
};

// Catálogo de precios
const PRICE_CATALOG = {
    'tappy-basic': 4990,
    'tappy-premium': 4990,
    'tappy-pack10': 4990,
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

export const CartProvider = ({ children }) => {
    const [items, setItems] = useState(() => {
        try {
            const raw = localStorage.getItem('tappy_cart');
            const parsedItems = raw ? JSON.parse(raw) : [];
            return updateItemPrices(parsedItems);
        } catch (e) {
            console.error('[Cart] Error loading from localStorage:', e);
            return [];
        }
    });

    // Persist to localStorage whenever items change
    useEffect(() => {
        try {
            localStorage.setItem('tappy_cart', JSON.stringify(items));
        } catch (e) {
            console.error('[Cart] Error saving to localStorage:', e);
        }
    }, [items]);

    // Calculate total
    const total = useMemo(() => {
        return items.reduce((sum, item) => {
            return sum + (item.price || 0) * (item.quantity || 1);
        }, 0);
    }, [items]);

    // Calculate total item count
    const itemCount = useMemo(() => {
        return items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    }, [items]);

    // Add item to cart
    const addItem = (product) => {
        setItems(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                // Increment quantity if already in cart
                return prev.map(item =>
                    item.id === product.id
                        ? { ...item, quantity: (item.quantity || 1) + 1 }
                        : item
                );
            } else {
                // Add new item
                return [...prev, { ...product, quantity: 1 }];
            }
        });
    };

    // Remove item from cart
    const removeItem = (productId) => {
        setItems(prev => prev.filter(item => item.id !== productId));
    };

    // Update item quantity
    const updateQuantity = (productId, delta) => {
        setItems(prev =>
            prev.map(item =>
                item.id === productId
                    ? { ...item, quantity: Math.max(1, (item.quantity || 1) + delta) }
                    : item
            )
        );
    };

    // Clear entire cart
    const clearCart = () => {
        setItems([]);
    };

    // Update prices to catalog
    const updatePrices = () => {
        setItems(prev => updateItemPrices(prev));
    };

    const value = {
        items,
        total,
        itemCount,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        updatePrices
    };

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
};
