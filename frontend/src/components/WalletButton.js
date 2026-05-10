import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaAddressCard } from 'react-icons/fa';
import { api } from '../helpers/apiConfig';
import '../styles/WalletButton.css';

const WalletButton = ({ user }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error

  const handleDownload = async () => {
    setIsLoading(true);
    setStatus('loading');
    setMessage('Generando pase...');

    try {
      const response = await fetch(api(`/api/users/${user.username}/wallet-pass`), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();

      // Determine filename based on content type
      let filename = `${user.username}.pkpass`;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('pkpass')) {
        filename = `${user.username}.pkpass`;
      } else if (contentType && contentType.includes('json')) {
        filename = `${user.username}.json`;
      }

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatus('success');
      setMessage('✅ Pase descargado correctamente');
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error downloading wallet pass:', error);
      setStatus('error');
      setMessage(`❌ Error: ${error.message}`);
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 4000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="wallet-button-wrapper">
      <motion.button
        className={`wallet-btn wallet-status--${status}`}
        onClick={handleDownload}
        disabled={isLoading}
        whileHover={!isLoading ? { scale: 1.04 } : {}}
        whileTap={!isLoading ? { scale: 0.97 } : {}}
      >
        {isLoading ? (
          <>
            <span className="wallet-spinner" />
            Generando...
          </>
        ) : status === 'success' ? (
          <>
            <span>✅</span>
            Listo
          </>
        ) : (
          <>
            <FaAddressCard className="wallet-icon" />
            Descargar Contacto
          </>
        )}
      </motion.button>

      <AnimatePresence>
        {message && (
          <motion.div
            className={`wallet-message wallet-message--${status}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WalletButton;
