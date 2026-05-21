import type { LucideIcon } from "lucide-react";

type StatusPanelProps = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export function StatusPanel({ title, description, icon: Icon }: StatusPanelProps) {
  return (
    <article className="status-panel">
      <div className="icon-box" aria-hidden="true">
        <Icon size={22} strokeWidth={2} />
      </div>
      <div>
        <h4>{title}</h4>
        <p>{description}</p>
      </div>
    </article>
  );
}
