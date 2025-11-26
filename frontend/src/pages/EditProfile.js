import React, { useState, useEffect } from 'react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../helpers/AuthContext';
import '../styles/EditProfile.css';
import { BASE_URL } from '../helpers/apiConfig';
import { apiClient } from '../helpers/apiClient';

const EditProfile = () => {
  const { user, updateUser } = useAuth();
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
    avatar: '', // URL de la foto de perfil
    instagram: '',
    facebook: '',
    linkedin: '',
    twitter: '',
    spotify: '',
    youtube: '',
    tiktok: '',
    whatsapp: ''
  });

  const fetchUserData = async () => {
    try {
      const userData = await apiClient.get(`/api/users/${user.username}`);
      console.log('Datos del usuario cargados:', userData);
      setForm({
        name: userData.name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        bio: userData.bio || '',
        avatar: userData.avatar || '',
        instagram: userData.social?.instagram || '',
        facebook: userData.social?.facebook || '',
        linkedin: userData.social?.linkedin || '',
        twitter: userData.social?.twitter || '',
        spotify: userData.social?.spotify || '',
        youtube: userData.social?.youtube || '',
        tiktok: userData.social?.tiktok || '',
        whatsapp: userData.social?.whatsapp || ''
      });
    } catch (err) {
      setError(err.message || 'Error al cargar los datos del usuario');
    }
  };

  useEffect(() => {
    if (user) {
      // Cargar datos actuales del usuario
      fetchUserData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Manejar subida de imagen
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const data = await apiClient.postFormData('/api/users/upload-avatar', formData);
      if (data.url) {
        // Guardar la URL absoluta para el frontend
        const absolute = data.url.startsWith('http') ? data.url : `${BASE_URL}${data.url}`;
        setForm(f => ({ ...f, avatar: absolute }));
      } else {
        setError('Error al subir la imagen');
      }
    } catch (err) {
      setError(err.message || 'Error al subir la imagen');
    }
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
      avatar: form.avatar,
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
      console.log('Datos a enviar:', updateData);

      const updatedUser = await apiClient.put(`/api/users/${user.id}`, updateData);
      console.log('Usuario actualizado:', updatedUser);

      // Actualizar el contexto de autenticación con los nuevos datos
      updateUser(updatedUser);

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
      console.error('Error al actualizar:', err);
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
          <PhoneInput
            country={'mx'}
            value={form.phone}
            onChange={value => setForm({ ...form, phone: value })}
            inputProps={{
              name: 'phone',
              required: false,
              autoFocus: false,
              placeholder: 'Teléfono'
            }}
            specialLabel=""
            inputStyle={{ width: '100%' }}
          />
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontWeight: 500, color: '#374151', marginBottom: 4, display: 'block' }}>Foto de perfil</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
            />
            {form.avatar && (
              <div style={{ marginTop: 8 }}>
                <img src={form.avatar} alt="preview" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '1px solid #e5e7eb' }} />
              </div>
            )}
            <input
              name="avatar"
              type="url"
              value={form.avatar}
              onChange={handleChange}
              placeholder="URL de tu foto de perfil (opcional)"
              style={{ marginTop: 8 }}
            />
          </div>
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
                placeholder="URL completo de tu perfil (ej: https://facebook.com/tu.perfil)"
                type="url"
                pattern="https?://.*"
              />
            </div>
            <div className="input-group">
              <label>💼 LinkedIn</label>
              <input
                name="linkedin"
                value={form.linkedin}
                onChange={handleChange}
                placeholder="URL completo de tu perfil (ej: https://linkedin.com/in/tu-perfil)"
                type="url"
                pattern="https?://.*"
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
              <PhoneInput
                country={'mx'}
                value={form.whatsapp}
                onChange={value => setForm({ ...form, whatsapp: value })}
                inputProps={{
                  name: 'whatsapp',
                  required: false,
                  autoFocus: false,
                  placeholder: 'Número de WhatsApp'
                }}
                specialLabel=""
                inputStyle={{ width: '100%' }}
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
