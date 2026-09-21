export const EXPORT_FORMATS = ["csv", "xlsx", "json"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];
export type ExportCellKind = "text" | "number" | "date-only" | "instant";
export type ExportPrimitive = string | number | null;

export type ExportColumn<Row> = Readonly<{
  key: keyof Row & string;
  header: string;
  kind?: ExportCellKind;
  width?: number;
}>;

export type ExportDocument<Row extends Record<string, ExportPrimitive>> = Readonly<{
  domain: string;
  filenameBase: string;
  worksheetName: string;
  filters: Record<string, string | number | boolean>;
  columns: readonly ExportColumn<Row>[];
  rows: readonly Row[];
}>;
