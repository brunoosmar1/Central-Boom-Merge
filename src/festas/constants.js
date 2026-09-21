import { uid } from "../shared/utils";

export const TIPO_EVENTO_OPTIONS = [
  "Aniversário infantil",
  "Aniversário adulto",
  "Chá de bebê / revelação",
  "Casamento",
  "Formatura",
  "Confraternização",
  "Evento corporativo",
  "Outro",
];

export const EVENTO_STATUS = ["Orçamento", "Confirmado", "Concluído", "Cancelado"];
export const EVENTO_STATUS_COLOR = {
  "Orçamento": "gold",
  "Confirmado": "wine",
  "Concluído": "ok",
  "Cancelado": "pending",
};

export const FORMA_PAGAMENTO_OPTIONS = ["Pix", "Dinheiro", "Cartão de crédito", "Cartão de débito", "Transferência"];

export const DEFAULT_BIRTHDAY_TEMPLATE =
  "🎉 Parabéns, {nome}! A equipe da Boom deseja um dia incrível e cheio de alegria. " +
  "Se estiver pensando na festa deste ano, já podemos separar as estações de comida favoritas pra você 😊🍭";

export const DEFAULT_ORCAMENTO_TEMPLATE =
  "Olá, {nome}! Aqui é da Boom Festas 🎉 Segue o orçamento da sua festa combinado. " +
  "Qualquer dúvida é só chamar por aqui!";

// Catálogo padrão de estações de comida — foco da operação de festas.
export const ESTACOES_PADRAO = [
  { nome: "Algodão Doce", emoji: "🍭", precoBase: 250, unidade: "por evento (até 3h)", descricao: "Algodão doce colorido, feito na hora." },
  { nome: "Pipoca", emoji: "🍿", precoBase: 200, unidade: "por evento (até 3h)", descricao: "Pipoca doce e salgada, na máquina." },
  { nome: "Cachorro-Quente", emoji: "🌭", precoBase: 380, unidade: "por evento (até 3h)", descricao: "Estação de cachorro-quente com acompanhamentos." },
  { nome: "Crepe", emoji: "🥞", precoBase: 420, unidade: "por evento (até 3h)", descricao: "Crepes doces e salgados montados na hora." },
  { nome: "Fondue", emoji: "🍫", precoBase: 450, unidade: "por evento (até 3h)", descricao: "Fondue de chocolate com frutas e mix de acompanhamentos." },
  { nome: "Açaí", emoji: "🍇", precoBase: 400, unidade: "por evento (até 3h)", descricao: "Açaí na tigela com toppings à vontade." },
  { nome: "Sorvete", emoji: "🍦", precoBase: 380, unidade: "por evento (até 3h)", descricao: "Casquinhas e potes de sorvete com coberturas." },
  { nome: "Fini", emoji: "🍬", precoBase: 220, unidade: "por evento (até 3h)", descricao: "Mesa de guloseimas Fini para os convidados." },
].map((e) => ({ id: uid(), ativo: true, ...e }));

export function calcularTotalEvento(evento) {
  const totalEstacoes = (evento.estacoes || []).reduce(
    (s, it) => s + Number(it.preco || 0) * Number(it.qtd || 1),
    0
  );
  return totalEstacoes + Number(evento.valorExtra || 0);
}

export function calcularSaldoEvento(evento) {
  const total = calcularTotalEvento(evento);
  const sinalPago = evento.sinal?.pago ? Number(evento.sinal?.valor || 0) : 0;
  return total - sinalPago;
}
