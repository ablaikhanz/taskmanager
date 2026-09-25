import React, { useState } from 'react';
import { Check, Trash2, Edit2, X, Clock } from 'lucide-react';

export default function TaskItem({ task, onToggleComplete, onDeleteTask, onUpdateTitle }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSaveEdit = async (e) => {
    e?.preventDefault();
    const cleanTitle = editTitle.trim();
    if (!cleanTitle || cleanTitle === task.title) {
      setIsEditing(false);
      setEditTitle(task.title);
      return;
    }

    try {
      setIsUpdating(true);
      await onUpdateTitle(task.id, cleanTitle);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
      setEditTitle(task.title);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  return (
    <div className={`task-item ${task.is_completed ? 'completed' : ''}`}>
      <button
        type="button"
        className={`task-checkbox ${task.is_completed ? 'checked' : ''}`}
        onClick={() => onToggleComplete(task.id, !task.is_completed)}
        title={task.is_completed ? "Отметить как невыполненную" : "Отметить как выполненную"}
      >
        {task.is_completed && <Check size={14} color="#ffffff" strokeWidth={3} />}
      </button>

      {isEditing ? (
        <form onSubmit={handleSaveEdit} className="edit-task-form">
          <input
            type="text"
            className="edit-input"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isUpdating}
            autoFocus
          />
          <button type="submit" className="btn-secondary" style={{ padding: '6px 10px' }} disabled={isUpdating}>
            <Check size={14} />
          </button>
          <button
            type="button"
            className="btn-secondary"
            style={{ padding: '6px 10px' }}
            onClick={() => {
              setIsEditing(false);
              setEditTitle(task.title);
            }}
          >
            <X size={14} />
          </button>
        </form>
      ) : (
        <div className="task-content">
          <div className="task-title">{task.title}</div>
          {task.created_at && (
            <div className="task-meta">
              <Clock size={11} />
              <span>{formatDate(task.created_at)}</span>
            </div>
          )}
        </div>
      )}

      {!isEditing && (
        <div className="task-actions">
          <button
            type="button"
            className="btn-task-action"
            title="Редактировать"
            onClick={() => {
              setEditTitle(task.title);
              setIsEditing(true);
            }}
          >
            <Edit2 size={15} />
          </button>
          <button
            type="button"
            className="btn-task-action delete"
            title="Удалить"
            onClick={() => onDeleteTask(task.id)}
          >
            <Trash2 size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
