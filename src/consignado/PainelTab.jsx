import React, { useMemo, useState } from "react";
import { TrendingUp, Store, Wallet, Clock, ChevronRight } from "lucide-react";
import { brl, loadLocal, saveLocal } from "../shared/utils";
import { Card, KpiTile, BarChart, Donut, inputStyle, PALETTE } from "../shared/ui";
import { PROSPECT_STATUS, PROSPECT_STATUS_COLOR } from "./constants";
import { vendasPorSemana } from "./utils";

export function PainelConsignadoTab({ prospectos, comercios, resumo, totalGeral, entregas, metaVisitas, setMetaVisitas, goTo }) {
  const counts = useMemo(() => {
    const c = { "Não contatado": 0, "Contatado": 0, "Visitado": 0, "Fechado": 0, "Recusou": 0 };
    prospectos.forEach((p) => { c[p.status] = (c[p.status] || 0) + 1; });
    return c;
  }, [prospectos]);

  const totalTrabalhado = counts["Visitado"] + counts["Fechado"] + counts["Recusou"];
  const taxaConversao = totalTrabalhado > 0 ? counts["Fechado"] / totalTrabalhado : null;

  // início da semana (segunda-feira)
  const inicioSemana = useMemo(() => {
    const d = new Date();
    const dia = d.getDay(); // 0=domingo
    const diff = dia === 0 ? 6 : dia - 1;
    d.setDate(d.getDate() - diff);
    return d.toISOString().slice(0, 10);
  }, []);
  const visitasEstaSemana = prospectos.filter(
    (p) => p.dataUltimoContato && p.dataUltimoContato >= inicioSemana && ["Visitado", "Fechado", "Recusou"].includes(p.status)
  ).length;
  const progressoMeta = Math.min(1, visitasEstaSemana / Math.max(1, Number(metaVisitas) || 1));

  const comerciosAtivos = comercios.filter((c) => c.status === "Ativo").length;

  const inicioMes = new Date().toISOString().slice(0, 7); // YYYY-MM
  const vendasMes = entregas
    .filter((e) => (e.data || "").startsWith(inicioMes))
    .reduce((s, e) => s + Number(e.qtdVendida || 0) * Number(e.preco || 0), 0);
  const semanasVendas = useMemo(() => vendasPorSemana(entregas, 6), [entregas]);

  // ---- meta de comércios necessários, com base no giro real (não em potes/semana teóricos) ----
  const [metaLiquida, setMetaLiquidaState] = useState(() => loadLocal("metaLiquidaMensal", 10000));
  const [giroQuinzenal, setGiroQuinzenalState] = useState(() => loadLocal("giroQuinzenalPote", 12.5));
  const [margemPote, setMargemPoteState] = useState(() => loadLocal("margemLiquidaPote", 5.615));

  function setMetaLiquida(v) { setMetaLiquidaState(v); saveLocal("metaLiquidaMensal", v); }
  function setGiroQuinzenal(v) { setGiroQuinzenalState(v); saveLocal("giroQuinzenalPote", v); }
  function setMargemPote(v) { setMargemPoteState(v); saveLocal("margemLiquidaPote", v); }

  const potesSemanaNecessarios = margemPote > 0 ? (Number(metaLiquida) / Number(margemPote)) / 4.33 : 0;
  const giroSemanalPorComercio = (Number(giroQuinzenal) || 0) / 15 * 7;
  const comerciosNecessarios = giroSemanalPorComercio > 0 ? Math.ceil(potesSemanaNecessarios / giroSemanalPorComercio) : 0;
  const gapComercios = comerciosNecessarios - comerciosAtivos;

  return (
    <div style={{ paddingTop: 8 }}>
      {/* meta de visitas semanais */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Meta de visitas desta semana</div>
          <input
            type="number"
            value={metaVisitas}
            onChange={(e) => setMetaVisitas(e.target.value)}
            style={{ width: 64, textAlign: "center", padding: "6px 6px", borderRadius: 8, border: `1px solid ${PALETTE.line}`, fontSize: 16 }}
          />
        </div>
        <div style={{ background: PALETTE.bg, borderRadius: 999, height: 10, marginTop: 10, overflow: "hidden" }}>
          <div style={{ width: `${progressoMeta * 100}%`, background: PALETTE.wine, height: "100%", borderRadius: 999, transition: "width .3s" }} />
        </div>
        <div style={{ fontSize: 12, color: PALETTE.inkSoft, marginTop: 6 }}>
          {visitasEstaSemana} de {metaVisitas} visitas feitas esta semana
        </div>
      </Card>

      {/* taxa de conversão */}
      <Card style={{ marginBottom: 12, background: PALETTE.wine, border: "none", boxShadow: "0 10px 24px rgba(142,42,75,0.28)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 11, color: PALETTE.wineSoft, textTransform: "uppercase", letterSpacing: 1 }}>Taxa de conversão</div>
            <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontVariantNumeric: "tabular-nums", fontSize: 32, fontWeight: 700, color: "#fff", marginTop: 4, lineHeight: 1 }}>
              {taxaConversao === null ? "—" : `${Math.round(taxaConversao * 100)}%`}
            </div>
            <div style={{ fontSize: 11.5, color: PALETTE.wineSoft, marginTop: 6 }}>
              {counts["Fechado"]} fechados de {totalTrabalhado} visitados
            </div>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <TrendingUp size={22} color={PALETTE.goldSoft} />
          </div>
        </div>
      </Card>

      {/* vendas nas últimas semanas */}
      <div style={{ fontWeight: 700, fontSize: 13, color: PALETTE.inkSoft, margin: "4px 0 8px", textTransform: "uppercase", letterSpacing: 0.5 }}>
        Vendas nas últimas semanas
      </div>
      <Card style={{ marginBottom: 16 }}>
        <BarChart buckets={semanasVendas} color={PALETTE.gold} colorSoft={PALETTE.goldSoft} />
      </Card>

      {/* funil de prospecção */}
      <div style={{ fontWeight: 700, fontSize: 13, color: PALETTE.inkSoft, margin: "4px 0 8px", textTransform: "uppercase", letterSpacing: 0.5 }}>
        Funil de prospecção
      </div>
      <Card style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Donut
            total={prospectos.length}
            items={PROSPECT_STATUS.map((s) => ({
              label: s,
              count: counts[s] || 0,
              color: PALETTE[PROSPECT_STATUS_COLOR[s]] || PALETTE.inkSoft,
            }))}
            centerLabel={
              <>
                <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 24, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  {prospectos.length}
                </div>
                <div style={{ fontSize: 9.5, color: PALETTE.inkSoft }}>prospecções</div>
              </>
            }
          />
          <div style={{ flex: 1, fontSize: 12, color: PALETTE.inkSoft, lineHeight: 1.5 }}>
            {taxaConversao === null
              ? "Ainda sem visitas registradas para calcular a conversão."
              : <>Distribuição atual do funil — <strong style={{ color: PALETTE.ink }}>{Math.round(taxaConversao * 100)}%</strong> das visitas viram comércio fechado.</>}
          </div>
        </div>
      </Card>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {PROSPECT_STATUS.map((s) => {
          const dotColor = PALETTE[PROSPECT_STATUS_COLOR[s]] || PALETTE.inkSoft;
          const softColor = PALETTE[`${PROSPECT_STATUS_COLOR[s]}Soft`] || PALETTE.bg;
          return (
            <button key={s} onClick={() => goTo("prospeccao")} style={{ all: "unset", cursor: "pointer" }}>
              <Card style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: PALETTE.ink }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: dotColor, flexShrink: 0 }} />
                  {s}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: dotColor,
                    background: softColor, borderRadius: 999, padding: "2px 12px",
                  }}>{counts[s] || 0}</span>
                  <ChevronRight size={15} color={PALETTE.line} />
                </span>
              </Card>
            </button>
          );
        })}
      </div>

      {/* resumo geral */}
      <div style={{ fontWeight: 700, fontSize: 13, color: PALETTE.inkSoft, margin: "4px 0 8px", textTransform: "uppercase", letterSpacing: 0.5 }}>
        Visão geral do consignado
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <KpiTile icon={Store} tint="wine" label="Comércios ativos" value={comerciosAtivos} />
        <KpiTile icon={TrendingUp} tint="gold" label="Vendido este mês" value={brl(vendasMes)} />
        <KpiTile icon={Wallet} tint="ok" label="A receber (total)" value={brl(totalGeral.aReceber)} />
        <KpiTile icon={Clock} tint="pending" label="Pendente de pagamento" value={brl(totalGeral.pendente)} />
      </div>

      {/* meta de comércios necessários, com giro real */}
      <div style={{ fontWeight: 700, fontSize: 13, color: PALETTE.inkSoft, margin: "4px 0 8px", textTransform: "uppercase", letterSpacing: 0.5 }}>
        Meta de comércios (giro real)
      </div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <label>
            <div style={{ fontSize: 10.5, color: PALETTE.inkSoft, marginBottom: 3 }}>Meta líquida mensal (R$)</div>
            <input type="number" value={metaLiquida} onChange={(e) => setMetaLiquida(e.target.value)} style={inputStyle} />
          </label>
          <label>
            <div style={{ fontSize: 10.5, color: PALETTE.inkSoft, marginBottom: 3 }}>Giro médio (potes/15 dias)</div>
            <input type="number" value={giroQuinzenal} onChange={(e) => setGiroQuinzenal(e.target.value)} style={inputStyle} />
          </label>
        </div>
        <label style={{ display: "block", marginBottom: 12 }}>
          <div style={{ fontSize: 10.5, color: PALETTE.inkSoft, marginBottom: 3 }}>Margem líquida por pote (R$)</div>
          <input type="number" step="0.001" value={margemPote} onChange={(e) => setMargemPote(e.target.value)} style={inputStyle} />
        </label>

        <div style={{ borderTop: `1px dashed ${PALETTE.line}`, paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: PALETTE.inkSoft }}>Comércios ativos necessários</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: PALETTE.wine }}>{comerciosNecessarios}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: PALETTE.inkSoft }}>Você tem hoje</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{comerciosAtivos}</div>
          </div>
        </div>
        <div style={{
          marginTop: 10, fontSize: 12.5, fontWeight: 600, textAlign: "center", padding: "8px 10px", borderRadius: 8,
          background: gapComercios > 0 ? PALETTE.pendingSoft : PALETTE.okSoft,
          color: gapComercios > 0 ? PALETTE.pending : PALETTE.ok,
        }}>
          {gapComercios > 0
            ? `Faltam fechar mais ${gapComercios} comércio(s) para bater a meta`
            : "Meta batida com os comércios ativos atuais 🎉"}
        </div>
      </Card>
    </div>
  );
}
