import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Store, Package, BarChart3, Plus, Trash2, Check, Clock, X, Receipt, Share2, Download, MessageCircle,
  LayoutDashboard, Target, Search, Phone, MapPin, ArrowRight, Star, TrendingUp, Users, Loader2, RefreshCw,
  ChevronRight, Wallet,
} from "lucide-react";
import html2canvas from "html2canvas";
import { supabase, SUPABASE_CONFIGURED } from "./supabaseClient";

// ---------- helpers ----------
const uid = () => Math.random().toString(36).slice(2, 10);
const brl = (n) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

// ---------- persistence ----------
// Fonte principal: Supabase (banco compartilhado — todo mundo que abre o app
// vê os mesmos dados). Reserva: localStorage do navegador, usado se o
// Supabase não estiver configurado ou o aparelho estiver offline.
function loadLocal(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function saveLocal(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

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

const STATUS_OPTIONS = ["Ativo", "Em negociação", "Inativo"];
const TIPO_OPTIONS = ["Padaria", "Mercadinho", "Café", "Loja de conveniência", "Outro"];
const PROSPECT_STATUS = ["Não contatado", "Contatado", "Visitado", "Fechado", "Recusou"];
const PROSPECT_STATUS_COLOR = {
  "Não contatado": "inkSoft",
  "Contatado": "gold",
  "Visitado": "wine",
  "Fechado": "ok",
  "Recusou": "pending",
};

// Lista inicial de prospecção — levantamento de padarias/mercadinhos priorizando o litoral.
// Carregada automaticamente na primeira vez que o app abre (sem prospectos salvos ainda).
const SEED_PROSPECTOS = [
["Caraguatatuba","Litoral","Esquina do Pão","Padaria","Av. Piauí, 500 - Jardim Primavera","(12) 3882-3792",4.5],
["Caraguatatuba","Litoral","Padaria Pão Vitória","Padaria","R. Sebastião Mariano Nepomuceno, 340 - Centro","(12) 3881-1724",4.6],
["Caraguatatuba","Litoral","Padaria Esquina do Indaiá","Padaria","Av. Rio Branco, 709 - Indaiá","(12) 98838-9970",4.4],
["Caraguatatuba","Litoral","Padaria Estrela de Caraguá","Padaria","Av. Marginal Direita, 52 - Poiares","(12) 98109-7889",4.2],
["Caraguatatuba","Litoral","Padaria Pão D'Ouro","Padaria","Av. Guilherme de Almeida, 901 - Morro do Algodão","(12) 99160-5840",4.5],
["Caraguatatuba","Litoral","Padaria Bruno Confeiteiro","Padaria","Av. Domingos Martins Cabrera, 947 - Balneário dos Golfinhos","(12) 2103-9676",4.6],
["Caraguatatuba","Litoral","Padaria Lobo","Padaria","Av. Mal. Floriano Peixoto, 260 - Poiares","(12) 3888-1810",4.5],
["Caraguatatuba","Litoral","Monalisas Padaria, Empório e Restaurante","Padaria/Empório","Av. Geraldo Nogueira da Silva, 500 - Indaiá","(12) 98829-1139",3.3],
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
// --- Novos: comércios próximos (até 500m) de escolas de Caraguatatuba ---
["Caraguatatuba","Litoral","Padaria Martim de Sá","Padaria","Martim de Sá","(12) 3883-5256",3.8],
["Caraguatatuba","Litoral","Padaria Caraguatá","Padaria","R. Antônio Henrique de Mesquita, 80 - Jardim Casa Branca","(12) 98857-5883",4.9],
["Caraguatatuba","Litoral","Laticínios Litoral Norte","Mercadinho","Av. Pres. Castelo Branco - Martim de Sá","(12) 3897-2717",4.2],
["Caraguatatuba","Litoral","Padaria Shopping do Pão","Padaria","R. Benedita Mendes de Souza - Tingá","(12) 3881-4142",4.4],
["Caraguatatuba","Litoral","Padaria Trigo Real","Padaria","Av. Rio Grande do Norte, 1200 - Indaiá","(12) 99138-5230",4.6],
["Caraguatatuba","Litoral","Mercearia Beija Flor","Mercadinho","Av. Garça, 140 - Jardim Gaivotas","",4.5],
["Caraguatatuba","Litoral","Bar e Mercearia do Toninho","Mercadinho","Avenida Cardeal, 442 - Jardim Gaivotas","(12) 3888-2470",4.3],
["Caraguatatuba","Litoral","Supermercado Donato","Mercadinho","Av. Mal. Deodoro da Fonseca, 981 - Tingá","(12) 3883-7942",3.8],
["Caraguatatuba","Litoral","Padaria Santo Pão","Padaria","R. João Marcello, 285 - Estrela D'Alva","(12) 3883-2329",4.5],
["Caraguatatuba","Litoral","Esquina do Barranco","Padaria","Av. Cândida de Souza - Barranco Alto","(12) 99242-4141",4.3],
["Caraguatatuba","Litoral","Padaria Tida","Padaria","Al. Maranhão, 589 - Porto Novo","(12) 99623-8308",3.8],
["Caraguatatuba","Litoral","Casa dos Pães","Padaria","Rua Lagoinha, 12 - Travessão","(12) 99734-1920",4.7],
["Caraguatatuba","Litoral","Bar e Mercearia Diniz","Mercadinho","Al. Antônio Luís G. Câmara Coutinho - Porto Novo","",4.3],
["Caraguatatuba","Litoral","Supermercado Pereque","Mercadinho","Av. José Herculano, 270 - Travessão","(12) 99617-7231",4.3],
["Caraguatatuba","Litoral","Mercadinho Esteve","Mercadinho","Av. José da Costa Pinheiro Júnior, 383 - Jaraguá","",4.2],
["Caraguatatuba","Litoral","Padaria Vitória (Rio do Ouro)","Padaria","Rio do Ouro","",4.0],
["Caraguatatuba","Litoral","Padaria Nova Massaguaçu","Padaria","R. Irma Lucília - Massaguaçu","(12) 3884-5472",4.3],
["Caraguatatuba","Litoral","Confeitaria Mil Folhas","Padaria","R. Pesc. Manoel Marcondes Sodré, 29 - Massaguaçu","(12) 3884-8898",4.3],
["Caraguatatuba","Litoral","Padaria Rocha","Padaria","R. Itália Baffi Magni - Massaguaçu","(12) 97410-6739",4.0],
["Caraguatatuba","Litoral","Padaria do Carmo","Padaria","Av. Arthur Costa Filho, 1821 - Centro","(12) 98274-3333",4.2],
["Caraguatatuba","Litoral","ONO - Peixaria e Produtos Orientais","Mercadinho","Av. Dr. Arthur da Costa Filho, 1999 - Sumaré","(12) 3881-1181",4.6],
["Caraguatatuba","Litoral","Supermarket Canto Bravo","Mercadinho","R. Professora Adali Coelho Passos, 690 - Prainha","(12) 3882-5265",4.2],
].map(([cidade, prioridade, nome, tipo, endereco, contato, avaliacao]) => ({
  id: uid(), cidade, prioridade, nome, tipo, endereco, contato, avaliacao,
  status: "Não contatado", dataUltimoContato: "", motivo: "", obs: "", comercioId: null,
}));

const PALETTE = {
  bg: "#FBF6F2",
  card: "#FFFFFF",
  ink: "#2C2422",
  inkSoft: "#7A6E68",
  line: "#EDE2DA",
  lineSoft: "#F1E6DE",
  wine: "#8E2A4B",
  wineSoft: "#F4E4EA",
  gold: "#B98A3E",
  goldSoft: "#F6ECD9",
  ok: "#2F7A4D",
  okSoft: "#E5F3EA",
  pending: "#B4552F",
  pendingSoft: "#FBEAE0",
};

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [offline, setOffline] = useState(false);
  const [comercios, setComercios] = useState([]);
  const [entregas, setEntregas] = useState([]);
  const [prospectos, setProspectos] = useState([]);
  const [metaVisitas, setMetaVisitas] = useState(5);
  const [tab, setTab] = useState("painel");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    (async () => {
      if (!SUPABASE_CONFIGURED) {
        setOffline(true);
        setComercios(loadLocal("comercios", []));
        setEntregas(loadLocal("entregas", []));
        setProspectos(loadLocal("prospectos", SEED_PROSPECTOS));
        setMetaVisitas(loadLocal("metaVisitasSemanais", 5));
        setLoaded(true);
        return;
      }
      try {
        const [c, e, p] = await Promise.all([fetchTable("comercios"), fetchTable("entregas"), fetchTable("prospectos")]);
        const { data: settingsRow } = await supabase.from("settings").select("value").eq("key", "metaVisitas").maybeSingle();
        setComercios(c);
        setEntregas(e);
        if (p.length > 0) {
          setProspectos(p);
        } else {
          // primeiro uso: semeia a lista inicial de prospecção no banco
          await syncTable("prospectos", [], SEED_PROSPECTOS);
          setProspectos(SEED_PROSPECTOS);
        }
        setMetaVisitas(settingsRow?.value ?? 5);
        saveLocal("comercios", c);
        saveLocal("entregas", e);
        saveLocal("prospectos", p.length > 0 ? p : SEED_PROSPECTOS);
        saveLocal("metaVisitasSemanais", settingsRow?.value ?? 5);
      } catch {
        setOffline(true);
        setComercios(loadLocal("comercios", []));
        setEntregas(loadLocal("entregas", []));
        setProspectos(loadLocal("prospectos", SEED_PROSPECTOS));
        setMetaVisitas(loadLocal("metaVisitasSemanais", 5));
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  async function recarregar() {
    if (!SUPABASE_CONFIGURED) return;
    setLoaded(false);
    try {
      const [c, e, p] = await Promise.all([fetchTable("comercios"), fetchTable("entregas"), fetchTable("prospectos")]);
      const { data: settingsRow } = await supabase.from("settings").select("value").eq("key", "metaVisitas").maybeSingle();
      setComercios(c);
      setEntregas(e);
      setProspectos(p);
      setMetaVisitas(settingsRow?.value ?? 5);
      setOffline(false);
      setSaveError("");
    } catch {
      setSaveError("Não foi possível atualizar do servidor agora. Verifique sua internet.");
    } finally {
      setLoaded(true);
    }
  }

  async function updateComercios(next) {
    const prev = comercios;
    setComercios(next);
    saveLocal("comercios", next);
    if (!SUPABASE_CONFIGURED) return;
    try {
      await syncTable("comercios", prev, next);
      setSaveError("");
    } catch {
      setSaveError("Não sincronizou com o servidor — os dados continuam salvos neste aparelho, tente novamente com internet.");
    }
  }
  async function updateEntregas(next) {
    const prev = entregas;
    setEntregas(next);
    saveLocal("entregas", next);
    if (!SUPABASE_CONFIGURED) return;
    try {
      await syncTable("entregas", prev, next);
      setSaveError("");
    } catch {
      setSaveError("Não sincronizou com o servidor — os dados continuam salvos neste aparelho, tente novamente com internet.");
    }
  }
  async function updateProspectos(next) {
    const prev = prospectos;
    setProspectos(next);
    saveLocal("prospectos", next);
    if (!SUPABASE_CONFIGURED) return;
    try {
      await syncTable("prospectos", prev, next);
      setSaveError("");
    } catch {
      setSaveError("Não sincronizou com o servidor — os dados continuam salvos neste aparelho, tente novamente com internet.");
    }
  }
  async function updateMetaVisitas(next) {
    setMetaVisitas(next);
    saveLocal("metaVisitasSemanais", next);
    if (!SUPABASE_CONFIGURED) return;
    try {
      await supabase.from("settings").upsert({ key: "metaVisitas", value: next });
    } catch {
      /* silencioso — não é crítico */
    }
  }

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
    updateComercios([...comercios, novoComercio]);
    updateProspectos(prospectos.map((p) => (p.id === prospecto.id ? { ...p, comercioId: novoComercio.id } : p)));
    setTab("comercios");
  }

  return (
    <div style={{ minHeight: "100vh", background: PALETTE.bg, fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", color: PALETTE.ink, paddingBottom: "calc(90px + env(safe-area-inset-bottom))" }}>
      <Header offline={offline} onRefresh={recarregar} configured={SUPABASE_CONFIGURED} />
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
        {tab === "painel" && (
          <PainelTab
            prospectos={prospectos}
            comercios={comercios}
            resumo={resumo}
            totalGeral={totalGeral}
            entregas={entregas}
            metaVisitas={metaVisitas}
            setMetaVisitas={updateMetaVisitas}
            goTo={setTab}
          />
        )}
        {tab === "prospeccao" && (
          <ProspeccaoTab
            prospectos={prospectos}
            setProspectos={updateProspectos}
            onCriarComercio={criarComercioDeProspecto}
          />
        )}
        {tab === "comercios" && (
          <ComerciosTab comercios={comercios} setComercios={updateComercios} entregasCount={(id) => entregas.filter((e) => e.comercioId === id).length} />
        )}
        {tab === "entregas" && (
          <EntregasTab
            comercios={comercios}
            entregas={entregas}
            setEntregas={updateEntregas}
            lastEstoqueRestante={lastEstoqueRestante}
          />
        )}
        {tab === "resumo" && <ResumoTab resumo={resumo} totalGeral={totalGeral} />}
      </div>
      )}
      <TabBar tab={tab} setTab={setTab} />
    </div>
  );
}

function Header({ offline, onRefresh, configured }) {
  const statusLabel = !configured ? "Local" : offline ? "Offline" : "Online";
  const statusColor = !configured || offline ? PALETTE.pending : PALETTE.ok;
  return (
    <div style={{
      padding: "calc(env(safe-area-inset-top) + 14px) 16px 14px", display: "flex", alignItems: "center", gap: 11,
      borderBottom: `1px solid ${PALETTE.lineSoft}`,
    }}>
      <img
        src="/icon-192.png" alt="" width={38} height={38}
        style={{ borderRadius: 11, boxShadow: "0 2px 6px rgba(142,42,75,0.25)", flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", color: PALETTE.gold }}>
          Boom Algodão Doce
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
  );
}

function TabBar({ tab, setTab }) {
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

function Card({ children, style }) {
  return (
    <div
      style={{
        background: PALETTE.card, borderRadius: 16, border: `1px solid ${PALETTE.lineSoft}`, padding: 16,
        boxShadow: "0 1px 2px rgba(44,36,34,0.03), 0 8px 20px rgba(142,42,75,0.045)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      <div style={{ fontSize: 12, color: PALETTE.inkSoft, marginBottom: 4 }}>{label}</div>
      {children}
    </label>
  );
}

const inputStyle = {
  width: "100%", padding: "9px 10px", borderRadius: 9, border: `1px solid ${PALETTE.line}`,
  fontSize: 16, background: "#FDFAF8", color: PALETTE.ink, boxSizing: "border-box",
};

function Btn({ children, onClick, variant = "primary", style, type = "button" }) {
  const variants = {
    primary: { background: PALETTE.wine, color: "#fff" },
    ghost: { background: "transparent", color: PALETTE.wine, border: `1px solid ${PALETTE.wine}` },
    subtle: { background: PALETTE.wineSoft, color: PALETTE.wine },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
        padding: "9px 14px", minHeight: 40, borderRadius: 10, border: "none", fontSize: 13.5, fontWeight: 600,
        cursor: "pointer", touchAction: "manipulation", ...variants[variant], ...style,
      }}
    >
      {children}
    </button>
  );
}

// ---------------- Comércios ----------------
function ComerciosTab({ comercios, setComercios, entregasCount }) {
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

// ---------------- Entregas ----------------
function EntregasTab({ comercios, entregas, setEntregas, lastEstoqueRestante }) {
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

function Metric({ label, value }) {
  return (
    <div style={{ background: PALETTE.bg, borderRadius: 8, padding: "6px 9px" }}>
      <div style={{ fontSize: 10.5, color: PALETTE.inkSoft }}>{label}</div>
      <div style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

function KpiTile({ icon: Icon, tint, label, value }) {
  return (
    <Card style={{ padding: 15 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 9, background: PALETTE[`${tint}Soft`],
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10,
      }}>
        <Icon size={16} color={PALETTE[tint]} />
      </div>
      <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 19, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 11, color: PALETTE.inkSoft, marginTop: 2 }}>{label}</div>
    </Card>
  );
}

// ---------------- Resumo ----------------
function ResumoTab({ resumo, totalGeral }) {
  if (resumo.length === 0) {
    return (
      <Card style={{ textAlign: "center", color: PALETTE.inkSoft, fontSize: 13.5, marginTop: 8 }}>
        Cadastre comércios e registre lançamentos para ver o resumo aqui.
      </Card>
    );
  }
  return (
    <div style={{ paddingTop: 8 }}>
      <Card style={{ marginBottom: 12, background: PALETTE.wine, border: "none", color: "#fff" }}>
        <div style={{ fontSize: 12, opacity: 0.85, textTransform: "uppercase", letterSpacing: 1 }}>Total geral</div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>Vendido</div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{brl(totalGeral.valorVendido)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>A receber</div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{brl(totalGeral.aReceber)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>Pendente</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#FBEAE0" }}>{brl(totalGeral.pendente)}</div>
          </div>
        </div>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {resumo.map((r) => (
          <Card key={r.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{r.nome}</div>
              {r.pendente > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: PALETTE.pendingSoft, color: PALETTE.pending }}>
                  {brl(r.pendente)} pendente
                </span>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 10, fontSize: 12.5 }}>
              <Metric label="Estoque no ponto" value={`${r.estoqueAtual} un.`} />
              <Metric label="Vendido (total)" value={`${r.totalVendido} un.`} />
              <Metric label="Visitas" value={r.visitas} />
              <Metric label="Valor vendido" value={brl(r.valorVendido)} />
              <Metric label="Comissão lojista" value={brl(r.valorComissao)} />
              <Metric label="A receber (líq.)" value={brl(r.aReceber)} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------------- Painel (Dashboard / Vendas) ----------------
function PainelTab({ prospectos, comercios, resumo, totalGeral, entregas, metaVisitas, setMetaVisitas, goTo }) {
  const counts = useMemo(() => {
    const c = { "Não contatado": 0, "Contatado": 0, "Visitado": 0, "Fechado": 0, "Recusou": 0 };
    prospectos.forEach((p) => { c[p.status] = (c[p.status] || 0) + 1; });
    return c;
  }, [prospectos]);

  const totalTrabalhado = counts["Visitado"] + counts["Fechado"] + counts["Recusou"];
  const taxaConversao = totalTrabalhado > 0 ? counts["Fechado"] / totalTrabalhado : null;

  // início da semana (segunda-feira)
  const inicioSemana = useMemo(() => {
    const d = new Date();
    const dia = d.getDay(); // 0=domingo
    const diff = dia === 0 ? 6 : dia - 1;
    d.setDate(d.getDate() - diff);
    return d.toISOString().slice(0, 10);
  }, []);
  const visitasEstaSemana = prospectos.filter(
    (p) => p.dataUltimoContato && p.dataUltimoContato >= inicioSemana && ["Visitado", "Fechado", "Recusou"].includes(p.status)
  ).length;
  const progressoMeta = Math.min(1, visitasEstaSemana / Math.max(1, Number(metaVisitas) || 1));

  const comerciosAtivos = comercios.filter((c) => c.status === "Ativo").length;

  const inicioMes = new Date().toISOString().slice(0, 7); // YYYY-MM
  const vendasMes = entregas
    .filter((e) => (e.data || "").startsWith(inicioMes))
    .reduce((s, e) => s + Number(e.qtdVendida || 0) * Number(e.preco || 0), 0);

  // ---- meta de comércios necessários, com base no giro real (não em potes/semana teóricos) ----
  const [metaLiquida, setMetaLiquidaState] = useState(() => loadLocal("metaLiquidaMensal", 10000));
  const [giroQuinzenal, setGiroQuinzenalState] = useState(() => loadLocal("giroQuinzenalPote", 12.5));
  const [margemPote, setMargemPoteState] = useState(() => loadLocal("margemLiquidaPote", 5.615));

  function setMetaLiquida(v) { setMetaLiquidaState(v); saveLocal("metaLiquidaMensal", v); }
  function setGiroQuinzenal(v) { setGiroQuinzenalState(v); saveLocal("giroQuinzenalPote", v); }
  function setMargemPote(v) { setMargemPoteState(v); saveLocal("margemLiquidaPote", v); }

  const potesSemanaNecessarios = margemPote > 0 ? (Number(metaLiquida) / Number(margemPote)) / 4.33 : 0;
  const giroSemanalPorComercio = (Number(giroQuinzenal) || 0) / 15 * 7;
  const comerciosNecessarios = giroSemanalPorComercio > 0 ? Math.ceil(potesSemanaNecessarios / giroSemanalPorComercio) : 0;
  const gapComercios = comerciosNecessarios - comerciosAtivos;

  return (
    <div style={{ paddingTop: 8 }}>
      {/* meta de visitas semanais */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Meta de visitas desta semana</div>
          <input
            type="number"
            value={metaVisitas}
            onChange={(e) => setMetaVisitas(e.target.value)}
            style={{ width: 64, textAlign: "center", padding: "6px 6px", borderRadius: 8, border: `1px solid ${PALETTE.line}`, fontSize: 16 }}
          />
        </div>
        <div style={{ background: PALETTE.bg, borderRadius: 999, height: 10, marginTop: 10, overflow: "hidden" }}>
          <div style={{ width: `${progressoMeta * 100}%`, background: PALETTE.wine, height: "100%", borderRadius: 999, transition: "width .3s" }} />
        </div>
        <div style={{ fontSize: 12, color: PALETTE.inkSoft, marginTop: 6 }}>
          {visitasEstaSemana} de {metaVisitas} visitas feitas esta semana
        </div>
      </Card>

      {/* taxa de conversão */}
      <Card style={{ marginBottom: 12, background: PALETTE.wine, border: "none", boxShadow: "0 10px 24px rgba(142,42,75,0.28)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 11, color: PALETTE.wineSoft, textTransform: "uppercase", letterSpacing: 1 }}>Taxa de conversão</div>
            <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontVariantNumeric: "tabular-nums", fontSize: 32, fontWeight: 700, color: "#fff", marginTop: 4, lineHeight: 1 }}>
              {taxaConversao === null ? "—" : `${Math.round(taxaConversao * 100)}%`}
            </div>
            <div style={{ fontSize: 11.5, color: PALETTE.wineSoft, marginTop: 6 }}>
              {counts["Fechado"]} fechados de {totalTrabalhado} visitados
            </div>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <TrendingUp size={22} color="#F6ECD9" />
          </div>
        </div>
      </Card>

      {/* funil de prospecção */}
      <div style={{ fontWeight: 700, fontSize: 13, color: PALETTE.inkSoft, margin: "4px 0 8px", textTransform: "uppercase", letterSpacing: 0.5 }}>
        Funil de prospecção
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {PROSPECT_STATUS.map((s) => {
          const dotColor = PALETTE[PROSPECT_STATUS_COLOR[s]] || PALETTE.inkSoft;
          const softColor = PALETTE[`${PROSPECT_STATUS_COLOR[s]}Soft`] || PALETTE.bg;
          return (
            <button key={s} onClick={() => goTo("prospeccao")} style={{ all: "unset", cursor: "pointer" }}>
              <Card style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: PALETTE.ink }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: dotColor, flexShrink: 0 }} />
                  {s}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: dotColor,
                    background: softColor, borderRadius: 999, padding: "2px 12px",
                  }}>{counts[s] || 0}</span>
                  <ChevronRight size={15} color={PALETTE.line} />
                </span>
              </Card>
            </button>
          );
        })}
      </div>

      {/* resumo geral */}
      <div style={{ fontWeight: 700, fontSize: 13, color: PALETTE.inkSoft, margin: "4px 0 8px", textTransform: "uppercase", letterSpacing: 0.5 }}>
        Visão geral do consignado
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <KpiTile icon={Store} tint="wine" label="Comércios ativos" value={comerciosAtivos} />
        <KpiTile icon={TrendingUp} tint="gold" label="Vendido este mês" value={brl(vendasMes)} />
        <KpiTile icon={Wallet} tint="ok" label="A receber (total)" value={brl(totalGeral.aReceber)} />
        <KpiTile icon={Clock} tint="pending" label="Pendente de pagamento" value={brl(totalGeral.pendente)} />
      </div>

      {/* meta de comércios necessários, com giro real */}
      <div style={{ fontWeight: 700, fontSize: 13, color: PALETTE.inkSoft, margin: "4px 0 8px", textTransform: "uppercase", letterSpacing: 0.5 }}>
        Meta de comércios (giro real)
      </div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <label>
            <div style={{ fontSize: 10.5, color: PALETTE.inkSoft, marginBottom: 3 }}>Meta líquida mensal (R$)</div>
            <input type="number" value={metaLiquida} onChange={(e) => setMetaLiquida(e.target.value)} style={inputStyle} />
          </label>
          <label>
            <div style={{ fontSize: 10.5, color: PALETTE.inkSoft, marginBottom: 3 }}>Giro médio (potes/15 dias)</div>
            <input type="number" value={giroQuinzenal} onChange={(e) => setGiroQuinzenal(e.target.value)} style={inputStyle} />
          </label>
        </div>
        <label style={{ display: "block", marginBottom: 12 }}>
          <div style={{ fontSize: 10.5, color: PALETTE.inkSoft, marginBottom: 3 }}>Margem líquida por pote (R$)</div>
          <input type="number" step="0.001" value={margemPote} onChange={(e) => setMargemPote(e.target.value)} style={inputStyle} />
        </label>

        <div style={{ borderTop: `1px dashed ${PALETTE.line}`, paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: PALETTE.inkSoft }}>Comércios ativos necessários</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: PALETTE.wine }}>{comerciosNecessarios}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: PALETTE.inkSoft }}>Você tem hoje</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{comerciosAtivos}</div>
          </div>
        </div>
        <div style={{
          marginTop: 10, fontSize: 12.5, fontWeight: 600, textAlign: "center", padding: "8px 10px", borderRadius: 8,
          background: gapComercios > 0 ? PALETTE.pendingSoft : PALETTE.okSoft,
          color: gapComercios > 0 ? PALETTE.pending : PALETTE.ok,
        }}>
          {gapComercios > 0
            ? `Faltam fechar mais ${gapComercios} comércio(s) para bater a meta`
            : "Meta batida com os comércios ativos atuais 🎉"}
        </div>
      </Card>
    </div>
  );
}

// ---------------- Prospecção ----------------
const DEFAULT_TEMPLATE =
  "Olá! Aqui é da Boom Algodão Doce 🍭 — marca com 9 anos de festas infantis aqui na região. " +
  "Queria saber se o(a) {nome} teria interesse em receber alguns potes de algodão doce gourmet em consignação: " +
  "sem custo, sem compromisso, vocês só pagam pelo que vender. Posso passar aí um dia desses pra deixar? 😊";

function buildWhatsAppLink(prospecto, template) {
  const texto = template.replaceAll("{nome}", prospecto.nome);
  const digits = (prospecto.contato || "").replace(/\D/g, "");
  const base = digits ? `https://wa.me/55${digits}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(texto)}`;
}

function ProspeccaoTab({ prospectos, setProspectos, onCriarComercio }) {
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [busca, setBusca] = useState("");
  const [editing, setEditing] = useState(null); // prospecto sendo editado
  const [template, setTemplate] = useState(() => loadLocal("mensagemTriagemWhatsApp", DEFAULT_TEMPLATE));
  const [showTemplate, setShowTemplate] = useState(false);

  function salvarTemplate(novo) {
    setTemplate(novo);
    saveLocal("mensagemTriagemWhatsApp", novo);
  }

  function enviarWhatsApp(p) {
    window.open(buildWhatsAppLink(p, template), "_blank");
    if (p.status === "Não contatado") {
      updateStatus(p.id, "Contatado");
    }
  }

  const filtered = useMemo(() => {
    return prospectos.filter((p) => {
      if (filtroStatus !== "Todos" && p.status !== filtroStatus) return false;
      if (busca.trim()) {
        const q = busca.toLowerCase();
        if (!p.nome.toLowerCase().includes(q) && !p.cidade.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [prospectos, filtroStatus, busca]);

  function updateStatus(id, status) {
    setProspectos(prospectos.map((p) => (p.id === id ? { ...p, status, dataUltimoContato: todayISO() } : p)));
  }
  function saveEdit(updated) {
    setProspectos(prospectos.map((p) => (p.id === updated.id ? updated : p)));
    setEditing(null);
  }

  const statusFiltros = ["Todos", ...PROSPECT_STATUS];

  return (
    <div style={{ paddingTop: 8 }}>
      <Card style={{ marginBottom: 10 }}>
        <button
          onClick={() => setShowTemplate(!showTemplate)}
          style={{ all: "unset", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}
        >
          <span style={{ fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            <MessageCircle size={15} color={PALETTE.wine} /> Mensagem de triagem (WhatsApp)
          </span>
          <span style={{ fontSize: 11, color: PALETTE.wine, fontWeight: 700 }}>{showTemplate ? "Fechar" : "Editar"}</span>
        </button>
        {showTemplate && (
          <div style={{ marginTop: 10 }}>
            <textarea
              value={template}
              onChange={(e) => salvarTemplate(e.target.value)}
              rows={5}
              style={{ ...inputStyle, resize: "vertical" }}
            />
            <div style={{ fontSize: 10.5, color: PALETTE.inkSoft, marginTop: 4 }}>
              Use <strong>{"{nome}"}</strong> onde quiser que entre o nome do comércio automaticamente.
            </div>
          </div>
        )}
      </Card>

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <div className="search-pill" style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, background: PALETTE.card, border: `1px solid ${PALETTE.line}`, borderRadius: 10, padding: "6px 10px" }}>
          <Search size={15} color={PALETTE.inkSoft} />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou cidade"
            style={{ border: "none", outline: "none", fontSize: 16, flex: 1, background: "transparent" }}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 8 }}>
        {statusFiltros.map((s) => (
          <button
            key={s}
            onClick={() => setFiltroStatus(s)}
            style={{
              whiteSpace: "nowrap", padding: "6px 12px", borderRadius: 999, border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: 600,
              background: filtroStatus === s ? PALETTE.wine : PALETTE.card,
              color: filtroStatus === s ? "#fff" : PALETTE.inkSoft,
              boxShadow: filtroStatus === s ? "none" : `inset 0 0 0 1px ${PALETTE.line}`,
            }}
          >
            {s} {s !== "Todos" ? `(${prospectos.filter((p) => p.status === s).length})` : `(${prospectos.length})`}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 12, color: PALETTE.inkSoft, marginBottom: 10 }}>{filtered.length} comércio(s)</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((p) => (
          <Card key={p.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 14.5 }}>{p.nome}</span>
                  {p.prioridade === "Litoral" && <Star size={12} fill={PALETTE.gold} color={PALETTE.gold} />}
                </div>
                <div style={{ fontSize: 12, color: PALETTE.inkSoft, marginTop: 2 }}>{p.tipo} · {p.cidade}</div>
                {p.endereco && (
                  <div style={{ fontSize: 11.5, color: PALETTE.inkSoft, marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
                    <MapPin size={11} /> {p.endereco}
                  </div>
                )}
                {p.contato && (
                  <div style={{ fontSize: 11.5, color: PALETTE.inkSoft, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                    <Phone size={11} /> {p.contato}
                  </div>
                )}
              </div>
              {p.comercioId && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: PALETTE.okSoft, color: PALETTE.ok, whiteSpace: "nowrap" }}>
                  Já é comércio
                </span>
              )}
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              {PROSPECT_STATUS.map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(p.id, s)}
                  style={{
                    fontSize: 11, padding: "5px 10px", borderRadius: 999, cursor: "pointer",
                    border: "none",
                    background: p.status === s ? PALETTE.wine : PALETTE.bg,
                    color: p.status === s ? "#fff" : PALETTE.inkSoft,
                    fontWeight: p.status === s ? 700 : 500,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            {p.dataUltimoContato && (
              <div style={{ fontSize: 10.5, color: PALETTE.inkSoft, marginTop: 6 }}>Último contato: {fmtDate(p.dataUltimoContato)}</div>
            )}
            {p.obs && <div style={{ fontSize: 11.5, color: PALETTE.inkSoft, marginTop: 4, fontStyle: "italic" }}>{p.obs}</div>}

            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <Btn onClick={() => enviarWhatsApp(p)} style={{ flex: 1 }}>
                <MessageCircle size={14} /> Enviar WhatsApp
              </Btn>
              <Btn variant="subtle" onClick={() => setEditing(p)} style={{ flex: 1 }}>Anotar</Btn>
            </div>
            {p.status === "Fechado" && !p.comercioId && (
              <Btn onClick={() => onCriarComercio(p)} style={{ width: "100%", marginTop: 8 }}>
                <ArrowRight size={13} /> Criar comércio
              </Btn>
            )}
          </Card>
        ))}
      </div>

      {editing && (
        <Modal onClose={() => setEditing(null)} title={editing.nome}>
          <Field label="Observações / motivo">
            <textarea
              value={editing.obs}
              onChange={(e) => setEditing({ ...editing, obs: e.target.value })}
              rows={4}
              style={{ ...inputStyle, resize: "vertical" }}
              placeholder="Ex.: pediu para voltar semana que vem, dono só chega às 14h, recusou por já ter fornecedor..."
            />
          </Field>
          <Field label="Telefone / contato">
            <input style={inputStyle} value={editing.contato} onChange={(e) => setEditing({ ...editing, contato: e.target.value })} />
          </Field>
          <Btn onClick={() => saveEdit(editing)} style={{ width: "100%", marginTop: 6 }}>Salvar</Btn>
        </Modal>
      )}
    </div>
  );
}

// ---------------- Modal ----------------
function Modal({ children, onClose, title }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(44,36,34,0.45)", display: "flex",
        alignItems: "flex-end", justifyContent: "center", zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: PALETTE.card, width: "100%", maxWidth: 720, borderRadius: "18px 18px 0 0",
          padding: 20, maxHeight: "88vh", overflowY: "auto", boxShadow: "0 -8px 30px rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: PALETTE.wine }}>{title}</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: PALETTE.inkSoft }}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
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
