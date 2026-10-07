/** Схема локальной базы (node:sqlite). Таблицы совпадают по смыслу с ARCHITECTURE.md,
 *  чтобы переезд на Supabase/Postgres был переносом, а не переписыванием. */
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  created_at TEXT NOT NULL,
  streak INTEGER NOT NULL DEFAULT 0,
  last_lesson_at TEXT,
  xp INTEGER NOT NULL DEFAULT 0,
  daily_email INTEGER NOT NULL DEFAULT 1,
  last_digest_at TEXT
);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  audience TEXT NOT NULL DEFAULT '',
  outcomes TEXT NOT NULL DEFAULT '',
  tone TEXT NOT NULL DEFAULT 'ty',
  daily_limit INTEGER NOT NULL DEFAULT 1,
  join_code TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  kind TEXT NOT NULL,
  content_text TEXT NOT NULL,
  char_count INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  concept TEXT NOT NULL,
  content_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  review_json TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS enrollments (
  user_id TEXT NOT NULL REFERENCES users(id),
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  joined_at TEXT NOT NULL,
  PRIMARY KEY (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  answer TEXT NOT NULL,
  score INTEGER NOT NULL,
  feedback_json TEXT NOT NULL,
  objection TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS flashcards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  card_index INTEGER NOT NULL DEFAULT 0,
  next_due_at TEXT NOT NULL,
  round INTEGER NOT NULL DEFAULT 0,
  last_quality TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (user_id, lesson_id, card_index)
);

CREATE TABLE IF NOT EXISTS calibration_samples (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id TEXT REFERENCES lessons(id) ON DELETE SET NULL,
  answer TEXT NOT NULL,
  score INTEGER NOT NULL,
  comment TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS generations (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  prompt TEXT NOT NULL,
  output TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS homework_checks (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  task TEXT NOT NULL,
  criteria TEXT NOT NULL,
  results_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_calls (
  id TEXT PRIMARY KEY,
  course_id TEXT,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens INTEGER NOT NULL DEFAULT 0,
  cache_write_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_calls_course ON ai_calls(course_id, created_at);
CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id, position);
CREATE INDEX IF NOT EXISTS idx_submissions_lesson_user ON submissions(lesson_id, user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_flashcards_user_due ON flashcards(user_id, next_due_at);
CREATE INDEX IF NOT EXISTS idx_chat_course_user ON chat_messages(course_id, user_id, created_at);
`;

/** Миграции для баз, созданных до появления колонок. Каждая — идемпотентна. */
export const MIGRATIONS: { name: string; sql: string }[] = [
  { name: "courses_outcomes", sql: "ALTER TABLE courses ADD COLUMN outcomes TEXT NOT NULL DEFAULT ''" },
  { name: "courses_tone", sql: "ALTER TABLE courses ADD COLUMN tone TEXT NOT NULL DEFAULT 'ty'" },
  { name: "courses_daily_limit", sql: "ALTER TABLE courses ADD COLUMN daily_limit INTEGER NOT NULL DEFAULT 1" },
  { name: "lessons_review_json", sql: "ALTER TABLE lessons ADD COLUMN review_json TEXT" },
  { name: "submissions_objection", sql: "ALTER TABLE submissions ADD COLUMN objection TEXT" },
  { name: "users_daily_email", sql: "ALTER TABLE users ADD COLUMN daily_email INTEGER NOT NULL DEFAULT 1" },
  { name: "users_last_digest_at", sql: "ALTER TABLE users ADD COLUMN last_digest_at TEXT" },
  {
    name: "flashcards_card_index",
    sql: `CREATE TABLE flashcards_v2 (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
      card_index INTEGER NOT NULL DEFAULT 0,
      next_due_at TEXT NOT NULL,
      round INTEGER NOT NULL DEFAULT 0,
      last_quality TEXT,
      created_at TEXT NOT NULL,
      UNIQUE (user_id, lesson_id, card_index)
    );
    INSERT INTO flashcards_v2 (id, user_id, lesson_id, card_index, next_due_at, round, last_quality, created_at)
      SELECT id, user_id, lesson_id, 0, next_due_at, round, last_quality, created_at FROM flashcards;
    DROP TABLE flashcards;
    ALTER TABLE flashcards_v2 RENAME TO flashcards;
    CREATE INDEX IF NOT EXISTS idx_flashcards_user_due ON flashcards(user_id, next_due_at);`,
  },
];
