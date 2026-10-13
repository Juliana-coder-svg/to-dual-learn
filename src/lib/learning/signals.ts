import type { Feedback } from "@/lib/lessons/types";
import { plural } from "@/lib/utils/format";

/**
 * Сигналы пробела по ответам группы: чистая функция без модели.
 * Механика и пороги из docs/concepts/learning-course/concept.md (раздел 2 и блок «Сверка»),
 * прототип из prototype-spec.md (часть 1, шаг 2). Все пороги помечены там как оценка:
 * методист пересматривает их по тестовой группе и первым неделям пилота.
 *
 * Правила подсчёта (concept.md 2.1):
 * - «сдавший» урок: уникальный студент, в расчёт идёт его первая сдача без возражения;
 * - владелец курса и его тестовые сдачи исключаются (excludeUserIds);
 * - критерий разбора сопоставляется с критерием урока по позиции и тексту; если урок правили
 *   и текст не совпал, строка по этому критерию не учитывается.
 */

export const THRESHOLDS = {
  /** Урок попадает в разбор от 10 сдавших; меньше — состояние «Мало данных». */
  minSubmitters: 10,
  /** Сигнал 1, наблюдение: доля met = false по критерию. */
  criterionFailShare: 0.6,
  /** Сигнал 1, уровень «предложение» (идёт в модель во второй части): по размеру группы. */
  criterionProposal: [
    { minSubmitters: 30, share: 0.7 },
    { minSubmitters: 20, share: 0.75 },
    { minSubmitters: 10, share: 0.9 },
  ],
  /** Сигнал 3: возражений на урок, штук или доля сдавших. */
  objectionsMin: 3,
  objectionsShare: 0.15,
  /** Сигнал 4: одно и то же замечание наставника в improvements у доли сдавших. */
  repeatedImprovementShare: 0.4,
  /** Насколько похожи два замечания, чтобы считаться одним (Жаккар по основам слов). */
  improvementSimilarity: 0.2,
  /** Сигнал 2: доля «забыл» среди карточек, у которых первый круг пройден (старше 9 дней). */
  flashcardForgotShare: 0.3,
  flashcardFirstRoundForgotShare: 0.4,
  flashcardMinReviews: 8,
  /** Сигнал 5: средняя парная разница балла с соседними уроками. */
  scoreDipDelta: 0.8,
  scoreDipLastLessonDelta: 1.2,
  scoreDipMinPairs: 8,
  /** Сигнал 7: расхождение наставника с образцами преподавателя по тем же ответам. */
  calibrationGapSingle: 2,
  calibrationGapMean: 1,
  calibrationMinSamples: 3,
  /** В разбор идут не больше трёх сильнейших сигналов на курс. */
  maxSignalsPerCourse: 3,
} as const;

export interface SignalLesson {
  id: string;
  position: number;
  title: string;
  rubricCriteria: string[];
}

export interface SignalAnswer {
  id: string;
  lesson_id: string;
  user_id: string;
  answer: string;
  score: number;
  feedback: Feedback;
  objection: string | null;
  created_at: string;
}

/** Счётчики карточек урока по всем студентам (RPC course_flashcard_signals). */
export interface SignalFlashcardStats {
  lesson_id: string;
  reviewed: number;
  forgot: number;
  old_reviewed: number;
  old_forgot: number;
}

export interface SignalCalibrationSample {
  lesson_id: string | null;
  answer: string;
  score: number;
}

export interface SignalsInput {
  lessons: SignalLesson[];
  answers: SignalAnswer[];
  flashcards?: SignalFlashcardStats[];
  calibration?: SignalCalibrationSample[];
  /** Владелец курса и другие тестовые аккаунты: их сдачи не считаются. */
  excludeUserIds?: string[];
}

export type SignalKind = "criterion_failed" | "repeated_improvement" | "objections" | "flashcard_forgot" | "score_dip" | "calibration_gap";

export const SIGNAL_LABELS: Record<SignalKind, string> = {
  criterion_failed: "Критерий провален у большинства",
  repeated_improvement: "Одно и то же замечание в разборах",
  objections: "Возражения на оценку",
  flashcard_forgot: "Карточку забывают",
  score_dip: "Балл ниже соседних уроков",
  calibration_gap: "Наставник расходится с образцами преподавателя",
};

