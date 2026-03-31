import { useEffect, useState } from "react";
import { RoleGate } from "../components/layout/RoleGate";
import { StateMessage } from "../components/common/StateMessage";
import { useAuth } from "../context/AuthContext";
import { TreasuryDataService } from "../services/treasuryDataService";
import type { Profile } from "../types/domain";

export function MembersPage(): JSX.Element {
  const { profile } = useAuth();
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.organization_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    TreasuryDataService.getMembers(profile.organization_id)
      .then((result) => setMembers(result))
      .catch((nextError) =>
        setError(nextError instanceof Error ? nextError.message : "Unable to load members")
      )
      .finally(() => setLoading(false));
  }, [profile?.organization_id]);

  return (
    <RoleGate role={profile?.role} allowed={["admin", "treasurer"]}>
      <section className="page">
        <header className="page-header">
          <div>
            <p className="eyebrow">Access Directory</p>
            <h1>Members</h1>
          </div>
        </header>

        {loading ? <StateMessage kind="loading" title="Loading members..." /> : null}
        {error ? <StateMessage kind="error" title="Could not load members" detail={error} /> : null}
        {!loading && !error && members.length === 0 ? (
          <StateMessage title="No members found" detail="Add rows to profiles to assign roles." />
        ) : null}

        {!loading && !error && members.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>User ID</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td>{member.full_name}</td>
                    <td>{member.id}</td>
                    <td>
                      <span className={`status-pill status-pill--${member.role}`}>{member.role}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </RoleGate>
  );
}
