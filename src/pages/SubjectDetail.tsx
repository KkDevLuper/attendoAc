import { AppShell } from "@/components/AppShell";
import { DataHint, EmptyHint, MiniBar, Ring, ScoreBadge } from "@/components/AcademicUI";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useAcademicData } from "@/hooks/use-academic-data";
import {
  attendanceSimulator,
  computeScores,
  computeSubjectAttendance,
  computeSubjectMarks,
  computeSubjectSyllabus,
  minutesToHM,
  subjectStudyMinutes,
  to12h,
  todayStr,
} from "@/lib/academic";
import { useMutation } from "convex/react";
import {
  ArrowLeft,
  Check,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

type Tab = "overview" | "syllabus" | "attendance" | "marks" | "study" | "notes";

export default function SubjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const data = useAcademicData();
  const [tab, setTab] = useState<Tab>("overview");

  const subject = data?.subjects.find((s) => s._id === id);

  const archive = useMutation(api.subjects.archive);

  if (!data) {
    return (
      <AppShell title="Subject">
        <div className="space-y-3 pt-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </AppShell>
    );
  }

  if (!subject) {
    return (
      <AppShell title="Subject">
        <EmptyHint>
          Subject not found. <Link to="/subjects" className="underline">Back to subjects</Link>
        </EmptyHint>
      </AppShell>
    );
  }

  const att = computeSubjectAttendance(data.attendance.filter((a) => a.subjectId === subject._id));
  const syll = computeSubjectSyllabus(data.chapters, data.topics, subject._id);
  const marks = computeSubjectMarks(data.assessments, subject._id);
  const study = subjectStudyMinutes(data, subject._id);
  const scores = computeScores(att, syll, marks, study, subject.examDate);

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "syllabus", label: "Syllabus" },
    { key: "attendance", label: "Attendance" },
    { key: "marks", label: "Marks" },
    { key: "study", label: "Study" },
    { key: "notes", label: "Notes" },
  ];

  return (
    <AppShell
      title={subject.name}
      actions={
        <Link
          to="/subjects"
          className="flex size-9 items-center justify-center rounded-full"
          aria-label="Back"
        >
          <ArrowLeft className="size-[18px]" strokeWidth={1.75} />
        </Link>
      }
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] text-muted-foreground">
            {[subject.code, subject.faculty, subject.room].filter(Boolean).join(" · ") ||
              "No details yet"}
          </p>
          {subject.examDate && (
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Exam {new Date(subject.examDate).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-lg"
          onClick={async () => {
            await archive({ id: subject._id, archived: true });
            toast("Subject archived — restore anytime from Subjects");
            navigate("/subjects");
          }}
        >
          <Trash2 className="size-3.5" /> Archive
        </Button>
      </div>

      {/* Tabs */}
      <div className="-mx-4 mb-5 overflow-x-auto px-4">
        <div className="flex gap-1.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
                tab === t.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "overview" && (
        <OverviewTab subject={subject} att={att} syll={syll} marks={marks} scores={scores} study={study} />
      )}
      {tab === "syllabus" && <SyllabusTab subject={subject} />}
      {tab === "attendance" && <AttendanceTab subject={subject} att={att} />}
      {tab === "marks" && <MarksTab subject={subject} marks={marks} />}
      {tab === "study" && <StudyTab subject={subject} minutes={study} />}
      {tab === "notes" && <NotesTab subject={subject} />}
    </AppShell>
  );
}

// ---------------- Overview ----------------

