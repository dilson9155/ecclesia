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
const CARDS_PER_ROW = 2;

/** A4 em pontos (72 por polegada). */
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const GAP = 9;

/**
 * As folhas usam posicionamento absoluto (em vez de `justifyContent: center`)
 * para que frente e verso tenham exatamente a mesma geometria — requisito para
 * a impressão duplex alinhar os dois lados.
 */
function rowLayout(rowCount: number) {
  const blockHeight = rowCount * CARD_HEIGHT + Math.max(0, rowCount - 1) * GAP;
  const top = (PAGE_HEIGHT - blockHeight) / 2;
  const doubleLeft = (PAGE_WIDTH - (CARD_WIDTH * 2 + GAP)) / 2;
  const singleLeft = (PAGE_WIDTH - CARD_WIDTH) / 2;

  return (rowIndex: number, cardsInRow: number) => ({
    position: "absolute" as const,
    top: top + rowIndex * (CARD_HEIGHT + GAP),
    left: cardsInRow > 1 ? doubleLeft : singleLeft,
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

function buildRows(
  group: MemberCardPdfData[],
  render: (card: MemberCardPdfData, key: string) => ReactElement,
  mirror = false
) {
  const rows = chunk(group, CARDS_PER_ROW).slice(0, CARDS_PER_PAGE / CARDS_PER_ROW);
  const styleFor = rowLayout(rows.length);

  return rows.map((row, rowIndex) => {
    // No verso as colunas são invertidas para alinhar com a frente quando a
    // folha é virada na borda longa (duplex padrão dos impressores).
    const cards = mirror ? [...row].reverse() : row;

    return (
      <PDF.View key={`row-${rowIndex}`} style={styleFor(rowIndex, row.length)}>
        {cards.map((card, index) => render(card, `${rowIndex}-${index}`))}
      </PDF.View>
    );
  });
}

/**
 * Monta as páginas A4 do lote: 5 cartões por folha (2+2+1, última linha
 * centralizada) e, quando `includeBack`, uma página de versos logo após cada
 * página de frentes, com as colunas espelhadas para impressão duplex.
 */
export function buildCardSheetPages(
  data: MemberCardPdfData[],
  includeBack: boolean
): ReactElement[] {
  const pages: ReactElement[] = [];

  for (let offset = 0; offset < data.length; offset += CARDS_PER_PAGE) {
    const group = data.slice(offset, offset + CARDS_PER_PAGE);

    pages.push(
      <PDF.Page key={`front-${offset}`} size="A4" style={{ position: "relative" }}>
        {buildRows(group, (card, key) => (
          <MemberCardFront key={`front-${key}-${card.id}`} data={card} />
        ))}
      </PDF.Page>
    );

    if (includeBack) {
      pages.push(
        <PDF.Page key={`back-${offset}`} size="A4" style={{ position: "relative" }}>
          {buildRows(
            group,
            (card, key) => (
              <MemberCardBack key={`back-${key}-${card.id}`} data={card} />
            ),
            true
          )}
        </PDF.Page>
      );
    }
  }

  return pages;
}
