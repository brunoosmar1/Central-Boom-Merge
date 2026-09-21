import React, { useState } from "react";
import { Plus, Trash2, MapPin, Users, Package } from "lucide-react";
import { uid } from "../shared/utils";
import { Card, Field, inputStyle, Btn, Modal, PALETTE } from "../shared/ui";
import { STATUS_OPTIONS, TIPO_OPTIONS } from "./constants";

export function ComerciosTab({ comercios, setComercios, entregasCount }) {
  const [showForm, setShowForm] = useState(false);
  const empty = { nome: "", tipo: "Padaria", endereco: "", contato: "", responsavel: "", comissaoPct: 25, status: "Em negociação" };
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);

  function openNew() {
    setForm(empty);
    setEditingId(null);
    setShowForm(true);
  }
  function openEdit(c) {
    setForm(c);
    setEditingId(c.id);
    setShowForm(true);
  }
  function save() {
    if (!form.nome.trim()) return;
    if (editingId) {
      setComercios(comercios.map((c) => (c.id === editingId ? { ...form, id: editingId } : c)));
    } else {
      setComercios([...comercios, { ...form, id: uid() }]);
    }
    setShowForm(false);
  }
  function remove(id) {
    setComercios(comercios.filter((c) => c.id !== id));
  }

  const statusColor = (s) =>
    s === "Ativo" ? PALETTE.ok : s === "Inativo" ? PALETTE.pending : PALETTE.gold;
  const statusBg = (s) =>
    s === "Ativo" ? PALETTE.okSoft : s === "Inativo" ? PALETTE.pendingSoft : PALETTE.goldSoft;

  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: PALETTE.inkSoft }}>{comercios.length} comércio(s) cadastrado(s)</div>
        <Btn onClick={openNew}><Plus size={15} /> Novo comércio</Btn>
      </div>

      {comercios.length === 0 && (
        <Card style={{ textAlign: "center", color: PALETTE.inkSoft, fontSize: 13.5 }}>
          Nenhum comércio cadastrado ainda. Toque em "Novo comércio" para começar.
        </Card>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {comercios.map((c) => (
          <Card key={c.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{c.nome}</div>
                <div style={{ fontSize: 12.5, color: PALETTE.inkSoft, marginTop: 2 }}>{c.tipo} · comissão {c.comissaoPct}%</div>
                {c.endereco && (
                  <div style={{ fontSize: 12, color: PALETTE.inkSoft, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                    <MapPin size={11} /> {c.endereco}
                  </div>
                )}
                {c.responsavel && (
                  <div style={{ fontSize: 12, color: PALETTE.inkSoft, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                    <Users size={11} /> {c.responsavel} {c.contato && `· ${c.contato}`}
                  </div>
                )}
                <div style={{ fontSize: 11.5, color: PALETTE.inkSoft, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                  <Package size={11} /> {entregasCount(c.id)} lançamento(s) registrado(s)
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: statusBg(c.status), color: statusColor(c.status), whiteSpace: "nowrap" }}>
                {c.status}
              </span>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <Btn variant="subtle" onClick={() => openEdit(c)} style={{ flex: 1 }}>Editar</Btn>
              <Btn variant="ghost" onClick={() => remove(c.id)} style={{ flex: 1 }}><Trash2 size={14} /> Remover</Btn>
            </div>
          </Card>
        ))}
      </div>

      {showForm && (
        <Modal onClose={() => setShowForm(false)} title={editingId ? "Editar comércio" : "Novo comércio"}>
          <Field label="Nome do comércio">
            <input style={inputStyle} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Padaria Bela Vista" />
          </Field>
          <Field label="Tipo">
            <select style={inputStyle} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              {TIPO_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Endereço">
            <input style={inputStyle} value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
          </Field>
          <Field label="Responsável no local">
            <input style={inputStyle} value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} />
          </Field>
          <Field label="Contato/telefone">
            <input style={inputStyle} value={form.contato} onChange={(e) => setForm({ ...form, contato: e.target.value })} />
          </Field>
          <Field label="% de comissão do lojista">
            <input type="number" style={inputStyle} value={form.comissaoPct} onChange={(e) => setForm({ ...form, comissaoPct: e.target.value })} />
          </Field>
          <Field label="Status">
            <select style={inputStyle} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Btn onClick={save} style={{ width: "100%", marginTop: 6 }}>Salvar comércio</Btn>
        </Modal>
      )}
    </div>
  );
}
