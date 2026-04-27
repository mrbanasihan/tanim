import React, { useEffect, useState } from "react";
import api from "../services/api";
import { getErrorMessage } from "../utils/errorMessage";

const pageSize = 10;

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0, page: 1 });
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [actionType, setActionType] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const loadLogs = async (nextPage = page) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (actionType) params.set("actionType", actionType);
      params.set("page", String(nextPage));
      params.set("pageSize", String(pageSize));

      const response = await api.get(`/admin/audit-logs?${params.toString()}`);
      setLogs(response.data.data || []);
      setMeta(
        response.data.meta || {
          total: 0,
          totalPages: 0,
          page: nextPage,
          pageSize,
        },
      );
      setError("");
    } catch (err) {
      setLogs([]);
      setMeta({ total: 0, totalPages: 0, page: nextPage, pageSize });
      setError(
        getErrorMessage(
          err,
          "Unable to load audit logs. Check admin backend URL and database configuration.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(page);
  }, [page, search, actionType]);

  const getActionClassName = (value) => {
    const normalized = String(value || "").toLowerCase();

    if (normalized.includes("soft delete")) {
      return "pill soft-delete";
    }

    if (normalized === "create") {
      return "pill create";
    }

    if (normalized === "update") {
      return "pill update";
    }

    if (normalized === "delete") {
      return "pill delete";
    }

    return "pill";
  };

  const summarizePayload = (payload) => {
    if (!payload || typeof payload !== "object") {
      return "No payload captured.";
    }

    const entity = payload.entity || "event";
    const changes =
      payload.changes && typeof payload.changes === "object"
        ? Object.keys(payload.changes)
        : [];

    if (
      payload.operation === "soft_delete" ||
      payload.change_type === "soft_delete"
    ) {
      return `${entity} deactivated`;
    }

    if (changes.length > 0) {
      return `${entity} changes: ${changes.slice(0, 2).join(", ")}${
        changes.length > 2 ? ", ..." : ""
      }`;
    }

    return `${entity} event details`;
  };

  const onSearchSubmit = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const goToPage = (nextPage) => {
    const totalPages = meta.totalPages || 1;
    const boundedPage = Math.max(1, Math.min(totalPages, nextPage));
    setPage(boundedPage);
  };

  const formatPayload = (payload) => {
    if (!payload) return {};
    return typeof payload === "object" ? payload : JSON.parse(payload || "{}");
  };

  return (
    <div className="panel">
      <div className="hero">
        <h2>Audit Logs</h2>
        <p>View create, update, and soft-delete activity captured in TANIM.</p>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <form className="toolbar audit-toolbar" onSubmit={onSearchSubmit}>
        <input
          className="input"
          placeholder="Search actor, entity, or payload"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select
          className="select"
          value={actionType}
          onChange={(e) => {
            setPage(1);
            setActionType(e.target.value);
          }}
        >
          <option value="">All actions</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="SOFT_DELETE">Soft delete</option>
          <option value="LOGIN">LOGIN</option>
          <option value="LOGOUT">LOGOUT</option>
        </select>
        <button className="button" type="submit" disabled={loading}>
          {loading ? "Loading..." : "Search"}
        </button>
        <button
          className="button secondary"
          type="button"
          onClick={() => {
            setSearchInput("");
            setSearch("");
            setActionType("");
            setPage(1);
          }}
          disabled={loading}
        >
          Reset
        </button>
        <button
          className="button secondary"
          type="button"
          onClick={() => loadLogs(page)}
          disabled={loading}
        >
          Refresh
        </button>
      </form>

      <div className="audit-meta-row">
        <div className="audit-meta-card">
          <span>Total events</span>
          <strong>{meta.total || 0}</strong>
        </div>
        <div className="audit-meta-card">
          <span>Current page</span>
          <strong>
            {meta.page || page} / {meta.totalPages || 1}
          </strong>
        </div>
      </div>

      <div className="audit-table">
        {logs.length === 0 ? (
          <div className="notice">No audit logs found.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Actor</th>
                <th>Summary</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <React.Fragment key={log.audit_id}>
                  <tr
                    onClick={() =>
                      setExpandedId(
                        expandedId === log.audit_id ? null : log.audit_id,
                      )
                    }
                    style={{ cursor: "pointer" }}
                    className={expandedId === log.audit_id ? "expanded" : ""}
                  >
                    <td>
                      <span className="audit-time">
                        {new Date(log.logged_at).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span
                        className={getActionClassName(log.action_display_type)}
                      >
                        {log.action_display_type}
                      </span>
                    </td>
                    <td>{log.payload?.entity || "event"}</td>
                    <td>
                      <span className="audit-actor-name">
                        {log.actor_first_name} {log.actor_last_name}
                      </span>
                      <br />
                      <span className="audit-actor-display">
                        {log.actor_display_name}
                      </span>
                    </td>
                    <td className="audit-summary">
                      {summarizePayload(log.payload)}
                    </td>
                  </tr>
                  {expandedId === log.audit_id && (
                    <tr className="details-row">
                      <td colSpan="5">
                        <div className="audit-details">
                          <h4>Full Payload</h4>
                          <div className="payload-viewer">
                            <pre>
                              {JSON.stringify(
                                formatPayload(log.payload),
                                null,
                                2,
                              )}
                            </pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="pagination">
        <button
          className="button secondary"
          type="button"
          onClick={() => goToPage(page - 1)}
          disabled={loading || page <= 1}
        >
          Previous
        </button>
        <span>
          Page {meta.page || page} of {meta.totalPages || 1}
        </span>
        <button
          className="button secondary"
          type="button"
          onClick={() => goToPage(page + 1)}
          disabled={loading || page >= (meta.totalPages || 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default AuditLogs;
