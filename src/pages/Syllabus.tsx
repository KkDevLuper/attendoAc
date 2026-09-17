import { AppShell } from "@/components/AppShell";
import { EmptyHint, MiniBar, PageHeader, Ring } from "@/components/AcademicUI";
import { useAcademicData } from "@/hooks/use-academic-data";
import { computeSubjectSyllabus } from "@/lib/academic";
import { Link } from "react-router";
import { useMemo, useState } from "react";

export default function Syllabus() {
  const data = useAcademicData();
  const [showMilestones, setShowMilestones] = useState(true);

  const subjects = useMemo(
    () => (data?.subjects ?? []).filter((s) => !s.archived).sort((a, b) => a.name.localeCompare(b.name)),
    [data],
  );

  const totals = useMemo(() => {
    if (!data) return null;
    const chapters = data.chapters.filter((c) => !c.deletedAt);
    const topics = data.topics.filter((t) => !t.deletedAt);
    const units = chapters.length + topics.length;
    const done =
      chapters.filter((c) => c.status === "done").length +
      topics.filter((t) => t.status === "done").length;
    const pendingRevisions = [...chapters, ...topics].filter(
      (x) => x.status === "done" && !(x.revisionCount ?? 0),
    ).length;
    return {
      pct: units ? Math.round((done / units) * 100) : null,
      chapters: chapters.length,
      doneChapters: chapters.filter((c) => c.status === "done").length,
      topics: topics.length,
      doneTopics: topics.filter((t) => t.status === "done").length,
      pendingRevisions,
    };
  }, [data]);

  const milestones = useMemo(
    () => (data?.milestones ?? []).filter((m) => m.type === "syllabus").sort((a, b) => b.at - a.at),
    [data],
  );

  if (!data || !totals) {
    return (
      <AppShell title="Syllabus">
        <div className="space-y-3 pt-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Syllabus">
      <PageHeader
        title="Syllabus & Preparation"
        subtitle="Chapters and topics across every subject"
      />

      <div className="mb-6 flex items-center gap-5 rounded-xl border border-border bg-card p-4">
        <Ring value={totals.pct} size={86} stroke={8} />
        <div>
          {totals.pct === null ? (
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              No syllabus yet. Open a subject and add chapters — completion, milestones and
              readiness unlock from there.
            </p>
          ) : (
            <>
              <p className="text-[15px] font-semibold">{totals.pct}% complete</p>
              <p className="mt-1 text-[12.5px] text-muted-foreground tnum">
                {totals.doneChapters}/{totals.chapters} chapters · {totals.doneTopics}/{totals.topics} topics
              </p>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                {totals.pendingRevisions} completed item{totals.pendingRevisions === 1 ? "" : "s"} never revised
              </p>
            </>
          )}
        </div>
      </div>

      {/* Per subject */}
      <section className="mb-6">
        <p className="mb-2.5 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          By subject
        </p>
        {subjects.length === 0 ? (
          <EmptyHint>
            No subjects yet. <Link to="/subjects" className="underline underline-offset-2">Create one</Link>.
          </EmptyHint>
        ) : (
          <div className="space-y-2.5">
            {subjects.map((s) => {
              const syll = computeSubjectSyllabus(data.chapters, data.topics, s._id);
              return (
                <Link
                  key={s._id}
                  to={`/subjects/${s._id}`}
                  className="block rounded-xl border border-border bg-card p-4 active:opacity-80"
                >
                  <div className="flex items-baseline justify-between">
                    <p className="truncate text-[14px] font-medium">{s.name}</p>
                    <span className="text-[12.5px] tnum text-muted-foreground">
                      {syll.pctValue !== null ? `${syll.pctValue}%` : "—"}
                    </span>
                  </div>
                  <MiniBar value={syll.pctValue} className="mt-2" />
                  <p className="mt-1.5 text-[11.5px] text-muted-foreground tnum">
                    {syll.totalChapters === 0
                      ? "No chapters added"
                      : `${syll.doneChapters}/${syll.totalChapters} chapters · ${syll.pendingTopics} topics pending`}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Milestones */}
      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Milestones
          </p>
          <button
            type="button"
            className="text-[12px] text-muted-foreground"
            onClick={() => setShowMilestones((v) => !v)}
          >
            {showMilestones ? "Hide" : "Show"}
          </button>
        </div>
        {showMilestones && (
          milestones.length === 0 ? (
            <EmptyHint>
              Milestones (25 / 50 / 75 / 100% completion) will be permanently recorded here
              as you progress.
            </EmptyHint>
          ) : (
            <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card">
              {milestones.slice(0, 20).map((m) => {
                const subject = data.subjects.find((s) => s._id === m.subjectId);
                return (
                  <div key={m._id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="w-12 shrink-0 text-[13px] font-semibold tnum">{m.value}%</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium">
                        {subject ? subject.name : "All subjects"}
                      </p>
                      <p className="text-[11px] text-muted-foreground tnum">
                        {new Date(m.at).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </section>
    </AppShell>
  );
}
