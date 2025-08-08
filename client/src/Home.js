import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const Home = () => {
  return (
    <div className="home-container">
      <div className="home-hero">
        <h1 className="home-title">Tappy ✨</h1>
        <h2 className="home-subtitle">Tu tarjeta NFC digital</h2>
        <p className="home-description">
          Comparte tu información de contacto y redes sociales de manera instantánea 
          con solo acercar tu tarjeta NFC a cualquier teléfono.
        </p>
        <div className="home-buttons">
          <Link to="/register" className="home-btn-primary">
            Crear mi perfil
          </Link>
          <button className="home-btn-secondary">
            Comprar tarjeta NFC
          </button>
        </div>
      </div>
      
      <div className="home-features">
        <div className="feature">
          <h3>🚀 Instantáneo</h3>
          <p>Comparte tu información al instante</p>
        </div>
        <div className="feature">
          <h3>🔗 Personalizable</h3>
          <p>Edita tu perfil cuando quieras</p>
        </div>
        <div className="feature">
          <h3>📱 Compatible</h3>
          <p>Funciona con todos los teléfonos</p>
        </div>
      </div>
    </div>
  );
};

export default Home;
