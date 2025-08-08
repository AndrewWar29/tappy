import React from 'react';
import './Productos.css';

const Productos = () => {
  return (
    <div className="productos-container">
      <div className="productos-hero">
        <h1>Nuestros Productos</h1>
        <p>Tarjetas NFC personalizadas para tu negocio</p>
      </div>
      
      <div className="productos-grid">
        <div className="producto-card">
          <h3>Tarjeta Básica</h3>
          <p className="precio">$15.000</p>
          <ul>
            <li>Tarjeta NFC personalizada</li>
            <li>Perfil digital incluido</li>
            <li>Diseño estándar</li>
          </ul>
          <button className="btn-comprar">Comprar</button>
        </div>
        
        <div className="producto-card featured">
          <h3>Tarjeta Premium</h3>
          <p className="precio">$25.000</p>
          <ul>
            <li>Tarjeta NFC personalizada</li>
            <li>Perfil digital incluido</li>
            <li>Diseño personalizado</li>
            <li>Soporte prioritario</li>
          </ul>
          <button className="btn-comprar">Comprar</button>
        </div>
        
        <div className="producto-card">
          <h3>Pack Empresarial</h3>
          <p className="precio">$200.000</p>
          <ul>
            <li>10 tarjetas NFC</li>
            <li>Perfiles digitales incluidos</li>
            <li>Branding empresarial</li>
            <li>Soporte dedicado</li>
          </ul>
          <button className="btn-comprar">Comprar</button>
        </div>
      </div>
    </div>
  );
};

export default Productos;
