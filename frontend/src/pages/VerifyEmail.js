import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../helpers/AuthContext';
import '../styles/VerifyEmail.css';
import { api } from '../helpers/apiConfig';

const VerifyEmail = () => {
    const [code, setCode] = useState(['', '', '', '']);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Get email from navigation state
    const email = location.state?.email;

    // If no email, redirect to register
    React.useEffect(() => {
        if (!email) {
            navigate('/register');
        }
    }, [email, navigate]);

    const handleChange = (index, value) => {
        // Only allow numbers
        if (!/^\d*$/.test(value)) return;

        const newCode = [...code];
        newCode[index] = value.slice(-1); // Only take last character
        setCode(newCode);

        // Auto-focus next input
        if (value && index < 3) {
            const nextInput = document.getElementById(`code-${index + 1}`);
            if (nextInput) nextInput.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        // Backspace: clear current and focus previous
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            const prevInput = document.getElementById(`code-${index - 1}`);
            if (prevInput) prevInput.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 4);
        if (!/^\d+$/.test(pastedData)) return;

        const newCode = pastedData.split('');
        while (newCode.length < 4) newCode.push('');
        setCode(newCode);

        // Focus last input
        const lastInput = document.getElementById('code-3');
        if (lastInput) lastInput.focus();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const fullCode = code.join('');

        if (fullCode.length !== 4) {
            setError('Por favor ingresa el código completo');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const url = api('/api/users/verify');
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code: fullCode })
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(data.msg || data.detail || 'Error al verificar el código');
            }

            // Login with the returned token
            if (data.token && data.user) {
                login(data.token, data.user);
                navigate('/cuenta');
            } else {
                throw new Error('Verificación exitosa pero sin token');
            }
        } catch (err) {
            console.error('Error en verificación:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!email) return null;

    return (
        <div className="verify-container">
            <div className="verify-card">
                <h2>Verifica tu correo</h2>
                <p className="verify-subtitle">
                    Hemos enviado un código de 4 dígitos a <strong>{email}</strong>
                </p>

                {error && <div className="verify-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="code-inputs">
                        {code.map((digit, index) => (
                            <input
                                key={index}
                                id={`code-${index}`}
                                type="text"
                                inputMode="numeric"
                                maxLength="1"
                                value={digit}
                                onChange={(e) => handleChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                onPaste={index === 0 ? handlePaste : undefined}
                                className="code-input"
                                autoFocus={index === 0}
                            />
                        ))}
                    </div>

                    <button type="submit" disabled={loading} className="verify-button">
                        {loading ? 'Verificando...' : 'Verificar'}
                    </button>
                </form>

                <p className="verify-footer">
                    ¿No recibiste el código? <button className="resend-button">Reenviar</button>
                </p>
            </div>
        </div>
    );
};

export default VerifyEmail;
