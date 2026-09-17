import { AppShell } from "@/components/AppShell";
import { EmptyHint, MiniBar, PageHeader } from "@/components/AcademicUI";
import { useAcademicData } from "@/hooks/use-academic-data";
import {
  computeSubjectAttendance,
  computeSubjectMarks,
  computeStreaks,
  minutesToHM,
  overallAttendance,
  totalStudyMinutes,
} from "@/lib/academic";
import { Link } from "react-router";
import { useMemo } from "react";

export default function Analytics() {
  const data = useAcademicData();

  const report = useMemo(() => {
    if (!data) return null;
    const overall = overallAttendance(data);
    const subjects = data.subjects.filter((s) => !s.archived);

    const subjectRows = subjects.map((s) => {
      const att = computeSubjectAttendance(data.attendance.filter((a) => a.subjectId === s._id));
      const marks = computeSubjectMarks(data.assessments, s._id);
      return { subject: s, att, marks };
    });

    const strong = [...subjectRows]
      .filter((r) => r.marks.avgPct !== null)
      .sort((a, b) => (b.marks.avgPct! - a.marks.avgPct!));
    const weak = [...subjectRows]
      .filter((r) => r.att.pctValue !== null || r.marks.avgPct !== null)
      .sort(
        (a, b) =>
          (a.marks.avgPct ?? 100) - (b.marks.avgPct ?? 100) ||
          (a.att.pctValue ?? 100) - (b.att.pctValue ?? 100),
      );

    // weekly study bars (last 6 weeks)
    const weeks: { label: string; min: number }[] = [];
    for (let w = 5; w >= 0; w--) {
      const start = new Date();
      start.setDate(start.getDate() - start.getDay() - w * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const min = data.sessions
        .filter((s) => {
          if (s.deletedAt) return false;
          const d = new Date(s.date + "T00:00:00");
          return d >= start && d <= end;
        })
        .reduce((a, s) => a + s.durationMin, 0);
      weeks.push({ label: `W${6 - w}`, min });
    }

    const streaks = computeStreaks(data);
    const goalsDone = data.goals.filter((g) => !g.deletedAt && g.done).length;
    const goalsTotal = data.goals.filter((g) => !g.deletedAt).length;

    return { overall, subjectRows, strong: strong.slice(0, 2), weak: weak.slice(0, 2), weeks, streaks, goalsDone, goalsTotal };
  }, [data]);

  if (!data || !report) {
    return (
      <AppShell title="Analytics">
        <div className="space-y-3 pt-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </AppShell>
    );
  }

  const r = report;

  return (
    <AppShell title="Analytics">
      <PageHeader
        title="Analytics"
        subtitle="What your data says — no invented numbers"
      />

      {/* Attendance report */}
      <section className="mb-6">
        <p className="mb-2.5 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Attendance overview
        </p>
        {r.overall.pctValue === null ? (
          <EmptyHint>
            No attendance data yet.{" "}
            <Link to="/attendance" className="underline underline-offset-2">Record classes</Link> to see trends.
          </EmptyHint>
        ) : (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-baseline justify-between py-1">
              <span className="text-[13px] text-muted-foreground">Overall</span>
              <span className="text-[13px] font-medium tnum">{Math.round(r.overall.pctValue)}%</span>
            </div>
            <div className="flex items-baseline justify-between border-t border-border/60 py-1">
              <span className="text-[13px] text-muted-foreground">vs 75% target</span>
              <span className="text-[13px] font-medium tnum">
                {r.overall.pctValue >= 75 ? `+${Math.round(r.overall.pctValue - 75)}` : Math.round(r.overall.pctValue - 75)} pts
              </span>
            </div>
            <div className="flex items-baseline justify-between border-t border-border/60 py-1">
              <span className="text-[13px] text-muted-foreground">Present streak</span>
              <span className="text-[13px] font-medium tnum">{r.streaks.currentPresent}d (best {r.streaks.longestPresent}d)</span>
            </div>
          </div>
        )}
      </section>

      {/* Strong / weak areas */}
      <section className="mb-6">
        <p className="mb-2.5 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Areas
        </p>
        {r.strong.length === 0 && r.weak.length === 0 ? (
          <EmptyHint>Add marks or attendance per subject to identify strong and weak areas.</EmptyHint>
        ) : (
          <div className="space-y-3">
            {r.strong.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="mb-2 text-[12px] font-medium">Strong areas</p>
                {r.strong.map(({ subject, marks }) => (
                  <div key={subject._id} className="flex items-baseline justify-between py-1">
                    <span className="truncate text-[13px]">{subject.name}</span>
                    <span className="text-[13px] font-medium tnum">{Math.round(marks.avgPct!)}%</span>
                  </div>
                ))}
              </div>
            )}
            {r.weak.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="mb-2 text-[12px] font-medium">Needs attention</p>
                {r.weak.map(({ subject, att, marks }) => (
                  <Link key={subject._id} to={`/subjects/${subject._id}`} className="flex items-baseline justify-between py-1">
                    <span className="truncate text-[13px]">{subject.name}</span>
                    <span className="text-[13px] font-medium tnum">
                      {marks.avgPct !== null ? `${Math.round(marks.avgPct)}%` : att.pctValue !== null ? `${Math.round(att.pctValue)}% att` : "—"}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Study weeks */}
      <section className="mb-6">
        <p className="mb-2.5 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Study time · last 6 weeks
        </p>
        {r.weeks.every((w) => w.min === 0) ? (
          <EmptyHint>
            No study sessions yet.{" "}
            <Link to="/study" className="underline underline-offset-2">Log your first session</Link>.
          </EmptyHint>
        ) : (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex h-28 items-end gap-3">
              {r.weeks.map((w, i) => {
                const max = Math.max(1, ...r.weeks.map((x) => x.min));
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="text-[9.5px] tnum text-muted-foreground">{Math.round(w.min / 60) || ""}</span>
                    <div
                      className="w-full rounded-md bg-foreground/80"
                      style={{ height: `${Math.max(3, (w.min / max) * 88)}px` }}
                      title={minutesToHM(w.min)}
                    />
                    <span className="text-[10px] text-muted-foreground">{w.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Productivity */}
      <section className="mb-6">
        <p className="mb-2.5 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Productivity
        </p>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-baseline justify-between py-1">
            <span className="text-[13px] text-muted-foreground">Goals completed</span>
            <span className="text-[13px] font-medium tnum">
              {r.goalsTotal === 0 ? "—" : `${r.goalsDone}/${r.goalsTotal}`}
            </span>
          </div>
          <div className="flex items-baseline justify-between border-t border-border/60 py-1">
            <span className="text-[13px] text-muted-foreground">Total study time</span>
            <span className="text-[13px] font-medium tnum">{minutesToHM(totalStudyMinutes(data))}</span>
          </div>
          <div className="flex items-baseline justify-between border-t border-border/60 py-1">
            <span className="text-[13px] text-muted-foreground">Study sessions</span>
            <span className="text-[13px] font-medium tnum">
              {data.sessions.filter((s) => !s.deletedAt).length}
            </span>
          </div>
        </div>
      </section>

      {/* Per-subject comparison */}
      <section>
        <p className="mb-2.5 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Subject comparison
        </p>
        {r.subjectRows.length === 0 ? (
          <EmptyHint>No subjects yet.</EmptyHint>
        ) : (
          <div className="space-y-2.5">
            {r.subjectRows.map(({ subject, att, marks }) => (
              <div key={subject._id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-baseline justify-between">
                  <p className="truncate text-[14px] font-medium">{subject.name}</p>
                  <span className="text-[12px] text-muted-foreground">
                    {marks.avgPct !== null ? `${Math.round(marks.avgPct)}% marks` : "no marks"}
                  </span>
                </div>
                <div className="mt-2.5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-[10px] uppercase tracking-wider text-muted-foreground">Attend</span>
                    <MiniBar value={att.pctValue} />
                    <span className="w-9 text-right text-[11px] tnum">{att.pctValue !== null ? `${Math.round(att.pctValue)}%` : "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-[10px] uppercase tracking-wider text-muted-foreground">Marks</span>
                    <MiniBar value={marks.avgPct} />
                    <span className="w-9 text-right text-[11px] tnum">{marks.avgPct !== null ? `${Math.round(marks.avgPct)}%` : "—"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
