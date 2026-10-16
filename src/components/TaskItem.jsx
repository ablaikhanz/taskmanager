import React, { useState } from 'react';
import { Check, Trash2, Edit2, X, Clock, Paperclip, ExternalLink, Download, Image as ImageIcon, FileText, File } from 'lucide-react';

export default function TaskItem({ task, onToggleComplete, onDeleteTask, onUpdateTitle }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

  // Извлекаем URL файла: либо из поля task.file_url, либо ищем ссылку на Supabase Storage в task.title (для обратной совместимости)
  let fileUrl = task.file_url || null;
  let fileName = task.file_name || 'Прикрепленный файл';

  if (!fileUrl && typeof task.title === 'string' && task.title.includes('/storage/v1/object/public/')) {
    const match = task.title.match(/https?:\/\/[^\s)]+\/storage\/v1\/object\/public\/[^\s)]+/);
    if (match) {
      fileUrl = match[0];
      const urlParts = fileUrl.split('/');
      fileName = decodeURIComponent(urlParts[urlParts.length - 1].replace(/^\d+_/, ''));
    }
  }

  // Очищенный заголовок (если в заголовке была добавлена ссылка в fallback режиме)
  const displayTitle = typeof task.title === 'string' 
    ? task.title.replace(/\n?📎 Прикреплен файл: https?:\/\/[^\s)]+/g, '').trim()
    : task.title;

  const isImageFile = (url) => {
    if (!url) return false;
    const cleanUrl = url.split('?')[0].toLowerCase();
    return cleanUrl.endsWith('.png') ||
      cleanUrl.endsWith('.jpg') ||
      cleanUrl.endsWith('.jpeg') ||
      cleanUrl.endsWith('.webp') ||
      cleanUrl.endsWith('.gif') ||
      cleanUrl.endsWith('.svg');
  };

  const isImage = isImageFile(fileUrl);

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
    <>
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
            <div className="task-title">{displayTitle}</div>

            {/* Отображение прикрепленного файла или картинки */}
            {fileUrl && (
              <div className="task-attachment-container">
                {isImage ? (
                  <div className="task-image-attachment">
                    <img
                      src={fileUrl}
                      alt={fileName}
                      className="task-image-thumbnail"
                      onClick={() => setShowFullImage(true)}
                      title="Нажмите, чтобы увеличить изображение"
                      loading="lazy"
                    />
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="task-file-link"
                      download={fileName}
                      title="Открыть в новой вкладке"
                    >
                      <ImageIcon size={13} />
                      <span className="file-name-text">{fileName}</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                ) : (
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="task-file-card"
                    download={fileName}
                    title="Скачать / открыть файл"
                  >
                    {fileName.endsWith('.pdf') ? (
                      <FileText size={18} color="var(--accent-primary)" />
                    ) : (
                      <File size={18} color="var(--accent-secondary)" />
                    )}
                    <span className="file-name-text">{fileName}</span>
                    <Download size={14} className="download-icon" />
                  </a>
                )}
              </div>
            )}

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

      {/* Модальное окно просмотра изображения на весь экран */}
      {showFullImage && (
        <div className="image-modal-overlay" onClick={() => setShowFullImage(false)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="btn-icon image-modal-close"
              onClick={() => setShowFullImage(false)}
              title="Закрыть"
            >
              <X size={20} />
            </button>
            <img src={fileUrl} alt={fileName} className="image-modal-full" />
            <div className="image-modal-footer">
              <span>{fileName}</span>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{ padding: '6px 14px', fontSize: '12px' }}
                download={fileName}
              >
                <Download size={14} />
                <span>Скачать оригинал</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
