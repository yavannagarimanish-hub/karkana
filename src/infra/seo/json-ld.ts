/**
 * Serialize a value for inline JSON-LD (a `<script type="application/ld+json">`
 * element rendered through `dangerouslySetInnerHTML`).
 *
 * `JSON.stringify` alone is not sufficient: it leaves `<`, `>` and `&` intact,
 * so a value containing `</script>` closes the surrounding script element and
 * everything after it executes as markup. Escaping those characters to `\uXXXX`
 * keeps the JSON byte-identical when parsed while making breakout impossible.
 *
 * U+2028 / U+2029 are included because they are legal in JSON strings but were
 * treated as line terminators by JavaScript, which breaks inline evaluation.
 */
export function toSafeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
