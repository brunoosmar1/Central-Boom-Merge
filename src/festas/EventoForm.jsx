import React, { useState } from "react";
import { Plus, Trash2, Check, Square } from "lucide-react";
import { uid, brl, todayISO } from "../shared/utils";
import { Field, inputStyle, Btn, Modal, PALETTE } from "../shared/ui";
import { TIPO_EVENTO_OPTIONS, EVENTO_STATUS, FORMA_PAGAMENTO_OPTIONS, calcularTotalEvento, calcularSaldoEvento } from "./constants";

export function emptyEvento(estacoesAtivas) {
  return {
    clienteId: "",
    clienteNome: "",
    clienteTelefone: "",
    tipoEvento: TIPO_EVENTO_OPTIONS[0],
    data: todayISO(),
    horaInicio: "14:00",
    horaFim: "17:00",
    local: "",
    numConvidados: 20,
    estacoes: [],
    valorExtra: 0,
    sinal: { valor: 0, pago: false, data: "" },
    formaPagamento: FORMA_PAGAMENTO_OPTIONS[0],
    status: "Orçamento",
    equipe: "",
    checklist: [],
    observacoes: "",
  };
}

export function EventoForm({ evento, contatos, estacoes, onSave, onClose, onDelete }) {
  const [form, setForm] = useState(evento);
  const [novoChecklistItem, setNovoChecklistItem] = useState("");

  const total = calcularTotalEvento(form);
  const saldo = calcularSaldoEvento(form);

  function toggleEstacao(estacao) {
    const existe = form.estacoes.find((e) => e.estacaoId === estacao.id);
    if (existe) {
      setForm({ ...form, estacoes: form.estacoes.filter((e) => e.estacaoId !== estacao.id) });
    } else {
      setForm({
        ...form,
        estacoes: [...form.estacoes, { estacaoId: estacao.id, nome: estacao.nome, emoji: estacao.emoji, preco: estacao.precoBase, qtd: 1 }],
      });
    }
  }
  function updateEstacaoLinha(estacaoId, patch) {
    setForm({
      ...form,
      estacoes: form.estacoes.map((e) => (e.estacaoId === estacaoId ? { ...e, ...patch } : e)),
    });
  }

  function selecionarCliente(id) {
    const c = contatos.find((c) => c.id === id);
    setForm({
      ...form,
      clienteId: id,
      clienteNome: c ? c.nome : form.clienteNome,
      clienteTelefone: c ? c.telefone : form.clienteTelefone,
    });
  }

  function addChecklistItem() {
    if (!novoChecklistItem.trim()) return;
    setForm({ ...form, checklist: [...(form.checklist || []), { id: uid(), item: novoChecklistItem.trim(), feito: false }] });
    setNovoChecklistItem("");
  }
  function toggleChecklistItem(id) {
    setForm({ ...form, checklist: form.checklist.map((c) => (c.id === id ? { ...c, feito: !c.feito } : c)) });
  }
  function removeChecklistItem(id) {
    setForm({ ...form, checklist: form.checklist.filter((c) => c.id !== id) });
  }

  function save() {
    if (!form.clienteNome.trim()) return;
    if (!form.data) return;
    onSave({ ...form, id: form.id || uid() });
  }

  return (
    <Modal onClose={onClose} title={form.id ? "Editar agendamento" : "Novo agendamento"}>
      <Field label="Cliente já cadastrado (opcional)">
        <select style={inputStyle} value={form.clienteId} onChange={(e) => selecionarCliente(e.target.value)}>
          <option value="">— Selecionar da lista de contatos —</option>
          {contatos.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </Field>
      <Field label="Nome do cliente">
        <input style={inputStyle} value={form.clienteNome} onChange={(e) => setForm({ ...form, clienteNome: e.target.value, clienteId: "" })} placeholder="Nome de quem contratou" />
      </Field>
      <Field label="Telefone / WhatsApp">
        <input style={inputStyle} value={form.clienteTelefone} onChange={(e) => setForm({ ...form, clienteTelefone: e.target.value })} />
      </Field>
      <Field label="Tipo de evento">
        <select style={inputStyle} value={form.tipoEvento} onChange={(e) => setForm({ ...form, tipoEvento: e.target.value })}>
          {TIPO_EVENTO_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <Field label="Data">
          <input type="date" style={inputStyle} value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
        </Field>
        <Field label="Início">
          <input type="time" style={inputStyle} value={form.horaInicio} onChange={(e) => setForm({ ...form, horaInicio: e.target.value })} />
        </Field>
        <Field label="Fim">
          <input type="time" style={inputStyle} value={form.horaFim} onChange={(e) => setForm({ ...form, horaFim: e.target.value })} />
        </Field>
      </div>
      <Field label="Local do evento">
        <input style={inputStyle} value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} placeholder="Endereço ou nome do salão/buffet" />
      </Field>
      <Field label="Número de convidados">
        <input type="number" style={inputStyle} value={form.numConvidados} onChange={(e) => setForm({ ...form, numConvidados: e.target.value })} />
      </Field>

      <div style={{ fontSize: 12, fontWeight: 700, color: PALETTE.inkSoft, margin: "14px 0 8px", textTransform: "uppercase", letterSpacing: 0.5 }}>
        Estações de comida contratadas
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {estacoes.map((estacao) => {
          const linha = form.estacoes.find((e) => e.estacaoId === estacao.id);
          const selecionada = Boolean(linha);
          return (
            <div key={estacao.id} style={{
              border: `1px solid ${selecionada ? PALETTE.wine : PALETTE.line}`, borderRadius: 10, padding: "8px 10px",
              background: selecionada ? PALETTE.wineSoft : "transparent",
            }}>
              <button
                onClick={() => toggleEstacao(estacao)}
                style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, width: "100%" }}
              >
                {selecionada ? <Check size={16} color={PALETTE.wine} /> : <Square size={16} color={PALETTE.inkSoft} />}
                <span style={{ fontSize: 15 }}>{estacao.emoji}</span>
                <span style={{ fontSize: 13.5, fontWeight: 600, flex: 1 }}>{estacao.nome}</span>
                <span style={{ fontSize: 11.5, color: PALETTE.inkSoft }}>{brl(estacao.precoBase)}</span>
              </button>
              {selecionada && (
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <label style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: PALETTE.inkSoft }}>Preço combinado (R$)</div>
                    <input
                      type="number" style={inputStyle} value={linha.preco}
                      onChange={(e) => updateEstacaoLinha(estacao.id, { preco: e.target.value })}
                    />
                  </label>
                  <label style={{ width: 80 }}>
                    <div style={{ fontSize: 10, color: PALETTE.inkSoft }}>Qtd.</div>
                    <input
                      type="number" style={inputStyle} value={linha.qtd}
                      onChange={(e) => updateEstacaoLinha(estacao.id, { qtd: e.target.value })}
                    />
                  </label>
                </div>
              )}
            </div>
          );
        })}
        {estacoes.length === 0 && (
          <div style={{ fontSize: 12, color: PALETTE.inkSoft }}>
            Nenhuma estação ativa cadastrada — adicione em "Estações".
          </div>
        )}
      </div>

      <Field label="Valor extra (decoração, deslocamento, hora adicional...)">
        <input type="number" style={inputStyle} value={form.valorExtra} onChange={(e) => setForm({ ...form, valorExtra: e.target.value })} />
      </Field>

      <div style={{
        background: PALETTE.bg, borderRadius: 10, padding: 12, marginBottom: 12,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Valor total do evento</span>
        <span style={{ fontSize: 18, fontWeight: 800, color: PALETTE.wine }}>{brl(total)}</span>
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, color: PALETTE.inkSoft, margin: "4px 0 8px", textTransform: "uppercase", letterSpacing: 0.5 }}>
        Sinal / pagamento
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Field label="Valor do sinal (R$)">
          <input
            type="number" style={inputStyle} value={form.sinal.valor}
            onChange={(e) => setForm({ ...form, sinal: { ...form.sinal, valor: e.target.value } })}
          />
        </Field>
        <Field label="Data do sinal">
          <input
            type="date" style={inputStyle} value={form.sinal.data}
            onChange={(e) => setForm({ ...form, sinal: { ...form.sinal, data: e.target.value } })}
          />
        </Field>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, cursor: "pointer" }}>
        <input
          type="checkbox" checked={form.sinal.pago}
          onChange={(e) => setForm({ ...form, sinal: { ...form.sinal, pago: e.target.checked } })}
        />
        <span style={{ fontSize: 13 }}>Sinal já foi pago</span>
      </label>
      <Field label="Forma de pagamento">
        <select style={inputStyle} value={form.formaPagamento} onChange={(e) => setForm({ ...form, formaPagamento: e.target.value })}>
          {FORMA_PAGAMENTO_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </Field>

      <div style={{
        background: PALETTE.okSoft, borderRadius: 10, padding: 12, marginBottom: 14,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: PALETTE.ok }}>Saldo restante</span>
        <span style={{ fontSize: 16, fontWeight: 800, color: PALETTE.ok }}>{brl(saldo)}</span>
      </div>

      <Field label="Status">
        <select style={inputStyle} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          {EVENTO_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Equipe escalada">
        <input style={inputStyle} value={form.equipe} onChange={(e) => setForm({ ...form, equipe: e.target.value })} placeholder="Nomes separados por vírgula" />
      </Field>

      <div style={{ fontSize: 12, fontWeight: 700, color: PALETTE.inkSoft, margin: "4px 0 8px", textTransform: "uppercase", letterSpacing: 0.5 }}>
        Checklist de preparação
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
        {(form.checklist || []).map((item) => (
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => toggleChecklistItem(item.id)} style={{ all: "unset", cursor: "pointer", display: "flex" }}>
              {item.feito ? <Check size={16} color={PALETTE.ok} /> : <Square size={16} color={PALETTE.inkSoft} />}
            </button>
            <span style={{ fontSize: 13, flex: 1, textDecoration: item.feito ? "line-through" : "none", color: item.feito ? PALETTE.inkSoft : PALETTE.ink }}>
              {item.item}
            </span>
            <button onClick={() => removeChecklistItem(item.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: PALETTE.inkSoft }}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          style={{ ...inputStyle, flex: 1 }} value={novoChecklistItem}
          onChange={(e) => setNovoChecklistItem(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addChecklistItem(); } }}
          placeholder="Ex.: separar mesas e utensílios"
        />
        <Btn variant="subtle" onClick={addChecklistItem}><Plus size={15} /></Btn>
      </div>

      <Field label="Observações">
        <textarea rows={3} style={{ ...inputStyle, resize: "vertical" }} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
      </Field>

      <Btn onClick={save} style={{ width: "100%", marginTop: 6 }}>Salvar agendamento</Btn>
      {form.id && onDelete && (
        <Btn variant="danger" onClick={() => onDelete(form.id)} style={{ width: "100%", marginTop: 8 }}>
          <Trash2 size={14} /> Excluir agendamento
        </Btn>
      )}
    </Modal>
  );
}
