// ---------- helpers genéricos usados tanto pelo módulo de Festas quanto pelo de Consignado ----------
export const uid = () => Math.random().toString(36).slice(2, 10);

export const brl = (n) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const fmtDate = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export function weekStart(iso) {
  const d = new Date(`${iso}T00:00:00`);
  const dia = d.getDay();
  d.setDate(d.getDate() - (dia === 0 ? 6 : dia - 1));
  return d.toISOString().slice(0, 10);
}

export function addDaysISO(iso, days) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const DIAS_SEMANA_ABREV = ["D", "S", "T", "Q", "Q", "S", "S"];

// Calcula em quantos dias cai a próxima ocorrência de uma data (aniversário,
// data de nascimento etc.), ignorando o ano cadastrado — sempre olha pra
// frente a partir de hoje (0 = é hoje).
export function diasParaProximaOcorrencia(isoDate) {
  if (!isoDate) return null;
  const partes = isoDate.split("-");
  if (partes.length < 3) return null;
  const [, mStr, dStr] = partes;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const anoAtual = hoje.getFullYear();
  let proxima = new Date(anoAtual, Number(mStr) - 1, Number(dStr));
  proxima.setHours(0, 0, 0, 0);
  if (proxima < hoje) {
    proxima = new Date(anoAtual + 1, Number(mStr) - 1, Number(dStr));
  }
  const diffMs = proxima - hoje;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function idade(isoDate) {
  if (!isoDate) return null;
  const [y, m, d] = isoDate.split("-").map(Number);
  const hoje = new Date();
  let anos = hoje.getFullYear() - y;
  const aniversarioEsteAno = new Date(hoje.getFullYear(), m - 1, d);
  if (hoje < aniversarioEsteAno) anos -= 1;
  return anos;
}

export function buildWhatsAppLink(nome, contato, template) {
  const texto = template.replaceAll("{nome}", nome || "");
  const digits = (contato || "").replace(/\D/g, "");
  const base = digits ? `https://wa.me/55${digits}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(texto)}`;
}

// ---------- persistence ----------
// Fonte principal: Supabase (banco compartilhado — todo mundo que abre o app
// vê os mesmos dados). Reserva: localStorage do navegador, usado se o
// Supabase não estiver configurado ou o aparelho estiver offline.
export function loadLocal(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
export function saveLocal(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// Evita que o carregamento fique preso pra sempre numa rede instável: se o
// Supabase não responder dentro do prazo, trata como falha e cai para o
// modo offline (dados salvos no aparelho) em vez de travar no carregando.
export function withTimeout(promise, ms = 10000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

export async function fetchTable(supabase, table) {
  const { data, error } = await supabase.from(table).select("id, data");
  if (error) throw error;
  return data.map((row) => ({ ...row.data, id: row.id }));
}

export async function syncTable(supabase, table, prevList, nextList) {
  const prevIds = prevList.map((x) => x.id);
  const nextIds = new Set(nextList.map((x) => x.id));
  const toDelete = prevIds.filter((id) => !nextIds.has(id));
  if (toDelete.length) {
    const { error } = await supabase.from(table).delete().in("id", toDelete);
    if (error) throw error;
  }
  if (nextList.length) {
    const rows = nextList.map((item) => ({ id: item.id, data: item }));
    const { error } = await supabase.from(table).upsert(rows);
    if (error) throw error;
  }
}
