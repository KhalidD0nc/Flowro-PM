import { promises as fsp } from "fs"
import path from "path"
import os from "os"
import crypto from "crypto"
import { generateSchema, validateGeneratedSchema, type CanonicalTable } from "./schemaAgent"
import type { BuildJob, SupabaseContext } from "./agentPrompt"
import type { ProjectPlan } from "@/lib/project-plan/schema"

const SUPABASE_API_BASE = "https://api.supabase.com"
const PROJECT_READINESS_TIMEOUT_MS = 120000
const PROJECT_READINESS_POLL_INTERVAL_MS = 3000

export type SupabaseProvisionFailureCode =
  | "supabase_provision_failed"
  | "supabase_schema_failed"
  | "supabase_credentials_failed"
  | "supabase_types_failed"

export class SupabaseProvisioningError extends Error {
  code: SupabaseProvisionFailureCode

  constructor(code: SupabaseProvisionFailureCode, message: string) {
    super(message)
    this.name = "SupabaseProvisioningError"
    this.code = code
  }
}

async function readSupabaseToken(): Promise<string | null> {
  if (process.env.SUPABASE_ACCESS_TOKEN?.trim()) {
    return process.env.SUPABASE_ACCESS_TOKEN.trim()
  }

  const tokenPath = path.join(os.homedir(), ".config", "supabase", "access-token")
  try {
    const token = await fsp.readFile(tokenPath, "utf-8")
    return token.trim()
  } catch {
    return null
  }
}

async function makeSupabaseRequest<T>(
  endpoint: string,
  token: string,
  options?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  const url = endpoint.startsWith("http") ? endpoint : `${SUPABASE_API_BASE}${endpoint}`
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error")
    return { ok: false, status: response.status, message: text }
  }

  const contentType = response.headers.get("content-type") || ""
  const data = contentType.includes("application/json")
    ? await response.json().catch(() => ({}))
    : await response.text()
  return { ok: true, data: data as T }
}

interface SupabaseProfile {
  id: string
}

interface SupabaseOrganization {
  id: string
  name: string
  slug?: string
}

interface SupabaseProject {
  id: string
  ref: string
  name: string
  status: string
  organization_id: string
  organization_slug?: string
  region: string
  created_at: string
}

interface SupabaseApiKey {
  name: string
  api_key: string
}

function createDatabasePassword(): string {
  return crypto.randomBytes(24).toString("base64url")
}

function createOrganizationName(projectPlan: ProjectPlan, projectId: string): string {
  const baseName = projectPlan.metadata.productName.trim() || "Flowro App"
  return `${baseName} ${projectId.slice(-6)}`
}

function findConfiguredOrganization(orgs: SupabaseOrganization[]): SupabaseOrganization | null {
  const configuredOrgId = process.env.SUPABASE_ORG_ID?.trim()
  const configuredOrgSlug = process.env.SUPABASE_ORG_SLUG?.trim()

  if (!configuredOrgId && !configuredOrgSlug) {
    return null
  }

  return orgs.find((org) =>
    (configuredOrgId && org.id === configuredOrgId) ||
    (configuredOrgSlug && org.slug === configuredOrgSlug)
  ) || null
}

async function resolveSupabaseOrganization(
  token: string,
  projectPlan: ProjectPlan,
  projectId: string,
  appendLog: (line: string) => Promise<void>,
): Promise<SupabaseOrganization> {
  const orgsResult = await makeSupabaseRequest<SupabaseOrganization[]>("/v1/organizations", token)
  if (!orgsResult.ok) {
    throw new SupabaseProvisioningError("supabase_provision_failed", `Failed to fetch organizations: ${orgsResult.message}`)
  }

  const orgs = orgsResult.data || []
  const configuredOrg = findConfiguredOrganization(orgs)
  if (configuredOrg) {
    await appendLog(`Using configured Supabase organization: ${configuredOrg.name} (${configuredOrg.slug || configuredOrg.id})`)
    return configuredOrg
  }

  if (process.env.SUPABASE_ORG_ID?.trim() || process.env.SUPABASE_ORG_SLUG?.trim()) {
    const availableOrgs = orgs.map((org) => `${org.name} id=${org.id}${org.slug ? ` slug=${org.slug}` : ""}`).join("; ")
    throw new SupabaseProvisioningError(
      "supabase_provision_failed",
      `Configured Supabase organization was not found. Available organizations: ${availableOrgs || "none"}`,
    )
  }

  const organizationName = createOrganizationName(projectPlan, projectId)
  await appendLog(`No Supabase organization configured. Creating organization: ${organizationName}...`)

  const createOrgResult = await makeSupabaseRequest<SupabaseOrganization>("/v1/organizations", token, {
    method: "POST",
    body: JSON.stringify({ name: organizationName }),
  })
  if (!createOrgResult.ok) {
    throw new SupabaseProvisioningError("supabase_provision_failed", `Failed to create Supabase organization: ${createOrgResult.message}`)
  }

  await appendLog(`Created Supabase organization: ${createOrgResult.data.name} (${createOrgResult.data.slug || createOrgResult.data.id})`)
  return createOrgResult.data
}

