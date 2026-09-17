import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { mutation, MutationCtx } from "./_generated/server";
import { getSubject, logActivity, recordMilestone, requireUserId } from "./helpers";

const subjectFields = {
  name: v.string(),
  code: v.optional(v.string()),
  faculty: v.optional(v.string()),
  credits: v.optional(v.number()),
  department: v.optional(v.string()),
  semester: v.optional(v.string()),
  academicYear: v.optional(v.string()),
  classType: v.optional(v.string()),
  room: v.optional(v.string()),
  startDate: v.optional(v.string()),
  endDate: v.optional(v.string()),
  examDate: v.optional(v.string()),
  resultDate: v.optional(v.string()),
  color: v.optional(v.string()),
};

const subjectPatchFields = {
  name: v.optional(v.string()),
  code: v.optional(v.string()),
  faculty: v.optional(v.string()),
  credits: v.optional(v.number()),
  department: v.optional(v.string()),
  semester: v.optional(v.string()),
  academicYear: v.optional(v.string()),
  classType: v.optional(v.string()),
  room: v.optional(v.string()),
  startDate: v.optional(v.string()),
  endDate: v.optional(v.string()),
  examDate: v.optional(v.string()),
  resultDate: v.optional(v.string()),
  color: v.optional(v.string()),
};

export const create = mutation({
  args: subjectFields,
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const id = await ctx.db.insert("subjects", {
      userId,
      ...args,
      archived: false,
      createdAt: Date.now(),
    });
    await logActivity(ctx, userId, {
      action: "created",
      entity: "subject",
      entityTitle: args.name,
      subjectId: id,
    });
    return id;
  },
});

export const update = mutation({
  args: { id: v.id("subjects"), ...subjectPatchFields },
  handler: async (ctx, { id, ...fields }) => {
    const userId = await requireUserId(ctx);
    const subject = await getSubject(ctx, userId, id);
    const changes: { field: string; prevValue: string; newValue: string }[] = [];
    for (const key of Object.keys(fields) as (keyof typeof fields)[]) {
      const before = subject[key];
      const after = fields[key];
      if ((before ?? null) !== (after ?? null)) {
        changes.push({
          field: key,
          prevValue: before === undefined ? "—" : String(before),
          newValue: after === undefined ? "—" : String(after),
        });
      }
    }
    await ctx.db.patch(id, fields);
    for (const c of changes) {
      await logActivity(ctx, userId, {
        action: "edited",
        entity: "subject",
        entityTitle: subject.name,
        subjectId: id,
        field: c.field,
        prevValue: c.prevValue,
        newValue: c.newValue,
      });
    }
  },
});

