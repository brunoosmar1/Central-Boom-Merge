import React, { useMemo } from "react";
import { CalendarDays, Wallet, Clock, PartyPopper, MessageCircle, MapPin } from "lucide-react";
import { brl, fmtDate, todayISO, loadLocal, buildWhatsAppLink } from "../shared/utils";
import { Card, KpiTile, BarChart, PALETTE } from "../shared/ui";
import { calcularTotalEvento, calcularSaldoEvento, DEFAULT_BIRTHDAY_TEMPLATE } from "./constants";
import { proximosAniversarios, rotuloDiasParaAniversario } from "./utils";

export function PainelFestasTab({ eventos, contatos, goTo }) {
  const inicioMes = todayISO().slice(0, 7);

  const eventosDoMes = useMemo(
    () => eventos.filter((e) => (e.data || "").startsWith(inicioMes) && e.status !== "Cancelado"),
    [eventos, inicioMes]
  );
  const receitaPrevistaMes = eventosDoMes.reduce((s, e) => s + calcularTotalEvento(e), 0);

  const eventosAtivos = useMemo(() => eventos.filter((e) => e.status !== "Cancelado"), [eventos]);
  const saldoAReceber = eventosAtivos.reduce((s, e) => s + calcularSaldoEvento(e), 0);

  const orcamentos = eventos.filter((e) => e.status === "Orçamento").length;
  const confirmados = eventos.filter((e) => e.status === "Confirmado").length;

  const proximosEventos = useMemo(
    () => [...eventos]
      .filter((e) => e.data >= todayISO() && e.status !== "Cancelado")
      .sort((a, b) => (a.data + a.horaInicio).localeCompare(b.data + b.horaInicio))
      .slice(0, 5),
    [eventos]
  );

  const aniversariantes = useMemo(() => proximosAniversarios(contatos, 30), [contatos]);
  const template = loadLocal("mensagemAniversarioWhatsApp", DEFAULT_BIRTHDAY_TEMPLATE);

  const estacoesRanking = useMemo(() => {
    const contagem = new Map();
    eventos.forEach((ev) => {
      (ev.estacoes || []).forEach((e) => {
        contagem.set(e.nome, (contagem.get(e.nome) || 0) + 1);
      });
    });
    return [...contagem.entries()]
      .map(([label, valor]) => ({ label, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8);
  }, [eventos]);

  return (
    <div style={{ paddingTop: 8 }}>
      {aniversariantes.length > 0 && (
        <>
          <div style={{ fontWeight: 700, fontSize: 13, color: PALETTE.inkSoft, margin: "4px 0 8px", textTransform: "uppercase", letterSpacing: 0.5 }}>
            🎂 Aniversários chegando
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {aniversariantes.slice(0, 5).map((c) => (
              <Card key={c.id} style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{c.nome}</div>
                  <div style={{ fontSize: 11.5, color: PALETTE.pink, fontWeight: 600 }}>{rotuloDiasParaAniversario(c.diasParaAniversario)}</div>
                </div>
                {c.telefone && (
                  <button
                    onClick={() => window.open(buildWhatsAppLink(c.nome, c.telefone, template), "_blank")}
                    style={{
                      border: "none", cursor: "pointer", borderRadius: 999, padding: "7px 9px",
                      background: PALETTE.pinkSoft, color: PALETTE.pink, display: "flex", alignItems: "center",
                    }}
                  >
                    <MessageCircle size={15} />
                  </button>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      <div style={{ fontWeight: 700, fontSize: 13, color: PALETTE.inkSoft, margin: "4px 0 8px", textTransform: "uppercase", letterSpacing: 0.5 }}>
        Visão geral do mês
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <KpiTile icon={CalendarDays} tint="wine" label="Eventos este mês" value={eventosDoMes.length} />
        <KpiTile icon={Wallet} tint="gold" label="Receita prevista (mês)" value={brl(receitaPrevistaMes)} />
        <KpiTile icon={Clock} tint="pending" label="A receber (todos ativos)" value={brl(saldoAReceber)} />
        <KpiTile icon={PartyPopper} tint="ok" label="Confirmados / orçamento" value={`${confirmados} / ${orcamentos}`} />
      </div>

      {estacoesRanking.length > 0 && (
        <>
          <div style={{ fontWeight: 700, fontSize: 13, color: PALETTE.inkSoft, margin: "4px 0 8px", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Estações mais contratadas
          </div>
          <Card style={{ marginBottom: 16 }}>
            <BarChart buckets={estacoesRanking} color={PALETTE.violet} colorSoft={PALETTE.violetSoft} formatValue={(v) => `${v}x`} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              {estacoesRanking.map((e) => (
                <span key={e.label} style={{ fontSize: 10.5, color: PALETTE.inkSoft }}>{e.label}</span>
              ))}
            </div>
          </Card>
        </>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "4px 0 8px" }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: PALETTE.inkSoft, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Próximos eventos
        </div>
        <button onClick={() => goTo("agenda")} style={{ all: "unset", cursor: "pointer", fontSize: 11.5, color: PALETTE.wine, fontWeight: 700 }}>
          Ver agenda
        </button>
      </div>
      {proximosEventos.length === 0 && (
        <Card style={{ textAlign: "center", color: PALETTE.inkSoft, fontSize: 13.5 }}>
          Nenhum evento futuro agendado ainda.
        </Card>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {proximosEventos.map((ev) => (
          <Card key={ev.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>{ev.clienteNome}</div>
                <div style={{ fontSize: 12, color: PALETTE.inkSoft, marginTop: 2 }}>{ev.tipoEvento} · {fmtDate(ev.data)} às {ev.horaInicio}</div>
                {ev.local && (
                  <div style={{ fontSize: 11.5, color: PALETTE.inkSoft, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                    <MapPin size={11} /> {ev.local}
                  </div>
                )}
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: PALETTE.wine, whiteSpace: "nowrap" }}>{brl(calcularTotalEvento(ev))}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
