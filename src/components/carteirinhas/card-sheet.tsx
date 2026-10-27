import type { ReactElement } from "react";
import * as PDF from "@react-pdf/renderer";
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  MemberCardBack,
  MemberCardFront,
  type MemberCardPdfData,
} from "./member-card-pdf";

const CARDS_PER_PAGE = 5;
const CARDS_PER_PAGE_PAIRS = 5;
const CARDS_PER_ROW = 2;

/** A4 em pontos (72 por polegada). */
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const GAP = 9;

/**
 * Como o verso é impresso:
 * - `front`: apenas as frentes, 5 por folha;
 * - `side-by-side`: frente e verso lado a lado, 5 cartões por folha;
 * - `duplex`: frentes e versos em páginas intercaladas, 5 por folha.
 */
export type CardSheetLayout = "front" | "side-by-side" | "duplex";

/**
 * As folhas usam posicionamento absoluto (em vez de `justifyContent: center`)
 * para que frente e verso tenham exatamente a mesma geometria — requisito para
 * a impressão duplex alinhar os dois lados.
 */
function rowLayout(rowCount: number, cardsPerRow: number) {
  const blockHeight = rowCount * CARD_HEIGHT + Math.max(0, rowCount - 1) * GAP;
  const rowWidth = cardsPerRow * CARD_WIDTH + Math.max(0, cardsPerRow - 1) * GAP;
  const top = (PAGE_HEIGHT - blockHeight) / 2;
  const left = (PAGE_WIDTH - rowWidth) / 2;

  return (rowIndex: number) => ({
    position: "absolute" as const,
    top: top + rowIndex * (CARD_HEIGHT + GAP),
    left,
    flexDirection: "row" as const,
    gap: GAP,
  });
}

function chunk<T>(items: T[], size: number) {
  const groups: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }
  return groups;
}

/** Frentes ou versos em grade de 2 colunas (modo somente frente e duplex). */
function buildRows(
  group: MemberCardPdfData[],
  render: (card: MemberCardPdfData, key: string) => ReactElement,
  mirror = false
) {
  const rows = chunk(group, CARDS_PER_ROW);
  const styleFor = rowLayout(rows.length, CARDS_PER_ROW);

  return rows.map((row, rowIndex) => {
    // No duplex as colunas são invertidas para alinhar com a frente quando a
    // folha é virada na borda longa (padrão dos impressores).
    const cards = mirror ? [...row].reverse() : row;

    return (
      <PDF.View key={`row-${rowIndex}`} style={styleFor(rowIndex)}>
        {cards.map((card, index) => render(card, `${rowIndex}-${index}-${card.id}`))}
      </PDF.View>
    );
  });
}

/** Cada linha traz a frente e o verso do mesmo cartão, lado a lado. */
function buildPairRows(group: MemberCardPdfData[]) {
  const styleFor = rowLayout(group.length, 2);

  return group.map((card, rowIndex) => (
    <PDF.View key={`pair-${rowIndex}-${card.id}`} style={styleFor(rowIndex)}>
      <MemberCardFront key={`pair-front-${card.id}`} data={card} />
      <MemberCardBack key={`pair-back-${card.id}`} data={card} />
    </PDF.View>
  ));
}

/**
 * Monta as páginas A4 do lote. No modo padrão (`side-by-side`) cada cartão
 * ocupa uma linha com a frente e o verso lado a lado, pronto para recortar e
 * montar. O modo `duplex` mantém uma folha de frentes seguida da folha de
 * versos espelhada.
 */
export function buildCardSheetPages(
  data: MemberCardPdfData[],
  layout: CardSheetLayout = "side-by-side"
): ReactElement[] {
  const pages: ReactElement[] = [];

  if (layout === "side-by-side") {
    for (let offset = 0; offset < data.length; offset += CARDS_PER_PAGE_PAIRS) {
      const group = data.slice(offset, offset + CARDS_PER_PAGE_PAIRS);

      pages.push(
        <PDF.Page key={`pair-${offset}`} size="A4" style={{ position: "relative" }}>
          {buildPairRows(group)}
        </PDF.Page>
      );
    }

    return pages;
  }

  for (let offset = 0; offset < data.length; offset += CARDS_PER_PAGE) {
    const group = data.slice(offset, offset + CARDS_PER_PAGE);

    pages.push(
      <PDF.Page key={`front-${offset}`} size="A4" style={{ position: "relative" }}>
        {buildRows(group, (card, key) => (
          <MemberCardFront key={`front-${key}`} data={card} />
        ))}
      </PDF.Page>
    );

    if (layout === "duplex") {
      pages.push(
        <PDF.Page key={`back-${offset}`} size="A4" style={{ position: "relative" }}>
          {buildRows(
            group,
            (card, key) => <MemberCardBack key={`back-${key}`} data={card} />,
            true
          )}
        </PDF.Page>
      );
    }
  }

  return pages;
}
