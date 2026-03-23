import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../helpers/AuthContext';
import '../styles/Home.css';
import tappyFont from '../assets/tappy_font.svg';
import nfcCard from '../assets/nfc_card.png';

const Home = () => {
  const { isAuthenticated } = useAuth();
  return (
    <div className="home-container">
      <div className="home-hero">

        {/* Tarjeta NFC — aparece primero en mobile via order CSS */}
        <div className="hero-card-wrap">
          <div className="hero-card-glow" />
          <img src={nfcCard} alt="Tarjeta NFC Tappy" className="nfc-card-img" />
        </div>

        {/* Contenido de texto */}
        <div className="hero-content">
          <div className="hero-brand">
            <img src="/gif_mascot.gif" alt="Tappy Mascot" className="hero-mascot" />
            <img src={tappyFont} alt="Tappy" className="home-title-font" />
          </div>

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
