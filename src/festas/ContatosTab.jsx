import React, { useMemo, useState } from "react";
import { Plus, Trash2, Search, Phone, Mail, MapPin, Cake, MessageCircle } from "lucide-react";
import { uid, fmtDate, loadLocal, saveLocal, buildWhatsAppLink } from "../shared/utils";
import { Card, Field, inputStyle, Btn, Modal, PALETTE } from "../shared/ui";
import { DEFAULT_BIRTHDAY_TEMPLATE } from "./constants";
import { rotuloDiasParaAniversario } from "./utils";
import { diasParaProximaOcorrencia } from "../shared/utils";

export function ContatosTab({ contatos, setContatos }) {
  const [busca, setBusca] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const empty = { nome: "", telefone: "", email: "", aniversario: "", endereco: "", comoConheceu: "", observacoes: "" };
  const [form, setForm] = useState(empty);
  const [template, setTemplate] = useState(() => loadLocal("mensagemAniversarioWhatsApp", DEFAULT_BIRTHDAY_TEMPLATE));
  const [showTemplate, setShowTemplate] = useState(false);

  function salvarTemplate(novo) {
    setTemplate(novo);
    saveLocal("mensagemAniversarioWhatsApp", novo);
  }

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
      setContatos(contatos.map((c) => (c.id === editingId ? { ...form, id: editingId } : c)));
    } else {
      setContatos([...contatos, { ...form, id: uid() }]);
    }
    setShowForm(false);
  }
  function remove(id) {
    setContatos(contatos.filter((c) => c.id !== id));
  }
  function enviarParabens(c) {
    window.open(buildWhatsAppLink(c.nome, c.telefone, template), "_blank");
  }

  const listaComAniversario = useMemo(
    () => contatos.map((c) => ({ ...c, diasParaAniversario: diasParaProximaOcorrencia(c.aniversario) })),
    [contatos]
  );

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const base = q
      ? listaComAniversario.filter((c) => c.nome.toLowerCase().includes(q) || (c.telefone || "").includes(q))
      : listaComAniversario;
    return [...base].sort((a, b) => {
      const da = a.diasParaAniversario ?? Infinity;
      const db = b.diasParaAniversario ?? Infinity;
      if (da !== db) return da - db;
      return a.nome.localeCompare(b.nome);
    });
  }, [listaComAniversario, busca]);

  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: PALETTE.inkSoft }}>{contatos.length} contato(s)</div>
        <Btn onClick={openNew}><Plus size={15} /> Novo contato</Btn>
      </div>

      <Card style={{ marginBottom: 10 }}>
        <button
          onClick={() => setShowTemplate(!showTemplate)}
          style={{ all: "unset", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}
        >
          <span style={{ fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            <Cake size={15} color={PALETTE.pink} /> Mensagem de aniversário (WhatsApp)
          </span>
          <span style={{ fontSize: 11, color: PALETTE.wine, fontWeight: 700 }}>{showTemplate ? "Fechar" : "Editar"}</span>
        </button>
        {showTemplate && (
          <div style={{ marginTop: 10 }}>
            <textarea
              value={template}
              onChange={(e) => salvarTemplate(e.target.value)}
              rows={4}
              style={{ ...inputStyle, resize: "vertical" }}
            />
            <div style={{ fontSize: 10.5, color: PALETTE.inkSoft, marginTop: 4 }}>
              Use <strong>{"{nome}"}</strong> onde quiser que entre o nome do contato automaticamente.
            </div>
          </div>
        )}
      </Card>

      <div className="search-pill" style={{ display: "flex", alignItems: "center", gap: 6, background: PALETTE.card, border: `1px solid ${PALETTE.line}`, borderRadius: 10, padding: "6px 10px", marginBottom: 12 }}>
        <Search size={15} color={PALETTE.inkSoft} />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou telefone"
          style={{ border: "none", outline: "none", fontSize: 16, flex: 1, background: "transparent" }}
        />
      </div>

      {filtered.length === 0 && (
        <Card style={{ textAlign: "center", color: PALETTE.inkSoft, fontSize: 13.5 }}>
          Nenhum contato cadastrado ainda. Toque em "Novo contato" para começar.
        </Card>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((c) => {
          const aniversarioProximo = c.diasParaAniversario !== null && c.diasParaAniversario <= 30;
          return (
            <Card key={c.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{c.nome}</div>
                  {c.telefone && (
                    <div style={{ fontSize: 12, color: PALETTE.inkSoft, marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
                      <Phone size={11} /> {c.telefone}
                    </div>
                  )}
                  {c.email && (
                    <div style={{ fontSize: 12, color: PALETTE.inkSoft, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                      <Mail size={11} /> {c.email}
                    </div>
                  )}
                  {c.endereco && (
                    <div style={{ fontSize: 12, color: PALETTE.inkSoft, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                      <MapPin size={11} /> {c.endereco}
                    </div>
                  )}
                </div>
                {aniversarioProximo && (
                  <span style={{
                    fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap",
                    background: PALETTE.pinkSoft, color: PALETTE.pink,
                  }}>
                    🎂 {rotuloDiasParaAniversario(c.diasParaAniversario)}
                  </span>
                )}
              </div>
              {c.aniversario && (
                <div style={{ fontSize: 11.5, color: PALETTE.inkSoft, marginTop: 6 }}>Aniversário: {fmtDate(c.aniversario)}</div>
              )}
              {c.observacoes && <div style={{ fontSize: 11.5, color: PALETTE.inkSoft, marginTop: 4, fontStyle: "italic" }}>{c.observacoes}</div>}

              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                {aniversarioProximo && c.telefone && (
                  <Btn onClick={() => enviarParabens(c)} style={{ flex: 1 }}><MessageCircle size={14} /> Parabenizar</Btn>
                )}
                <Btn variant="subtle" onClick={() => openEdit(c)} style={{ flex: 1 }}>Editar</Btn>
                <Btn variant="ghost" onClick={() => remove(c.id)} style={{ flex: 1 }}><Trash2 size={13} /> Remover</Btn>
              </div>
            </Card>
          );
        })}
      </div>

      {showForm && (
        <Modal onClose={() => setShowForm(false)} title={editingId ? "Editar contato" : "Novo contato"}>
          <Field label="Nome completo">
            <input style={inputStyle} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Maria Silva" />
          </Field>
          <Field label="Telefone / WhatsApp">
            <input style={inputStyle} value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(12) 99999-9999" />
          </Field>
          <Field label="E-mail">
            <input type="email" style={inputStyle} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Data de aniversário">
            <input type="date" style={inputStyle} value={form.aniversario} onChange={(e) => setForm({ ...form, aniversario: e.target.value })} />
          </Field>
          <Field label="Endereço">
            <input style={inputStyle} value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
          </Field>
          <Field label="Como conheceu">
            <input style={inputStyle} value={form.comoConheceu} onChange={(e) => setForm({ ...form, comoConheceu: e.target.value })} placeholder="Indicação, Instagram, evento anterior..." />
          </Field>
          <Field label="Observações">
            <textarea rows={3} style={{ ...inputStyle, resize: "vertical" }} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
          </Field>
          <Btn onClick={save} style={{ width: "100%", marginTop: 6 }}>Salvar contato</Btn>
        </Modal>
      )}
    </div>
  );
}
