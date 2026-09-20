import { AppShell } from "@/components/AppShell";
import { EmptyHint, PageHeader } from "@/components/AcademicUI";
import { MarkAttendanceDialog } from "@/components/MarkAttendanceDialog";
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
import { useAcademicData } from "@/hooks/use-academic-data";
import {
  attendanceHeatmap,
  computeStreaks,
  EVENT_TYPE_LABEL,
  GOVT_HOLIDAY_PRESETS,
  parseDate,
  todayStr,
} from "@/lib/academic";
import { useMutation } from "convex/react";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { CalendarClock, Check, ChevronLeft, ChevronRight, PartyPopper, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const EVENT_TYPES = Object.keys(EVENT_TYPE_LABEL);

const EVENT_DOTS: Record<string, string> = {
  exam: "border-destructive bg-destructive",
  semester_start: "border-primary/60",
  result: "border-primary/60",
  college_event: "border-sky-400",
  govt_holiday: "border-amber-400 bg-amber-400",
  festival: "border-fuchsia-400 bg-fuchsia-400",
  college_holiday: "border-amber-400/70",
  personal_leave: "border-muted-foreground/60",
  semester_end: "border-muted-foreground/40",
};

export default function CalendarPage() {
  const data = useAcademicData();
  const now = new Date();
  const [month, setMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [open, setOpen] = useState(false);
  const [holidayOpen, setHolidayOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [markOpen, setMarkOpen] = useState(false);

  const saveEvent = useMutation(api.schedule.saveEvent);
  const deleteEvent = useMutation(api.schedule.deleteEvent);
  const markAttendance = useMutation(api.schedule.markAttendance);

  const monthStart = month;
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

  const heat = useMemo(
    () => (data ? attendanceHeatmap(data, monthStart, monthEnd) : null),
    [data, month, monthStart, monthEnd],
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const e of data?.events ?? []) {
      if (e.deletedAt) continue;
      const arr = map.get(e.date) ?? [];
      arr.push(e.type);
      map.set(e.date, arr);
    }
    return map;
  }, [data]);

  const streaks = data ? computeStreaks(data) : null;

  const monthStats = useMemo(() => {
    if (!data) return null;
    const inMonth = data.attendance.filter((a) => {
      if (a.deletedAt) return false;
      const d = parseDate(a.date);
      return d >= monthStart && d <= monthEnd;
    });
    const conducted = inMonth.filter(
      (a) => a.status !== "cancelled" && a.status !== "holiday",
    ).length;
    const present = inMonth.filter((a) => a.status === "present" || a.status === "leave").length;
    const absent = inMonth.filter((a) => a.status === "absent").length;
    const cancelled = inMonth.filter((a) => a.status === "cancelled").length;
    const holiday = inMonth.filter((a) => a.status === "holiday").length;
    const eventDays = [...eventsByDate.keys()].filter((d) => {
      const dd = parseDate(d);
      return dd >= monthStart && dd <= monthEnd;
    }).length;
    return { conducted, present, absent, cancelled, holiday, eventDays };
  }, [data, monthStart, monthEnd, eventsByDate]);

  if (!data || !heat || !monthStats || !streaks) {
    return (
      <AppShell title="Calendar">
        <div className="space-y-3 pt-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </AppShell>
    );
  }

  const grid: (string | null)[] = [];
  for (let i = 0; i < monthStart.getDay(); i++) grid.push(null);
  for (let d = 1; d <= monthEnd.getDate(); d++) {
    grid.push(todayStr(new Date(month.getFullYear(), month.getMonth(), d)));
  }

  const heatClass: Record<string, string> = {
    high: "bg-primary text-primary-foreground border-primary",
    medium: "bg-primary/60 text-primary-foreground border-primary/60",
    low: "bg-primary/20 text-primary border-primary/20",
    none: "bg-muted text-muted-foreground border-border",
    off: "bg-transparent text-muted-foreground/50 border-border/40",
  };

  return (
    <AppShell
      title="Calendar"
      actions={
        <>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-full"
            aria-label="Mark government holiday or festival"
            onClick={() => {
              setSelectedDate(todayStr());
              setHolidayOpen(true);
            }}
          >
            <PartyPopper className="size-[18px]" strokeWidth={1.75} />
          </Button>
          <Button variant="ghost" size="icon" className="size-9 rounded-full" aria-label="Add event" onClick={() => { setSelectedDate(todayStr()); setOpen(true); }}>
            <Plus className="size-[18px]" strokeWidth={1.75} />
          </Button>
        </>
      }
    >
      <PageHeader
        title={month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        subtitle="Attendance heatmap & academic events"
      />

      {/* Month nav */}
      <div className="mb-4 flex items-center justify-between">
        <Button variant="outline" size="icon" className="size-9 rounded-lg" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-[13px] font-medium">{month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
        <Button variant="outline" size="icon" className="size-9 rounded-lg" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Grid */}
      <div className="mb-2 grid grid-cols-7 gap-1.5 text-center">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={i} className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {grid.map((ds, i) => {
          if (!ds) return <span key={`e${i}`} />;
          const level = heat.get(ds) ?? "none";
          const evs = eventsByDate.get(ds) ?? [];
          const isToday = ds === todayStr();
          return (
            <button
              key={ds}
              type="button"
              onClick={() => {
                setSelectedDate(ds);
                setMarkOpen(true);
              }}
              className={`relative flex h-10 items-center justify-center rounded-lg border text-[12px] tnum transition-colors active:opacity-70 ${heatClass[level]} ${isToday ? "ring-1 ring-foreground" : ""}`}
            >
              {parseDate(ds).getDate()}
              {evs.length > 0 && (
                <span className={`absolute bottom-1 size-1 rounded-full border ${EVENT_DOTS[evs[0]] ?? "border-muted-foreground"}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10.5px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm border border-primary bg-primary" /> high</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm border border-primary/60 bg-primary/60" /> medium</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm border border-primary/20 bg-primary/20" /> low</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm border border-border bg-muted" /> none</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm border border-border/40" /> off</span>
      </div>

      {/* Streaks */}
      <section className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border/60 text-center">
        <div className="bg-card py-3.5">
          <p className="text-[18px] font-semibold tnum">{streaks.currentPresent}</p>
          <p className="text-[10.5px] text-muted-foreground">present streak</p>
        </div>
        <div className="bg-card py-3.5">
          <p className="text-[18px] font-semibold tnum">{streaks.longestPresent}</p>
          <p className="text-[10.5px] text-muted-foreground">longest</p>
        </div>
        <div className="bg-card py-3.5">
          <p className="text-[18px] font-semibold tnum">{streaks.currentMiss}</p>
          <p className="text-[10.5px] text-muted-foreground">missed streak</p>
        </div>
      </section>

      {/* Month stats */}
      <section className="mt-4 rounded-xl border border-border bg-card p-4">
        <p className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {month.toLocaleDateString("en-US", { month: "long" })} classes
        </p>
        <Row label="Conducted" value={monthStats.conducted} />
        <Row label="Present (incl. leave)" value={monthStats.present} />
        <Row label="Absent" value={monthStats.absent} />
        <Row label="Cancelled" value={monthStats.cancelled} />
        <Row label="Holiday" value={monthStats.holiday} />
        <Row label="Event days" value={monthStats.eventDays} />
      </section>

      {/* Events for selected date */}
      <section className="mt-6">
        <p className="mb-2.5 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Events · {selectedDate}
        </p>
        {(data.events.filter((e) => !e.deletedAt && e.date === selectedDate)).length === 0 ? (
          <EmptyHint>
            Nothing on this day.{" "}
            <button type="button" className="underline underline-offset-2" onClick={() => setOpen(true)}>
              Add an event
            </button>
          </EmptyHint>
        ) : (
          <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card">
            {data.events
              .filter((e) => !e.deletedAt && e.date === selectedDate)
              .map((e) => (
                <div key={e._id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium">{e.title}</p>
                    <p className="text-[11.5px] text-muted-foreground">{EVENT_TYPE_LABEL[e.type] ?? e.type}</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Delete event"
                    className="rounded-md p-1 text-muted-foreground active:opacity-60"
                    onClick={async () => {
                      await deleteEvent({ id: e._id });
                      toast("Event removed");
                    }}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
          </div>
        )}
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          Tap a day above to mark or correct attendance and view its events.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-3 h-10 w-full rounded-xl text-[13px]"
          onClick={() => setMarkOpen(true)}
        >
          <CalendarClock className="size-4" />
          Mark attendance for {selectedDate}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="mt-2 h-10 w-full rounded-xl text-[13px]"
          onClick={() => setHolidayOpen(true)}
        >
          <PartyPopper className="size-4" />
          Mark holiday / festival for {selectedDate}
        </Button>
      </section>

      <EventDialog
        open={open}
        onOpenChange={setOpen}
        date={selectedDate}
        onSubmit={async (v) => {
          await saveEvent(v);
          setOpen(false);
          toast("Event saved");
        }}
      />

      <HolidayDialog
        open={holidayOpen}
        onOpenChange={setHolidayOpen}
        date={selectedDate}
        slots={data.slots ?? []}
        attendance={data.attendance}
        saveEvent={saveEvent}
        markAttendance={markAttendance}
      />

      <MarkAttendanceDialog
        open={markOpen}
        onOpenChange={setMarkOpen}
        subjects={(data.subjects ?? []).filter((s) => !s.archived)}
        attendance={data.attendance}
        initialDate={selectedDate}
        initialSubjectId={null}
      />
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between border-t border-border/60 py-1.5 first:border-t-0">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="text-[13px] font-medium tnum">{value}</span>
    </div>
  );
}

function EventDialog({
  open,
  onOpenChange,
  date,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  date: string;
  onSubmit: (v: { title: string; date: string; type: string; notes?: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("college_event");
  const [eventDate, setEventDate] = useState(date);
  const [notes, setNotes] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[16px]">Add calendar event</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3.5 pb-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!title.trim()) {
              toast.error("Give the event a title");
              return;
            }
            await onSubmit({ title: title.trim(), date: eventDate, type, notes: notes || undefined });
            setTitle("");
            setNotes("");
          }}
        >
          <div className="space-y-1.5">
            <Label className="text-[12px] text-muted-foreground">Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tech fest / Diwali break" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">Date</Label>
              <Input value={eventDate} onChange={(e) => setEventDate(e.target.value)} type="date" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">Type</Label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-[14px]"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>{EVENT_TYPE_LABEL[t]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px] text-muted-foreground">Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <Button type="submit" className="h-11 w-full rounded-xl">Save event</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function HolidayDialog({
  open,
  onOpenChange,
  date,
  slots,
  attendance,
  saveEvent,
  markAttendance,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  date: string;
  slots: Doc<"timetableSlots">[];
  attendance: Doc<"attendance">[];
  saveEvent: (v: { title: string; date: string; type: string; notes?: string }) => Promise<unknown>;
  markAttendance: (v: { subjectId: Id<"subjects">; date: string; status: string }) => Promise<unknown>;
}) {
  const [type, setType] = useState("govt_holiday");
  const [title, setTitle] = useState("");
  const [holidayDate, setHolidayDate] = useState(date);
  const [cancelClasses, setCancelClasses] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setType("govt_holiday");
      setTitle("");
      setHolidayDate(date);
      setCancelClasses(true);
    }
  }, [open, date]);

  const weekday = parseDate(holidayDate).getDay();
  const scheduledCount = new Set(
    slots.filter((s) => !s.deletedAt && s.day === weekday).map((s) => s.subjectId),
  ).size;
  const recordedCount = attendance.filter((a) => !a.deletedAt && a.date === holidayDate).length;

  const nextOccurrence = (month: number, day: number) => {
    const now = new Date();
    let d = new Date(now.getFullYear(), month - 1, day);
    if (d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
      d = new Date(now.getFullYear() + 1, month - 1, day);
    }
    return todayStr(d);
  };

  const save = async () => {
    if (!title.trim()) {
      toast.error("Give the holiday a name");
      return;
    }
    setSaving(true);
    try {
      await saveEvent({ title: title.trim(), date: holidayDate, type });
      let cancelled = 0;
      if (cancelClasses) {
        const subjectIds = new Set(
          slots
            .filter((s) => !s.deletedAt && s.day === parseDate(holidayDate).getDay())
            .map((s) => s.subjectId),
        );
        for (const subjectId of subjectIds) {
          await markAttendance({ subjectId, date: holidayDate, status: "cancelled" });
          cancelled += 1;
        }
      }
      onOpenChange(false);
      toast(
        cancelled > 0
          ? `Holiday saved · ${cancelled} ${cancelled === 1 ? "class" : "classes"} cancelled`
          : "Holiday saved",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[16px]">Mark a holiday or festival</DialogTitle>
        </DialogHeader>
        <div className="space-y-3.5 pb-2">
          <div className="flex flex-wrap gap-1.5">
            {GOVT_HOLIDAY_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                className="rounded-full border border-border bg-card px-3 py-1.5 text-[12px] active:opacity-60"
                onClick={() => {
                  setTitle(p.name);
                  setType("govt_holiday");
                  setHolidayDate(nextOccurrence(p.month, p.day));
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px] text-muted-foreground">Name *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Diwali / Independence Day"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">Date</Label>
              <Input value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} type="date" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">Type</Label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-[14px]"
              >
                <option value="govt_holiday">Government holiday</option>
                <option value="festival">Festival holiday</option>
                <option value="college_holiday">College holiday</option>
              </select>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCancelClasses((v) => !v)}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 text-left active:opacity-70"
          >
            <span
              className={`flex size-5 items-center justify-center rounded-md border ${
                cancelClasses ? "border-primary bg-primary text-primary-foreground" : "border-border bg-transparent"
              }`}
            >
              {cancelClasses && <Check className="size-3.5" strokeWidth={3} />}
            </span>
            <span className="flex-1">
              <span className="block text-[13.5px] font-medium">Cancel scheduled classes</span>
              <span className="block text-[11.5px] text-muted-foreground">
                {scheduledCount > 0
                  ? `Marks ${scheduledCount} subject${scheduledCount === 1 ? "" : "s"} as cancelled on this date`
                  : "No classes scheduled on this weekday"}
              </span>
            </span>
          </button>
          {recordedCount > 0 && (
            <p className="text-[11.5px] leading-relaxed text-muted-foreground">
              {recordedCount} attendance {recordedCount === 1 ? "record" : "records"} already exist for this
              date — cancelling will overwrite them (kept in your history).
            </p>
          )}
          <Button type="button" disabled={saving} onClick={save} className="h-11 w-full rounded-xl">
            {saving ? "Saving…" : "Save holiday"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
