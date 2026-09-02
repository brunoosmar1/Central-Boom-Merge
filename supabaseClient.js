import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Store, Package, BarChart3, Plus, Trash2, Check, Clock, X, Receipt, Share2, Download,
  MessageCircle, LayoutDashboard, Target, MapPin, ArrowRight, Star, TrendingUp, Users,
  Loader2, RefreshCw, Navigation, FileText, Instagram, Phone, Mail, ChevronRight,
  AlertTriangle, Truck, Calendar, Edit3, Copy, Send,
} from "lucide-react";
import html2canvas from "html2canvas";
import { supabase, SUPABASE_CONFIGURED } from "./supabaseClient";

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);
const brl = (n) => (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};
const digits = (s) => (s || "").replace(/\D/g, "");
const encMsg = (s) => encodeURIComponent(s);

function loadLocal(key, fallback) {
  try { const r = window.localStorage.getItem(key); return r ? JSON.parse(r) : fallback; }
  catch { return fallback; }
}
function saveLocal(key, value) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}

// ─────────────────────────────────────────
// SUPABASE HELPERS
// ─────────────────────────────────────────
async function fetchTable(table) {
  const { data, error } = await supabase.from(table).select("id, data");
  if (error) throw error;
  return data.map((row) => ({ ...row.data, id: row.id }));
}
async function syncTable(table, prevList, nextList) {
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

// ─────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────
const PROSPECT_STATUS = ["Não contatado", "Contatado", "Visitado", "Fechado", "Recusou"];
const STATUS_OPTIONS = ["Ativo", "Em negociação", "Inativo"];
const TIPO_OPTIONS = ["Padaria", "Mercadinho", "Café", "Loja de conveniência", "Empório", "Outro"];

const PROSPECT_STATUS_STYLE = {
  "Não contatado": { bg: "#F0EDEB", color: "#7A6E68" },
  "Contatado":     { bg: "#F6ECD9", color: "#B98A3E" },
  "Visitado":      { bg: "#F4E4EA", color: "#8E2A4B" },
  "Fechado":       { bg: "#E5F3EA", color: "#2F7A4D" },
  "Recusou":       { bg: "#FBEAE0", color: "#B4552F" },
};

// ─────────────────────────────────────────
// PALETTE
// ─────────────────────────────────────────
const P = {
  bg:          "#FBF6F2",
  card:        "#FFFFFF",
  ink:         "#2C2422",
  inkSoft:     "#7A6E68",
  line:        "#EDE2DA",
  wine:        "#8E2A4B",
  wineSoft:    "#F4E4EA",
  gold:        "#B98A3E",
  goldSoft:    "#F6ECD9",
  ok:          "#2F7A4D",
  okSoft:      "#E5F3EA",
  pending:     "#B4552F",
  pendingSoft: "#FBEAE0",
};

// ─────────────────────────────────────────
// TEMPLATES DE MENSAGEM
// ─────────────────────────────────────────
const TEMPLATES_DEFAULT = [
  {
    id: "t1", nome: "Apresentação inicial", canal: "whatsapp",
    corpo: `Olá, {responsavel}! Tudo bem? 😊

Sou da *Boom Algodão Doce* e gostaria de apresentar nosso produto para {nome}.

Trabalhamos com algodão doce artesanal em potes, no modelo *consignação* — você só paga pelo que vender, sem risco de estoque!

Posso passar aí para mostrar? Tem um minutinho essa semana?`,
  },
  {
    id: "t2", nome: "Proposta de visita", canal: "whatsapp",
    corpo: `Olá {responsavel}, bom dia! 👋

Sou Bruno da *Boom Algodão Doce*. Vi que a {nome} tem um ótimo movimento e acredito que nosso algodão doce em pote seria muito bem recebido pelos seus clientes.

A proposta é simples: deixamos os potes em consignação e só cobramos pelo que vender. Zero risco para você!

Tem algum horário disponível para conversarmos rapidamente?`,
  },
  {
    id: "t3", nome: "Follow-up pós-visita", canal: "whatsapp",
    corpo: `Olá {responsavel}! Passando para dar um alô 😊

Já faz alguns dias desde nossa conversa sobre o algodão doce em {nome}. Ficou alguma dúvida que posso esclarecer?

Lembrando que é tudo em consignação — *sem risco*, só paga pelo que vender. Quando quiser avançar, é só me avisar! 🍭`,
  },
  {
    id: "t4", nome: "Aviso de reposição", canal: "whatsapp",
    corpo: `Olá {responsavel}! Tudo bem? 😊

Estou passando para avisar que vou fazer uma visita em {nome} para *reabastecer o estoque* de algodão doce.

Pretendo passar {data}. Confirma que está bom para você?`,
  },
  {
    id: "t5", nome: "Apresentação por e-mail", canal: "email",
    corpo: `Olá, {responsavel}!

Meu nome é Bruno, sou responsável pela Boom Algodão Doce, empresa especializada em algodão doce artesanal em potes.

Gostaria de apresentar uma oportunidade de parceria para {nome}: trabalhar com nosso produto no modelo de *consignação*, onde você disponibiliza espaço para os potes e só paga pelo que for vendido. Sem custo inicial, sem risco de estoque.

Nosso algodão doce é produzido artesanalmente, com sabores variados, e tem excelente aceitação em padarias e mercados da região.

Poderia agendar uma visita para apresentação e degustação? Estou à disposição para tirar dúvidas.

Atenciosamente,
Bruno
Boom Algodão Doce
(12) 99606-3582`,
  },
  {
    id: "t6", nome: "Confirmação de parceria", canal: "whatsapp",
    corpo: `Oi {responsavel}! 🎉

Que ótima notícia ter você como parceiro! Ficamos muito felizes com a parceria com {nome}.

Vou organizar a primeira entrega e já te aviso para acertarmos os detalhes. Qualquer dúvida, pode me chamar aqui mesmo.

Seja bem-vindo à família Boom! 🍭`,
  },
  {
    id: "t7", nome: "Estou chegando (roteiro)", canal: "whatsapp",
    corpo: `Oi {responsavel}! 😊

Passando pra avisar que hoje vou passar aí em {nome} para *reabastecer o algodão doce* e conferir as vendas.

Chego por volta de {hora}. Pode me aguardar? 🍭`,
  },
  {
    id: "t8", nome: "Agradecimento pós-venda", canal: "whatsapp",
    corpo: `Olá {responsavel}! Obrigado pela parceria com {nome} 🙏

Passando para agradecer a confiança! As vendas têm ido bem por aí?

Qualquer coisa, pode me chamar. Até a próxima visita! 🍭`,
  },
];

// ─────────────────────────────────────────
// SEED DE PROSPECTOS (100+ estabelecimentos reais)
// ─────────────────────────────────────────
const SEED_PROSPECTOS = [
["Caraguatatuba","Litoral","Esquina do Pão","Padaria","Av. Piauí, 500 - Jardim Primavera","(12) 3882-3792",4.5],
["Caraguatatuba","Litoral","Padaria Pão Vitória","Padaria","R. Sebastião Mariano Nepomuceno, 340 - Centro","(12) 3881-1724",4.6],
["Caraguatatuba","Litoral","Padaria Esquina do Indaiá","Padaria","Av. Rio Branco, 709 - Indaiá","(12) 98838-9970",4.4],
["Caraguatatuba","Litoral","Padaria Estrela de Caraguá","Padaria","Av. Marginal Direita, 52 - Poiares","(12) 98109-7889",4.2],
["Caraguatatuba","Litoral","Padaria Pão D'Ouro","Padaria","Av. Guilherme de Almeida, 901 - Morro do Algodão","(12) 99160-5840",4.5],
["Caraguatatuba","Litoral","Padaria Bruno Confeiteiro","Padaria","Av. Domingos Martins Cabrera, 947 - Balneário dos Golfinhos","(12) 2103-9676",4.6],
["Caraguatatuba","Litoral","Padaria Lobo","Padaria","Av. Mal. Floriano Peixoto, 260 - Poiares","(12) 3888-1810",4.5],
["Caraguatatuba","Litoral","Monalisas Padaria Empório e Restaurante","Padaria/Empório","Av. Geraldo Nogueira da Silva, 500 - Indaiá","(12) 98829-1139",3.3],
["Caraguatatuba","Litoral","Mercado Do Mauro","Mercadinho","R. Pedro Januário Leite - Jardim Olaria","",4.9],
["Caraguatatuba","Litoral","Mercado Beira Mar","Mercadinho","Av Maria de L da Silva K, 2525 - Massaguaçu","(12) 99797-4780",4.6],
["Caraguatatuba","Litoral","Mercadinho Sumaré","Mercadinho","Av. Siqueira Campos - Sumaré","(12) 3882-3188",4.3],
["Caraguatatuba","Litoral","Mercado Aruan","Mercadinho","R. Rodrigues Alves, 43 - Indaiá","(12) 3600-9133",4.2],
["Caraguatatuba","Litoral","Mercado Fortaleza","Mercadinho","Alameda Caramujos, 103-195 - Balneário dos Golfinhos","",4.3],
["Caraguatatuba","Litoral","Mercado Tida","Mercadinho","Alameda Cristóvão de Barros, 626 - Porto Novo","(12) 3208-2490",4.3],
["São Sebastião","Litoral","Padaria Elite Centro","Padaria","Av. Guarda Mor Lobo Viana, 266 - Lobo Viana","(12) 3892-1566",4.4],
["São Sebastião","Litoral","Feito à Mão - Padaria Artesanal","Padaria","Av. Mãe Bernarda, 836 - Juquehy","(12) 99711-6264",4.4],
["São Sebastião","Litoral","Padaria Elite Pontal","Padaria","Av. Manoel Hipólito do Rêgo, 1417 - Pontal da Cruz","(12) 99660-2777",4.5],
["São Sebastião","Litoral","Padaria Nova Enseada","Padaria","Av. Emílio Granato, 5485 - Bairro da Enseada","(12) 99679-6608",4.3],
["São Sebastião","Litoral","Estrela do Sahy","Padaria","Av. Adelino Tavares, 170 - Praia Barra do Sahy","(12) 3863-6814",4.4],
["São Sebastião","Litoral","Bom Jour Pães Artesanais","Padaria","Praça Prof. Antônio Argino, 42 - Centro","(12) 99745-9212",4.8],
["São Sebastião","Litoral","Maresias Bakery","Padaria/Café","Av. Dr. Francisco Loup, 420 - Maresias","(12) 3865-6919",4.3],
["São Sebastião","Litoral","Mercado Abrigo","Mercadinho","Av. Bernardo Cardim Neto, 800 - Praia de São Francisco","(12) 3862-0875",4.2],
["São Sebastião","Litoral","Mercearia do Bairro","Mercadinho","Av. Oscar Niemeyer, 777 - Praia Canto O Mar","(12) 98270-2639",4.9],
["São Sebastião","Litoral","Gima Mercados 3","Mercadinho","Av. Manoel Teixeira, 889 - Praia de São Francisco","(12) 99209-0387",4.6],
["São Sebastião","Litoral","Bom Gosto Empório Maresias","Empório/Mercado","R. Navegantes, 380 - Praia do Saco","(12) 99636-7700",4.4],
["São Sebastião","Litoral","Mercado kadmar","Mercadinho","R. Josefa Santana Neves, 317 - Topolândia","(12) 99679-3082",4.5],
["São Sebastião","Litoral","Empório Barequeçaba","Empório/Padaria","Rod. Dr. Manoel Hipólito do Rêgo, 662 - Barequeçaba","(12) 3862-6691",4.3],
["São Sebastião","Litoral","Mercadinho Pontal da Alegria","Mercadinho","R. Maria das Dores Souza","(11) 98462-7067",4.4],
["São Sebastião","Litoral","Mercado Pontal","Mercadinho","Av. Manoel Hipólito do Rêgo, 1275 - Pontal da Cruz","",3.8],
["Ilhabela","Litoral","Padoca da Ilha","Padaria","Av. Princesa Isabel, 507 - Pereque","(12) 99660-9785",4.5],
["Ilhabela","Litoral","Padaria Confeitaria Itaguassu","Padaria","R. Nova Dois, 133 - Itaguassu","(12) 3896-6418",4.4],
["Ilhabela","Litoral","Padaria Itaquanduba","Padaria","Av. dos Bandeirantes, 439 - Itaquanduba","(12) 3896-1719",4.4],
["Ilhabela","Litoral","Padaria e Conveniência Cocaia","Padaria","Av. Cel. José Vicente de Faria Lima, 401 - Pereque","(12) 3896-1216",4.1],
["Ilhabela","Litoral","Padaria Nossa Senhora Aparecida","Padaria","Av. Princesa Isabel, 2656 - Barra Velha","(11) 99795-1182",3.6],
["Ilhabela","Litoral","OPS Mini Mercado 24 Horas","Mercadinho","Av. Princesa Isabel, 2541 - Barra Velha","",5.0],
["Ilhabela","Litoral","Minimercado Rai","Mercadinho","R. Leonino Clementino Barbosa, 150 - Água Branca","",3.8],
["Ilhabela","Litoral","Mercado Ki Barato","Mercadinho","Av. Riachuelo, 4043 - Portinho","",4.3],
["Ilhabela","Litoral","Bom Preço Supermercado","Mercadinho","R. Santa Tereza, 20 - Vila","",4.3],
["Ilhabela","Litoral","Mercado Municipal de Ilhabela","Mercado/Empório","R. Benedito dos Santos Sampaio, 418 - Barra Velha","",4.9],
["Ilhabela","Litoral","Mercadinho Zico","Mercadinho","Av. José Pacheco do Nascimento, 10675 - São Pedro","(12) 3894-1830",4.7],
["Ilhabela","Litoral","Mercado Fortaleza (Ilhabela)","Mercadinho","Av. Ernesto de Oliveira, 435 - Água Branca","(12) 3896-2986",4.1],
["Ubatuba","Litoral","Padaria Integrale - Centro","Padaria/Café","R. Dr. Esteves da Silva, 360 - Centro","(12) 3836-1836",4.6],
["Ubatuba","Litoral","Casa do Pão","Padaria/Café","R. Prof. Thomaz Galhardo, 255 - Centro","(12) 3832-4751",4.6],
["Ubatuba","Litoral","Café com Leide - Padaria Artesanal","Padaria/Café","Av. Iperoig, 166 - Centro","(12) 99748-4775",4.7],
["Ubatuba","Litoral","Padaria Orquídea Palace","Padaria","R. Cap. Felipe, 490 - Itaguá","(12) 3835-1230",4.5],
["Ubatuba","Litoral","Padaria Itamambuca","Padaria","Av. de Acesso, 400 - Praia do Itamambuca","(12) 99729-3873",4.6],
["Ubatuba","Litoral","Padaria Dona Neia","Padaria","Frederico Chopin, 11 - Perequê-Açu","(12) 99654-3250",4.8],
["Ubatuba","Litoral","Praia do Pão - Padaria Artesanal","Padaria/Café","Av. Prof. Bernadino Querido, 132 - Itaguá","(12) 98194-2745",4.8],
["Ubatuba","Litoral","Padaria Dona Neia - Itaguá","Padaria","Av. Castro Alves, 800 - Itaguá","(12) 97408-1790",4.7],
["Ubatuba","Litoral","Mercado Jabaquara","Mercadinho","R. Jabaquara, 190 - Estufa II","(12) 3832-5640",4.4],
["Ubatuba","Litoral","Mercadinho Raiz","Mercadinho","R. Dona Maria Alves, 1492 - Centro","(12) 99206-5797",4.5],
["Ubatuba","Litoral","Grocery Santa Cruz","Mercadinho","R. Santa Cruz, 238 - Estufa II","(12) 95469-9558",4.3],
["São José dos Campos","Interior","Empório MD","Padaria/Café","Av. Dr. Ademar de Barros, 1070 - Vila Adyana","(12) 3922-4751",4.6],
["São José dos Campos","Interior","Ema Bakery","Padaria","Av. Heitor Villa Lobos, 1105 - Vila Ema","(12) 99618-2075",4.2],
["São José dos Campos","Interior","Padaria Nove de Julho","Padaria","Av. Nove de Julho, 275 - Vila Adyana","(12) 3921-2131",4.4],
["São José dos Campos","Interior","Pão de Queijo Bakery","Padaria","Av. Dr. Ademar de Barros, 1075 - Vila Adyana","(12) 3922-0988",4.5],
["São José dos Campos","Interior","Bakery Bread Point","Padaria","Av. Dr. Ademar de Barros, 874 - Jardim São Dimas","(12) 99755-2894",4.1],
["São José dos Campos","Interior","Pampulha Breads and Pastries","Padaria","Av. Dr. J. B. Soares de Queiroz Jr., 2461 - Jd. Indústrias","(12) 98156-3262",4.4],
["São José dos Campos","Interior","Mercadinho Real","Mercadinho","R. Nelson Cesar de Oliveira, 61 - Jd. Indústrias","(12) 98130-9966",4.2],
["São José dos Campos","Interior","Mercadinho São Francisco I","Mercadinho","Av. Jaime Pinto Machado, 1616 - Res. São Francisco","(12) 98136-7852",4.6],
["São José dos Campos","Interior","Mercado Baratinho","Mercadinho","Av. Iguape, 670 - Jardim Satélite","(12) 98297-4609",4.3],
["Jacareí","Interior","Padaria União","Padaria","R. Emb. José Carlos Macedo Soares, 258 - Jd. Santa Maria","(12) 3961-2046",4.7],
["Jacareí","Interior","Padaria Avareí","Padaria","Av. Santa Maria, 64 - Avareí","(12) 3351-3899",4.6],
["Jacareí","Interior","Padaria São Geraldo","Padaria","R. Gonçalves Dias, 50 - Vila Zeze","(12) 3953-1117",4.6],
["Jacareí","Interior","Bakery and Confectionery Paris","Padaria","R. Antônio Afonso, 414 - Centro","(12) 3951-2751",4.6],
["Jacareí","Interior","Padaria Millenium Jacareí","Padaria","R. Jorge Madid, 67 - Centro","(12) 99681-0997",4.3],
["Jacareí","Interior","Petit Paris","Padaria","Av. das Letras, 1018 - Vila Branca","(12) 99650-3288",4.5],
["Jacareí","Interior","Mercadinho N. Sra. Aparecida","Mercadinho","R. São Jerônimo, 873 - Jd. das Indústrias","(12) 3951-8581",4.6],
["Jacareí","Interior","Mercadinho Silva & Lira","Mercadinho","Estr. Teófilo Teodoro Resende, 925 - Jd. Colinas","(12) 98188-5525",4.7],
["Jacareí","Interior","Mercadinho do Mineiro","Mercadinho","Av. Egídio Antônio Coimbra, 450 - Res. Parque dos Sinos","(12) 3959-1235",4.3],
["Jacareí","Interior","Mercadinho Thomazini","Mercadinho","Av. dos Migrantes, 322 - Parque Meia Lua","(12) 3961-2933",4.3],
["Jacareí","Interior","Mercado Família","Mercadinho","R. Santo Ivo, 232 - Cidade Salvador","(12) 3953-3776",4.3],
["Taubaté","Interior","Panitália","Padaria/Café","Av. Independência, 1153 - Independência","(12) 3681-4433",4.6],
["Taubaté","Interior","Padaria do Jarbas Av. Itália","Padaria","Av. Itália, 1260 - Jardim das Nações","(12) 3621-3322",4.5],
["Taubaté","Interior","Casa de Pães Dona Vitta","Padaria","R. Dr. João Batista Ortiz Monteiro, 595 - Bonfim","(12) 98183-7945",4.7],
["Taubaté","Interior","DonaBella Bakery","Padaria/Café","Praça Félix Guisard, 229 - Praça da CTI","(12) 99179-5288",4.2],
["Taubaté","Interior","Padaria Pani House","Padaria","Estr. do Barreiro, 1942 - São Gonçalo","(12) 99223-1072",4.6],
["Taubaté","Interior","Empório Estoril","Padaria/Empório","Av. Álvaro Marcondes de Mattos, 526 - São Gonçalo","(12) 3682-1274",4.6],
["Taubaté","Interior","Mercadinho Carvalho","Mercadinho","Av. Eng. Milton de Alvarenga Peixoto, 1677 - Res. Santa Izabel","",4.6],
["Taubaté","Interior","Recanto Minimercado","Mercadinho","Av. Francisco Barreto Leme, 1597 - Vila São Geraldo","",4.7],
["Taubaté","Interior","Mini Mercado Frei Galvão","Mercadinho","R. Cláudio José de Camargo, 20 - Vila São José","(12) 3424-1901",4.2],
["Taubaté","Interior","Mercadinho do Antonio","Mercadinho","Av. Rodolfo Moreira de Almeida Jr., 1220 - Jd. Sandra Maria","(12) 99236-8749",4.6],
["Taubaté","Interior","Mini Mercados","Mercadinho","Av. Maria Aparecida Francisca de Jesus, 41 - Alto São Pedro","(12) 3624-3160",4.6],
["Caçapava","Interior","Bakery St. Gerard","Padaria","Av. da Saudade, 261 - Vila Resende","(12) 3652-5890",4.6],
["Caçapava","Interior","Panificadora São Geraldo Unidade 2","Padaria","Av. Cel. Manoel Inocêncio, 888 - Vila São João","(12) 99106-3072",4.3],
["Caçapava","Interior","Padaria Conquista","Padaria","R. Nove de Julho, 500 - Jardim São José","(12) 3653-1586",4.7],
["Caçapava","Interior","Padaria Santa Therezinha","Padaria","R. Sete de Setembro, 205 - Centro","(12) 3653-1215",4.7],
["Caçapava","Interior","Bakery La Costa","Padaria","R. Padre José Benedito Alves Monteiro, 171 - Vila Santos","(12) 3653-2808",4.4],
["Caçapava","Interior","Panificadora Santa Clara","Padaria","Praça Tiradentes, 59 - Vila Menino Jesus","(12) 3221-4403",4.3],
["Caçapava","Interior","Mercado Municipal","Mercado/Empório","Av. Pres. Roosevelt, 100 - Centro","(12) 3652-9237",4.4],
["Caçapava","Interior","Nelsinho Supermercado","Mercadinho","R. Arthur Portes, 101 - Vila São João","(12) 3654-3654",4.4],
["Caçapava","Interior","Mercado Pagé","Mercadinho","R. Artur Benedito de Oliveira Pôrto, 311 - Jardim Rafael","(12) 3653-2338",4.4],
["Caçapava","Interior","Mercadinho Império","Mercadinho","Av. Honório Ferreira Pedrosa, 309 - Parque Res. Nova Caçapava","",4.4],
["Paraibuna","Interior","Padaria Pão Perfeito","Padaria","Praça Major Marcelino Amâncio de Moura, 1 - Centro","(12) 99706-8813",4.6],
["Paraibuna","Interior","Padaria e Confeitaria Santo Expedito","Padaria","R. Padre Américo, 207","",0],
["Paraibuna","Interior","Pão Nosso Bakery","Padaria","Praça Manoel Antonio de Carvalho, 117 - Centro","(12) 99759-2848",4.6],
["Paraibuna","Interior","Mercado Nossa Senhora de Fátima","Mercadinho","R. Padre Américo, 239","(12) 99792-2661",4.4],
["Paraibuna","Interior","Mercadinho Gente Boa","Mercadinho","R. Cel. Nabor Nogueira Santos, 86","(12) 3974-3858",4.5],
["Paraibuna","Interior","Mercado Q Beleza","Mercadinho","Av. Carlos Guimarães, 240","",4.6],
].map(([cidade, prioridade, nome, tipo, endereco, contato, avaliacao]) => ({
  id: uid(), cidade, prioridade, nome, tipo, endereco, contato, avaliacao,
  status: "Não contatado", dataUltimoContato: "", obs: "", instagram: "", comercioId: null,
}));

// ─────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────
export default function App() {
  const [loaded, setLoaded]       = useState(false);
  const [offline, setOffline]     = useState(false);
  const [saveError, setSaveError] = useState("");
  const [comercios, setComercios] = useState([]);
  const [entregas, setEntregas]   = useState([]);
  const [prospectos, setProspectos] = useState([]);
  const [metaVisitas, setMetaVisitas] = useState(5);
  const [templates, setTemplates] = useState(TEMPLATES_DEFAULT);
  const [tab, setTab] = useState("painel");

  // ---- load ----
  useEffect(() => {
    (async () => {
      if (!SUPABASE_CONFIGURED) {
        setOffline(true);
        setComercios(loadLocal("comercios", []));
        setEntregas(loadLocal("entregas", []));
        setProspectos(loadLocal("prospectos", SEED_PROSPECTOS));
        setMetaVisitas(loadLocal("metaVisitas", 5));
        setTemplates(loadLocal("templates", TEMPLATES_DEFAULT));
        setLoaded(true);
        return;
      }
      try {
        const [c, e, p] = await Promise.all([
          fetchTable("comercios"), fetchTable("entregas"), fetchTable("prospectos"),
        ]);
        const { data: mvRow }  = await supabase.from("settings").select("value").eq("key", "metaVisitas").maybeSingle();
        const { data: tplRow } = await supabase.from("settings").select("value").eq("key", "templates").maybeSingle();
        setComercios(c);
        setEntregas(e);
        if (p.length > 0) {
          setProspectos(p);
        } else {
          await syncTable("prospectos", [], SEED_PROSPECTOS);
          setProspectos(SEED_PROSPECTOS);
        }
        setMetaVisitas(mvRow?.value ?? 5);
        setTemplates(tplRow?.value ?? TEMPLATES_DEFAULT);
        saveLocal("comercios", c);
        saveLocal("entregas", e);
        saveLocal("prospectos", p.length > 0 ? p : SEED_PROSPECTOS);
        saveLocal("metaVisitas", mvRow?.value ?? 5);
        saveLocal("templates", tplRow?.value ?? TEMPLATES_DEFAULT);
      } catch {
        setOffline(true);
        setComercios(loadLocal("comercios", []));
        setEntregas(loadLocal("entregas", []));
        setProspectos(loadLocal("prospectos", SEED_PROSPECTOS));
        setMetaVisitas(loadLocal("metaVisitas", 5));
        setTemplates(loadLocal("templates", TEMPLATES_DEFAULT));
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  async function recarregar() {
    if (!SUPABASE_CONFIGURED) return;
    setLoaded(false);
    try {
      const [c, e, p] = await Promise.all([
        fetchTable("comercios"), fetchTable("entregas"), fetchTable("prospectos"),
      ]);
      const { data: mvRow } = await supabase.from("settings").select("value").eq("key", "metaVisitas").maybeSingle();
      setComercios(c); setEntregas(e); setProspectos(p);
      setMetaVisitas(mvRow?.value ?? 5);
      setOffline(false); setSaveError("");
    } catch {
      setSaveError("Falha ao atualizar do servidor. Verifique sua internet.");
    } finally {
      setLoaded(true);
    }
  }

  // ---- sync helpers ----
  async function upComercios(next) {
    setComercios(next); saveLocal("comercios", next);
    if (!SUPABASE_CONFIGURED) return;
    try { await syncTable("comercios", comercios, next); setSaveError(""); }
    catch { setSaveError("Dados salvos neste aparelho — sync falhou, tente novamente."); }
  }
  async function upEntregas(next) {
    setEntregas(next); saveLocal("entregas", next);
    if (!SUPABASE_CONFIGURED) return;
    try { await syncTable("entregas", entregas, next); setSaveError(""); }
    catch { setSaveError("Dados salvos neste aparelho — sync falhou, tente novamente."); }
  }
  async function upProspectos(next) {
    setProspectos(next); saveLocal("prospectos", next);
    if (!SUPABASE_CONFIGURED) return;
    try { await syncTable("prospectos", prospectos, next); setSaveError(""); }
    catch { setSaveError("Dados salvos neste aparelho — sync falhou, tente novamente."); }
  }
  async function upMetaVisitas(next) {
    setMetaVisitas(next); saveLocal("metaVisitas", next);
    if (!SUPABASE_CONFIGURED) return;
    try { await supabase.from("settings").upsert({ key: "metaVisitas", value: next }); }
    catch { /* silencioso */ }
  }
  async function upTemplates(next) {
    setTemplates(next); saveLocal("templates", next);
    if (!SUPABASE_CONFIGURED) return;
    try { await supabase.from("settings").upsert({ key: "templates", value: next }); }
    catch { /* silencioso */ }
  }

  // ---- derived ----
  const resumo = useMemo(() => comercios.map((c) => {
    const lista = entregas.filter((e) => e.comercioId === c.id).sort((a, b) => a.data > b.data ? 1 : -1);
    const totalEntregue = lista.reduce((s, e) => s + Number(e.qtdReposta || 0), 0);
    const totalVendido  = lista.reduce((s, e) => s + Number(e.qtdVendida || 0), 0);
    const valorVendido  = lista.reduce((s, e) => s + Number(e.qtdVendida || 0) * Number(e.preco || 0), 0);
    const comissaoPct   = Number(c.comissaoPct || 0) / 100;
    const valorComissao = valorVendido * comissaoPct;
    const aReceber      = valorVendido - valorComissao;
    const pendente      = lista.filter((e) => e.status !== "Pago")
      .reduce((s, e) => s + Number(e.qtdVendida || 0) * Number(e.preco || 0) * (1 - comissaoPct), 0);
    const last = lista[lista.length - 1];
    const estoqueAtual  = last
      ? Number(last.estoqueAnterior || 0) + Number(last.qtdReposta || 0) - Number(last.qtdVendida || 0) - Number(last.qtdRecolhida || 0)
      : 0;
    return { ...c, totalEntregue, totalVendido, valorVendido, valorComissao, aReceber, pendente, estoqueAtual, visitas: lista.length };
  }), [comercios, entregas]);

  const totalGeral = useMemo(() => resumo.reduce(
    (a, r) => ({ valorVendido: a.valorVendido + r.valorVendido, aReceber: a.aReceber + r.aReceber, pendente: a.pendente + r.pendente }),
    { valorVendido: 0, aReceber: 0, pendente: 0 }
  ), [resumo]);

  function lastEstoqueRestante(comercioId) {
    const lista = entregas.filter((e) => e.comercioId === comercioId).sort((a, b) => a.data > b.data ? 1 : -1);
    if (!lista.length) return 0;
    const last = lista[lista.length - 1];
    return Number(last.estoqueAnterior || 0) + Number(last.qtdReposta || 0) - Number(last.qtdVendida || 0) - Number(last.qtdRecolhida || 0);
  }

  function criarComercioDeProspecto(prospecto) {
    const novo = {
      id: uid(), nome: prospecto.nome, tipo: prospecto.tipo?.split("/")[0] || "Outro",
      endereco: prospecto.endereco, contato: prospecto.contato, responsavel: "",
      comissaoPct: 28, status: "Ativo",
    };
    upComercios([...comercios, novo]);
    upProspectos(prospectos.map((p) => p.id === prospecto.id ? { ...p, comercioId: novo.id } : p));
    setTab("comercios");
  }

  const tabs = [
    { id: "painel",     label: "Painel",       icon: LayoutDashboard },
    { id: "prospeccao", label: "Prospecção",   icon: Target },
    { id: "comercios",  label: "Comércios",    icon: Store },
    { id: "entregas",   label: "Lançamentos",  icon: Package },
    { id: "roteiro",    label: "Roteiro",      icon: Navigation },
    { id: "templates",  label: "Templates",    icon: FileText },
    { id: "resumo",     label: "Resumo",       icon: BarChart3 },
  ];

  const sharedProps = { comercios, entregas, prospectos, resumo, totalGeral, templates };

  return (
    <div style={{ minHeight: "100vh", background: P.bg, fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", color: P.ink, paddingBottom: 88 }}>
      <Header offline={offline} onRefresh={recarregar} configured={SUPABASE_CONFIGURED} />
      {!loaded && <SpinCenter />}
      {loaded && saveError && (
        <div style={{ margin: "0 16px 12px", padding: "10px 14px", background: P.pendingSoft, color: P.pending, borderRadius: 10, fontSize: 13 }}>
          {saveError}
        </div>
      )}
      {loaded && (
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px" }}>
          {tab === "painel"     && <PainelTab {...sharedProps} metaVisitas={metaVisitas} setMetaVisitas={upMetaVisitas} goTo={setTab} />}
          {tab === "prospeccao" && <ProspeccaoTab prospectos={prospectos} setProspectos={upProspectos} templates={templates} onCriarComercio={criarComercioDeProspecto} />}
          {tab === "comercios"  && <ComerciosTab comercios={comercios} setComercios={upComercios} entregasCount={(id) => entregas.filter((e) => e.comercioId === id).length} />}
          {tab === "entregas"   && <EntregasTab comercios={comercios} entregas={entregas} setEntregas={upEntregas} lastEstoqueRestante={lastEstoqueRestante} />}
          {tab === "roteiro"    && <RoteiroTab comercios={comercios} entregas={entregas} />}
          {tab === "templates"  && <TemplatesTab templates={templates} setTemplates={upTemplates} />}
          {tab === "resumo"     && <ResumoTab resumo={resumo} totalGeral={totalGeral} />}
        </div>
      )}
      <TabBar tab={tab} setTab={setTab} items={tabs} />
    </div>
  );
}

// ─────────────────────────────────────────
// HEADER
// ─────────────────────────────────────────
function Header({ offline, onRefresh, configured }) {
  return (
    <div style={{ padding: "20px 16px 12px", textAlign: "center", position: "relative" }}>
      <div style={{ fontSize: 11, letterSpacing: 1.8, textTransform: "uppercase", color: P.gold, fontWeight: 700 }}>
        Boom Algodão Doce
      </div>
      <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 24, fontWeight: 700, color: P.wine, marginTop: 2 }}>
        Central de Gestão
      </div>
      {configured && (
        <button onClick={onRefresh} title="Atualizar" style={{ position: "absolute", top: 20, right: 16, background: "transparent", border: "none", cursor: "pointer", color: P.inkSoft }}>
          <RefreshCw size={16} />
        </button>
      )}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 5, marginTop: 6 }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: offline ? P.pending : P.ok, display: "inline-block" }} />
        <span style={{ fontSize: 10.5, color: P.inkSoft }}>
          {!configured ? "Somente neste aparelho" : offline ? "Offline — dados locais" : "Sincronizado"}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// TAB BAR (scrollable)
// ─────────────────────────────────────────
function TabBar({ tab, setTab, items }) {
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: P.card, borderTop: `1px solid ${P.line}`, boxShadow: "0 -4px 16px rgba(0,0,0,0.05)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", overflowX: "auto", scrollbarWidth: "none" }}>
        {items.map((it) => {
          const Icon = it.icon;
          const active = tab === it.id;
          return (
            <button key={it.id} onClick={() => setTab(it.id)} style={{ flex: "0 0 auto", minWidth: 64, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "10px 10px 12px", background: "transparent", border: "none", cursor: "pointer", color: active ? P.wine : P.inkSoft }}>
              <Icon size={17} strokeWidth={active ? 2.5 : 2} />
              <span style={{ fontSize: 9, fontWeight: active ? 700 : 500, whiteSpace: "nowrap" }}>{it.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// BASE COMPONENTS
// ─────────────────────────────────────────
function Card({ children, style }) {
  return <div style={{ background: P.card, borderRadius: 14, border: `1px solid ${P.line}`, padding: 16, ...style }}>{children}</div>;
}
function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      <div style={{ fontSize: 12, color: P.inkSoft, marginBottom: 4 }}>{label}</div>
      {children}
    </label>
  );
}
const iStyle = { width: "100%", padding: "9px 10px", borderRadius: 9, border: `1px solid ${P.line}`, fontSize: 14, background: "#FDFAF8", color: P.ink, boxSizing: "border-box" };

function Btn({ children, onClick, variant = "primary", style, type = "button" }) {
  const v = {
    primary: { background: P.wine, color: "#fff", border: "none" },
    ghost:   { background: "transparent", color: P.wine, border: `1px solid ${P.wine}` },
    subtle:  { background: P.wineSoft, color: P.wine, border: "none" },
    green:   { background: P.ok, color: "#fff", border: "none" },
    gold:    { background: P.goldSoft, color: P.gold, border: "none" },
  };
  return (
    <button type={type} onClick={onClick} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", ...v[variant], ...style }}>
      {children}
    </button>
  );
}

function Metric({ label, value, sub }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 10.5, color: P.inkSoft, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: P.wine, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: P.inkSoft, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function StatusBadge({ status }) {
  const s = PROSPECT_STATUS_STYLE[status] || { bg: P.line, color: P.inkSoft };
  return <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: s.bg, color: s.color, whiteSpace: "nowrap" }}>{status}</span>;
}

function SpinCenter() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
      <Loader2 size={26} color={P.wine} style={{ animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Modal({ children, onClose, title }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(44,36,34,0.45)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: P.card, width: "100%", maxWidth: 720, borderRadius: "18px 18px 0 0", padding: 20, maxHeight: "88vh", overflowY: "auto", boxShadow: "0 -8px 30px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: P.wine }}>{title}</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: P.inkSoft }}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// PAINEL TAB
// ─────────────────────────────────────────
function PainelTab({ prospectos, resumo, totalGeral, entregas, metaVisitas, setMetaVisitas, goTo }) {
  const hoje = todayISO();
  const semanaInicio = (() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().slice(0, 10);
  })();

  const visitasSemana = entregas.filter((e) => e.data >= semanaInicio && e.data <= hoje).length;
  const metaPct = Math.min(100, Math.round((visitasSemana / Math.max(1, metaVisitas)) * 100));

  const contatados = prospectos.filter((p) => p.status === "Contatado").length;
  const fechados   = prospectos.filter((p) => p.status === "Fechado").length;
  const ativos     = resumo.filter((r) => r.status === "Ativo").length;

  // mini bar chart — top 5 comércios por valor vendido
  const top5 = [...resumo].sort((a, b) => b.valorVendido - a.valorVendido).slice(0, 5);
  const maxVal = top5[0]?.valorVendido || 1;

  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <Card><Metric label="A receber (total)" value={brl(totalGeral.aReceber)} sub={`${brl(totalGeral.pendente)} pendente`} /></Card>
        <Card><Metric label="Valor vendido" value={brl(totalGeral.valorVendido)} /></Card>
        <Card><Metric label="Pontos ativos" value={ativos} sub={`de ${resumo.length} comércio(s)`} /></Card>
        <Card><Metric label="Prospectos" value={`${contatados} / ${prospectos.length}`} sub={`${fechados} fechado(s)`} /></Card>
      </div>

      {/* Meta de visitas */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5 }}>Meta de visitas esta semana</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={() => setMetaVisitas(Math.max(1, metaVisitas - 1))} style={{ width: 22, height: 22, borderRadius: 999, border: `1px solid ${P.line}`, background: P.bg, cursor: "pointer", fontSize: 14, color: P.inkSoft }}>−</button>
            <span style={{ fontWeight: 700, fontSize: 14, minWidth: 20, textAlign: "center" }}>{metaVisitas}</span>
            <button onClick={() => setMetaVisitas(metaVisitas + 1)} style={{ width: 22, height: 22, borderRadius: 999, border: `1px solid ${P.line}`, background: P.bg, cursor: "pointer", fontSize: 14, color: P.inkSoft }}>+</button>
          </div>
        </div>
        <div style={{ background: P.line, borderRadius: 999, height: 10, overflow: "hidden" }}>
          <div style={{ width: `${metaPct}%`, height: "100%", background: metaPct >= 100 ? P.ok : P.wine, borderRadius: 999, transition: "width .4s" }} />
        </div>
        <div style={{ fontSize: 11.5, color: P.inkSoft, marginTop: 5 }}>
          {visitasSemana} de {metaVisitas} visita(s) — {metaPct}%
        </div>
      </Card>

      {/* Gráfico top comércios */}
      {top5.length > 0 && (
        <Card style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 12 }}>Top comércios por venda</div>
          {top5.map((r, i) => (
            <div key={r.id} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                <span style={{ color: P.ink, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "60%" }}>{r.nome}</span>
                <span style={{ color: P.inkSoft }}>{brl(r.valorVendido)}</span>
              </div>
              <div style={{ background: P.line, borderRadius: 999, height: 7, overflow: "hidden" }}>
                <div style={{ width: `${Math.round((r.valorVendido / maxVal) * 100)}%`, height: "100%", background: ["#8E2A4B","#B98A3E","#2F7A4D","#2a78d6","#eb6834"][i], borderRadius: 999 }} />
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Alertas de estoque baixo */}
      {resumo.filter((r) => r.estoqueAtual <= 5 && r.status === "Ativo").length > 0 && (
        <Card style={{ borderColor: P.pending, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <AlertTriangle size={14} color={P.pending} />
            <span style={{ fontWeight: 700, fontSize: 13, color: P.pending }}>Estoque crítico</span>
          </div>
          {resumo.filter((r) => r.estoqueAtual <= 5 && r.status === "Ativo").map((r) => (
            <div key={r.id} style={{ fontSize: 12.5, marginBottom: 4 }}>
              <strong>{r.nome}</strong> — {r.estoqueAtual} un. restantes
            </div>
          ))}
          <Btn onClick={() => goTo("roteiro")} variant="subtle" style={{ marginTop: 6 }}>
            <Navigation size={13} /> Ver roteiro
          </Btn>
        </Card>
      )}

      <Btn onClick={() => goTo("prospeccao")} variant="ghost" style={{ width: "100%", marginBottom: 8 }}>
        <Target size={14} /> Ir para prospecção ({prospectos.filter((p) => p.status === "Não contatado").length} pendentes)
      </Btn>
    </div>
  );
}

// ─────────────────────────────────────────
// PROSPECÇÃO TAB — KANBAN
// ─────────────────────────────────────────
function ProspeccaoTab({ prospectos, setProspectos, templates, onCriarComercio }) {
  const [editing, setEditing]   = useState(null);
  const [filtroC, setFiltroC]   = useState("Todos");
  const [busca, setBusca]       = useState("");
  const [kanbanCol, setKanbanCol] = useState(null); // null = all cols, or specific status
  const [templateModal, setTemplateModal] = useState(null); // { prospecto, template }

  const cidades = ["Todos", ...new Set(prospectos.map((p) => p.cidade))];

  const filtered = prospectos.filter((p) => {
    if (filtroC !== "Todos" && p.cidade !== filtroC) return false;
    if (busca && !p.nome.toLowerCase().includes(busca.toLowerCase()) && !p.tipo.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  function updateStatus(id, status) {
    setProspectos(prospectos.map((p) => p.id === id ? { ...p, status, dataUltimoContato: todayISO() } : p));
  }
  function saveEdit(p) {
    setProspectos(prospectos.map((x) => x.id === p.id ? p : x));
    setEditing(null);
  }
  function buildWppUrl(p, template) {
    const num = digits(p.contato);
    if (!num) return null;
    const msg = (template?.corpo || "")
      .replace(/{nome}/g, p.nome)
      .replace(/{responsavel}/g, p.responsavel || p.nome)
      .replace(/{data}/g, fmtDate(todayISO()))
      .replace(/{hora}/g, "10h");
    return `https://wa.me/55${num}?text=${encMsg(msg)}`;
  }
  function enviarWpp(p, template) {
    const url = buildWppUrl(p, template);
    if (url) {
      window.open(url, "_blank");
      updateStatus(p.id, p.status === "Não contatado" ? "Contatado" : p.status);
    }
  }

  // Kanban columns
  const cols = PROSPECT_STATUS.map((s) => ({
    status: s,
    items: filtered.filter((p) => p.status === s),
    style: PROSPECT_STATUS_STYLE[s],
  }));

  return (
    <div style={{ paddingTop: 8 }}>
      {/* Busca */}
      <div style={{ position: "relative", marginBottom: 10 }}>
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar estabelecimento..." style={{ ...iStyle, paddingLeft: 32 }} />
        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: P.inkSoft, pointerEvents: "none" }}>🔍</span>
      </div>

      {/* Filtro cidade */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, scrollbarWidth: "none", marginBottom: 12 }}>
        {cidades.map((c) => (
          <button key={c} onClick={() => setFiltroC(c)} style={{ whiteSpace: "nowrap", padding: "5px 12px", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 600, background: filtroC === c ? P.wine : P.card, color: filtroC === c ? "#fff" : P.inkSoft, boxShadow: filtroC === c ? "none" : `inset 0 0 0 1px ${P.line}` }}>
            {c}
          </button>
        ))}
      </div>

      {/* Filtro coluna kanban */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, scrollbarWidth: "none", marginBottom: 14 }}>
        <button onClick={() => setKanbanCol(null)} style={{ whiteSpace: "nowrap", padding: "5px 12px", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 600, background: kanbanCol === null ? P.ink : P.card, color: kanbanCol === null ? "#fff" : P.inkSoft, boxShadow: kanbanCol === null ? "none" : `inset 0 0 0 1px ${P.line}` }}>
          Todos ({filtered.length})
        </button>
        {cols.map((col) => (
          <button key={col.status} onClick={() => setKanbanCol(col.status === kanbanCol ? null : col.status)} style={{ whiteSpace: "nowrap", padding: "5px 12px", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 600, background: kanbanCol === col.status ? col.style.color : col.style.bg, color: kanbanCol === col.status ? "#fff" : col.style.color }}>
            {col.status} ({col.items.length})
          </button>
        ))}
      </div>

      {/* Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {(kanbanCol ? filtered.filter((p) => p.status === kanbanCol) : filtered).map((p) => (
          <ProspectoCard
            key={p.id}
            p={p}
            templates={templates}
            onStatus={updateStatus}
            onEdit={() => setEditing({ ...p })}
            onWpp={(tpl) => enviarWpp(p, tpl)}
            onTemplate={() => setTemplateModal({ prospecto: p })}
            onCriarComercio={onCriarComercio}
          />
        ))}
        {filtered.length === 0 && (
          <Card style={{ textAlign: "center", color: P.inkSoft, fontSize: 13 }}>
            Nenhum resultado para esta busca.
          </Card>
        )}
      </div>

      {/* Modal de edição */}
      {editing && (
        <Modal onClose={() => setEditing(null)} title={editing.nome}>
          <Field label="Responsável / contato">
            <input style={iStyle} value={editing.responsavel || ""} onChange={(e) => setEditing({ ...editing, responsavel: e.target.value })} placeholder="Nome do dono ou gerente" />
          </Field>
          <Field label="Telefone">
            <input style={iStyle} value={editing.contato || ""} onChange={(e) => setEditing({ ...editing, contato: e.target.value })} placeholder="(12) 9xxxx-xxxx" />
          </Field>
          <Field label="Instagram (só @ sem @)">
            <input style={iStyle} value={editing.instagram || ""} onChange={(e) => setEditing({ ...editing, instagram: e.target.value })} placeholder="boom.algodaodoce" />
          </Field>
          <Field label="Observações">
            <textarea value={editing.obs || ""} onChange={(e) => setEditing({ ...editing, obs: e.target.value })} rows={3} style={{ ...iStyle, resize: "vertical" }} placeholder="Anotações sobre a prospecção..." />
          </Field>
          <Btn onClick={() => saveEdit(editing)} style={{ width: "100%", marginTop: 6 }}>Salvar</Btn>
        </Modal>
      )}

      {/* Modal de templates */}
      {templateModal && (
        <Modal onClose={() => setTemplateModal(null)} title="Escolher template">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {templates.filter((t) => t.canal === "whatsapp").map((t) => (
              <button key={t.id} onClick={() => { enviarWpp(templateModal.prospecto, t); setTemplateModal(null); }} style={{ textAlign: "left", padding: "10px 14px", borderRadius: 10, border: `1px solid ${P.line}`, background: P.bg, cursor: "pointer" }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: P.wine }}>{t.nome}</div>
                <div style={{ fontSize: 11.5, color: P.inkSoft, marginTop: 3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{t.corpo.slice(0, 100)}...</div>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

function ProspectoCard({ p, templates, onStatus, onEdit, onWpp, onTemplate, onCriarComercio }) {
  const [expanded, setExpanded] = useState(false);
  const wppTpl = templates.find((t) => t.id === "t1");
  const num = digits(p.contato);
  const instaUser = p.instagram?.replace("@", "");

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 14.5 }}>{p.nome}</span>
            {p.prioridade === "Litoral" && <Star size={11} fill={P.gold} color={P.gold} />}
            <StatusBadge status={p.status} />
          </div>
          <div style={{ fontSize: 12, color: P.inkSoft, marginTop: 3 }}>{p.tipo} · {p.cidade}</div>
          {p.endereco && <div style={{ fontSize: 11.5, color: P.inkSoft, marginTop: 2 }}>{p.endereco}</div>}
          {p.responsavel && <div style={{ fontSize: 11.5, color: P.inkSoft, marginTop: 2 }}>👤 {p.responsavel}</div>}
          {p.contato && <div style={{ fontSize: 11.5, color: P.inkSoft, marginTop: 2 }}>📞 {p.contato}</div>}
          {p.dataUltimoContato && <div style={{ fontSize: 10.5, color: P.inkSoft, marginTop: 3 }}>Último contato: {fmtDate(p.dataUltimoContato)}</div>}
          {p.obs && <div style={{ fontSize: 11.5, color: P.inkSoft, marginTop: 4, fontStyle: "italic" }}>{p.obs}</div>}
        </div>
        <button onClick={() => setExpanded(!expanded)} style={{ background: "transparent", border: "none", cursor: "pointer", color: P.inkSoft, marginLeft: 4 }}>
          <ChevronRight size={16} style={{ transform: expanded ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
        </button>
      </div>

      {/* Botões de envio */}
      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
        {num && (
          <Btn onClick={() => onTemplate()} variant="green" style={{ flex: 1, minWidth: 120, fontSize: 12 }}>
            <MessageCircle size={13} /> WhatsApp
          </Btn>
        )}
        {instaUser && (
          <a href={`https://ig.me/m/${instaUser}`} target="_blank" rel="noreferrer" style={{ flex: 1, minWidth: 100, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 14px", borderRadius: 10, background: "#E1306C", color: "#fff", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
            <Instagram size={13} /> DM Instagram
          </a>
        )}
        <Btn onClick={onEdit} variant="subtle" style={{ flex: 1, minWidth: 80, fontSize: 12 }}>
          <Edit3 size={13} /> Anotar
        </Btn>
      </div>

      {/* Painel expandido: mudar status */}
      {expanded && (
        <div style={{ marginTop: 10, borderTop: `1px solid ${P.line}`, paddingTop: 10 }}>
          <div style={{ fontSize: 11, color: P.inkSoft, marginBottom: 6 }}>Mover para:</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {PROSPECT_STATUS.map((s) => (
              <button key={s} onClick={() => onStatus(p.id, s)} style={{ fontSize: 11, padding: "5px 10px", borderRadius: 999, cursor: "pointer", border: "none", background: p.status === s ? PROSPECT_STATUS_STYLE[s].color : P.bg, color: p.status === s ? "#fff" : P.inkSoft, fontWeight: p.status === s ? 700 : 500 }}>
                {s}
              </button>
            ))}
          </div>
          {p.status === "Fechado" && !p.comercioId && (
            <Btn onClick={() => onCriarComercio(p)} style={{ width: "100%", marginTop: 8, fontSize: 12 }}>
              <ArrowRight size={13} /> Criar comércio
            </Btn>
          )}
          {p.comercioId && (
            <div style={{ fontSize: 11, color: P.ok, marginTop: 6, fontWeight: 600 }}>✓ Já convertido em comércio</div>
          )}
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────
// COMÉRCIOS TAB
// ─────────────────────────────────────────
function ComerciosTab({ comercios, setComercios, entregasCount }) {
  const empty = { nome: "", tipo: "Padaria", endereco: "", contato: "", responsavel: "", comissaoPct: 25, status: "Em negociação" };
  const [form, setForm]       = useState(empty);
  const [editId, setEditId]   = useState(null);
  const [showForm, setShowForm] = useState(false);

  function openNew() { setForm(empty); setEditId(null); setShowForm(true); }
  function openEdit(c) { setForm(c); setEditId(c.id); setShowForm(true); }
  function save() {
    if (!form.nome.trim()) return;
    setComercios(editId ? comercios.map((c) => c.id === editId ? { ...form, id: editId } : c) : [...comercios, { ...form, id: uid() }]);
    setShowForm(false);
  }
  function remove(id) { if (confirm("Remover este comércio?")) setComercios(comercios.filter((c) => c.id !== id)); }

  const sc = (s) => s === "Ativo" ? P.ok : s === "Inativo" ? P.pending : P.gold;
  const sb = (s) => s === "Ativo" ? P.okSoft : s === "Inativo" ? P.pendingSoft : P.goldSoft;

  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: P.inkSoft }}>{comercios.length} comércio(s)</div>
        <Btn onClick={openNew}><Plus size={14} /> Novo</Btn>
      </div>

      {comercios.length === 0 && <Card style={{ textAlign: "center", color: P.inkSoft, fontSize: 13 }}>Nenhum comércio ainda. Toque em "Novo" para cadastrar.</Card>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {comercios.map((c) => (
          <Card key={c.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{c.nome}</div>
                <div style={{ fontSize: 12.5, color: P.inkSoft, marginTop: 2 }}>{c.tipo} · comissão {c.comissaoPct}%</div>
                {c.endereco && <div style={{ fontSize: 12, color: P.inkSoft, marginTop: 2 }}>{c.endereco}</div>}
                {c.responsavel && <div style={{ fontSize: 12, color: P.inkSoft }}>Responsável: {c.responsavel}{c.contato ? ` · ${c.contato}` : ""}</div>}
                <div style={{ fontSize: 11.5, color: P.inkSoft, marginTop: 4 }}>{entregasCount(c.id)} lançamento(s)</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: sb(c.status), color: sc(c.status), whiteSpace: "nowrap" }}>{c.status}</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <Btn variant="subtle" onClick={() => openEdit(c)} style={{ flex: 1 }}><Edit3 size={13} /> Editar</Btn>
              {c.contato && (
                <a href={`https://wa.me/55${digits(c.contato)}`} target="_blank" rel="noreferrer" style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 14px", borderRadius: 10, background: "#25D366", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                  <MessageCircle size={13} /> WhatsApp
                </a>
              )}
              <Btn variant="ghost" onClick={() => remove(c.id)} style={{ padding: "9px 12px" }}><Trash2 size={13} /></Btn>
            </div>
          </Card>
        ))}
      </div>

      {showForm && (
        <Modal onClose={() => setShowForm(false)} title={editId ? "Editar comércio" : "Novo comércio"}>
          <Field label="Nome do estabelecimento *"><input style={iStyle} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Field>
          <Field label="Tipo">
            <select style={iStyle} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              {TIPO_OPTIONS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select style={iStyle} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Endereço"><input style={iStyle} value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} /></Field>
          <Field label="Responsável"><input style={iStyle} value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} /></Field>
          <Field label="Contato (telefone)"><input style={iStyle} value={form.contato} onChange={(e) => setForm({ ...form, contato: e.target.value })} /></Field>
          <Field label="Comissão (%)">
            <input type="number" style={iStyle} value={form.comissaoPct} min={0} max={100} onChange={(e) => setForm({ ...form, comissaoPct: Number(e.target.value) })} />
          </Field>
          <Btn onClick={save} style={{ width: "100%", marginTop: 6 }}>Salvar</Btn>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// LANÇAMENTOS TAB
// ─────────────────────────────────────────
function EntregasTab({ comercios, entregas, setEntregas, lastEstoqueRestante }) {
  const emptyForm = { comercioId: "", data: todayISO(), qtdReposta: "", qtdVendida: "", qtdRecolhida: 0, preco: 4.5, estoqueAnterior: "", recebidoPor: "", obs: "", status: "Pendente" };
  const [form, setForm]         = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [reciboEnt, setReciboEnt] = useState(null);
  const [filtroC, setFiltroC]   = useState("Todos");

  function openNew(comercioId = "") {
    const est = comercioId ? lastEstoqueRestante(comercioId) : 0;
    setForm({ ...emptyForm, comercioId, estoqueAnterior: est });
    setShowForm(true);
  }
  function save() {
    if (!form.comercioId || form.qtdReposta === "") return;
    setEntregas([...entregas, { ...form, id: uid() }]);
    setShowForm(false);
  }
  function remove(id) { if (confirm("Remover lançamento?")) setEntregas(entregas.filter((e) => e.id !== id)); }
  function marcarPago(id) { setEntregas(entregas.map((e) => e.id === id ? { ...e, status: "Pago" } : e)); }

  const filtered = filtroC === "Todos" ? entregas : entregas.filter((e) => e.comercioId === filtroC);
  const sorted = [...filtered].sort((a, b) => b.data.localeCompare(a.data));
  const getComercio = (id) => comercios.find((c) => c.id === id);

  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 13, color: P.inkSoft }}>{filtered.length} lançamento(s)</div>
        <Btn onClick={() => openNew()}><Plus size={14} /> Novo</Btn>
      </div>

      {/* Filtro comércio */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, scrollbarWidth: "none", marginBottom: 12 }}>
        {["Todos", ...comercios.map((c) => c.id)].map((id) => {
          const label = id === "Todos" ? "Todos" : comercios.find((c) => c.id === id)?.nome;
          return (
            <button key={id} onClick={() => setFiltroC(id)} style={{ whiteSpace: "nowrap", padding: "5px 12px", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 600, background: filtroC === id ? P.wine : P.card, color: filtroC === id ? "#fff" : P.inkSoft, boxShadow: filtroC === id ? "none" : `inset 0 0 0 1px ${P.line}` }}>
              {label}
            </button>
          );
        })}
      </div>

      {sorted.length === 0 && <Card style={{ textAlign: "center", color: P.inkSoft, fontSize: 13 }}>Nenhum lançamento ainda.</Card>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sorted.map((e) => {
          const c = getComercio(e.comercioId);
          const estRest = Number(e.estoqueAnterior || 0) + Number(e.qtdReposta || 0) - Number(e.qtdVendida || 0) - Number(e.qtdRecolhida || 0);
          const val = Number(e.qtdVendida || 0) * Number(e.preco || 0);
          const pago = e.status === "Pago";
          return (
            <Card key={e.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{c?.nome || "Comércio removido"}</div>
                  <div style={{ fontSize: 12, color: P.inkSoft }}>{fmtDate(e.data)}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: pago ? P.okSoft : P.goldSoft, color: pago ? P.ok : P.gold }}>{e.status}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 10 }}>
                <MiniStat label="Reposto" value={`${e.qtdReposta} un.`} />
                <MiniStat label="Vendido" value={`${e.qtdVendida} un.`} />
                <MiniStat label="Estoque" value={`${estRest} un.`} color={estRest <= 5 ? P.pending : P.ok} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: P.wine, marginTop: 8 }}>{brl(val)}</div>
              {e.obs && <div style={{ fontSize: 11.5, color: P.inkSoft, marginTop: 4, fontStyle: "italic" }}>{e.obs}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <Btn onClick={() => setReciboEnt(e)} variant="subtle" style={{ flex: 1 }}><Receipt size={13} /> Recibo</Btn>
                {!pago && <Btn onClick={() => marcarPago(e.id)} variant="green" style={{ flex: 1 }}><Check size={13} /> Marcar pago</Btn>}
                <Btn variant="ghost" onClick={() => remove(e.id)} style={{ padding: "9px 12px" }}><Trash2 size={13} /></Btn>
              </div>
            </Card>
          );
        })}
      </div>

      {showForm && (
        <Modal onClose={() => setShowForm(false)} title="Novo lançamento">
          <Field label="Comércio *">
            <select style={iStyle} value={form.comercioId} onChange={(e) => {
              const id = e.target.value;
              setForm({ ...form, comercioId: id, estoqueAnterior: id ? lastEstoqueRestante(id) : 0 });
            }}>
              <option value="">Selecione...</option>
              {comercios.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Field>
          <Field label="Data"><input type="date" style={iStyle} value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></Field>
          <Field label="Estoque anterior (calculado)"><input type="number" style={iStyle} value={form.estoqueAnterior} onChange={(e) => setForm({ ...form, estoqueAnterior: Number(e.target.value) })} /></Field>
          <Field label="Qtd. reposta agora *"><input type="number" style={iStyle} value={form.qtdReposta} onChange={(e) => setForm({ ...form, qtdReposta: Number(e.target.value) })} /></Field>
          <Field label="Qtd. vendida desde última visita"><input type="number" style={iStyle} value={form.qtdVendida} onChange={(e) => setForm({ ...form, qtdVendida: Number(e.target.value) })} /></Field>
          <Field label="Qtd. recolhida agora"><input type="number" style={iStyle} value={form.qtdRecolhida} onChange={(e) => setForm({ ...form, qtdRecolhida: Number(e.target.value) })} /></Field>
          <Field label="Preço por pote (R$)"><input type="number" step="0.5" style={iStyle} value={form.preco} onChange={(e) => setForm({ ...form, preco: Number(e.target.value) })} /></Field>
          <Field label="Recebido por"><input style={iStyle} value={form.recebidoPor} onChange={(e) => setForm({ ...form, recebidoPor: e.target.value })} placeholder="Nome de quem assinou" /></Field>
          <Field label="Observações"><textarea style={{ ...iStyle, resize: "vertical" }} rows={2} value={form.obs} onChange={(e) => setForm({ ...form, obs: e.target.value })} /></Field>
          <Btn onClick={save} style={{ width: "100%", marginTop: 6 }}>Salvar lançamento</Btn>
        </Modal>
      )}

      {reciboEnt && (
        <ReciboModal entrega={reciboEnt} comercio={getComercio(reciboEnt.comercioId)} onClose={() => setReciboEnt(null)} />
      )}
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div style={{ background: P.bg, borderRadius: 8, padding: "6px 8px", textAlign: "center" }}>
      <div style={{ fontSize: 10, color: P.inkSoft }}>{label}</div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: color || P.ink, marginTop: 2 }}>{value}</div>
    </div>
  );
}

// ─────────────────────────────────────────
// ROTEIRO TAB
// ─────────────────────────────────────────
function RoteiroTab({ comercios, entregas }) {
  const hoje = todayISO();

  // Para cada comércio ativo, calcular estado atual
  const paradas = comercios
    .filter((c) => c.status === "Ativo")
    .map((c) => {
      const lista = entregas.filter((e) => e.comercioId === c.id).sort((a, b) => a.data > b.data ? 1 : -1);
      const last = lista[lista.length - 1];
      const estoqueAtual = last
        ? Number(last.estoqueAnterior || 0) + Number(last.qtdReposta || 0) - Number(last.qtdVendida || 0) - Number(last.qtdRecolhida || 0)
        : 0;
      const qtdReposta = last ? Number(last.qtdReposta || 0) : 0;
      const qtdVendida = last ? Number(last.qtdVendida || 0) : 0;
      const taxaVenda = qtdReposta > 0 ? (qtdVendida / qtdReposta) * 100 : 0;
      const pendentePagamento = lista.some((e) => e.status !== "Pago");
      const ultimaVisita = last?.data || null;

      // Critérios para incluir no roteiro:
      const precisaVisita = estoqueAtual <= 5 || taxaVenda >= 70 || pendentePagamento || !ultimaVisita;

      // Bairro: extrair da parte após " - " no endereço
      const bairro = c.endereco?.split(" - ")[1]?.split(",")[0] || c.cidade || "Sem bairro";

      return { ...c, estoqueAtual, taxaVenda: Math.round(taxaVenda), pendentePagamento, ultimaVisita, precisaVisita, bairro };
    })
    .filter((p) => p.precisaVisita);

  // Agrupar por bairro
  const grupos = paradas.reduce((acc, p) => {
    (acc[p.bairro] = acc[p.bairro] || []).push(p);
    return acc;
  }, {});

  const totalParadas = paradas.length;

  function buildMapsUrl(enderecos) {
    const base = "https://www.google.com/maps/dir/";
    return base + enderecos.map((e) => encodeURIComponent(e)).join("/");
  }

  return (
    <div style={{ paddingTop: 8 }}>
      <Card style={{ marginBottom: 14, background: P.wineSoft, borderColor: P.wine }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Navigation size={18} color={P.wine} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: P.wine }}>Roteiro otimizado de hoje</div>
            <div style={{ fontSize: 12, color: P.inkSoft, marginTop: 2 }}>{totalParadas} ponto(s) que precisam de visita · {Object.keys(grupos).length} bairro(s)</div>
          </div>
        </div>
      </Card>

      {totalParadas === 0 && (
        <Card style={{ textAlign: "center", color: P.inkSoft, fontSize: 13 }}>
          <Check size={20} color={P.ok} style={{ marginBottom: 6 }} />
          <div>Nenhuma visita urgente hoje! Todos os pontos estão com estoque e pagamentos em dia.</div>
        </Card>
      )}

      {Object.entries(grupos).map(([bairro, pontos]) => (
        <div key={bairro} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, color: P.wine }}>📍 {bairro}</div>
            {pontos[0]?.endereco && (
              <a
                href={buildMapsUrl(pontos.map((p) => p.endereco + ", " + p.cidade + " SP"))}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 11, color: P.wine, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}
              >
                <Navigation size={11} /> Maps
              </a>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pontos.map((p, i) => (
              <Card key={p.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{i + 1}. {p.nome}</div>
                    {p.endereco && <div style={{ fontSize: 11.5, color: P.inkSoft, marginTop: 2 }}>{p.endereco}</div>}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                      {p.estoqueAtual <= 5 && (
                        <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: P.pendingSoft, color: P.pending }}>
                          ⚠️ Estoque: {p.estoqueAtual} un.
                        </span>
                      )}
                      {p.taxaVenda >= 70 && (
                        <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: P.goldSoft, color: P.gold }}>
                          🔥 Venda: {p.taxaVenda}%
                        </span>
                      )}
                      {p.pendentePagamento && (
                        <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: P.wineSoft, color: P.wine }}>
                          💰 Cobrança pendente
                        </span>
                      )}
                      {!p.ultimaVisita && (
                        <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: P.line, color: P.inkSoft }}>
                          🆕 Primeira visita
                        </span>
                      )}
                    </div>
                    {p.ultimaVisita && <div style={{ fontSize: 10.5, color: P.inkSoft, marginTop: 4 }}>Última visita: {fmtDate(p.ultimaVisita)}</div>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  {p.contato && (
                    <a
                      href={`https://wa.me/55${digits(p.contato)}?text=${encMsg(`Oi ${p.responsavel || ""}! Estou passando aí em ${p.nome} hoje para reabastecer o algodão doce. Pode me aguardar? 😊`)}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px", borderRadius: 10, background: "#25D366", color: "#fff", fontSize: 12, fontWeight: 600, textDecoration: "none" }}
                    >
                      <MessageCircle size={13} /> Avisar chegada
                    </a>
                  )}
                  {p.endereco && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.endereco + ", " + p.cidade)}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px", borderRadius: 10, background: P.goldSoft, color: P.gold, fontSize: 12, fontWeight: 600, textDecoration: "none" }}
                    >
                      <Navigation size={13} /> Ver no Maps
                    </a>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────
// TEMPLATES TAB
// ─────────────────────────────────────────
function TemplatesTab({ templates, setTemplates }) {
  const [editing, setEditing] = useState(null);
  const [copied, setCopied]   = useState(null);

  function save(t) {
    setTemplates(templates.map((x) => x.id === t.id ? t : x));
    setEditing(null);
  }

  function copyText(t) {
    const texto = t.corpo.replace(/{nome}/g, "Cliente").replace(/{responsavel}/g, "Responsável").replace(/{data}/g, fmtDate(todayISO())).replace(/{hora}/g, "10h");
    navigator.clipboard?.writeText(texto).catch(() => {});
    setCopied(t.id);
    setTimeout(() => setCopied(null), 1500);
  }

  const canalIcon = (c) => c === "whatsapp" ? "💬" : c === "email" ? "📧" : "📱";
  const canalLabel = (c) => c === "whatsapp" ? "WhatsApp" : c === "email" ? "E-mail" : "Instagram";

  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ fontSize: 12.5, color: P.inkSoft, marginBottom: 14 }}>
        Use as variáveis <strong>{"{nome}"}</strong>, <strong>{"{responsavel}"}</strong>, <strong>{"{data}"}</strong> e <strong>{"{hora}"}</strong> para personalizar automaticamente.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {templates.map((t) => (
          <Card key={t.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{t.nome}</div>
                <div style={{ fontSize: 11.5, color: P.inkSoft, marginTop: 2 }}>{canalIcon(t.canal)} {canalLabel(t.canal)}</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <Btn variant="subtle" onClick={() => copyText(t)} style={{ padding: "6px 10px", fontSize: 12 }}>
                  <Copy size={12} /> {copied === t.id ? "Copiado!" : "Copiar"}
                </Btn>
                <Btn variant="ghost" onClick={() => setEditing({ ...t })} style={{ padding: "6px 10px", fontSize: 12 }}>
                  <Edit3 size={12} />
                </Btn>
              </div>
            </div>
            <div style={{ fontSize: 12, color: P.inkSoft, background: P.bg, borderRadius: 8, padding: "8px 10px", whiteSpace: "pre-wrap", lineHeight: 1.5, maxHeight: 80, overflow: "hidden", position: "relative" }}>
              {t.corpo}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 24, background: "linear-gradient(transparent, #FBF6F2)" }} />
            </div>
          </Card>
        ))}
      </div>

      {editing && (
        <Modal onClose={() => setEditing(null)} title={editing.nome}>
          <Field label="Nome do template">
            <input style={iStyle} value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} />
          </Field>
          <Field label="Canal">
            <select style={iStyle} value={editing.canal} onChange={(e) => setEditing({ ...editing, canal: e.target.value })}>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">E-mail</option>
              <option value="instagram">Instagram</option>
            </select>
          </Field>
          <Field label="Texto da mensagem">
            <textarea style={{ ...iStyle, resize: "vertical" }} rows={8} value={editing.corpo} onChange={(e) => setEditing({ ...editing, corpo: e.target.value })} />
          </Field>
          <div style={{ fontSize: 11.5, color: P.inkSoft, marginBottom: 10 }}>
            Variáveis disponíveis: {"{nome}"} · {"{responsavel}"} · {"{data}"} · {"{hora}"}
          </div>
          <Btn onClick={() => save(editing)} style={{ width: "100%" }}>Salvar template</Btn>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// RESUMO TAB
// ─────────────────────────────────────────
function ResumoTab({ resumo, totalGeral }) {
  const [sort, setSort] = useState("valorVendido");
  const sorted = [...resumo].sort((a, b) => b[sort] - a[sort]);

  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
        <Card style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, color: P.inkSoft }}>Valor vendido</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: P.wine }}>{brl(totalGeral.valorVendido)}</div>
        </Card>
        <Card style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, color: P.inkSoft }}>A receber</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: P.ok }}>{brl(totalGeral.aReceber)}</div>
        </Card>
        <Card style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, color: P.inkSoft }}>Pendente</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: P.pending }}>{brl(totalGeral.pendente)}</div>
        </Card>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {[["valorVendido","Vendido"],["aReceber","A receber"],["estoqueAtual","Estoque"]].map(([k, l]) => (
          <button key={k} onClick={() => setSort(k)} style={{ flex: 1, padding: "6px 0", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 600, background: sort === k ? P.wine : P.card, color: sort === k ? "#fff" : P.inkSoft, boxShadow: sort === k ? "none" : `inset 0 0 0 1px ${P.line}` }}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sorted.map((r) => (
          <Card key={r.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{r.nome}</div>
                <div style={{ fontSize: 12, color: P.inkSoft }}>{r.tipo} · {r.visitas} visita(s)</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: P.wine }}>{brl(r.valorVendido)}</div>
                <div style={{ fontSize: 11, color: P.inkSoft }}>vendido</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              <MiniStat label="A receber" value={brl(r.aReceber)} color={P.ok} />
              <MiniStat label="Comissão" value={brl(r.valorComissao)} />
              <MiniStat label="Estoque" value={`${r.estoqueAtual} un.`} color={r.estoqueAtual <= 5 ? P.pending : P.ok} />
            </div>
            {r.pendente > 0 && (
              <div style={{ fontSize: 11.5, color: P.pending, marginTop: 8, fontWeight: 600 }}>
                ⚠️ {brl(r.pendente)} pendente de recebimento
              </div>
            )}
          </Card>
        ))}
        {resumo.length === 0 && (
          <Card style={{ textAlign: "center", color: P.inkSoft, fontSize: 13 }}>
            Nenhum comércio com lançamentos ainda.
          </Card>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// RECIBO MODAL
// ─────────────────────────────────────────
function ReciboModal({ entrega, comercio, onClose }) {
  const reciboRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState("");

  const estoqueRestante =
    Number(entrega.estoqueAnterior || 0) + Number(entrega.qtdReposta || 0) -
    Number(entrega.qtdVendida || 0) - Number(entrega.qtdRecolhida || 0);
  const valorVendido = Number(entrega.qtdVendida || 0) * Number(entrega.preco || 0);
  const numRecibo = `${(entrega.data || "").replaceAll("-", "")}-${entrega.id?.slice(0, 5)}`;

  async function gerarBlob() {
    const canvas = await html2canvas(reciboRef.current, { scale: 3, backgroundColor: "#FFFFFF" });
    return new Promise((res) => canvas.toBlob((b) => res(b), "image/png"));
  }
  async function compartilhar() {
    setBusy(true); setErr("");
    try {
      const blob = await gerarBlob();
      const file = new File([blob], `recibo-${numRecibo}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Recibo Boom Algodão Doce" });
      } else {
        baixar(blob);
        wppTexto();
      }
    } catch (e) {
      if (e?.name !== "AbortError") setErr("Não foi possível compartilhar. Use 'Baixar imagem' e envie manualmente.");
    } finally {
      setBusy(false);
    }
  }
  function baixar(blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `recibo-${numRecibo}.png`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }
  async function baixarImagem() {
    setBusy(true);
    try { const b = await gerarBlob(); baixar(b); }
    finally { setBusy(false); }
  }
  function wppTexto() {
    const linhas = [
      `*Recibo Boom Algodão Doce* #${numRecibo}`,
      `Comércio: ${comercio?.nome || "-"}`,
      `Data: ${fmtDate(entrega.data)}`,
      `Estoque anterior: ${entrega.estoqueAnterior} un.`,
      `Reposto: ${entrega.qtdReposta} un.`,
      `Vendido: ${entrega.qtdVendida} un.`,
      `Recolhido: ${entrega.qtdRecolhida || 0} un.`,
      `Estoque atual: ${estoqueRestante} un.`,
      `Valor vendido: ${brl(valorVendido)}`,
    ].join("\n");
    const num = digits(comercio?.contato || "");
    window.open(`${num ? `https://wa.me/55${num}` : "https://wa.me/"}?text=${encMsg(linhas)}`, "_blank");
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(44,36,34,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 60 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: P.bg, width: "100%", maxWidth: 720, borderRadius: "18px 18px 0 0", padding: 18, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 -8px 30px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: P.wine, display: "flex", alignItems: "center", gap: 8 }}><Receipt size={18} /> Recibo</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: P.inkSoft }}><X size={20} /></button>
        </div>

        {/* Recibo imprimível */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <div ref={reciboRef} style={{ width: 360, background: "#FFFFFF", borderRadius: 10, border: `1px solid ${P.line}`, padding: 20, fontFamily: "'Segoe UI', system-ui, sans-serif", color: P.ink }}>
            <div style={{ textAlign: "center", marginBottom: 10 }}>
              <div style={{ fontFamily: "Georgia, serif", fontWeight: 800, fontSize: 20, color: P.wine }}>BOOM! Algodão Doce</div>
              <div style={{ fontSize: 10, color: P.inkSoft }}>S&B Soluções Integradas · Caraguatatuba/SP</div>
              <div style={{ fontSize: 10, color: P.inkSoft }}>WhatsApp (12) 99606-3582</div>
            </div>
            <div style={{ borderTop: `1px dashed ${P.line}`, borderBottom: `1px dashed ${P.line}`, padding: "8px 0", margin: "8px 0" }}>
              <div style={{ fontSize: 10.5, color: P.inkSoft }}>Recibo nº {numRecibo}</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{comercio?.nome || "Comércio"}</div>
              {comercio?.endereco && <div style={{ fontSize: 10.5, color: P.inkSoft }}>{comercio.endereco}</div>}
              <div style={{ fontSize: 10.5, color: P.inkSoft }}>Data: {fmtDate(entrega.data)}</div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <tbody>
                {[
                  ["Estoque anterior", `${entrega.estoqueAnterior} un.`, false],
                  ["Reposto nesta visita", `${entrega.qtdReposta} un.`, true],
                  ["Vendido desde última visita", `${entrega.qtdVendida} un.`, false],
                  ["Recolhido nesta visita", `${entrega.qtdRecolhida || 0} un.`, false],
                  ["Estoque atual no ponto", `${estoqueRestante} un.`, true],
                ].map(([l, v, b]) => (
                  <tr key={l}>
                    <td style={{ padding: "3px 0", color: b ? P.ink : P.inkSoft, fontWeight: b ? 700 : 400 }}>{l}</td>
                    <td style={{ padding: "3px 0", textAlign: "right", fontWeight: b ? 700 : 400 }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ borderTop: `1px dashed ${P.line}`, marginTop: 10, paddingTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span>Valor vendido</span><span style={{ fontWeight: 700 }}>{brl(valorVendido)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: P.inkSoft, marginTop: 2 }}>
                <span>Status</span><span>{entrega.status}</span>
              </div>
            </div>
            {entrega.recebidoPor && <div style={{ marginTop: 10, fontSize: 11 }}>Recebido por: <strong>{entrega.recebidoPor}</strong></div>}
            {entrega.obs && <div style={{ marginTop: 4, fontSize: 10.5, color: P.inkSoft, fontStyle: "italic" }}>{entrega.obs}</div>}
            <div style={{ textAlign: "center", fontSize: 9, color: P.inkSoft, marginTop: 12 }}>Documento de controle interno de consignação — não é nota fiscal.</div>
          </div>
        </div>

        {err && <div style={{ background: P.pendingSoft, color: P.pending, borderRadius: 10, padding: "8px 12px", fontSize: 12.5, marginBottom: 10 }}>{err}</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Btn onClick={compartilhar} style={{ width: "100%" }}><Share2 size={14} /> {busy ? "Preparando..." : "Compartilhar (WhatsApp / outros)"}</Btn>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="subtle" onClick={wppTexto} style={{ flex: 1 }}><MessageCircle size={13} /> WPP texto</Btn>
            <Btn variant="ghost" onClick={baixarImagem} style={{ flex: 1 }}><Download size={13} /> Baixar</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
