import { AppShell } from "@/components/AppShell";
import { EmptyHint, PageHeader } from "@/components/AcademicUI";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAcademicData } from "@/hooks/use-academic-data";
import { SessionDialog } from "@/pages/SubjectDetail";
import { useMutation } from "convex/react";
import {
  computeSubjectSyllabus,
  minutesToHM,
  subjectStudyMinutes,
  todayStr,
  to12h,
} from "@/lib/academic";
import { Check, Plus, Timer, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

export default function Study() {
  const data = useAcademicData();
  const createSession = useMutation(api.productivity.createSession);
  const createGoal = useMutation(api.productivity.createGoal);
  const toggleGoal = useMutation(api.productivity.toggleGoal);
  const deleteGoal = useMutation(api.productivity.deleteGoal);
  const deleteSession = useMutation(api.productivity.deleteSession);

  const [sessionOpen, setSessionOpen] = useState(
    () => new URLSearchParams(window.location.search).get("log") === "1",
  );
  const [goalOpen, setGoalOpen] = useState(
    () => new URLSearchParams(window.location.search).get("add") === "1",
  );
  const [goalTitle, setGoalTitle] = useState("");
  const [goalScope, setGoalScope] = useState("daily");
  const [goalSubject, setGoalSubject] = useState("");
  const [goalDue, setGoalDue] = useState("");

  const today = todayStr();

  const stats = useMemo(() => {
    if (!data) return null;
    const sessions = data.sessions.filter((s) => !s.deletedAt);
    const total = sessions.reduce((a, s) => a + s.durationMin, 0);
    const todayMin = sessions.filter((s) => s.date === today).reduce((a, s) => a + s.durationMin, 0);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    const weekMin = sessions
      .filter((s) => new Date(s.date + "T00:00:00") >= weekStart)
      .reduce((a, s) => a + s.durationMin, 0);
    // last 7 days bars
    const bars: { day: string; min: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = todayStr(d);
      bars.push({
        day: ["S", "M", "T", "W", "T", "F", "S"][d.getDay()],
        min: sessions.filter((s) => s.date === ds).reduce((a, s) => a + s.durationMin, 0),
      });
    }
    return { total, todayMin, weekMin, bars, count: sessions.length };
  }, [data, today]);

  const goals = useMemo(
    () => (data?.goals ?? []).filter((g) => !g.deletedAt),
    [data],
  );

  if (!data || !stats) {
    return (
      <AppShell title="Study">
        <div className="space-y-3 pt-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </AppShell>
    );
  }

  const maxBar = Math.max(1, ...stats.bars.map((b) => b.min));
  const subjects = data.subjects.filter((s) => !s.archived);
  const recent = data.sessions
    .filter((s) => !s.deletedAt)
    .sort((a, b) => (b.date + b.endTime).localeCompare(a.date + a.endTime))
    .slice(0, 12);

  return (
    <AppShell
      title="Study & Goals"
      actions={
        <Button variant="ghost" size="icon" className="size-9 rounded-full" aria-label="Log session" onClick={() => setSessionOpen(true)}>
          <Timer className="size-[18px]" strokeWidth={1.75} />
        </Button>
      }
    >
      <PageHeader
        title="Study & Goals"
        subtitle={`${minutesToHM(stats.total)} logged · ${stats.count} sessions`}
        actions={
          <Button size="sm" className="h-9 rounded-lg px-3" onClick={() => setGoalOpen(true)}>
            <Plus className="size-4" /> Goal
          </Button>
        }
      />

      {/* Totals */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">Today</p>
          <p className="mt-1.5 text-[20px] font-semibold tnum">{minutesToHM(stats.todayMin)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">Last 7 days</p>
          <p className="mt-1.5 text-[20px] font-semibold tnum">{minutesToHM(stats.weekMin)}</p>
        </div>
      </div>

      {/* Weekly bars */}
      <section className="mb-6 rounded-xl border border-border bg-card p-4">
        <p className="mb-3 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Last 7 days
        </p>
        <div className="flex h-24 items-end gap-2.5">
          {stats.bars.map((b, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className="w-full rounded-md bg-foreground/80 transition-all"
                style={{ height: `${Math.max(3, (b.min / maxBar) * 76)}px` }}
                title={minutesToHM(b.min)}
              />
              <span className="text-[10px] text-muted-foreground">{b.day}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Goals */}
      <section className="mb-6">
        <p className="mb-2.5 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Goals & tasks
        </p>
        {goals.length === 0 ? (
          <EmptyHint>
            No goals yet. Create daily, weekly, subject-wise or semester goals to build the
            habit.
          </EmptyHint>
        ) : (
          <div className="space-y-2">
            {(["daily", "weekly", "subject", "semester"] as const).map((scope) => {
              const list = goals.filter((g) => g.scope === scope);
              if (!list.length) return null;
              return (
                <div key={scope}>
                  <p className="mb-1.5 text-[11px] capitalize text-muted-foreground">{scope}</p>
                  <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card">
                    {list.map((g) => {
                      const subject = data.subjects.find((s) => s._id === g.subjectId);
                      return (
                        <div key={g._id} className="flex items-center gap-3 px-4 py-2.5">
                          <button
                            type="button"
                            aria-label={g.done ? "Reopen" : "Complete"}
                            onClick={() => toggleGoal({ id: g._id, done: !g.done })}
                            className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                              g.done ? "border-foreground bg-foreground text-background" : "border-border"
                            }`}
                          >
                            {g.done && <Check className="size-3" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className={`truncate text-[13.5px] ${g.done ? "text-muted-foreground line-through" : ""}`}>
                              {g.title}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {[subject?.name, g.dueDate].filter(Boolean).join(" · ") || scope}
                            </p>
                          </div>
                          <button
                            type="button"
                            aria-label="Delete goal"
                            className="rounded-md p-1 text-muted-foreground active:opacity-60"
                            onClick={() => deleteGoal({ id: g._id })}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Per-subject study time */}
      <section className="mb-6">
        <p className="mb-2.5 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          By subject
        </p>
        {subjects.length === 0 ? (
          <EmptyHint>
            <Link to="/subjects" className="underline underline-offset-2">Add subjects</Link> to
            attribute study time.
          </EmptyHint>
        ) : (
          <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card">
            {subjects.map((s) => {
              const min = subjectStudyMinutes(data, s._id);
              const syll = computeSubjectSyllabus(data.chapters, data.topics, s._id);
              return (
                <Link key={s._id} to={`/subjects/${s._id}`} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium">{s.name}</p>
                    <p className="text-[11px] text-muted-foreground tnum">
                      {syll.pctValue !== null ? `${syll.pctValue}% syllabus` : "no syllabus data"}
                    </p>
                  </div>
                  <span className="text-[13px] font-medium tnum">{minutesToHM(min)}</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent sessions */}
      <section>
        <p className="mb-2.5 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Recent sessions
        </p>
        {recent.length === 0 ? (
          <EmptyHint>
            No sessions yet.{" "}
            <button type="button" className="underline underline-offset-2" onClick={() => setSessionOpen(true)}>
              Log the first one
            </button>
          </EmptyHint>
        ) : (
          <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card">
            {recent.map((s) => {
              const subject = data.subjects.find((x) => x._id === s.subjectId);
              return (
                <div key={s._id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium">
                      {subject?.name ?? "General study"}
                    </p>
                    <p className="text-[11px] text-muted-foreground tnum">
                      {[s.date, s.type, `${to12h(s.startTime)}–${to12h(s.endTime)}`].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className="text-[13px] font-medium tnum">{minutesToHM(s.durationMin)}</span>
                  <button
                    type="button"
                    aria-label="Delete session"
                    className="rounded-md p-1 text-muted-foreground active:opacity-60"
                    onClick={() => deleteSession({ id: s._id })}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <SessionDialog
        open={sessionOpen}
        onOpenChange={setSessionOpen}
        onSubmit={async (v) => {
          await createSession(v);
          setSessionOpen(false);
          toast("Session logged");
        }}
      />

      {/* Goal dialog */}
      <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[16px]">New goal</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3.5 pb-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!goalTitle.trim()) {
                toast.error("Give the goal a title");
                return;
              }
              await createGoal({
                title: goalTitle.trim(),
                scope: goalScope,
                subjectId: (goalSubject || undefined) as Id<"subjects"> | undefined,
                dueDate: goalDue || undefined,
              });
              setGoalTitle("");
              setGoalOpen(false);
              toast("Goal created");
            }}
          >
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">Title *</Label>
              <Input value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} placeholder="Finish chapter 4" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">Scope</Label>
                <select
                  value={goalScope}
                  onChange={(e) => setGoalScope(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-[14px]"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="subject">Subject-wise</option>
                  <option value="semester">Semester</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">Due date</Label>
                <Input value={goalDue} onChange={(e) => setGoalDue(e.target.value)} type="date" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">Subject (optional)</Label>
              <select
                value={goalSubject}
                onChange={(e) => setGoalSubject(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-[14px]"
              >
                <option value="">None</option>
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>
            <Button type="submit" className="h-11 w-full rounded-xl">Create goal</Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

