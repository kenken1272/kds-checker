import { z } from "zod";

const MAX_ROWS = 1000;

export type RawCsvRow = Record<string, unknown>;

const FIELD_CANDIDATES: Record<"ts" | "name" | "qty" | "pricemode" | "linetotal" | "status", string[]> = {
  ts: ["ts", "timestamp", "time", "date", "datetime", "createdAt"],
  name: ["name", "menu", "item", "itemName", "product", "productName"],
  qty: ["qty", "quantity", "count", "amount", "units"],
  pricemode: ["pricemode", "priceMode", "price_mode", "mode", "pricing"],
  linetotal: ["linetotal", "lineTotal", "line_total", "total", "totalPrice", "amountTotal"],
  status: ["status", "state", "orderStatus", "fulfillmentStatus"],
};

const pickField = (row: RawCsvRow, keys: string[]): unknown => {
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(row, key)) {
      continue;
    }

    const candidate = row[key];
    if (candidate === undefined || candidate === null) {
      continue;
    }

    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (trimmed.length === 0) {
        continue;
      }
      return trimmed;
    }

    return candidate;
  }

  return undefined;
};

export const projectCsvRow = (row: RawCsvRow): Record<string, unknown> => {
  const projectedStatus = pickField(row, FIELD_CANDIDATES.status);

  return {
    ts: pickField(row, FIELD_CANDIDATES.ts),
    name: pickField(row, FIELD_CANDIDATES.name),
    qty: pickField(row, FIELD_CANDIDATES.qty),
    pricemode: pickField(row, FIELD_CANDIDATES.pricemode) ?? "UNKNOWN",
    linetotal: pickField(row, FIELD_CANDIDATES.linetotal),
    status: projectedStatus,
  };
};

const sanitizeNumber = (value: unknown, ctx: z.RefinementCtx): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.replace(/,/g, "").trim();
    if (trimmed.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Value is required",
      });
      return z.NEVER;
    }

    const asNumber = Number(trimmed);
    if (!Number.isFinite(asNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Unable to parse number from "${value}"`,
      });
      return z.NEVER;
    }
    return asNumber;
  }

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: "Expected a number or numeric string",
  });
  return z.NEVER;
};

const StatusSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const upper = value.trim().toUpperCase();
  if (upper === "CANCELLED") {
    return "CANCELLED";
  }

  if (["OK", "READY", "DONE", "COMPLETED", "SUCCESS", "FULFILLED"].includes(upper)) {
    return "OK";
  }

  return upper;
}, z.enum(["OK", "CANCELLED"]));

const NumericSchema = z
  .union([z.string(), z.number()])
  .transform((value, ctx) => sanitizeNumber(value, ctx));

export const SalesCsvRowSchema = z.object({
  ts: z.union([z.string(), z.number(), z.date()]),
  name: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1, "name is required")),
  qty: NumericSchema,
  pricemode: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1, "pricemode is required")),
  linetotal: NumericSchema,
  status: StatusSchema,
});

export type SalesCsvRow = z.infer<typeof SalesCsvRowSchema>;

export type SalesRow = {
  ts: Date;
  name: string;
  qty: number;
  pricemode: string;
  linetotal: number;
  status: "OK" | "CANCELLED";
  signedTotal: number;
  signedQty: number;
};

const toDate = (value: SalesCsvRow["ts"]): Date => {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value;
  }

  if (typeof value === "number") {
    const timestampMs = value < 1e11 ? value * 1000 : value;
    const date = new Date(timestampMs);
    if (!Number.isNaN(date.valueOf())) {
      return date;
    }
    throw new Error("Invalid numeric timestamp");
  }

  if (typeof value !== "string") {
    throw new Error("Timestamp must be a string");
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error("Timestamp is required");
  }

  const numericCandidate = Number(trimmed);
  if (!Number.isNaN(numericCandidate)) {
    const timestampMs = trimmed.length === 10 ? numericCandidate * 1000 : numericCandidate;
    const date = new Date(timestampMs);
    if (!Number.isNaN(date.valueOf())) {
      return date;
    }
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.valueOf())) {
    return parsed;
  }

  throw new Error(`Unable to parse timestamp: ${value}`);
};

export const normalizeRow = (row: SalesCsvRow): SalesRow => {
  const ts = toDate(row.ts);
  const qty = Math.abs(row.qty);
  const linetotal = Math.abs(row.linetotal);
  const isCancelled = row.status === "CANCELLED";
  const multiplier = isCancelled ? -1 : 1;

  return {
    ts,
    name: row.name,
    qty,
    pricemode: row.pricemode,
    linetotal,
    status: row.status,
    signedTotal: multiplier * linetotal,
    signedQty: multiplier * qty,
  };
};

export { MAX_ROWS };
