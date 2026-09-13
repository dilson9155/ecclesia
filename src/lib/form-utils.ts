export type FieldLike = {
  key: string;
  type: string;
};

export function buildFormDefaults(fields: readonly FieldLike[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    out[f.key] = f.type === "checkbox" ? false : "";
  }
  return out;
}

export function fillEmptyFields(
  fields: readonly FieldLike[],
  values: Record<string, unknown>
): Record<string, unknown> {
  const out = buildFormDefaults(fields);
  for (const f of fields) {
    if (values[f.key] !== undefined) out[f.key] = values[f.key];
  }
  return out;
}