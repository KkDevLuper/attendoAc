import { getAuthUserId } from "@convex-dev/auth/server";
import { QueryCtx, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

export type Ctx = QueryCtx | MutationCtx;

/** Authenticated user or throw. Guarantees per-user data isolation. */
export async function requireUserId(ctx: Ctx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  return userId;
}

export async function getSubject(
  ctx: Ctx,
  userId: Id<"users">,
  subjectId: Id<"subjects">,
): Promise<Doc<"subjects">> {
  const subject = await ctx.db.get(subjectId);
  if (!subject || subject.userId !== userId) throw new Error("Subject not found");
  return subject;
}

function stringify(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value;
  return String(value);
}

/** Append an entry to the permanent activity history. */
export async function logActivity(
  ctx: MutationCtx,
  userId: Id<"users">,
  entry: {
    action: string;
    entity: string;
    entityTitle?: string;
    subjectId?: Id<"subjects">;
    field?: string;
    prevValue?: unknown;
    newValue?: unknown;
  },
) {
  await ctx.db.insert("activity", {
    userId,
    action: entry.action,
    entity: entry.entity,
    entityTitle: entry.entityTitle,
    subjectId: entry.subjectId,
    field: entry.field,
    prevValue: stringify(entry.prevValue),
    newValue: stringify(entry.newValue),
    at: Date.now(),
  });
}

/** Record a syllabus milestone (25/50/75/100%) exactly once. */
export async function recordMilestone(
  ctx: MutationCtx,
  userId: Id<"users">,
  milestone: {
    subjectId?: Id<"subjects">;
    type: string;
    label: string;
    value: number;
  },
) {
  const existing = await ctx.db
    .query("milestones")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const dup = existing.some(
    (m) => m.type === milestone.type && m.label === milestone.label && m.subjectId === milestone.subjectId,
  );
  if (dup) return;
  await ctx.db.insert("milestones", {
    userId,
    subjectId: milestone.subjectId,
    type: milestone.type,
    label: milestone.label,
    value: milestone.value,
    at: Date.now(),
  });
}
