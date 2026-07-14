import { Eye, FileCode2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Badge } from "../components/ui/Badge.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Table } from "../components/ui/Table.jsx";
import { api } from "../services/api.js";
import { currency, date } from "../utils/formatters.js";

export function Ctes() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.get("/ctes").then((response) => setRows(response.data)).catch(() => setRows([]));
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black text-navy">CT-e</h2>
      <Table
        columns={[
          { key: "number", label: "Numero" },
          { key: "carrier", label: "Transportadora" },
          { key: "cnpj", label: "CNPJ" },
          { key: "date", label: "Data", render: (row) => date(row.date) },
          { key: "source", label: "Fonte" },
          { key: "amount", label: "Valor", render: (row) => currency(row.amount) },
          { key: "status", label: "Status", render: (row) => <Badge tone={row.status === "Pendente" ? "yellow" : "green"}>{row.status}</Badge> },
          { key: "actions", label: "Acoes", render: () => <div className="flex gap-2"><Button variant="ghost"><FileCode2 size={16} /></Button><Button variant="ghost"><Eye size={16} /></Button></div> }
        ]}
        rows={rows}
      />
    </div>
  );
}
