import { AppShell } from "@/components/AppShell";
import { EmptyHint, MiniBar, PageHeader, Ring } from "@/components/AcademicUI";
import { useAuth } from "@/hooks/use-auth";
import { useAcademicData } from "@/hooks/use-academic-data";
import {
  computeAlerts,
  computeGpa,
  computeStreaks,
  computeSubjectAttendance,
  computeSubjectSyllabus,
  DAY_LONG,
  DAY_NAMES,
  daySchedule,
  nextClassInfo,
  overallAttendance,
  to12h,
  todayStr,
  totalStudyMinutes,
  minutesToHM,
  buildSchedule,
} from "@/lib/academic";
import { Link } from "react-router";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock,
  Flame,
  Info,
} from "lucide-react";
import { useMemo } from "react";

export default function Dashboard() {
  const { user } = useAuth();
  const data = useAcademicData();

  const now = new Date();
  const today = todayStr(now);

  const stats = useMemo(() => {
    if (!data) return null;
    const overall = overallAttendance(data);
    const allChapters = data.chapters.filter((c) => !c.deletedAt);
    const allTopics = data.topics.filter((t) => !t.deletedAt);
    const units = allChapters.length + allTopics.length;
    const doneUnits =
      allChapters.filter((c) => c.status === "done").length +
      allTopics.filter((t) => t.status === "done").length;
    const syllPct = units ? Math.round((doneUnits / units) * 100) : null;
    const gpa = computeGpa(data);
    const todaySlots = daySchedule(data, today);
    const next = nextClassInfo(data, now);
    const streaks = computeStreaks(data);
    const alerts = computeAlerts(data, now);
    const sessionsToday = data.sessions.filter((s) => !s.deletedAt && s.date === today);
    const studyToday = sessionsToday.reduce((a, s) => a + s.durationMin, 0);
    const studyTotal = totalStudyMinutes(data);
    const goalsToday = data.goals.filter((g) => !g.deletedAt && g.scope === "daily");
    const exams = data.subjects
      .filter((s) => !s.archived && s.examDate)
      .map((s) => ({ subject: s, days: Math.round((new Date(s.examDate!).getTime() - new Date(today).getTime()) / 86400000) }))
      .filter((e) => e.days >= 0 && e.days <= 30)
      .sort((a, b) => a.days - b.days);
    return {
      overall, syllPct, gpa, todaySlots, next, streaks, alerts,
      studyToday, studyTotal, goalsToday, exams,
      pendingTopics: allTopics.filter((t) => t.status === "pending").length,
    };
  }, [data, today]);

  if (!data || !stats) {
    return (
      <AppShell title="Scholar">
        <div className="space-y-3 pt-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </AppShell>
    );
  }

  const s = stats;
  const firstName = (user?.name ?? "").split(" ")[0] || "there";

  return (
    <AppShell title="Scholar">
      <PageHeader
        title={`Good ${greeting()}, ${firstName}`}
        subtitle={fullDate(now)}
      />

      {/* Today's classes */}
      <section>
        <SectionLabel>Today · {DAY_LONG[now.getDay()]}</SectionLabel>
        {s.todaySlots.length === 0 ? (
          <EmptyHint>
            No classes scheduled today.{" "}
            <Link to="/timetable" className="underline underline-offset-2">
              Build your timetable
            </Link>
          </EmptyHint>
        ) : (
          <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card">
            {s.todaySlots.slice(0, 4).map((slot) => {
              const nowMin = now.getHours() * 60 + now.getMinutes();
              const [sh, sm] = slot.startTime.split(":").map(Number);
              const [eh, em] = slot.endTime.split(":").map(Number);
              const start = sh * 60 + sm;
              const end = eh * 60 + em;
              const state = end <= nowMin ? "past" : start <= nowMin ? "now" : "upcoming";
              return (
                <div key={slot._id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-14 shrink-0 text-[12px] tnum text-muted-foreground">
                    {to12h(slot.startTime).replace(":00", "")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-[14px] font-medium ${state === "past" ? "text-muted-foreground line-through decoration-border" : ""}`}>
                      {slot.subjectName}
                    </p>
                    <p className="text-[11.5px] text-muted-foreground">
                      {[slot.room, slot.classType].filter(Boolean).join(" · ") || "Class"}
                    </p>
                  </div>
                  {state === "now" && (
                    <span className="rounded-full border border-foreground/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
                      Now
                    </span>
                  )}
                </div>
              );
            })}
            {s.todaySlots.length > 4 && (
              <Link to="/timetable" className="block px-4 py-2.5 text-[12px] text-muted-foreground">
                +{s.todaySlots.length - 4} more classes today
              </Link>
            )}
          </div>
        )}
        {s.next && (
          <Link
            to="/timetable"
            className="mt-2 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
          >
            <span className="text-[12.5px] text-muted-foreground">
              Next class · {s.next.offset === 0 ? "today" : DAY_NAMES[parseDay(s.next.date)]}{" "}
              {to12h(s.next.slot.startTime)}
            </span>
            <span className="text-[13px] font-medium">{s.next.slot.subjectName}</span>
          </Link>
        )}
      </section>

      {/* Key numbers */}
      <section className="mt-7">
        <SectionLabel>Where you stand</SectionLabel>
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border/60">
          <div className="flex flex-col items-center gap-2 bg-card px-2 py-4">
            <Ring value={s.overall.pctValue} size={58} stroke={5} />
            <span className="text-[10.5px] text-muted-foreground">Attendance</span>
          </div>
          <div className="flex flex-col items-center gap-2 bg-card px-2 py-4">
            <Ring value={s.syllPct} size={58} stroke={5} />
            <span className="text-[10.5px] text-muted-foreground">Syllabus</span>
          </div>
          <div className="flex flex-col items-center gap-2 bg-card px-2 py-4">
            <Ring value={s.gpa.cgpa !== null ? (s.gpa.cgpa / 10) * 100 : null} size={58} stroke={5} />
            <span className="text-[10.5px] text-muted-foreground">
              {s.gpa.cgpa !== null ? `CGPA ${s.gpa.cgpa.toFixed(2)}` : "CGPA"}
            </span>
          </div>
        </div>
      </section>

      {/* Study + goals row */}
      <section className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            <Clock className="size-3.5" /> Studied today
          </div>
          <p className="mt-2 text-[20px] font-semibold tnum">{minutesToHM(s.studyToday)}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {minutesToHM(s.studyTotal)} all time
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            <Flame className="size-3.5" /> Streaks
          </div>
          <p className="mt-2 text-[20px] font-semibold tnum">
            {s.streaks.currentPresent}d
            <span className="text-[13px] font-normal text-muted-foreground"> present</span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            best {s.streaks.longestPresent}d
          </p>
        </div>
      </section>

      {/* Daily goals */}
      <section className="mt-7">
        <div className="flex items-center justify-between">
          <SectionLabel>Today's goals</SectionLabel>
          <Link to="/study" className="text-[12px] text-muted-foreground">
            All tasks
          </Link>
        </div>
        {s.goalsToday.length === 0 ? (
          <EmptyHint>
            No daily goals yet.{" "}
            <Link to="/study" className="underline underline-offset-2">
              Plan today
            </Link>
          </EmptyHint>
        ) : (
          <div className="space-y-1.5">
            {s.goalsToday.slice(0, 4).map((g) => (
              <div key={g._id} className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5">
                {g.done ? (
                  <CheckCircle2 className="size-4 shrink-0" />
                ) : (
                  <span className="size-4 shrink-0 rounded-full border border-border" />
                )}
                <span className={`text-[13.5px] ${g.done ? "text-muted-foreground line-through" : ""}`}>
                  {g.title}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Alerts */}
      {s.alerts.length > 0 && (
        <section className="mt-7">
          <SectionLabel>Needs attention</SectionLabel>
          <div className="space-y-2">
            {s.alerts.slice(0, 3).map((a, i) => (
              <Link
                to="/notifications"
                key={i}
                className="flex items-start gap-2.5 rounded-xl border border-border bg-card px-4 py-3"
              >
                {a.kind === "danger" ? (
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-foreground" />
                ) : a.kind === "warning" ? (
                  <Bell className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                ) : (
                  <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                )}
                <div>
                  <p className="text-[13.5px] font-medium leading-snug">{a.title}</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">{a.body}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Exams */}
      {s.exams.length > 0 && (
        <section className="mt-7">
          <SectionLabel>Upcoming exams</SectionLabel>
          <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card">
            {s.exams.slice(0, 3).map(({ subject, days }) => (
              <Link
                to={`/subjects/${subject._id}`}
                key={subject._id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div>
                  <p className="text-[14px] font-medium">{subject.name}</p>
                  <p className="text-[11.5px] text-muted-foreground">
                    {new Date(subject.examDate!).toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <span className="text-[13px] tnum text-muted-foreground">
                  {days === 0 ? "today" : `${days}d`}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Pending + quick links */}
      <section className="mt-7 grid grid-cols-2 gap-3">
        <Link to="/syllabus" className="rounded-xl border border-border bg-card p-4 active:opacity-80">
          <p className="text-[20px] font-semibold tnum">{s.pendingTopics}</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">pending topics</p>
        </Link>
        <Link to="/attendance" className="rounded-xl border border-border bg-card p-4 active:opacity-80">
          <p className="text-[20px] font-semibold tnum">{s.overall.safeBunks}</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">safe bunks left</p>
        </Link>
      </section>

      <section className="mt-7 mb-2">
        <SectionLabel>Jump back in</SectionLabel>
        <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card">
          {[
            { to: "/attendance", label: "Mark attendance" },
            { to: "/study", label: "Log a study session" },
            { to: "/marks", label: "Record marks" },
            { to: "/analytics", label: "See full analytics" },
          ].map((l) => (
            <Link key={l.to} to={l.to} className="flex items-center justify-between px-4 py-3.5">
              <span className="text-[14px]">{l.label}</span>
              <ArrowRight className="size-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2.5 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
      {children}
    </p>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "night";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function fullDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function parseDay(dateStr: string) {
  return new Date(dateStr + "T00:00:00").getDay();
}
