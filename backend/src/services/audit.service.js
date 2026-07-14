import { randomUUID } from "crypto";
import { readStore, updateStore } from "./store.service.js";

export async function listAuditLogs() {
  const data = await readStore();
  return [...data.auditLogs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function addAuditLog({ title, detail, type = "operation", metadata = {} }) {
  return updateStore((data) => {
    const record = {
      id: randomUUID(),
      title,
      detail,
      type,
      metadata,
      createdAt: new Date().toISOString()
    };

    data.auditLogs.unshift(record);
    data.auditLogs = data.auditLogs.slice(0, 500);
    return record;
  });
}
