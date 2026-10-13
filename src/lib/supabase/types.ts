/** Типы схемы Postgres из supabase/migrations/*.sql (0001 и следующие), написаны вручную
 *  (генерация через `supabase gen types` требует CLI). При изменении миграции править здесь же.
 *  Row-типы объявлены как type, а не interface: supabase-js требует Record<string, unknown>. */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Role = "teacher" | "student";
export type LessonStatus = "draft" | "published";
export type Tone = "ty" | "vy";
/** processing — обработка данных для работы сервиса, marketing — письма о программах To Dual,
 *  terms — принятие пользовательского соглашения. Тексты в docs/legal/consent.md и terms.md. */
export type ConsentKind = "processing" | "marketing" | "terms";

export type ProfileRow = {
  id: string;
  email: string;
  name: string;
  role: Role;
  created_at: string;
  streak: number;
  last_lesson_at: string | null;
  xp: number;
  daily_email: boolean;
  last_digest_at: string | null;
};

export type CourseRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  audience: string;
  outcomes: string;
  tone: Tone;
  daily_limit: number;
  join_code: string;
  created_at: string;
};

export type MaterialRow = {
  id: string;
  course_id: string;
  filename: string;
  kind: string;
  content_text: string;
  char_count: number;
  created_at: string;
};

export type LessonRow = {
  id: string;
  course_id: string;
  position: number;
  title: string;
  concept: string;
  content: Json;
  status: LessonStatus;
  review: Json | null;
  created_at: string;
  /** Когда и кто из преподавателей сохранил урок в редакторе; null — создан ИИ и не проверен. */
  reviewed_at: string | null;
  reviewed_by: string | null;
};

export type EnrollmentRow = {
  user_id: string;
  course_id: string;
  joined_at: string;
};

export type SubmissionRow = {
  id: string;
  lesson_id: string;
  user_id: string;
  answer: string;
  score: number;
  feedback: Json;
  objection: string | null;
  created_at: string;
};

export type FlashcardRow = {
  id: string;
  user_id: string;
  lesson_id: string;
  card_index: number;
  next_due_at: string;
  round: number;
  last_quality: string | null;
  created_at: string;
};

export type CalibrationSampleRow = {
  id: string;
  course_id: string;
  lesson_id: string | null;
  answer: string;
  score: number;
  comment: string;
  created_at: string;
};

export type GenerationRow = {
  id: string;
  course_id: string;
  user_id: string;
  kind: string;
  prompt: string;
  output: string;
  created_at: string;
};

