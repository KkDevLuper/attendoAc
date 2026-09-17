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
import { useAcademicData } from "@/hooks/use-academic-data";
import { computeAlerts, daysBetween, todayStr } from "@/lib/academic";
import { useMutation } from "convex/react";
import { Bell, BellOff, Check, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export default function Notifications() {
  const data = useAcademicData();
  const createReminder = useMutation(api.productivity.createReminder);
  const markRead = useMutation(api.productivity.markReminderRead);
  const deleteReminder = useMutation(api.productivity.deleteReminder);
  const [open, setOpen] = useState(
    () => new URLSearchParams(window.location.search).get("add") === "1",
  );
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [due, setDue] = useState("");

  const alerts = useMemo(() => (data ? computeAlerts(data) : []), [data]);

  const autoReminders = useMemo(() => {
    if (!data) return [];
    const out: { title: string; detail: string }[] = [];
    for (const s of data.subjects.filter((x) => !x.archived && x.examDate)) {
      const d = daysBetween(todayStr(), s.examDate!);
      if (d >= 0 && d <= 14) {
        out.push({ title: `Exam: ${s.name}`, detail: d === 0 ? "Today" : `In ${d} day${d === 1 ? "" : "s"}` });
      }
    }
    for (const g of data.goals.filter((g) => !g.deletedAt && !g.done && g.dueDate)) {
      const d = daysBetween(todayStr(), g.dueDate!);
      if (d <= 2) {
        out.push({ title: `Goal due: ${g.title}`, detail: d < 0 ? "Overdue" : d === 0 ? "Today" : `In ${d} day${d === 1 ? "" : "s"}` });
      }
    }
    for (const e of data.events.filter((e) => !e.deletedAt)) {
      const d = daysBetween(todayStr(), e.date);
      if (d >= 0 && d <= 7) {
        out.push({ title: e.title, detail: `${d === 0 ? "Today" : `In ${d}d`} · event` });
      }
    }
    return out.slice(0, 8);
  }, [data]);

  const reminders = useMemo(
    () => (data?.reminders ?? []).filter((r) => !r.deletedAt).sort((a, b) => b.createdAt - a.createdAt),
    [data],
  );

  if (!data) {
    return (
      <AppShell title="Notifications">
        <div className="space-y-3 pt-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Notifications">
      <PageHeader
        title="Notifications"
        subtitle="Real alerts from your data + your reminders"
        actions={
          <Button variant="ghost" size="icon" className="size-9 rounded-full" aria-label="New reminder" onClick={() => setOpen(true)}>
            <Plus className="size-[18px]" strokeWidth={1.75} />
          </Button>
        }
      />

      {/* Alerts */}
      <section className="mb-6">
        <p className="mb-2.5 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Needs attention
        </p>
        {alerts.length === 0 ? (
          <EmptyHint>
            <span className="flex items-center justify-center gap-1.5">
              <Bell className="size-3.5" /> All clear — nothing needs attention right now.
            </span>
          </EmptyHint>
        ) : (
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-xl border border-border bg-card px-4 py-3">
                <span className={`mt-1 size-1.5 shrink-0 rounded-full ${a.kind === "danger" ? "bg-foreground" : "bg-muted-foreground/60"}`} />
                <div>
                  <p className="text-[13.5px] font-medium leading-snug">{a.title}</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">{a.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Auto reminders */}
      {autoReminders.length > 0 && (
        <section className="mb-6">
          <p className="mb-2.5 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Coming up
          </p>
          <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-card">
            {autoReminders.map((r, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5">
                <p className="truncate text-[13.5px] font-medium">{r.title}</p>
                <span className="shrink-0 text-[12px] text-muted-foreground">{r.detail}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Custom reminders */}
      <section>
        <p className="mb-2.5 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Your reminders
        </p>
        {reminders.length === 0 ? (
          <EmptyHint>
            No custom reminders yet. Create one — e.g. “Collect lab record”.
          </EmptyHint>
        ) : (
          <div className="space-y-2">
            {reminders.map((r) => (
              <div
                key={r._id}
                className={`flex items-start gap-2.5 rounded-xl border bg-card px-4 py-3 ${r.read ? "border-border/60 opacity-60" : "border-border"}`}
              >
                <button
                  type="button"
                  aria-label={r.read ? "Mark unread" : "Mark read"}
                  onClick={() => markRead({ id: r._id, read: !r.read })}
                  className={`mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full border ${r.read ? "border-border text-muted-foreground" : "border-foreground bg-foreground text-background"}`}
                  style={{ width: 18, height: 18 }}
                >
                  {r.read ? <BellOff className="size-2.5" /> : <Check className="size-2.5" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`text-[13.5px] font-medium ${r.read ? "line-through" : ""}`}>{r.title}</p>
                  {r.body && <p className="mt-0.5 text-[12px] text-muted-foreground">{r.body}</p>}
                  {r.dueDate && <p className="mt-0.5 text-[11px] text-muted-foreground tnum">due {r.dueDate}</p>}
                </div>
                <button
                  type="button"
                  aria-label="Delete reminder"
                  className="rounded-md p-1 text-muted-foreground active:opacity-60"
                  onClick={() => deleteReminder({ id: r._id })}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[16px]">New reminder</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3.5 pb-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!title.trim()) {
                toast.error("Give the reminder a title");
                return;
              }
              await createReminder({ title: title.trim(), body: body || undefined, dueDate: due || undefined });
              setTitle("");
              setBody("");
              setDue("");
              setOpen(false);
              toast("Reminder created");
            }}
          >
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Fee submission" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">Due date</Label>
              <Input value={due} onChange={(e) => setDue(e.target.value)} type="date" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">Notes</Label>
              <Input value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
            <Button type="submit" className="h-11 w-full rounded-xl">Create reminder</Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
