import { AppShell } from "@/components/AppShell";
import { EmptyHint, PageHeader } from "@/components/AcademicUI";
import { useAcademicData } from "@/hooks/use-academic-data";
import { useMemo } from "react";

const ACTION_LABEL: Record<string, string> = {
  created: "Created",
  edited: "Edited",
  deleted: "Deleted",
  archived: "Archived",
  restored: "Restored",
  completed: "Completed",
  reopened: "Reopened",
  revised: "Revised",
  recorded: "Recorded",
  corrected: "Corrected",
  removed: "Removed",
};

export default function History() {
  const data = useAcademicData();

  const entries = useMemo(
    () => [...(data?.activity ?? [])].sort((a, b) => b.at - a.at).slice(0, 100),
    [data],
  );

  const milestones = useMemo(
    () => [...(data?.milestones ?? [])].sort((a, b) => b.at - a.at).slice(0, 10),
    [data],
  );

  if (!data) {
    return (
      <AppShell title="History">
        <div className="space-y-3 pt-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="History">
      <PageHeader
        title="Academic history"
        subtitle="Every change, kept — nothing silently lost"
      />

      {milestones.length > 0 && (
        <section className="mb-6">
          <p className="mb-2.5 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Milestones
          </p>
          <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card">
            {milestones.map((m) => {
              const subject = data.subjects.find((s) => s._id === m.subjectId);
              return (
                <div key={m._id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium">
                      {subject ? subject.name : "Academics"} · {m.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground tnum">
                      {new Date(m.at).toLocaleString("en-US", {
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span className="text-[12px] font-medium tnum">{m.value}%</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <p className="mb-2.5 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Activity log
        </p>
        {entries.length === 0 ? (
          <EmptyHint>
            No activity yet. Every subject, chapter, mark, attendance correction, session
            and note you create is permanently logged here with before/after values.
          </EmptyHint>
        ) : (
          <div className="relative space-y-0 pl-4">
            <span className="absolute bottom-2 left-[5px] top-2 w-px bg-border" />
            {entries.map((e) => {
              const subject = e.subjectId ? data.subjects.find((s) => s._id === e.subjectId) : undefined;
              return (
                <div key={e._id} className="relative py-2.5">
                  <span className="absolute -left-4 top-4 size-2 rounded-full border border-border bg-background" />
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 text-[13.5px] leading-snug">
                      <span className="font-medium">{ACTION_LABEL[e.action] ?? e.action}</span>{" "}
                      <span className="text-muted-foreground">{e.entity}</span>
                      {e.entityTitle ? <span> · {e.entityTitle}</span> : null}
                      {subject ? <span className="text-muted-foreground"> · {subject.name}</span> : null}
                    </p>
                    <span className="shrink-0 text-[10.5px] tnum text-muted-foreground">
                      {new Date(e.at).toLocaleString("en-US", {
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {(e.prevValue || e.newValue) && (
                    <p className="mt-0.5 text-[11.5px] text-muted-foreground tnum">
                      {e.prevValue && e.newValue
                        ? `${e.field ? `${e.field}: ` : ""}${e.prevValue} → ${e.newValue}`
                        : e.newValue
                          ? `${e.field ? `${e.field}: ` : ""}${e.newValue}`
                          : `${e.field ? `${e.field}: ` : ""}${e.prevValue}`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