export interface Signal {
  kind: SignalKind;
  /** Урок + вид сигнала + номер критерия: signal_key предложения во второй части. */
  key: string;
  lessonId: string;
  lessonPosition: number;
  lessonTitle: string;
  /** observation — видно в таблице; proposal — достаточно сильный, чтобы идти в модель. */
  level: "observation" | "proposal";
  /** Для сортировки сильнейших: 0–1, чем больше, тем сильнее. */
  strength: number;
  /** Сколько сдавших (или пар, образцов) стоит за числом. */
  n: number;
  count: number;
  share: number;
  /** Фраза с числами для таблицы: «7 из 12 не выполнили критерий 2». */
  text: string;
  /** Что именно: текст критерия, замечание наставника, соседние уроки. */
  detail: string;
  criterionIndex?: number;
  /** Первые сдачи, где сигнал виден: источник выдержек для предложения. */
  submissionIds: string[];
}

export interface LessonSignalSummary {
  lessonId: string;
  position: number;
  title: string;
  /** Сдавших по правилу «первая сдача без возражения». */
  submitters: number;
  avgScore: number | null;
  objections: number;
  worstCriterion: { index: number; text: string; failed: number; of: number; share: number } | null;
  /** Строк разбора, где текст критерия не совпал с уроком (урок правили или модель перефразировала): они не учтены. */
  mismatched: number;
  /** У скольких возразивших балл после переоценки изменился: признак двоякого критерия, а не несогласия ради несогласия. */
  objectionsScoreChanged: number;
  enoughData: boolean;
  signals: Signal[];
}

export interface CourseSignals {
  lessons: LessonSignalSummary[];
  /** Хотя бы на одном уроке набралось minSubmitters сдавших. */
  enoughData: boolean;
  mostAnswered: { position: number; title: string; count: number } | null;
  /** Сильнейшие сигналы курса, не больше maxSignalsPerCourse; сначала уровня proposal. */
  top: Signal[];
}

interface LessonData {
  lesson: SignalLesson;
  /** user_id → первая сдача без возражения. */
  first: Map<string, SignalAnswer>;
  objectors: Set<string>;
}

function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

function round(x: number, digits = 2): number {
  const k = 10 ** digits;
  return Math.round(x * k) / k;
}

function pct(share: number): string {
  return `${Math.round(share * 100)}%`;
}

function collect(input: SignalsInput): LessonData[] {
  const excluded = new Set(input.excludeUserIds ?? []);
  const byLesson = new Map<string, LessonData>();
  for (const lesson of input.lessons) byLesson.set(lesson.id, { lesson, first: new Map(), objectors: new Set() });
  const sorted = [...input.answers].sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const a of sorted) {
    const d = byLesson.get(a.lesson_id);
    if (!d || excluded.has(a.user_id)) continue;
    if (a.objection) {
      d.objectors.add(a.user_id);
      continue;
    }
    if (!d.first.has(a.user_id)) d.first.set(a.user_id, a);
  }
  return [...byLesson.values()].sort((a, b) => a.lesson.position - b.lesson.position);
}

// ---------- сигнал 1: критерий провален у большинства ----------

interface CriterionStat {
  index: number;
  text: string;
  failed: number;
  of: number;
  share: number;
  failedIds: string[];
}

function criterionStats(d: LessonData): CriterionStat[] {
  return d.lesson.rubricCriteria.map((text, index) => {
    const want = normalize(text);
    let failed = 0;
    let of = 0;
    const failedIds: string[] = [];
    for (const a of d.first.values()) {
      const c = a.feedback.criteria[index];
      if (!c) continue;
      // Длина разбора равна длине рубрики: доверяем номеру, модель могла только перефразировать текст.
      // Длина другая (урок правили после ответа): без точного совпадения текста строку не берём.
      const sameShape = a.feedback.criteria.length === d.lesson.rubricCriteria.length;
      if (!sameShape && normalize(c.criterion) !== want) continue;
      of += 1;
      if (!c.met) {
        failed += 1;
        failedIds.push(a.id);
      }
    }
    return { index, text, failed, of, share: of > 0 ? failed / of : 0, failedIds };
  });
}

function criterionLevel(n: number, share: number, hasSecondSignal: boolean): Signal["level"] | null {
  if (share < THRESHOLDS.criterionFailShare) return null;
  for (const rule of THRESHOLDS.criterionProposal) {
    if (n >= rule.minSubmitters) return share >= rule.share || (rule.minSubmitters === 10 && hasSecondSignal) ? "proposal" : "observation";
  }
  return "observation";
}

/** У скольких возразивших после переоценки поменялось выполнение хотя бы одного критерия.
 *  Смена одного балла при тех же отметках met считается арифметикой наставника, а не двоякостью критерия. */
