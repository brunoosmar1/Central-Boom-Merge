import React, { useState, useMemo } from "react";
import { MessageCircle, Search, Phone, MapPin, ArrowRight, Star } from "lucide-react";
import { fmtDate, todayISO, loadLocal, saveLocal, buildWhatsAppLink } from "../shared/utils";
import { Card, Field, inputStyle, Btn, Modal, PALETTE } from "../shared/ui";
import { PROSPECT_STATUS, DEFAULT_TEMPLATE } from "./constants";

export function ProspeccaoTab({ prospectos, setProspectos, onCriarComercio }) {
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [busca, setBusca] = useState("");
  const [editing, setEditing] = useState(null); // prospecto sendo editado
  const [template, setTemplate] = useState(() => loadLocal("mensagemTriagemWhatsApp", DEFAULT_TEMPLATE));
  const [showTemplate, setShowTemplate] = useState(false);

  function salvarTemplate(novo) {
    setTemplate(novo);
    saveLocal("mensagemTriagemWhatsApp", novo);
  }

  function enviarWhatsApp(p) {
    window.open(buildWhatsAppLink(p.nome, p.contato, template), "_blank");
    if (p.status === "Não contatado") {
      updateStatus(p.id, "Contatado");
    }
  }

  const filtered = useMemo(() => {
    return prospectos.filter((p) => {
      if (filtroStatus !== "Todos" && p.status !== filtroStatus) return false;
      if (busca.trim()) {
        const q = busca.toLowerCase();
        if (!p.nome.toLowerCase().includes(q) && !p.cidade.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [prospectos, filtroStatus, busca]);

  function updateStatus(id, status) {
    setProspectos(prospectos.map((p) => (p.id === id ? { ...p, status, dataUltimoContato: todayISO() } : p)));
  }
  function saveEdit(updated) {
    setProspectos(prospectos.map((p) => (p.id === updated.id ? updated : p)));
    setEditing(null);
  }

  const statusFiltros = ["Todos", ...PROSPECT_STATUS];

  return (
    <div style={{ paddingTop: 8 }}>
      <Card style={{ marginBottom: 10 }}>
        <button
          onClick={() => setShowTemplate(!showTemplate)}
          style={{ all: "unset", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}
        >
          <span style={{ fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            <MessageCircle size={15} color={PALETTE.wine} /> Mensagem de triagem (WhatsApp)
          </span>
          <span style={{ fontSize: 11, color: PALETTE.wine, fontWeight: 700 }}>{showTemplate ? "Fechar" : "Editar"}</span>
        </button>
        {showTemplate && (
          <div style={{ marginTop: 10 }}>
            <textarea
              value={template}
              onChange={(e) => salvarTemplate(e.target.value)}
              rows={5}
              style={{ ...inputStyle, resize: "vertical" }}
            />
            <div style={{ fontSize: 10.5, color: PALETTE.inkSoft, marginTop: 4 }}>
              Use <strong>{"{nome}"}</strong> onde quiser que entre o nome do comércio automaticamente.
            </div>
          </div>
        )}
      </Card>

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <div className="search-pill" style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, background: PALETTE.card, border: `1px solid ${PALETTE.line}`, borderRadius: 10, padding: "6px 10px" }}>
          <Search size={15} color={PALETTE.inkSoft} />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou cidade"
            style={{ border: "none", outline: "none", fontSize: 16, flex: 1, background: "transparent" }}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 8 }}>
        {statusFiltros.map((s) => (
          <button
            key={s}
            onClick={() => setFiltroStatus(s)}
            style={{
              whiteSpace: "nowrap", padding: "6px 12px", borderRadius: 999, border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: 600,
              background: filtroStatus === s ? PALETTE.wine : PALETTE.card,
              color: filtroStatus === s ? "#fff" : PALETTE.inkSoft,
              boxShadow: filtroStatus === s ? "none" : `inset 0 0 0 1px ${PALETTE.line}`,
            }}
          >
            {s} {s !== "Todos" ? `(${prospectos.filter((p) => p.status === s).length})` : `(${prospectos.length})`}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 12, color: PALETTE.inkSoft, marginBottom: 10 }}>{filtered.length} comércio(s)</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((p) => (
          <Card key={p.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 14.5 }}>{p.nome}</span>
                  {p.prioridade === "Litoral" && <Star size={12} fill={PALETTE.gold} color={PALETTE.gold} />}
                </div>
                <div style={{ fontSize: 12, color: PALETTE.inkSoft, marginTop: 2 }}>{p.tipo} · {p.cidade}</div>
                {p.endereco && (
                  <div style={{ fontSize: 11.5, color: PALETTE.inkSoft, marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
                    <MapPin size={11} /> {p.endereco}
                  </div>
                )}
                {p.contato && (
                  <div style={{ fontSize: 11.5, color: PALETTE.inkSoft, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                    <Phone size={11} /> {p.contato}
                  </div>
                )}
              </div>
              {p.comercioId && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: PALETTE.okSoft, color: PALETTE.ok, whiteSpace: "nowrap" }}>
                  Já é comércio
                </span>
              )}
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              {PROSPECT_STATUS.map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(p.id, s)}
                  style={{
                    fontSize: 11, padding: "5px 10px", borderRadius: 999, cursor: "pointer",
                    border: "none",
                    background: p.status === s ? PALETTE.wine : PALETTE.bg,
                    color: p.status === s ? "#fff" : PALETTE.inkSoft,
                    fontWeight: p.status === s ? 700 : 500,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            {p.dataUltimoContato && (
              <div style={{ fontSize: 10.5, color: PALETTE.inkSoft, marginTop: 6 }}>Último contato: {fmtDate(p.dataUltimoContato)}</div>
            )}
            {p.obs && <div style={{ fontSize: 11.5, color: PALETTE.inkSoft, marginTop: 4, fontStyle: "italic" }}>{p.obs}</div>}

            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <Btn onClick={() => enviarWhatsApp(p)} style={{ flex: 1 }}>
                <MessageCircle size={14} /> Enviar WhatsApp
              </Btn>
              <Btn variant="subtle" onClick={() => setEditing(p)} style={{ flex: 1 }}>Anotar</Btn>
            </div>
            {p.status === "Fechado" && !p.comercioId && (
              <Btn onClick={() => onCriarComercio(p)} style={{ width: "100%", marginTop: 8 }}>
                <ArrowRight size={13} /> Criar comércio
              </Btn>
            )}
          </Card>
        ))}
      </div>

      {editing && (
        <Modal onClose={() => setEditing(null)} title={editing.nome}>
          <Field label="Observações / motivo">
            <textarea
              value={editing.obs}
              onChange={(e) => setEditing({ ...editing, obs: e.target.value })}
              rows={4}
              style={{ ...inputStyle, resize: "vertical" }}
              placeholder="Ex.: pediu para voltar semana que vem, dono só chega às 14h, recusou por já ter fornecedor..."
            />
          </Field>
          <Field label="Telefone / contato">
            <input style={inputStyle} value={editing.contato} onChange={(e) => setEditing({ ...editing, contato: e.target.value })} />
          </Field>
          <Btn onClick={() => saveEdit(editing)} style={{ width: "100%", marginTop: 6 }}>Salvar</Btn>
        </Modal>
      )}
    </div>
  );
}
