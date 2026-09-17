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
import { computeGpa, targetCgpa } from "@/lib/academic";
import { useMutation } from "convex/react";
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export default function Cgpa() {
  const data = useAcademicData();
  const saveSemester = useMutation(api.productivity.saveSemester);
  const deleteSemester = useMutation(api.productivity.deleteSemester);
  const saveCourse = useMutation(api.productivity.saveCourse);
  const deleteCourse = useMutation(api.productivity.deleteCourse);

  const [semOpen, setSemOpen] = useState(false);
  const [semName, setSemName] = useState("");
  const [targetOpen, setTargetOpen] = useState(false);
  const [targetVal, setTargetVal] = useState("8.5");
  const [futureCredits, setFutureCredits] = useState("60");

  const sems = useMemo(
    () =>
      data
        ? data.semesters
            .filter((s) => !s.deletedAt)
            .sort((a, b) => a.order - b.order)
            .map((sem) => {
              const courses = data.semesterCourses.filter((c) => c.semesterId === sem._id && !c.deletedAt);
              const credits = courses.reduce((a, c) => a + c.credits, 0);
              const points = courses.reduce((a, c) => a + c.gradePoint * c.credits, 0);
              return { sem, courses, sgpa: credits > 0 ? points / credits : null, credits };
            })
        : [],
    [data],
  );

  const gpa = data ? computeGpa(data) : null;

  if (!data || !gpa) {
    return (
      <AppShell title="CGPA">
        <div className="space-y-3 pt-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="CGPA"
      actions={
        <Button variant="ghost" size="icon" className="size-9 rounded-full" aria-label="Add semester" onClick={() => setSemOpen(true)}>
          <Plus className="size-[18px]" strokeWidth={1.75} />
        </Button>
      }
    >
      <PageHeader
        title="CGPA"
        subtitle="Semester-wise results and progress"
        actions={
          gpa.completedSgpa.length > 0 ? (
            <Button variant="outline" size="sm" className="h-8 rounded-lg" onClick={() => setTargetOpen(true)}>
              Target
            </Button>
          ) : undefined
        }
      />

      {/* CGPA headline */}
      <div className="mb-6 rounded-xl border border-border bg-card p-5 text-center">
        {gpa.cgpa === null ? (
          <>
            <p className="text-[15px] font-semibold">No GPA data yet</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
              Add a semester, then its courses with credits and grade points (0–10 scale).
              SGPA and CGPA compute from your real results.
            </p>
          </>
        ) : (
          <>
            <p className="text-[40px] font-semibold leading-none tnum">{gpa.cgpa.toFixed(2)}</p>
            <p className="mt-1.5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              CGPA · {gpa.completedSgpa.length} semester{gpa.completedSgpa.length === 1 ? "" : "s"} ·{" "}
              {gpa.completedSgpa.reduce((a, s) => a + s.credits, 0)} credits
            </p>
          </>
        )}
      </div>

      {/* Semesters */}
      {sems.length === 0 ? (
        <EmptyHint>
          No semesters yet.{" "}
          <button type="button" className="underline underline-offset-2" onClick={() => setSemOpen(true)}>
            Add your first semester
          </button>
        </EmptyHint>
      ) : (
        <div className="space-y-3">
          {sems.map(({ sem, courses, sgpa, credits }) => (
            <div key={sem._id} className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-[14.5px] font-semibold">{sem.name}</p>
                  <p className="text-[11.5px] text-muted-foreground tnum">
                    {courses.length} courses · {credits} credits
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold tnum">{sgpa !== null ? sgpa.toFixed(2) : "—"}</span>
                  <button
                    type="button"
                    aria-label="Delete semester"
                    className="rounded-md p-1 text-muted-foreground active:opacity-60"
                    onClick={() => deleteSemester({ id: sem._id })}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              <div className="border-t border-border/60 px-4 py-2">
                {courses.map((c) => (
                  <div key={c._id} className="flex items-center gap-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px]">{c.name}</p>
                      <p className="text-[10.5px] text-muted-foreground">{c.credits} credits</p>
                    </div>
                    <span className="rounded-md border border-border px-2 py-0.5 text-[12px] font-medium tnum">
                      {c.gradePoint.toFixed(1)}
                    </span>
                    <button
                      type="button"
                      aria-label="Delete course"
                      className="rounded-md p-1 text-muted-foreground active:opacity-60"
                      onClick={() => deleteCourse({ id: c._id })}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
                <AddCourseForm
                  onAdd={async (name, cr, gp) => {
                    await saveCourse({ semesterId: sem._id, name, credits: cr, gradePoint: gp });
                    toast("Course added");
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New semester dialog */}
      <Dialog open={semOpen} onOpenChange={setSemOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[16px]">Add semester</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3.5 pb-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!semName.trim()) return;
              await saveSemester({
                name: semName.trim(),
                order: sems.length + 1,
                completed: false,
              });
              setSemName("");
              setSemOpen(false);
              toast("Semester added");
            }}
          >
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">Name *</Label>
              <Input value={semName} onChange={(e) => setSemName(e.target.value)} placeholder="Semester 3" required />
            </div>
            <Button type="submit" className="h-11 w-full rounded-xl">Add semester</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Target dialog */}
      <Dialog open={targetOpen} onOpenChange={setTargetOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[16px]">Target CGPA</DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 pb-2">
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">Target CGPA (0–10)</Label>
              <Input value={targetVal} onChange={(e) => setTargetVal(e.target.value)} type="number" min="0" max="10" step="0.01" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">Credits remaining in degree</Label>
              <Input value={futureCredits} onChange={(e) => setFutureCredits(e.target.value)} type="number" min="1" />
            </div>
            {(() => {
              const t = targetCgpa(
                gpa.completedSgpa.map((s) => ({ sgpa: s.sgpa, credits: s.credits })),
                Number(targetVal) || 0,
                Number(futureCredits) || 0,
              );
              return (
                <div className="rounded-xl border border-border bg-muted/40 p-4 text-center">
                  {t === null ? (
                    <p className="text-[13px] text-muted-foreground">Enter credits to calculate.</p>
                  ) : t > 10 ? (
                    <p className="text-[13px] font-medium">
                      A {targetVal} CGPA isn't reachable with {futureCredits} credits on the 10-point scale.
                    </p>
                  ) : t <= 0 ? (
                    <p className="text-[13px] font-medium">Target already secured 🎉</p>
                  ) : (
                    <>
                      <p className="text-[28px] font-semibold tnum">{t.toFixed(2)}</p>
                      <p className="mt-1 text-[11.5px] text-muted-foreground">
                        average grade point needed across remaining credits
                      </p>
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function AddCourseForm({
  onAdd,
}: {
  onAdd: (name: string, credits: number, gradePoint: number) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [credits, setCredits] = useState("4");
  const [gp, setGp] = useState("");
  return (
    <form
      className="mt-1 flex gap-2 border-t border-border/60 pt-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const cr = Number(credits);
        const grade = Number(gp);
        if (!name.trim() || !cr || Number.isNaN(grade) || grade < 0 || grade > 10) {
          toast.error("Course name, credits and grade point (0–10) required");
          return;
        }
        await onAdd(name.trim(), cr, grade);
        setName("");
        setGp("");
      }}
    >
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Course" className="h-9 flex-1 rounded-lg text-[13px]" />
      <Input value={credits} onChange={(e) => setCredits(e.target.value)} type="number" min="1" max="10" className="h-9 w-16 rounded-lg text-[13px]" />
      <Input value={gp} onChange={(e) => setGp(e.target.value)} type="number" min="0" max="10" step="0.1" placeholder="GP" className="h-9 w-16 rounded-lg text-[13px]" />
      <Button type="submit" variant="outline" size="icon" className="size-9 shrink-0 rounded-lg">
        <Plus className="size-4" />
      </Button>
    </form>
  );
}
