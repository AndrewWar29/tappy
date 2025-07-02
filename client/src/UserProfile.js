import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import './UserProfile.css';

const UserProfile = () => {
  const { username } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:3001/api/users/${username}`)
      .then(res => {
        if (!res.ok) throw new Error('Usuario no encontrado');
        return res.json();
      })
      .then(data => {
        setUser(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [username]);

  if (loading) return <div className="user-profile-loading">Cargando...</div>;
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
        <div className="user-profile-info">
          {user.email && <p><strong>Email:</strong> {user.email}</p>}
          {user.whatsapp && <p><strong>WhatsApp:</strong> {user.whatsapp}</p>}
        </div>
        <div className="user-profile-social">
          {user.social?.instagram && (
            <a href={`https://instagram.com/${user.social.instagram}`} target="_blank" rel="noopener noreferrer">Instagram</a>
          )}
          {user.social?.facebook && (
            <a href={`https://facebook.com/${user.social.facebook}`} target="_blank" rel="noopener noreferrer">Facebook</a>
          )}
          {user.social?.linkedin && (
            <a href={`https://linkedin.com/in/${user.social.linkedin}`} target="_blank" rel="noopener noreferrer">LinkedIn</a>
          )}
          {user.social?.twitter && (
            <a href={`https://twitter.com/${user.social.twitter}`} target="_blank" rel="noopener noreferrer">Twitter</a>
          )}
        </div>
        <p className="user-profile-date">Miembro desde: {new Date(user.createdAt).toLocaleDateString()}</p>
      </div>
    </div>
  );
};

export default UserProfile;
