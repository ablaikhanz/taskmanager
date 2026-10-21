import React, { useState, useEffect } from 'react';
import { Check, Trash2, Edit2, X, Clock, ExternalLink, Download, Image as ImageIcon, FileText, File } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function TaskItem({ task, onToggleComplete, onDeleteTask, onUpdateTitle }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  
  // URL для отображения (подписанный для private бакета task-files или обычный публичный)
  const [resolvedFileUrl, setResolvedFileUrl] = useState(null);
  const [isResolvingUrl, setIsResolvingUrl] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Извлекаем путь или URL файла
  let rawFileUrl = task.file_url || null;
  let fileName = task.file_name || 'Прикрепленный файл';

  // Если ссылки нет в колонке file_url, но она была сохранена в fallback в task.title
  if (!rawFileUrl && typeof task.title === 'string' && task.title.includes('📎 Прикреплен файл: ')) {
    const parts = task.title.split('📎 Прикреплен файл: ');
    if (parts[1]) {
      rawFileUrl = parts[1].trim();
      const segments = rawFileUrl.split('/');
      fileName = decodeURIComponent(segments[segments.length - 1].replace(/^\d+_/, ''));
    }
  }

  // Очищенный заголовок задачи без сервисного текста
  const displayTitle = typeof task.title === 'string' 
    ? task.title.replace(/\n?📎 Прикреплен файл: .+/g, '').trim()
    : task.title;

  // Очищенный путь в бакете task-files
  const getCleanStoragePath = (urlOrPath) => {
    if (!urlOrPath) return null;
    let path = urlOrPath;
    if (path.startsWith('http://') || path.startsWith('https://')) {
      const match = path.match(/\/task-files\/(.+)$/);
      if (match) {
        path = decodeURIComponent(match[1]);
      } else {
        return null; // Это сторонний или публичный URL (например, из бакета avatars)
      }
    }
    return path.replace(/^task-files\//, '');
  };

  const isImageFile = (name, url) => {
    const target = (name || url || '').split('?')[0].toLowerCase();
    return target.endsWith('.png') ||
      target.endsWith('.jpg') ||
      target.endsWith('.jpeg') ||
      target.endsWith('.webp') ||
      target.endsWith('.gif') ||
      target.endsWith('.svg');
  };

  const isImage = isImageFile(fileName, rawFileUrl);

  // Получаем подписанный URL для безопасного отображения файлов из Private бакета task-files
  useEffect(() => {
    let isMounted = true;

    const resolveUrl = async () => {
      if (!rawFileUrl) {
        if (isMounted) setResolvedFileUrl(null);
        return;
      }

      const storagePath = getCleanStoragePath(rawFileUrl);

      // Если это приватный файл из task-files, генерируем Signed URL
      if (storagePath) {
        try {
          setIsResolvingUrl(true);
          // Генерируем подписанную ссылку, действительную 24 часа (86400 сек)
          const { data, error } = await supabase.storage
            .from('task-files')
            .createSignedUrl(storagePath, 86400);

          if (error) {
            console.error('Ошибка получения подписанной ссылки (task-files):', error);
          } else if (isMounted && data?.signedUrl) {
            setResolvedFileUrl(data.signedUrl);
          }
        } catch (err) {
          console.error('Ошибка createSignedUrl:', err);
        } finally {
          if (isMounted) setIsResolvingUrl(false);
        }
      } else if (rawFileUrl.startsWith('http://') || rawFileUrl.startsWith('https://')) {
        // Обычный публичный URL (например, старые файлы из бакета avatars)
        if (isMounted) setResolvedFileUrl(rawFileUrl);
      }
    };

    resolveUrl();

    return () => {
      isMounted = false;
    };
  }, [rawFileUrl]);

  // Скачивание файла с авторизацией пользователя
  const handleDownloadFile = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();

    const storagePath = getCleanStoragePath(rawFileUrl);

    try {
      setIsDownloading(true);

      if (storagePath) {
        // Скачиваем через официальный SDK Supabase (с токеном авторизации пользователя по RLS)
        const { data, error } = await supabase.storage
          .from('task-files')
          .download(storagePath);

        if (error) throw error;

        const blobUrl = URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      } else if (resolvedFileUrl) {
        // Если это публичная ссылка
        window.open(resolvedFileUrl, '_blank');
      }
    } catch (err) {
      console.error('Ошибка при скачивании файла:', err);
      // Если метод download не сработал, пробуем открыть signedUrl
      if (resolvedFileUrl) {
        window.open(resolvedFileUrl, '_blank');
      } else {
        alert('Не удалось скачать файл: ' + (err.message || 'Ошибка доступа'));
      }
    } finally {
      setIsDownloading(false);
    }
  };

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
            {rawFileUrl && (
              <div className="task-attachment-container">
                {isImage ? (
                  <div className="task-image-attachment">
                    {resolvedFileUrl ? (
                      <img
                        src={resolvedFileUrl}
                        alt={fileName}
                        className="task-image-thumbnail"
                        onClick={() => setShowFullImage(true)}
                        title="Нажмите, чтобы увеличить изображение"
                        loading="lazy"
                      />
                    ) : isResolvingUrl ? (
                      <div className="task-image-thumbnail" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80px', width: '120px', background: 'rgba(255,255,255,0.03)' }}>
                        <div className="spinner" style={{ width: '16px', height: '16px' }} />
                      </div>
                    ) : (
                      <div className="task-image-thumbnail" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px' }}>
                        <ImageIcon size={16} />
                        <span style={{ fontSize: '12px' }}>{fileName}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      className="task-file-link"
                      onClick={handleDownloadFile}
                      title="Скачать изображение"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      <ImageIcon size={13} />
                      <span className="file-name-text">{fileName}</span>
                      <Download size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="task-file-card"
                    onClick={handleDownloadFile}
                    title="Скачать файл из папки задачи"
                    disabled={isDownloading}
                    style={{ cursor: 'pointer', textAlign: 'left', font: 'inherit' }}
                  >
                    {fileName.endsWith('.pdf') ? (
                      <FileText size={18} color="var(--accent-primary)" />
                    ) : (
                      <File size={18} color="var(--accent-secondary)" />
                    )}
                    <span className="file-name-text">{fileName}</span>
                    {isDownloading ? (
                      <div className="spinner" style={{ width: '14px', height: '14px' }} />
                    ) : (
                      <Download size={14} className="download-icon" />
                    )}
                  </button>
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
      {showFullImage && resolvedFileUrl && (
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
            <img src={resolvedFileUrl} alt={fileName} className="image-modal-full" />
            <div className="image-modal-footer">
              <span>{fileName}</span>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: '6px 14px', fontSize: '12px' }}
                onClick={handleDownloadFile}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <div className="spinner" style={{ width: '14px', height: '14px' }} />
                ) : (
                  <>
                    <Download size={14} />
                    <span>Скачать оригинал</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
