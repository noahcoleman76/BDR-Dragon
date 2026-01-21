import { Router } from "express";
import { prisma } from "../prisma/client";
import { requireAuth } from "../middleware/auth";
import { AuthRequest } from "../types/auth";
import { ApiError } from "../middleware/errorHandler";

const router = Router();

router.use(requireAuth);

/**
 * GET /tasks/lists
 */
router.get("/lists", async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;

    const lists = await prisma.taskList.findMany({
      where: { userId },
      orderBy: [{ type: "asc" }, { createdAt: "asc" }]
    });

    res.json(lists);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /tasks/lists
 * body: { name: string }
 * Creates CUSTOM list
 */
router.post("/lists", async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { name } = req.body ?? {};

    if (!name || typeof name !== "string") throw new ApiError(400, "name is required");

    const list = await prisma.taskList.create({
      data: {
        userId,
        name,
        type: "CUSTOM"
      }
    });

    res.status(201).json(list);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /tasks/lists/:id
 * body: { name: string }
 * Only CUSTOM lists are editable (MVP)
 */
router.put("/lists/:id", async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { name } = req.body ?? {};

    if (!name || typeof name !== "string") throw new ApiError(400, "name is required");

    const existing = await prisma.taskList.findFirst({ where: { id, userId } });
    if (!existing) throw new ApiError(404, "TaskList not found");
    if (existing.type !== "CUSTOM") throw new ApiError(400, "Default lists cannot be renamed");

    const updated = await prisma.taskList.update({
      where: { id },
      data: { name }
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /tasks/lists/:id
 * Only CUSTOM lists deletable
 */
router.delete("/lists/:id", async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await prisma.taskList.findFirst({ where: { id, userId } });
    if (!existing) throw new ApiError(404, "TaskList not found");
    if (existing.type !== "CUSTOM") throw new ApiError(400, "Default lists cannot be deleted");

    // delete tasks in list first
    await prisma.task.deleteMany({ where: { taskListId: id, userId } });
    await prisma.taskList.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/**
 * GET /tasks?listId=...
 * Returns tasks for that list, scoped to user
 */
router.get("/", async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const listId = req.query.listId as string | undefined;

    if (!listId) throw new ApiError(400, "listId is required");

    const list = await prisma.taskList.findFirst({ where: { id: listId, userId } });
    if (!list) throw new ApiError(404, "TaskList not found");

    const tasks = await prisma.task.findMany({
      where: { userId, taskListId: listId },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }]
    });

    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /tasks
 * body: { taskListId, title, description?, dueDate?, recurrenceType? }
 */
router.post("/", async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { taskListId, title, description, dueDate, recurrenceType } = req.body ?? {};

    if (!taskListId || typeof taskListId !== "string") throw new ApiError(400, "taskListId required");
    if (!title || typeof title !== "string") throw new ApiError(400, "title required");

    const list = await prisma.taskList.findFirst({ where: { id: taskListId, userId } });
    if (!list) throw new ApiError(404, "TaskList not found");

    const task = await prisma.task.create({
      data: {
        userId,
        taskListId,
        title,
        description: description ?? null,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: "OPEN",
        recurrenceType: recurrenceType === "DAILY" || recurrenceType === "WEEKLY" ? recurrenceType : "NONE"
      }
    });

    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /tasks/:id
 * body can include: title, description, dueDate, status, recurrenceType
 * If status transitions to COMPLETED and recurrenceType is DAILY/WEEKLY, create next occurrence.
 */
router.put("/:id", async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await prisma.task.findFirst({ where: { id, userId } });
    if (!existing) throw new ApiError(404, "Task not found");

    const { title, description, dueDate, status, recurrenceType } = req.body ?? {};

    const nextStatus =
      status === "OPEN" || status === "COMPLETED" ? status : undefined;

    const nextRecurrence =
      recurrenceType === "NONE" || recurrenceType === "DAILY" || recurrenceType === "WEEKLY"
        ? recurrenceType
        : undefined;

    const updated = await prisma.task.update({
      where: { id },
      data: {
        title: typeof title === "string" ? title : undefined,
        description: description !== undefined ? (description ?? null) : undefined,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
        status: nextStatus,
        recurrenceType: nextRecurrence
      }
    });

    // Recurrence behavior: when marked completed, create next occurrence
    const transitionedToCompleted =
      existing.status !== "COMPLETED" && updated.status === "COMPLETED";

    const recurrence = updated.recurrenceType;

    if (transitionedToCompleted && (recurrence === "DAILY" || recurrence === "WEEKLY")) {
      const base = updated.dueDate ?? new Date();
      const nextDue = new Date(base);
      nextDue.setHours(0, 0, 0, 0);
      nextDue.setDate(nextDue.getDate() + (recurrence === "DAILY" ? 1 : 7));

      await prisma.task.create({
        data: {
          userId,
          taskListId: updated.taskListId,
          title: updated.title,
          description: updated.description,
          dueDate: nextDue,
          status: "OPEN",
          recurrenceType: updated.recurrenceType
        }
      });
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /tasks/:id
 */
router.delete("/:id", async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await prisma.task.findFirst({ where: { id, userId } });
    if (!existing) throw new ApiError(404, "Task not found");

    await prisma.task.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
