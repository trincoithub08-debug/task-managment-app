"use client";

import { Check, Circle, Link2, Trash2 } from "lucide-react";
import type { ChecklistItem, Task } from "@/lib/types";
import { formatDue, hostOf, normalizeUrl } from "@/lib/utils";

interface Props {
  task: Task;
  onToggle: (task: Task) => void;
  onToggleItem: (task: Task, item: ChecklistItem) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export default function TaskCard({ task, onToggle, onToggleItem, onEdit, onDelete }: Props) {
  const overdue = !task.completed && task.due_at !== null && new Date(task.due_at) < new Date();
  const link = normalizeUrl(task.link_url);

  return (
    <article
      className={`card tone-${task.color} ${task.completed ? "is-done" : ""}`}
      onClick={() => onEdit(task)}
    >
      <div className="card-top">
        <button
          type="button"
          className="circle-btn"
          aria-label={task.completed ? "Mark as not done" : "Mark as done"}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(task);
          }}
        >
          {task.completed ? <Check size={14} /> : <Circle size={14} />}
        </button>
        <button
          type="button"
          className="icon-ghost"
          aria-label="Delete task"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task);
          }}
        >
          <Trash2 size={15} />
        </button>
      </div>

      <h3 className="card-title">{task.title}</h3>
      {task.description && <p className="card-desc">{task.description}</p>}

      {task.tm_checklist_items.length > 0 && (
        <ul className="check-list">
          {task.tm_checklist_items.map((item) => (
            <li key={item.id}>
              <label onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" checked={item.done} onChange={() => onToggleItem(task, item)} />
                <span className={item.done ? "struck" : ""}>{item.text}</span>
              </label>
            </li>
          ))}
        </ul>
      )}

      <div className="tags">
        {task.label && <span className="pill">{task.label}</span>}
        {task.priority !== "medium" && (
          <span className="pill">{task.priority === "high" ? "High priority" : "Low priority"}</span>
        )}
        {task.due_at && <span className={`pill ${overdue ? "pill-red" : ""}`}>{formatDue(task.due_at)}</span>}
        {link && (
          <a
            className="pill pill-link"
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            <Link2 size={12} /> {hostOf(link)}
          </a>
        )}
      </div>
    </article>
  );
}