export type ChatMessageRow = {
  id: string;
  course_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export type HomeworkCheckRow = {
  id: string;
  course_id: string;
  user_id: string;
  task: string;
  criteria: string;
  results: Json;
  created_at: string;
};

export type ConsentRow = {
  id: string;
  user_id: string;
  kind: ConsentKind;
  version: string;
  accepted_at: string;
  withdrawn_at: string | null;
};

export type AiCallRow = {
  id: string;
  course_id: string | null;
  /** Пусто у пробного разбора гостя (миграция 0006): тогда заполнен ip_hash. */
  user_id: string | null;
  ip_hash: string | null;
  kind: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  cost_usd: number;
  duration_ms: number;
  created_at: string;
};

/** Предложение ИИ-методиста по уроку (supabase/migrations/0005_suggestions.sql). */
export type SuggestionType = "add_flashcard" | "clarify_criterion";
export type SuggestionStatus = "pending" | "accepted" | "rejected" | "reverted";

export type CourseSuggestionRow = {
  id: string;
  course_id: string;
  lesson_id: string;
  type: SuggestionType;
  status: SuggestionStatus;
  /** Урок + вид сигнала + номер критерия: по нему не повторяем отклонённое. */
  signal_key: string;
  signal: Json;
  evidence: Json;
  change: Json;
  previous_content: Json | null;
  created_at: string;
  decided_at: string | null;
};

/** Обезличенная выдержка из ответа студента под предложением; уходит каскадом вместе с ответом. */
export type SuggestionExcerptRow = {
  id: string;
  suggestion_id: string;
  submission_id: string;
  excerpt: string;
  created_at: string;
};

/** Ответ RPC course_flashcard_signals: карточки урока по всем студентам курса, для сигнала «карточку забывают».
 *  old_* считаются по карточкам старше 9 дней: первый круг (через день) у них уже пройден. */
export type FlashcardSignalRow = {
  lesson_id: string;
  reviewed: number;
  forgot: number;
  old_reviewed: number;
  old_forgot: number;
};

/** Ответ RPC course_updates для студента: что приняли за 7 дней, без выдержек и текста изменения. */
export type CourseUpdateRow = {
  lesson_position: number;
  type: SuggestionType;
  decided_at: string;
};

export type StudentStatsRow = {
  user_id: string;
  name: string;
  email: string;
  streak: number;
  xp: number;
  completed: number;
  avg_score: number | null;
  joined_at: string;
};

export type UsageSummaryRow = {
  calls: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cost_usd: number;
};

export type UsageByKindRow = UsageSummaryRow & { kind: string };

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

/** Колонки с default в БД (id, created_at и т.п.) при вставке необязательны. */
type Table<Row, Optional extends keyof Row, Rels extends Relationship[] = []> = {
  Row: Row;
  Insert: Omit<Row, Optional> & Partial<Pick<Row, Optional>>;
  Update: Partial<Row>;
  Relationships: Rels;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, "created_at" | "streak" | "last_lesson_at" | "xp" | "role" | "daily_email" | "last_digest_at">;
      courses: Table<CourseRow, "id" | "created_at" | "description" | "audience" | "outcomes" | "tone" | "daily_limit">;
      materials: Table<MaterialRow, "id" | "created_at">;
      lessons: Table<LessonRow, "id" | "created_at" | "status" | "review" | "reviewed_at" | "reviewed_by">;
      enrollments: Table<EnrollmentRow, "joined_at">;
      submissions: Table<
        SubmissionRow,
        "id" | "created_at" | "objection",
        [
          { foreignKeyName: "submissions_lesson_id_fkey"; columns: ["lesson_id"]; isOneToOne: false; referencedRelation: "lessons"; referencedColumns: ["id"] },
          { foreignKeyName: "submissions_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      >;
      flashcards: Table<
        FlashcardRow,
        "id" | "created_at" | "round" | "last_quality" | "card_index",
        [
          { foreignKeyName: "flashcards_lesson_id_fkey"; columns: ["lesson_id"]; isOneToOne: false; referencedRelation: "lessons"; referencedColumns: ["id"] },
        ]
      >;
      calibration_samples: Table<CalibrationSampleRow, "id" | "created_at" | "comment">;
      generations: Table<GenerationRow, "id" | "created_at">;
      chat_messages: Table<ChatMessageRow, "id" | "created_at">;
      homework_checks: Table<HomeworkCheckRow, "id" | "created_at">;
      ai_calls: Table<AiCallRow, "id" | "created_at">;
      consents: Table<ConsentRow, "id" | "accepted_at" | "withdrawn_at">;
      course_suggestions: Table<
        CourseSuggestionRow,
        "id" | "created_at" | "status" | "previous_content" | "decided_at",
        [
          { foreignKeyName: "course_suggestions_lesson_id_fkey"; columns: ["lesson_id"]; isOneToOne: false; referencedRelation: "lessons"; referencedColumns: ["id"] },
        ]
      >;
      suggestion_excerpts: Table<
        SuggestionExcerptRow,
        "id" | "created_at",
        [
          { foreignKeyName: "suggestion_excerpts_suggestion_id_fkey"; columns: ["suggestion_id"]; isOneToOne: false; referencedRelation: "course_suggestions"; referencedColumns: ["id"] },
          { foreignKeyName: "suggestion_excerpts_submission_id_fkey"; columns: ["submission_id"]; isOneToOne: false; referencedRelation: "submissions"; referencedColumns: ["id"] },
        ]
      >;
    };
    Views: Record<string, never>;
    Functions: {
      course_by_join_code: { Args: { code: string }; Returns: CourseRow[] };
      course_students_stats: { Args: { c: string }; Returns: StudentStatsRow[] };
      count_lessons_started_today: { Args: { u: string; c: string; since: string }; Returns: number };
      course_usage: { Args: { c: string }; Returns: UsageSummaryRow[] };
      course_usage_by_kind: { Args: { c: string }; Returns: UsageByKindRow[] };
      course_updates: { Args: { c: string }; Returns: CourseUpdateRow[] };
      course_flashcard_signals: { Args: { c: string }; Returns: FlashcardSignalRow[] };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
