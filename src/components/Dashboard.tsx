"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  Bell,
  CalendarDays,
  Check,
  CheckCheck,
  Circle,
  Clock,
  LayoutGrid,
  ListTodo,
  LogOut,
  Plus,
  Search,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { ChecklistItem, Reminder, ReminderInput, Task, TaskInput } from "@/lib/types";
import { formatReminder, greeting, isToday } from "@/lib/utils";
import StatsPanel from "./StatsPanel";
import TaskCard from "./TaskCard";
import TaskModal from "./TaskModal";
import ReminderModal from "./ReminderModal";

type Filter = "all" | "today" | "active" | "done";
type View = "tasks" | "reminders";

const FILTERS: { key: Filter; label: string; Icon: LucideIcon }[] = [
  { key: "all", label: "All tasks", Icon: ListTodo },
  { key: "today", label: "Due today", Icon: CalendarDays },
  { key: "active", label: "Open tasks", Icon: Clock },
  { key: "done", label: "Completed", Icon: CheckCheck },
];

export default function Dashboard({ session }: { session: Session }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("tasks");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [taskModal, setTaskModal] = useState<Task | "new" | null>(null);
  const [reminderModal, setReminderModal] = useState<Reminder | "new" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const notified = useRef<Set<string>>(new Set());

  const email = session.user.email ?? "";
  const meta = session.user.user_metadata as { full_name?: string } | undefined;
  const name = meta?.full_name?.trim() || email.split("@")[0] || "there";

  /* ---------- data ---------- */

  const load = useCallback(async () => {
    const [t, r] = await Promise.all([
      supabase.from("tm_tasks").select("*, tm_checklist_items(*)").order("created_at", { ascending: false }),
      supabase.from("tm_reminders").select("*").order("remind_at", { ascending: true }),
    ]);
    const err = t.error ?? r.error;
    if (err) setError(err.message);
    const loadedTasks = ((t.data ?? []) as Task[]).map((x) => ({
      ...x,
      tm_checklist_items: [...(x.tm_checklist_items ?? [])].sort((a, b) => a.position - b.position),
    }));
    setTasks(loadedTasks);
    setReminders((r.data ?? []) as Reminder[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ---------- task actions ---------- */

  async function toggleTask(task: Task) {
    const completed = !task.completed;
    const completed_at = completed ? new Date().toISOString() : null;
    setTasks((ts) => ts.map((x) => (x.id === task.id ? { ...x, completed, completed_at } : x)));
    const { error } = await supabase.from("tm_tasks").update({ completed, completed_at }).eq("id", task.id);
    if (error) {
      setError(error.message);
      load();
    }
  }

  async function toggleItem(task: Task, item: ChecklistItem) {
    const done = !item.done;
    setTasks((ts) =>
      ts.map((t) =>
        t.id === task.id
          ? { ...t, tm_checklist_items: t.tm_checklist_items.map((i) => (i.id === item.id ? { ...i, done } : i)) }
          : t
      )
    );
    const { error } = await supabase.from("tm_checklist_items").update({ done }).eq("id", item.id);
    if (error) {
      setError(error.message);
      load();
    }
  }

  async function saveTask(input: TaskInput, existing: Task | null) {
    const { checklist, ...fields } = input;
    let id: string;

    if (existing) {
      const { error } = await supabase.from("tm_tasks").update(fields).eq("id", existing.id);
      if (error) throw error;
      id = existing.id;
      const del = await supabase.from("tm_checklist_items").delete().eq("task_id", id);
      if (del.error) throw del.error;
    } else {
      const { data, error } = await supabase.from("tm_tasks").insert(fields).select("id").single();
      if (error) throw error;
      id = data.id as string;
    }

    if (checklist.length > 0) {
      const { error } = await supabase
        .from("tm_checklist_items")
        .insert(checklist.map((c, i) => ({ task_id: id, text: c.text, done: c.done, position: i })));
      if (error) throw error;
    }
    await load();
  }

  async function deleteTask(task: Task) {
    setTasks((ts) => ts.filter((x) => x.id !== task.id));
    const { error } = await supabase.from("tm_tasks").delete().eq("id", task.id);
    if (error) {
      setError(error.message);
      load();
    }
  }

  /* ---------- reminder actions ---------- */

  async function saveReminder(input: ReminderInput, existing: Reminder | null) {
    if (existing) {
      const { error } = await supabase
        .from("tm_reminders")
        .update({ ...input, done: false })
        .eq("id", existing.id);
      if (error) throw error;
      notified.current.delete(existing.id);
    } else {
      const { error } = await supabase.from("tm_reminders").insert(input);
      if (error) throw error;
    }
    await load();
  }

  async function toggleReminder(r: Reminder) {
    const done = !r.done;
    setReminders((rs) => rs.map((x) => (x.id === r.id ? { ...x, done } : x)));
    const { error } = await supabase.from("tm_reminders").update({ done }).eq("id", r.id);
    if (error) {
      setError(error.message);
      load();
    }
  }

  async function deleteReminder(r: Reminder) {
    setReminders((rs) => rs.filter((x) => x.id !== r.id));
    const { error } = await supabase.from("tm_reminders").delete().eq("id", r.id);
    if (error) {
      setError(error.message);
      load();
    }
  }

  /* ---------- reminder alerts ---------- */

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      reminders.forEach((r) => {
        const at = new Date(r.remind_at).getTime();
        const justDue = at <= now && now - at < 5 * 60 * 1000;
        if (!r.done && justDue && !notified.current.has(r.id)) {
          notified.current.add(r.id);
          setToast(`Reminder: ${r.title}`);
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("Reminder", { body: r.title });
          }
        }
      });
    };
    tick();
    const timer = setInterval(tick, 30000);
    return () => clearInterval(timer);
  }, [reminders]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  function openReminders() {
    setView("reminders");
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }

  /* ---------- derived ---------- */

  const q = search.trim().toLowerCase();
  const now = new Date();

  const visibleTasks = tasks
    .filter((t) => {
      if (filter === "active" && t.completed) return false;
      if (filter === "done" && !t.completed) return false;
      if (filter === "today" && !(t.due_at && isToday(t.due_at))) return false;
      if (!q) return true;
      return [t.title, t.description ?? "", t.label ?? "", ...t.tm_checklist_items.map((c) => c.text)].some((s) =>
        s.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => Number(a.completed) - Number(b.completed));

  const visibleReminders = reminders.filter((r) => !q || r.title.toLowerCase().includes(q));

  const openTasks = tasks.filter((t) => !t.completed).length;
  const openReminderCount = reminders.filter((r) => !r.done).length;
  const dueReminders = reminders.filter((r) => !r.done && new Date(r.remind_at) <= now).length;
  const todayCount = tasks.filter(
    (t) => !t.completed && t.due_at && (isToday(t.due_at) || new Date(t.due_at) < now)
  ).length;

  /* ---------- render ---------- */

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-left">
          <button
            className="logo"
            aria-label="TaskFlow home"
            onClick={() => {
              setView("tasks");
              setFilter("all");
              setSearch("");
            }}
          >
            <LayoutGrid size={18} />
          </button>
          <button className={`pill-tab ${view === "tasks" ? "active" : ""}`} onClick={() => setView("tasks")}>
            Tasks ({openTasks})
          </button>
          <button className={`pill-tab ${view === "reminders" ? "active" : ""}`} onClick={openReminders}>
            Reminders ({openReminderCount})
          </button>
        </div>

        <div className="topbar-right">
          <label className="search">
            <Search size={16} />
            <input
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search"
            />
          </label>
          <button className="icon-btn bell" onClick={openReminders} aria-label="Reminders">
            <Bell size={16} />
            {dueReminders > 0 && <span className="badge">{dueReminders}</span>}
          </button>
          <div className="avatar-wrap">
            <button className="avatar" onClick={() => setMenuOpen((o) => !o)} aria-label="Account menu">
              {name.charAt(0).toUpperCase()}
            </button>
            {menuOpen && (
              <div className="menu">
                <p className="muted small">{email}</p>
                <button onClick={() => supabase.auth.signOut()}>
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="board">
        <aside className="side">
          <div className="hello">
            <h1>
              <span className="hello-sub">Hello {name}!</span>
              <span className="hello-main">{greeting()}</span>
            </h1>
            <p className="muted">
              {todayCount === 0 ? (
                "You're all caught up for today."
              ) : (
                <>
                  You&apos;ve got <strong>{todayCount} {todayCount === 1 ? "task" : "tasks"}</strong> to complete today.
                </>
              )}
            </p>
          </div>
          <StatsPanel tasks={tasks} />
        </aside>

        <section className="content">
          {error && (
            <div className="alert" role="alert">
              <span>{error}</span>
              <button className="icon-btn" onClick={() => setError("")} aria-label="Dismiss">
                <X size={14} />
              </button>
            </div>
          )}

          {loading ? (
            <p className="muted">Loading…</p>
          ) : view === "tasks" ? (
            visibleTasks.length > 0 ? (
              <div className="masonry">
                {visibleTasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onToggle={toggleTask}
                    onToggleItem={toggleItem}
                    onEdit={setTaskModal}
                    onDelete={deleteTask}
                  />
                ))}
              </div>
            ) : (
              <div className="empty">
                <h2>{tasks.length === 0 ? "No tasks yet" : "Nothing matches"}</h2>
                <p className="muted">
                  {tasks.length === 0
                    ? "Hit Create to add your first task."
                    : "Try a different filter or search term."}
                </p>
              </div>
            )
          ) : visibleReminders.length > 0 ? (
            <div className="reminder-grid">
              {visibleReminders.map((r) => {
                const late = !r.done && new Date(r.remind_at) < now;
                return (
                  <div
                    key={r.id}
                    className={`reminder tone-${r.color} ${r.done ? "is-done" : ""}`}
                    onClick={() => setReminderModal(r)}
                  >
                    <button
                      type="button"
                      className="circle-btn"
                      aria-label={r.done ? "Mark as not done" : "Mark as done"}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleReminder(r);
                      }}
                    >
                      {r.done ? <Check size={14} /> : <Circle size={14} />}
                    </button>
                    <div className="reminder-body">
                      <h3>{r.title}</h3>
                      <span className={`pill ${late ? "pill-red" : ""}`}>{formatReminder(r.remind_at)}</span>
                    </div>
                    <button
                      type="button"
                      className="icon-ghost"
                      aria-label="Delete reminder"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteReminder(r);
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty">
              <h2>{reminders.length === 0 ? "No reminders yet" : "Nothing matches"}</h2>
              <p className="muted">
                {reminders.length === 0 ? "Hit Create to set your first reminder." : "Try a different search term."}
              </p>
            </div>
          )}
        </section>
      </main>

      <nav className="dock" aria-label="Quick actions">
        {FILTERS.map(({ key, label, Icon }) => (
          <button
            key={key}
            className={`dock-btn ${view === "tasks" && filter === key ? "active" : ""}`}
            title={label}
            aria-label={label}
            onClick={() => {
              setView("tasks");
              setFilter(key);
            }}
          >
            <Icon size={17} />
          </button>
        ))}
        <button
          className="btn btn-primary dock-create"
          onClick={() => (view === "tasks" ? setTaskModal("new") : setReminderModal("new"))}
        >
          <Plus size={17} /> Create
        </button>
      </nav>

      {taskModal && (
        <TaskModal
          key={taskModal === "new" ? "new" : taskModal.id}
          task={taskModal === "new" ? null : taskModal}
          onClose={() => setTaskModal(null)}
          onSave={(input) => saveTask(input, taskModal === "new" ? null : taskModal)}
          onDelete={taskModal === "new" ? undefined : () => deleteTask(taskModal)}
        />
      )}

      {reminderModal && (
        <ReminderModal
          key={reminderModal === "new" ? "new" : reminderModal.id}
          reminder={reminderModal === "new" ? null : reminderModal}
          onClose={() => setReminderModal(null)}
          onSave={(input) => saveReminder(input, reminderModal === "new" ? null : reminderModal)}
          onDelete={reminderModal === "new" ? undefined : () => deleteReminder(reminderModal)}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          <Bell size={15} /> {toast}
        </div>
      )}
    </div>
  );
}
