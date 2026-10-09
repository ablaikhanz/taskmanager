import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, UserPlus, LogIn, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function Auth({ onAuthSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // Вход / Регистрация через Google OAuth
  const handleGoogleAuth = async () => {
    try {
      setGoogleLoading(true);
      setError(null);
      setMessage(null);

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (oauthError) throw oauthError;
    } catch (err) {
      console.error('Ошибка Google Auth:', err);
      setError(err.message || 'Не удалось выполнить вход через Google');
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setError('Пожалуйста, заполните email и пароль');
      return;
    }

    if (cleanPassword.length < 6) {
      setError('Пароль должен содержать не менее 6 символов');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        // Регистрация нового пользователя
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
        });

        if (signUpError) throw signUpError;

        if (data?.user && !data?.session) {
          setMessage('Регистрация прошла успешно! На вашу почту отправлено письмо с подтверждением.');
        } else if (data?.session) {
          setMessage('Вы успешно зарегистрировались и вошли!');
          if (onAuthSuccess) onAuthSuccess(data.session.user);
        }
      } else {
        // Вход существующего пользователя
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });

        if (signInError) throw signInError;

        if (data?.session) {
          if (onAuthSuccess) onAuthSuccess(data.session.user);
        }
      }
    } catch (err) {
      console.error('Ошибка аутентификации:', err);
      let msg = err.message || 'Произошла ошибка при аутентификации';
      if (msg.includes('Invalid login credentials')) {
        msg = 'Неверный email или пароль';
      } else if (msg.includes('User already registered')) {
        msg = 'Пользователь с таким email уже зарегистрирован';
      } else if (msg.includes('Email not confirmed')) {
        msg = 'Email еще не подтвержден. Проверьте почту или отключите Confirm email в настройках Supabase.';
      } else if (msg.includes('Password should be at least')) {
        msg = 'Пароль должен содержать минимум 6 символов';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card-container">
      <div className="auth-card">
        {/* Заголовок карточки */}
        <div className="auth-header">
          <div className="auth-icon-badge">
            <ShieldCheck size={28} color="#38bdf8" />
          </div>
          <h2 className="auth-title">
            {isSignUp ? 'Создание аккаунта' : 'Вход в TaskManager'}
          </h2>
          <p className="auth-subtitle">
            {isSignUp
              ? 'Зарегистрируйтесь, чтобы сохранять свои задачи'
              : 'Войдите через Google или по email'}
          </p>
        </div>

        {/* Кнопка входа / регистрации через Google */}
        <button
          type="button"
          className="btn-google-auth"
          onClick={handleGoogleAuth}
          disabled={googleLoading || loading}
        >
          {googleLoading ? (
            <div className="spinner" style={{ width: '18px', height: '18px' }} />
          ) : (
            <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>{isSignUp ? 'Зарегистрироваться через Google' : 'Войти через Google'}</span>
        </button>

        {/* Разделитель */}
        <div className="auth-divider">
          <span>или по электронной почте</span>
        </div>

        {/* Переключатель Вход / Регистрация */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${!isSignUp ? 'active' : ''}`}
            onClick={() => {
              setIsSignUp(false);
              setError(null);
              setMessage(null);
            }}
          >
            <LogIn size={15} />
            <span>Вход</span>
          </button>
          <button
            type="button"
            className={`auth-tab ${isSignUp ? 'active' : ''}`}
            onClick={() => {
              setIsSignUp(true);
              setError(null);
              setMessage(null);
            }}
          >
            <UserPlus size={15} />
            <span>Регистрация</span>
          </button>
        </div>

        {/* Сообщения об ошибках или успехе */}
        {error && (
          <div className="auth-alert error">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="auth-alert success">
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{message}</span>
          </div>
        )}

        {/* Форма авторизации */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-form-group">
            <label className="auth-label">Электронная почта</label>
            <div className="auth-input-wrapper">
              <Mail size={18} className="auth-input-icon" />
              <input
                type="email"
                className="auth-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={loading || googleLoading}
              />
            </div>
          </div>

          <div className="auth-form-group">
            <label className="auth-label">Пароль</label>
            <div className="auth-input-wrapper">
              <Lock size={18} className="auth-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder="Минимум 6 символов"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                disabled={loading || googleLoading}
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary auth-submit-btn"
            disabled={loading || googleLoading}
          >
            {loading ? (
              <div className="spinner" style={{ width: '18px', height: '18px' }} />
            ) : isSignUp ? (
              <>
                <UserPlus size={18} />
                <span>Зарегистрироваться с паролем</span>
              </>
            ) : (
              <>
                <LogIn size={18} />
                <span>Войти с паролем</span>
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          {isSignUp ? (
            <p>
              Уже есть аккаунт?{' '}
              <button
                type="button"
                className="auth-link-btn"
                onClick={() => {
                  setIsSignUp(false);
                  setError(null);
                  setMessage(null);
                }}
              >
                Войти
              </button>
            </p>
          ) : (
            <p>
              Впервые здесь?{' '}
              <button
                type="button"
                className="auth-link-btn"
                onClick={() => {
                  setIsSignUp(true);
                  setError(null);
                  setMessage(null);
                }}
              >
                Создать аккаунт
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
