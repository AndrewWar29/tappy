import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../helpers/AuthContext';
import '../styles/UserProfile.css';

import { api } from '../helpers/apiConfig';

const UserProfile = () => {
  const { username } = useParams();
  const location = useLocation();
  const { user: currentUser, isAuthenticated } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Verificar si el usuario actual es el dueño del perfil
  const isOwner = isAuthenticated && currentUser && currentUser.username === username;

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(api(`/api/users/${username}`));
        if (!res.ok) throw new Error('Usuario no encontrado');
        const data = await res.json();
        console.log('Perfil cargado:', data); // Debug
        setUser(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchUser();
  }, [username, location.key]); // Se ejecuta cada vez que cambia el username o la key de location

  if (loading) return (
    <div className="user-profile-loading">
      <div className="user-profile-spinner" />
    </div>
  );
  if (error) return <div className="user-profile-error">{error}</div>;
  if (!user) return null;

  return (
    <div className="user-profile-container">
      <div className="user-profile-card">
        <div className="user-profile-avatar">
          <span>{user.name?.charAt(0).toUpperCase()}</span>
        </div>
        <h2 className="user-profile-name">{user.name}</h2>
        <p className="user-profile-username">@{user.username}</p>

        {/* Botón de editar solo para el dueño del perfil */}
        {isOwner && (
          <div className="user-profile-edit">
            <Link to="/edit-profile" className="edit-profile-btn">
              ✏️ Editar Perfil
            </Link>
          </div>
        )}

        <div className="user-profile-info">
          {user.email && <p><strong>Email:</strong> {user.email}</p>}
          {user.phone && <p><strong>Teléfono:</strong> {user.phone}</p>}
          {user.bio && <p><strong>Bio:</strong> {user.bio}</p>}
        </div>
        <div className="user-profile-social">
          {user.social?.instagram && (
            <a href={`https://instagram.com/${user.social.instagram}`} target="_blank" rel="noopener noreferrer">📷 Instagram</a>
          )}
          {user.social?.facebook && (
            <a href={`https://facebook.com/${user.social.facebook}`} target="_blank" rel="noopener noreferrer">📘 Facebook</a>
          )}
          {user.social?.linkedin && (
            <a href={`https://linkedin.com/in/${user.social.linkedin}`} target="_blank" rel="noopener noreferrer">💼 LinkedIn</a>
          )}
          {user.social?.twitter && (
            <a href={`https://twitter.com/${user.social.twitter}`} target="_blank" rel="noopener noreferrer">🐦 Twitter</a>
          )}
          {user.social?.spotify && (
            <a href={`https://open.spotify.com/user/${user.social.spotify}`} target="_blank" rel="noopener noreferrer">🎵 Spotify</a>
          )}
          {user.social?.youtube && (
            <a href={`https://youtube.com/@${user.social.youtube}`} target="_blank" rel="noopener noreferrer">📺 YouTube</a>
          )}
          {user.social?.tiktok && (
            <a href={`https://tiktok.com/@${user.social.tiktok}`} target="_blank" rel="noopener noreferrer">📱 TikTok</a>
          )}
          {user.social?.whatsapp && (
            <a href={`https://wa.me/${user.social.whatsapp}`} target="_blank" rel="noopener noreferrer">💬 WhatsApp</a>
          )}
        </div>
        <p className="user-profile-date">Miembro desde: {new Date(user.createdAt).toLocaleDateString()}</p>
      </div>
    </div>
  );
};

export default UserProfile;

