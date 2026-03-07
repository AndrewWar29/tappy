import React, { useState, useEffect } from 'react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaInstagram, FaFacebook, FaLinkedin, FaTwitter,
  FaSpotify, FaYoutube, FaWhatsapp,
  FaLink, FaPlus, FaTimes, FaUser, FaEnvelope,
  FaCamera, FaSave, FaArrowLeft, FaPhone
} from 'react-icons/fa';
import { FaTiktok } from 'react-icons/fa6';
import { useAuth } from '../helpers/AuthContext';
import '../styles/EditProfile.css';
import { BASE_URL } from '../helpers/apiConfig';
import { apiClient } from '../helpers/apiClient';

const SOCIAL_FIELDS = [
  { name: 'instagram', label: 'Instagram', icon: FaInstagram, color: '#E1306C', placeholder: 'tu_usuario', prefix: '@' },
  { name: 'facebook', label: 'Facebook', icon: FaFacebook, color: '#1877F2', placeholder: 'https://facebook.com/tu.perfil', type: 'url' },
  { name: 'linkedin', label: 'LinkedIn', icon: FaLinkedin, color: '#0A66C2', placeholder: 'https://linkedin.com/in/tu-perfil', type: 'url' },
  { name: 'twitter', label: 'Twitter / X', icon: FaTwitter, color: '#1DA1F2', placeholder: 'tu_usuario', prefix: '@' },
  { name: 'spotify', label: 'Spotify', icon: FaSpotify, color: '#1DB954', placeholder: 'tu_usuario' },
  { name: 'youtube', label: 'YouTube', icon: FaYoutube, color: '#FF0000', placeholder: 'tu_canal', prefix: '@' },
  { name: 'tiktok', label: 'TikTok', icon: FaTiktok, color: '#010101', placeholder: 'tu_usuario', prefix: '@' },
];

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.4, ease: 'easeOut' }
  })
};

