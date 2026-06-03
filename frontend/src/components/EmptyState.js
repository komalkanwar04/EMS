import React from "react";

export default function EmptyState({ title = "No Employees Found", subtitle = "Start by adding your first employee." }) {
  return (
    <div className="empty-state">
      <div className="empty-illustration" />
      <h3>{title}</h3>
      <p>{subtitle}</p>
    </div>
  );
}
