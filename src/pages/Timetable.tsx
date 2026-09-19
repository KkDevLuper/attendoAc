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
import type { Doc } from "@/convex/_generated/dataModel";
import { useAcademicData } from "@/hooks/use-academic-data";
import {
  buildSchedule,
  currentClassInfo,
  DAY_LONG,
  daySchedule,
  nextClassInfo,
  to12h,
  todayStr,
} from "@/lib/academic";
import { useMutation } from "convex/react";
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

const DAY_KEYS = [1, 2, 3, 4, 5, 6, 0]; // week order Mon..Sun

export default function Timetable() {
  const data = useAcademicData();
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const [open, setOpen] = useState(false);

  const createSlot = useMutation(api.schedule.createSlot);
  const deleteSlot = useMutation(api.schedule.deleteSlot);

  const schedule = useMemo(() => (data ? buildSchedule(data) : null), [data]);
  const todaySlots = data ? daySchedule(data, todayStr()) : [];
  const next = data ? nextClassInfo(data) : null;
  const current = data ? currentClassInfo(data) : null;
  const totalWeekly = schedule ? schedule.reduce((a, d) => a + d.slots.length, 0) : 0;

  if (!data) {
    return (
      <AppShell title="Timetable">
        <div className="space-y-3 pt-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </AppShell>
    );
  }

  const hasSubjects = data.subjects.some((s) => !s.archived);
  const selectedSlots = schedule![selectedDay].slots;

  return (
    <AppShell
      title="Timetable"
      actions={
        <Button variant="ghost" size="icon" className="size-9 rounded-full" aria-label="Add class" onClick={() => setOpen(true)}>
          <Plus className="size-[18px]" strokeWidth={1.75} />
        </Button>
      }
    >
      <PageHeader
        title="Timetable"
        subtitle={`${totalWeekly} classes per week · ${todaySlots.length} today`}
      />

      {/* Status strip */}
      <div className="mb-5 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border/60 text-center">
        <div className="bg-card px-2 py-3">
          <p className="text-[15px] font-semibold tnum">{current ? "In class" : "Free"}</p>
          <p className="text-[10.5px] text-muted-foreground">
            {current ? current.slot.subjectName : "no class now"}
          </p>
        </div>
        <div className="bg-card px-2 py-3">
          <p className="text-[15px] font-semibold truncate">{next ? next.slot.subjectName : "—"}</p>
          <p className="text-[10.5px] text-muted-foreground">
            {next
              ? `next · ${next.offset === 0 ? "today" : DAY_LONG[new Date(next.date + "T00:00:00").getDay()].slice(0, 3)} ${to12h(next.slot.startTime).replace(":00", "")}`
              : "nothing scheduled"}
          </p>
        </div>
        <div className="bg-card px-2 py-3">
          <p className="text-[15px] font-semibold tnum">{Math.max(0, todaySlots.length - (current ? 1 : 0))}</p>
          <p className="text-[10.5px] text-muted-foreground">remaining today</p>
        </div>
      </div>

      {/* Day selector */}
      <div className="-mx-4 mb-4 overflow-x-auto px-4">
        <div className="flex gap-1.5">
          {DAY_KEYS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setSelectedDay(d)}
              className={`flex h-14 w-11 shrink-0 flex-col items-center justify-center rounded-xl border text-[11px] ${
                selectedDay === d
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground"
              }`}
            >
              <span className="uppercase tracking-wider">{DAY_LONG[d].slice(0, 3)}</span>
              <span className="mt-0.5 text-[13px] font-semibold tnum">{schedule![d].slots.length}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Slots */}
      {selectedSlots.length === 0 ? (
        <EmptyHint>
          No classes on {DAY_LONG[selectedDay]}s.{" "}
          {hasSubjects ? (
            <button type="button" className="underline underline-offset-2" onClick={() => setOpen(true)}>
              Add one
            </button>
          ) : (
            <Link to="/subjects" className="underline underline-offset-2">
              Create a subject first
            </Link>
          )}
        </EmptyHint>
      ) : (
        <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card">
          {selectedSlots.map((slot) => (
            <div key={slot._id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-16 shrink-0">
                <p className="text-[13px] font-medium tnum">{to12h(slot.startTime).replace(":00", "")}</p>
                <p className="text-[10.5px] tnum text-muted-foreground">{to12h(slot.endTime).replace(":00", "")}</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium">{slot.subjectName}</p>
                <p className="text-[11.5px] text-muted-foreground">
                  {[slot.faculty, slot.room, slot.classType].filter(Boolean).join(" · ") || "Class"}
                </p>
              </div>
              <button
                type="button"
                aria-label="Remove class"
                className="rounded-md p-1.5 text-muted-foreground active:opacity-60"
                onClick={async () => {
                  await deleteSlot({ id: slot._id });
                  toast("Class removed");
                }}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <SlotDialog
        open={open}
        onOpenChange={setOpen}
        defaultDay={selectedDay}
        subjects={data.subjects.filter((s) => !s.archived)}
        onSubmit={async (v) => {
          await createSlot(v);
          setOpen(false);
          toast("Class added to timetable");
        }}
      />
    </AppShell>
  );
}

export function SlotDialog({
  open,
  onOpenChange,
  defaultDay,
  subjects,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDay: number;
  subjects: Doc<"subjects">[];
  onSubmit: (v: {
    subjectId: Doc<"timetableSlots">["subjectId"];
    day: number;
    startTime: string;
    endTime: string;
    faculty?: string;
    room?: string;
    classType?: string;
  }) => Promise<void>;
}) {
  const [subjectId, setSubjectId] = useState("");
  const [day, setDay] = useState(defaultDay);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [faculty, setFaculty] = useState("");
  const [room, setRoom] = useState("");
  const [classType, setClassType] = useState("Theory");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[16px]">Add class</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3.5 pb-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!subjectId) {
              toast.error("Choose a subject");
              return;
            }
            if (end <= start) {
              toast.error("End time must be after start time");
              return;
            }
            await onSubmit({ subjectId: subjectId as never, day, startTime: start, endTime: end, faculty: faculty || undefined, room: room || undefined, classType: classType || undefined });
            setSubjectId("");
          }}
        >
          <div className="space-y-1.5">
            <Label className="text-[12px] text-muted-foreground">Subject *</Label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-[14px]"
              required
            >
              <option value="">Choose…</option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">Start *</Label>
              <Input value={start} onChange={(e) => setStart(e.target.value)} type="time" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">End *</Label>
              <Input value={end} onChange={(e) => setEnd(e.target.value)} type="time" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">Day</Label>
              <select
                value={day}
                onChange={(e) => setDay(Number(e.target.value))}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-[14px]"
              >
                {DAY_LONG.map((n, i) => (
                  <option key={i} value={i}>{n}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">Type</Label>
              <select
                value={classType}
                onChange={(e) => setClassType(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-[14px]"
              >
                <option>Theory</option>
                <option>Lab</option>
                <option>Tutorial</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">Faculty</Label>
              <Input value={faculty} onChange={(e) => setFaculty(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">Room</Label>
              <Input value={room} onChange={(e) => setRoom(e.target.value)} />
            </div>
          </div>
          <Button type="submit" className="h-11 w-full rounded-xl">Add class</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
