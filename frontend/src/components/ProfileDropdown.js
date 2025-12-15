import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../helpers/AuthContext';
import '../styles/ProfileDropdown.css';

const ProfileDropdown = ({ isOpen, onClose }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const dropdownRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    const handleNavigation = (path) => {
        navigate(path);
        onClose();
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="profile-dropdown" ref={dropdownRef}>
            <div className="profile-dropdown-header">
                <div className="profile-avatar-large">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="profile-user-info">
                    <div className="profile-user-name">{user?.name || 'Usuario'}</div>
                    <div className="profile-user-email">{user?.email || ''}</div>
                </div>
            </div>

            <div className="profile-dropdown-menu">
                <button
                    className="profile-menu-item"
                    onClick={() => handleNavigation('/cuenta')}
                >
                    <span className="menu-icon">⚙️</span>
                    <span>Cuenta</span>
                </button>

                <button
                    className="profile-menu-item"
                    onClick={() => handleNavigation(`/user/${user?.username}`)}
                >
                    <span className="menu-icon">👤</span>
                    <span>Perfil Tappy</span>
                </button>

                <div className="profile-menu-divider"></div>

                <button
                    className="profile-menu-item logout"
                    onClick={handleLogout}
                >
                    <span className="menu-icon">🚪</span>
                    <span>Cerrar Sesión</span>
                </button>
            </div>
        </div>
    );
};

export default ProfileDropdown;
