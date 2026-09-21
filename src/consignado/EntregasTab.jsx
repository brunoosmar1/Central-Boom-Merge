import React, { useState, useRef } from "react";
import { Plus, Trash2, Check, Clock, Receipt, Share2, Download, MessageCircle, X } from "lucide-react";
import html2canvas from "html2canvas";
import { uid, brl, fmtDate, todayISO } from "../shared/utils";
import { Card, Field, inputStyle, Btn, Modal, Metric, PALETTE } from "../shared/ui";

export function EntregasTab({ comercios, entregas, setEntregas, lastEstoqueRestante }) {
  const [showForm, setShowForm] = useState(false);
  const activeComercios = comercios;
  const emptyBase = () => ({
    comercioId: activeComercios[0]?.id || "",
    data: todayISO(),
    qtdReposta: 0,
    qtdVendida: 0,
    qtdRecolhida: 0,
    preco: 18,
    status: "Pendente",
    recebidoPor: "",
    obs: "",
  });
  const [form, setForm] = useState(emptyBase());
  const [reciboEntrega, setReciboEntrega] = useState(null);

  function openNew() {
    setForm(emptyBase());
    setShowForm(true);
  }
  function save() {
    if (!form.comercioId) return;
    const estoqueAnterior = lastEstoqueRestante(form.comercioId);
    const novaEntrega = { ...form, id: uid(), estoqueAnterior };
    setEntregas([...entregas, novaEntrega]);
    setShowForm(false);
    setReciboEntrega(novaEntrega); // abre o recibo na hora, pronto para compartilhar
  }
  function remove(id) {
    setEntregas(entregas.filter((e) => e.id !== id));
  }
  function toggleStatus(id) {
    setEntregas(entregas.map((e) => (e.id === id ? { ...e, status: e.status === "Pago" ? "Pendente" : "Pago" } : e)));
  }

  const nomeComercio = (id) => comercios.find((c) => c.id === id)?.nome || "—";
  const sorted = [...entregas].sort((a, b) => (a.data < b.data ? 1 : -1));

  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: PALETTE.inkSoft }}>{entregas.length} lançamento(s)</div>
        {comercios.length > 0 ? (
          <Btn onClick={openNew}><Plus size={15} /> Novo lançamento</Btn>
        ) : null}
      </div>

      {comercios.length === 0 && (
        <Card style={{ textAlign: "center", color: PALETTE.inkSoft, fontSize: 13.5 }}>
          Cadastre um comércio na aba "Comércios" antes de lançar entregas.
        </Card>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sorted.map((e) => {
          const estoqueRestante = Number(e.estoqueAnterior || 0) + Number(e.qtdReposta || 0) - Number(e.qtdVendida || 0) - Number(e.qtdRecolhida || 0);
          const valorVendido = Number(e.qtdVendida || 0) * Number(e.preco || 0);
          const pago = e.status === "Pago";
          return (
            <Card key={e.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14.5 }}>{nomeComercio(e.comercioId)}</div>
                  <div style={{ fontSize: 12, color: PALETTE.inkSoft }}>{fmtDate(e.data)}</div>
                </div>
                <button
                  onClick={() => toggleStatus(e.id)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700,
                    padding: "4px 10px", borderRadius: 999, border: "none", cursor: "pointer",
                    background: pago ? PALETTE.okSoft : PALETTE.pendingSoft,
                    color: pago ? PALETTE.ok : PALETTE.pending,
                  }}
                >
                  {pago ? <Check size={12} /> : <Clock size={12} />} {e.status}
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10, fontSize: 12.5 }}>
                <Metric label="Reposto" value={`${e.qtdReposta} un.`} />
                <Metric label="Vendido" value={`${e.qtdVendida} un.`} />
                <Metric label="Recolhido" value={`${e.qtdRecolhida || 0} un.`} />
                <Metric label="Estoque no ponto" value={`${estoqueRestante} un.`} />
                <Metric label="Valor vendido" value={brl(valorVendido)} />
              </div>
              {e.obs && <div style={{ fontSize: 12, color: PALETTE.inkSoft, marginTop: 8, fontStyle: "italic" }}>{e.obs}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <Btn variant="subtle" onClick={() => setReciboEntrega(e)} style={{ flex: 1 }}><Receipt size={14} /> Recibo</Btn>
                <Btn variant="ghost" onClick={() => remove(e.id)} style={{ flex: 1 }}><Trash2 size={13} /> Remover</Btn>
              </div>
            </Card>
          );
        })}
      </div>

      {showForm && (
        <Modal onClose={() => setShowForm(false)} title="Novo lançamento">
          <Field label="Comércio">
            <select style={inputStyle} value={form.comercioId} onChange={(e) => setForm({ ...form, comercioId: e.target.value })}>
              {activeComercios.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Field>
          <div style={{ fontSize: 11.5, color: PALETTE.inkSoft, marginTop: -4, marginBottom: 10 }}>
            Estoque anterior no ponto: {lastEstoqueRestante(form.comercioId)} un. (calculado automaticamente do último lançamento)
          </div>
          <Field label="Data da visita">
            <input type="date" style={inputStyle} value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
          </Field>
          <Field label="Quantidade reposta nesta visita">
            <input type="number" style={inputStyle} value={form.qtdReposta} onChange={(e) => setForm({ ...form, qtdReposta: e.target.value })} />
          </Field>
          <Field label="Quantidade vendida desde a última visita">
            <input type="number" style={inputStyle} value={form.qtdVendida} onChange={(e) => setForm({ ...form, qtdVendida: e.target.value })} />
          </Field>
          <Field label="Quantidade recolhida nesta visita (avaria/vencido/devolução)">
            <input type="number" style={inputStyle} value={form.qtdRecolhida} onChange={(e) => setForm({ ...form, qtdRecolhida: e.target.value })} />
          </Field>
          <Field label="Preço de venda ao público (R$)">
            <input type="number" style={inputStyle} value={form.preco} onChange={(e) => setForm({ ...form, preco: e.target.value })} />
          </Field>
          <Field label="Status do pagamento">
            <select style={inputStyle} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="Pendente">Pendente</option>
              <option value="Pago">Pago</option>
            </select>
          </Field>
          <Field label="Recebido por (nome de quem está no comércio)">
            <input style={inputStyle} value={form.recebidoPor} onChange={(e) => setForm({ ...form, recebidoPor: e.target.value })} placeholder="Opcional, aparece no recibo" />
          </Field>
          <Field label="Observações">
            <input style={inputStyle} value={form.obs} onChange={(e) => setForm({ ...form, obs: e.target.value })} placeholder="Opcional" />
          </Field>
          <Btn onClick={save} style={{ width: "100%", marginTop: 6 }}>Salvar e gerar recibo</Btn>
        </Modal>
      )}

      {reciboEntrega && (
        <ReciboModal
          entrega={reciboEntrega}
          comercio={comercios.find((c) => c.id === reciboEntrega.comercioId)}
          onClose={() => setReciboEntrega(null)}
        />
      )}
    </div>
  );
}

