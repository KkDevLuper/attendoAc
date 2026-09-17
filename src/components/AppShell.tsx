import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  BarChart3,
  Bell,
  Bookmark,
  CalendarDays,
  CheckSquare,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  NotebookPen,
  Plus,
  Settings2,
  Timer,
  User,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";

export const NAV_ITEMS = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/subjects", label: "Subjects", icon: GraduationCap },
  { to: "/timetable", label: "Timetable", icon: CalendarDays },
  { to: "/attendance", label: "Attendance", icon: CheckSquare },
  { to: "/more", label: "More", icon: ListChecks },
];

const MORE_LINKS = [
  { to: "/syllabus", label: "Syllabus & Preparation", desc: "Chapters, topics, revisions", icon: ListChecks },
  { to: "/marks", label: "Marks", desc: "Assessments & trends", icon: BarChart3 },
  { to: "/study", label: "Study & Goals", desc: "Sessions, tasks, habits", icon: Timer },
  { to: "/calendar", label: "Calendar", desc: "Events, heatmap, streaks", icon: CalendarDays },
  { to: "/analytics", label: "Analytics", desc: "Trends & reports", icon: BarChart3 },
  { to: "/cgpa", label: "CGPA", desc: "Semesters & GPA", icon: GraduationCap },
  { to: "/notifications", label: "Notifications", desc: "Alerts & reminders", icon: Bell },
  { to: "/bookmarks", label: "Bookmarks", desc: "Saved items", icon: Bookmark },
  { to: "/history", label: "History", desc: "Activity log", icon: NotebookPen },
  { to: "/profile", label: "Profile & Settings", desc: "Account & data", icon: User },
];

const QUICK_ACTIONS = [
  { to: "/attendance?mark=1", label: "Mark attendance", icon: CheckSquare },
  { to: "/study?log=1", label: "Log study session", icon: Timer },
  { to: "/marks?add=1", label: "Add marks", icon: BarChart3 },
  { to: "/goals?add=1", label: "Create a goal", icon: CheckSquare },
  { to: "/calendar?add=1", label: "Add calendar event", icon: CalendarDays },
  { to: "/notifications?add=1", label: "Set a reminder", icon: Bell },
];

export function AppShell({
  title,
  children,
  actions,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quickOpen, setQuickOpen] = useState(false);

  const isActive = (to: string) =>
    to === "/more" ? location.pathname === "/more" : location.pathname.startsWith(to);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/95 px-4 pb-3 pt-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <h1 className="truncate text-[17px] font-semibold tracking-tight">{title}</h1>
          <div className="flex items-center gap-1">
            {actions}
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="relative size-9 rounded-full"
              aria-label="Notifications"
            >
              <Link to="/notifications">
                <Bell className="size-[18px]" strokeWidth={1.75} />
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="size-9 rounded-full"
              aria-label="Profile"
            >
              <Link to="/profile">
                <User className="size-[18px]" strokeWidth={1.75} />
              </Link>
            </Button>
          </div>
        </div>
        {actions && <div className="mt-3">{actions}</div>}
      </header>

      <main className="flex-1 px-4 pb-28 pt-4">{children}</main>

      {/* Floating quick-add */}
      <button
        type="button"
        onClick={() => setQuickOpen((v) => !v)}
        aria-label="Quick add"
        className="fixed bottom-24 right-[max(1rem,calc(50%-13.5rem))] z-30 flex size-12 items-center justify-center rounded-full border border-border bg-foreground text-background shadow-lg transition-transform active:scale-95"
      >
        <Plus className={quickOpen ? "rotate-45 transition-transform" : "transition-transform"} />
      </button>

      {quickOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-[2px]"
          onClick={() => setQuickOpen(false)}
        >
          <div
            className="absolute bottom-20 left-1/2 w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-border bg-card p-2 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Quick add
            </p>
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.to}
                type="button"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[14px] active:bg-accent"
                onClick={() => {
                  setQuickOpen(false);
                  navigate(a.to);
                }}
              >
                <a.icon className="size-4 text-muted-foreground" strokeWidth={1.75} />
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-border/70 bg-background/95 backdrop-blur">
        <div className="grid grid-cols-5 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-1 rounded-lg py-1.5 text-[10px] font-medium transition-colors ${
                  active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <item.icon className="size-[20px]" strokeWidth={active ? 2 : 1.5} />
                {item.label}
                <span
                  className={`h-0.5 w-4 rounded-full ${active ? "bg-foreground" : "bg-transparent"}`}
                />
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function MoreMenu() {
  const navigate = useNavigate();
  const { user } = useAuth();
  void user;
  return (
    <div className="divide-y divide-border/60">
      {MORE_LINKS.map((l) => (
        <button
          key={l.to}
          type="button"
          onClick={() => navigate(l.to)}
          className="flex w-full items-center gap-3.5 py-3.5 text-left active:opacity-70"
        >
          <span className="flex size-9 items-center justify-center rounded-lg border border-border">
            <l.icon className="size-4" strokeWidth={1.75} />
          </span>
          <span className="flex-1">
            <span className="block text-[14px] font-medium">{l.label}</span>
            <span className="block text-[12px] text-muted-foreground">{l.desc}</span>
          </span>
        </button>
      ))}
      <div className="py-3.5">
        <p className="text-[12px] text-muted-foreground">
          {MORE_LINKS.length} modules · data stays private to your account
        </p>
      </div>
    </div>
  );
}

export function usePlaceholderToast() {
  return () => toast("Coming soon");
}
