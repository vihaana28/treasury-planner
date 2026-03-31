import type { UserRole } from "../../types/domain";
import { StateMessage } from "../common/StateMessage";

interface RoleGateProps {
  role: UserRole | undefined;
  allowed: UserRole[];
  children: React.ReactNode;
}

export function RoleGate({ role, allowed, children }: RoleGateProps): JSX.Element {
  if (!role || !allowed.includes(role)) {
    return (
      <StateMessage
        kind="error"
        title="Permission required"
        detail="Your role does not allow access to this screen."
      />
    );
  }

  return <>{children}</>;
}
