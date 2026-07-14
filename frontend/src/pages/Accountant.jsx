import { Download } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Badge } from "../components/ui/Badge.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Table } from "../components/ui/Table.jsx";
import { api } from "../services/api.js";

export function Accountant() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.get("/accountant/companies").then((response) => setRows(response.data)).catch(() => setRows([]));
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black text-navy">Area do Contador</h2>
      <Table
        columns={[
          { key: "legalName", label: "Empresa vinculada" },
          { key: "cnpj", label: "CNPJ" },
          { key: "monthlyFolder", label: "Organizacao por mes" },
          { key: "closingStatus", label: "Status de fechamento", render: (row) => <Badge tone={row.closingStatus === "Fechado" ? "green" : "yellow"}>{row.closingStatus}</Badge> },
          { key: "download", label: "Download em lote", render: () => <Button variant="secondary"><Download size={16} />XML</Button> }
        ]}
        rows={rows}
      />
    </div>
  );
}
