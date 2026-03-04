import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../helpers/AuthContext';
import '../styles/Home.css';
import tappyLogo from '../assets/tappy_logo.svg';
import tappyFont from '../assets/tappy_font.svg';

const Home = () => {
  const { isAuthenticated } = useAuth();
  return (
    <div className="home-container">
      <div className="home-hero">
        <div className="hero-section">
          <div className="hero-content">
            <div className="hero-logo">
              <img src="/gif_mascot.gif" alt="Tappy Mascot" className="hero-mascot" />
              <img src={tappyLogo} alt="Tappy Logo" className="logo-svg" />
            </div>

            <img src={tappyFont} alt="Tappy" className="home-title-font" />
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
