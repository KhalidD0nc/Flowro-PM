import type { DatabasePlan, DataModelPlan } from "@/lib/project-plan/schema"

export interface CanonicalColumn {
  fieldName: string
  columnName: string
  pgType: string
  required: boolean
}

export interface CanonicalTable {
  modelName: string
  tableName: string
  columns: CanonicalColumn[]
}

export interface SchemaGenerationResult {
  schemaSQL: string
  rlsPoliciesSQL: string
  canonicalTables: CanonicalTable[]
}

export interface SchemaValidationOptions {
  rlsStrategy?: DatabasePlan["rlsStrategy"]
  authEnabled?: boolean
}

const RESERVED_COLUMNS = new Set(["id", "user_id", "created_at", "updated_at"])

function uniqueName(baseName: string, used: Set<string>, fallback: string): string {
  const normalized = baseName || fallback
  let candidate = normalized
  let suffix = 2
  while (used.has(candidate)) {
    candidate = `${normalized}_${suffix}`
    suffix++
  }
  used.add(candidate)
  return candidate
}

export function snakeCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
}

function parseField(field: string): { name: string; descriptor: string } {
  const [name, ...rest] = field.split(":")
  return {
    name: (name || "field").trim(),
    descriptor: rest.join(":").trim(),
  }
}

function isRequiredField(descriptor: string): boolean {
  return /\brequired\b|\bnot\s+null\b/i.test(descriptor)
}

export function inferPgType(fieldDesc: string): string {
  const lower = fieldDesc.toLowerCase()
  if (lower.includes("boolean") || lower.includes("bool")) return "boolean"
  if (lower.includes("integer") || lower.includes("int")) return "integer"
  if (lower.includes("float") || lower.includes("decimal") || lower.includes("double") || lower.includes("number")) return "numeric"
  if (lower.includes("timestamp") || lower.includes("datetime")) return "timestamptz"
  if (lower.includes("date")) return "date"
  if (lower.includes("json") || lower.includes("object") || lower.includes("array")) return "jsonb"
  if (lower.includes("uuid")) return "uuid"
  return "text"
}

export function canonicalizeDataModels(dataModels: DataModelPlan[]): CanonicalTable[] {
  const usedTables = new Set<string>()

  return dataModels.map((model, modelIndex) => {
    const tableName = uniqueName(snakeCase(model.name), usedTables, `model_${modelIndex + 1}`)
    const usedColumns = new Set<string>()

    const columns = model.fields
      .map((field, fieldIndex) => {
        const parsed = parseField(field)
        const columnName = uniqueName(snakeCase(parsed.name), usedColumns, `field_${fieldIndex + 1}`)
        return {
          fieldName: parsed.name,
          columnName,
          pgType: inferPgType(parsed.descriptor),
          required: isRequiredField(parsed.descriptor),
        }
      })
      .filter((column) => !RESERVED_COLUMNS.has(column.columnName))

    return {
      modelName: model.name,
      tableName,
      columns,
    }
  })
}

function quotePolicyName(policyName: string): string {
  return `"${policyName.replace(/"/g, "\"\"")}"`
}

function buildTableSQL(table: CanonicalTable, authEnabled: boolean): string {
  const lines = [
    `CREATE TABLE IF NOT EXISTS public.${table.tableName} (`,
    "  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),",
  ]

  if (authEnabled) {
    lines.push("  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,")
  }

  for (const column of table.columns) {
    lines.push(`  ${column.columnName} ${column.pgType}${column.required ? " NOT NULL" : ""},`)
  }

  lines.push("  created_at timestamptz NOT NULL DEFAULT now(),")
  lines.push("  updated_at timestamptz NOT NULL DEFAULT now()")
  lines.push(");")

  if (authEnabled) {
    lines.push(`CREATE INDEX IF NOT EXISTS idx_${table.tableName}_user_id ON public.${table.tableName}(user_id);`)
  }

  lines.push(`DROP TRIGGER IF EXISTS update_${table.tableName}_updated_at ON public.${table.tableName};`)
  lines.push(`CREATE TRIGGER update_${table.tableName}_updated_at`)
  lines.push(`BEFORE UPDATE ON public.${table.tableName}`)
  lines.push("FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();")

  return lines.join("\n")
}

