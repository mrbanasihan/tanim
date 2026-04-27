import React, { useEffect, useState } from "react";
import api from "../services/api";

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [actionType, setActionType] = useState("");

  const loadLogs = async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (actionType) params.set("actionType", actionType);
    const response = await api.get(`/admin/audit-logs?${params.toString()}`);
    setLogs(response.data.data || []);
  };

  useEffect(() => {
    loadLogs().catch(() => setLogs([]));
  }, []);

  return (
    <div className="panel">
      <div className="hero">
        <h2>Audit Logs</h2>
        <p>View create, update, and delete activity captured in TANIM.</p>
      </div>
      <div className="toolbar">
        <input
          className="input"
          placeholder="Search actor or payload"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="select"
          value={actionType}
          onChange={(e) => setActionType(e.target.value)}
        >
          <option value="">All actions</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
          <option value="LOGIN">LOGIN</option>
          <option value="LOGOUT">LOGOUT</option>
        </select>
        <button
          className="button"
          onClick={() => loadLogs().catch(() => setLogs([]))}
        >
          Refresh
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Action</th>
              <th>Actor</th>
              <th>Payload</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="4" className="notice">
                  No audit logs found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.audit_id}>
                  <td>{new Date(log.logged_at).toLocaleString()}</td>
                  <td>{log.action_type}</td>
                  <td>{log.actor}</td>
                  <td>
                    <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                      {JSON.stringify(log.payload, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditLogs;
