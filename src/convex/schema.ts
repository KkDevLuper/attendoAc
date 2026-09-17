import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Soft delete convention: tables have `deletedAt: optional(number)`.
// Attendance status: "present" | "absent" | "leave" | "cancelled"
// Class type: "theory" | "lab" | "tutorial"

const schema = defineSchema(
  {
    ...authTables,

    users: defineTable({
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
      role: v.optional(v.string()),
    }).index("email", ["email"]),

    subjects: defineTable({
      userId: v.id("users"),
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
      archived: v.boolean(),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_archived", ["userId", "archived"]),

    chapters: defineTable({
      userId: v.id("users"),
      subjectId: v.id("subjects"),
      title: v.string(),
      order: v.number(),
      status: v.union(v.literal("pending"), v.literal("done")),
      completedAt: v.optional(v.number()),
      createdAt: v.number(),
      deletedAt: v.optional(v.number()),
      revisionCount: v.optional(v.number()),
      lastRevisionAt: v.optional(v.number()),
    })
      .index("by_subject", ["subjectId"])
      .index("by_user", ["userId"]),

    topics: defineTable({
      userId: v.id("users"),
      subjectId: v.id("subjects"),
      chapterId: v.id("chapters"),
      title: v.string(),
      starred: v.boolean(),
      status: v.union(v.literal("pending"), v.literal("done")),
      completedAt: v.optional(v.number()),
      createdAt: v.number(),
      deletedAt: v.optional(v.number()),
      revisionCount: v.optional(v.number()),
      lastRevisionAt: v.optional(v.number()),
    })
      .index("by_chapter", ["chapterId"])
      .index("by_subject", ["subjectId"])
      .index("by_user", ["userId"]),

    assessments: defineTable({
      userId: v.id("users"),
      subjectId: v.id("subjects"),
      title: v.string(),
      type: v.string(),
      marksObtained: v.number(),
      maxMarks: v.number(),
      date: v.optional(v.string()),
      notes: v.optional(v.string()),
      createdAt: v.number(),
      deletedAt: v.optional(v.number()),
    })
      .index("by_subject", ["subjectId"])
      .index("by_user", ["userId"]),

    timetableSlots: defineTable({
      userId: v.id("users"),
      subjectId: v.id("subjects"),
      faculty: v.optional(v.string()),
      room: v.optional(v.string()),
      day: v.number(), // 0 Sunday - 6 Saturday
      startTime: v.string(), // "HH:MM"
      endTime: v.string(),
      classType: v.optional(v.string()),
      createdAt: v.number(),
      deletedAt: v.optional(v.number()),
    }).index("by_user", ["userId"]),

    attendance: defineTable({
      userId: v.id("users"),
      subjectId: v.id("subjects"),
      slotId: v.optional(v.id("timetableSlots")),
      date: v.string(),
      status: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
      deletedAt: v.optional(v.number()),
      isCorrection: v.optional(v.boolean()),
    })
      .index("by_subject", ["subjectId"])
      .index("by_user", ["userId"]),

    calendarEvents: defineTable({
      userId: v.id("users"),
      title: v.string(),
      date: v.string(),
      endDate: v.optional(v.string()),
      type: v.string(),
      color: v.optional(v.string()),
      notes: v.optional(v.string()),
      createdAt: v.number(),
      deletedAt: v.optional(v.number()),
    }).index("by_user", ["userId"]),

    studySessions: defineTable({
      userId: v.id("users"),
      subjectId: v.optional(v.id("subjects")),
      date: v.string(),
      startTime: v.string(),
      endTime: v.string(),
      durationMin: v.number(),
      type: v.optional(v.string()),
      notes: v.optional(v.string()),
      createdAt: v.number(),
      deletedAt: v.optional(v.number()),
    })
      .index("by_user", ["userId"])
      .index("by_subject", ["subjectId"]),

    goals: defineTable({
      userId: v.id("users"),
      title: v.string(),
      scope: v.string(), // daily | weekly | subject | semester
      subjectId: v.optional(v.id("subjects")),
      dueDate: v.optional(v.string()),
      done: v.boolean(),
      doneAt: v.optional(v.number()),
      createdAt: v.number(),
      deletedAt: v.optional(v.number()),
    }).index("by_user", ["userId"]),

    notes: defineTable({
      userId: v.id("users"),
      subjectId: v.optional(v.id("subjects")),
      title: v.string(),
      body: v.string(),
      kind: v.optional(v.string()), // note | formula | question | tip | sticky
      pinned: v.boolean(),
      createdAt: v.number(),
      deletedAt: v.optional(v.number()),
    })
      .index("by_user", ["userId"])
      .index("by_subject", ["subjectId"]),

    bookmarks: defineTable({
      userId: v.id("users"),
      itemType: v.string(), // topic | note | chapter
      refId: v.string(),
      title: v.string(),
      subjectId: v.optional(v.id("subjects")),
      createdAt: v.number(),
      deletedAt: v.optional(v.number()),
    }).index("by_user", ["userId"]),

    semesters: defineTable({
      userId: v.id("users"),
      name: v.string(),
      order: v.number(),
      completed: v.boolean(),
      createdAt: v.number(),
      deletedAt: v.optional(v.number()),
    }).index("by_user", ["userId"]),

    semesterCourses: defineTable({
      userId: v.id("users"),
      semesterId: v.id("semesters"),
      name: v.string(),
      credits: v.number(),
      gradePoint: v.number(), // 0-10
      createdAt: v.number(),
      deletedAt: v.optional(v.number()),
    }).index("by_semester", ["semesterId"]).index("by_user", ["userId"]),

    reminders: defineTable({
      userId: v.id("users"),
      title: v.string(),
      body: v.optional(v.string()),
      dueDate: v.optional(v.string()),
      kind: v.string(), // auto | custom
      read: v.boolean(),
      createdAt: v.number(),
      deletedAt: v.optional(v.number()),
    }).index("by_user", ["userId"]),

    milestones: defineTable({
      userId: v.id("users"),
      subjectId: v.optional(v.id("subjects")),
      type: v.string(),
      label: v.string(),
      value: v.number(),
      at: v.number(),
    }).index("by_user", ["userId"]),

    activity: defineTable({
      userId: v.id("users"),
      subjectId: v.optional(v.id("subjects")),
      action: v.string(),
      entity: v.string(),
      entityTitle: v.optional(v.string()),
      field: v.optional(v.string()),
      prevValue: v.optional(v.string()),
      newValue: v.optional(v.string()),
      at: v.number(),
    }).index("by_user", ["userId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
