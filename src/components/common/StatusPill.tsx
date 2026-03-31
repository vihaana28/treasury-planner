interface StatusPillProps {
  status: string;
}

export function StatusPill({ status }: StatusPillProps): JSX.Element {
  return <span className={`status-pill status-pill--${status}`}>{status}</span>;
}
