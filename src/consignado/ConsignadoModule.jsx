import React, { useMemo, useState } from "react";
import { LayoutDashboard, Target, Store, Package, BarChart3 } from "lucide-react";
import { uid } from "../shared/utils";
import { PALETTE } from "../shared/ui";
import { PainelConsignadoTab } from "./PainelTab";
import { ProspeccaoTab } from "./ProspeccaoTab";
import { ComerciosTab } from "./ComerciosTab";
import { EntregasTab } from "./EntregasTab";
import { ResumoTab } from "./ResumoTab";

export function ConsignadoModule({
  comercios, setComercios,
  entregas, setEntregas,
  prospectos, setProspectos,
  metaVisitas, setMetaVisitas,
}) {
  const [tab, setTab] = useState("painel");

  // ---------- derived ----------
  const resumo = useMemo(() => {
    return comercios.map((c) => {
      const lista = entregas
        .filter((e) => e.comercioId === c.id)
        .sort((a, b) => (a.data > b.data ? 1 : -1));
      const totalEntregue = lista.reduce((s, e) => s + Number(e.qtdReposta || 0), 0);
      const totalVendido = lista.reduce((s, e) => s + Number(e.qtdVendida || 0), 0);
      const valorVendido = lista.reduce((s, e) => s + Number(e.qtdVendida || 0) * Number(e.preco || 0), 0);
      const comissaoPct = Number(c.comissaoPct || 0) / 100;
      const valorComissao = valorVendido * comissaoPct;
      const aReceber = valorVendido - valorComissao;
      const pendente = lista
        .filter((e) => e.status !== "Pago")
        .reduce((s, e) => s + Number(e.qtdVendida || 0) * Number(e.preco || 0) * (1 - comissaoPct), 0);
      const estoqueAtual = lista.length
        ? Number(lista[lista.length - 1].estoqueAnterior || 0) +
          Number(lista[lista.length - 1].qtdReposta || 0) -
          Number(lista[lista.length - 1].qtdVendida || 0) -
          Number(lista[lista.length - 1].qtdRecolhida || 0)
        : 0;
      return { ...c, totalEntregue, totalVendido, valorVendido, valorComissao, aReceber, pendente, estoqueAtual, visitas: lista.length };
    });
  }, [comercios, entregas]);

  const totalGeral = useMemo(
    () => resumo.reduce((acc, r) => ({
      valorVendido: acc.valorVendido + r.valorVendido,
      aReceber: acc.aReceber + r.aReceber,
      pendente: acc.pendente + r.pendente,
    }), { valorVendido: 0, aReceber: 0, pendente: 0 }),
    [resumo]
  );

  function lastEstoqueRestante(comercioId) {
    const lista = entregas
      .filter((e) => e.comercioId === comercioId)
      .sort((a, b) => (a.data > b.data ? 1 : -1));
    if (!lista.length) return 0;
    const last = lista[lista.length - 1];
    return Number(last.estoqueAnterior || 0) + Number(last.qtdReposta || 0) - Number(last.qtdVendida || 0) - Number(last.qtdRecolhida || 0);
  }

  function criarComercioDeProspecto(prospecto) {
    const novoComercio = {
      id: uid(),
      nome: prospecto.nome,
      tipo: prospecto.tipo?.split("/")[0] || "Outro",
      endereco: prospecto.endereco,
      contato: prospecto.contato,
      responsavel: "",
      comissaoPct: 28,
      status: "Ativo",
    };
    setComercios([...comercios, novoComercio]);
    setProspectos(prospectos.map((p) => (p.id === prospecto.id ? { ...p, comercioId: novoComercio.id } : p)));
    setTab("comercios");
  }

  return (
    <div style={{ paddingBottom: 90 }}>
      {tab === "painel" && (
        <PainelConsignadoTab
          prospectos={prospectos}
          comercios={comercios}
          resumo={resumo}
          totalGeral={totalGeral}
          entregas={entregas}
          metaVisitas={metaVisitas}
          setMetaVisitas={setMetaVisitas}
          goTo={setTab}
        />
      )}
      {tab === "prospeccao" && (
        <ProspeccaoTab
          prospectos={prospectos}
          setProspectos={setProspectos}
          onCriarComercio={criarComercioDeProspecto}
        />
      )}
      {tab === "comercios" && (
        <ComerciosTab comercios={comercios} setComercios={setComercios} entregasCount={(id) => entregas.filter((e) => e.comercioId === id).length} />
      )}
      {tab === "entregas" && (
        <EntregasTab
          comercios={comercios}
          entregas={entregas}
          setEntregas={setEntregas}
          lastEstoqueRestante={lastEstoqueRestante}
        />
      )}
      {tab === "resumo" && <ResumoTab resumo={resumo} totalGeral={totalGeral} />}

      <ConsignadoTabBar tab={tab} setTab={setTab} />
    </div>
  );
}

function ConsignadoTabBar({ tab, setTab }) {
  const items = [
    { id: "painel", label: "Painel", icon: LayoutDashboard },
    { id: "prospeccao", label: "Prospecção", icon: Target },
    { id: "comercios", label: "Comércios", icon: Store },
    { id: "entregas", label: "Lançamentos", icon: Package },
    { id: "resumo", label: "Resumo", icon: BarChart3 },
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