function scoreChangedAfterObjection(d: LessonData, answers: SignalAnswer[]): number {
  const mine = answers.filter((a) => a.lesson_id === d.lesson.id && d.objectors.has(a.user_id)).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const changed = new Set<string>();
  const last = new Map<string, boolean[]>();
  for (const a of mine) {
    const met = a.feedback.criteria.map((c) => c.met);
    const prev = last.get(a.user_id);
    if (a.objection && prev && (prev.length !== met.length || prev.some((m, i) => m !== met[i]))) changed.add(a.user_id);
    last.set(a.user_id, met);
  }
  return changed.size;
}

// ---------- сигнал 4: одно и то же замечание наставника ----------

const STOP = new Set(["это", "этот", "эта", "что", "как", "или", "для", "при", "его", "уже", "ещё", "еще", "где", "там", "так", "все", "всё", "чем", "тебе", "твой", "твоя", "твои", "своё", "свой", "свою", "ответ", "ответе", "ответа", "задач", "задаче", "задачи", "критер", "критерий", "критерию", "следующий", "следующем", "раз", "нужно", "стоит", "можно", "один", "одно", "одной"]);

/** Основы слов: срезаем окончания, чтобы «объясни» и «объяснения» считались одним словом. */
function stems(text: string): Set<string> {
  const out = new Set<string>();
  for (const w of normalize(text).replace(/[^a-zа-яё0-9\s-]/g, " ").split(/\s+/)) {
    if (w.length < 4) continue;
    const stem = w.length > 6 ? w.slice(0, 6) : w.length > 4 ? w.slice(0, -1) : w;
    if (STOP.has(w) || STOP.has(stem)) continue;
    out.add(stem);
  }
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  return inter / (a.size + b.size - inter);
}

interface ImprovementGroup {
  text: string;
  stems: Set<string>;
  users: Set<string>;
  submissionIds: Set<string>;
}

function groupImprovements(d: LessonData): ImprovementGroup[] {
  const groups: ImprovementGroup[] = [];
  for (const a of d.first.values()) {
    for (const item of a.feedback.improvements) {
      const s = stems(item);
      if (s.size === 0) continue;
      let best: ImprovementGroup | null = null;
      let bestSim = 0;
      for (const g of groups) {
        const sim = jaccard(s, g.stems);
        if (sim > bestSim) {
          bestSim = sim;
          best = g;
        }
      }
      if (best && bestSim >= THRESHOLDS.improvementSimilarity) {
        best.users.add(a.user_id);
        best.submissionIds.add(a.id);
        for (const x of s) best.stems.add(x);
      } else {
        groups.push({ text: item, stems: new Set(s), users: new Set([a.user_id]), submissionIds: new Set([a.id]) });
      }
    }
  }
  return groups.sort((x, y) => y.users.size - x.users.size);
}

// ---------- сигнал 5: балл ниже соседних ----------

function pairedDelta(a: LessonData, b: LessonData): { delta: number; pairs: number } {
  let sum = 0;
  let pairs = 0;
  for (const [user, s] of a.first) {
    const t = b.first.get(user);
    if (!t) continue;
    sum += s.score - t.score;
    pairs += 1;
  }
  return { delta: pairs > 0 ? sum / pairs : 0, pairs };
}

// ---------- сборка ----------

