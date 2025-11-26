import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};

/**
 * Decodifica un JWT sin verificar la firma (solo para leer el payload)
 */
const decodeToken = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Error decodificando token:', e);
    return null;
  }
};

/**
 * Verifica si un token JWT ha expirado
 */
const isTokenExpired = (token) => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return true;
  }

  // exp está en segundos, Date.now() en milisegundos
  const expirationTime = decoded.exp * 1000;
  const currentTime = Date.now();

  return currentTime >= expirationTime;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Verificar si hay un token guardado al cargar la app
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      // Verificar si el token ha expirado
      if (isTokenExpired(token)) {
        console.warn('[Auth] Token expirado, limpiando sesión');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      } else {
        try {
          setUser(JSON.parse(userData));
          console.log('[Auth] Sesión restaurada');
        } catch (e) {
          console.error('[Auth] Error parseando datos de usuario:', e);
          localStorage.removeItem('user');
        }
      }
    }

    setLoading(false);
  }, []);

  const login = (token, userData) => {
    console.log('[Auth] Login exitoso');
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    console.log('[Auth] Logout');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  /**
   * Actualiza los datos del usuario en el contexto y localStorage
   * Útil después de editar el perfil
   */
  const updateUser = (updatedUserData) => {
    console.log('[Auth] Actualizando datos de usuario');
    const newUserData = { ...user, ...updatedUserData };
    localStorage.setItem('user', JSON.stringify(newUserData));
    setUser(newUserData);
  };

  /**
   * Verifica si la sesión actual es válida
   */
  const checkAuthStatus = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      return false;
    }

    if (isTokenExpired(token)) {
      console.warn('[Auth] Token expirado');
      logout();
      return false;
    }

    return true;
  };

  const isAuthenticated = !!user;

  const value = {
    user,
    login,
    logout,
    updateUser,
    checkAuthStatus,
    isAuthenticated,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
