import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import './Navbar.css';

const Navbar = () => {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          Tappy ✨
        </Link>
        <ul className="navbar-menu">
          <li className="navbar-item">
            <Link to="/" className={`navbar-link ${isActive('/')}`}>
              Home
            </Link>
          </li>
          <li className="navbar-item">
            <Link to="/productos" className={`navbar-link ${isActive('/productos')}`}>
              Productos
            </Link>
          </li>
          <li className="navbar-item">
            <Link to="/carrito" className={`navbar-link ${isActive('/carrito')}`}>
              Carrito
            </Link>
          </li>
          <li className="navbar-item">
            <Link to="/mis-ordenes" className={`navbar-link ${isActive('/mis-ordenes')}`}>
              Mis Órdenes
            </Link>
          </li>
          {isAuthenticated && user && (
            <li className="navbar-item">
              <Link to={`/user/${user.username}`} className={`navbar-link ${isActive(`/user/${user.username}`)}`}>
                Perfil
              </Link>
            </li>
          )}
          <li className="navbar-item">
            <Link to="/cuenta" className={`navbar-link ${isActive('/cuenta')}`}>
              Cuenta
            </Link>
          </li>
          <li className="navbar-item">
            <Link to="/info" className={`navbar-link ${isActive('/info')}`}>
              Info
            </Link>
          </li>
          {!isAuthenticated && (
            <li className="navbar-item">
              <Link to="/register" className="navbar-link register-btn">
                Registrarse
              </Link>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
