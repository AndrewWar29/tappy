import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaInstagram, FaFacebook, FaLinkedin, FaTwitter,
  FaSpotify, FaYoutube, FaWhatsapp, FaLink, FaPen,
  FaMapMarkerAlt, FaGlobe, FaBuilding, FaFileAlt
} from 'react-icons/fa';
import { FaTiktok } from 'react-icons/fa6';
import { useAuth } from '../helpers/AuthContext';
import '../styles/UserProfile.css';
import { api } from '../helpers/apiConfig';

const SOCIAL_CONFIG = {
  instagram: { icon: FaInstagram, color: '#E1306C', label: 'Instagram', href: u => `https://instagram.com/${u}` },
  facebook:  { icon: FaFacebook,  color: '#1877F2', label: 'Facebook',  href: u => u },
  linkedin:  { icon: FaLinkedin,  color: '#0A66C2', label: 'LinkedIn',  href: u => u },
  twitter:   { icon: FaTwitter,   color: '#1DA1F2', label: 'Twitter',   href: u => `https://twitter.com/${u}` },
  spotify:   { icon: FaSpotify,   color: '#1DB954', label: 'Spotify',   href: u => `https://open.spotify.com/user/${u}` },
  youtube:   { icon: FaYoutube,   color: '#FF0000', label: 'YouTube',   href: u => `https://youtube.com/@${u}` },
  tiktok:    { icon: FaTiktok,    color: '#010101', label: 'TikTok',    href: u => `https://tiktok.com/@${u}` },
  whatsapp:  { icon: FaWhatsapp,  color: '#25D366', label: 'WhatsApp',  href: u => `https://wa.me/${u}` },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } }
};

