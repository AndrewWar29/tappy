import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import './Login.css';

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    console.log('Intentando login con:', form); // Debug

    try {
      const res = await fetch('http://localhost:3001/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      console.log('Respuesta del servidor:', res.status); // Debug

      if (!res.ok) {
        const data = await res.json();
        console.log('Error del servidor:', data); // Debug
        throw new Error(data.msg || 'Error al iniciar sesión');
      }

      const data = await res.json();
      console.log('Login exitoso, datos recibidos:', data); // Debug
      
      login(data.token, data.user);
      navigate('/cuenta');
    } catch (err) {
      console.error('Error en login:', err); // Debug
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Iniciar Sesión</h2>
        {error && <div className="login-error">{error}</div>}
        <input 
          name="email" 
          type="email"
          value={form.email} 
          onChange={handleChange} 
          placeholder="Email" 
          required 
        />
        <input 
          name="password" 
          type="password" 
          value={form.password} 
          onChange={handleChange} 
          placeholder="Contraseña" 
          required 
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Iniciando...' : 'Iniciar Sesión'}
        </button>
        <p className="login-register">
          ¿No tienes cuenta? <Link to="/register">Regístrate aquí</Link>
        </p>
      </form>
    </div>
  );
};

export default Login;
