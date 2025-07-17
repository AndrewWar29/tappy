import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import './EditProfile.css';

const EditProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    instagram: '',
    facebook: '',
    linkedin: '',
    twitter: '',
    spotify: '',
    youtube: '',
    tiktok: '',
    whatsapp: ''
  });

  useEffect(() => {
    if (user) {
      // Cargar datos actuales del usuario
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/users/${user.username}`);
      if (res.ok) {
        const userData = await res.json();
        console.log('Datos del usuario cargados:', userData); // Debug
        setForm({
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          bio: userData.bio || '',
          instagram: userData.social?.instagram || '',
          facebook: userData.social?.facebook || '',
          linkedin: userData.social?.linkedin || '',
          twitter: userData.social?.twitter || '',
          spotify: userData.social?.spotify || '',
          youtube: userData.social?.youtube || '',
          tiktok: userData.social?.tiktok || '',
          whatsapp: userData.social?.whatsapp || ''
        });
      }
    } catch (err) {
      setError('Error al cargar los datos del usuario');
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const updateData = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      bio: form.bio,
      social: {
        instagram: form.instagram,
        facebook: form.facebook,
        linkedin: form.linkedin,
        twitter: form.twitter,
        spotify: form.spotify,
        youtube: form.youtube,
        tiktok: form.tiktok,
        whatsapp: form.whatsapp
      }
    };

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      console.log('Datos a enviar:', updateData); // Debug
      
      const res = await fetch(`http://localhost:3001/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.msg || 'Error al actualizar perfil');
      }

      const updatedUser = await res.json();
      console.log('Usuario actualizado:', updatedUser); // Debug
      
      // Asegurar que el loader se vea por al menos 1 segundo
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess(true);
      setLoading(false);
      
      // Mostrar mensaje de éxito y preparar navegación
      setIsNavigating(true);
      setTimeout(() => {
        navigate(`/user/${user.username}?refresh=${Date.now()}`);
      }, 1500);
    } catch (err) {
      setError(err.message);
      console.error('Error al actualizar:', err); // Debug
      // Si el error es de autenticación, redirigir al login
      if (err.message.includes('token') || err.message.includes('autorización')) {
        setTimeout(() => {
          navigate('/cuenta');
        }, 2000);
      }
      setLoading(false);
    }
  };

  if (!user) {
    return <div>Debes iniciar sesión para editar tu perfil</div>;
  }

  return (
    <div className="edit-profile-container">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <div className="spinner-large"></div>
            <p>Guardando cambios...</p>
          </div>
        </div>
      )}
      
      {isNavigating && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <div className="spinner-large"></div>
            <p>Redirigiendo a tu perfil...</p>
          </div>
        </div>
      )}
      
      <form className="edit-profile-form" onSubmit={handleSubmit}>
        <h2>Editar Perfil</h2>
        
        {error && <div className="edit-error">{error}</div>}
        {success && <div className="edit-success">¡Perfil actualizado exitosamente!</div>}

        <div className="form-section">
          <h3>Información Personal</h3>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Nombre completo"
            required
          />
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Email"
          />
          <input
            name="phone"
            type="tel"
            value={form.phone}
            onChange={handleChange}
            placeholder="Teléfono"
          />
          <textarea
            name="bio"
            value={form.bio}
            onChange={handleChange}
            placeholder="Biografía breve"
            rows="3"
          />
        </div>

        <div className="form-section">
          <h3>Redes Sociales</h3>
          <div className="social-inputs">
            <div className="input-group">
              <label>📷 Instagram</label>
              <input
                name="instagram"
                value={form.instagram}
                onChange={handleChange}
                placeholder="tu_usuario"
              />
            </div>
            <div className="input-group">
              <label>📘 Facebook</label>
              <input
                name="facebook"
                value={form.facebook}
                onChange={handleChange}
                placeholder="tu.perfil"
              />
            </div>
            <div className="input-group">
              <label>💼 LinkedIn</label>
              <input
                name="linkedin"
                value={form.linkedin}
                onChange={handleChange}
                placeholder="tu-perfil"
              />
            </div>
            <div className="input-group">
              <label>🐦 Twitter/X</label>
              <input
                name="twitter"
                value={form.twitter}
                onChange={handleChange}
                placeholder="tu_usuario"
              />
            </div>
            <div className="input-group">
              <label>🎵 Spotify</label>
              <input
                name="spotify"
                value={form.spotify}
                onChange={handleChange}
                placeholder="tu_usuario"
              />
            </div>
            <div className="input-group">
              <label>📺 YouTube</label>
              <input
                name="youtube"
                value={form.youtube}
                onChange={handleChange}
                placeholder="tu_canal"
              />
            </div>
            <div className="input-group">
              <label>📱 TikTok</label>
              <input
                name="tiktok"
                value={form.tiktok}
                onChange={handleChange}
                placeholder="tu_usuario"
              />
            </div>
            <div className="input-group">
              <label>💬 WhatsApp</label>
              <input
                name="whatsapp"
                value={form.whatsapp}
                onChange={handleChange}
                placeholder="Número con código país"
              />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={loading || isNavigating} className={(loading || isNavigating) ? 'loading' : ''}>
            {loading ? (
              <span className="button-loading">
                <div className="spinner"></div>
                Guardando...
              </span>
            ) : isNavigating ? (
              <span className="button-loading">
                <div className="spinner"></div>
                Redirigiendo...
              </span>
            ) : (
              'Guardar Cambios'
            )}
          </button>
          <button type="button" onClick={() => navigate(`/user/${user.username}`)} disabled={loading || isNavigating}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProfile;
