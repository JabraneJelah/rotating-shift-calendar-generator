import type { ICSExportSuccess } from "./ics-types";

type DownloadEnvironment = {
  readonly createObjectURL: (blob: Blob) => string;
  readonly revokeObjectURL: (url: string) => void;
  readonly document: Document;
};

export function formatICSUtcTimestamp(date: Date): string {
  return date
    .toISOString()
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replace(/\.\d{3}Z$/, "Z");
}

export function downloadICSFile(
  exportedCalendar: ICSExportSuccess,
  environment: DownloadEnvironment = {
    createObjectURL: URL.createObjectURL.bind(URL),
    revokeObjectURL: URL.revokeObjectURL.bind(URL),
    document,
  },
): void {
  const blob = new Blob([exportedCalendar.content], {
    type: exportedCalendar.mimeType,
  });
  const objectUrl = environment.createObjectURL(blob);
  const anchor = environment.document.createElement("a");

  try {
    anchor.href = objectUrl;
    anchor.download = exportedCalendar.filename;
    anchor.hidden = true;
    environment.document.body.append(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    environment.revokeObjectURL(objectUrl);
  }
}
