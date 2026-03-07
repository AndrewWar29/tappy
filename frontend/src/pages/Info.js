import React from 'react';
import { motion } from 'framer-motion';
import {
  FaUserPlus, FaCreditCard, FaBolt,
  FaLeaf, FaPen, FaStar, FaMobileAlt, FaShieldAlt,
  FaIdCard, FaCheckCircle, FaSyncAlt, FaArrowRight
} from 'react-icons/fa';
import '../styles/Info.css';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' }
  })
};

const HOW_STEPS = [
  { icon: FaUserPlus,   color: '#6366f1', bg: '#ede9fe', num: '01', title: 'Crea tu perfil',        desc: 'Registra tu información y personaliza tu perfil digital con redes, links y más.' },
  { icon: FaCreditCard, color: '#8b5cf6', bg: '#f3e8ff', num: '02', title: 'Compra tu tarjeta',     desc: 'Ordena tu tarjeta NFC personalizada. Ya viene vinculada a tu cuenta.' },
  { icon: FaBolt,       color: '#a855f7', bg: '#fae8ff', num: '03', title: 'Comparte al instante',  desc: 'Acerca tu tarjeta a cualquier teléfono y comparte tu información en segundos.' },
];

const ACCOUNT_STEPS = [
  { icon: FaUserPlus,  color: '#6366f1', title: 'Creas tu cuenta y completas tu perfil',    desc: 'Nombre, redes sociales, teléfono, lo que quieras mostrar.' },
  { icon: FaIdCard,    color: '#8b5cf6', title: 'Recibes tu tarjeta física',                 desc: 'Ya viene vinculada a tu cuenta. Sin configuración extra.' },
  { icon: FaSyncAlt,   color: '#a855f7', title: 'Actualizas tu info cuando quieras',         desc: 'Los cambios se reflejan al instante en tu tarjeta desde cualquier dispositivo.' },
];

const VENTAJAS = [
  { icon: FaLeaf,      color: '#10b981', bg: '#d1fae5', title: 'Ecológico',     desc: 'Sin papel, sin residuos.' },
  { icon: FaPen,       color: '#6366f1', bg: '#ede9fe', title: 'Actualizable',  desc: 'Edita tu info cuando quieras.' },
  { icon: FaStar,      color: '#f59e0b', bg: '#fef3c7', title: 'Profesional',   desc: 'Primera impresión impecable.' },
  { icon: FaMobileAlt, color: '#3b82f6', bg: '#dbeafe', title: 'Compatible',    desc: 'Funciona en todos los smartphones.' },
  { icon: FaShieldAlt, color: '#8b5cf6', bg: '#f3e8ff', title: 'Duradero',      desc: 'Resistente al agua y uso diario.' },
  { icon: FaCheckCircle, color: '#14b8a6', bg: '#ccfbf1', title: 'Sin app',     desc: 'El receptor no necesita instalar nada.' },
];

const Info = () => {
  return (
    <div className="info-container">

      {/* HERO */}
      <div className="info-hero">
        <motion.div
          className="info-hero-badge"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <FaIdCard style={{ marginRight: 6 }} /> Tarjetas NFC inteligentes
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          La nueva forma de<br />
          <span className="info-hero-highlight">compartir quién eres</span>
        </motion.h1>

        <motion.p
          className="info-hero-sub"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Un toque. Tu perfil completo. Sin papel, sin fricción.
        </motion.p>
      </div>

      <div className="info-content">

        {/* QUE ES */}
        <motion.section
          className="info-card"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <div className="info-card-label">
            <FaIdCard /> Sobre Tappy
          </div>
          <h2>¿Qué es Tappy?</h2>
          <p>
            Tappy combina una <strong>tarjeta NFC física</strong> con un <strong>perfil digital</strong> que tú controlas.
            Comparte tu contacto, redes sociales y links favoritos de forma instantánea —
            solo acercando tu tarjeta a cualquier teléfono.
          </p>
        </motion.section>

        {/* COMO FUNCIONA */}
        <motion.section
          className="info-card"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <div className="info-card-label">
            <FaBolt /> Proceso
          </div>
          <h2>¿Cómo funciona?</h2>
          <div className="info-steps">
            {HOW_STEPS.map((step, i) => (
              <React.Fragment key={step.num}>
                <motion.div
                  className="info-step"
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                >
                  <div className="info-step-icon-wrap" style={{ background: step.bg, color: step.color }}>
                    <step.icon />
                  </div>
                  <div className="info-step-num" style={{ color: step.color }}>{step.num}</div>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </motion.div>
                {i < HOW_STEPS.length - 1 && (
                  <div className="info-step-arrow">
                    <FaArrowRight />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </motion.section>

        {/* POR QUE CUENTA */}
        <motion.section
          className="info-card info-card-accent"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <div className="info-card-label">
            <FaUserPlus /> Cuenta
          </div>
          <h2>¿Por qué necesito una cuenta?</h2>
          <p className="info-accent-intro">
            Tu cuenta Tappy <strong>es tu tarjeta</strong>. No son dos cosas separadas.
          </p>

          <div className="info-timeline">
            {ACCOUNT_STEPS.map((step, i) => (
              <motion.div
                key={i}
                className="info-timeline-item"
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <div className="info-timeline-dot" style={{ background: step.color }}>
                  <step.icon />
                </div>
                {i < ACCOUNT_STEPS.length - 1 && <div className="info-timeline-line" />}
                <div className="info-timeline-body">
                  <strong>{step.title}</strong>
                  <p>{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="info-tip">
            No necesitas reemplazar tu tarjeta si cambias de trabajo, numero o redes. Solo edita tu perfil y listo.
          </div>
        </motion.section>

        {/* VENTAJAS */}
        <motion.section
          className="info-card"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <div className="info-card-label">
            <FaStar /> Beneficios
          </div>
          <h2>Ventajas</h2>
          <div className="info-ventajas">
            {VENTAJAS.map((v, i) => (
              <motion.div
                key={v.title}
                className="info-ventaja"
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                <div className="info-ventaja-icon" style={{ background: v.bg, color: v.color }}>
                  <v.icon />
                </div>
                <h4>{v.title}</h4>
                <p>{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

      </div>
    </div>
  );
};

export default Info;
