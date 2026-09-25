import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, 
  RefreshCw, 
  Search, 
  ListTodo, 
  AlertTriangle,
  Key
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import TaskForm from './components/TaskForm';
import TaskItem from './components/TaskItem';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'active' | 'completed'
  const [searchQuery, setSearchQuery] = useState('');

  // Загрузка задач из таблицы 'tasks'
  const fetchTasks = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
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

  // Первоначальная загрузка и Realtime-подписка
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    fetchTasks();

    // Подписка на изменения в реальном времени
    const channel = supabase
      .channel('tasks-channel')
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
  }, []);

  // Добавление новой задачи
  const handleAddTask = async (title) => {
    if (!isSupabaseConfigured) {
      setError('Сначала укажите ваши ключи в файле .env');
      return;
    }

    try {
      setError(null);
      const { data, error: insertError } = await supabase
        .from('tasks')
        .insert([{ title, is_completed: false }])
        .select()
        .single();

      if (insertError) throw insertError;

      if (data) {
        setTasks((prev) => [data, ...prev.filter(t => t.id !== data.id)]);
      }
    } catch (err) {
      console.error('Ошибка добавления:', err);
      setError(`Не удалось создать задачу: ${err.message}`);
    }
  };

  // Переключение статуса выполнения задачи
  const handleToggleComplete = async (taskId, is_completed) => {
    // Оптимистичное обновление в UI
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, is_completed } : t))
    );

    // Анимация конфетти при завершении задачи
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

  // Обновление заголовка задачи
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

  // Удаление задачи
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

  // Фильтрация и поиск
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
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
              Создание и отслеживание задач
            </p>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="btn-icon"
            onClick={fetchTasks}
            title="Обновить задачи"
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? 'spinner' : ''} />
          </button>
        </div>
      </header>

      {/* Предупреждение, если не заполнен .env */}
      {!isSupabaseConfigured && (
        <div className="error-banner" style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', borderColor: 'rgba(56, 189, 248, 0.3)', color: '#93c5fd' }}>
          <Key size={18} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            Укажите <code>VITE_SUPABASE_URL</code> и <code>VITE_SUPABASE_ANON_KEY</code> в файле <strong>.env</strong>, чтобы загрузить задачи из Supabase.
          </div>
        </div>
      )}

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

      {/* Форма добавления новой задачи */}
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
    </div>
  );
}