export function computeSignals(input: SignalsInput): CourseSignals {
  const data = collect(input);
  const flashcardsByLesson = new Map((input.flashcards ?? []).map((f) => [f.lesson_id, f]));
  const lessons: LessonSignalSummary[] = [];

  for (let i = 0; i < data.length; i += 1) {
    const d = data[i];
    const n = d.first.size;
    const firsts = [...d.first.values()];
    const avgScore = n > 0 ? round(firsts.reduce((s, a) => s + a.score, 0) / n, 1) : null;
    const stats = criterionStats(d);
    // Перефразированные моделью критерии учтены по номеру; здесь считаем, сколько их, чтобы методист видел масштаб.
    const mismatched = firsts.reduce((sum, a) => sum + a.feedback.criteria.filter((c, idx) => d.lesson.rubricCriteria[idx] !== undefined && normalize(c.criterion) !== normalize(d.lesson.rubricCriteria[idx])).length, 0);
    const objectionsScoreChanged = scoreChangedAfterObjection(d, input.answers);
    const worst = stats.filter((s) => s.of > 0).sort((x, y) => y.share - x.share)[0] ?? null;
    const enoughData = n >= THRESHOLDS.minSubmitters;
    const signals: Signal[] = [];
    const base = { lessonId: d.lesson.id, lessonPosition: d.lesson.position, lessonTitle: d.lesson.title };

    if (enoughData) {
      // Сигнал 3: возражения.
      const objections = d.objectors.size;
      const objectionShare = objections / n;
      const objectionSignal = objections >= THRESHOLDS.objectionsMin || objectionShare >= THRESHOLDS.objectionsShare;
      if (objectionSignal) {
        signals.push({
          ...base,
          kind: "objections",
          key: `${d.lesson.id}:objections`,
          level: "observation",
          strength: Math.min(1, objectionShare * 2),
          n,
          count: objections,
          share: round(objectionShare),
          text: `${plural(objections, "студент оспорил", "студента оспорили", "студентов оспорили")} оценку из ${n} сдавших`,
          detail: objectionsScoreChanged > 0
            ? `После переоценки поменялось выполнение критериев у ${objectionsScoreChanged} из ${objections}: наставник что-то пропустил или критерий двоякий`
            : "Выполнение критериев после переоценки не менялось: причина может быть в итоговом балле или в замечаниях, а не в критерии. Смотрите разборы",
          submissionIds: input.answers.filter((a) => a.lesson_id === d.lesson.id && a.objection && d.objectors.has(a.user_id)).map((a) => a.id),
        });
      }

      // Сигнал 4: одно и то же замечание наставника.
      const groups = groupImprovements(d);
      const topGroup = groups[0];
      const improvementSignal = topGroup && topGroup.users.size / n >= THRESHOLDS.repeatedImprovementShare;
      if (improvementSignal) {
        const share = topGroup.users.size / n;
        signals.push({
          ...base,
          kind: "repeated_improvement",
          key: `${d.lesson.id}:repeated_improvement`,
          level: "observation",
          strength: share,
          n,
          count: topGroup.users.size,
          share: round(share),
          text: `Похожее замечание наставника у ${topGroup.users.size} из ${n}`,
          detail: topGroup.text,
          submissionIds: [...topGroup.submissionIds],
        });
      }

      // Сигнал 1: критерий провален у большинства.
      // Вторым сигналом считаем только независимый: возражения студентов. Замечание наставника («то же замечание»)
      // берётся из того же разбора, что и провал критерия, поэтому уровень «предложение» не повышает (вердикт методиста).
      // Расхождение с образцами преподавателя тоже независимо, но в прототипе без модели считается только по совпавшим ответам.
      const hasSecondSignal = objectionSignal;
      for (const s of stats) {
        if (s.of < THRESHOLDS.minSubmitters) continue;
        const level = criterionLevel(s.of, s.share, hasSecondSignal);
        if (!level) continue;
        signals.push({
          ...base,
          kind: "criterion_failed",
          key: `${d.lesson.id}:criterion_failed:${s.index}`,
          level,
          strength: s.share,
          n: s.of,
          count: s.failed,
          share: round(s.share),
          criterionIndex: s.index,
          text: `${s.failed} из ${s.of} не выполнили критерий ${s.index + 1}`,
          detail: s.text,
          submissionIds: s.failedIds,
        });
      }

      // Сигнал 5: балл ниже соседних уроков (парное сравнение).
      const prev = data[i - 1];
      const next = data[i + 1];
      const isLast = i === data.length - 1;
      const neighbours = [prev, next].filter((x): x is LessonData => Boolean(x)).map((x) => ({ x, ...pairedDelta(d, x) }));
      const usable = neighbours.filter((nb) => nb.pairs >= THRESHOLDS.scoreDipMinPairs);
      const threshold = isLast ? THRESHOLDS.scoreDipLastLessonDelta : THRESHOLDS.scoreDipDelta;
      if (usable.length > 0 && usable.length === neighbours.length && usable.every((nb) => nb.delta <= -threshold)) {
        const worstDelta = Math.min(...usable.map((nb) => nb.delta));
        signals.push({
          ...base,
          kind: "score_dip",
          key: `${d.lesson.id}:score_dip`,
          level: "observation",
          strength: Math.min(1, Math.abs(worstDelta) / 2),
          n: Math.min(...usable.map((nb) => nb.pairs)),
          count: Math.min(...usable.map((nb) => nb.pairs)),
          share: round(Math.abs(worstDelta)),
          text: `Балл ниже соседних уроков на ${Math.abs(worstDelta).toFixed(1).replace(".", ",")} у тех же студентов`,
          detail: usable.map((nb) => `урок ${nb.x.lesson.position}: ${nb.delta.toFixed(1).replace(".", ",")} по ${plural(nb.pairs, "паре", "парам", "парам")}`).join("; "),
          submissionIds: firsts.filter((a) => a.score <= 2).map((a) => a.id),
        });
      }

      // Сигнал 2: карточку забывают.
      const f = flashcardsByLesson.get(d.lesson.id);
      if (f) {
        const old = f.old_reviewed >= THRESHOLDS.flashcardMinReviews ? f.old_forgot / f.old_reviewed : null;
        const firstRound = f.reviewed >= THRESHOLDS.flashcardMinReviews ? f.forgot / f.reviewed : null;
        if (old !== null && old >= THRESHOLDS.flashcardForgotShare) {
          signals.push({
            ...base,
            kind: "flashcard_forgot",
            key: `${d.lesson.id}:flashcard_forgot`,
            level: "observation",
            strength: old,
            n: f.old_reviewed,
            count: f.old_forgot,
            share: round(old),
            text: `«Забыл» у ${pct(old)} карточек после первого круга (${f.old_forgot} из ${f.old_reviewed})`,
            detail: "Мысль урока не закрепилась: нужна карточка на применение к новой ситуации или сильнее опора в уроке",
            submissionIds: [],
          });
        } else if (firstRound !== null && firstRound >= THRESHOLDS.flashcardFirstRoundForgotShare) {
          signals.push({
            ...base,
            kind: "flashcard_forgot",
            key: `${d.lesson.id}:flashcard_forgot`,
            level: "observation",
            strength: firstRound * 0.7,
            n: f.reviewed,
            count: f.forgot,
            share: round(firstRound),
            text: `«Забыл» у ${pct(firstRound)} карточек на первом круге (${f.forgot} из ${f.reviewed})`,
            detail: "Карточка, вероятно, спрашивает то, чего в уроке не было, или ответ слишком длинный для припоминания",
            submissionIds: [],
          });
        }
      }

      // Сигнал 7: расхождение наставника с образцами преподавателя. Без модели сравниваем только
      // образцы, чей текст совпадает с ответом студента: преподаватель оценил тот же ответ.
      const byAnswer = new Map<string, SignalAnswer>();
      for (const a of input.answers) if (a.lesson_id === d.lesson.id && !a.objection) byAnswer.set(normalize(a.answer), a);
      const diffs: Array<{ diff: number; id: string }> = [];
      for (const s of input.calibration ?? []) {
        if (s.lesson_id !== d.lesson.id) continue;
        const a = byAnswer.get(normalize(s.answer));
        if (a) diffs.push({ diff: Math.abs(a.score - s.score), id: a.id });
      }
      if (diffs.length > 0) {
        const mean = diffs.reduce((s, x) => s + x.diff, 0) / diffs.length;
        const single = diffs.some((x) => x.diff >= THRESHOLDS.calibrationGapSingle);
        if (single || (diffs.length >= THRESHOLDS.calibrationMinSamples && mean >= THRESHOLDS.calibrationGapMean)) {
          signals.push({
            ...base,
            kind: "calibration_gap",
            key: `${d.lesson.id}:calibration_gap`,
            level: "observation",
            strength: Math.min(1, mean / 2),
            n: diffs.length,
            count: diffs.filter((x) => x.diff >= 1).length,
            share: round(mean),
            text: `Наставник расходится с преподавателем в среднем на ${mean.toFixed(1).replace(".", ",")} балла по ${plural(diffs.length, "образцу", "образцам", "образцам")}`,
            detail: "Пока наставник измеряет не то, что преподаватель, остальные сигналы по уроку ненадёжны: только уточнение критерия",
            submissionIds: diffs.filter((x) => x.diff >= 1).map((x) => x.id),
          });
        }
      }
    }

    lessons.push({
      lessonId: d.lesson.id,
      position: d.lesson.position,
      title: d.lesson.title,
      submitters: n,
      avgScore,
      objections: d.objectors.size,
      mismatched,
      objectionsScoreChanged,
      worstCriterion: worst ? { index: worst.index, text: worst.text, failed: worst.failed, of: worst.of, share: round(worst.share) } : null,
      enoughData,
      signals: signals.sort((a, b) => b.strength - a.strength),
    });
  }

  const most = lessons.reduce<LessonSignalSummary | null>((acc, l) => (l.submitters > (acc?.submitters ?? -1) ? l : acc), null);
  const top = lessons
    .flatMap((l) => l.signals)
    .sort((a, b) => (a.level === b.level ? b.strength - a.strength : a.level === "proposal" ? -1 : 1))
    .slice(0, THRESHOLDS.maxSignalsPerCourse);

  return {
    lessons,
    enoughData: lessons.some((l) => l.enoughData),
    mostAnswered: most && most.submitters > 0 ? { position: most.position, title: most.title, count: most.submitters } : null,
    top,
  };
}
