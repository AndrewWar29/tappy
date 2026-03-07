import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../helpers/apiClient';
import '../styles/ChatBot.css';

const WELCOME_MESSAGE = {
  role: 'assistant',
  content: '¡Hola! Soy el asistente de Tappy. ¿En qué puedo ayudarte hoy?'
};

// Convierte **texto** en <strong>texto</strong> dentro de un string
function parseInline(text) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
}

// Renderiza el contenido de un mensaje del asistente con formato
function renderMessage(content) {
  const lines = content.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Línea vacía → saltar
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Lista numerada: líneas consecutivas que empiezan con "N."
    if (/^\d+\.\s/.test(line.trim())) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        const text = lines[i].trim().replace(/^\d+\.\s/, '');
        items.push(<li key={i}>{parseInline(text)}</li>);
        i++;
      }
      elements.push(<ol key={`ol-${i}`} className="cb-list">{items}</ol>);
      continue;
    }

    // Lista con viñetas: líneas consecutivas que empiezan con "- " o "* "
    if (/^[-*]\s/.test(line.trim())) {
      const items = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) {
        const text = lines[i].trim().replace(/^[-*]\s/, '');
        items.push(<li key={i}>{parseInline(text)}</li>);
        i++;
      }
      elements.push(<ul key={`ul-${i}`} className="cb-list">{items}</ul>);
      continue;
    }

    // Párrafo normal
    elements.push(<p key={i} className="cb-p">{parseInline(line.trim())}</p>);
    i++;
  }

  return elements;
}

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));
      const data = await apiClient.post('/api/chat', { messages: apiMessages });
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Lo siento, ocurrió un error. Por favor intenta de nuevo.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className="cb-window"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="cb-header">
              <div className="cb-header-info">
                <div className="cb-avatar">T</div>
                <div>
                  <div className="cb-header-name">Asistente Tappy</div>
                  <div className="cb-header-status">En línea</div>
                </div>
              </div>
              <button className="cb-close" onClick={() => setOpen(false)} aria-label="Cerrar chat">
                ✕
              </button>
            </div>

            <div className="cb-messages">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`cb-bubble-wrap ${msg.role === 'user' ? 'cb-user' : 'cb-assistant'}`}
                >
                  <div className="cb-bubble">
                    {msg.role === 'assistant' ? renderMessage(msg.content) : msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="cb-bubble-wrap cb-assistant">
                  <div className="cb-bubble cb-typing">
                    <span /><span /><span />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="cb-input-row">
              <input
                ref={inputRef}
                className="cb-input"
                type="text"
                placeholder="Escribe tu pregunta..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <button
                className="cb-send"
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                aria-label="Enviar"
              >
                &#9658;
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        className="cb-fab"
        onClick={() => setOpen(prev => !prev)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Abrir chat"
      >
        {open ? (
          <span className="cb-fab-icon">✕</span>
        ) : (
          <span className="cb-fab-icon">💬</span>
        )}
      </motion.button>
    </>
  );
}
