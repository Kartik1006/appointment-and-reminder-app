import { useState, useEffect, useCallback, useRef } from "react";

// Use VITE_API_URL if explicitly set (production builds).
// Otherwise use empty string so fetches go to relative "/api/..." paths,
// which Vite's dev proxy forwards to http://localhost:3001 automatically.
const API_URL = import.meta.env.VITE_API_URL || "";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

// ─── Helpers ────────────────────────────────────────────

function formatTime(date) {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function formatAppointmentTime(isoString) {
  return new Date(isoString).toLocaleString();
}

function validatePhone(phone) {
  if (!phone.startsWith("+")) return false;
  const digits = phone.slice(1).replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

function isInFuture(datetimeLocalValue) {
  return new Date(datetimeLocalValue).getTime() > Date.now();
}

/** Returns true if the appointment is less than 2 hours away (locked). */
function isLocked(appointmentTimeIso) {
  const msUntil = new Date(appointmentTimeIso).getTime() - Date.now();
  return msUntil < TWO_HOURS_MS;
}

/** Convert ISO string to datetime-local input value */
function toDatetimeLocal(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

// ─── Skeleton Row Component ─────────────────────────────

function SkeletonRow({ delay }) {
  return (
    <tr className="skeleton-row" style={{ animationDelay: `${delay}ms` }}>
      <td><div className="skeleton-bar w-3-4" /></td>
      <td><div className="skeleton-bar w-full" /></td>
      <td><div className="skeleton-bar w-1-2" /></td>
      <td><div className="skeleton-bar w-pill" /></td>
      <td><div className="skeleton-bar w-pill" /></td>
      <td><div className="skeleton-bar w-1-3" /></td>
    </tr>
  );
}

// ─── Main App ───────────────────────────────────────────

export default function App() {
  // ── State ──
  const [appointments, setAppointments] = useState([]);
  const [firstLoad, setFirstLoad] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [banner, setBanner] = useState(null); // { type: 'success'|'error', text: '' }
  const [submitting, setSubmitting] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");

  // Edit mode
  const [editId, setEditId] = useState(null);

  const bannerTimerRef = useRef(null);
  const formRef = useRef(null);

  // ── Show banner with auto-dismiss ──
  const showBanner = useCallback((type, text, duration) => {
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    setBanner({ type, text });
    if (duration) {
      bannerTimerRef.current = setTimeout(() => setBanner(null), duration);
    }
  }, []);

  // ── Fetch appointments ──
  const fetchAppointments = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/appointments`);
      if (!res.ok) throw new Error("Failed to fetch appointments");
      const data = await res.json();
      setAppointments(data);
      setLastUpdated(new Date());
    } catch {
      // silent — dashboard polling shouldn't spam errors
    } finally {
      setFirstLoad(false);
    }
  }, []);

  // ── Initial fetch + 30s polling ──
  useEffect(() => {
    fetchAppointments();
    const interval = setInterval(fetchAppointments, 30000);
    return () => clearInterval(interval);
  }, [fetchAppointments]);

  // ── Cleanup banner timer on unmount ──
  useEffect(() => {
    return () => {
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    };
  }, []);

  // ── Reset form ──
  const resetForm = () => {
    setCustomerName("");
    setPhoneNumber("");
    setAppointmentTime("");
    setEditId(null);
  };

  // ── Start editing an appointment ──
  const startEdit = (appt) => {
    setEditId(appt.id);
    setCustomerName(appt.customer_name);
    setPhoneNumber(appt.phone_number);
    setAppointmentTime(toDatetimeLocal(appt.appointment_time));
    setBanner(null);
    // Scroll to form
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ── Cancel editing ──
  const cancelEdit = () => {
    resetForm();
    setBanner(null);
  };

  // ── Form submit (create or update) ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setBanner(null);

    // Client-side validation
    if (!customerName.trim() || !phoneNumber.trim() || !appointmentTime) {
      showBanner("error", "All fields are required.");
      return;
    }

    if (!validatePhone(phoneNumber.trim())) {
      showBanner("error", "Phone number must start with + and contain 7–15 digits.");
      return;
    }

    if (!isInFuture(appointmentTime)) {
      showBanner("error", "Appointment time must be in the future.");
      return;
    }

    setSubmitting(true);

    try {
      const body = {
        customer_name: customerName.trim(),
        phone_number: phoneNumber.trim(),
        appointment_time: new Date(appointmentTime).toISOString(),
      };

      const url = editId
        ? `${API_URL}/api/appointments/${editId}`
        : `${API_URL}/api/appointments`;

      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed (${res.status})`);
      }

      if (editId) {
        showBanner("success", `Updated! Confirmation sent to ${phoneNumber.trim()}.`, 4000);
      } else {
        showBanner("success", `Booked! Confirmation sent to ${phoneNumber.trim()}.`, 4000);
      }

      resetForm();
      fetchAppointments();
    } catch (err) {
      showBanner("error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete appointment ──
  const handleDelete = async (appt) => {
    const confirmed = window.confirm(
      `Delete appointment for ${appt.customer_name}?\n\nThis action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_URL}/api/appointments/${appt.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Delete failed (${res.status})`);
      }

      showBanner("success", `Appointment for ${appt.customer_name} deleted.`, 4000);

      // If we were editing the deleted appointment, cancel edit
      if (editId === appt.id) resetForm();

      fetchAppointments();
    } catch (err) {
      showBanner("error", err.message);
    }
  };

  // ─── Render ───────────────────────────────────────────

  return (
    <>
      {/* Header bar */}
      <header className="header-bar" id="header-bar">
        <span className="header-bar-title">Appointment Manager</span>
        <span className="header-bar-org">EPWQ LLC</span>
      </header>

      <div className="page">
        {/* ── Section 1: Booking / Edit Form ── */}
        <section className={`card ${editId ? "card-edit-mode" : ""}`} id="booking-card" ref={formRef}>
          <h2 className="card-heading">
            <span className={`card-heading-dot ${editId ? "dot-amber" : ""}`} aria-hidden="true" />
            {editId ? "Edit Appointment" : "Book Appointment"}
          </h2>

          {banner && (
            <div
              className={`banner ${banner.type === "success" ? "banner-success" : "banner-error"}`}
              role={banner.type === "success" ? "status" : "alert"}
              id="form-banner"
            >
              {banner.text}
            </div>
          )}

          <form className="booking-form" onSubmit={handleSubmit} id="booking-form">
            <div className="field">
              <label className="field-label" htmlFor="field-name">
                Customer Name
              </label>
              <input
                className="field-input"
                id="field-name"
                type="text"
                placeholder="Jane Doe"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                autoComplete="name"
                disabled={submitting}
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="field-phone">
                Phone Number
              </label>
              <input
                className="field-input"
                id="field-phone"
                type="tel"
                placeholder="+91XXXXXXXXXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                autoComplete="tel"
                disabled={submitting}
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="field-datetime">
                Appointment Date &amp; Time
              </label>
              <input
                className="field-input"
                id="field-datetime"
                type="datetime-local"
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
                disabled={submitting}
              />
            </div>

            <div className="form-buttons">
              <button
                type="submit"
                className="btn-book"
                disabled={submitting}
                id="btn-book"
              >
                {submitting && <span className="btn-book-spinner" aria-hidden="true" />}
                {submitting
                  ? (editId ? "Saving..." : "Booking...")
                  : (editId ? "Save Changes" : "Book Appointment")}
              </button>

              {editId && (
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={cancelEdit}
                  disabled={submitting}
                  id="btn-cancel-edit"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        {/* ── Section 2: Live Dashboard ── */}
        <section className="card" id="dashboard-card">
          <h2 className="card-heading">
            <span className="card-heading-dot" aria-hidden="true" />
            Live Dashboard
          </h2>

          {firstLoad ? (
            /* Skeleton placeholder rows */
            <div className="table-wrap">
              <table className="data-table" aria-label="Loading appointments">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Phone</th>
                    <th>Appointment Time</th>
                    <th>Confirmed</th>
                    <th>Reminder Sent</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <SkeletonRow delay={0} />
                  <SkeletonRow delay={100} />
                  <SkeletonRow delay={200} />
                </tbody>
              </table>
            </div>
          ) : appointments.length === 0 ? (
            <div className="empty-state" id="empty-state">
              <div className="empty-state-icon" aria-hidden="true">📋</div>
              <p>No appointments yet.</p>
            </div>
          ) : (
            <>
              <div className="table-wrap">
                <table className="data-table" id="appointments-table">
                  <thead>
                    <tr>
                      <th>Customer Name</th>
                      <th>Phone</th>
                      <th>Appointment Time</th>
                      <th>Confirmed</th>
                      <th>Reminder Sent</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((appt) => {
                      const locked = isLocked(appt.appointment_time);
                      const isEditing = editId === appt.id;

                      return (
                        <tr key={appt.id} className={isEditing ? "row-editing" : ""}>
                          <td className="cell-name">{appt.customer_name}</td>
                          <td className="cell-phone">{appt.phone_number}</td>
                          <td>{formatAppointmentTime(appt.appointment_time)}</td>
                          <td>
                            <span className={`pill ${appt.message_sent ? "pill-yes" : "pill-no"}`}>
                              <span className="pill-dot" />
                              {appt.message_sent ? "Yes" : "No"}
                            </span>
                          </td>
                          <td>
                            <span className={`pill ${appt.reminder_sent ? "pill-yes" : "pill-no"}`}>
                              <span className="pill-dot" />
                              {appt.reminder_sent ? "Yes" : "No"}
                            </span>
                          </td>
                          <td className="cell-actions">
                            {locked ? (
                              <span className="lock-label" title="Cannot modify within 2 hours of appointment">
                                🔒 Locked
                              </span>
                            ) : (
                              <>
                                <button
                                  className="btn-action btn-action-edit"
                                  onClick={() => startEdit(appt)}
                                  disabled={isEditing}
                                  title="Edit this appointment"
                                  id={`btn-edit-${appt.id}`}
                                >
                                  Edit
                                </button>
                                <button
                                  className="btn-action btn-action-delete"
                                  onClick={() => handleDelete(appt)}
                                  title="Delete this appointment"
                                  id={`btn-delete-${appt.id}`}
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {lastUpdated && (
                <div className="last-updated" id="last-updated">
                  Last updated: <time>{formatTime(lastUpdated)}</time>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}
