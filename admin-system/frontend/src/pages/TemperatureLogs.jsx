import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";
import { getErrorMessage } from "../utils/errorMessage";

const pageSize = 20;
const statusOrder = ["normal", "warning", "critical", "danger"];

const statusLabels = {
  normal: "Normal",
  warning: "Warning",
  critical: "Critical",
  danger: "Danger",
  unclassified: "Unclassified",
};

const TemperatureLogs = () => {
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0, page: 1 });
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
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

  const getStatus = (payload) =>
    String(payload?.status || "unclassified").toLowerCase();

  const getStatusClassName = (value) => {
    const normalized = String(value || "unclassified").toLowerCase();
    return `pill temperature-pill temperature-${normalized}`;
  };

  const formatTemperature = (value) => {
    if (value === null || value === undefined || value === "") {
      return "—";
    }

    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      return String(value);
    }

    return `${numeric.toFixed(1)}°C`;
  };

  const loadLogs = async (nextPage = page) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", String(nextPage));
      params.set("pageSize", String(pageSize));

      const response = await api.get(
        `/admin/temperature-logs?${params.toString()}`,
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
          "Unable to load temperature logs. Check admin backend URL and database configuration.",
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

  const summary = useMemo(() => {
    const counts = {
      normal: 0,
      warning: 0,
      critical: 0,
      danger: 0,
      unclassified: 0,
    };

    logs.forEach((log) => {
      const payload = parsePayload(log.payload);
      const status = getStatus(payload);
      counts[status] = (counts[status] || 0) + 1;
    });

    return counts;
  }, [logs]);

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

  return (
    <div className="panel">
      <div className="hero">
        <h2>Temperature Logs</h2>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="section-card temperature-summary-card">
        <div className="section-head">
          <div
            className="temperature-legend"
            aria-label="Temperature severity legend"
          >
            {statusOrder.map((status) => (
              <span
                key={status}
                className={`temperature-legend-item temperature-${status}`}
              >
                {statusLabels[status]}
              </span>
            ))}
          </div>
        </div>

        <div className="temperature-metrics">
          <div className="temperature-metric">
            <span>Total readings</span>
            <strong>{meta.total || 0}</strong>
          </div>
          <div className="temperature-metric">
            <span>Normal</span>
            <strong>{summary.normal || 0}</strong>
          </div>
          <div className="temperature-metric">
            <span>Warning</span>
            <strong>{summary.warning || 0}</strong>
          </div>
          <div className="temperature-metric">
            <span>Critical / Danger</span>
            <strong>{(summary.critical || 0) + (summary.danger || 0)}</strong>
          </div>
        </div>
      </div>

      <form className="toolbar audit-toolbar" onSubmit={onSearchSubmit}>
        <input
          className="input"
          placeholder="Search sensor, room, status, or threshold source"
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

      <div className="audit-table temperature-table">
        {logs.length === 0 ? (
          <div className="notice">No temperature logs found.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Room</th>
                <th>Sensor</th>
                <th>Temperature</th>
                <th>Status</th>
                <th>Thresholds</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const payload = parsePayload(log.payload);
                const status = getStatus(payload);
                const rowClass = `temperature-row temperature-${status}`;

                return (
                  <React.Fragment key={log.audit_id}>
                    <tr
                      className={`${rowClass} ${expandedId === log.audit_id ? "expanded" : ""}`}
                      onClick={() =>
                        setExpandedId(
                          expandedId === log.audit_id ? null : log.audit_id,
                        )
                      }
                      style={{ cursor: "pointer" }}
                    >
                      <td>
                        <span className="audit-time">
                          {new Date(log.logged_at).toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <strong className="temperature-room">
                          {payload.room_id || "Unknown room"}
                        </strong>
                        <div className="temperature-subtle">
                          {payload.threshold_source || "default thresholds"}
                        </div>
                      </td>
                      <td>
                        <strong className="temperature-room">
                          {payload.sensor_id || "Unknown sensor"}
                        </strong>
                        <div className="temperature-subtle">
                          {payload.source_type || "simulated"}
                        </div>
                      </td>
                      <td>
                        <strong className="temperature-reading">
                          {formatTemperature(payload.temperature_celsius)}
                        </strong>
                      </td>
                      <td>
                        <span className={getStatusClassName(status)}>
                          {statusLabels[status] || status}
                        </span>
                      </td>
                      <td className="temperature-thresholds">
                        {formatTemperature(payload.temp_start)} -{" "}
                        {formatTemperature(payload.temp_end)}
                      </td>
                    </tr>
                    {expandedId === log.audit_id && (
                      <tr className="details-row">
                        <td colSpan="6">
                          <div className="audit-details">
                            <h4>Full Payload</h4>
                            <div className="payload-viewer">
                              <pre>{JSON.stringify(payload, null, 2)}</pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
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

export default TemperatureLogs;