export async function provisionSupabase(
  job: BuildJob,
  appendLog: (line: string) => Promise<void>,
): Promise<SupabaseContext> {
  const projectPlan = job.projectPlan
  const databasePlan = projectPlan.database

  if (!databasePlan || databasePlan.provider !== "supabase_postgres") {
    throw new SupabaseProvisioningError("supabase_provision_failed", "Supabase provisioning was called for a non-Supabase project.")
  }

  await appendLog("Checking Supabase Management API authentication...")
  const token = await readSupabaseToken()
  if (!token) {
    throw new SupabaseProvisioningError("supabase_provision_failed", "Supabase access token not found. Set SUPABASE_ACCESS_TOKEN in app/.env.local.")
  }

  const profileResult = await makeSupabaseRequest<SupabaseProfile>("/v1/profile", token)
  if (!profileResult.ok) {
    const message = profileResult.status === 401
      ? "Supabase token expired or invalid. Update SUPABASE_ACCESS_TOKEN in app/.env.local."
      : `Supabase token validation failed: ${profileResult.message}`
    throw new SupabaseProvisioningError("supabase_provision_failed", message)
  }
  await appendLog("Supabase token validated.")

  const selectedOrg = await resolveSupabaseOrganization(token, projectPlan, job.projectId, appendLog)

  const dbPassword = createDatabasePassword()
  await appendLog(`Creating Supabase project: ${projectPlan.metadata.productName}...`)

  const createResult = await makeSupabaseRequest<SupabaseProject>("/v1/projects", token, {
    method: "POST",
    body: JSON.stringify({
      name: projectPlan.metadata.productName,
      db_pass: dbPassword,
      organization_id: selectedOrg.id,
      region: process.env.SUPABASE_PROJECT_REGION || "us-east-1",
    }),
  })

  if (!createResult.ok) {
    const message = createResult.status === 429
      ? "Supabase project creation was rate limited. You may have reached the free tier project cap."
      : `Failed to create Supabase project: ${createResult.message}`
    throw new SupabaseProvisioningError("supabase_provision_failed", message)
  }

  const project = createResult.data
  const projectRef = project.ref || project.id
  await appendLog(`Project created: ${projectRef}. Waiting for readiness...`)

  const ready = await pollProjectReady(projectRef, token)
  if (!ready) {
    throw new SupabaseProvisioningError("supabase_provision_failed", "Supabase project did not become ready within the provisioning timeout.")
  }
  await appendLog("Project is active and healthy.")

  await appendLog("Compiling deterministic Supabase schema...")
  const { schemaSQL, rlsPoliciesSQL, canonicalTables } = generateSchema(projectPlan.dataModels, databasePlan)
  const validation = validateGeneratedSchema(schemaSQL, rlsPoliciesSQL, {
    authEnabled: databasePlan.authMode !== "none",
    rlsStrategy: databasePlan.rlsStrategy,
  })
  if (!validation.valid) {
    throw new SupabaseProvisioningError("supabase_schema_failed", `Generated schema failed validation: ${validation.errors.join("; ")}`)
  }

  const migrationPath = buildMigrationPath(projectRef)
  await writeSupabaseArtifacts(job.targetWorkspacePath, projectRef, schemaSQL, canonicalTables, migrationPath)
  await appendLog("Wrote Supabase config, migration, function template, and canonical table metadata.")

  await appendLog("Applying schema and RLS in one transaction...")
  const schemaApplyResult = await applySQL(projectRef, token, schemaSQL)
  if (!schemaApplyResult.ok) {
    throw new SupabaseProvisioningError("supabase_schema_failed", `Schema application failed: ${schemaApplyResult.message}`)
  }
  await appendLog("Schema and RLS applied successfully.")

  await appendLog("Fetching TypeScript database types...")
  const typesContent = await fetchTypescriptTypesWithRetry(projectRef, token, appendLog)
  const typesPath = path.join(job.targetWorkspacePath, "src", "lib", "database.types.ts")
  await fsp.mkdir(path.dirname(typesPath), { recursive: true })
  await fsp.writeFile(typesPath, typesContent, "utf-8")
  await appendLog("Wrote database.types.ts.")

  const credentials = await resolveBrowserCredentials(projectRef, token)
  const projectUrl = `https://${projectRef}.supabase.co`

  const envLocalPath = path.join(job.targetWorkspacePath, ".env.local")
  await fsp.writeFile(
    envLocalPath,
    [
      `VITE_SUPABASE_URL=${projectUrl}`,
      credentials.browserKeyType === "publishable"
        ? `VITE_SUPABASE_PUBLISHABLE_KEY=${credentials.browserKey}`
        : `VITE_SUPABASE_ANON_KEY=${credentials.browserKey}`,
      "",
    ].join("\n"),
    "utf-8",
  )
  await appendLog(`Wrote .env.local with ${credentials.browserKeyType} Supabase browser key.`)

  const browserKeyVar = credentials.browserKeyType === "publishable"
    ? "VITE_SUPABASE_PUBLISHABLE_KEY"
    : "VITE_SUPABASE_ANON_KEY"

  const supabaseClientPath = path.join(job.targetWorkspacePath, "src", "lib", "supabase.ts")
  await fsp.mkdir(path.dirname(supabaseClientPath), { recursive: true })
  await fsp.writeFile(
    supabaseClientPath,
    [
      `import { createClient } from "@supabase/supabase-js"`,
      `import type { Database } from "./database.types"`,
      ``,
      `const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string`,
      `const supabaseKey = (import.meta.env.${browserKeyVar} ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string`,
      ``,
      `export const supabase = createClient<Database>(supabaseUrl, supabaseKey)`,
    ].join("\n"),
    "utf-8",
  )
  await appendLog("Wrote src/lib/supabase.ts Supabase client.")

  const authHelperPath = path.join(job.targetWorkspacePath, "src", "lib", "auth.ts")
  await fsp.writeFile(
    authHelperPath,
    [
      `import { supabase } from "./supabase"`,
      ``,
      `export async function signInWithEmail(email: string, password: string) {`,
      `  return supabase.auth.signInWithPassword({ email, password })`,
      `}`,
      ``,
      `export async function signUpWithEmail(email: string, password: string) {`,
      `  return supabase.auth.signUp({ email, password })`,
      `}`,
      ``,
      `export async function signOut() {`,
      `  return supabase.auth.signOut()`,
      `}`,
      ``,
      `export function onAuthStateChange(`,
      `  callback: Parameters<typeof supabase.auth.onAuthStateChange>[0],`,
      `) {`,
      `  return supabase.auth.onAuthStateChange(callback)`,
      `}`,
    ].join("\n"),
    "utf-8",
  )
  await appendLog("Wrote src/lib/auth.ts auth helpers.")

  return {
    projectRef,
    projectUrl,
    browserKey: credentials.browserKey,
    browserKeyType: credentials.browserKeyType,
    anonKey: credentials.browserKey,
    supabaseProjectId: projectRef,
    canonicalTables,
    migrationPath,
    schemaSQL,
    rlsPoliciesSQL,
    typescriptTypes: typesContent,
  }
}

