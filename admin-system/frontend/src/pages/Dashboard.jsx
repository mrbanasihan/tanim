import React, { useEffect, useState } from "react";
import api from "../services/api";

const Dashboard = () => {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    api
      .get("/health")
      .then((response) => setHealth(response.data))
      .catch(() => setHealth(null));
  }, []);

  const cards = [
    { label: "System", value: health?.status || "online" },
    {
      label: "Kafka",
      value: health?.kafka?.consumerReady ? "ready" : "booting",
    },
    { label: "Last event", value: health?.kafka?.lastEvent?.topic || "none" },
    { label: "Last error", value: health?.kafka?.lastError || "none" },
  ];

  return (
    <div className="panel">
      <div className="hero">
        <h2>Admin System Dashboard</h2>
        <p>
          Monitor audit activity, manage users, and maintain TANIM reference
          data.
        </p>
      </div>
      <div className="cards">
        {cards.map((card) => (
          <div className="card" key={card.label}>
            <div className="card-label">{card.label}</div>
            <div className="card-value">{card.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
