interface KpiCardProps {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
}

export function KpiCard({ label, value, tone = "neutral" }: KpiCardProps): JSX.Element {
  return (
    <article className={`kpi-card kpi-card--${tone}`}>
      <p className="kpi-card__label">{label}</p>
      <p className="kpi-card__value">{value}</p>
    </article>
  );
}
