import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';

export default function CheckoutCancel() {
  const [params] = useSearchParams();
  const orderId = params.get('orderId');
  return (
    <div style={{ padding: 24 }}>
      <h2>Pago cancelado</h2>
      {orderId && <p>Orden: {orderId}</p>}
      <p>Si fue un error puedes intentar nuevamente desde tus órdenes o el carrito.</p>
      <Link to="/carrito">Volver al carrito</Link>
    </div>
  );
}
