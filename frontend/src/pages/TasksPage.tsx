import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api/client";
import type { Task, TaskList, RecurrenceType } from "../types/tasks";

const TasksPage: React.FC = () => {
  const [lists, setLists] = useState<TaskList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newListName, setNewListName] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDue, setNewTaskDue] = useState<string>("");
  const [newTaskRecurrence, setNewTaskRecurrence] = useState<RecurrenceType>("NONE");

  const selectedList = useMemo(
    () => lists.find((l) => l.id === selectedListId) || null,
    [lists, selectedListId]
  );

  const loadLists = async () => {
    setLoadingLists(true);
    setError(null);
    try {
      const res = await apiFetch<TaskList[]>("/tasks/lists");
      setLists(res);
      if (!selectedListId && res.length > 0) setSelectedListId(res[0].id);
    } catch (e: any) {
      setError(e?.message || "Failed to load task lists");
    } finally {
      setLoadingLists(false);
    }
  };

  const loadTasks = async (listId: string) => {
    setLoadingTasks(true);
    setError(null);
    try {
      const res = await apiFetch<Task[]>(`/tasks?listId=${listId}`);
      setTasks(res);
    } catch (e: any) {
      setError(e?.message || "Failed to load tasks");
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    loadLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedListId) loadTasks(selectedListId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedListId]);

  const createList = async () => {
    if (!newListName.trim()) return;
    setError(null);
    try {
      await apiFetch("/tasks/lists", {
        method: "POST",
        body: JSON.stringify({ name: newListName.trim() })
      });
      setNewListName("");
      await loadLists();
    } catch (e: any) {
      setError(e?.message || "Failed to create list");
    }
  };

  const deleteList = async (listId: string) => {
    setError(null);
    try {
      await apiFetch(`/tasks/lists/${listId}`, { method: "DELETE" });
      setSelectedListId(null);
      setTasks([]);
      await loadLists();
    } catch (e: any) {
      setError(e?.message || "Failed to delete list");
    }
  };

  const createTask = async () => {
    if (!selectedListId) return;
    if (!newTaskTitle.trim()) return;

    setError(null);
    try {
      await apiFetch("/tasks", {
        method: "POST",
        body: JSON.stringify({
          taskListId: selectedListId,
          title: newTaskTitle.trim(),
          dueDate: newTaskDue ? new Date(newTaskDue).toISOString() : null,
          recurrenceType: newTaskRecurrence
        })
      });
      setNewTaskTitle("");
      setNewTaskDue("");
      setNewTaskRecurrence("NONE");
      await loadTasks(selectedListId);
    } catch (e: any) {
      setError(e?.message || "Failed to create task");
    }
  };

  const toggleComplete = async (task: Task) => {
    if (!selectedListId) return;
    setError(null);
    try {
      await apiFetch(`/tasks/${task.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: task.status === "OPEN" ? "COMPLETED" : "OPEN" })
      });
      await loadTasks(selectedListId);
    } catch (e: any) {
      setError(e?.message || "Failed to update task");
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!selectedListId) return;
    setError(null);
    try {
      await apiFetch(`/tasks/${taskId}`, { method: "DELETE" });
      await loadTasks(selectedListId);
    } catch (e: any) {
      setError(e?.message || "Failed to delete task");
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-4 border border-slate-200 dark:border-slate-700">
        <h1 className="text-xl font-semibold">Tasks</h1>
        <div className="text-sm text-slate-600 dark:text-slate-300">
          Your task lists and recurring tasks (Daily/Weekly).
        </div>
      </div>

      {error && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-3 border border-slate-200 dark:border-slate-700 text-red-500">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {/* Left panel: lists */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Lists</h2>
          </div>

          <div className="mt-3 space-y-2">
            <div className="flex gap-2">
              <input
                className="flex-1 px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                placeholder="New list name"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
              />
              <button
                onClick={createList}
                className="px-3 py-2 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-sm"
              >
                Add
              </button>
            </div>

            {loadingLists ? (
              <div className="text-sm text-slate-500 mt-3">Loading lists...</div>
            ) : (
              <div className="mt-3 space-y-2">
                {lists.map((l) => {
                  const active = l.id === selectedListId;
                  const isCustom = l.type === "CUSTOM";
                  return (
                    <div
                      key={l.id}
                      className={[
                        "flex items-center justify-between gap-2 p-2 rounded border text-sm cursor-pointer",
                        active
                          ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100"
                          : "border-slate-200 dark:border-slate-700"
                      ].join(" ")}
                      onClick={() => setSelectedListId(l.id)}
                    >
                      <div className="truncate">
                        {l.name}
                        <span className="ml-2 text-xs opacity-70">({l.type})</span>
                      </div>

                      {isCustom && (
                        <button
                          className={[
                            "text-xs px-2 py-1 rounded border",
                            active
                              ? "border-white/40"
                              : "border-slate-300 dark:border-slate-600"
                          ].join(" ")}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteList(l.id);
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right panel: tasks */}
        <div className="md:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">
              {selectedList ? selectedList.name : "Select a list"}
            </h2>
          </div>

          {selectedListId && (
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <input
                className="md:col-span-2 px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                placeholder="New task title"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
              />
              <button
                onClick={createTask}
                className="px-3 py-2 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-sm"
              >
                Add Task
              </button>

              <input
                className="px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                type="date"
                value={newTaskDue}
                onChange={(e) => setNewTaskDue(e.target.value)}
              />

              <select
                className="px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                value={newTaskRecurrence}
                onChange={(e) => setNewTaskRecurrence(e.target.value as any)}
              >
                <option value="NONE">No recurrence</option>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
              </select>

              <div className="text-xs text-slate-500 md:col-span-1 flex items-center">
                Completing recurring tasks creates the next occurrence.
              </div>
            </div>
          )}

          <div className="mt-4">
            {loadingTasks ? (
              <div className="text-sm text-slate-500">Loading tasks...</div>
            ) : (
              <div className="space-y-2">
                {tasks.length === 0 && (
                  <div className="text-sm text-slate-500">No tasks in this list.</div>
                )}

                {tasks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-2 p-3 rounded border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={t.status === "COMPLETED"}
                        onChange={() => toggleComplete(t)}
                        className="mt-1"
                      />
                      <div>
                        <div className={t.status === "COMPLETED" ? "line-through opacity-70" : ""}>
                          {t.title}
                        </div>
                        <div className="text-xs text-slate-500">
                          {t.dueDate ? `Due ${new Date(t.dueDate).toLocaleDateString()}` : "No due date"}
                          {" • "}
                          {t.recurrenceType}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteTask(t.id)}
                      className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TasksPage;
