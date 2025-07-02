import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Register.css';

const initialState = {
  name: '',
  username: '',
  email: '',
  password: ''
};

const Register = () => {
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const userData = {
      name: form.name,
      username: form.username,
      email: form.email,
      password: form.password
    };
    try {
      const res = await fetch('http://localhost:3001/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.msg || 'Error al registrar usuario');
      }
      navigate(`/user/${form.username}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <form className="register-form" onSubmit={handleSubmit}>
        <h2>Crear tu perfil Tappy</h2>
        {error && <div className="register-error">{error}</div>}
        <input name="name" value={form.name} onChange={handleChange} placeholder="Nombre completo" required />
        <input name="username" value={form.username} onChange={handleChange} placeholder="Username único" required />
        <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Email" required />
        <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Contraseña" required />
        <button type="submit" disabled={loading}>{loading ? 'Creando...' : 'Crear perfil'}</button>
      </form>
    </div>
  );
};

export default Register;
