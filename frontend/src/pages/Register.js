import React, { useState } from 'react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../helpers/AuthContext';
import '../styles/Register.css';
import { api } from '../helpers/apiConfig';

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
      const registerUrl = api('/api/users/register');
      console.log('POST register ->', registerUrl);
      const res = await fetch(registerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.msg || `Error registro (${res.status})`);
      }

      // Login automático tras registro (usa email para ser consistente con el form de Login)
      try {
        const loginUrl = api('/api/users/login');
        console.log('POST auto-login ->', loginUrl);
        const loginRes = await fetch(loginUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, password: form.password })
        });
        const loginData = await loginRes.json().catch(() => ({}));
        if (loginRes.ok && loginData.token) {
          login(loginData.token, loginData.user);
        } else {
          console.warn('Auto-login falló', loginRes.status, loginData);
        }
      } catch (loginErr) {
        console.log('Error en login automático:', loginErr);
      }

      navigate(`/user/${form.username}`);
    } catch (err) {
      console.error('Error en registro:', err);
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
