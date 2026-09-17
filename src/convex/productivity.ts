import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { logActivity, requireUserId } from "./helpers";

// ---------- Study sessions ----------

export const createSession = mutation({
  args: {
    subjectId: v.optional(v.id("subjects")),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    durationMin: v.number(),
    type: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const id = await ctx.db.insert("studySessions", {
      userId,
      ...args,
      createdAt: Date.now(),
    });
    await logActivity(ctx, userId, {
      action: "created",
      entity: "session",
      entityTitle: args.subjectId ? undefined : "Study session",
      subjectId: args.subjectId,
      newValue: `${args.durationMin} min`,
    });
    return id;
  },
});

export const deleteSession = mutation({
  args: { id: v.id("studySessions") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(id);
    if (!row || row.userId !== userId) throw new Error("Session not found");
    await ctx.db.patch(id, { deletedAt: Date.now() });
    await logActivity(ctx, userId, {
      action: "deleted",
      entity: "session",
      subjectId: row.subjectId,
      prevValue: `${row.durationMin} min`,
    });
  },
});

// ---------- Goals & tasks ----------

export const createGoal = mutation({
  args: {
    title: v.string(),
    scope: v.string(),
    subjectId: v.optional(v.id("subjects")),
    dueDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const id = await ctx.db.insert("goals", {
      userId,
      ...args,
      done: false,
      createdAt: Date.now(),
    });
    await logActivity(ctx, userId, {
      action: "created",
      entity: "goal",
      entityTitle: args.title,
      subjectId: args.subjectId,
    });
    return id;
  },
});

export const toggleGoal = mutation({
  args: { id: v.id("goals"), done: v.boolean() },
  handler: async (ctx, { id, done }) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(id);
    if (!row || row.userId !== userId) throw new Error("Goal not found");
    await ctx.db.patch(id, { done, doneAt: done ? Date.now() : undefined });
    await logActivity(ctx, userId, {
      action: done ? "completed" : "reopened",
      entity: "goal",
      entityTitle: row.title,
      subjectId: row.subjectId,
    });
  },
});

export const deleteGoal = mutation({
  args: { id: v.id("goals") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(id);
    if (!row || row.userId !== userId) throw new Error("Goal not found");
    await ctx.db.patch(id, { deletedAt: Date.now() });
    await logActivity(ctx, userId, {
      action: "deleted",
      entity: "goal",
      entityTitle: row.title,
    });
  },
});

// ---------- Notes ----------

export const saveNote = mutation({
  args: {
    id: v.optional(v.id("notes")),
    subjectId: v.optional(v.id("subjects")),
    title: v.string(),
    body: v.string(),
    kind: v.optional(v.string()),
    pinned: v.boolean(),
  },
  handler: async (ctx, { id, ...fields }) => {
    const userId = await requireUserId(ctx);
    if (id) {
      const row = await ctx.db.get(id);
      if (!row || row.userId !== userId) throw new Error("Note not found");
      await ctx.db.patch(id, fields);
      await logActivity(ctx, userId, {
        action: "edited",
        entity: "note",
        entityTitle: fields.title,
        subjectId: row.subjectId,
      });
      return id;
    }
    const newId = await ctx.db.insert("notes", {
      userId,
      ...fields,
      createdAt: Date.now(),
    });
    await logActivity(ctx, userId, {
      action: "created",
      entity: "note",
      entityTitle: fields.title,
      subjectId: fields.subjectId,
    });
    return newId;
  },
});

export const deleteNote = mutation({
  args: { id: v.id("notes") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(id);
    if (!row || row.userId !== userId) throw new Error("Note not found");
    await ctx.db.patch(id, { deletedAt: Date.now() });
    await logActivity(ctx, userId, {
      action: "deleted",
      entity: "note",
      entityTitle: row.title,
    });
  },
});

// ---------- Bookmarks ----------

export const createBookmark = mutation({
  args: {
    itemType: v.string(),
    refId: v.string(),
    title: v.string(),
    subjectId: v.optional(v.id("subjects")),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = (await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect()
    ).find(
      (b) =>
        !b.deletedAt && b.itemType === args.itemType && b.refId === args.refId,
    );
    if (existing) return existing._id;
    const id = await ctx.db.insert("bookmarks", {
      userId,
      ...args,
      createdAt: Date.now(),
    });
    await logActivity(ctx, userId, {
      action: "created",
      entity: "bookmark",
      entityTitle: args.title,
    });
    return id;
  },
});