const stagger = {
  visible: { transition: { staggerChildren: 0.07 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

const formatPhone = (phone) => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  // Chile: 56 + 9 + 8 dígitos = 11 dígitos → +56 9 XXXX XXXX
  if (digits.startsWith('56') && digits.length === 11) {
    return `+56 ${digits[2]} ${digits.slice(3, 7)} ${digits.slice(7)}`;
  }
  // Chile sin código país: 9 + 8 dígitos = 9 dígitos → +56 9 XXXX XXXX
  if (digits.startsWith('9') && digits.length === 9) {
    return `+56 ${digits[0]} ${digits.slice(1, 5)} ${digits.slice(5)}`;
  }
  return `+${digits}`;
};

const UserProfile = () => {
  const { username } = useParams();
  const location = useLocation();
  const { user: currentUser, isAuthenticated } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isOwner = isAuthenticated && currentUser && currentUser.username === username;

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(api(`/api/users/${username}`));
        if (!res.ok) throw new Error('Usuario no encontrado');
        const data = await res.json();
        setUser(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    fetchUser();
  }, [username, location.key]);

  if (loading) return (
    <div className="up-loading">
      <div className="up-spinner" />
    </div>
  );

  if (error) return (
    <div className="up-loading">
      <p style={{ color: '#ef4444' }}>{error}</p>
    </div>
  );

  if (!user) return null;

  const activeSocials = Object.entries(SOCIAL_CONFIG).filter(
    ([key]) => user.social?.[key]
  );

  return (
    <div className="up-container">
      <motion.div
        className="up-card"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Avatar */}
        <div className="up-avatar-wrap">
          {user.avatar
            ? <img src={user.avatar} alt={user.name} className="up-avatar-img" />
            : <div className="up-avatar-initial">
                {user.name?.charAt(0).toUpperCase()}
              </div>
          }
        </div>

        {/* Nombre */}
        <h2 className="up-name">{user.name}</h2>

        {/* Cargo + Empresa */}
        {(user.job_title || user.company) && (
          <p className="up-headline">
            {user.job_title}
            {user.job_title && user.company && <span className="up-headline-sep"> @ </span>}
            {user.company && <span className="up-headline-company"><FaBuilding style={{ marginRight: 4, fontSize: '0.75rem' }} />{user.company}</span>}
          </p>
        )}

        <p className="up-username">@{user.username}</p>

        {/* Badges: ubicacion + disponibilidad */}
        <div className="up-badges">
          {user.location && (
            <span className="up-badge up-badge--location">
              <FaMapMarkerAlt /> {user.location}
            </span>
          )}
          {user.availability && user.availability !== 'available' ? (
            <span className={`up-badge up-badge--avail up-badge--avail-${user.availability}`}>
              <span className="up-avail-dot" />
              {{ busy: 'Ocupado', unavailable: 'No disponible' }[user.availability]}
            </span>
          ) : user.availability === 'available' ? (
            <span className="up-badge up-badge--avail up-badge--avail-available">
              <span className="up-avail-dot" />
              Disponible
            </span>
          ) : null}
        </div>

        {/* Bio */}
        {user.bio && <p className="up-bio">{user.bio}</p>}

        {/* Sitio web */}
        {user.website && (
          <motion.a
            href={user.website}
            target="_blank"
            rel="noopener noreferrer"
            className="up-website"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <FaGlobe /> {user.website.replace(/^https?:\/\//, '')}
          </motion.a>
        )}

        {/* Boton editar */}
        {isOwner && (
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Link to="/edit-profile" className="up-edit-btn">
              <FaPen style={{ marginRight: 6, fontSize: '0.85rem' }} />
              Editar Perfil
            </Link>
          </motion.div>
        )}

        {/* Info contacto */}
        {(user.email || user.phone) && (
          <div className="up-contact">
            {user.email && <span className="up-contact-item">{user.email}</span>}
            {user.phone && <span className="up-contact-item">{formatPhone(user.phone)}</span>}
          </div>
        )}

        {/* Redes Sociales */}
        {activeSocials.length > 0 && (
          <motion.div
            className="up-socials"
            variants={stagger}
            initial="hidden"
            animate="visible"
          >
            {activeSocials.map(([key, config]) => {
              const Icon = config.icon;
              const value = user.social[key];
              return (
                <motion.a
                  key={key}
                  href={config.href(value)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="up-social-btn"
                  style={{ '--social-color': config.color }}
                  variants={itemVariants}
                  whileHover={{ scale: 1.08, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  title={config.label}
                >
                  <Icon />
                </motion.a>
              );
            })}
          </motion.div>
        )}

        {/* Links personalizados */}
        <AnimatePresence>
          {user.links && user.links.length > 0 && (
            <motion.div
              className="up-links"
              variants={stagger}
              initial="hidden"
              animate="visible"
            >
              {user.links.map((link, i) => (
                <motion.a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="up-link-card"
                  variants={itemVariants}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FaLink className="up-link-icon" />
                  <span>{link.title}</span>
                  <svg className="up-link-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 17L17 7M17 7H7M17 7v10" />
                  </svg>
                </motion.a>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Servicios */}
        {user.services && user.services.length > 0 && (
          <div className="up-tags-section">
            <p className="up-tags-label">Servicios</p>
            <div className="up-tags">
              {user.services.map((s, i) => (
                <span key={i} className="up-tag up-tag--service">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Idiomas */}
        {user.languages && user.languages.length > 0 && (
          <div className="up-tags-section">
            <p className="up-tags-label">Idiomas</p>
            <div className="up-tags">
              {user.languages.map((l, i) => (
                <span key={i} className="up-tag up-tag--language">{l}</span>
              ))}
            </div>
          </div>
        )}

        {/* Documento */}
        {user.document && (
          <motion.a
            href={user.document}
            target="_blank"
            rel="noopener noreferrer"
            className="up-link-card up-doc-card"
            variants={itemVariants}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <FaFileAlt className="up-link-icon" />
            <span>{user.documentName || 'Ver documento'}</span>
            <svg className="up-link-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 17L17 7M17 7H7M17 7v10" />
            </svg>
          </motion.a>
        )}

        <p className="up-date">Miembro desde {new Date(user.createdAt).toLocaleDateString('es-CL', { year: 'numeric', month: 'long' })}</p>
      </motion.div>
    </div>
  );
};

export default UserProfile;
