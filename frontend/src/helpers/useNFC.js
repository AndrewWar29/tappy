import { useState, useCallback } from 'react';

export const useNFC = () => {
  const [nfcStatus, setNfcStatus] = useState('idle'); // idle, writing, success, error
  const [nfcMessage, setNfcMessage] = useState('');

  const isNFCSupported = useCallback(() => {
    return 'NDEFReader' in window;
  }, []);

  const writeToNFC = useCallback(async (url) => {
    if (!isNFCSupported()) {
      setNfcStatus('error');
      setNfcMessage('Tu navegador no soporta NFC. Usa Chrome en Android.');
      return;
    }

    setNfcStatus('writing');
    setNfcMessage('Acerca tu teléfono a una etiqueta NFC...');

    try {
      // eslint-disable-next-line no-undef
      const ndef = new NDEFReader();

      await ndef.write({
        records: [{
          recordType: 'url',
          data: url
        }]
      });

      setNfcStatus('success');
      setNfcMessage('✅ Perfil escrito en la etiqueta NFC');

      setTimeout(() => {
        setNfcStatus('idle');
        setNfcMessage('');
      }, 3000);
    } catch (error) {
      setNfcStatus('error');

      if (error.name === 'NotAllowedError') {
        setNfcMessage('❌ Permiso denegado. Intenta nuevamente.');
      } else if (error.name === 'NotSupportedError') {
        setNfcMessage('❌ Tu dispositivo no soporta NFC.');
      } else if (error.name === 'AbortError') {
        setNfcMessage('❌ Operación cancelada.');
        setNfcStatus('idle');
      } else {
        setNfcMessage(`❌ Error: ${error.message}`);
      }

      setTimeout(() => {
        setNfcStatus('idle');
        setNfcMessage('');
      }, 4000);
    }
  }, [isNFCSupported]);

  return {
    isNFCSupported: isNFCSupported(),
    writeToNFC,
    nfcStatus,
    nfcMessage
  };
};
