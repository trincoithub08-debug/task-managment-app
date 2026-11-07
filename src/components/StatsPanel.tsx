"use client";

import type { Task } from "@/lib/types";
import { dayKey } from "@/lib/utils";

const BAR_COLORS = ["#2f5bff", "#19b34a", "#d9a91c", "#f0872a", "#9a63e8", "#e5484d", "#2bb5c9"];

export default function StatsPanel({ tasks }: { tasks: Task[] }) {
  const monthLabel = new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" });

  // Tasks completed per day over the last 14 days
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d;
  });
  const counts = days.map((d) => {
    const key = dayKey(d);
    return tasks.filter((t) => t.completed && t.completed_at && dayKey(new Date(t.completed_at)) === key).length;
  });
  const maxCount = Math.max(1, ...counts);

  // Progress ring
  const total = tasks.length;
  const done = tasks.filter((t) => t.completed).length;
  const R = 46;
  const C = 2 * Math.PI * R;
  const pct = total ? done / total : 0;

  // Tasks by label
  const groups = new Map<string, number>();
  tasks.forEach((t) => {
    const key = t.label?.trim() || "General";
    groups.set(key, (groups.get(key) ?? 0) + 1);
  });
  const bars = Array.from(groups.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7);
  const maxGroup = Math.max(1, ...bars.map((b) => b[1]));

  return (
    <div className="stats">
      <div className="stat-row">
        <section className="widget widget-wide">
          <header>
            <span>Task Complete</span>
            <span>{monthLabel}</span>
          </header>
          <div className="spark" aria-label="Tasks completed per day, last 14 days">
            {counts.map((c, i) => (
              <span
                key={i}
                className={c === 0 ? "spark-dot" : "spark-bar"}
                style={c === 0 ? undefined : { height: `${14 + (c / maxCount) * 46}px` }}
                title={`${days[i].toLocaleDateString()}: ${c} completed`}
              />
            ))}
          </div>
        </section>

        <section className="widget widget-ring">
          <header>
            <span>Tasks</span>
          </header>
          <div className="ring">
            <svg viewBox="0 0 110 110" width="104" height="104" role="img" aria-label={`${done} of ${total} tasks done`}>
              <circle cx="55" cy="55" r={R} fill="none" stroke="#3a3a3a" strokeWidth="5" />
              <circle
                cx="55"
                cy="55"
                r={R}
                fill="none"
                stroke="#fff"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${C * pct} ${C}`}
                transform="rotate(-90 55 55)"
              />
            </svg>
            <div className="ring-text">
              {done}
              <small>/{total}</small>
            </div>
          </div>
        </section>
      </div>

      <section className="widget">
        <header>
          <span>Tasks by label</span>
          <span>{monthLabel}</span>
        </header>
        {bars.length === 0 ? (
          <p className="muted small">Add tasks with labels to see them here.</p>
        ) : (
          <div className="bars">
            {bars.map(([name, count], i) => (
              <div className="bar-col" key={name}>
                <span
                  className="bar"
                  style={{
                    height: `${16 + (count / maxGroup) * 64}px`,
                    background: BAR_COLORS[i % BAR_COLORS.length],
                  }}
                  title={`${name}: ${count}`}
                />
                <span className="bar-label">{name}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
