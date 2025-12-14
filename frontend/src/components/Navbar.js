import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../helpers/AuthContext';
import '../styles/Navbar.css';

const Navbar = () => {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Menu Overlay */}
      <div className={`navbar-overlay ${isMenuOpen ? 'active' : ''}`} onClick={closeMenu}></div>

      <nav className="navbar">
        <div className="navbar-container">
          <Link to="/" className="navbar-logo" onClick={closeMenu}>
            <div className="logo-container">
              <div className="logo-icon">
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
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
              <span className="logo-text">Tappy</span>
            </div>
          </Link>

          {/* Hamburger Menu Button */}
          <button
            className={`navbar-hamburger ${isMenuOpen ? 'active' : ''}`}
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          {/* Navigation Menu */}
          <div className={`navbar-menu ${isMenuOpen ? 'active' : ''}`}>
            <div className="navbar-menu-header">
              <div className="menu-logo">
                <div className="logo-icon">
                  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="45" fill="url(#logoGradient2)" stroke="#4ECDC4" strokeWidth="2" />
                    <path d="M30 35h40v8H55v22h-10V43H30v-8z" fill="white" />
                    <defs>
                      <linearGradient id="logoGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#4ECDC4" />
                        <stop offset="100%" stopColor="#45B7AA" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <span className="logo-text">Tappy</span>
              </div>
              <button className="menu-close" onClick={closeMenu}>×</button>
            </div>

            <ul className="navbar-menu-list">
              <li className="navbar-item">
                <Link to="/" className={`navbar-link ${isActive('/')}`} onClick={closeMenu}>
                  Home
                </Link>
              </li>
              <li className="navbar-item">
                <Link to="/productos" className={`navbar-link ${isActive('/productos')}`} onClick={closeMenu}>
                  Productos
                </Link>
              </li>
              {isAuthenticated && user && (
                <>
                  <li className="navbar-item">
                    <Link to={`/user/${user.username}`} className={`navbar-link ${isActive(`/user/${user.username}`)}`} onClick={closeMenu}>
                      Perfil
                    </Link>
                  </li>
                  <li className="navbar-item">
                    <Link to="/cuenta" className={`navbar-link ${isActive('/cuenta')}`} onClick={closeMenu}>
                      Cuenta
                    </Link>
                  </li>
                </>
              )}
              <li className="navbar-item">
                <Link to="/info" className={`navbar-link ${isActive('/info')}`} onClick={closeMenu}>
                  Info
                </Link>
              </li>
              {!isAuthenticated && (
                <li className="navbar-item">
                  <Link to="/register" className="navbar-link register-btn" onClick={closeMenu}>
                    Registrarse
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
