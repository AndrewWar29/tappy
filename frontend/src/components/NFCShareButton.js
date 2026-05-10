import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNFC } from '../helpers/useNFC';
import '../styles/NFCShareButton.css';

const NFCShareButton = ({ profileUrl, username }) => {
  const { isNFCSupported, writeToNFC, nfcStatus, nfcMessage } = useNFC();
  const isDebugMode = new URLSearchParams(window.location.search).get('nfc-debug') === '1';

  if (!isNFCSupported) {
    return null;
  }

  const isLoading = nfcStatus === 'writing';
  const isSuccess = nfcStatus === 'success';

  return (
    <div className="nfc-button-wrapper">
      {isDebugMode && (
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', textAlign: 'center' }}>
          🔧 Modo Demo (NFC no disponible en desktop)
        </div>
      )}
      <motion.button
        className={`nfc-share-btn nfc-status--${nfcStatus}`}
        onClick={() => writeToNFC(profileUrl)}
        disabled={isLoading}
        whileHover={!isLoading ? { scale: 1.04 } : {}}
        whileTap={!isLoading ? { scale: 0.97 } : {}}
      >
        {isLoading ? (
          <>
            <span className="nfc-spinner" />
            Escribiendo...
          </>
        ) : isSuccess ? (
          <>
            <span>✅</span>
            ¡Listo!
          </>
        ) : (
          <>
            <span className="nfc-icon">📡</span>
            Compartir por NFC
          </>
        )}
      </motion.button>

      <AnimatePresence>
        {nfcMessage && (
          <motion.div
            className={`nfc-message nfc-message--${nfcStatus}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {nfcMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NFCShareButton;