export const archive = mutation({
  args: { id: v.id("subjects"), archived: v.boolean() },
  handler: async (ctx, { id, archived }) => {
    const userId = await requireUserId(ctx);
    const subject = await getSubject(ctx, userId, id);
    await ctx.db.patch(id, { archived });
    await logActivity(ctx, userId, {
      action: archived ? "archived" : "restored",
      entity: "subject",
      entityTitle: subject.name,
      subjectId: id,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("subjects") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const subject = await getSubject(ctx, userId, id);
    const now = Date.now();
    await ctx.db.patch(id, { archived: true });
    const chapters = await ctx.db
      .query("chapters")
      .withIndex("by_subject", (q) => q.eq("subjectId", id))
      .collect();
    const topics = await ctx.db
      .query("topics")
      .withIndex("by_subject", (q) => q.eq("subjectId", id))
      .collect();
    for (const ch of chapters) await ctx.db.patch(ch._id, { deletedAt: now });
    for (const t of topics) await ctx.db.patch(t._id, { deletedAt: now });
    await logActivity(ctx, userId, {
      action: "deleted",
      entity: "subject",
      entityTitle: subject.name,
      subjectId: id,
    });
  },
});

// ---------- Chapters ----------

export const createChapter = mutation({
  args: { subjectId: v.id("subjects"), title: v.string() },
  handler: async (ctx, { subjectId, title }) => {
    const userId = await requireUserId(ctx);
    await getSubject(ctx, userId, subjectId);
    const existing = await ctx.db
      .query("chapters")
      .withIndex("by_subject", (q) => q.eq("subjectId", subjectId))
      .collect();
    const order = existing.filter((c) => !c.deletedAt).length;
    const id = await ctx.db.insert("chapters", {
      userId,
      subjectId,
      title,
      order,
      status: "pending",
      createdAt: Date.now(),
    });
    await logActivity(ctx, userId, {
      action: "created",
      entity: "chapter",
      entityTitle: title,
      subjectId,
    });
    return id;
  },
});

export const updateChapter = mutation({
  args: {
    id: v.id("chapters"),
    title: v.optional(v.string()),
    status: v.optional(v.union(v.literal("pending"), v.literal("done"))),
  },
  handler: async (ctx, { id, title, status }) => {
    const userId = await requireUserId(ctx);
    const chapter = await ctx.db.get(id);
    if (!chapter || chapter.userId !== userId) throw new Error("Chapter not found");
    const patch: Record<string, unknown> = {};
    if (title !== undefined && title !== chapter.title) {
      patch.title = title;
      await logActivity(ctx, userId, {
        action: "edited",
        entity: "chapter",
        entityTitle: chapter.title,
        subjectId: chapter.subjectId,
        field: "title",
        prevValue: chapter.title,
        newValue: title,
      });
    }
    if (status !== undefined && status !== chapter.status) {
      patch.status = status;
      patch.completedAt = status === "done" ? Date.now() : undefined;
      await logActivity(ctx, userId, {
        action: status === "done" ? "completed" : "reopened",
        entity: "chapter",
        entityTitle: title ?? chapter.title,
        subjectId: chapter.subjectId,
      });
    }
    if (Object.keys(patch).length) await ctx.db.patch(id, patch);
    await checkSyllabusMilestones(ctx, userId, chapter.subjectId);
  },
});

export const deleteChapter = mutation({
  args: { id: v.id("chapters") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const chapter = await ctx.db.get(id);
    if (!chapter || chapter.userId !== userId) throw new Error("Chapter not found");
    const now = Date.now();
    await ctx.db.patch(id, { deletedAt: now });
    const topics = await ctx.db
      .query("topics")
      .withIndex("by_chapter", (q) => q.eq("chapterId", id))
      .collect();
    for (const t of topics) await ctx.db.patch(t._id, { deletedAt: now });
    await logActivity(ctx, userId, {
      action: "deleted",
      entity: "chapter",
      entityTitle: chapter.title,
      subjectId: chapter.subjectId,
    });
  },
});

export const reviseChapter = mutation({
  args: { id: v.id("chapters") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const chapter = await ctx.db.get(id);
    if (!chapter || chapter.userId !== userId) throw new Error("Chapter not found");
    await ctx.db.patch(id, {
      revisionCount: (chapter.revisionCount ?? 0) + 1,
      lastRevisionAt: Date.now(),
    });
    await logActivity(ctx, userId, {
      action: "revised",
      entity: "chapter",
      entityTitle: chapter.title,
      subjectId: chapter.subjectId,
    });
  },
});

// ---------- Topics ----------

export const createTopic = mutation({
  args: { chapterId: v.id("chapters"), title: v.string(), starred: v.boolean() },
  handler: async (ctx, { chapterId, title, starred }) => {
    const userId = await requireUserId(ctx);
    const chapter = await ctx.db.get(chapterId);
    if (!chapter || chapter.userId !== userId) throw new Error("Chapter not found");
    const id = await ctx.db.insert("topics", {
      userId,
      subjectId: chapter.subjectId,
      chapterId,
      title,
      starred,
      status: "pending",
      createdAt: Date.now(),
    });
    await logActivity(ctx, userId, {
      action: "created",
      entity: "topic",
      entityTitle: title,
      subjectId: chapter.subjectId,
    });
    if (starred) {
      await ctx.db.insert("bookmarks", {
        userId,
        itemType: "topic",
        refId: id,
        title,
        subjectId: chapter.subjectId,
        createdAt: Date.now(),
      });
    }
    return id;
  },
});

export const updateTopic = mutation({
  args: {
    id: v.id("topics"),
    title: v.optional(v.string()),
    status: v.optional(v.union(v.literal("pending"), v.literal("done"))),
    starred: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, title, status, starred }) => {
    const userId = await requireUserId(ctx);
    const topic = await ctx.db.get(id);
    if (!topic || topic.userId !== userId) throw new Error("Topic not found");
    const patch: Record<string, unknown> = {};
    if (title !== undefined && title !== topic.title) patch.title = title;
    if (status !== undefined && status !== topic.status) {
      patch.status = status;
      patch.completedAt = status === "done" ? Date.now() : undefined;
      await logActivity(ctx, userId, {
        action: status === "done" ? "completed" : "reopened",
        entity: "topic",
        entityTitle: title ?? topic.title,
        subjectId: topic.subjectId,
      });
    }
    if (starred !== undefined && starred !== topic.starred) {
      patch.starred = starred;
      if (starred) {
        await ctx.db.insert("bookmarks", {
          userId,
          itemType: "topic",
          refId: id,
          title: title ?? topic.title,
          subjectId: topic.subjectId,
          createdAt: Date.now(),
        });
      } else {
        const marks = await ctx.db
          .query("bookmarks")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect();
        for (const m of marks) {
          if (m.itemType === "topic" && m.refId === id && !m.deletedAt) {
            await ctx.db.patch(m._id, { deletedAt: Date.now() });
          }
        }
      }
    }
    if (Object.keys(patch).length) await ctx.db.patch(id, patch);
  },
});

export const reviseTopic = mutation({
  args: { id: v.id("topics") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const topic = await ctx.db.get(id);
    if (!topic || topic.userId !== userId) throw new Error("Topic not found");
    await ctx.db.patch(id, {
      revisionCount: (topic.revisionCount ?? 0) + 1,
      lastRevisionAt: Date.now(),
    });
    await logActivity(ctx, userId, {
      action: "revised",
      entity: "topic",
      entityTitle: topic.title,
      subjectId: topic.subjectId,
    });
  },
});

export const deleteTopic = mutation({
  args: { id: v.id("topics") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const topic = await ctx.db.get(id);
    if (!topic || topic.userId !== userId) throw new Error("Topic not found");
    await ctx.db.patch(id, { deletedAt: Date.now() });
    await logActivity(ctx, userId, {
      action: "deleted",
      entity: "topic",
      entityTitle: topic.title,
      subjectId: topic.subjectId,
    });
  },
});

async function checkSyllabusMilestones(
  ctx: MutationCtx,
  userId: Id<"users">,
  subjectId: Id<"subjects">,
) {
  const chapters = (
    await ctx.db
      .query("chapters")
      .withIndex("by_subject", (q) => q.eq("subjectId", subjectId))
      .collect()
  ).filter((c) => !c.deletedAt);
  const topics = (
    await ctx.db
      .query("topics")
      .withIndex("by_subject", (q) => q.eq("subjectId", subjectId))
      .collect()
  ).filter((t) => !t.deletedAt);
  const totalUnits = chapters.length + topics.length;
  if (totalUnits === 0) return;
  const doneUnits =
    chapters.filter((c) => c.status === "done").length +
    topics.filter((t) => t.status === "done").length;
  const pct = Math.round((doneUnits / totalUnits) * 100);
  for (const mark of [25, 50, 75, 100]) {
    if (pct >= mark) {
      await recordMilestone(ctx, userId, {
        subjectId,
        type: "syllabus",
        label: `${mark}% syllabus completed`,
        value: mark,
      });
    }
  }
}

// ---------- Assessments ----------

const assessmentFields = {
  subjectId: v.id("subjects"),
  title: v.string(),
  type: v.string(),
  marksObtained: v.number(),
  maxMarks: v.number(),
  date: v.optional(v.string()),
  notes: v.optional(v.string()),
};

export const createAssessment = mutation({
  args: assessmentFields,
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await getSubject(ctx, userId, args.subjectId);
    const id = await ctx.db.insert("assessments", {
      userId,
      ...args,
      createdAt: Date.now(),
    });
    await logActivity(ctx, userId, {
      action: "created",
      entity: "assessment",
      entityTitle: args.title,
      subjectId: args.subjectId,
      newValue: `${args.marksObtained}/${args.maxMarks}`,
    });
    return id;
  },
});

export const updateAssessment = mutation({
  args: { id: v.id("assessments"), ...assessmentFields },
  handler: async (ctx, { id, ...fields }) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(id);
    if (!row || row.userId !== userId) throw new Error("Assessment not found");
    const patch: Record<string, unknown> = {};
    for (const key of Object.keys(fields) as (keyof typeof fields)[]) {
      if ((row[key] ?? null) !== (fields[key] ?? null)) patch[key] = fields[key];
    }
    if (Object.keys(patch).length) {
      await ctx.db.patch(id, patch);
      await logActivity(ctx, userId, {
        action: "edited",
        entity: "assessment",
        entityTitle: fields.title,
        subjectId: row.subjectId,
        prevValue: `${row.marksObtained}/${row.maxMarks}`,
        newValue: `${fields.marksObtained}/${fields.maxMarks}`,
      });
    }
  },
});

export const deleteAssessment = mutation({
  args: { id: v.id("assessments") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(id);
    if (!row || row.userId !== userId) throw new Error("Assessment not found");
    await ctx.db.patch(id, { deletedAt: Date.now() });
    await logActivity(ctx, userId, {
      action: "deleted",
      entity: "assessment",
      entityTitle: row.title,
      subjectId: row.subjectId,
    });
  },
});