export const deleteBookmark = mutation({
  args: { id: v.id("bookmarks") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(id);
    if (!row || row.userId !== userId) throw new Error("Bookmark not found");
    await ctx.db.patch(id, { deletedAt: Date.now() });
    if (row.itemType === "topic") {
      const topic = await ctx.db.get(row.refId as any);
      if (topic && "starred" in topic && topic.starred) {
        await ctx.db.patch(row.refId as any, { starred: false });
      }
    }
    await logActivity(ctx, userId, {
      action: "deleted",
      entity: "bookmark",
      entityTitle: row.title,
    });
  },
});

// ---------- Semesters / CGPA ----------

export const saveSemester = mutation({
  args: {
    id: v.optional(v.id("semesters")),
    name: v.string(),
    order: v.number(),
    completed: v.boolean(),
  },
  handler: async (ctx, { id, ...fields }) => {
    const userId = await requireUserId(ctx);
    if (id) {
      const row = await ctx.db.get(id);
      if (!row || row.userId !== userId) throw new Error("Semester not found");
      await ctx.db.patch(id, fields);
      await logActivity(ctx, userId, {
        action: "edited",
        entity: "semester",
        entityTitle: fields.name,
      });
      return id;
    }
    const newId = await ctx.db.insert("semesters", {
      userId,
      ...fields,
      createdAt: Date.now(),
    });
    await logActivity(ctx, userId, {
      action: "created",
      entity: "semester",
      entityTitle: fields.name,
    });
    return newId;
  },
});

export const deleteSemester = mutation({
  args: { id: v.id("semesters") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(id);
    if (!row || row.userId !== userId) throw new Error("Semester not found");
    await ctx.db.patch(id, { deletedAt: Date.now() });
    const courses = (await ctx.db
      .query("semesterCourses")
      .withIndex("by_semester", (q) => q.eq("semesterId", id))
      .collect()
    ).filter((c) => !c.deletedAt);
    for (const c of courses) await ctx.db.patch(c._id, { deletedAt: Date.now() });
    await logActivity(ctx, userId, {
      action: "deleted",
      entity: "semester",
      entityTitle: row.name,
    });
  },
});

export const saveCourse = mutation({
  args: {
    id: v.optional(v.id("semesterCourses")),
    semesterId: v.id("semesters"),
    name: v.string(),
    credits: v.number(),
    gradePoint: v.number(),
  },
  handler: async (ctx, { id, ...fields }) => {
    const userId = await requireUserId(ctx);
    const semester = await ctx.db.get(fields.semesterId);
    if (!semester || semester.userId !== userId) throw new Error("Semester not found");
    if (id) {
      const row = await ctx.db.get(id);
      if (!row || row.userId !== userId) throw new Error("Course not found");
      await ctx.db.patch(id, fields);
      await logActivity(ctx, userId, {
        action: "edited",
        entity: "course",
        entityTitle: fields.name,
        prevValue: `${row.gradePoint} · ${row.credits}cr`,
        newValue: `${fields.gradePoint} · ${fields.credits}cr`,
      });
      return id;
    }
    const newId = await ctx.db.insert("semesterCourses", {
      userId,
      ...fields,
      createdAt: Date.now(),
    });
    await logActivity(ctx, userId, {
      action: "created",
      entity: "course",
      entityTitle: fields.name,
      newValue: `${fields.gradePoint} · ${fields.credits}cr`,
    });
    return newId;
  },
});

export const deleteCourse = mutation({
  args: { id: v.id("semesterCourses") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(id);
    if (!row || row.userId !== userId) throw new Error("Course not found");
    await ctx.db.patch(id, { deletedAt: Date.now() });
    await logActivity(ctx, userId, {
      action: "deleted",
      entity: "course",
      entityTitle: row.name,
    });
  },
});

// ---------- Reminders ----------

export const createReminder = mutation({
  args: {
    title: v.string(),
    body: v.optional(v.string()),
    dueDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const id = await ctx.db.insert("reminders", {
      userId,
      kind: "custom",
      read: false,
      ...args,
      createdAt: Date.now(),
    });
    await logActivity(ctx, userId, {
      action: "created",
      entity: "reminder",
      entityTitle: args.title,
    });
    return id;
  },
});

export const markReminderRead = mutation({
  args: { id: v.id("reminders"), read: v.boolean() },
  handler: async (ctx, { id, read }) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(id);
    if (!row || row.userId !== userId) throw new Error("Reminder not found");
    await ctx.db.patch(id, { read });
  },
});

export const deleteReminder = mutation({
  args: { id: v.id("reminders") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(id);
    if (!row || row.userId !== userId) throw new Error("Reminder not found");
    await ctx.db.patch(id, { deletedAt: Date.now() });
  },
});