function buildPolicySQL(table: CanonicalTable, databasePlan: DatabasePlan, authEnabled: boolean): string {
  const tableRef = `public.${table.tableName}`
  const policyLines = [
    `ALTER TABLE ${tableRef} ENABLE ROW LEVEL SECURITY;`,
    `DROP POLICY IF EXISTS ${quotePolicyName(`${table.tableName}_select_policy`)} ON ${tableRef};`,
    `DROP POLICY IF EXISTS ${quotePolicyName(`${table.tableName}_insert_policy`)} ON ${tableRef};`,
    `DROP POLICY IF EXISTS ${quotePolicyName(`${table.tableName}_update_policy`)} ON ${tableRef};`,
    `DROP POLICY IF EXISTS ${quotePolicyName(`${table.tableName}_delete_policy`)} ON ${tableRef};`,
    `DROP POLICY IF EXISTS ${quotePolicyName(`${table.tableName}_admin_policy`)} ON ${tableRef};`,
    `DROP POLICY IF EXISTS ${quotePolicyName(`${table.tableName}_anon_select`)} ON ${tableRef};`,
    `DROP POLICY IF EXISTS ${quotePolicyName(`${table.tableName}_anon_all`)} ON ${tableRef};`,
  ]

  if (authEnabled && databasePlan.rlsStrategy === "user_owned") {
    policyLines.push(`CREATE POLICY ${quotePolicyName(`${table.tableName}_select_policy`)} ON ${tableRef} FOR SELECT TO authenticated USING (auth.uid() = user_id);`)
    policyLines.push(`CREATE POLICY ${quotePolicyName(`${table.tableName}_insert_policy`)} ON ${tableRef} FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);`)
    policyLines.push(`CREATE POLICY ${quotePolicyName(`${table.tableName}_update_policy`)} ON ${tableRef} FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`)
    policyLines.push(`CREATE POLICY ${quotePolicyName(`${table.tableName}_delete_policy`)} ON ${tableRef} FOR DELETE TO authenticated USING (auth.uid() = user_id);`)
  } else if (authEnabled && databasePlan.rlsStrategy === "public_read_user_write") {
    policyLines.push(`CREATE POLICY ${quotePolicyName(`${table.tableName}_select_policy`)} ON ${tableRef} FOR SELECT TO anon, authenticated USING (true);`)
    policyLines.push(`CREATE POLICY ${quotePolicyName(`${table.tableName}_insert_policy`)} ON ${tableRef} FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);`)
    policyLines.push(`CREATE POLICY ${quotePolicyName(`${table.tableName}_update_policy`)} ON ${tableRef} FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`)
    policyLines.push(`CREATE POLICY ${quotePolicyName(`${table.tableName}_delete_policy`)} ON ${tableRef} FOR DELETE TO authenticated USING (auth.uid() = user_id);`)
  } else if (databasePlan.rlsStrategy === "admin_only") {
    policyLines.push(`CREATE POLICY ${quotePolicyName(`${table.tableName}_admin_policy`)} ON ${tableRef} FOR ALL TO authenticated USING (false) WITH CHECK (false);`)
  } else {
    policyLines.push(`CREATE POLICY ${quotePolicyName(`${table.tableName}_anon_select`)} ON ${tableRef} FOR SELECT TO anon, authenticated USING (true);`)
    policyLines.push(`CREATE POLICY ${quotePolicyName(`${table.tableName}_anon_all`)} ON ${tableRef} FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`)
  }

  return policyLines.join("\n")
}

export function generateSchema(
  dataModels: DataModelPlan[],
  databasePlan: DatabasePlan,
): SchemaGenerationResult {
  const canonicalTables = canonicalizeDataModels(dataModels)
  const authEnabled = databasePlan.authMode !== "none"

  const tableSQL = canonicalTables.map((table) => buildTableSQL(table, authEnabled))
  const rlsPoliciesSQL = canonicalTables.map((table) => buildPolicySQL(table, databasePlan, authEnabled)).join("\n\n")

  const body = [
    "BEGIN;",
    "CREATE EXTENSION IF NOT EXISTS pgcrypto;",
    `CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;`,
    ...tableSQL,
    rlsPoliciesSQL,
    "COMMIT;",
  ].filter(Boolean).join("\n\n")

  return {
    schemaSQL: body,
    rlsPoliciesSQL: rlsPoliciesSQL ? `BEGIN;\n${rlsPoliciesSQL}\nCOMMIT;` : "BEGIN;\nCOMMIT;",
    canonicalTables,
  }
}

function allowsPermissiveSelect(options?: SchemaValidationOptions): boolean {
  if (!options) return false
  if (options.authEnabled === false) return true
  return options.rlsStrategy === "public_read_user_write"
}

export function validateGeneratedSchema(
  schemaSQL: string,
  rlsPoliciesSQL: string,
  options?: SchemaValidationOptions,
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const combinedSQL = `${schemaSQL}\n${rlsPoliciesSQL}`

  const beginCount = (schemaSQL.match(/\bBEGIN\s*;/gi) || []).length
  const commitCount = (schemaSQL.match(/\bCOMMIT\s*;/gi) || []).length
  if (beginCount !== commitCount) {
    errors.push(`Schema SQL has unbalanced transactions: ${beginCount} BEGIN, ${commitCount} COMMIT`)
  }

  const rlsBeginCount = (rlsPoliciesSQL.match(/\bBEGIN\s*;/gi) || []).length
  const rlsCommitCount = (rlsPoliciesSQL.match(/\bCOMMIT\s*;/gi) || []).length
  if (rlsBeginCount !== rlsCommitCount) {
    errors.push(`RLS SQL has unbalanced transactions: ${rlsBeginCount} BEGIN, ${rlsCommitCount} COMMIT`)
  }

  for (const { pattern, label } of [
    { pattern: /\bDROP\s+TABLE\b/i, label: "DROP TABLE" },
    { pattern: /\bTRUNCATE\b/i, label: "TRUNCATE" },
    { pattern: /\bDROP\s+SCHEMA\b/i, label: "DROP SCHEMA" },
  ]) {
    if (pattern.test(combinedSQL)) {
      errors.push(`Dangerous operation detected: ${label}`)
    }
  }

  const tableNames: string[] = []
  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-z_][a-z0-9_]*)/gi
  let match: RegExpExecArray | null
  while ((match = createTableRegex.exec(schemaSQL)) !== null) {
    tableNames.push(match[1])
  }

  for (const tableName of tableNames) {
    const rlsEnableRegex = new RegExp(`ALTER\\s+TABLE\\s+(?:public\\.)?${tableName}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, "i")
    if (!rlsEnableRegex.test(combinedSQL)) {
      errors.push(`Table '${tableName}' is missing ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
    }
  }

  if (!allowsPermissiveSelect(options)) {
    const permissivePatterns = [/USING\s*\(\s*true\s*\)/i, /USING\s*\(\s*1\s*=\s*1\s*\)/i]
    for (const pattern of permissivePatterns) {
      if (pattern.test(rlsPoliciesSQL)) {
        errors.push(`Permissive RLS policy detected: ${pattern.source}. This exposes all rows to all users.`)
      }
    }
  }

  return { valid: errors.length === 0, errors }
}
