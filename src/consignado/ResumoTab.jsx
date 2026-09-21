import React from "react";
import { brl } from "../shared/utils";
import { Card, Metric, PALETTE } from "../shared/ui";

export function ResumoTab({ resumo, totalGeral }) {
  if (resumo.length === 0) {
    return (
      <Card style={{ textAlign: "center", color: PALETTE.inkSoft, fontSize: 13.5, marginTop: 8 }}>
        Cadastre comércios e registre lançamentos para ver o resumo aqui.
      </Card>
    );
  }
  return (
    <div style={{ paddingTop: 8 }}>
      <Card style={{ marginBottom: 12, background: PALETTE.wine, border: "none", color: "#fff" }}>
        <div style={{ fontSize: 12, opacity: 0.85, textTransform: "uppercase", letterSpacing: 1 }}>Total geral</div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>Vendido</div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{brl(totalGeral.valorVendido)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>A receber</div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{brl(totalGeral.aReceber)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>Pendente</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: PALETTE.goldSoft }}>{brl(totalGeral.pendente)}</div>
          </div>
        </div>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {resumo.map((r) => (
          <Card key={r.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{r.nome}</div>
              {r.pendente > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: PALETTE.pendingSoft, color: PALETTE.pending }}>
                  {brl(r.pendente)} pendente
                </span>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 10, fontSize: 12.5 }}>
              <Metric label="Estoque no ponto" value={`${r.estoqueAtual} un.`} />
              <Metric label="Vendido (total)" value={`${r.totalVendido} un.`} />
              <Metric label="Visitas" value={r.visitas} />
              <Metric label="Valor vendido" value={brl(r.valorVendido)} />
              <Metric label="Comissão lojista" value={brl(r.valorComissao)} />
              <Metric label="A receber (líq.)" value={brl(r.aReceber)} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
