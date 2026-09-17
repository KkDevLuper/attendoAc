import { AppShell } from "@/components/AppShell";
import { EmptyHint, MiniBar, PageHeader } from "@/components/AcademicUI";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAcademicData } from "@/hooks/use-academic-data";
import { api } from "@/convex/_generated/api";
import {
  computeSubjectAttendance,
  computeSubjectMarks,
  computeSubjectSyllabus,
  computeScores,
} from "@/lib/academic";
import type { Doc } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Archive, ArchiveRestore, GraduationCap, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

export default function Subjects() {
  const data = useAcademicData();
  const [query, setQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Doc<"subjects"> | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);

  const createSubject = useMutation(api.subjects.create);
  const updateSubject = useMutation(api.subjects.update);
  const archiveSubject = useMutation(api.subjects.archive);

  const active = useMemo(
    () =>
      (data?.subjects ?? [])
        .filter((s) => !s.archived)
        .filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [data, query],
  );
  const overall = data ? computeSubjectAttendance(data.attendance) : null;
  const archived = useMemo(() => (data?.subjects ?? []).filter((s) => s.archived), [data]);

  if (!data) {
    return (
      <AppShell title="Subjects">
        <SkeletonList />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Subjects"
      actions={
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-full"
          aria-label="Archived subjects"
          onClick={() => setArchivedOpen(true)}
        >
          <Archive className="size-[18px]" strokeWidth={1.75} />
        </Button>
      }
    >
      <PageHeader
        title="Subjects"
        subtitle={
          overall && overall.pctValue !== null
            ? `${active.length} active · ${Math.round(overall.pctValue)}% overall attendance`
            : `${active.length} active`
        }
        actions={
          <Button
            size="sm"
            className="h-9 rounded-lg px-3"
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
          >
            <Plus className="size-4" /> New
          </Button>
        }
      />

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search subjects"
          className="h-10 rounded-lg pl-9 text-[14px]"
        />
      </div>

      {active.length === 0 ? (
        <EmptyHint>
          {query
            ? "No subjects match your search."
            : "No subjects yet. Create your first subject to unlock attendance, syllabus, marks and everything else."}
        </EmptyHint>
      ) : (
        <div className="space-y-3">
          {active.map((s) => {
            const att = computeSubjectAttendance(
              data.attendance.filter((a) => a.subjectId === s._id),
            );
            const syll = computeSubjectSyllabus(data.chapters, data.topics, s._id);
            const marks = computeSubjectMarks(data.assessments, s._id);
            const scores = computeScores(att, syll, marks, 0, s.examDate);
            return (
              <Link
                key={s._id}
                to={`/subjects/${s._id}`}
                className="block rounded-xl border border-border bg-card p-4 active:opacity-80"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold">{s.name}</p>
                    <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                      {[s.code, s.credits ? `${s.credits} credits` : null, s.faculty]
                        .filter(Boolean)
                        .join(" · ") || "Tap for details"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md border border-border px-2 py-1 text-[11px] tnum">
                    {scores.health !== null ? `H ${Math.round(scores.health)}` : "H —"}
                  </span>
                </div>
                <div className="mt-3.5 grid grid-cols-3 gap-4">
                  <Metric label="Attend" value={att.pctValue} />
                  <Metric label="Syllabus" value={syll.pctValue} />
                  <Metric label="Marks" value={marks.avgPct} />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Editor */}
      <SubjectEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        initial={editing}
        onSubmit={async (values) => {
          try {
            if (editing) {
              await updateSubject({ id: editing._id, ...values });
              toast("Subject updated");
            } else {
              await createSubject(values);
              toast("Subject created");
            }
            setEditorOpen(false);
          } catch {
            toast.error("Could not save subject");
          }
        }}
      />

      {/* Archived sheet */}
      <Dialog open={archivedOpen} onOpenChange={setArchivedOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[16px]">Archived subjects</DialogTitle>
          </DialogHeader>
          {archived.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-muted-foreground">
              Nothing archived. Deleted subjects live here.
            </p>
          ) : (
            <div className="divide-y divide-border/60">
              {archived.map((s) => (
                <div key={s._id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-[14px] font-medium">{s.name}</p>
                    <p className="text-[11.5px] text-muted-foreground">{s.code ?? "Archived"}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg"
                    onClick={async () => {
                      await archiveSubject({ id: s._id, archived: false });
                      toast("Subject restored");
                    }}
                  >
                    <ArchiveRestore className="size-3.5" /> Restore
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground">{label}</span>
        <span className="text-[12.5px] font-medium tnum">{value !== null ? `${Math.round(value)}%` : "—"}</span>
      </div>
      <MiniBar value={value} className="mt-1.5" />
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-3 pt-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}

const EMPTY = {
  name: "",
  code: "",
  faculty: "",
  credits: "",
  department: "",
  semester: "",
  academicYear: "",
  classType: "",
  room: "",
  startDate: "",
  endDate: "",
  examDate: "",
  resultDate: "",
};

type SubjectFormValues = {
  name: string;
  code?: string;
  faculty?: string;
  credits?: number;
  department?: string;
  semester?: string;
  academicYear?: string;
  classType?: string;
  room?: string;
  startDate?: string;
  endDate?: string;
  examDate?: string;
  resultDate?: string;
};

function SubjectEditor({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: Doc<"subjects"> | null;
  onSubmit: (values: SubjectFormValues) => Promise<void>;
}) {
  const [form, setForm] = useState<Record<string, string>>(EMPTY);
  const [key, setKey] = useState(0);
  const [saving, setSaving] = useState(false);
  // re-seed form when opening for a different subject
  const initialId = initial?._id ?? "new";
  const [lastId, setLastId] = useState(initialId);
  if (lastId !== initialId || (open && key === 0 && initial)) {
    setLastId(initialId);
    setForm(
      initial
        ? {
            name: initial.name,
            code: initial.code ?? "",
            faculty: initial.faculty ?? "",
            credits: initial.credits !== undefined ? String(initial.credits) : "",
            department: initial.department ?? "",
            semester: initial.semester ?? "",
            academicYear: initial.academicYear ?? "",
            classType: initial.classType ?? "",
            room: initial.room ?? "",
            startDate: initial.startDate ?? "",
            endDate: initial.endDate ?? "",
            examDate: initial.examDate ?? "",
            resultDate: initial.resultDate ?? "",
          }
        : EMPTY,
    );
    setKey((k) => k + 1);
  }

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-md overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[16px]">
            {initial ? "Edit subject" : "New subject"}
          </DialogTitle>
        </DialogHeader>
        <form
          key={key}
          className="space-y-3.5 pb-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!form.name.trim()) {
              toast.error("Subject name is required");
              return;
            }
            setSaving(true);
            await onSubmit({
              name: form.name.trim(),
              code: form.code || undefined,
              faculty: form.faculty || undefined,
              credits: form.credits ? Number(form.credits) : undefined,
              department: form.department || undefined,
              semester: form.semester || undefined,
              academicYear: form.academicYear || undefined,
              classType: form.classType || undefined,
              room: form.room || undefined,
              startDate: form.startDate || undefined,
              endDate: form.endDate || undefined,
              examDate: form.examDate || undefined,
              resultDate: form.resultDate || undefined,
            } as SubjectFormValues);
            setSaving(false);
          }}
        >
          <Field label="Name *"><Input value={form.name} onChange={set("name")} placeholder="e.g. Data Structures" required /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Code"><Input value={form.code} onChange={set("code")} placeholder="CS201" /></Field>
            <Field label="Credits"><Input value={form.credits} onChange={set("credits")} type="number" min="0" max="10" step="0.5" placeholder="4" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Faculty"><Input value={form.faculty} onChange={set("faculty")} placeholder="Dr. Rao" /></Field>
            <Field label="Room"><Input value={form.room} onChange={set("room")} placeholder="L-204" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Department"><Input value={form.department} onChange={set("department")} placeholder="CSE" /></Field>
            <Field label="Class type"><Input value={form.classType} onChange={set("classType")} placeholder="Theory / Lab" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Semester"><Input value={form.semester} onChange={set("semester")} placeholder="Sem 5" /></Field>
            <Field label="Academic year"><Input value={form.academicYear} onChange={set("academicYear")} placeholder="2026-27" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date"><Input value={form.startDate} onChange={set("startDate")} type="date" /></Field>
            <Field label="End date"><Input value={form.endDate} onChange={set("endDate")} type="date" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Exam date"><Input value={form.examDate} onChange={set("examDate")} type="date" /></Field>
            <Field label="Result date"><Input value={form.resultDate} onChange={set("resultDate")} type="date" /></Field>
          </div>
          <Button type="submit" className="h-11 w-full rounded-xl" disabled={saving}>
            {initial ? "Save changes" : "Create subject"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12px] font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
