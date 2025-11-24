import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './helpers/AuthContext';
import Navbar from './components/Navbar';
import UserProfile from './pages/UserProfile';
import Register from './pages/Register';
import Home from './pages/Home';
import Productos from './pages/Productos';
import Info from './pages/Info';
import Login from './pages/Login';
import Cuenta from './pages/Cuenta';
import EditProfile from './pages/EditProfile';

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
