import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, UserPlus, LogIn, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function Auth({ onAuthSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

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

        // Если в Supabase включено подтверждение почты, session будет null
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
      // Преобразуем типичные ошибки Supabase на понятный русский язык
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
              : 'Введите ваш email и пароль для доступа к задачам'}
          </p>
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
                disabled={loading}
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
                disabled={loading}
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
            disabled={loading}
          >
            {loading ? (
              <div className="spinner" style={{ width: '18px', height: '18px' }} />
            ) : isSignUp ? (
              <>
                <UserPlus size={18} />
                <span>Зарегистрироваться</span>
              </>
            ) : (
              <>
                <LogIn size={18} />
                <span>Войти в аккаунт</span>
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
