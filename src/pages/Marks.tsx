import { AppShell } from "@/components/AppShell";
import { EmptyHint, PageHeader } from "@/components/AcademicUI";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useAcademicData } from "@/hooks/use-academic-data";
import { computeSubjectMarks } from "@/lib/academic";
import { useMutation } from "convex/react";
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

export default function Marks() {
  const data = useAcademicData();
  const remove = useMutation(api.subjects.deleteAssessment);
  const [subjectId, setSubjectId] = useState<string>("");

  const subjects = useMemo(
    () => (data?.subjects ?? []).filter((s) => !s.archived).sort((a, b) => a.name.localeCompare(b.name)),
    [data],
  );

  const selected = subjectId || subjects[0]?._id || "";
  const marks = useMemo(
    () => (data && selected ? computeSubjectMarks(data.assessments, selected) : null),
    [data, selected],
  );

  const rows = useMemo(
    () =>
      (data?.assessments ?? [])
        .filter((a) => !a.deletedAt && a.subjectId === selected)
        .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")),
    [data, selected],
  );

  if (!data) {
    return (
      <AppShell title="Marks">
        <div className="space-y-3 pt-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </AppShell>
    );
  }

  if (subjects.length === 0) {
    return (
      <AppShell title="Marks">
        <PageHeader title="Marks" subtitle="Flexible, student-controlled assessments" />
        <EmptyHint>
          No subjects yet. <Link to="/subjects" className="underline underline-offset-2">Create a subject</Link> first —
          then record any quiz, assignment, practical or exam.
        </EmptyHint>
      </AppShell>
    );
  }

  return (
    <AppShell title="Marks">
      <PageHeader
        title="Marks"
        subtitle="Any assessment type, fully your choice"
        actions={
          <Link to={`/subjects/${selected}`}>
            <Button variant="outline" size="sm" className="h-8 rounded-lg">
              <Plus className="size-3.5" /> Add
            </Button>
          </Link>
        }
      />

      <select
        value={selected}
        onChange={(e) => setSubjectId(e.target.value)}
        className="mb-5 flex h-10 w-full rounded-lg border border-input bg-background px-3 text-[14px]"
      >
        {subjects.map((s) => (
          <option key={s._id} value={s._id}>{s.name}</option>
        ))}
      </select>

      {marks && marks.count > 0 ? (
        <>
          <div className="mb-5 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border/60 text-center">
            <div className="bg-card py-3.5">
              <p className="text-[18px] font-semibold tnum">{Math.round(marks.avgPct!)}%</p>
              <p className="text-[10.5px] text-muted-foreground">average</p>
            </div>
            <div className="bg-card py-3.5">
              <p className="text-[18px] font-semibold tnum">{Math.round(marks.highest!.pct)}%</p>
              <p className="text-[10.5px] text-muted-foreground">highest</p>
            </div>
            <div className="bg-card py-3.5">
              <p className="text-[18px] font-semibold tnum">{Math.round(marks.lowest!.pct)}%</p>
              <p className="text-[10.5px] text-muted-foreground">lowest</p>
            </div>
          </div>

          <p className="mb-2.5 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Trend
          </p>
          <TrendSpark data={rows.map((r) => (r.marksObtained / r.maxMarks) * 100).reverse()} />

          <p className="mb-2.5 mt-6 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            History ({marks.count})
          </p>
          <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card">
            {rows.map((a) => (
              <div key={a._id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium">{a.title}</p>
                  <p className="text-[11.5px] text-muted-foreground">
                    {[a.type, a.date].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span className="text-[13.5px] font-semibold tnum">
                  {a.marksObtained}/{a.maxMarks}
                </span>
                <button
                  type="button"
                  aria-label="Delete"
                  className="rounded-md p-1 text-muted-foreground active:opacity-60"
                  onClick={async () => {
                    await remove({ id: a._id });
                    toast("Assessment removed");
                  }}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <EmptyHint>
          No assessments for this subject yet. Tap “Add” — you choose the type, marks and
          notes.
        </EmptyHint>
      )}
    </AppShell>
  );
}

/** Tiny minimal sparkline (pure SVG, monochrome). */
function TrendSpark({ data }: { data: number[] }) {
  if (data.length < 2) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-[12px] text-muted-foreground">
        Need at least two assessments to draw a trend.
      </div>
    );
  }
  const w = 320;
  const h = 72;
  const pad = 6;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });
  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  const up = last >= prev;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-20 w-full">
        <polyline
          points={pts.join(" ")}
          fill="none"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          className="stroke-foreground"
        />
        {pts.map((p, i) => {
          const [x, y] = p.split(",");
          return <circle key={i} cx={x} cy={y} r={2.5} className="fill-foreground" />;
        })}
      </svg>
      <p className="mt-1.5 text-[12px] text-muted-foreground">
        {up ? "Trending up" : "Trending down"} — last {Math.round(last)}% vs {Math.round(prev)}% before
      </p>
    </div>
  );
}
