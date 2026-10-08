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
  user_id: string;
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
      lessons: Table<LessonRow, "id" | "created_at" | "status" | "review">;
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
    };
    Views: Record<string, never>;
    Functions: {
      course_by_join_code: { Args: { code: string }; Returns: CourseRow[] };
      course_students_stats: { Args: { c: string }; Returns: StudentStatsRow[] };
      count_lessons_started_today: { Args: { u: string; c: string; since: string }; Returns: number };
      course_usage: { Args: { c: string }; Returns: UsageSummaryRow[] };
      course_usage_by_kind: { Args: { c: string }; Returns: UsageByKindRow[] };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
