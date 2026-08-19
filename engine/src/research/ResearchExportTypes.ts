export const RESEARCH_EXPORT_FORMATS = [
  'json',
  'csv',
  'ndjson',
  'summary',
] as const;

export type ResearchExportFormat = (typeof RESEARCH_EXPORT_FORMATS)[number];

export function isResearchExportFormat(
  value: string,
): value is ResearchExportFormat {
  return (RESEARCH_EXPORT_FORMATS as readonly string[]).includes(value);
}

export interface ResearchExportResult {
  format: ResearchExportFormat;
  content: string;
  recordCount: number;
  generatedAt: number;
}