const TYPES_FETCH_MAX_ATTEMPTS = 4
const TYPES_FETCH_RETRY_DELAY_MS = 4000

async function fetchTypescriptTypesWithRetry(
  projectRef: string,
  token: string,
  appendLog: (line: string) => Promise<void>,
): Promise<string> {
  for (let attempt = 1; attempt <= TYPES_FETCH_MAX_ATTEMPTS; attempt++) {
    const result = await makeSupabaseRequest<string>(`/v1/projects/${projectRef}/types/typescript`, token)
    if (result.ok && typeof result.data === "string" && result.data.trim()) {
      return result.data
    }
    const reason = result.ok ? "empty response" : result.message
    if (attempt < TYPES_FETCH_MAX_ATTEMPTS) {
      await appendLog(`Type generation not ready (attempt ${attempt}/${TYPES_FETCH_MAX_ATTEMPTS}): ${reason}. Retrying in ${TYPES_FETCH_RETRY_DELAY_MS / 1000}s...`)
      await new Promise((r) => setTimeout(r, TYPES_FETCH_RETRY_DELAY_MS))
    } else {
      await appendLog(`Type generation unavailable after ${TYPES_FETCH_MAX_ATTEMPTS} attempts: ${reason}. Using fallback types.`)
    }
  }
  return buildFallbackDatabaseTypes()
}

