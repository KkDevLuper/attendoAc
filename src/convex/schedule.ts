import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { logActivity, requireUserId } from "./helpers";

// ---------- Timetable ----------

export const createSlot = mutation({
  args: {
    subjectId: v.id("subjects"),
    faculty: v.optional(v.string()),
    room: v.optional(v.string()),
    day: v.number(),
    startTime: v.string(),
    endTime: v.string(),
    classType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const subject = await ctx.db.get(args.subjectId);
    if (!subject || subject.userId !== userId) throw new Error("Subject not found");
    const id = await ctx.db.insert("timetableSlots", {
      userId,
      ...args,
      createdAt: Date.now(),
    });
    await logActivity(ctx, userId, {
      action: "created",
      entity: "class",
      entityTitle: subject.name,
      subjectId: args.subjectId,
      newValue: slotLabel(args.day, args.startTime),
    });
    return id;
  },
});

export const updateSlot = mutation({
  args: {
    id: v.id("timetableSlots"),
    subjectId: v.optional(v.id("subjects")),
    faculty: v.optional(v.string()),
    room: v.optional(v.string()),
    day: v.optional(v.number()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    classType: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const userId = await requireUserId(ctx);
    const slot = await ctx.db.get(id);
    if (!slot || slot.userId !== userId) throw new Error("Slot not found");
    const patch: Record<string, unknown> = {};
    for (const key of Object.keys(fields) as (keyof typeof fields)[]) {
      if (fields[key] !== undefined && (slot[key] ?? null) !== (fields[key] ?? null)) {
        patch[key] = fields[key];
      }
    }
    if (Object.keys(patch).length) {
      await ctx.db.patch(id, patch);
      await logActivity(ctx, userId, {
        action: "edited",
        entity: "class",
        subjectId: slot.subjectId,
        field: "slot",
        prevValue: slotLabel(slot.day, slot.startTime),
        newValue: slotLabel(patch.day as number | undefined ?? slot.day, patch.startTime as string | undefined ?? slot.startTime),
      });
    }
  },
});

export const deleteSlot = mutation({
  args: { id: v.id("timetableSlots") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const slot = await ctx.db.get(id);
    if (!slot || slot.userId !== userId) throw new Error("Slot not found");
    await ctx.db.patch(id, { deletedAt: Date.now() });
    await logActivity(ctx, userId, {
      action: "deleted",
      entity: "class",
      subjectId: slot.subjectId,
      prevValue: slotLabel(slot.day, slot.startTime),
    });
  },
});

function slotLabel(day: number, time: string) {
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${names[day] ?? ""} ${time}`;
}

// ---------- Attendance ----------

export const markAttendance = mutation({
  args: {
    subjectId: v.id("subjects"),
    date: v.string(),
    status: v.string(),
    slotId: v.optional(v.id("timetableSlots")),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const subject = await ctx.db.get(args.subjectId);
    if (!subject || subject.userId !== userId) throw new Error("Subject not found");

    // Idempotent per subject+date: replace an existing record (correction).
    const existing = (await ctx.db
      .query("attendance")
      .withIndex("by_subject", (q) => q.eq("subjectId", args.subjectId))
      .collect()
    ).filter(
      (a) =>
        !a.deletedAt &&
        a.date === args.date &&
        (args.slotId ? a.slotId === args.slotId : !a.slotId),
    );
    const prev = existing[0];
    if (prev) {
      await ctx.db.patch(prev._id, {
        status: args.status,
        updatedAt: Date.now(),
        isCorrection: true,
      });
      await logActivity(ctx, userId, {
        action: "corrected",
        entity: "attendance",
        entityTitle: subject.name,
        subjectId: args.subjectId,
        field: args.date,
        prevValue: prev.status,
        newValue: args.status,
      });
      return prev._id;
    }
    const id = await ctx.db.insert("attendance", {
      userId,
      subjectId: args.subjectId,
      date: args.date,
      status: args.status,
      slotId: args.slotId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await logActivity(ctx, userId, {
      action: "recorded",
      entity: "attendance",
      entityTitle: subject.name,
      subjectId: args.subjectId,
      field: args.date,
      newValue: args.status,
    });
    return id;
  },
});

export const deleteAttendance = mutation({
  args: { id: v.id("attendance") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(id);
    if (!row || row.userId !== userId) throw new Error("Attendance record not found");
    await ctx.db.patch(id, { deletedAt: Date.now(), updatedAt: Date.now() });
    await logActivity(ctx, userId, {
      action: "removed",
      entity: "attendance",
      subjectId: row.subjectId,
      field: row.date,
      prevValue: row.status,
    });
  },
});

// ---------- Calendar ----------

export const saveEvent = mutation({
  args: {
    id: v.optional(v.id("calendarEvents")),
    title: v.string(),
    date: v.string(),
    endDate: v.optional(v.string()),
    type: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const userId = await requireUserId(ctx);
    if (id) {
      const row = await ctx.db.get(id);
      if (!row || row.userId !== userId) throw new Error("Event not found");
      await ctx.db.patch(id, fields);
      await logActivity(ctx, userId, {
        action: "edited",
        entity: "event",
        entityTitle: fields.title,
      });
      return id;
    }
    const newId = await ctx.db.insert("calendarEvents", {
      userId,
      ...fields,
      createdAt: Date.now(),
    });
    await logActivity(ctx, userId, {
      action: "created",
      entity: "event",
      entityTitle: fields.title,
      newValue: fields.date,
    });
    return newId;
  },
});

export const deleteEvent = mutation({
  args: { id: v.id("calendarEvents") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(id);
    if (!row || row.userId !== userId) throw new Error("Event not found");
    await ctx.db.patch(id, { deletedAt: Date.now() });
    await logActivity(ctx, userId, {
      action: "deleted",
      entity: "event",
      entityTitle: row.title,
    });
  },
});
