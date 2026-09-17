import { AppShell } from "@/components/AppShell";
import { EmptyHint, PageHeader } from "@/components/AcademicUI";
import { api } from "@/convex/_generated/api";
import { useAcademicData } from "@/hooks/use-academic-data";
import { useMutation } from "convex/react";
import { Star, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

export default function Bookmarks() {
  const data = useAcademicData();
  const removeBookmark = useMutation(api.productivity.deleteBookmark);
  const removeNote = useMutation(api.productivity.deleteNote);

  const items = useMemo(() => {
    if (!data) return [];
    const topics = data.bookmarks
      .filter((b) => !b.deletedAt && b.itemType === "topic")
      .map((b) => ({
        id: b._id as string,
        isNote: false,
        title: b.title,
        subject: "",
        subjectId: (b.subjectId ?? undefined) as string | undefined,
        done: false,
        kind: undefined as string | undefined,
        topicId: b.refId,
      }));
    for (const item of topics) {
      const topic = data.topics.find((t) => t._id === item.topicId);
      if (topic) {
        item.title = topic.title;
        item.done = topic.status === "done";
        item.subject = data.subjects.find((s) => s._id === topic.subjectId)?.name ?? "Unknown subject";
        item.subjectId = topic.subjectId;
      }
    }
    const notes = (data.notes ?? [])
      .filter((n) => !n.deletedAt && n.kind && n.kind !== "note")
      .map((n) => ({
        id: n._id as string,
        isNote: true,
        title: n.title,
        subject: n.subjectId
          ? (data.subjects.find((s) => s._id === n.subjectId)?.name ?? "—")
          : "General",
        subjectId: (n.subjectId ?? undefined) as string | undefined,
        done: false,
        kind: n.kind,
        topicId: undefined as string | undefined,
      }));
    return [...topics, ...notes];
  }, [data]);

  if (!data) {
    return (
      <AppShell title="Bookmarks">
        <div className="space-y-3 pt-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Bookmarks">
      <PageHeader
        title="Bookmarks"
        subtitle="Starred topics and important items across subjects"
      />

      {items.length === 0 ? (
        <EmptyHint>
          Nothing bookmarked yet. Star topics in a subject's Syllabus tab, or save formulas
          and important questions as notes — they all land here.
        </EmptyHint>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
              <Star className="size-4 shrink-0 fill-foreground text-foreground" />
              <div className="min-w-0 flex-1">
                {item.isNote ? (
                  <>
                    <p className="truncate text-[14px] font-medium">{item.title}</p>
                    <p className="text-[11.5px] text-muted-foreground">
                      {[item.subject, item.kind].filter(Boolean).join(" · ")}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="truncate text-[14px] font-medium">
                      {item.title}
                      {item.done && <span className="ml-1.5 text-[10.5px] font-normal text-muted-foreground">done</span>}
                    </p>
                    <p className="text-[11.5px] text-muted-foreground">{item.subject}</p>
                  </>
                )}
              </div>
              {item.subjectId ? (
                <Link to={`/subjects/${item.subjectId}`} className="text-[12px] text-muted-foreground underline-offset-2">
                  Open
                </Link>
              ) : null}
              <button
                type="button"
                aria-label="Remove bookmark"
                className="rounded-md p-1 text-muted-foreground active:opacity-60"
                onClick={async () => {
                  if (item.isNote) {
                    await removeNote({ id: item.id as never });
                  } else {
                    await removeBookmark({ id: item.id as never });
                  }
                  toast("Removed");
                }}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
