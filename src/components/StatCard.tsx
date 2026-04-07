interface StatCardProps {
  label: string;
  value: string | number;
}

export function StatCard({ label, value }: StatCardProps) {
  return (
    <article className="stat-card">
      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-brand-ink">{label}</p>
      <h3>{value}</h3>
    </article>
  );
}
