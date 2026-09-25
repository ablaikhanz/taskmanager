# 🚀 Supabase Tasks Manager (React + Supabase)

Современный Pet-проект менеджера задач на **React + Vite** с интеграцией облачной базы данных **Supabase** и поддержкой Realtime-синхронизации.

---

## 🛠️ Что реализовано
- **Полный CRUD:**
  - 📥 Чтение списка задач из таблицы в Supabase (`SELECT`)
  - ➕ Добавление новых задач (`INSERT`)
  - ✏️ Редактирование названия (`UPDATE title`)
  - ☑️ Переключение статуса выполнения (`UPDATE is_completed`)
  - 🗑️ Удаление задач (`DELETE`)
- **⚡ Real-time подписка:** любые изменения в Supabase моментально отображаются в интерфейсе.
- **🔍 Поиск и фильтрация:** "Все", "Активные", "Выполненные" + живой поиск.
- **📊 Прогресс-бар и статистика:** визуализация завершенных дел.
- **🎨 Дизайн:** стильная тёмная тема с градиентами, эффектами стекла (glassmorphism) и анимациями.
- **⚙️ Гибкая настройка:** можно указать ключи через `.env` файл или прямо в модальном окне настроек браузера.

---

## 📋 Структура вашей таблицы в Supabase

Ваша таблица должна называться `tasks` (или любое другое имя, которое можно указать в настройках) со следующими колонками:

| Колонка | Тип данных | Описание |
| :--- | :--- | :--- |
| `id` | `int8` или `uuid` | Первичный ключ (Primary Key, autoincrement / gen_random_uuid) |
| `created_at` | `timestamptz` | Дата создания (Default: `now()`) |
| `title` | `text` | Название задачи |
| `is_completed` | `bool` | Флаг выполнения (Default: `false`) |

> ⚠️ **Важно (RLS - Row Level Security в Supabase):**  
> Если в Supabase включен RLS (Row Level Security), убедитесь, что вы создали политику разрешений (Policy) для анонимных пользователей (anon) на операции `SELECT`, `INSERT`, `UPDATE`, `DELETE`, либо временно отключите RLS для тестовой таблицы в **Table Editor -> tasks -> RLS Disabled**.

---

## 🔑 Как подключить ваш проект Supabase

### Способ 1. Через файл `.env` (Рекомендуется)
1. Откройте файл [.env](file:///c:/Users/THUNDEROBOT/Documents/taskmanager/.env) в корне проекта.
2. Вставьте ваши параметры из консоли Supabase:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   VITE_SUPABASE_TABLE=tasks
   ```
   *(Их можно найти в Supabase Dashboard: **Project Settings** → **API**)*.

### Способ 2. Прямо в интерфейсе сайта
1. Запустите проект (`npm run dev`).
2. Нажмите на иконку шестерёнки ⚙️ в правом верхнем углу.
3. Введите **Project URL** и **Anon Key**, нажмите «Проверить соединение» и сохраните.

---

## 💻 Запуск проекта

```bash
# Запуск dev-сервера
npm run dev
```

После запуска перейдите по адресу: [http://localhost:5173](http://localhost:5173).
