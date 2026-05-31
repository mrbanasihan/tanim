import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";
import { getErrorMessage } from "../utils/errorMessage";

// NotificationLogs
// Displays paginated notification logs with search and expandable payload details
const NotificationLogs = () => {
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0, page: 1 });
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pageRef = useRef(page);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  const parsePayload = (payload) => {
    if (!payload) return {};
    if (typeof payload === "object") return payload;

    try {
      return JSON.parse(payload || "{}");
    } catch {
      return {};
    }
  };

  const loadLogs = async (nextPage = page) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", String(nextPage));
      params.set("pageSize", String(pageSize));

      const response = await api.get(
        `/admin/notification-logs?${params.toString()}`,
      );
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
          "Unable to load notification logs. Check admin backend URL and database configuration.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(page);
  }, [page, search]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      loadLogs(pageRef.current);
    }, 60000);

    return () => clearInterval(intervalId);
  }, [search]);

  const groupedByType = useMemo(() => {
    return logs.reduce((accumulator, log) => {
      const payload = parsePayload(log.payload);
      const type =
        log.notification_type || payload.notification_type || "notification";
      if (!accumulator[type]) {
        accumulator[type] = [];
      }
      accumulator[type].push({ ...log, payload, type });
      return accumulator;
    }, {});
  }, [logs]);

  const sortedTypes = Object.keys(groupedByType).sort();

  const goToPage = (nextPage) => {
    const totalPages = meta.totalPages || 1;
    const boundedPage = Math.max(1, Math.min(totalPages, nextPage));
    setPage(boundedPage);
  };

  const onSearchSubmit = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  return (
    <div className="panel">
      <div className="hero">
        <h2>Notification Logs</h2>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <form className="toolbar audit-toolbar" onSubmit={onSearchSubmit}>
        <input
          className="input"
          placeholder="Search type, message, or payload"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button className="button" type="submit" disabled={loading}>
          {loading ? "Loading..." : "Search"}
        </button>
        <button
          className="button secondary"
          type="button"
          onClick={() => {
            setSearchInput("");
            setSearch("");
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
          <div className="notice">No notification logs found.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Type</th>
                <th>User</th>
                <th>Message</th>
                <th>Payload</th>
              </tr>
            </thead>
            <tbody>
              {sortedTypes.flatMap((type) =>
                groupedByType[type].map((log) => (
                  <tr key={log.notification_log_id}>
                    <td>{new Date(log.created_at).toLocaleString()}</td>
                    <td>
                      <span className="pill temperature-pill">{type}</span>
                    </td>
                    <td>{log.user_id || "system"}</td>
                    <td>{log.message}</td>
                    <td>
                      <pre className="payload-preview">
                        {JSON.stringify(log.payload, null, 2)}
                      </pre>
                    </td>
                  </tr>
                )),
              )}
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

export default NotificationLogs;
