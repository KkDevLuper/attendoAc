import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { ArrowRight, Bell, CalendarDays, GraduationCap, Timer } from "lucide-react";
import { Link } from "react-router";

const MODULES = [
  { icon: GraduationCap, title: "Subjects", desc: "Every course with its own live mini-dashboard." },
  { icon: CalendarDays, title: "Timetable & Attendance", desc: "75% targets, safe bunks, streaks." },
  { icon: Timer, title: "Study & Goals", desc: "Sessions, revisions, daily tasks." },
  { icon: Bell, title: "Insights", desc: "Health, readiness and CGPA — never fake numbers." },
];

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-background text-foreground"
    >
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6">
        <header className="flex items-center justify-between py-6">
          <span className="text-[13px] font-semibold uppercase tracking-[0.18em] text-primary">Scholar</span>
          <Link
            to={isAuthenticated ? "/dashboard" : "/auth"}
            className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            {isAuthenticated ? "Open app" : "Sign in"}
          </Link>
        </header>

        <section className="flex flex-1 flex-col justify-center py-14">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground"
          >
            Student Academic OS
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="mt-4 text-[38px] font-semibold leading-[1.08] tracking-tight"
          >
            Where do I stand,
            <br />
            <span className="text-muted-foreground">right now?</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            className="mt-5 max-w-sm text-[15px] leading-relaxed text-muted-foreground"
          >
            Attendance, syllabus, marks, study time and CGPA — connected in one calm place,
            from your own data. Nothing estimated. Nothing invented.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
            className="mt-8 flex flex-col gap-3"
          >
            <Button asChild size="lg" className="h-12 rounded-xl text-[15px]">
              <Link to={isAuthenticated ? "/dashboard" : "/auth"}>
                {isAuthenticated ? "Open Scholar" : "Start free"}
                <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 rounded-xl text-[15px]">
              <Link to="/auth">Continue as guest</Link>
            </Button>
          </motion.div>
        </section>

        <section className="pb-14">
          <div className="mb-4 flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Everything, connected
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-7">
            {MODULES.map((m, i) => (
              <motion.div
                key={m.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.36 + i * 0.06 }}
              >
                <m.icon className="size-[18px] text-muted-foreground" strokeWidth={1.5} />
                <p className="mt-2.5 text-[14px] font-medium">{m.title}</p>
                <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">{m.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="glass mt-12 rounded-2xl border border-border p-5">
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              “Open the app at the end of the day and know your entire academic situation
              within a few minutes.”
            </p>
            <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground/70">
              The Scholar principle
            </p>
          </div>
        </section>

        <footer className="flex items-center justify-between border-t border-border py-6 text-[11px] text-muted-foreground">
          <span>Scholar</span>
          <span>Minimal · Private · Yours</span>
        </footer>
      </div>
    </motion.div>
  );
}
