export const DETAIL_RETURN_KEY = "wandermatch:detail-return";

type DetailEntry = {
  slug: string;
  sourcePath: "/" | "/map";
  createdAt: number;
};

const MAX_ENTRY_AGE_MILLISECONDS = 30 * 60 * 1000;

export function rememberDetailEntry(
  slug: string,
  sourcePath: DetailEntry["sourcePath"],
): void {
  try {
    const entry: DetailEntry = {
      slug,
      sourcePath,
      createdAt: Date.now(),
    };
    window.sessionStorage.setItem(DETAIL_RETURN_KEY, JSON.stringify(entry));
  } catch {
    // Navigation still works without sessionStorage; Detail falls back home.
  }
}

export function consumeDetailEntry(slug: string): DetailEntry["sourcePath"] | null {
  try {
    const serializedEntry = window.sessionStorage.getItem(DETAIL_RETURN_KEY);
    window.sessionStorage.removeItem(DETAIL_RETURN_KEY);

    if (serializedEntry === null) {
      return null;
    }

    const entry = JSON.parse(serializedEntry) as unknown;

    if (!isDetailEntry(entry) || entry.slug !== slug) {
      return null;
    }

    if (Date.now() - entry.createdAt > MAX_ENTRY_AGE_MILLISECONDS) {
      return null;
    }

    return entry.sourcePath;
  } catch {
    return null;
  }
}

function isDetailEntry(value: unknown): value is DetailEntry {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const entry = value as Record<string, unknown>;
  const hasValidSource = entry.sourcePath === "/" || entry.sourcePath === "/map";

  return (
    typeof entry.slug === "string" &&
    hasValidSource &&
    typeof entry.createdAt === "number" &&
    Number.isFinite(entry.createdAt)
  );
}
