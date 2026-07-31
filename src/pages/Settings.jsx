import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api";
import { useAuth } from "../context/AuthContext";

export default function Settings() {
  const { user, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");
  const [passMsg, setPassMsg] = useState("");
  const [passErr, setPassErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState(false);
  const [profile, setProfile] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
  });
  const [passwords, setPasswords] = useState({
    old_password: "",
    new_password: "",
    new_password_confirm: "",
  });

  useEffect(() => {
    if (!user) return;
    setProfile({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
    });
  }, [user]);

  async function saveProfile(e) {
    e.preventDefault();
    setProfileMsg("");
    setProfileErr("");
    setSaving(true);
    try {
      await authApi.updateProfile(profile);
      await refreshProfile();
      setProfileMsg("Profile updated.");
    } catch (err) {
      setProfileErr(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setPassMsg("");
    setPassErr("");
    if (passwords.new_password !== passwords.new_password_confirm) {
      setPassErr("New passwords do not match.");
      return;
    }
    setChanging(true);
    try {
      await authApi.changePassword(passwords);
      setPassMsg("Password changed.");
      setPasswords({ old_password: "", new_password: "", new_password_confirm: "" });
    } catch (err) {
      setPassErr(err.message);
    } finally {
      setChanging(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Manage your account profile and security.</p>
        </div>
        <button className="btn btn-secondary" type="button" onClick={handleLogout}>
          Sign out
        </button>
      </div>

      <div className="settings-grid">
        <div className="panel panel-pad">
          <h2>Profile</h2>
          {profileMsg && <div className="success-banner">{profileMsg}</div>}
          {profileErr && <div className="error-banner">{profileErr}</div>}
          <form onSubmit={saveProfile}>
            <div className="field">
              <label>Email</label>
              <input value={user?.email || ""} disabled />
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="first_name">First name</label>
                <input
                  id="first_name"
                  value={profile.first_name}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, first_name: e.target.value }))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="last_name">Last name</label>
                <input
                  id="last_name"
                  value={profile.last_name}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, last_name: e.target.value }))
                  }
                />
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save profile"}
            </button>
          </form>
        </div>

        <div className="panel panel-pad">
          <h2>Change password</h2>
          {passMsg && <div className="success-banner">{passMsg}</div>}
          {passErr && <div className="error-banner">{passErr}</div>}
          <form onSubmit={changePassword}>
            <div className="field">
              <label htmlFor="old_password">Current password</label>
              <input
                id="old_password"
                type="password"
                required
                value={passwords.old_password}
                onChange={(e) =>
                  setPasswords((p) => ({ ...p, old_password: e.target.value }))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="new_password">New password</label>
              <input
                id="new_password"
                type="password"
                required
                value={passwords.new_password}
                onChange={(e) =>
                  setPasswords((p) => ({ ...p, new_password: e.target.value }))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="new_password_confirm">Confirm new password</label>
              <input
                id="new_password_confirm"
                type="password"
                required
                value={passwords.new_password_confirm}
                onChange={(e) =>
                  setPasswords((p) => ({
                    ...p,
                    new_password_confirm: e.target.value,
                  }))
                }
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={changing}>
              {changing ? "Updating…" : "Update password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
