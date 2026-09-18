import { AppShell } from "@/components/AppShell";
import { EmptyHint, PageHeader, Ring } from "@/components/AcademicUI";
import { MarkAttendanceDialog } from "@/components/MarkAttendanceDialog";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAcademicData } from "@/hooks/use-academic-data";
import {
  attendanceSimulator,
  computeSubjectAttendance,
  overallAttendance,
  todayStr,
} from "@/lib/academic";
import { useMutation } from "convex/react";
import { CalendarClock, Check, ChevronRight, Minus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

const STATUSES = ["present", "absent", "leave", "cancelled"] as const;
type StatusKey = (typeof STATUSES)[number];

const STATUS_LABEL: Record<StatusKey, string> = {
  present: "P",
  absent: "A",
  leave: "L",
  cancelled: "C",
};

export default function Attendance() {
  const data = useAcademicData();
  const mark = useMutation(api.schedule.markAttendance);
  const [simAttend, setSimAttend] = useState(10);
  const [simMiss, setSimMiss] = useState(0);
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [markTarget, setMarkTarget] = useState<{
    date?: string;
    subjectId?: Id<"subjects"> | null;
  } | null>(null);

  const overall = data ? overallAttendance(data) : null;

  const subjects = useMemo(
    () => (data?.subjects ?? []).filter((s) => !s.archived).sort((a, b) => a.name.localeCompare(b.name)),
    [data],
  );

  const history = useMemo(() => {
    if (!data) return [];
    return data.attendance
      .filter((a) => !a.deletedAt)
      .filter((a) => subjectFilter === "all" || a.subjectId === subjectFilter)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [data, subjectFilter]);

  if (!data || !overall) {
    return (
      <AppShell title="Attendance">
        <div className="space-y-3 pt-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </AppShell>
    );
  }

  const sim = attendanceSimulator(
    data.attendance,
    Math.max(0, simAttend),
    Math.max(0, simMiss),
  );

  return (
    <AppShell title="Attendance">
      <PageHeader
        title="Attendance"
        subtitle={
          overall.pctValue !== null
            ? `${overall.present + overall.leave} of ${overall.total} classes · target 75%`
            : "Record real classes to compute your percentage"
        }
        actions={
          <Button
            variant="outline"
            className="h-9 rounded-full px-3 text-[12.5px]"
            onClick={() => setMarkTarget({ date: undefined, subjectId: null })}
          >
            <CalendarClock className="size-4" />
            Past date
          </Button>
        }
      />

      {/* Overall */}
      <div className="mb-6 flex items-center gap-5 rounded-xl border border-border bg-card p-4">
        <Ring value={overall.pctValue} size={86} stroke={8} />
        <div className="min-w-0 flex-1">
          {overall.pctValue === null ? (
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Not enough data. Mark present / absent below and your percentage, safe bunks
              and streaks appear here.
            </p>
          ) : (
            <>
              <p className="text-[15px] font-semibold">
                {overall.pctValue >= 75 ? "Above target" : "Below 75% target"}
              </p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                {overall.pctValue >= 75
                  ? `You can miss ${overall.safeBunks} more classes and stay ≥ 75%.`
                  : `Attend ${overall.needToAttend} more classes to cross 75%.`}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Simulator */}
      <section className="mb-6 rounded-xl border border-border bg-card p-4">
        <p className="mb-3 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Attendance simulator
        </p>
        {overall.pctValue === null ? (
          <EmptyHint>Add at least one attendance record to use the simulator.</EmptyHint>
        ) : (
          <>
            <div className="flex items-end justify-between">
              <div className="flex-1 pr-3">
                <p className="mb-1 text-[11px] text-muted-foreground">Attend next</p>
                <input
                  type="range"
                  min={0}
                  max={30}
                  value={simAttend}
                  onChange={(e) => setSimAttend(Number(e.target.value))}
                  className="w-full accent-foreground"
                />
                <p className="mt-0.5 text-[13px] font-medium tnum">{simAttend} classes</p>
              </div>
              <div className="flex-1">
                <p className="mb-1 text-[11px] text-muted-foreground">Miss next</p>
                <input
                  type="range"
                  min={0}
                  max={30}
                  value={simMiss}
                  onChange={(e) => setSimMiss(Number(e.target.value))}
                  className="w-full accent-foreground"
                />
                <p className="mt-0.5 text-[13px] font-medium tnum">{simMiss} classes</p>
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between border-t border-border/60 pt-3">
              <span className="text-[13px] text-muted-foreground">Projected percentage</span>
              <span className="text-[18px] font-semibold tnum">{Math.round(sim!)}%</span>
            </div>
            <p className="mt-1 text-[11.5px] text-muted-foreground">
              {sim! >= 75 ? "Still above the 75% target." : "This would drop you below 75%."}
            </p>
          </>
        )}
      </section>

      {/* Per subject */}
      <section className="mb-6">
        <p className="mb-2.5 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          By subject
        </p>
        {subjects.length === 0 ? (
          <EmptyHint>
            No subjects yet. <Link to="/subjects" className="underline underline-offset-2">Create one</Link> to start tracking attendance.
          </EmptyHint>
        ) : (
          <div className="space-y-3">
            {subjects.map((s) => {
              const att = computeSubjectAttendance(
                data.attendance.filter((a) => a.subjectId === s._id),
              );
              return (
                <div key={s._id} className="rounded-xl border border-border bg-card p-4">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <Link to={`/subjects/${s._id}`} className="min-w-0">
                      <p className="truncate text-[14.5px] font-semibold">{s.name}</p>
                      <p className="text-[11.5px] text-muted-foreground tnum">
                        {att.total > 0
                          ? `${att.present + att.leave}/${att.total} · ${att.pctValue !== null ? Math.round(att.pctValue) : "—"}% · ${att.safeBunks} safe bunks`
                          : "No records yet"}
                      </p>
                    </Link>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        aria-label={`Mark ${s.name} for a past date`}
                        className="rounded-md border border-border p-1.5 text-muted-foreground active:opacity-60"
                        onClick={() => setMarkTarget({ date: undefined, subjectId: s._id })}
                      >
                        <CalendarClock className="size-3.5" />
                      </button>
                      {att.pctValue !== null && (
                        <span className="rounded-md border border-border px-2 py-1 text-[11px] font-medium tnum">
                          {Math.round(att.pctValue)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {STATUSES.map((st) => (
                      <button
                        key={st}
                        type="button"
                        className={`flex h-9 items-center justify-center gap-1 rounded-lg border text-[12px] font-medium active:opacity-70 ${
                          st === "present" ? "border-foreground/50" : "border-border text-muted-foreground"
                        }`}
                        onClick={async () => {
                          await mark({ subjectId: s._id, date: todayStr(), status: st });
                          toast(`${s.name}: ${st} today`);
                        }}
                      >
                        {STATUS_LABEL[st]}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* History */}
      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Recent history
          </p>
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="h-8 rounded-lg border border-input bg-background px-2 text-[12px]"
          >
            <option value="all">All subjects</option>
            {subjects.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
        </div>
        {history.length === 0 ? (
          <EmptyHint>No records{subjectFilter !== "all" ? " for this subject" : " yet"}.</EmptyHint>
        ) : (
          <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card">
            {history.slice(0, 25).map((a) => {
              const subject = data.subjects.find((s) => s._id === a.subjectId);
              const isPresent = a.status === "present" || a.status === "leave";
              return (
                <button
                  key={a._id}
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left active:bg-muted/50"
                  onClick={() =>
                    setMarkTarget({ date: a.date, subjectId: a.subjectId })
                  }
                >
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-md border text-[11px] font-semibold ${
                      a.status === "cancelled"
                        ? "border-border text-muted-foreground"
                        : isPresent
                          ? "border-foreground/50 text-foreground"
                          : "border-border text-muted-foreground line-through"
                    }`}
                  >
                    {isPresent ? <Check className="size-3.5" /> : a.status === "cancelled" ? <Minus className="size-3.5" /> : <X className="size-3.5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium">{subject?.name ?? "Subject"}</p>
                    <p className="text-[11px] text-muted-foreground tnum">
                      {a.date}
                      {a.isCorrection ? " · corrected" : ""}
                    </p>
                  </div>
                  <span className="text-[12px] capitalize text-muted-foreground">{a.status}</span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />
                </button>
              );
            })}
          </div>
        )}
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          Tap any record to correct or remove it — even for past dates.
        </p>
      </section>

      <MarkAttendanceDialog
        open={markTarget !== null}
        onOpenChange={(v) => !v && setMarkTarget(null)}
        subjects={subjects}
        attendance={data.attendance}
        initialDate={markTarget?.date}
        initialSubjectId={markTarget?.subjectId ?? null}
      />
    </AppShell>
  );
}
