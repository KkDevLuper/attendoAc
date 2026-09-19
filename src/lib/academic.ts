import type { Doc } from "@/convex/_generated/dataModel";

export interface AllData {
  subjects: Doc<"subjects">[];
  chapters: Doc<"chapters">[];
  topics: Doc<"topics">[];
  assessments: Doc<"assessments">[];
  slots: Doc<"timetableSlots">[];
  attendance: Doc<"attendance">[];
  events: Doc<"calendarEvents">[];
  sessions: Doc<"studySessions">[];
  goals: Doc<"goals">[];
  notes: Doc<"notes">[];
  bookmarks: Doc<"bookmarks">[];
  semesters: Doc<"semesters">[];
  semesterCourses: Doc<"semesterCourses">[];
  reminders: Doc<"reminders">[];
  milestones: Doc<"milestones">[];
  activity: Doc<"activity">[];
}

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DAY_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const EVENT_TYPE_LABEL: Record<string, string> = {
  semester_start: "Semester start",
  semester_end: "Semester end",
  exam: "Exam",
  result: "Result",
  college_event: "College event",
  govt_holiday: "Government holiday",
  festival: "Festival holiday",
  college_holiday: "College holiday",
  personal_leave: "Personal leave",
};

/** Fixed-date public holidays offered as one-tap presets in the Calendar. */
export const GOVT_HOLIDAY_PRESETS: { name: string; month: number; day: number }[] = [
  { name: "New Year's Day", month: 1, day: 1 },
  { name: "Republic Day", month: 1, day: 26 },
  { name: "Labour Day", month: 5, day: 1 },
  { name: "Independence Day", month: 8, day: 15 },
  { name: "Gandhi Jayanti", month: 10, day: 2 },
  { name: "Christmas", month: 12, day: 25 },
];

// ---------- date helpers ----------

export function todayStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function daysBetween(a: string, b: string): number {
  const A = parseDate(a).getTime();
  const B = parseDate(b).getTime();
  return Math.round((B - A) / 86400000);
}

export function minutesToHM(min: number): string {
  if (!min) return "0m";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h ? `${h}h ${m ? `${m}m` : ""}`.trim() : `${m}m`;
}

