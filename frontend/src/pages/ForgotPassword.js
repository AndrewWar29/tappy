import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/ForgotPassword.css';
import { api } from '../helpers/apiConfig';

const ForgotPassword = () => {
    const [step, setStep] = useState(1); // 1: email, 2: code, 3: new password
    const [email, setEmail] = useState('');
    const [code, setCode] = useState(['', '', '', '']);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Step 1: Request reset code
    const handleRequestCode = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const url = api('/api/users/forgot-password');
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(data.msg || data.detail || 'Error al enviar código');
            }

            setStep(2); // Move to code entry step
        } catch (err) {
            console.error('Error en forgot-password:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Step 2 & 3: Validate code and reset password
    const handleResetPassword = async (e) => {
        e.preventDefault();

        // Validate passwords match
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setLoading(true);
        setError(null);

        const fullCode = code.join('');

        try {
            const url = api('/api/users/reset-password');
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    code: fullCode,
                    newPassword: password
                })
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(data.msg || data.detail || 'Error al cambiar contraseña');
            }

            // Success - redirect to login
            navigate('/login', { state: { message: '¡Contraseña cambiada exitosamente! Inicia sesión con tu nueva contraseña.' } });
        } catch (err) {
            console.error('Error en reset-password:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Code input handlers (reused from VerifyEmail)
    const handleCodeChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;

        const newCode = [...code];
        newCode[index] = value.slice(-1);
        setCode(newCode);

        if (value && index < 3) {
            const nextInput = document.getElementById(`reset-code-${index + 1}`);
            if (nextInput) nextInput.focus();
        }

        // Auto-submit when all 4 digits are entered
        if (index === 3 && value) {
            const fullCode = [...newCode.slice(0, 3), value].join('');
            if (fullCode.length === 4) {
                setStep(3); // Move to password step
            }
        }
    };

    const handleCodeKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            const prevInput = document.getElementById(`reset-code-${index - 1}`);
            if (prevInput) prevInput.focus();
        }
    };

    const handleCodePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 4);
        if (!/^\d+$/.test(pastedData)) return;

        const newCode = pastedData.split('');
        while (newCode.length < 4) newCode.push('');
        setCode(newCode);

        if (pastedData.length === 4) {
            setTimeout(() => setStep(3), 300); // Move to password step
        }
    };

    return (
        <div className="forgot-password-container">
            <div className="forgot-password-card">

                {/* Step 1: Enter Email */}
                {step === 1 && (
                    <>
                        <h2>¿Olvidaste tu contraseña?</h2>
                        <p className="forgot-subtitle">
                            Ingresa tu correo electrónico y te enviaremos un código de verificación.
                        </p>

                        {error && <div className="forgot-error">{error}</div>}

                        <form onSubmit={handleRequestCode}>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Correo electrónico"
                                required
                                autoFocus
                            />

                            <button type="submit" disabled={loading}>
                                {loading ? 'Enviando...' : 'Enviar código'}
                            </button>
                        </form>

                        <p className="forgot-footer">
                            <Link to="/login">Volver al inicio de sesión</Link>
                        </p>
                    </>
                )}

                {/* Step 2: Enter Code */}
                {step === 2 && (
                    <>
                        <h2>Ingresa el código</h2>
                        <p className="forgot-subtitle">
                            Hemos enviado un código de 4 dígitos a <strong>{email}</strong>
                        </p>

                        {error && <div className="forgot-error">{error}</div>}

                        <form onSubmit={(e) => { e.preventDefault(); setStep(3); }}>
                            <div className="code-inputs">
                                {code.map((digit, index) => (
                                    <input
                                        key={index}
                                        id={`reset-code-${index}`}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength="1"
                                        value={digit}
                                        onChange={(e) => handleCodeChange(index, e.target.value)}
                                        onKeyDown={(e) => handleCodeKeyDown(index, e)}
                                        onPaste={index === 0 ? handleCodePaste : undefined}
                                        className="code-input"
                                        autoFocus={index === 0}
                                    />
                                ))}
                            </div>

                            <button
                                type="submit"
                                disabled={code.join('').length !== 4}
                            >
                                Continuar
                            </button>
                        </form>
                    </>
                )}

                {/* Step 3: Enter New Password */}
                {step === 3 && (
                    <>
                        <h2>Nueva contraseña</h2>
                        <p className="forgot-subtitle">
                            Ingresa tu nueva contraseña
                        </p>

                        {error && <div className="forgot-error">{error}</div>}

                        <form onSubmit={handleResetPassword}>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Nueva contraseña"
                                required
                                autoFocus
                                minLength="6"
                            />

                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirmar contraseña"
                                required
                                minLength="6"
                            />

                            <button type="submit" disabled={loading}>
                                {loading ? 'Cambiando...' : 'Cambiar contraseña'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;
