import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import './Cuenta.css';

const Cuenta = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="cuenta-container">
      <div className="cuenta-card">
        <h1>Mi Cuenta</h1>
        
        <div className="cuenta-info">
          <div className="info-item">
            <label>Nombre:</label>
            <span>{user.name}</span>
          </div>
          <div className="info-item">
            <label>Username:</label>
            <span>@{user.username}</span>
          </div>
          <div className="info-item">
            <label>Email:</label>
            <span>{user.email || 'No especificado'}</span>
          </div>
        </div>

        <div className="cuenta-actions">
          <Link to="/edit-profile" className="btn-edit">Editar Perfil</Link>
          <button className="btn-password">Cambiar Contraseña</button>
          <button className="btn-logout" onClick={handleLogout}>
            Cerrar Sesión
          </button>
        </div>

        <div className="cuenta-link">
          <p>Tu perfil público:</p>
          <a 
            href={`/user/${user.username}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="profile-link"
          >
            tappy.com/user/{user.username}
          </a>
        </div>
      </div>
    </div>
  );
};

export default Cuenta;
