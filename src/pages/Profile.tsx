import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/AcademicUI";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useAcademicData } from "@/hooks/use-academic-data";
import { totalStudyMinutes } from "@/lib/academic";
import { LogOut, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

export default function Profile() {
  const { user, signOut } = useAuth();
  const data = useAcademicData();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const counts = data
    ? {
        subjects: data.subjects.filter((s) => !s.archived).length,
        chapters: data.chapters.filter((c) => !c.deletedAt).length,
        records: data.attendance.filter((a) => !a.deletedAt).length,
        sessions: data.sessions.filter((s) => !s.deletedAt).length,
        assessments: data.assessments.filter((a) => !a.deletedAt).length,
        notes: data.notes.filter((n) => !n.deletedAt).length,
        study: totalStudyMinutes(data),
      }
    : null;

  return (
    <AppShell title="Profile">
      <PageHeader title="Profile" subtitle="Your account and data" />

      {/* Identity */}
      <div className="mb-6 rounded-xl border border-border bg-card p-5 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-border text-[18px] font-semibold">
          {(user?.name ?? user?.email ?? "S").slice(0, 1).toUpperCase()}
        </div>
        <p className="mt-3 text-[16px] font-semibold">{user?.name ?? "Student"}</p>
        {user?.email && <p className="mt-0.5 text-[12.5px] text-muted-foreground">{user.email}</p>}
      </div>

      {/* Data summary */}
      {counts && (
        <section className="mb-6">
          <p className="mb-2.5 text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Your data
          </p>
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border/60 text-center">
            {[
              ["Subjects", counts.subjects],
              ["Chapters", counts.chapters],
              ["Attendance", counts.records],
              ["Assessments", counts.assessments],
              ["Sessions", counts.sessions],
              ["Notes", counts.notes],
            ].map(([label, value]) => (
              <div key={label as string} className="bg-card py-3.5">
                <p className="text-[17px] font-semibold tnum">{value as number}</p>
                <p className="text-[10px] text-muted-foreground">{label as string}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11.5px] text-muted-foreground tnum">
            {Math.round(counts.study / 60)} hours of study logged all time.
          </p>
        </section>
      )}

      {/* Privacy */}
      <section className="mb-6 rounded-xl border border-border bg-card p-4">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="text-[13.5px] font-medium">Private by design</p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              All of your academic data is stored under your account and scoped to you on
              every query. Every change is logged and deletions are soft — nothing is ever
              silently lost.
            </p>
          </div>
        </div>
      </section>

      <Button
        variant="outline"
        className="h-11 w-full rounded-xl"
        onClick={handleSignOut}
      >
        <LogOut className="size-4" /> Sign out
      </Button>

      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        Scholar · Student Academic OS
      </p>
      {voidToastNote()}
    </AppShell>
  );
}

function voidToastNote() {
  // reserved: future settings actions surface here
  return null;
}
