import React, { useState, useRef, useEffect } from 'react';
import { Plus, Sparkles, Paperclip, X, Image as ImageIcon, FileText, File, Tag, ChevronDown, Check, FolderPlus } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function TaskForm({ onAddTask, disabled, user, categories, onCategoryCreated }) {
  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const fileInputRef = useRef(null);

  // Категории
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const categoryDropdownRef = useRef(null);
  const newCategoryInputRef = useRef(null);

  // Закрытие дропдауна по клику вне
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target)) {
        setIsCategoryDropdownOpen(false);
        setIsCreatingCategory(false);
        setNewCategoryName('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Фокус на инпуте создания категории
  useEffect(() => {
    if (isCreatingCategory && newCategoryInputRef.current) {
      newCategoryInputRef.current.focus();
    }
  }, [isCreatingCategory]);

  const selectedCategory = categories?.find(c => c.id === selectedCategoryId) || null;

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    try {
      setIsSavingCategory(true);
      const { data, error } = await supabase
        .from('categories')
        .insert([{ name, user_id: user?.id }])
        .select()
        .single();
      if (error) throw error;
      onCategoryCreated?.(data);
      setSelectedCategoryId(data.id);
      setNewCategoryName('');
      setIsCreatingCategory(false);
      setIsCategoryDropdownOpen(false);
    } catch (err) {
      alert('Ошибка создания категории: ' + err.message);
    } finally {
      setIsSavingCategory(false);
    }
  };

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

      // Если выбран файл, загружаем его в приватный bucket 'task-files' в папку текущего пользователя (<user_id>/...)
      if (selectedFile) {
        setUploadProgressText('Загрузка файла в Supabase Storage...');

        // Определяем ID текущего пользователя
        const currentUserId = user?.id || (await supabase.auth.getUser()).data?.user?.id;
        if (!currentUserId) {
          throw new Error('Не удалось определить пользователя. Пожалуйста, выполните вход повторно.');
        }

        const safeName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        // Путь ОБЯЗАТЕЛЬНО должен начинаться с ${currentUserId}/ для соответствия RLS политике
        const filePath = `${currentUserId}/${Date.now()}_${safeName}`;

        const { data: uploadResult, error: uploadError } = await supabase.storage
          .from('task-files')
          .upload(filePath, selectedFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          throw new Error(`Ошибка загрузки в бакет 'task-files': ${uploadError.message}. Убедитесь, что RLS-политика INSERT разрешает загрузку в папку (${currentUserId}/...).`);
        }

        fileData = {
          fileUrl: filePath, // Относительный путь в бакете task-files
          fileName: selectedFile.name,
          fileType: selectedFile.type
        };
      }

      setUploadProgressText('Сохранение задачи...');
      await onAddTask(cleanTitle, fileData, selectedCategoryId);

      // Сброс формы
      setTitle('');
      handleRemoveFile();
      setSelectedCategoryId(null);
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

        {/* Строка с выбором категории */}
        <div className="task-form-category-row">
          <div className="category-dropdown-wrapper" ref={categoryDropdownRef}>
            <button
              type="button"
              className={`btn-category-select ${selectedCategory ? 'has-category' : ''}`}
              onClick={() => {
                setIsCategoryDropdownOpen(v => !v);
                setIsCreatingCategory(false);
                setNewCategoryName('');
              }}
              disabled={disabled || isSubmitting}
              title="Выбрать категорию"
            >
              <Tag size={13} />
              <span className="category-select-label">
                {selectedCategory ? selectedCategory.name : 'Категория'}
              </span>
              {selectedCategory ? (
                <span
                  className="category-clear-btn"
                  title="Убрать категорию"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCategoryId(null);
                    setIsCategoryDropdownOpen(false);
                  }}
                >
                  <X size={11} />
                </span>
              ) : (
                <ChevronDown size={13} className={`category-chevron ${isCategoryDropdownOpen ? 'open' : ''}`} />
              )}
            </button>

            {isCategoryDropdownOpen && (
              <div className="category-dropdown">
                {/* Список существующих категорий */}
                {categories && categories.length > 0 ? (
                  <div className="category-list">
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        className={`category-option ${selectedCategoryId === cat.id ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedCategoryId(cat.id);
                          setIsCategoryDropdownOpen(false);
                          setIsCreatingCategory(false);
                        }}
                      >
                        <Tag size={12} />
                        <span>{cat.name}</span>
                        {selectedCategoryId === cat.id && <Check size={12} className="category-option-check" />}
                      </button>
                    ))}
                  </div>
                ) : (
                  !isCreatingCategory && (
                    <div className="category-empty-msg">Нет категорий. Создайте первую!</div>
                  )
                )}

                {/* Форма создания новой категории */}
                {isCreatingCategory ? (
                  <div className="category-create-form">
                    <input
                      ref={newCategoryInputRef}
                      type="text"
                      className="category-create-input"
                      placeholder="Название категории..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); handleCreateCategory(); }
                        if (e.key === 'Escape') { setIsCreatingCategory(false); setNewCategoryName(''); }
                      }}
                      disabled={isSavingCategory}
                      maxLength={50}
                    />
                    <div className="category-create-actions">
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ padding: '5px 12px', fontSize: '12px' }}
                        onClick={handleCreateCategory}
                        disabled={!newCategoryName.trim() || isSavingCategory}
                      >
                        {isSavingCategory ? <div className="spinner" style={{ width: '12px', height: '12px' }} /> : 'Создать'}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                        onClick={() => { setIsCreatingCategory(false); setNewCategoryName(''); }}
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="category-create-btn"
                    onClick={() => setIsCreatingCategory(true)}
                  >
                    <FolderPlus size={13} />
                    <span>Создать категорию</span>
                  </button>
                )}
              </div>
            )}
          </div>
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
