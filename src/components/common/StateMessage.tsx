interface StateMessageProps {
  title: string;
  detail?: string;
  kind?: "loading" | "error" | "empty";
}

export function StateMessage({
  title,
  detail,
  kind = "empty"
}: StateMessageProps): JSX.Element {
  return (
    <div className={`state-message state-message--${kind}`} role={kind === "error" ? "alert" : "status"}>
      <h3>{title}</h3>
      {detail ? <p>{detail}</p> : null}
    </div>
  );
}
