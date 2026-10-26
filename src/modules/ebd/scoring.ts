/**
 * Regras de pontuação da EBD.
 *
 * Cada lição vale até 10 pontos, distribuídos entre presença e os itens
 * entregues pelo aluno. Os limites também são usados para validar os valores
 * enviados pela chamada.
 */
export const EBD_SCORE_RULES = {
  presence: 2,
  lesson: 2,
  participation: 3,
  bible: 2,
  offering: 1,
} as const;

export const EBD_MAX_SCORE =
  EBD_SCORE_RULES.presence +
  EBD_SCORE_RULES.lesson +
  EBD_SCORE_RULES.participation +
  EBD_SCORE_RULES.bible +
  EBD_SCORE_RULES.offering;

export type EbdScoreInput = {
  present: boolean;
  lessonScore: number;
  participationScore: number;
  bibleScore: number;
  offeringScore: number;
};

/** Total de pontos de um aluno em uma chamada. */
export function entryTotal(entry: EbdScoreInput): number {
  return (
    (entry.present ? EBD_SCORE_RULES.presence : 0) +
    clamp(entry.lessonScore, EBD_SCORE_RULES.lesson) +
    clamp(entry.participationScore, EBD_SCORE_RULES.participation) +
    clamp(entry.bibleScore, EBD_SCORE_RULES.bible) +
    clamp(entry.offeringScore, EBD_SCORE_RULES.offering)
  );
}

/** Limita a pontuação ao máximo permitido para o item. */
export function clamp(value: number | null | undefined, max: number): number {
  const number = Math.round(Number(value ?? 0));
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.min(number, max);
}

export const EBD_SCORE_FIELDS = [
  { key: "presence", label: "Presença", max: EBD_SCORE_RULES.presence },
  { key: "lessonScore", label: "Lição impressa", max: EBD_SCORE_RULES.lesson },
  { key: "participationScore", label: "Participação", max: EBD_SCORE_RULES.participation },
  { key: "bibleScore", label: "Bíblia impressa", max: EBD_SCORE_RULES.bible },
  { key: "offeringScore", label: "Oferta", max: EBD_SCORE_RULES.offering },
] as const;

/** Percentual de aproveitamento (0-100) em relação ao máximo possível. */
export function scorePercent(total: number, lessons: number): number {
  if (lessons <= 0) return 0;
  return Math.round((total / (lessons * EBD_MAX_SCORE)) * 100);
}
