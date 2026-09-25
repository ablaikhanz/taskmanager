import React, { useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';

export default function TaskForm({ onAddTask, disabled }) {
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle || isSubmitting || disabled) return;

    try {
      setIsSubmitting(true);
      await onAddTask(cleanTitle);
      setTitle('');
    } catch (err) {
      console.error('Ошибка добавления задачи:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="task-form-card">
      <form onSubmit={handleSubmit} className="task-form">
        <Sparkles size={20} style={{ color: 'var(--accent-primary)', opacity: 0.8 }} />
        <input
          type="text"
          className="task-input"
          placeholder="Что нужно сделать? Нажмите Enter для сохранения..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={disabled || isSubmitting}
          autoFocus
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={!title.trim() || disabled || isSubmitting}
          style={{ padding: '8px 16px', fontSize: '13px' }}
        >
          {isSubmitting ? (
            <div className="spinner" style={{ width: '16px', height: '16px' }} />
          ) : (
            <>
              <Plus size={16} />
              <span>Добавить</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
