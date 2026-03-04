import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../helpers/AuthContext';
import { useCart } from '../helpers/CartContext';
import CartDropdown from './CartDropdown';
import ProfileDropdown from './ProfileDropdown';
import '../styles/Navbar.css';
import tappyLogo from '../assets/tappy_logo.svg';
import tappyFont from '../assets/tappy_font.svg';

const Navbar = () => {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { itemCount } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const toggleCart = () => {
    setIsCartOpen(!isCartOpen);
    setIsProfileOpen(false);
  };

  const toggleProfile = () => {
    setIsProfileOpen(!isProfileOpen);
    setIsCartOpen(false);
  };

  return (
    <>
      {/* Menu Overlay */}
      <div className={`navbar-overlay ${isMenuOpen ? 'active' : ''}`} onClick={closeMenu}></div>

      <nav className="navbar">
        <div className="navbar-container">
          <Link to="/" className="navbar-logo" onClick={closeMenu}>
            <div className="logo-container">
              <img src={tappyLogo} alt="Tappy" className="logo-icon" />
              <img src={tappyFont} alt="Tappy" className="logo-font-img" />
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="navbar-links-desktop">
            <Link to="/" className={`navbar-link-desktop ${isActive('/')}`}>
              Home
            </Link>
            <Link to="/productos" className={`navbar-link-desktop ${isActive('/productos')}`}>
              Productos
            </Link>
            <Link to="/info" className={`navbar-link-desktop ${isActive('/info')}`}>
              Info
            </Link>
          </div>

          {/* Desktop Icons (Right side) */}
          <div className="navbar-icons-desktop">
            {/* Cart Icon */}
            <div className="navbar-icon-wrapper">
              <button className="navbar-icon-btn" onClick={toggleCart}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
                </svg>
                {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
              </button>
              <CartDropdown isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
            </div>

            {/* Profile Icon / Login Button */}
            {isAuthenticated && user ? (
              <div className="navbar-icon-wrapper">
                <button className="navbar-profile-btn" onClick={toggleProfile}>
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </button>
                <ProfileDropdown isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
              </div>
            ) : (
              <Link to="/register" className="navbar-register-btn">
                Registrarse
              </Link>
            )}
          </div>

          {/* Hamburger Menu Button (Mobile) */}
          <button
            className={`navbar-hamburger ${isMenuOpen ? 'active' : ''}`}
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          {/* Mobile Menu */}
          <div className={`navbar-menu ${isMenuOpen ? 'active' : ''}`}>
            <div className="navbar-menu-header">
              <div className="menu-logo">
                <img src={tappyLogo} alt="Tappy" className="logo-icon" />
                <img src={tappyFont} alt="Tappy" className="logo-font-img" />
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
              <li className="navbar-item">
                <Link to="/info" className={`navbar-link ${isActive('/info')}`} onClick={closeMenu}>
                  Info
                </Link>
              </li>
              {isAuthenticated && user && (
                <>
                  <li className="navbar-item">
                    <Link to={`/user/${user.username}`} className={`navbar-link ${isActive(`/user/${user.username}`)}`} onClick={closeMenu}>
                      Perfil Tappy
                    </Link>
                  </li>
                  <li className="navbar-item">
                    <Link to="/cuenta" className={`navbar-link ${isActive('/cuenta')}`} onClick={closeMenu}>
                      Cuenta
                    </Link>
                  </li>
                </>
              )}
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
