import React, { useState, useEffect } from "react";
import { Loader2, RefreshCw, PartyPopper, Package } from "lucide-react";
import { supabase, SUPABASE_CONFIGURED } from "./supabaseClient";
import { loadLocal, saveLocal, fetchTable, syncTable } from "./shared/utils";
import { PALETTE } from "./shared/ui";
import { SEED_PROSPECTOS } from "./consignado/constants";
import { ESTACOES_PADRAO } from "./festas/constants";
import { ConsignadoModule } from "./consignado/ConsignadoModule";
import { FestasModule } from "./festas/FestasModule";

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [offline, setOffline] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [area, setArea] = useState(() => loadLocal("areaAtiva", "festas"));

  // ---- Consignado ----
  const [comercios, setComerciosState] = useState([]);
  const [entregas, setEntregasState] = useState([]);
  const [prospectos, setProspectosState] = useState([]);
  const [metaVisitas, setMetaVisitasState] = useState(5);

  // ---- Festas ----
  const [clientes, setClientesState] = useState([]);
  const [eventos, setEventosState] = useState([]);
  const [estacoes, setEstacoesState] = useState([]);

  function mudarArea(next) {
    setArea(next);
    saveLocal("areaAtiva", next);
  }

  useEffect(() => {
    (async () => {
      if (!SUPABASE_CONFIGURED) {
        setOffline(true);
        setComerciosState(loadLocal("comercios", []));
        setEntregasState(loadLocal("entregas", []));
        setProspectosState(loadLocal("prospectos", SEED_PROSPECTOS));
        setMetaVisitasState(loadLocal("metaVisitasSemanais", 5));
        setClientesState(loadLocal("clientes", []));
        setEventosState(loadLocal("eventos", []));
        setEstacoesState(loadLocal("estacoes", ESTACOES_PADRAO));
        setLoaded(true);
        return;
      }
      try {
        const [c, e, p, cl, ev, es] = await Promise.all([
          fetchTable(supabase, "comercios"),
          fetchTable(supabase, "entregas"),
          fetchTable(supabase, "prospectos"),
          fetchTable(supabase, "clientes"),
          fetchTable(supabase, "eventos"),
          fetchTable(supabase, "estacoes"),
        ]);
        const { data: settingsRow } = await supabase.from("settings").select("value").eq("key", "metaVisitas").maybeSingle();
        setComerciosState(c);
        setEntregasState(e);

        let prospectosFinal = p;
        if (p.length === 0) {
          // primeiro uso: semeia a lista inicial de prospecção no banco
          await syncTable(supabase, "prospectos", [], SEED_PROSPECTOS);
          prospectosFinal = SEED_PROSPECTOS;
        }
        setProspectosState(prospectosFinal);

        let estacoesFinal = es;
        if (es.length === 0) {
          // primeiro uso: semeia o catálogo padrão de estações de comida
          await syncTable(supabase, "estacoes", [], ESTACOES_PADRAO);
          estacoesFinal = ESTACOES_PADRAO;
        }
        setEstacoesState(estacoesFinal);

        setClientesState(cl);
        setEventosState(ev);
        setMetaVisitasState(settingsRow?.value ?? 5);

        saveLocal("comercios", c);
        saveLocal("entregas", e);
        saveLocal("prospectos", prospectosFinal);
        saveLocal("clientes", cl);
        saveLocal("eventos", ev);
        saveLocal("estacoes", estacoesFinal);
        saveLocal("metaVisitasSemanais", settingsRow?.value ?? 5);
      } catch {
        setOffline(true);
        setComerciosState(loadLocal("comercios", []));
        setEntregasState(loadLocal("entregas", []));
        setProspectosState(loadLocal("prospectos", SEED_PROSPECTOS));
        setMetaVisitasState(loadLocal("metaVisitasSemanais", 5));
        setClientesState(loadLocal("clientes", []));
        setEventosState(loadLocal("eventos", []));
        setEstacoesState(loadLocal("estacoes", ESTACOES_PADRAO));
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  async function recarregar() {
    if (!SUPABASE_CONFIGURED) return;
    setLoaded(false);
    try {
      const [c, e, p, cl, ev, es] = await Promise.all([
        fetchTable(supabase, "comercios"),
        fetchTable(supabase, "entregas"),
        fetchTable(supabase, "prospectos"),
        fetchTable(supabase, "clientes"),
        fetchTable(supabase, "eventos"),
        fetchTable(supabase, "estacoes"),
      ]);
      const { data: settingsRow } = await supabase.from("settings").select("value").eq("key", "metaVisitas").maybeSingle();
      setComerciosState(c);
      setEntregasState(e);
      setProspectosState(p);
      setClientesState(cl);
      setEventosState(ev);
      setEstacoesState(es);
      setMetaVisitasState(settingsRow?.value ?? 5);
      setOffline(false);
      setSaveError("");
    } catch {
      setSaveError("Não foi possível atualizar do servidor agora. Verifique sua internet.");
    } finally {
      setLoaded(true);
    }
  }

  function makeUpdater(table, currentValue, setState) {
    return async function updater(next) {
      const prev = currentValue;
      setState(next);
      saveLocal(table, next);
      if (!SUPABASE_CONFIGURED) return;
      try {
        await syncTable(supabase, table, prev, next);
        setSaveError("");
      } catch {
        setSaveError("Não sincronizou com o servidor — os dados continuam salvos neste aparelho, tente novamente com internet.");
      }
    };
  }

  const updateComercios = makeUpdater("comercios", comercios, setComerciosState);
  const updateEntregas = makeUpdater("entregas", entregas, setEntregasState);
  const updateProspectos = makeUpdater("prospectos", prospectos, setProspectosState);
  const updateClientes = makeUpdater("clientes", clientes, setClientesState);
  const updateEventos = makeUpdater("eventos", eventos, setEventosState);
  const updateEstacoes = makeUpdater("estacoes", estacoes, setEstacoesState);

  async function updateMetaVisitas(next) {
    setMetaVisitasState(next);
    saveLocal("metaVisitasSemanais", next);
    if (!SUPABASE_CONFIGURED) return;
    try {
      await supabase.from("settings").upsert({ key: "metaVisitas", value: next });
    } catch {
      /* silencioso — não é crítico */
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: PALETTE.bg, fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", color: PALETTE.ink, paddingBottom: "calc(90px + env(safe-area-inset-bottom))" }}>
      <Header offline={offline} onRefresh={recarregar} configured={SUPABASE_CONFIGURED} area={area} setArea={mudarArea} />
      {!loaded && (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <Loader2 className="spin-central" size={26} color={PALETTE.wine} />
          <style>{`.spin-central{animation:spin-central 1s linear infinite}@keyframes spin-central{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
      {loaded && saveError && (
        <div style={{ margin: "0 16px 12px", padding: "10px 14px", background: PALETTE.pendingSoft, color: PALETTE.pending, borderRadius: 10, fontSize: 13 }}>
          {saveError}
        </div>
      )}
      {loaded && (
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px" }}>
          {area === "festas" ? (
            <FestasModule
              eventos={eventos} setEventos={updateEventos}
              contatos={clientes} setContatos={updateClientes}
              estacoes={estacoes} setEstacoes={updateEstacoes}
            />
          ) : (
            <ConsignadoModule
              comercios={comercios} setComercios={updateComercios}
              entregas={entregas} setEntregas={updateEntregas}
              prospectos={prospectos} setProspectos={updateProspectos}
              metaVisitas={metaVisitas} setMetaVisitas={updateMetaVisitas}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Header({ offline, onRefresh, configured, area, setArea }) {
  const statusLabel = !configured ? "Local" : offline ? "Offline" : "Online";
  const statusColor = !configured || offline ? PALETTE.pending : PALETTE.ok;
  return (
    <div style={{
      padding: "calc(env(safe-area-inset-top) + 14px) 16px 12px",
      borderBottom: `1px solid ${PALETTE.lineSoft}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 12 }}>
        <img
          src="/icon-192.png" alt="" width={38} height={38}
          style={{ borderRadius: 11, boxShadow: "0 2px 6px rgba(142,42,75,0.25)", flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: PALETTE.gold }}>
            Boom
          </div>
          <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 18, fontWeight: 700, color: PALETTE.wine, marginTop: 1 }}>
            Central de Gestão
          </div>
        </div>
        {configured && (
          <button
            onClick={onRefresh}
            title="Atualizar dados do servidor"
            style={{
              background: "transparent", border: "none", cursor: "pointer", color: PALETTE.inkSoft,
              display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36,
              touchAction: "manipulation", flexShrink: 0,
            }}
          >
            <RefreshCw size={16} />
          </button>
        )}
        <div
          title={offline ? "Sem conexão — usando dados salvos neste aparelho" : undefined}
          style={{
            display: "flex", alignItems: "center", gap: 5, background: PALETTE.wineSoft, borderRadius: 999,
            padding: "6px 10px", flexShrink: 0,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: 999, background: statusColor, flexShrink: 0 }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: PALETTE.wine, whiteSpace: "nowrap" }}>{statusLabel}</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, background: PALETTE.bg, borderRadius: 12, padding: 4 }}>
        <button
          onClick={() => setArea("festas")}
          style={{
            flex: 1, border: "none", cursor: "pointer", borderRadius: 9, padding: "9px 0", fontSize: 13, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            background: area === "festas" ? PALETTE.wine : "transparent",
            color: area === "festas" ? "#fff" : PALETTE.inkSoft,
          }}
        >
          <PartyPopper size={15} /> Festas
        </button>
        <button
          onClick={() => setArea("consignado")}
          style={{
            flex: 1, border: "none", cursor: "pointer", borderRadius: 9, padding: "9px 0", fontSize: 13, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            background: area === "consignado" ? PALETTE.wine : "transparent",
            color: area === "consignado" ? "#fff" : PALETTE.inkSoft,
          }}
        >
          <Package size={15} /> Consignado
        </button>
      </div>
    </div>
  );
}
