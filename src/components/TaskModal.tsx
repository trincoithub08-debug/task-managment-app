"use client";

import { useState, type FormEvent } from "react";
import { Plus, Trash2, X } from "lucide-react";
import Modal, { ColorPicker } from "./Modal";
import type { Priority, Task, TaskColor, TaskInput } from "@/lib/types";
import { fromLocalInput, normalizeUrl, toLocalInput } from "@/lib/utils";

interface Props {
  task: Task | null;
  onClose: () => void;
  onSave: (input: TaskInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export default function TaskModal({ task, onClose, onSave, onDelete }: Props) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [color, setColor] = useState<TaskColor>(task?.color ?? "blue");
  const [label, setLabel] = useState(task?.label ?? "");
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "medium");
  const [link, setLink] = useState(task?.link_url ?? "");
  const [due, setDue] = useState(toLocalInput(task?.due_at ?? null));
  const [items, setItems] = useState<{ text: string; done: boolean }[]>(
    task?.tm_checklist_items.map((i) => ({ text: i.text, done: i.done })) ?? []
  );
  const [newItem, setNewItem] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function addItem() {
    const text = newItem.trim();
    if (!text) return;
    setItems((prev) => [...prev, { text, done: false }]);
    setNewItem("");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    const linkValue = link.trim() ? normalizeUrl(link) : null;
    if (link.trim() && !linkValue) {
      setError("Enter a valid link (for example example.com).");
      return;
    }
    const checklist = newItem.trim() ? [...items, { text: newItem.trim(), done: false }] : items;

    setBusy(true);
    setError("");
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        color,
        label: label.trim() || null,
        priority,
        link_url: linkValue,
        due_at: fromLocalInput(due),
        checklist,
      });
      onClose();
    } catch (err) {
      setError((err as { message?: string }).message ?? "Could not save the task.");
      setBusy(false);
    }
  }

  async function remove() {
    if (!onDelete) return;
    setBusy(true);
    try {
      await onDelete();
      onClose();
    } catch (err) {
      setError((err as { message?: string }).message ?? "Could not delete the task.");
      setBusy(false);
    }
  }

  return (
    <Modal title={task ? "Edit task" : "New task"} onClose={onClose}>
      <form onSubmit={submit} className="modal-form">
        <label className="field">
          <span>Title</span>
          <input
            autoFocus
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
          />
        </label>

        <label className="field">
          <span>Notes</span>
          <textarea
            rows={3}
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details (optional)"
          />
        </label>

        <div className="field">
          <span>Color</span>
          <ColorPicker value={color} onChange={setColor} />
        </div>

        <div className="row">
          <label className="field">
            <span>Label</span>
            <input maxLength={30} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="work, personal…" />
          </label>
          <label className="field">
            <span>Priority</span>
            <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
        </div>

        <div className="row">
          <label className="field">
            <span>Due</span>
            <input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
          <label className="field">
            <span>Link</span>
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="example.com" />
          </label>
        </div>

        <div className="field">
          <span>Checklist</span>
          <ul className="edit-list">
            {items.map((it, idx) => (
              <li key={idx}>
                <input
                  type="checkbox"
                  checked={it.done}
                  onChange={() =>
                    setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, done: !x.done } : x)))
                  }
                  aria-label="Done"
                />
                <input
                  className="inline-input"
                  maxLength={200}
                  value={it.text}
                  onChange={(e) =>
                    setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, text: e.target.value } : x)))
                  }
                />
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Remove item"
                  onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
          <div className="add-row">
            <input
              maxLength={200}
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addItem();
                }
              }}
              placeholder="Add a checklist item"
            />
            <button type="button" className="icon-btn" onClick={addItem} aria-label="Add item">
              <Plus size={16} />
            </button>
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="modal-actions">
          {onDelete && (
            <button type="button" className="btn btn-danger" onClick={remove} disabled={busy}>
              <Trash2 size={15} /> Delete
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
