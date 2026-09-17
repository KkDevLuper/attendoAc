import { query } from "./_generated/server";
import { requireUserId } from "./helpers";

/**
 * Every user data query funnels through here: all pages fetch a single
 * allData query (reactive), and mutations invalidate it automatically.
 * Each table is scoped by userId so one student can never see another's data.
 */
export const allData = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);

    const [
      subjects,
      chapters,
      topics,
      assessments,
      slots,
      attendance,
      events,
      sessions,
      goals,
      notes,
      bookmarks,
      semesters,
      semesterCourses,
      reminders,
      milestones,
      activity,
    ] = await Promise.all([
      ctx.db
        .query("subjects")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("chapters")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("topics")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("assessments")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("timetableSlots")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("attendance")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("calendarEvents")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("studySessions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("goals")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("notes")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("bookmarks")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("semesters")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("semesterCourses")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("reminders")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("milestones")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("activity")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
    ]);

    return {
      subjects,
      chapters,
      topics,
      assessments,
      slots,
      attendance,
      events,
      sessions,
      goals,
      notes,
      bookmarks,
      semesters,
      semesterCourses,
      reminders,
      milestones,
      activity,
    };
  },
});
