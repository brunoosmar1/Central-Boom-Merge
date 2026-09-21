import React, { useState } from "react";
import { LayoutDashboard, CalendarDays, Users, IceCreamCone } from "lucide-react";
import { PALETTE } from "../shared/ui";
import { PainelFestasTab } from "./PainelTab";
import { AgendaTab } from "./AgendaTab";
import { ContatosTab } from "./ContatosTab";
import { EstacoesTab } from "./EstacoesTab";

export function FestasModule({
  eventos, setEventos,
  contatos, setContatos,
  estacoes, setEstacoes,
}) {
  const [tab, setTab] = useState("painel");

  return (
    <div style={{ paddingBottom: 90 }}>
      {tab === "painel" && <PainelFestasTab eventos={eventos} contatos={contatos} goTo={setTab} />}
      {tab === "agenda" && (
        <AgendaTab eventos={eventos} setEventos={setEventos} contatos={contatos} estacoes={estacoes} />
      )}
      {tab === "contatos" && <ContatosTab contatos={contatos} setContatos={setContatos} />}
      {tab === "estacoes" && <EstacoesTab estacoes={estacoes} setEstacoes={setEstacoes} />}

      <FestasTabBar tab={tab} setTab={setTab} />
    </div>
  );
}

function FestasTabBar({ tab, setTab }) {
  const items = [
    { id: "painel", label: "Painel", icon: LayoutDashboard },
    { id: "agenda", label: "Agenda", icon: CalendarDays },
    { id: "contatos", label: "Contatos", icon: Users },
    { id: "estacoes", label: "Estações", icon: IceCreamCone },
  ];
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, background: PALETTE.card,
      borderTop: `1px solid ${PALETTE.line}`, display: "flex", justifyContent: "center",
      boxShadow: "0 -4px 16px rgba(0,0,0,0.04)", paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      <div style={{ display: "flex", width: "100%", maxWidth: 720 }}>
        {items.map((it) => {
          const Icon = it.icon;
          const active = tab === it.id;
          return (
            <button
              key={it.id}
              onClick={() => setTab(it.id)}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                padding: "9px 0 10px", minHeight: 44, background: "transparent", border: "none", cursor: "pointer",
                color: active ? PALETTE.wine : PALETTE.inkSoft, touchAction: "manipulation",
              }}
            >
              <span style={{
                width: 40, height: 26, borderRadius: 11, background: active ? PALETTE.wineSoft : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center", transition: "background .15s",
              }}>
                <Icon size={18} strokeWidth={active ? 2.4 : 2} />
              </span>
              <span style={{ fontSize: 9.5, fontWeight: active ? 700 : 500 }}>{it.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