function OverviewTab({
  subject,
  att,
  syll,
  marks,
  scores,
  study,
}: {
  subject: Doc<"subjects">;
  att: ReturnType<typeof computeSubjectAttendance>;
  syll: ReturnType<typeof computeSubjectSyllabus>;
  marks: ReturnType<typeof computeSubjectMarks>;
  scores: ReturnType<typeof computeScores>;
  study: number;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-px overflow-hidden rounded-xl border border-border bg-border/60">
        <div className="flex flex-col items-center gap-1.5 bg-card py-4">
          <Ring value={att.pctValue} size={54} stroke={5} />
          <span className="text-[10px] text-muted-foreground">Attend</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 bg-card py-4">
          <Ring value={syll.pctValue} size={54} stroke={5} />
          <span className="text-[10px] text-muted-foreground">Syllabus</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 bg-card py-4">
          <Ring value={marks.avgPct} size={54} stroke={5} />
          <span className="text-[10px] text-muted-foreground">Marks</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 bg-card py-4">
          <Ring value={scores.readiness} size={54} stroke={5} />
          <span className="text-[10px] text-muted-foreground">Ready</span>
        </div>
      </div>

      <div>
        <p className="mb-2.5 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Academic intelligence
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          <ScoreBadge label="Performance" value={scores.performance} />
          <ScoreBadge label="Health" value={scores.health} />
          <ScoreBadge label="Completion" value={scores.completion} />
          <ScoreBadge label="Exam readiness" value={scores.readiness} />
        </div>
        {scores.signals.length > 0 && <DataHint>{scores.signals.join(" · ")}</DataHint>}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-1 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Attendance
        </p>
        {att.pctValue === null ? (
          <EmptyHint>No attendance recorded yet for this subject.</EmptyHint>
        ) : (
          <>
            <div className="flex items-baseline justify-between py-1.5">
              <span className="text-[13px] text-muted-foreground">Present / conducted</span>
              <span className="text-[13px] font-medium tnum">
                {att.present}/{att.total} · {Math.round(att.pctValue)}%
              </span>
            </div>
            <div className="flex items-baseline justify-between py-1.5 border-t border-border/60">
              <span className="text-[13px] text-muted-foreground">Safe bunks</span>
              <span className="text-[13px] font-medium tnum">{att.safeBunks}</span>
            </div>
            {att.pctValue < 75 && (
              <div className="flex items-baseline justify-between py-1.5 border-t border-border/60">
                <span className="text-[13px] text-muted-foreground">To reach 75%</span>
                <span className="text-[13px] font-medium tnum">attend {att.needToAttend} more</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-1 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Preparation
        </p>
        {syll.pctValue === null ? (
          <EmptyHint>
            Add chapters in the Syllabus tab to track preparation.
          </EmptyHint>
        ) : (
          <>
            <div className="flex items-baseline justify-between py-1.5">
              <span className="text-[13px] text-muted-foreground">Chapters</span>
              <span className="text-[13px] font-medium tnum">{syll.doneChapters}/{syll.totalChapters}</span>
            </div>
            <div className="flex items-baseline justify-between py-1.5 border-t border-border/60">
              <span className="text-[13px] text-muted-foreground">Topics pending</span>
              <span className="text-[13px] font-medium tnum">{syll.pendingTopics}</span>
            </div>
            <div className="flex items-baseline justify-between py-1.5 border-t border-border/60">
              <span className="text-[13px] text-muted-foreground">Revisions done / pending</span>
              <span className="text-[13px] font-medium tnum">
                {syll.revisionsDone} / {syll.revisionsPending}
              </span>
            </div>
            <div className="mt-2.5">
              <MiniBar value={syll.pctValue} />
            </div>
          </>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-1 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Marks
        </p>
        {marks.count === 0 ? (
          <EmptyHint>No assessments recorded yet.</EmptyHint>
        ) : (
          <>
            <div className="flex items-baseline justify-between py-1.5">
              <span className="text-[13px] text-muted-foreground">Average</span>
              <span className="text-[13px] font-medium tnum">{Math.round(marks.avgPct!)}%</span>
            </div>
            <div className="flex items-baseline justify-between py-1.5 border-t border-border/60">
              <span className="text-[13px] text-muted-foreground">Best / worst</span>
              <span className="text-[13px] font-medium tnum">
                {Math.round(marks.highest!.pct)}% / {Math.round(marks.lowest!.pct)}%
              </span>
            </div>
            <div className="flex items-baseline justify-between py-1.5 border-t border-border/60">
              <span className="text-[13px] text-muted-foreground">Assessments</span>
              <span className="text-[13px] font-medium tnum">{marks.count}</span>
            </div>
          </>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-1 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Study
        </p>
        {study === 0 ? (
          <EmptyHint>No study sessions logged for this subject.</EmptyHint>
        ) : (
          <p className="py-1.5 text-[13px]">
            <span className="font-semibold tnum">{minutesToHM(study)}</span>{" "}
            <span className="text-muted-foreground">logged in total</span>
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------- Syllabus tab ----------------

function SyllabusTab({ subject }: { subject: Doc<"subjects"> }) {
  const data = useAcademicData()!;
  const [newChapter, setNewChapter] = useState("");
  const [adding, setAdding] = useState(false);
  const createChapter = useMutation(api.subjects.createChapter);
  const createTopic = useMutation(api.subjects.createTopic);
  const updateChapter = useMutation(api.subjects.updateChapter);
  const updateTopic = useMutation(api.subjects.updateTopic);
  const deleteChapter = useMutation(api.subjects.deleteChapter);
  const deleteTopic = useMutation(api.subjects.deleteTopic);
  const reviseChapter = useMutation(api.subjects.reviseChapter);
  const reviseTopic = useMutation(api.subjects.reviseTopic);

  const chapters = useMemo(
    () =>
      data.chapters
        .filter((c) => c.subjectId === subject._id && !c.deletedAt)
        .sort((a, b) => a.order - b.order),
    [data, subject._id],
  );
  const topicsByChapter = useMemo(() => {
    const map = new Map<string, Doc<"topics">[]>();
    for (const t of data.topics.filter((t) => !t.deletedAt && t.subjectId === subject._id)) {
      const arr = map.get(t.chapterId) ?? [];
      arr.push(t);
      map.set(t.chapterId, arr);
    }
    return map;
  }, [data, subject._id]);

  return (
    <div className="space-y-4">
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!newChapter.trim()) return;
          await createChapter({ subjectId: subject._id, title: newChapter.trim() });
          setNewChapter("");
          toast("Chapter added");
        }}
      >
        <Input
          value={newChapter}
          onChange={(e) => setNewChapter(e.target.value)}
          placeholder="Add a chapter…"
          className="h-10 rounded-lg text-[14px]"
        />
        <Button type="submit" size="icon" className="size-10 shrink-0 rounded-lg">
          <Plus className="size-4" />
        </Button>
      </form>

      {chapters.length === 0 && (
        <EmptyHint>
          No chapters yet. Build your syllabus: chapters → topics. Everything feeds
          preparation %, readiness and revision tracking.
        </EmptyHint>
      )}

      {chapters.map((ch) => {
        const topics = topicsByChapter.get(ch._id) ?? [];
        return (
          <div key={ch._id} className="rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 px-3.5 py-3">
              <button
                type="button"
                aria-label={ch.status === "done" ? "Reopen chapter" : "Complete chapter"}
                onClick={() =>
                  updateChapter({ id: ch._id, status: ch.status === "done" ? "pending" : "done" })
                }
                className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                  ch.status === "done" ? "border-primary bg-primary text-primary-foreground" : "border-border"
                }`}
              >
                {ch.status === "done" && <Check className="size-3" />}
              </button>
              <span className={`flex-1 text-[14px] font-medium ${ch.status === "done" ? "text-muted-foreground line-through" : ""}`}>
                {ch.title}
              </span>
              <button
                type="button"
                aria-label="Revise chapter"
                className="rounded-md p-1 text-muted-foreground active:opacity-60"
                onClick={async () => {
                  await reviseChapter({ id: ch._id });
                  toast("Revision logged");
                }}
              >
                <RotateCcw className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Delete chapter"
                className="rounded-md p-1 text-muted-foreground active:opacity-60"
                onClick={() => deleteChapter({ id: ch._id })}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            <div className="border-t border-border/60 px-3.5 py-2">
              {topics.map((t) => (
                <div key={t._id} className="flex items-center gap-2 py-1.5">
                  <button
                    type="button"
                    aria-label={t.status === "done" ? "Reopen topic" : "Complete topic"}
                    onClick={() =>
                      updateTopic({ id: t._id, status: t.status === "done" ? "pending" : "done" })
                    }
                    className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
                      t.status === "done" ? "border-primary bg-primary text-primary-foreground" : "border-border"
                    }`}
                  >
                    {t.status === "done" && <Check className="size-2.5" />}
                  </button>
                  <span className={`flex-1 text-[13px] ${t.status === "done" ? "text-muted-foreground line-through" : ""}`}>
                    {t.title}
                  </span>
                  <button
                    type="button"
                    aria-label="Star topic"
                    onClick={() => updateTopic({ id: t._id, starred: !t.starred })}
                    className="rounded-md p-1 active:opacity-60"
                  >
                    <Star className={`size-3.5 ${t.starred ? "fill-foreground" : "text-muted-foreground"}`} />
                  </button>
                  <button
                    type="button"
                    aria-label="Revise topic"
                    className="rounded-md p-1 text-muted-foreground active:opacity-60"
                    onClick={async () => {
                      await reviseTopic({ id: t._id });
                      toast("Revision logged");
                    }}
                  >
                    <RotateCcw className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete topic"
                    className="rounded-md p-1 text-muted-foreground active:opacity-60"
                    onClick={() => deleteTopic({ id: t._id })}
                  >
                    <Minus className="size-3.5" />
                  </button>
                </div>
              ))}
              <TopicAdder
                onAdd={async (title, starred) => {
                  await createTopic({ chapterId: ch._id, title, starred });
                }}
              />
            </div>
          </div>
        );
      })}

      {adding && (
        <Dialog open={adding} onOpenChange={setAdding}>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>Tip</DialogTitle>
            </DialogHeader>
            <p className="text-[13px] text-muted-foreground">
              Star a topic to bookmark it. Revisions keep your readiness honest.
            </p>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function TopicAdder({ onAdd }: { onAdd: (title: string, starred: boolean) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [starred, setStarred] = useState(false);
  return (
    <form
      className="mt-1 flex gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        await onAdd(title.trim(), starred);
        setTitle("");
        setStarred(false);
      }}
    >
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add topic…"
        className="h-8 rounded-lg text-[13px]"
      />
      <Button type="submit" variant="outline" size="sm" className="h-8 rounded-lg px-2.5">
        <Plus className="size-3.5" />
      </Button>
    </form>
  );
}

// ---------------- Attendance tab ----------------

function AttendanceTab({
  subject,
  att,
}: {
  subject: Doc<"subjects">;
  att: ReturnType<typeof computeSubjectAttendance>;
}) {
  const data = useAcademicData()!;
  const mark = useMutation(api.schedule.markAttendance);
  const remove = useMutation(api.schedule.deleteAttendance);

  const history = useMemo(
    () =>
      data.attendance
        .filter((a) => a.subjectId === subject._id && !a.deletedAt)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [data, subject._id],
  );

  const STATUS: { key: string; label: string }[] = [
    { key: "present", label: "Present" },
    { key: "absent", label: "Absent" },
    { key: "leave", label: "Leave" },
    { key: "cancelled", label: "Cancelled" },
    { key: "holiday", label: "Holiday" },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-2 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Mark attendance
        </p>
        <div className="grid grid-cols-5 gap-2">
          {STATUS.map((s) => (
            <Button
              key={s.key}
              variant="outline"
              size="sm"
              className="h-9 rounded-lg text-[12.5px]"
              onClick={async () => {
                await mark({ subjectId: subject._id, date: todayStr(), status: s.key });
                toast(`Marked ${s.key} for today`);
              }}
            >
              {s.label}
            </Button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Marks today ({todayStr()}). Marking again on the same date corrects the record —
          the correction is kept in history.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-baseline justify-between py-1">
          <span className="text-[13px] text-muted-foreground">Present</span>
          <span className="text-[13px] font-medium tnum">{att.present}</span>
        </div>
        <div className="flex items-baseline justify-between border-t border-border/60 py-1">
          <span className="text-[13px] text-muted-foreground">Absent</span>
          <span className="text-[13px] font-medium tnum">{att.absent}</span>
        </div>
        <div className="flex items-baseline justify-between border-t border-border/60 py-1">
          <span className="text-[13px] text-muted-foreground">Leave</span>
          <span className="text-[13px] font-medium tnum">{att.leave}</span>
        </div>
        <div className="flex items-baseline justify-between border-t border-border/60 py-1">
          <span className="text-[13px] text-muted-foreground">Cancelled</span>
          <span className="text-[13px] font-medium tnum">{att.cancelled}</span>
        </div>
        <div className="flex items-baseline justify-between border-t border-border/60 py-1">
          <span className="text-[13px] text-muted-foreground">Holiday</span>
          <span className="text-[13px] font-medium tnum">{att.holiday}</span>
        </div>
        <div className="flex items-baseline justify-between border-t border-border/60 py-1">
          <span className="text-[13px] text-muted-foreground">Percentage</span>
          <span className="text-[13px] font-medium tnum">
            {att.pctValue !== null ? `${Math.round(att.pctValue)}%` : "—"}
          </span>
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          History
        </p>
        {history.length === 0 ? (
          <EmptyHint>No attendance records yet.</EmptyHint>
        ) : (
          <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card">
            {history.slice(0, 30).map((a) => (
              <div key={a._id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-24 text-[12.5px] tnum text-muted-foreground">{a.date}</span>
                <span
                  className={`text-[13px] font-medium capitalize ${
                    a.status === "present" ? "" : a.status === "absent" ? "text-muted-foreground line-through" : ""
                  }`}
                >
                  {a.status}
                  {a.isCorrection && <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">corrected</span>}
                </span>
                <button
                  type="button"
                  aria-label="Remove record"
                  className="ml-auto rounded-md p-1 text-muted-foreground active:opacity-60"
                  onClick={() => remove({ id: a._id })}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- Marks tab ----------------

function MarksTab({
  subject,
  marks,
}: {
  subject: Doc<"subjects">;
  marks: ReturnType<typeof computeSubjectMarks>;
}) {
  const data = useAcademicData()!;
  const [open, setOpen] = useState(false);
  const create = useMutation(api.subjects.createAssessment);
  const remove = useMutation(api.subjects.deleteAssessment);

  const rows = data.assessments
    .filter((a) => a.subjectId === subject._id && !a.deletedAt)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  return (
    <div className="space-y-4">
      <Button className="h-10 w-full rounded-xl" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Add assessment
      </Button>

      {marks.count > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-baseline justify-between py-1">
            <span className="text-[13px] text-muted-foreground">Average</span>
            <span className="text-[13px] font-medium tnum">{Math.round(marks.avgPct!)}%</span>
          </div>
          <div className="flex items-baseline justify-between border-t border-border/60 py-1">
            <span className="text-[13px] text-muted-foreground">Overall</span>
            <span className="text-[13px] font-medium tnum">
              {marks.totalObtained}/{marks.totalMax}
            </span>
          </div>
          <div className="flex items-baseline justify-between border-t border-border/60 py-1">
            <span className="text-[13px] text-muted-foreground">Best</span>
            <span className="text-[13px] font-medium">
              {marks.highest!.label} · {Math.round(marks.highest!.pct)}%
            </span>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyHint>
          No assessments yet. Quizzes, assignments, midsems — anything you choose, fully
          student-controlled.
        </EmptyHint>
      ) : (
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
                aria-label="Delete assessment"
                className="rounded-md p-1 text-muted-foreground active:opacity-60"
                onClick={() => remove({ id: a._id })}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <AssessmentDialog
        open={open}
        onOpenChange={setOpen}
        onSubmit={async (v) => {
          await create({ subjectId: subject._id, ...v });
          setOpen(false);
          toast("Assessment recorded");
        }}
      />
    </div>
  );
}

function AssessmentDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (v: {
    title: string;
    type: string;
    marksObtained: number;
    maxMarks: number;
    date?: string;
    notes?: string;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("Quiz");
  const [obtained, setObtained] = useState("");
  const [max, setMax] = useState("");
  const [date, setDate] = useState(todayStr());
  const [notes, setNotes] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[16px]">Add assessment</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3.5 pb-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const ob = Number(obtained);
            const mx = Number(max);
            if (!title.trim() || Number.isNaN(ob) || Number.isNaN(mx) || mx <= 0) {
              toast.error("Enter a title and valid marks");
              return;
            }
            await onSubmit({
              title: title.trim(),
              type: type || "Custom",
              marksObtained: ob,
              maxMarks: mx,
              date: date || undefined,
              notes: notes || undefined,
            });
            setTitle("");
            setObtained("");
            setMax("");
            setNotes("");
          }}
        >
          <div className="space-y-1.5">
            <Label className="text-[12px] text-muted-foreground">Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quiz 1" required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px] text-muted-foreground">Type</Label>
            <Input value={type} onChange={(e) => setType(e.target.value)} placeholder="Quiz / Assignment / Midsem" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">Marks obtained *</Label>
              <Input value={obtained} onChange={(e) => setObtained(e.target.value)} type="number" min="0" step="0.5" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">Max marks *</Label>
              <Input value={max} onChange={(e) => setMax(e.target.value)} type="number" min="0" step="0.5" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px] text-muted-foreground">Date</Label>
            <Input value={date} onChange={(e) => setDate(e.target.value)} type="date" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px] text-muted-foreground">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-16" />
          </div>
          <Button type="submit" className="h-11 w-full rounded-xl">Save assessment</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------- Study tab ----------------

function StudyTab({ subject, minutes }: { subject: Doc<"subjects">; minutes: number }) {
  const data = useAcademicData()!;
  const create = useMutation(api.productivity.createSession);
  const remove = useMutation(api.productivity.deleteSession);
  const [open, setOpen] = useState(false);

  const rows = data.sessions
    .filter((s) => !s.deletedAt && s.subjectId === subject._id)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Total studied
        </p>
        <p className="mt-1.5 text-[22px] font-semibold tnum">{minutesToHM(minutes)}</p>
      </div>
      <Button className="h-10 w-full rounded-xl" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Log session
      </Button>
      {rows.length === 0 ? (
        <EmptyHint>No sessions for this subject yet.</EmptyHint>
      ) : (
        <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card">
          {rows.slice(0, 30).map((s) => (
            <div key={s._id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium tnum">
                  {to12h(s.startTime)} – {to12h(s.endTime)}
                </p>
                <p className="text-[11.5px] text-muted-foreground">
                  {[s.date, s.type].filter(Boolean).join(" · ")}
                </p>
              </div>
              <span className="text-[13px] font-medium tnum">{minutesToHM(s.durationMin)}</span>
              <button
                type="button"
                aria-label="Delete session"
                className="rounded-md p-1 text-muted-foreground active:opacity-60"
                onClick={() => remove({ id: s._id })}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <SessionDialog
        open={open}
        onOpenChange={setOpen}
        lockSubject={subject._id}
        onSubmit={async (v) => {
          await create(v);
          setOpen(false);
          toast("Session logged");
        }}
      />
    </div>
  );
}

export function SessionDialog({
  open,
  onOpenChange,
  lockSubject,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lockSubject?: Id<"subjects">;
  onSubmit: (v: {
    subjectId?: Id<"subjects">;
    date: string;
    startTime: string;
    endTime: string;
    durationMin: number;
    type?: string;
    notes?: string;
  }) => Promise<void>;
}) {
  const data = useAcademicData();
  const [subjectId, setSubjectId] = useState<string>(lockSubject ?? "");
  const [date, setDate] = useState(todayStr());
  const [start, setStart] = useState("18:00");
  const [end, setEnd] = useState("19:00");
  const [type, setType] = useState("Learning");
  const [notes, setNotes] = useState("");

  const duration = (() => {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    return (eh * 60 + em - (sh * 60 + sm)) || 0;
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[16px]">Log study session</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3.5 pb-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (duration <= 0) {
              toast.error("End time must be after start time");
              return;
            }
            await onSubmit({
              subjectId: ((lockSubject ?? subjectId) || undefined) as Id<"subjects"> | undefined,
              date,
              startTime: start,
              endTime: end,
              durationMin: duration,
              type: type || undefined,
              notes: notes || undefined,
            });
          }}
        >
          {!lockSubject && (
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">Subject (optional)</Label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-[14px]"
              >
                <option value="">No subject</option>
                {(data?.subjects ?? [])
                  .filter((s) => !s.archived)
                  .map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">Date</Label>
              <Input value={date} onChange={(e) => setDate(e.target.value)} type="date" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">Type</Label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-[14px]"
              >
                <option>Learning</option>
                <option>Practice</option>
                <option>Revision</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">Start</Label>
              <Input value={start} onChange={(e) => setStart(e.target.value)} type="time" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">End</Label>
              <Input value={end} onChange={(e) => setEnd(e.target.value)} type="time" />
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground">Duration: {minutesToHM(duration)}</p>
          <Button type="submit" className="h-11 w-full rounded-xl">Log session</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------- Notes tab ----------------

function NotesTab({ subject }: { subject: Doc<"subjects"> }) {
  const data = useAcademicData()!;
  const save = useMutation(api.productivity.saveNote);
  const remove = useMutation(api.productivity.deleteNote);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState("note");

  const notes = data.notes.filter(
    (n) => !n.deletedAt && n.subjectId === subject._id,
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-2.5 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          New note
        </p>
        <div className="space-y-2.5">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title — formula, question, tip…" className="h-10 rounded-lg" />
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write it down…" className="min-h-20" />
          <div className="flex gap-2">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-[13px]"
            >
              <option value="note">Note</option>
              <option value="formula">Formula</option>
              <option value="question">Important question</option>
              <option value="tip">Exam tip</option>
              <option value="sticky">Sticky note</option>
            </select>
            <Button
              className="h-10 flex-1 rounded-lg"
              onClick={async () => {
                if (!title.trim()) {
                  toast.error("Give the note a title");
                  return;
                }
                await save({ subjectId: subject._id, title: title.trim(), body, kind, pinned: false });
                setTitle("");
                setBody("");
                toast("Note saved");
              }}
            >
              Save note
            </Button>
          </div>
        </div>
      </div>

      {notes.length === 0 ? (
        <EmptyHint>No notes for this subject yet.</EmptyHint>
      ) : (
        <div className="space-y-2.5">
          {notes.map((n) => (
            <div key={n._id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium">{n.title}</p>
                  <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{n.kind}</p>
                </div>
                <button
                  type="button"
                  aria-label="Delete note"
                  className="rounded-md p-1 text-muted-foreground active:opacity-60"
                  onClick={() => remove({ id: n._id })}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              {n.body && <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground">{n.body}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PencilIcon() {
  return <Pencil className="size-3.5" />;
}
void PencilIcon;
