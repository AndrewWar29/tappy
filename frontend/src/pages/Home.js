import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../helpers/AuthContext';
import '../styles/Home.css';

const Home = () => {
  const { isAuthenticated } = useAuth();
  return (
    <div className="home-container">
      <div className="home-hero">
        <div className="hero-section">
          <div className="hero-content">
            <div className="hero-logo">
              <img src="/gif_mascot.gif" alt="Tappy Mascot" className="hero-mascot" />
              <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="logo-svg">
                <circle cx="50" cy="50" r="45" fill="url(#logoGradient)" stroke="#4ECDC4" strokeWidth="2" />
                <path d="M30 35h40v8H55v22h-10V43H30v-8z" fill="white" />
                <defs>
                  <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#4ECDC4" />
                    <stop offset="100%" stopColor="#45B7AA" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <h1 className="home-title">Tappy</h1>
            <h2 className="home-subtitle">Tu tarjeta NFC digital</h2>
            <p className="home-description">
              Comparte tu información de contacto y redes sociales de manera instantánea
              con solo acercar tu tarjeta NFC a cualquier teléfono.
            </p>

            <div className="home-buttons">
              {!isAuthenticated && (
                <Link to="/register" className="home-btn-primary">
                  <span className="btn-icon">✨</span>
                  Crear mi perfil
                </Link>
              )}
              <Link to="/productos" className="home-btn-secondary">
                <span className="btn-icon">🛒</span>
                Comprar tarjeta NFC
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="home-features">
        <div className="feature">
          <div className="feature-icon">🚀</div>
          <h3>Instantáneo</h3>
          <p>Comparte tu información al instante</p>
        </div>
        <div className="feature">
          <div className="feature-icon">🔗</div>
          <h3>Personalizable</h3>
          <p>Edita tu perfil cuando quieras</p>
        </div>
        <div className="feature">
          <div className="feature-icon">📱</div>
          <h3>Compatible</h3>
          <p>Funciona con todos los teléfonos</p>
        </div>
      </div>

    </div>

  );
};

export default Home;
