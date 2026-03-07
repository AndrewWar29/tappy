import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaInstagram, FaFacebook, FaLinkedin, FaTwitter,
  FaSpotify, FaYoutube, FaWhatsapp, FaLink, FaPen
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
        <p className="up-username">@{user.username}</p>

        {/* Bio */}
        {user.bio && <p className="up-bio">{user.bio}</p>}

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
            {user.phone && <span className="up-contact-item">+{user.phone}</span>}
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

        <p className="up-date">Miembro desde {new Date(user.createdAt).toLocaleDateString('es-CL', { year: 'numeric', month: 'long' })}</p>
      </motion.div>
    </div>
  );
};

export default UserProfile;