function buildFallbackDatabaseTypes(): string {
  return [
    `// Auto-generated fallback — Supabase type introspection was not available at build time.`,
    `// Re-run "supabase gen types typescript" locally after the project is fully provisioned.`,
    `export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]`,
    ``,
    `export interface Database {`,
    `  public: {`,
    `    Tables: { [key: string]: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> } }`,
    `    Views: { [key: string]: { Row: Record<string, unknown> } }`,
    `    Functions: { [key: string]: unknown }`,
    `    Enums: { [key: string]: unknown }`,
    `  }`,
    `}`,
  ].join("\n")
}

async function pollProjectReady(projectRef: string, token: string): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < PROJECT_READINESS_TIMEOUT_MS) {
    const result = await makeSupabaseRequest<SupabaseProject>(`/v1/projects/${projectRef}`, token)
    if (result.ok && result.data.status === "ACTIVE_HEALTHY") {
      return true
    }
    await new Promise((r) => setTimeout(r, PROJECT_READINESS_POLL_INTERVAL_MS))
  }
  return false
}

async function applySQL(
  projectRef: string,
  token: string,
  sql: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const result = await makeSupabaseRequest<unknown>(`/v1/projects/${projectRef}/database/query`, token, {
    method: "POST",
    body: JSON.stringify({ query: sql }),
  })
  if (!result.ok) {
    return { ok: false, message: result.message }
  }
  return { ok: true }
}

async function resolveBrowserCredentials(
  projectRef: string,
  token: string,
): Promise<{ browserKey: string; browserKeyType: "publishable" | "anon" }> {
  const apiKeysResult = await makeSupabaseRequest<SupabaseApiKey[]>(`/v1/projects/${projectRef}/api-keys`, token)
  if (!apiKeysResult.ok) {
    throw new SupabaseProvisioningError("supabase_credentials_failed", `Failed to retrieve project API keys: ${apiKeysResult.message}`)
  }

  const keys = Array.isArray(apiKeysResult.data) ? apiKeysResult.data : []
  const publishable = keys.find((key) =>
    key.api_key.startsWith("sb_publishable_") ||
    /publishable/i.test(key.name)
  )
  if (publishable?.api_key) {
    return { browserKey: publishable.api_key, browserKeyType: "publishable" }
  }

  const anon = keys.find((key) =>
    key.name === "anon" ||
    key.name === "anonymous" ||
    /anon/i.test(key.name)
  )
  if (anon?.api_key) {
    return { browserKey: anon.api_key, browserKeyType: "anon" }
  }

  throw new SupabaseProvisioningError("supabase_credentials_failed", "No publishable or anon browser-safe Supabase key was available.")
}

function buildMigrationPath(projectRef: string): string {
  const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)
  return `supabase/migrations/${timestamp}_flowro_generated_schema_${projectRef}.sql`
}

async function writeSupabaseArtifacts(
  workspacePath: string,
  projectRef: string,
  schemaSQL: string,
  canonicalTables: CanonicalTable[],
  migrationPath: string,
): Promise<void> {
  const supabaseDir = path.join(workspacePath, "supabase")
  const functionsDir = path.join(supabaseDir, "functions", "_template")
  const migrationsDir = path.join(supabaseDir, "migrations")
  await fsp.mkdir(functionsDir, { recursive: true })
  await fsp.mkdir(migrationsDir, { recursive: true })

  await fsp.writeFile(
    path.join(supabaseDir, "config.toml"),
    `project_id = "${projectRef}"\n`,
    "utf-8",
  )

  await fsp.writeFile(path.join(workspacePath, migrationPath), `${schemaSQL.trim()}\n`, "utf-8")

  await fsp.writeFile(path.join(functionsDir, "index.ts"), edgeFunctionTemplate(), "utf-8")

  const metadataPath = path.join(workspacePath, "src", "lib", "supabase.schema.ts")
  await fsp.mkdir(path.dirname(metadataPath), { recursive: true })
  await fsp.writeFile(
    metadataPath,
    `export const canonicalTables = ${JSON.stringify(canonicalTables, null, 2)} as const;\n\n` +
      `export type CanonicalTableName = typeof canonicalTables[number]["tableName"];\n`,
    "utf-8",
  )
}

function edgeFunctionTemplate(): string {
  return `import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing authorization header." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) return json({ error: "Supabase env is not configured." }, 500);

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return json({ error: "Invalid or expired session." }, 401);

  return json({ ok: true, userId: data.user.id });
});
`
}
