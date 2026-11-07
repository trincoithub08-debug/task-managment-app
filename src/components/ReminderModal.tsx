"use client";

import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import Modal, { ColorPicker } from "./Modal";
import type { Reminder, ReminderInput, TaskColor } from "@/lib/types";
import { fromLocalInput, toLocalInput } from "@/lib/utils";

interface Props {
  reminder: Reminder | null;
  onClose: () => void;
  onSave: (input: ReminderInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}

function defaultTime(): string {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return toLocalInput(d.toISOString());
}

export default function ReminderModal({ reminder, onClose, onSave, onDelete }: Props) {
  const [title, setTitle] = useState(reminder?.title ?? "");
  const [when, setWhen] = useState(reminder ? toLocalInput(reminder.remind_at) : defaultTime());
  const [color, setColor] = useState<TaskColor>(reminder?.color ?? "purple");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const iso = fromLocalInput(when);
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!iso) {
      setError("Pick a date and time.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSave({ title: title.trim(), remind_at: iso, color });
      onClose();
    } catch (err) {
      setError((err as { message?: string }).message ?? "Could not save the reminder.");
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
      setError((err as { message?: string }).message ?? "Could not delete the reminder.");
      setBusy(false);
    }
  }

  return (
    <Modal title={reminder ? "Edit reminder" : "New reminder"} onClose={onClose}>
      <form onSubmit={submit} className="modal-form">
        <label className="field">
          <span>Remind me to</span>
          <input
            autoFocus
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Meeting with the team"
          />
        </label>
        <label className="field">
          <span>When</span>
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </label>
        <div className="field">
          <span>Color</span>
          <ColorPicker value={color} onChange={setColor} />
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
