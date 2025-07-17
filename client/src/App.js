import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Navbar from './Navbar';
import UserProfile from './UserProfile';
import Register from './Register';
import Home from './Home';
import Productos from './Productos';
import Info from './Info';
import Login from './Login';
import Cuenta from './Cuenta';
import EditProfile from './EditProfile';

// Componente para proteger la ruta de edición
const ProtectedEditProfile = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <EditProfile /> : <Login />;
};

// Componente para manejar la ruta /cuenta
const CuentaRoute = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Cuenta /> : <Login />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/user/:username" element={<UserProfile />} />
          <Route path="/register" element={<Register />} />
          <Route path="/productos" element={<Productos />} />
          <Route path="/info" element={<Info />} />
          <Route path="/cuenta" element={<CuentaRoute />} />
          <Route path="/edit-profile" element={<ProtectedEditProfile />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
