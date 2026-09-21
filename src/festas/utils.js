import { diasParaProximaOcorrencia } from "../shared/utils";

// Retorna os contatos com aniversário cadastrado dentro dos próximos `dias`
// dias, já ordenados do mais próximo para o mais distante.
export function proximosAniversarios(contatos, dias = 30) {
  return contatos
    .map((c) => ({ ...c, diasParaAniversario: diasParaProximaOcorrencia(c.aniversario) }))
    .filter((c) => c.diasParaAniversario !== null && c.diasParaAniversario <= dias)
    .sort((a, b) => a.diasParaAniversario - b.diasParaAniversario);
}

export function rotuloDiasParaAniversario(dias) {
  if (dias === 0) return "É hoje! 🎉";
  if (dias === 1) return "Amanhã";
  return `Em ${dias} dias`;
}
