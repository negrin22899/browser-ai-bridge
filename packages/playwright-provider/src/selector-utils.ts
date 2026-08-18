/**
 * Shared helpers for resilient selector lists.
 *
 * Selectors can be supplied either as a single CSS selector or as an ordered
 * list of fallback selectors. The list form is the resilient path: each
 * selector is tried in order until one yields a visible element.
 */
export type SelectorList = string | string[];

export function toSelectorList(selectors: SelectorList): string[] {
  const list = Array.isArray(selectors) ? selectors : [selectors];
  return list.map((s) => s.trim()).filter(Boolean);
}
