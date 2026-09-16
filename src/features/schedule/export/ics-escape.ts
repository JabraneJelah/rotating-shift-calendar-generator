const textEncoder = new TextEncoder();

export function escapeICSText(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}

/** Folds one logical content line without splitting a UTF-8 code point. */
export function foldICSContentLine(line: string): readonly string[] {
  const folded: string[] = [];
  let segment = "";
  let segmentBytes = 0;
  let byteLimit = 75;

  for (const codePoint of line) {
    const codePointBytes = textEncoder.encode(codePoint).length;

    if (segmentBytes + codePointBytes > byteLimit && segment !== "") {
      folded.push(folded.length === 0 ? segment : ` ${segment}`);
      segment = "";
      segmentBytes = 0;
      byteLimit = 74;
    }

    segment += codePoint;
    segmentBytes += codePointBytes;
  }

  folded.push(folded.length === 0 ? segment : ` ${segment}`);

  return Object.freeze(folded);
}
