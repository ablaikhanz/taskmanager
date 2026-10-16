import React, { useState, useRef } from 'react';
import { Plus, Sparkles, Paperclip, X, Image as ImageIcon, FileText, File } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function TaskForm({ onAddTask, disabled }) {
  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    // Если это картинка, создаем Data URL для красивого превью
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle || isSubmitting || disabled) return;

    try {
      setIsSubmitting(true);
      let fileData = null;

      // Если выбран файл, загружаем его в bucket 'avatars' (в папку task-attachments)
      if (selectedFile) {
        setUploadProgressText('Загрузка файла в Supabase Storage...');
        const fileExt = selectedFile.name.split('.').pop();
        const safeName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `task-attachments/${Date.now()}_${safeName}`;

        const { data: uploadResult, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, selectedFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          throw new Error(`Ошибка загрузки файла в Storage: ${uploadError.message}. Убедитесь, что в бакете 'avatars' настроены политики доступа (RLS Policy).`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        fileData = {
          fileUrl: publicUrl,
          fileName: selectedFile.name,
          fileType: selectedFile.type
        };
      }

      setUploadProgressText('Сохранение задачи...');
      await onAddTask(cleanTitle, fileData);

      // Сброс формы
      setTitle('');
      handleRemoveFile();
    } catch (err) {
      console.error('Ошибка добавления задачи:', err);
      alert(err.message);
    } finally {
      setIsSubmitting(false);
      setUploadProgressText('');
    }
  };

  return (
    <div className="task-form-card">
      <form onSubmit={handleSubmit} className="task-form-wrapper">
        <div className="task-form-main-row">
          <Sparkles size={20} style={{ color: 'var(--accent-primary)', opacity: 0.8, flexShrink: 0 }} />
          <input
            type="text"
            className="task-input"
            placeholder="Что нужно сделать? Нажмите Enter для сохранения..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={disabled || isSubmitting}
            autoFocus
          />

          {/* Скрытый инпут для файлов */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
            disabled={disabled || isSubmitting}
          />

          {/* Кнопка прикрепления файла */}
          <button
            type="button"
            className={`btn-icon-attach ${selectedFile ? 'has-file' : ''}`}
            title="Прикрепить изображение или файл"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isSubmitting}
          >
            <Paperclip size={18} />
          </button>

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
        </div>

        {/* Индикатор загрузки */}
        {uploadProgressText && (
          <div className="upload-progress-indicator">
            <div className="spinner" style={{ width: '12px', height: '12px' }} />
            <span>{uploadProgressText}</span>
          </div>
        )}

        {/* Превью прикрепленного файла */}
        {selectedFile && (
          <div className="attached-file-preview">
            {filePreview ? (
              <img src={filePreview} alt="Превью" className="attached-img-thumb" />
            ) : selectedFile.type.includes('pdf') || selectedFile.name.endsWith('.pdf') ? (
              <FileText size={20} color="var(--accent-primary)" />
            ) : (
              <File size={20} color="var(--accent-secondary)" />
            )}

            <div className="attached-file-info">
              <span className="attached-file-name" title={selectedFile.name}>
                {selectedFile.name}
              </span>
              <span className="attached-file-size">
                {formatFileSize(selectedFile.size)}
              </span>
            </div>

            <button
              type="button"
              className="btn-remove-attachment"
              onClick={handleRemoveFile}
              title="Удалить прикрепленный файл"
              disabled={isSubmitting}
            >
              <X size={14} />
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
