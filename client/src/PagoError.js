import React from 'react';
import { useSearchParams } from 'react-router-dom';

export default function PagoError() {
  const [params] = useSearchParams();
  const orderId = params.get('orderId');
  return (
    <div style={{ padding: 24 }}>
      <h2>Hubo un problema con tu pago</h2>
      {orderId && <p>Orden: {orderId}</p>}
      <p>Intenta nuevamente o contáctanos si el problema persiste.</p>
    </div>
  );
}
