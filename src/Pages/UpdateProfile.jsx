import axiosClient from "../utils/axiosClient.js";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";

// Fields the backend's updateProfile controller actually allows
// (isallowed = ["firstName", "lastName", "age", "githubProfile", "bio"])
const EDITABLE_FIELDS = ["firstName", "lastName", "age", "githubProfile", "bio"];

function EditableRow({ label, field, value, type = "text", locked = false, comingSoon = false, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const [rowError, setRowError] = useState("");

  const startEdit = () => {
    setDraft(value ?? "");
    setRowError("");
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setRowError("");
  };

  const save = async () => {
    if (type === "number" && draft !== "" && Number.isNaN(Number(draft))) {
      setRowError("Enter a valid number");
      return;
    }
    setSaving(true);
    setRowError("");
    try {
      await onSave(field, type === "number" && draft !== "" ? Number(draft) : draft);
      setEditing(false);
    } catch (err) {
      setRowError(err?.response?.data?.message || "Save failed, try again");
    } finally {
      setSaving(false);
    }
  };

  if (comingSoon) {
    return (
      <div className="flex items-center justify-between py-3">
        <span className="text-base-content/60 text-sm">{label}</span>
        <span className="badge badge-ghost badge-sm">Coming soon</span>
      </div>
    );
  }

  return (
    <div className="py-3">
      {!editing ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-base-content/60 text-sm w-36 shrink-0">{label}</span>
          <span className="flex-1 text-sm truncate">{value || "—"}</span>
          {locked ? (
            <span className="text-base-content/40" title="Not editable">
              🔒
            </span>
          ) : (
            <button
              onClick={startEdit}
              className="btn btn-ghost btn-xs btn-square"
              aria-label={`Edit ${label}`}
            >
              ✏️
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <span className="text-base-content/60 text-sm">{label}</span>
          {field === "bio" ? (
            <textarea
              className="textarea textarea-bordered textarea-sm w-full"
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
            />
          ) : (
            <input
              type={type}
              className="input input-bordered input-sm w-full"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
            />
          )}
          {rowError && <span className="text-error text-xs">{rowError}</span>}
          <div className="flex justify-end gap-2">
            <button onClick={cancel} className="btn btn-ghost btn-xs" disabled={saving}>
              Cancel
            </button>
            <button onClick={save} className="btn btn-primary btn-xs" disabled={saving}>
              {saving ? <span className="loading loading-spinner loading-xs"></span> : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function UpdateProfile() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axiosClient.get("/user/getProfile");
      setUserData(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || "Profile load nahi ho paya, try again");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleFieldSave = async (field, newValue) => {
    if (!EDITABLE_FIELDS.includes(field)) return;
    const res = await axiosClient.put("/user/update", { [field]: newValue });
    setUserData((prev) => ({ ...prev, [field]: newValue }));
    return res;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-300 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base-300 flex items-center justify-center px-4">
        <div className="alert alert-error max-w-md">
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-300 px-4 py-10">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <button
          onClick={() => navigate(-1)}
          className="btn btn-ghost btn-sm self-start"
        >
          ← Back to Profile
        </button>

        {/* Header */}
        <div className="card bg-base-200 shadow-md">
          <div className="card-body items-center text-center sm:flex-row sm:text-left gap-6">
            <div className="avatar">
              <div className="w-24 rounded-full ring ring-primary/40 ring-offset-base-200 ring-offset-2 bg-primary/20 flex items-center justify-center">
                <span className="text-3xl font-bold text-primary">
                  {(userData?.firstName?.[0] || "U").toUpperCase()}
                </span>
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {userData?.firstName} {userData?.lastName || ""}
              </h1>
              <p className="text-base-content/50 text-sm">
                @{userData?.emailId?.split("@")[0]}
              </p>
              {userData?.bio && (
                <p className="text-base-content/70 text-sm mt-1 italic">
                  "{userData.bio}"
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="card bg-base-200 shadow-md">
          <div className="card-body">
            <h2 className="card-title text-base">Personal Information</h2>
            <div className="divider my-0"></div>
            <div className="divide-y divide-base-300">
              <EditableRow
                label="First Name"
                field="firstName"
                value={userData?.firstName}
                onSave={handleFieldSave}
              />
              <EditableRow
                label="Last Name"
                field="lastName"
                value={userData?.lastName}
                onSave={handleFieldSave}
              />
              <EditableRow
                label="Age"
                field="age"
                type="number"
                value={userData?.age}
                onSave={handleFieldSave}
              />
              <EditableRow
                label="Bio"
                field="bio"
                value={userData?.bio}
                onSave={handleFieldSave}
              />
              <EditableRow
                label="Email"
                field="emailId"
                value={userData?.emailId}
                locked
                onSave={handleFieldSave}
              />
            </div>
          </div>
        </div>

        {/* Coding Profiles */}
        <div className="card bg-base-200 shadow-md">
          <div className="card-body">
            <h2 className="card-title text-base">Coding Profiles</h2>
            <div className="divider my-0"></div>
            <div className="divide-y divide-base-300">
              <EditableRow
                label="GitHub"
                field="githubProfile"
                value={userData?.githubProfile}
                onSave={handleFieldSave}
              />
              <EditableRow label="LeetCode" comingSoon />
              <EditableRow label="CodeChef" comingSoon />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UpdateProfile;