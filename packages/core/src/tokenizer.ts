/**
 * Lightweight token estimator — no external tokenizer dependency.
 *
 * Heuristic: CJK characters are roughly 1 token each; Latin text is roughly
 * 4 characters per token. Good enough for a context progress bar, not for
 * billing-precision accounting.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;

  let cjk = 0;
  let latin = 0;
  let whitespace = 0;

  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (/\s/.test(ch)) {
      whitespace++;
    } else if (
      (code >= 0x4e00 && code <= 0x9fff) || // CJK Unified
      (code >= 0x3040 && code <= 0x30ff) || // Hiragana/Katakana
      (code >= 0xac00 && code <= 0xd7af) // Hangul
    ) {
      cjk++;
    } else {
      latin++;
    }
  }

  // Latin ~4 chars/token, whitespace/punctuation folded in; CJK ~1 token each.
  return cjk + Math.ceil((latin + whitespace) / 4);
}

/** Estimate the token count across a list of messages (content + tool args). */
export function estimateMessageTokens(messages: Array<{ content?: string | null }>): number {
  let total = 0;
  for (const message of messages) {
    total += estimateTokens(message.content ?? '');
  }
  return total;
}

/** Default context window used for the progress indicator (GPT-4o-class). */
export const DEFAULT_CONTEXT_LIMIT = 128_000;
