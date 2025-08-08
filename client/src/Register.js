import React, { useState } from 'react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import './Register.css';

const initialState = {
  name: '',
  username: '',
  email: '',
  password: '',
  whatsapp: ''
};

const Register = () => {
  const [form, setForm] = useState(initialState);
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
    const userData = {
      name: form.name,
      username: form.username,
      email: form.email,
      password: form.password,
      whatsapp: form.whatsapp
    };
    try {
      const res = await fetch('http://localhost:3001/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.msg || 'Error al registrar usuario');
      }
      
      const newUser = await res.json();
      
      // Hacer login automático después del registro
      try {
        const loginRes = await fetch('http://localhost:3001/api/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: form.username, password: form.password })
        });
        
        if (loginRes.ok) {
          const loginData = await loginRes.json();
          login(loginData.token, loginData.user);
        }
      } catch (loginErr) {
        console.log('Error en login automático:', loginErr);
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
        <PhoneInput
          country={'mx'}
          value={form.whatsapp}
          onChange={value => setForm({ ...form, whatsapp: value })}
          inputProps={{
            name: 'whatsapp',
            required: false,
            autoFocus: false,
            placeholder: 'WhatsApp (opcional)'
          }}
          specialLabel=""
          inputStyle={{ width: '100%' }}
        />
        <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Contraseña" required />
        <button type="submit" disabled={loading}>{loading ? 'Creando...' : 'Crear perfil'}</button>
      </form>
    </div>
  );
};

export default Register;
