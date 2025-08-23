import React from 'react';
import './Info.css';

const Info = () => {
  return (
    <div className="info-container">
      <div className="info-hero">
        <h1>Sobre Tappy</h1>
        <p>La revolución digital en tarjetas de presentación</p>
      </div>
      
      <div className="info-content">
        <section className="info-section">
          <h2>¿Qué es Tappy?(EXPLICACION)</h2>
          <p>
            Tappy es una plataforma innovadora que combina tarjetas NFC físicas con perfiles digitales 
            personalizables. Permite compartir información de contacto, redes sociales y más de manera 
            instantánea y profesional.
          </p>
        </section>
        
        <section className="info-section">
          <h2>¿Cómo funciona?</h2>
          <div className="steps">
            <div className="step">
              <h3>1. Crea tu perfil</h3>
              <p>Registra tu información y personaliza tu perfil digital</p>
            </div>
            <div className="step">
              <h3>2. Compra tu tarjeta</h3>
              <p>Ordena tu tarjeta NFC personalizada</p>
            </div>
            <div className="step">
              <h3>3. Comparte al instante</h3>
              <p>Acerca tu tarjeta a cualquier teléfono para compartir tu información</p>
            </div>
          </div>
        </section>
        
        <section className="info-section">
          <h2>Ventajas</h2>
          <ul className="ventajas-list">
            <li>✅ Ecológico - Sin papel</li>
            <li>✅ Actualizable - Modifica tu información cuando quieras</li>
            <li>✅ Profesional - Causa una excelente primera impresión</li>
            <li>✅ Compatible - Funciona con todos los smartphones</li>
            <li>✅ Duradero - Tarjetas resistentes al agua y uso diario</li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default Info;
