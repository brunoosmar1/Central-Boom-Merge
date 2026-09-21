import { weekStart, todayISO } from "../shared/utils";

export function vendasPorSemana(entregas, semanas = 6) {
  const inicioAtual = new Date(weekStart(todayISO()));
  const buckets = [];
  for (let i = semanas - 1; i >= 0; i--) {
    const d = new Date(inicioAtual);
    d.setDate(d.getDate() - i * 7);
    buckets.push({ label: d.toISOString().slice(0, 10), valor: 0 });
  }
  const idx = new Map(buckets.map((b) => [b.label, b]));
  entregas.forEach((e) => {
    if (!e.data) return;
    const b = idx.get(weekStart(e.data));
    if (b) b.valor += Number(e.qtdVendida || 0) * Number(e.preco || 0);
  });
  return buckets;
}
