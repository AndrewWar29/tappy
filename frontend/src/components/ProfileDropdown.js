import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCog, FaUser, FaSignOutAlt, FaChevronRight } from 'react-icons/fa';
import { useAuth } from '../helpers/AuthContext';
import '../styles/ProfileDropdown.css';

const menuItems = [
  { icon: FaCog,  label: 'Cuenta',       path: '/cuenta',        color: '#6366f1' },
  { icon: FaUser, label: 'Perfil Tappy', path: null,             color: '#8b5cf6' },
];

const ProfileDropdown = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const handleNavigation = (path) => {
    navigate(path || `/user/${user?.username}`);
    onClose();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="pd-dropdown"
          ref={dropdownRef}
          initial={{ opacity: 0, scale: 0.93, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: -10 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {/* Header */}
          <div className="pd-header">
            <div className="pd-avatar">
              {user?.avatar
                ? <img src={user.avatar} alt={user.name} className="pd-avatar-img" />
                : <span>{user?.name?.charAt(0).toUpperCase() || 'U'}</span>
              }
            </div>
            <div className="pd-user-info">
              <p className="pd-name">{user?.name || 'Usuario'}</p>
              <p className="pd-username">@{user?.username || ''}</p>
              <p className="pd-email">{user?.email || ''}</p>
            </div>
          </div>

          {/* Menu */}
          <div className="pd-menu">
            {menuItems.map(({ icon: Icon, label, path, color }) => (
              <motion.button
                key={label}
                className="pd-item"
                onClick={() => handleNavigation(path)}
                whileHover={{ x: 3 }}
                transition={{ duration: 0.15 }}
              >
                <span className="pd-item-icon" style={{ background: `${color}18`, color }}>
                  <Icon />
                </span>
                <span className="pd-item-label">{label}</span>
                <FaChevronRight className="pd-item-arrow" />
              </motion.button>
            ))}

            <div className="pd-divider" />

            <motion.button
              className="pd-item pd-logout"
              onClick={handleLogout}
              whileHover={{ x: 3 }}
              transition={{ duration: 0.15 }}
            >
              <span className="pd-item-icon" style={{ background: '#fee2e2', color: '#ef4444' }}>
                <FaSignOutAlt />
              </span>
              <span className="pd-item-label">Cerrar Sesion</span>
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProfileDropdown;
