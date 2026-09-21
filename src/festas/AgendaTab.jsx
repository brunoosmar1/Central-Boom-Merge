import React, { useMemo, useState } from "react";
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, MapPin, Users, Clock } from "lucide-react";
import { brl, fmtDate, todayISO } from "../shared/utils";
import { Card, Btn, PALETTE } from "../shared/ui";
import { EVENTO_STATUS_COLOR, calcularTotalEvento } from "./constants";
import { EventoForm, emptyEvento } from "./EventoForm";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

function buildMonthGrid(anoRef, mesRef) {
  const primeiroDia = new Date(anoRef, mesRef, 1);
  const offset = primeiroDia.getDay();
  const diasNoMes = new Date(anoRef, mesRef + 1, 0).getDate();
  const celulas = [];
  for (let i = 0; i < offset; i++) celulas.push(null);
  for (let d = 1; d <= diasNoMes; d++) {
    const iso = `${anoRef}-${String(mesRef + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    celulas.push(iso);
  }
  while (celulas.length % 7 !== 0) celulas.push(null);
  return celulas;
}

export function AgendaTab({ eventos, setEventos, contatos, estacoes }) {
  const hoje = new Date();
  const [refMes, setRefMes] = useState({ ano: hoje.getFullYear(), mes: hoje.getMonth() });
  const [selectedDay, setSelectedDay] = useState(todayISO());
  const [modo, setModo] = useState("calendario");
  const [editing, setEditing] = useState(null);

  const estacoesAtivas = estacoes.filter((e) => e.ativo);

  const eventosPorDia = useMemo(() => {
    const map = new Map();
    eventos.forEach((ev) => {
      if (!map.has(ev.data)) map.set(ev.data, []);
      map.get(ev.data).push(ev);
    });
    return map;
  }, [eventos]);

  const grid = useMemo(() => buildMonthGrid(refMes.ano, refMes.mes), [refMes]);

  function mudarMes(delta) {
    let mes = refMes.mes + delta;
    let ano = refMes.ano;
    if (mes < 0) { mes = 11; ano -= 1; }
    if (mes > 11) { mes = 0; ano += 1; }
    setRefMes({ ano, mes });
  }

  function novoAgendamento(dataInicial) {
    setEditing({ ...emptyEvento(estacoesAtivas), data: dataInicial || selectedDay || todayISO() });
  }
  function salvar(ev) {
    const existe = eventos.some((e) => e.id === ev.id);
    setEventos(existe ? eventos.map((e) => (e.id === ev.id ? ev : e)) : [...eventos, ev]);
    setEditing(null);
  }
  function excluir(id) {
    setEventos(eventos.filter((e) => e.id !== id));
    setEditing(null);
  }

  const eventosDoDia = (eventosPorDia.get(selectedDay) || []).sort((a, b) => (a.horaInicio || "").localeCompare(b.horaInicio || ""));
  const proximosEventos = useMemo(
    () => [...eventos].filter((e) => e.data >= todayISO()).sort((a, b) => (a.data + a.horaInicio).localeCompare(b.data + b.horaInicio)),
    [eventos]
  );

  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 6, background: PALETTE.bg, borderRadius: 999, padding: 3 }}>
          <button
            onClick={() => setModo("calendario")}
            style={{
              border: "none", cursor: "pointer", borderRadius: 999, padding: "6px 12px", fontSize: 12, fontWeight: 700,
              background: modo === "calendario" ? PALETTE.card : "transparent", color: modo === "calendario" ? PALETTE.wine : PALETTE.inkSoft,
              display: "flex", alignItems: "center", gap: 5,
            }}
          >
            <CalendarIcon size={13} /> Calendário
          </button>
          <button
            onClick={() => setModo("lista")}
            style={{
              border: "none", cursor: "pointer", borderRadius: 999, padding: "6px 12px", fontSize: 12, fontWeight: 700,
              background: modo === "lista" ? PALETTE.card : "transparent", color: modo === "lista" ? PALETTE.wine : PALETTE.inkSoft,
              display: "flex", alignItems: "center", gap: 5,
            }}
          >
            <List size={13} /> Lista
          </button>
        </div>
        <Btn onClick={() => novoAgendamento()}><Plus size={15} /> Novo</Btn>
      </div>

      {modo === "calendario" && (
        <>
          <Card style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <button onClick={() => mudarMes(-1)} style={{ background: "transparent", border: "none", cursor: "pointer", color: PALETTE.wine }}>
                <ChevronLeft size={20} />
              </button>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{MESES[refMes.mes]} de {refMes.ano}</div>
              <button onClick={() => mudarMes(1)} style={{ background: "transparent", border: "none", cursor: "pointer", color: PALETTE.wine }}>
                <ChevronRight size={20} />
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
              {DIAS_SEMANA.map((d, i) => (
                <div key={i} style={{ textAlign: "center", fontSize: 10.5, color: PALETTE.inkSoft, fontWeight: 700 }}>{d}</div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
              {grid.map((iso, i) => {
                if (!iso) return <div key={i} />;
                const evs = eventosPorDia.get(iso) || [];
                const isToday = iso === todayISO();
                const isSelected = iso === selectedDay;
                const dia = Number(iso.slice(8, 10));
                return (
                  <button
                    key={iso}
                    onClick={() => setSelectedDay(iso)}
                    style={{
                      all: "unset", cursor: "pointer", aspectRatio: "1", display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center", borderRadius: 9, gap: 2,
                      background: isSelected ? PALETTE.wine : isToday ? PALETTE.wineSoft : "transparent",
                    }}
                  >
                    <span style={{ fontSize: 12.5, fontWeight: isToday || isSelected ? 700 : 500, color: isSelected ? "#fff" : PALETTE.ink }}>
                      {dia}
                    </span>
                    <div style={{ display: "flex", gap: 2 }}>
                      {evs.slice(0, 3).map((ev) => (
                        <span key={ev.id} style={{
                          width: 5, height: 5, borderRadius: 999,
                          background: isSelected ? "#fff" : PALETTE[EVENTO_STATUS_COLOR[ev.status]] || PALETTE.inkSoft,
                        }} />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          <div style={{ fontWeight: 700, fontSize: 13, color: PALETTE.inkSoft, margin: "4px 0 8px" }}>
            {fmtDate(selectedDay)} — {eventosDoDia.length} evento(s)
          </div>
          {eventosDoDia.length === 0 && (
            <Card style={{ textAlign: "center", color: PALETTE.inkSoft, fontSize: 13, marginBottom: 12 }}>
              Nenhum evento neste dia.{" "}
              <button onClick={() => novoAgendamento(selectedDay)} style={{ all: "unset", cursor: "pointer", color: PALETTE.wine, fontWeight: 700 }}>
                Agendar agora
              </button>
            </Card>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {eventosDoDia.map((ev) => <EventoCard key={ev.id} evento={ev} onClick={() => setEditing(ev)} />)}
          </div>
        </>
      )}

      {modo === "lista" && (
        <>
          <div style={{ fontWeight: 700, fontSize: 13, color: PALETTE.inkSoft, margin: "4px 0 8px" }}>
            Próximos eventos ({proximosEventos.length})
          </div>
          {proximosEventos.length === 0 && (
            <Card style={{ textAlign: "center", color: PALETTE.inkSoft, fontSize: 13.5 }}>
              Nenhum evento futuro agendado ainda.
            </Card>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {proximosEventos.map((ev) => (
              <EventoCard key={ev.id} evento={ev} onClick={() => setEditing(ev)} showData />
            ))}
          </div>
        </>
      )}

      {editing && (
        <EventoForm
          evento={editing}
          contatos={contatos}
          estacoes={estacoesAtivas}
          onSave={salvar}
          onClose={() => setEditing(null)}
          onDelete={excluir}
        />
      )}
    </div>
  );
}

function EventoCard({ evento, onClick, showData }) {
  const statusColor = PALETTE[EVENTO_STATUS_COLOR[evento.status]] || PALETTE.inkSoft;
  const statusBg = PALETTE[`${EVENTO_STATUS_COLOR[evento.status]}Soft`] || PALETTE.bg;
  const total = calcularTotalEvento(evento);
  return (
    <button onClick={onClick} style={{ all: "unset", cursor: "pointer", width: "100%" }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{evento.clienteNome || "Cliente não informado"}</div>
            <div style={{ fontSize: 12, color: PALETTE.inkSoft, marginTop: 2 }}>{evento.tipoEvento}</div>
            <div style={{ fontSize: 12, color: PALETTE.inkSoft, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
              <Clock size={11} /> {showData ? `${fmtDate(evento.data)} · ` : ""}{evento.horaInicio}–{evento.horaFim}
            </div>
            {evento.local && (
              <div style={{ fontSize: 12, color: PALETTE.inkSoft, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                <MapPin size={11} /> {evento.local}
              </div>
            )}
            <div style={{ fontSize: 12, color: PALETTE.inkSoft, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
              <Users size={11} /> {evento.numConvidados} convidados
            </div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: statusBg, color: statusColor, whiteSpace: "nowrap" }}>
            {evento.status}
          </span>
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 10 }}>
          {(evento.estacoes || []).map((e) => (
            <span key={e.estacaoId} style={{ fontSize: 15 }} title={e.nome}>{e.emoji}</span>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, borderTop: `1px dashed ${PALETTE.line}`, paddingTop: 8 }}>
          <span style={{ fontSize: 11.5, color: PALETTE.inkSoft }}>Valor total</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: PALETTE.wine }}>{brl(total)}</span>
        </div>
      </Card>
    </button>
  );
}
