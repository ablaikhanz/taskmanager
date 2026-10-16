import React, { useState, useEffect, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  RefreshCw,
  Search,
  ListTodo,
  AlertTriangle,
  Key,
  LogOut,
  User as UserIcon,
  Camera,
  Check
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import TaskForm from './components/TaskForm';
import TaskItem from './components/TaskItem';
import Auth from './components/Auth';

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'active' | 'completed'
  const [searchQuery, setSearchQuery] = useState('');

  // Состояния для смены аватара
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarSuccessMsg, setAvatarSuccessMsg] = useState('');
  const avatarInputRef = useRef(null);

  // 1. Отслеживание авторизации пользователя
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthLoading(false);
      return;
    }

    // Получаем текущую сессию
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    // Слушаем изменения статуса авторизации (вход, выход, обновление токена, OAuth callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // 2. Загрузка задач из таблицы 'tasks'
  const fetchTasks = async () => {
    if (!isSupabaseConfigured || !user) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setTasks(data || []);
    } catch (err) {
      console.error('Ошибка загрузки задач:', err);
      setError(err.message || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  // 3. Загрузка задач и Realtime-подписка при входе пользователя
  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      setTasks([]);
      return;
    }

    fetchTasks();

    // Realtime подписка
    const channel = supabase
      .channel('tasks-user-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTasks((prev) => [payload.new, ...prev.filter(t => t.id !== payload.new.id)]);
          } else if (payload.eventType === 'UPDATE') {
            setTasks((prev) => prev.map((t) => (t.id === payload.new.id ? payload.new : t)));
          } else if (payload.eventType === 'DELETE') {
            setTasks((prev) => prev.filter((t) => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // 4. Загрузка и смена аватара пользователя в bucket 'avatars'
  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      setError('Для аватара можно использовать только изображения (JPEG, PNG, WEBP, GIF)');
      return;
    }

    // Ограничение по размеру (до 5 МБ)
    if (file.size > 5 * 1024 * 1024) {
      setError('Размер изображения для аватара не должен превышать 5 МБ');
      return;
    }

    try {
      setAvatarLoading(true);
      setError(null);
      setAvatarSuccessMsg('');

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;


      // 1. Загружаем в bucket 'avatars'
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Ошибка загрузки аватара в Storage: ${uploadError.message}. Убедитесь, что бакет 'avatars' открыт для записи.`);
      }

      // 2. Получаем публичный URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 3. Обновляем профиль пользователя в Supabase Auth
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (updateError) throw updateError;

      if (updateData?.user) {
        setUser(updateData.user);
      }

      setAvatarSuccessMsg('Аватар успешно обновлен!');
      setTimeout(() => setAvatarSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Ошибка смены аватара:', err);
      setError(err.message || 'Не удалось обновить аватар');
    } finally {
      setAvatarLoading(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  // 5. Выход из аккаунта
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setTasks([]);
    } catch (err) {
      console.error('Ошибка выхода:', err);
    }
  };

  // 6. Добавление новой задачи (с поддержкой прикрепления файлов)
  const handleAddTask = async (title, fileData = null) => {
    if (!isSupabaseConfigured) {
      setError('Сначала укажите ваши ключи в файле .env');
      return;
    }

    try {
      setError(null);

      // Формируем полезную нагрузку
      const payload = {
        title,
        is_completed: false
      };

      if (fileData?.fileUrl) {
        payload.file_url = fileData.fileUrl;
        payload.file_name = fileData.fileName;
      }

      // Пытаемся вставить в таблицу tasks со столбцами file_url и file_name
      let { data, error: insertError } = await supabase
        .from('tasks')
        .insert([payload])
        .select()
        .single();

      // Если в таблице еще не созданы колонки file_url/file_name, делаем безопасный fallback:
      // прикрепляем ссылку к названию задачи, чтобы данные гарантированно сохранились!
      if (insertError && (insertError.message.includes('file_url') || insertError.code === 'PGRST204')) {
        console.warn('Колонки file_url нет в таблице tasks, сохраняем ссылку в тексте задачи');
        const fallbackTitle = fileData?.fileUrl
          ? `${title}\n📎 Прикреплен файл: ${fileData.fileUrl}`
          : title;

        const fallbackResult = await supabase
          .from('tasks')
          .insert([{ title: fallbackTitle, is_completed: false }])
          .select()
          .single();

        if (fallbackResult.error) throw fallbackResult.error;
        data = fallbackResult.data;
      } else if (insertError) {
        throw insertError;
      }

      if (data) {
        setTasks((prev) => [data, ...prev.filter(t => t.id !== data.id)]);
      }
    } catch (err) {
      console.error('Ошибка добавления:', err);
      setError(`Не удалось создать задачу: ${err.message}`);
    }
  };

  // 7. Переключение статуса выполнения задачи
  const handleToggleComplete = async (taskId, is_completed) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, is_completed } : t))
    );

    if (is_completed) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#38bdf8', '#818cf8', '#34d399']
      });
    }

    try {
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ is_completed })
        .eq('id', taskId);

      if (updateError) throw updateError;
    } catch (err) {
      console.error('Ошибка обновления статуса:', err);
      fetchTasks();
      setError(`Ошибка обновления: ${err.message}`);
    }
  };

  // 8. Обновление заголовка задачи
  const handleUpdateTitle = async (taskId, title) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, title } : t))
    );

    try {
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ title })
        .eq('id', taskId);

      if (updateError) throw updateError;
    } catch (err) {
      console.error('Ошибка обновления:', err);
      fetchTasks();
      setError(`Ошибка обновления: ${err.message}`);
    }
  };

  // 9. Удаление задачи
  const handleDeleteTask = async (taskId) => {
    const prevTasks = [...tasks];
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    try {
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (deleteError) throw deleteError;
    } catch (err) {
      console.error('Ошибка удаления:', err);
      setTasks(prevTasks);
      setError(`Ошибка удаления: ${err.message}`);
    }
  };

  // 10. Фильтрация и поиск
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const titleText = (task.title || '').toLowerCase();
      const matchesSearch = titleText.includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (filter === 'active') return !task.is_completed;
      if (filter === 'completed') return task.is_completed;
      return true;
    });
  }, [tasks, filter, searchQuery]);

  // Статистика
  const totalCount = tasks.length;
  const completedCount = tasks.filter((t) => t.is_completed).length;
  const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  // Данные профиля пользователя (включая аватар от Supabase Storage или Google OAuth)
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email;

  // Экран начальной загрузки проверки сессии
  if (authLoading) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="spinner" style={{ width: '40px', height: '40px' }} />
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Шапка приложения */}
      <header className="app-header">
        <div className="logo-area">
          <div className="logo-icon-wrapper">
            <CheckCircle2 size={28} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <h1 className="logo-title">Менеджер задач</h1>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Supabase Auth + Database + Storage
            </p>
          </div>
        </div>

        {user && (
          <div className="header-actions">
            {/* Скрытый инпут для смены аватара */}
            <input
              type="file"
              ref={avatarInputRef}
              onChange={handleAvatarFileChange}
              accept="image/*"
              style={{ display: 'none' }}
              disabled={avatarLoading}
            />

            {/* Бейдж пользователя с возможностью кликнуть и сменить аватарку */}
            <div
              className="user-profile-badge interactive"
              title="Нажмите на аватарку, чтобы изменить фото"
              onClick={() => avatarInputRef.current?.click()}
            >
              <div className="avatar-wrapper">
                {avatarLoading ? (
                  <div className="avatar-spinner-overlay">
                    <div className="spinner" style={{ width: '14px', height: '14px' }} />
                  </div>
                ) : avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="user-avatar-img"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="default-avatar-icon">
                    <UserIcon size={14} color="var(--accent-primary)" />
                  </div>
                )}
                <div className="avatar-hover-overlay">
                  <Camera size={12} color="#ffffff" />
                </div>
              </div>

              <span className="user-email-text">{displayName}</span>
            </div>

            <button
              className="btn-icon"
              onClick={fetchTasks}
              title="Обновить задачи"
              disabled={loading}
            >
              <RefreshCw size={18} className={loading ? 'spinner' : ''} />
            </button>
            <button
              className="btn-icon logout"
              onClick={handleSignOut}
              title="Выйти из аккаунта"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </header>

      {/* Уведомление об успешной смене аватара */}
      {avatarSuccessMsg && (
        <div className="auth-alert success" style={{ marginBottom: '20px' }}>
          <Check size={18} style={{ flexShrink: 0 }} />
          <span>{avatarSuccessMsg}</span>
        </div>
      )}

      {/* Предупреждение, если не заполнен .env */}
      {!isSupabaseConfigured && (
        <div className="error-banner" style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', borderColor: 'rgba(56, 189, 248, 0.3)', color: '#93c5fd' }}>
          <Key size={18} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            Укажите <code>VITE_SUPABASE_URL</code> и <code>VITE_SUPABASE_ANON_KEY</code> в файле <strong>.env</strong>, чтобы подключить Supabase.
          </div>
        </div>
      )}

      {/* Если пользователь не авторизован — показываем экран Входа / Регистрации */}
      {!user ? (
        <Auth onAuthSuccess={(authUser) => setUser(authUser)} />
      ) : (
        <>
          {/* Ошибки от Supabase, если возникли */}
          {error && (
            <div className="error-banner">
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>{error}</div>
              <button
                className="btn-secondary"
                style={{ padding: '4px 8px', fontSize: '11px' }}
                onClick={() => setError(null)}
              >
                Скрыть
              </button>
            </div>
          )}

          {/* Прогресс-бар и статистика */}
          <div className="stats-card">
            <div className="stats-header">
              <span className="stats-title">Прогресс выполнения</span>
              <span className="stats-counter">
                {completedCount} из {totalCount} ({progressPercent}%)
              </span>
            </div>
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="stats-pills">
              <div className="stats-pill">
                <span className="stats-pill-label">Всего</span>
                <span className="stats-pill-value">{totalCount}</span>
              </div>
              <div className="stats-pill">
                <span className="stats-pill-label">В процессе</span>
                <span className="stats-pill-value" style={{ color: 'var(--accent-primary)' }}>
                  {totalCount - completedCount}
                </span>
              </div>
              <div className="stats-pill">
                <span className="stats-pill-label">Выполнено</span>
                <span className="stats-pill-value" style={{ color: 'var(--success)' }}>
                  {completedCount}
                </span>
              </div>
            </div>
          </div>

          {/* Форма добавления новой задачи с файлами/изображениями */}
          <TaskForm onAddTask={handleAddTask} />

          {/* Фильтры и поиск */}
          {totalCount > 0 && (
            <div className="controls-bar">
              <div className="filter-tabs">
                <button
                  className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                  onClick={() => setFilter('all')}
                >
                  Все ({totalCount})
                </button>
                <button
                  className={`filter-tab ${filter === 'active' ? 'active' : ''}`}
                  onClick={() => setFilter('active')}
                >
                  Активные ({totalCount - completedCount})
                </button>
                <button
                  className={`filter-tab ${filter === 'completed' ? 'active' : ''}`}
                  onClick={() => setFilter('completed')}
                >
                  Выполненные ({completedCount})
                </button>
              </div>

              <div className="search-box">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Поиск задач..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Список задач */}
          <main className="tasks-list">
            {loading && tasks.length === 0 ? (
              <div className="empty-state">
                <div className="spinner" style={{ width: '32px', height: '32px', marginBottom: '16px' }} />
                <div className="empty-title">Загрузка задач...</div>
              </div>
            ) : filteredTasks.length > 0 ? (
              filteredTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggleComplete={handleToggleComplete}
                  onDeleteTask={handleDeleteTask}
                  onUpdateTitle={handleUpdateTitle}
                />
              ))
            ) : (
              <div className="empty-state">
                <ListTodo className="empty-icon" />
                <div className="empty-title">
                  {searchQuery
                    ? 'Ничего не найдено'
                    : filter === 'completed'
                      ? 'Нет выполненных задач'
                      : filter === 'active'
                        ? 'Все задачи выполнены! 🎉'
                        : 'Список задач пуст'}
                </div>
                <div className="empty-subtitle">
                  Добавьте задачу с помощью поля ввода выше
                </div>
              </div>
            )}
          </main>
        </>
      )}
    </div>
  );
}