// ---------------- Recibo ----------------
function ReciboModal({ entrega, comercio, onClose }) {
  const reciboRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const estoqueRestante =
    Number(entrega.estoqueAnterior || 0) + Number(entrega.qtdReposta || 0) -
    Number(entrega.qtdVendida || 0) - Number(entrega.qtdRecolhida || 0);
  const valorVendido = Number(entrega.qtdVendida || 0) * Number(entrega.preco || 0);
  const numeroRecibo = `${(entrega.data || "").replaceAll("-", "")}-${entrega.id}`;

  async function gerarImagem() {
    const canvas = await html2canvas(reciboRef.current, { scale: 3, backgroundColor: "#FFFFFF" });
    return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
  }

  async function compartilhar() {
    setBusy(true);
    setErrorMsg("");
    try {
      const blob = await gerarImagem();
      const file = new File([blob], `recibo-${numeroRecibo}.png`, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Recibo Boom Algodão Doce",
          text: `Recibo de consignação — ${comercio?.nome || ""} — ${fmtDate(entrega.data)}`,
        });
      } else {
        // navegador sem suporte a compartilhar arquivo: baixa a imagem e abre o WhatsApp com o texto
        baixarBlob(blob);
        abrirWhatsAppTexto();
      }
    } catch (err) {
      if (err?.name !== "AbortError") {
        setErrorMsg("Não foi possível compartilhar automaticamente. Use \"Baixar imagem\" e envie manualmente.");
      }
    } finally {
      setBusy(false);
    }
  }

  function baixarBlob(blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recibo-${numeroRecibo}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function baixarImagem() {
    setBusy(true);
    try {
      const blob = await gerarImagem();
      baixarBlob(blob);
    } finally {
      setBusy(false);
    }
  }

  function abrirWhatsAppTexto() {
    const linhas = [
      `*Recibo Boom Algodão Doce* #${numeroRecibo}`,
      `Comércio: ${comercio?.nome || "-"}`,
      `Data: ${fmtDate(entrega.data)}`,
      `Estoque anterior: ${entrega.estoqueAnterior} un.`,
      `Reposto agora: ${entrega.qtdReposta} un.`,
      `Vendido desde última visita: ${entrega.qtdVendida} un.`,
      `Recolhido agora: ${entrega.qtdRecolhida || 0} un.`,
      `Estoque atual no ponto: ${estoqueRestante} un.`,
      `Valor vendido: ${brl(valorVendido)}`,
      entrega.recebidoPor ? `Recebido por: ${entrega.recebidoPor}` : null,
    ].filter(Boolean).join("\n");
    const contato = (comercio?.contato || "").replace(/\D/g, "");
    const base = contato ? `https://wa.me/55${contato}` : "https://wa.me/";
    window.open(`${base}?text=${encodeURIComponent(linhas)}`, "_blank");
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(44,36,34,0.55)", display: "flex",
        alignItems: "flex-end", justifyContent: "center", zIndex: 60,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: PALETTE.bg, width: "100%", maxWidth: 720, borderRadius: "18px 18px 0 0",
          padding: 18, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 -8px 30px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: PALETTE.wine, display: "flex", alignItems: "center", gap: 8 }}>
            <Receipt size={18} /> Recibo de consignação
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: PALETTE.inkSoft }}>
            <X size={20} />
          </button>
        </div>

        {/* área que vira a imagem do recibo */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <div
            ref={reciboRef}
            style={{
              width: 380, background: "#FFFFFF", borderRadius: 10, border: `1px solid ${PALETTE.line}`,
              padding: 20, fontFamily: "'Segoe UI', system-ui, sans-serif", color: PALETTE.ink,
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 10 }}>
              <div style={{ fontFamily: "Georgia, serif", fontWeight: 800, fontSize: 20, color: PALETTE.wine }}>
                BOOM! Algodão Doce
              </div>
              <div style={{ fontSize: 10.5, color: PALETTE.inkSoft }}>S&amp;B Soluções Integradas · Caraguatatuba/SP</div>
              <div style={{ fontSize: 10.5, color: PALETTE.inkSoft }}>WhatsApp (12) 99606-3582</div>
            </div>
            <div style={{ borderTop: `1px dashed ${PALETTE.line}`, borderBottom: `1px dashed ${PALETTE.line}`, padding: "8px 0", margin: "8px 0" }}>
              <div style={{ fontSize: 11, color: PALETTE.inkSoft }}>Recibo nº {numeroRecibo}</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{comercio?.nome || "Comércio não identificado"}</div>
              {comercio?.endereco && <div style={{ fontSize: 11, color: PALETTE.inkSoft }}>{comercio.endereco}</div>}
              <div style={{ fontSize: 11, color: PALETTE.inkSoft, marginTop: 2 }}>Data: {fmtDate(entrega.data)}</div>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <tbody>
                <RLinha label="Estoque anterior no ponto" value={`${entrega.estoqueAnterior} un.`} />
                <RLinha label="Reposto nesta visita" value={`${entrega.qtdReposta} un.`} bold />
                <RLinha label="Vendido desde a última visita" value={`${entrega.qtdVendida} un.`} />
                <RLinha label="Recolhido nesta visita" value={`${entrega.qtdRecolhida || 0} un.`} />
                <RLinha label="Estoque atual no ponto" value={`${estoqueRestante} un.`} bold />
              </tbody>
            </table>

            <div style={{ borderTop: `1px dashed ${PALETTE.line}`, marginTop: 10, paddingTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                <span>Valor vendido no período</span>
                <span style={{ fontWeight: 700 }}>{brl(valorVendido)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: PALETTE.inkSoft, marginTop: 2 }}>
                <span>Status do pagamento</span>
                <span>{entrega.status}</span>
              </div>
            </div>

            {entrega.recebidoPor && (
              <div style={{ marginTop: 12, fontSize: 11.5 }}>Recebido por: <strong>{entrega.recebidoPor}</strong></div>
            )}
            {entrega.obs && <div style={{ marginTop: 4, fontSize: 11, color: PALETTE.inkSoft, fontStyle: "italic" }}>{entrega.obs}</div>}

            <div style={{ textAlign: "center", fontSize: 9.5, color: PALETTE.inkSoft, marginTop: 14 }}>
              Documento de controle interno de consignação — não é nota fiscal.
            </div>
          </div>
        </div>

        {errorMsg && (
          <div style={{ background: PALETTE.pendingSoft, color: PALETTE.pending, borderRadius: 10, padding: "8px 12px", fontSize: 12.5, marginBottom: 10 }}>
            {errorMsg}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Btn onClick={compartilhar} style={{ width: "100%" }}>
            <Share2 size={15} /> {busy ? "Preparando..." : "Compartilhar agora (WhatsApp / outros)"}
          </Btn>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="subtle" onClick={abrirWhatsAppTexto} style={{ flex: 1 }}>
              <MessageCircle size={14} /> WhatsApp (texto)
            </Btn>
            <Btn variant="ghost" onClick={baixarImagem} style={{ flex: 1 }}>
              <Download size={14} /> Baixar imagem
            </Btn>
          </div>
        </div>
        <div style={{ fontSize: 10.5, color: PALETTE.inkSoft, textAlign: "center", marginTop: 8 }}>
          "Compartilhar agora" abre o menu nativo do celular — escolha o WhatsApp do cliente na hora.
        </div>
      </div>
    </div>
  );
}

function RLinha({ label, value, bold }) {
  return (
    <tr>
      <td style={{ padding: "3px 0", color: bold ? PALETTE.ink : PALETTE.inkSoft, fontWeight: bold ? 700 : 400 }}>{label}</td>
      <td style={{ padding: "3px 0", textAlign: "right", fontWeight: bold ? 700 : 400 }}>{value}</td>
    </tr>
  );
}