const linkRowVariants = {
  hidden: { opacity: 0, x: -20, height: 0 },
  visible: { opacity: 1, x: 0, height: 'auto', transition: { duration: 0.25 } },
  exit: { opacity: 0, x: 20, height: 0, transition: { duration: 0.2 } }
};

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
    avatar: '',
    instagram: '',
    facebook: '',
    linkedin: '',
    twitter: '',
    spotify: '',
    youtube: '',
    tiktok: '',
    whatsapp: '',
    links: []
  });

  const fetchUserData = async () => {
    try {
      const userData = await apiClient.get(`/api/users/${user.username}`);
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
        whatsapp: userData.social?.whatsapp || '',
        links: userData.links || []
      });
    } catch (err) {
      setError(err.message || 'Error al cargar los datos del usuario');
    }
  };

  useEffect(() => {
    if (user) fetchUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const addLink = () => {
    setForm(f => ({ ...f, links: [...f.links, { title: '', url: '' }] }));
  };

  const removeLink = (index) => {
    setForm(f => ({ ...f, links: f.links.filter((_, i) => i !== index) }));
  };

  const updateLink = (index, field, value) => {
    setForm(f => ({
      ...f,
      links: f.links.map((link, i) => i === index ? { ...link, [field]: value } : link)
    }));
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const data = await apiClient.postFormData('/api/users/upload-avatar', formData);
      if (data.url) {
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
      },
      links: form.links.filter(l => l.title.trim() && l.url.trim())
    };

    try {
      const updatedUser = await apiClient.put(`/api/users/${user.id}`, updateData);
      updateUser(updatedUser);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess(true);
      setLoading(false);
      setIsNavigating(true);
      setTimeout(() => {
        navigate(`/user/${user.username}?refresh=${Date.now()}`);
      }, 1500);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="ep-auth-wall">Debes iniciar sesion para editar tu perfil</div>;
  }

  return (
    <div className="ep-container">
      <AnimatePresence>
        {(loading || isNavigating) && (
          <motion.div
            className="ep-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="ep-overlay-card"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <div className="ep-spinner-large" />
              <p>{isNavigating ? 'Redirigiendo a tu perfil...' : 'Guardando cambios...'}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <form className="ep-form" onSubmit={handleSubmit}>
        {/* Header */}
        <motion.div
          className="ep-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <button
            type="button"
            className="ep-back-btn"
            onClick={() => navigate(`/user/${user.username}`)}
            disabled={loading || isNavigating}
          >
            <FaArrowLeft />
          </button>
          <h2>Editar Perfil</h2>
          <div style={{ width: 36 }} />
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div
              className="ep-alert ep-alert-error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div
              className="ep-alert ep-alert-success"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              Perfil actualizado exitosamente!
            </motion.div>
          )}
        </AnimatePresence>

        {/* Informacion Personal */}
        <motion.div
          className="ep-section"
          custom={0}
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
        >
          <div className="ep-section-header">
            <FaUser className="ep-section-icon" />
            <h3>Informacion Personal</h3>
          </div>

          <div className="ep-field">
            <label>Nombre completo</label>
            <div className="ep-input-wrap">
              <FaUser className="ep-input-icon" />
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Tu nombre"
                required
              />
            </div>
          </div>

          <div className="ep-field">
            <label>Email</label>
            <div className="ep-input-wrap">
              <FaEnvelope className="ep-input-icon" />
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="tu@email.com"
              />
            </div>
          </div>

          <div className="ep-field">
            <label>
              <FaPhone style={{ marginRight: 6, fontSize: '0.8rem' }} />
              Telefono
            </label>
            <PhoneInput
              country={'cl'}
              value={form.phone}
              onChange={value => setForm({ ...form, phone: value })}
              inputProps={{ name: 'phone', required: false, autoFocus: false }}
              specialLabel=""
              inputStyle={{ width: '100%', height: 44, borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: '1rem', paddingLeft: 52 }}
              buttonStyle={{ borderRadius: '10px 0 0 10px', border: '1.5px solid #e5e7eb', borderRight: 'none' }}
            />
          </div>

          <div className="ep-field">
            <label>Foto de perfil</label>
            <div className="ep-avatar-row">
              {form.avatar
                ? <img src={form.avatar} alt="avatar" className="ep-avatar-preview" />
                : <div className="ep-avatar-placeholder">
                    <FaCamera />
                  </div>
              }
              <div className="ep-avatar-actions">
                <label className="ep-upload-btn">
                  <FaCamera style={{ marginRight: 6 }} />
                  Subir foto
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
                </label>
                <input
                  name="avatar"
                  type="url"
                  value={form.avatar}
                  onChange={handleChange}
                  placeholder="O pega una URL de imagen"
                  className="ep-url-input"
                />
              </div>
            </div>
          </div>

          <div className="ep-field">
            <label>Biografia</label>
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              placeholder="Cuentanos sobre ti..."
              rows="3"
            />
          </div>
        </motion.div>

        {/* Redes Sociales */}
        <motion.div
          className="ep-section"
          custom={1}
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
        >
          <div className="ep-section-header">
            <FaLink className="ep-section-icon" />
            <h3>Redes Sociales</h3>
          </div>

          <div className="ep-social-grid">
            {SOCIAL_FIELDS.map(({ name, label, icon: Icon, color, placeholder, type, prefix }) => (
              <div key={name} className="ep-field">
                <label>
                  <span className="ep-social-badge" style={{ background: color }}>
                    <Icon />
                  </span>
                  {label}
                </label>
                <div className="ep-input-wrap">
                  {prefix && <span className="ep-input-prefix">{prefix}</span>}
                  <input
                    name={name}
                    value={form[name]}
                    onChange={handleChange}
                    placeholder={placeholder}
                    type={type || 'text'}
                    className={prefix ? 'ep-with-prefix' : ''}
                  />
                </div>
              </div>
            ))}

            <div className="ep-field">
              <label>
                <span className="ep-social-badge" style={{ background: '#25D366' }}>
                  <FaWhatsapp />
                </span>
                WhatsApp
              </label>
              <PhoneInput
                country={'cl'}
                value={form.whatsapp}
                onChange={value => setForm({ ...form, whatsapp: value })}
                inputProps={{ name: 'whatsapp', required: false, autoFocus: false }}
                specialLabel=""
                inputStyle={{ width: '100%', height: 44, borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: '1rem', paddingLeft: 52 }}
                buttonStyle={{ borderRadius: '10px 0 0 10px', border: '1.5px solid #e5e7eb', borderRight: 'none' }}
              />
            </div>
          </div>
        </motion.div>

        {/* Links Personalizados */}
        <motion.div
          className="ep-section"
          custom={2}
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
        >
          <div className="ep-section-header">
            <FaLink className="ep-section-icon" />
            <h3>Links Personalizados</h3>
            <span className="ep-section-hint">Agrega cualquier link con el titulo que quieras</span>
          </div>

          <AnimatePresence>
            {form.links.map((link, index) => (
              <motion.div
                key={index}
                className="ep-link-row"
                variants={linkRowVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                layout
              >
                <div className="ep-link-icon-wrap">
                  <FaLink />
                </div>
                <input
                  value={link.title}
                  onChange={e => updateLink(index, 'title', e.target.value)}
                  placeholder="Titulo (ej: Mi portafolio)"
                  className="ep-link-title"
                />
                <input
                  value={link.url}
                  onChange={e => updateLink(index, 'url', e.target.value)}
                  placeholder="https://..."
                  type="url"
                  className="ep-link-url"
                />
                <motion.button
                  type="button"
                  onClick={() => removeLink(index)}
                  className="ep-remove-link"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Eliminar"
                >
                  <FaTimes />
                </motion.button>
              </motion.div>
            ))}
          </AnimatePresence>

          <motion.button
            type="button"
            onClick={addLink}
            className="ep-add-link"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <FaPlus style={{ marginRight: 8 }} />
            Agregar link
          </motion.button>
        </motion.div>

        {/* Acciones */}
        <motion.div
          className="ep-actions"
          custom={3}
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
        >
          <motion.button
            type="submit"
            className="ep-save-btn"
            disabled={loading || isNavigating}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            {loading ? (
              <>
                <div className="ep-spinner" />
                Guardando...
              </>
            ) : isNavigating ? (
              <>
                <div className="ep-spinner" />
                Redirigiendo...
              </>
            ) : (
              <>
                <FaSave style={{ marginRight: 8 }} />
                Guardar Cambios
              </>
            )}
          </motion.button>

          <motion.button
            type="button"
            className="ep-cancel-btn"
            onClick={() => navigate(`/user/${user.username}`)}
            disabled={loading || isNavigating}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            Cancelar
          </motion.button>
        </motion.div>
      </form>
    </div>
  );
};

export default EditProfile;
