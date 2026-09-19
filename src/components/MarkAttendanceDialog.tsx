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
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { todayStr } from "@/lib/academic";
import { useMutation } from "convex/react";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const STATUSES = ["present", "absent", "leave", "cancelled"] as const;
type StatusKey = (typeof STATUSES)[number];

const STATUS_META: Record<StatusKey, { short: string; full: string }> = {
  present: { short: "P", full: "Present" },
  absent: { short: "A", full: "Absent" },
  leave: { short: "L", full: "Leave" },
  cancelled: { short: "C", full: "Cancelled" },
};

/**
 * Mark or correct attendance for any date — today or in the past.
 * Marking the same subject+date twice replaces the record (a tracked
 * correction in the activity log), so this doubles as the correction UI.
 */
export function MarkAttendanceDialog({
  open,
  onOpenChange,
  subjects,
  attendance,
  initialDate,
  initialSubjectId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  subjects: Doc<"subjects">[];
  attendance: Doc<"attendance">[];
  initialDate?: string;
  initialSubjectId?: Id<"subjects"> | null;
}) {
  const mark = useMutation(api.schedule.markAttendance);
  const remove = useMutation(api.schedule.deleteAttendance);

  const [date, setDate] = useState(initialDate ?? todayStr());
  const [subjectId, setSubjectId] = useState<string>(
    initialSubjectId ?? subjects[0]?._id ?? "",
  );
  const [busy, setBusy] = useState(false);

  // Re-seed fields each time the dialog opens with a new target.
  useEffect(() => {
    if (open) {
      setDate(initialDate ?? todayStr());
      setSubjectId(initialSubjectId ?? subjects[0]?._id ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialDate, initialSubjectId]);

  const existing = attendance.find(
    (a) => !a.deletedAt && a.date === date && a.subjectId === subjectId,
  );

  const set = async (status: StatusKey) => {
    if (!subjectId || busy) return;
    setBusy(true);
    try {
      const corrected = existing && existing.status !== status;
      await mark({ subjectId: subjectId as Id<"subjects">, date, status });
      toast(
        corrected
          ? `Corrected to ${STATUS_META[status].full.toLowerCase()} · ${date}`
          : `${STATUS_META[status].full} · ${date}`,
      );
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  const removeRecord = async () => {
    if (!existing || busy) return;
    setBusy(true);
    try {
      await remove({ id: existing._id });
      toast(`Record removed · ${date}`);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[16px]">Mark attendance</DialogTitle>
        </DialogHeader>
        {subjects.length === 0 ? (
          <p className="pb-3 text-[13px] text-muted-foreground">
            Create a subject first, then mark attendance here.
          </p>
        ) : (
          <div className="space-y-3.5 pb-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">Date</Label>
                <Input
                  type="date"
                  value={date}
                  max={todayStr()}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">Subject</Label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-[14px]"
                >
                  {subjects.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {STATUSES.map((st) => {
                const active = existing?.status === st;
                return (
                  <button
                    key={st}
                    type="button"
                    disabled={busy || !subjectId}
                    onClick={() => set(st)}
                    className={`flex h-11 items-center justify-center rounded-lg border text-[13px] font-medium transition-colors active:opacity-70 ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : st === "present"
                          ? "border-foreground/50"
                          : "border-border text-muted-foreground"
                    }`}
                  >
                    {STATUS_META[st].short}
                  </button>
                );
              })}
            </div>

            {existing ? (
              <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3">
                <p className="text-[11.5px] leading-snug text-muted-foreground">
                  Recorded as{" "}
                  <span className="font-medium capitalize text-foreground">
                    {existing.status}
                  </span>
                  . Tap a status above to correct it.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 rounded-lg text-[12px]"
                  disabled={busy}
                  onClick={removeRecord}
                >
                  <Trash2 className="size-3.5" />
                  Remove
                </Button>
              </div>
            ) : (
              <p className="text-[11.5px] leading-snug text-muted-foreground">
                No record yet for this day. Past dates are fine — changes are
                logged in your history.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
