import { FormEvent, useEffect, useState } from "react";
import { StateMessage } from "../components/common/StateMessage";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { canManageMembers } from "../utils/permissions";

const SETTINGS_KEY = "treasury-dashboard-settings";

interface LocalSettings {
  currency: string;
  timezone: string;
}

const defaultSettings: LocalSettings = {
  currency: "USD",
  timezone: "America/New_York"
};

export function SettingsPage(): JSX.Element {
  const { profile } = useAuth();
  const [settings, setSettings] = useState<LocalSettings>(defaultSettings);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return;
    }
    try {
      const parsed = JSON.parse(raw) as LocalSettings;
      if (parsed.currency && parsed.timezone) {
        setSettings(parsed);
      }
    } catch {
      setSettings(defaultSettings);
    }
  }, []);

  async function handleSave(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setStatusMessage(null);
    setError(null);

    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      if (profile?.organization_id && canManageMembers(profile.role)) {
        const updateResult = await supabase
          .from("organizations")
          .update({
            currency: settings.currency,
            timezone: settings.timezone
          })
          .eq("id", profile.organization_id);

        if (updateResult.error) {
          throw updateResult.error;
        }
      }

      setStatusMessage("Settings saved.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to save settings");
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Workspace Preferences</p>
          <h1>Settings</h1>
        </div>
      </header>

      <article className="panel">
        <h2>Organization defaults</h2>
        <form className="form-grid" onSubmit={handleSave}>
          <label>
            Currency
            <select
              value={settings.currency}
              onChange={(event) =>
                setSettings((current) => ({ ...current, currency: event.target.value }))
              }
            >
              <option value="USD">USD</option>
              <option value="CAD">CAD</option>
              <option value="EUR">EUR</option>
            </select>
          </label>

          <label>
            Timezone
            <select
              value={settings.timezone}
              onChange={(event) =>
                setSettings((current) => ({ ...current, timezone: event.target.value }))
              }
            >
              <option value="America/New_York">America/New_York</option>
              <option value="America/Chicago">America/Chicago</option>
              <option value="America/Denver">America/Denver</option>
              <option value="America/Los_Angeles">America/Los_Angeles</option>
            </select>
          </label>

          <button type="submit" className="primary-button">
            Save settings
          </button>
        </form>
      </article>

      {statusMessage ? <StateMessage kind="empty" title={statusMessage} /> : null}
      {error ? <StateMessage kind="error" title="Could not save settings" detail={error} /> : null}
    </section>
  );
}
