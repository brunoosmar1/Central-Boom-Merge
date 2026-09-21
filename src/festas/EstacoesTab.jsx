import React, { useState } from "react";
import { Plus, Trash2, Power } from "lucide-react";
import { uid, brl } from "../shared/utils";
import { Card, Field, inputStyle, Btn, Modal, PALETTE } from "../shared/ui";

export function EstacoesTab({ estacoes, setEstacoes }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const empty = { nome: "", emoji: "🎉", precoBase: 0, unidade: "por evento (até 3h)", descricao: "", ativo: true };
  const [form, setForm] = useState(empty);

  function openNew() {
    setForm(empty);
    setEditingId(null);
    setShowForm(true);
  }
  function openEdit(e) {
    setForm(e);
    setEditingId(e.id);
    setShowForm(true);
  }
  function save() {
    if (!form.nome.trim()) return;
    if (editingId) {
      setEstacoes(estacoes.map((e) => (e.id === editingId ? { ...form, id: editingId } : e)));
    } else {
      setEstacoes([...estacoes, { ...form, id: uid() }]);
    }
    setShowForm(false);
  }
  function remove(id) {
    setEstacoes(estacoes.filter((e) => e.id !== id));
  }
  function toggleAtivo(id) {
    setEstacoes(estacoes.map((e) => (e.id === id ? { ...e, ativo: !e.ativo } : e)));
  }

  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 13, color: PALETTE.inkSoft }}>{estacoes.length} estação(ões) no catálogo</div>
        <Btn onClick={openNew}><Plus size={15} /> Nova estação</Btn>
      </div>
      <div style={{ fontSize: 11.5, color: PALETTE.inkSoft, marginBottom: 12 }}>
        Estações inativas não aparecem para seleção em novos agendamentos, mas continuam nos eventos já criados.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {estacoes.map((e) => (
          <Card key={e.id} style={{ opacity: e.ativo ? 1 : 0.55 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ fontSize: 26, lineHeight: 1 }}>{e.emoji}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{e.nome}</div>
                  <div style={{ fontSize: 12.5, color: PALETTE.inkSoft, marginTop: 2 }}>
                    {brl(e.precoBase)} · {e.unidade}
                  </div>
                  {e.descricao && <div style={{ fontSize: 11.5, color: PALETTE.inkSoft, marginTop: 4 }}>{e.descricao}</div>}
                </div>
              </div>
              <button
                onClick={() => toggleAtivo(e.id)}
                title={e.ativo ? "Desativar" : "Ativar"}
                style={{
                  border: "none", cursor: "pointer", borderRadius: 999, padding: "4px 9px",
                  background: e.ativo ? PALETTE.okSoft : PALETTE.lineSoft,
                  color: e.ativo ? PALETTE.ok : PALETTE.inkSoft, fontSize: 10.5, fontWeight: 700,
                  display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
                }}
              >
                <Power size={11} /> {e.ativo ? "Ativa" : "Inativa"}
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <Btn variant="subtle" onClick={() => openEdit(e)} style={{ flex: 1 }}>Editar</Btn>
              <Btn variant="ghost" onClick={() => remove(e.id)} style={{ flex: 1 }}><Trash2 size={14} /> Remover</Btn>
            </div>
          </Card>
        ))}
      </div>

      {showForm && (
        <Modal onClose={() => setShowForm(false)} title={editingId ? "Editar estação" : "Nova estação"}>
          <Field label="Nome da estação">
            <input style={inputStyle} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Algodão Doce" />
          </Field>
          <Field label="Emoji / ícone">
            <input style={inputStyle} value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} placeholder="🍭" />
          </Field>
          <Field label="Preço base (R$)">
            <input type="number" style={inputStyle} value={form.precoBase} onChange={(e) => setForm({ ...form, precoBase: e.target.value })} />
          </Field>
          <Field label="Unidade / condição">
            <input style={inputStyle} value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} placeholder="por evento (até 3h)" />
          </Field>
          <Field label="Descrição">
            <textarea rows={3} style={{ ...inputStyle, resize: "vertical" }} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </Field>
          <Btn onClick={save} style={{ width: "100%", marginTop: 6 }}>Salvar estação</Btn>
        </Modal>
      )}
    </div>
  );
}
