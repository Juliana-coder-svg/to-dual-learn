/** Типы схемы Postgres (type, не interface: supabase-js требует Record<string, unknown>) из supabase/migrations/0001_init.sql, написаны вручную
 *  (генерация через `supabase gen types` требует CLI). При изменении миграции править здесь же. */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Role = "teacher" | "student";
export type LessonStatus = "draft" | "published";

export type ProfileRow = {
  id: string;
  email: string;
  name: string;
  role: Role;
  created_at: string;
  streak: number;
  last_lesson_at: string | null;
  xp: number;
}

export type CourseRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  audience: string;
  join_code: string;
  created_at: string;
}

export type MaterialRow = {
  id: string;
  course_id: string;
  filename: string;
  kind: string;
  content_text: string;
  char_count: number;
  created_at: string;
}

export type LessonRow = {
  id: string;
  course_id: string;
  position: number;
  title: string;
  concept: string;
  content: Json;
  status: LessonStatus;
  created_at: string;
}

export type EnrollmentRow = {
  user_id: string;
  course_id: string;
  joined_at: string;
}

export type SubmissionRow = {
  id: string;
  lesson_id: string;
  user_id: string;
  answer: string;
  score: number;
  feedback: Json;
  created_at: string;
}

export type FlashcardRow = {
  id: string;
  user_id: string;
  lesson_id: string;
  next_due_at: string;
  round: number;
  last_quality: string | null;
  created_at: string;
}

export type GenerationRow = {
  id: string;
  course_id: string;
  user_id: string;
  kind: string;
  prompt: string;
  output: string;
  created_at: string;
}

export type ChatMessageRow = {
  id: string;
  course_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export type HomeworkCheckRow = {
  id: string;
  course_id: string;
  user_id: string;
  task: string;
  criteria: string;
  results: Json;
  created_at: string;
}

export type StudentStatsRow = {
  user_id: string;
  name: string;
  email: string;
  streak: number;
  xp: number;
  completed: number;
  avg_score: number | null;
  joined_at: string;
}

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
      profiles: Table<ProfileRow, "created_at" | "streak" | "last_lesson_at" | "xp" | "role">;
      courses: Table<CourseRow, "id" | "created_at" | "description" | "audience">;
      materials: Table<MaterialRow, "id" | "created_at">;
      lessons: Table<LessonRow, "id" | "created_at" | "status">;
      enrollments: Table<EnrollmentRow, "joined_at">;
      submissions: Table<
        SubmissionRow,
        "id" | "created_at",
        [
          { foreignKeyName: "submissions_lesson_id_fkey"; columns: ["lesson_id"]; isOneToOne: false; referencedRelation: "lessons"; referencedColumns: ["id"] },
          { foreignKeyName: "submissions_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      >;
      flashcards: Table<
        FlashcardRow,
        "id" | "created_at" | "round" | "last_quality",
        [
          { foreignKeyName: "flashcards_lesson_id_fkey"; columns: ["lesson_id"]; isOneToOne: false; referencedRelation: "lessons"; referencedColumns: ["id"] },
        ]
      >;
      generations: Table<GenerationRow, "id" | "created_at">;
      chat_messages: Table<ChatMessageRow, "id" | "created_at">;
      homework_checks: Table<HomeworkCheckRow, "id" | "created_at">;
    };
    Views: Record<string, never>;
    Functions: {
      course_by_join_code: { Args: { code: string }; Returns: CourseRow[] };
      course_students_stats: { Args: { c: string }; Returns: StudentStatsRow[] };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