export function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m ?? 0).padStart(2, "0")} ${ampm}`;
}

export function pct(n: number): string {
  return `${Math.round(n)}%`;
}

// ---------- live / scheduled classes ----------

export interface SlotView extends Doc<"timetableSlots"> {
  subjectName: string;
  subjectCode?: string;
  color?: string;
}

export interface DaySchedule {
  date: string;
  day: number;
  slots: SlotView[];
}

export function buildSchedule(data: AllData): DaySchedule[] {
  const subjectMap = new Map(data.subjects.map((s) => [s._id, s]));
  const out: DaySchedule[] = [];
  for (let day = 0; day < 7; day++) {
    const slots = data.slots
      .filter((s) => !s.deletedAt && s.day === day)
      .map((s) => {
        const subj = subjectMap.get(s.subjectId);
        return {
          ...s,
          subjectName: subj?.name ?? "Unknown",
          subjectCode: subj?.code,
          color: subj?.color,
        };
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    out.push({ date: "", day, slots });
  }
  return out;
}

export function daySchedule(data: AllData, date: string): SlotView[] {
  const d = parseDate(date).getDay();
  const day = buildSchedule(data).find((x) => x.day === d);
  // If a class was cancelled on this date, drop it from "scheduled" view
  const cancelled = new Set(
    data.attendance
      .filter((a) => !a.deletedAt && a.date === date && a.status === "cancelled")
      .map((a) => `${a.subjectId}|${a.slotId ?? ""}`),
  );
  return (day?.slots ?? []).filter(
    (s) => !cancelled.has(`${s.subjectId}|${s._id}`) && !cancelled.has(`${s.subjectId}|`),
  );
}

export function nextClassInfo(data: AllData, now = new Date()) {
  const sched = buildSchedule(data);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (let offset = 0; offset < 8; offset++) {
    const d = new Date(now);
    d.setDate(now.getDate() + offset);
    const dateStr = todayStr(d);
    const slots = sched[d.getDay()].slots.filter((s) => {
      const cancelled = data.attendance.some(
        (a) =>
          !a.deletedAt &&
          a.date === dateStr &&
          a.status === "cancelled" &&
          (a.slotId ? a.slotId === s._id : true),
      );
      return !cancelled;
    });
    const [eh, em] = (slots[slots.length - 1]?.endTime ?? "00:00").split(":").map(Number);
    if (offset === 0 && slots.length) {
      const lastEnd = (eh ?? 0) * 60 + (em ?? 0);
      if (nowMin > lastEnd) continue; // day over
    }
    for (const s of slots) {
      const [sh, sm] = s.startTime.split(":").map(Number);
      const start = (sh ?? 0) * 60 + (sm ?? 0);
      const [eh2, em2] = s.endTime.split(":").map(Number);
      const end = (eh2 ?? 0) * 60 + (em2 ?? 0);
      if (offset === 0 && end <= nowMin) continue;
      if (offset === 0 && start <= nowMin) {
        return { date: dateStr, slot: s, status: "current" as const, offset };
      }
      if (start > nowMin || offset > 0) {
        return { date: dateStr, slot: s, status: "upcoming" as const, offset };
      }
    }
  }
  return null;
}

export function currentClassInfo(data: AllData, now = new Date()) {
  const info = nextClassInfo(data, now);
  return info && info.status === "current" ? info : null;
}

// ---------- attendance ----------

export interface SubjectAttendance {
  total: number;
  present: number;
  absent: number;
  leave: number;
  cancelled: number;
  pctValue: number | null; // null = not enough data
  safeBunks: number; // classes can still miss while >= 75%
  needToAttend: number; // classes to attend consecutively to reach 75%
}

export function computeSubjectAttendance(
  records: Doc<"attendance">[],
): SubjectAttendance {
  const live = records.filter((r) => !r.deletedAt);
  const present = live.filter((r) => r.status === "present").length;
  const absent = live.filter((r) => r.status === "absent").length;
  const leave = live.filter((r) => r.status === "leave").length;
  const cancelled = live.filter((r) => r.status === "cancelled").length;
  const total = present + absent + leave; // conducted & attended-relevant
  const pctValue = total > 0 ? ((present + leave) / total) * 100 : null;
  const safeBunks = pctValue === null ? 0 : Math.max(0, Math.floor((present + leave) / 0.75) - total);
  // x solves (present + x) / (total + x) = 0.75  →  x = (0.75·total − present) / 0.25
  const needToAttend =
    pctValue === null || pctValue >= 75
      ? 0
      : Math.ceil((0.75 * total - (present + leave)) / 0.25);
  return { total, present, absent, leave, cancelled, pctValue, safeBunks, needToAttend };
}

export function overallAttendance(data: AllData): SubjectAttendance {
  return computeSubjectAttendance(data.attendance);
}

export function attendanceSimulator(
  records: Doc<"attendance">[],
  attend: number,
  miss: number,
): number | null {
  const a = computeSubjectAttendance(records);
  if (a.pctValue === null) return null;
  const present = a.present + attend;
  const total = a.total + attend + miss;
  return total > 0 ? (present / total) * 100 : null;
}

// ---------- syllabus ----------

export interface SubjectSyllabus {
  totalChapters: number;
  doneChapters: number;
  totalTopics: number;
  doneTopics: number;
  pendingTopics: number;
  pctValue: number | null;
  lastStudied: number | null;
  revisionsDone: number;
  revisionsPending: number;
  starredTopics: Doc<"topics">[];
}

export function computeSubjectSyllabus(
  chapters: Doc<"chapters">[],
  topics: Doc<"topics">[],
  subjectId: string,
): SubjectSyllabus {
  const ch = chapters.filter((c) => c.subjectId === subjectId && !c.deletedAt);
  const tp = topics.filter((t) => t.subjectId === subjectId && !t.deletedAt);
  const doneChapters = ch.filter((c) => c.status === "done").length;
  const doneTopics = tp.filter((t) => t.status === "done").length;
  const units = ch.length + tp.length;
  const pctValue = units === 0 ? null : Math.round(((doneChapters + doneTopics) / units) * 100);
  const lastStudied = tp
    .filter((t) => t.status === "done" && t.completedAt)
    .reduce<number | null>((acc, t) => Math.max(acc ?? 0, t.completedAt ?? 0), null);
  const revisions: { status: string; revisionCount?: number }[] = [...ch, ...tp];
  const revisionsDone = revisions.reduce((acc, x) => acc + (x.revisionCount ?? 0), 0);
  const doneNotRevised = revisions.filter(
    (x) => x.status === "done" && !(x.revisionCount ?? 0),
  ).length;
  return {
    totalChapters: ch.length,
    doneChapters,
    totalTopics: tp.length,
    doneTopics,
    pendingTopics: tp.length - doneTopics,
    pctValue,
    lastStudied,
    revisionsDone,
    revisionsPending: doneNotRevised,
    starredTopics: tp.filter((t) => t.starred),
  };
}

// ---------- marks ----------

export interface SubjectMarks {
  count: number;
  avgPct: number | null;
  highest: { label: string; pct: number } | null;
  lowest: { label: string; pct: number } | null;
  totalObtained: number;
  totalMax: number;
  overallPct: number | null;
}

export function computeSubjectMarks(
  assessments: Doc<"assessments">[],
  subjectId: string,
): SubjectMarks {
  const rows = assessments
    .filter((a) => a.subjectId === subjectId && !a.deletedAt)
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  if (!rows.length) {
    return { count: 0, avgPct: null, highest: null, lowest: null, totalObtained: 0, totalMax: 0, overallPct: null };
  }
  const pcts = rows.map((r) => (r.marksObtained / r.maxMarks) * 100);
  const avg = pcts.reduce((a, b) => a + b, 0) / rows.length;
  let hi = 0;
  let lo = 0;
  rows.forEach((r, i) => {
    if (pcts[i] > pcts[hi]) hi = i;
    if (pcts[i] < pcts[lo]) lo = i;
  });
  const totalObtained = rows.reduce((a, r) => a + r.marksObtained, 0);
  const totalMax = rows.reduce((a, r) => a + r.maxMarks, 0);
  return {
    count: rows.length,
    avgPct: avg,
    highest: { label: rows[hi].title, pct: pcts[hi] },
    lowest: { label: rows[lo].title, pct: pcts[lo] },
    totalObtained,
    totalMax,
    overallPct: totalMax > 0 ? (totalObtained / totalMax) * 100 : null,
  };
}

// ---------- study ----------

export function subjectStudyMinutes(data: AllData, subjectId: string): number {
  return data.sessions
    .filter((s) => !s.deletedAt && s.subjectId === subjectId)
    .reduce((a, s) => a + s.durationMin, 0);
}

export function totalStudyMinutes(data: AllData): number {
  return data.sessions.filter((s) => !s.deletedAt).reduce((a, s) => a + s.durationMin, 0);
}

// ---------- academic intelligence (scores) ----------

export type Insufficient = "not_enough_data";

export interface SubjectScores {
  performance: number | null;
  health: number | null;
  completion: number | null;
  readiness: number | null;
  signals: string[];
}

export function computeScores(
  attendance: SubjectAttendance,
  syllabus: SubjectSyllabus,
  marks: SubjectMarks,
  studyMin: number,
  examDate?: string,
  now = new Date(),
): SubjectScores {
  const signals: string[] = [];
  let perfParts: number[] = [];
  let perfWeight = 0;
  if (marks.avgPct !== null) {
    perfParts.push(marks.avgPct);
    perfWeight += 1;
  }
  if (attendance.pctValue !== null) {
    perfParts.push(Math.min(100, (attendance.pctValue / 75) * 100));
    perfWeight += 1;
  }
  const performance = perfWeight > 0 ? perfParts.reduce((a, b) => a + b, 0) / perfWeight : null;
  if (marks.avgPct === null) signals.push("No marks recorded yet");
  if (attendance.pctValue === null) signals.push("No attendance recorded yet");

  const syll = syllabus.pctValue;
  const studyDays = studyMin > 0 ? 1 : 0;
  const hasStudy = studyMin >= 30;
  const hasSyllabus = syll !== null;
  const revisionRatio =
    syllabus.revisionsDone + syllabus.revisionsPending > 0
      ? syllabus.revisionsDone / (syllabus.revisionsDone + syllabus.revisionsPending)
      : null;

  // Health: broad wellness across everything we know (0-100), null when nothing at all
  const healthParts: { v: number; w: number }[] = [];
  if (attendance.pctValue !== null) healthParts.push({ v: Math.min(100, (attendance.pctValue / 75) * 100), w: 0.3 });
  if (syll !== null) healthParts.push({ v: syll, w: 0.3 });
  if (marks.avgPct !== null) healthParts.push({ v: marks.avgPct, w: 0.25 });
  if (hasStudy) healthParts.push({ v: Math.min(100, (studyMin / 600) * 100), w: 0.15 });
  const health =
    healthParts.length >= 2
      ? healthParts.reduce((a, p) => a + p.v * p.w, 0) / healthParts.reduce((a, p) => a + p.w, 0)
      : null;

  const completion = syll; // completion score = syllabus completion
  const readinessParts: { v: number; w: number }[] = [];
  if (syll !== null) readinessParts.push({ v: syll, w: 0.45 });
  if (marks.avgPct !== null) readinessParts.push({ v: marks.avgPct, w: 0.35 });
  if (revisionRatio !== null) readinessParts.push({ v: revisionRatio * 100, w: 0.2 });
  const readiness = readinessParts.length >= 2 ? readinessParts.reduce((a, p) => a + p.v * p.w, 0) / readinessParts.reduce((a, p) => a + p.w, 0) : null;

  if (!hasSyllabus) signals.push("Syllabus not added yet");
  if (!hasStudy) signals.push("No study sessions logged");
  if (examDate && daysBetween(todayStr(now), examDate) <= 14 && readiness === null) {
    signals.push("Exam soon — add syllabus & marks to see readiness");
  }
  void studyDays;
  return { performance, health, completion, readiness, signals };
}

// ---------- calendar / heatmap ----------

export type HeatLevel = "none" | "high" | "medium" | "low" | "off";

export function attendanceHeatmap(data: AllData, monthStart: Date, monthEnd: Date) {
  const map = new Map<string, HeatLevel>();
  const byDate = new Map<string, Doc<"attendance">[]>();
  for (const a of data.attendance.filter((x) => !x.deletedAt)) {
    const arr = byDate.get(a.date) ?? [];
    arr.push(a);
    byDate.set(a.date, arr);
  }
  const events = new Map(data.events.filter((e) => !e.deletedAt).map((e) => [e.date, e]));
  for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
    const ds = todayStr(d);
    const recs = byDate.get(ds) ?? [];
    if (recs.length === 0) {
      const ev = events.get(ds);
      if (ev && ["govt_holiday", "festival", "college_holiday", "personal_leave", "semester_end"].includes(ev.type)) {
        map.set(ds, "off");
      } else if (d.getDay() === 0) {
        map.set(ds, "off");
      } else {
        map.set(ds, "none");
      }
      continue;
    }
    const present = recs.filter((r) => r.status === "present" || r.status === "leave").length;
    const relevant = recs.filter((r) => r.status !== "cancelled").length;
    const ratio = relevant ? present / relevant : 1;
    map.set(ds, ratio >= 0.9 ? "high" : ratio >= 0.5 ? "medium" : "low");
  }
  return map;
}

export interface Streaks {
  currentPresent: number;
  longestPresent: number;
  currentMiss: number;
}

export function computeStreaks(data: AllData): Streaks {
  const byDate = new Map<string, { p: number; m: number }>();
  for (const a of data.attendance.filter((x) => !x.deletedAt && x.status !== "cancelled")) {
    const cur = byDate.get(a.date) ?? { p: 0, m: 0 };
    if (a.status === "present" || a.status === "leave") cur.p++;
    else if (a.status === "absent") cur.m++;
    byDate.set(a.date, cur);
  }
  const dates = [...byDate.keys()].sort();
  let currentPresent = 0;
  let longestPresent = 0;
  let currentMiss = 0;
  let runP = 0;
  let runM = 0;
  let prev: string | null = null;
  for (const d of dates) {
    const { p, m } = byDate.get(d)!;
    const gap = prev ? daysBetween(prev, d) : 0;
    if (gap > 1) {
      runP = 0;
      runM = 0;
    }
    if (m > 0 && p === 0) {
      runM++;
      runP = 0;
    } else if (p > 0) {
      runP++;
      runM = 0;
      longestPresent = Math.max(longestPresent, runP);
    }
    prev = d;
  }
  // current streaks counted from the most recent recorded day backwards
  for (let i = dates.length - 1; i >= 0; i--) {
    const { p, m } = byDate.get(dates[i])!;
    if (i === dates.length - 1) {
      if (p > 0) currentPresent = 1;
      if (m > 0 && p === 0) currentMiss = 1;
      continue;
    }
    if (currentPresent > 0 && p > 0) currentPresent++;
    else if (currentPresent > 0) break;
    if (currentMiss > 0 && m > 0 && p === 0) currentMiss++;
    else if (currentMiss > 0) break;
  }
  return { currentPresent, longestPresent, currentMiss };
}

// ---------- CGPA ----------

export interface GpaSummary {
  cgpa: number | null;
  completedSgpa: { name: string; sgpa: number; credits: number }[];
  target: { needed: number | null; withCredits: number } | null;
}

export function computeGpa(data: AllData): GpaSummary {
  const sems = data.semesters
    .filter((s) => !s.deletedAt)
    .sort((a, b) => a.order - b.order);
  const completed: { name: string; sgpa: number; credits: number }[] = [];
  for (const sem of sems) {
    const courses = data.semesterCourses.filter(
      (c) => c.semesterId === sem._id && !c.deletedAt,
    );
    if (!courses.length) continue;
    const credits = courses.reduce((a, c) => a + c.credits, 0);
    const points = courses.reduce((a, c) => a + c.gradePoint * c.credits, 0);
    if (credits > 0) completed.push({ name: sem.name, sgpa: points / credits, credits });
  }
  const totalCredits = completed.reduce((a, s) => a + s.credits, 0);
  const totalPoints = completed.reduce((a, s) => a + s.sgpa * s.credits, 0);
  const cgpa = totalCredits > 0 ? totalPoints / totalCredits : null;
  return { cgpa, completedSgpa: completed, target: null };
}

export function targetCgpa(
  completed: { sgpa: number; credits: number }[],
  target: number,
  futureCredits: number,
): number | null {
  const totalCredits = completed.reduce((a, s) => a + s.credits, 0);
  const totalPoints = completed.reduce((a, s) => a + s.sgpa * s.credits, 0);
  if (futureCredits <= 0) return null;
  return (target * (totalCredits + futureCredits) - totalPoints) / futureCredits;
}

// ---------- alerts ----------

export interface Alert {
  kind: "danger" | "warning" | "info";
  title: string;
  body: string;
}

export function computeAlerts(data: AllData, now = new Date()): Alert[] {
  const alerts: Alert[] = [];
  for (const s of data.subjects.filter((x) => !x.archived)) {
    const att = computeSubjectAttendance(
      data.attendance.filter((a) => a.subjectId === s._id),
    );
    if (att.pctValue !== null && att.pctValue < 75) {
      alerts.push({
        kind: "danger",
        title: `${s.name} attendance below 75%`,
        body: `${Math.round(att.pctValue)}% — attend ${att.needToAttend} classes to recover`,
      });
    }
    const marks = computeSubjectMarks(data.assessments, s._id);
    if (marks.avgPct !== null && marks.avgPct < 40) {
      alerts.push({
        kind: "warning",
        title: `${s.name} marks average low`,
        body: `${Math.round(marks.avgPct)}% average across ${marks.count} assessments`,
      });
    }
    if (s.examDate) {
      const d = daysBetween(todayStr(now), s.examDate);
      if (d >= 0 && d <= 7) {
        alerts.push({
          kind: d <= 2 ? "danger" : "warning",
          title: `${s.name} exam in ${d === 0 ? "less than a day" : `${d} day${d === 1 ? "" : "s"}`}`,
          body: "Check exam readiness and pending topics",
        });
      }
    }
  }
  const pendRev = [...data.chapters, ...data.topics].filter(
    (x) => !x.deletedAt && x.status === "done" && !(x.revisionCount ?? 0),
  ).length;
  if (pendRev > 0) {
    alerts.push({
      kind: "info",
      title: `${pendRev} completed item${pendRev === 1 ? "" : "s"} never revised`,
      body: "Start a revision to lock it in",
    });
  }
  return alerts.slice(0, 6);
}
