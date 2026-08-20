export const watchlistStorageKey = "heatmap-watchlist";

export type WatchlistExchange = "SH" | "SZ" | "BJ";

export type WatchlistItem = {
  code: string;
  name: string;
  boardName?: string;
  subBoardName?: string;
  exchange?: WatchlistExchange;
};

function isWatchlistExchange(value: unknown): value is WatchlistExchange {
  return value === "SH" || value === "SZ" || value === "BJ";
}

function readOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function parseStoredWatchlist(raw: string | null): WatchlistItem[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const items: WatchlistItem[] = [];
    const seen = new Set<string>();

    for (const item of parsed) {
      if (!item || typeof item !== "object") {
        continue;
      }

      const record = item as {
        code?: unknown;
        name?: unknown;
        boardName?: unknown;
        subBoardName?: unknown;
        exchange?: unknown;
      };
      const code = typeof record.code === "string" ? record.code.trim() : "";
      const name = typeof record.name === "string" ? record.name.trim() : "";
      if (!code || !name || seen.has(code)) {
        continue;
      }

      seen.add(code);
      items.push({
        code,
        name,
        boardName: readOptionalString(record.boardName),
        subBoardName: readOptionalString(record.subBoardName),
        exchange: isWatchlistExchange(record.exchange) ? record.exchange : undefined,
      });
    }

    return items;
  } catch {
    return [];
  }
}

export function serializeWatchlist(items: WatchlistItem[]) {
  return JSON.stringify(items);
}
