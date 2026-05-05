import { promises as fsp } from "fs"
import { execFile } from "child_process"
import os from "os"
import path from "path"
import { promisify } from "util"

const SUPABASE_API_BASE = "https://api.supabase.com"
const execFileAsync = promisify(execFile)

type SupabaseApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string }

interface SupabaseProfile {
  id: string
  email?: string
}

interface SupabaseOrganization {
  id: string
  name: string
  slug?: string
}

async function readOrganizationsFromCli(): Promise<SupabaseOrganization[] | null> {
  try {
    const { stdout } = await execFileAsync("supabase", ["orgs", "list", "--output", "json"], {
      maxBuffer: 1024 * 1024,
    })
    const parsed = JSON.parse(stdout) as SupabaseOrganization[]
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

async function readSupabaseToken(): Promise<{ token: string; source: string } | null> {
  if (process.env.SUPABASE_ACCESS_TOKEN?.trim()) {
    return {
      token: process.env.SUPABASE_ACCESS_TOKEN.trim(),
      source: "SUPABASE_ACCESS_TOKEN",
    }
  }

  const tokenPath = path.join(os.homedir(), ".config", "supabase", "access-token")
  try {
    const token = (await fsp.readFile(tokenPath, "utf-8")).trim()
    return token ? { token, source: tokenPath } : null
  } catch {
    return null
  }
}

async function makeSupabaseRequest<T>(
  endpoint: string,
  token: string,
): Promise<SupabaseApiResult<T>> {
  const response = await fetch(`${SUPABASE_API_BASE}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const message = await response.text().catch(() => "Unknown error")
    return { ok: false, status: response.status, message }
  }

  return {
    ok: true,
    data: (await response.json().catch(() => ({}))) as T,
  }
}

async function main() {
  const cliOrganizations = await readOrganizationsFromCli()
  if (cliOrganizations) {
    console.log("Organization source: supabase CLI")
    displayOrganizations(cliOrganizations)
    return
  }

  const tokenResult = await readSupabaseToken()
  if (!tokenResult) {
    console.error("Supabase access token not found.")
    console.error("Run `supabase login`, or set SUPABASE_ACCESS_TOKEN for direct API fallback.")
    process.exit(1)
  }

  console.log(`Token source: ${tokenResult.source}`)

  const profileResult = await makeSupabaseRequest<SupabaseProfile>("/v1/profile", tokenResult.token)
  if (!profileResult.ok) {
    console.error(`Failed to validate Supabase token (${profileResult.status}).`)
    console.error(profileResult.message)
    process.exit(1)
  }

  console.log(`Profile: ${profileResult.data.email || profileResult.data.id}`)

  const orgsResult = await makeSupabaseRequest<SupabaseOrganization[] | { organizations: SupabaseOrganization[] }>(
    "/v1/organizations",
    tokenResult.token,
  )
  if (!orgsResult.ok) {
    console.error(`Failed to fetch Supabase organizations (${orgsResult.status}).`)
    console.error(orgsResult.message)
    process.exit(1)
  }

  displayOrganizations(Array.isArray(orgsResult.data) ? orgsResult.data : orgsResult.data.organizations || [])
}

function displayOrganizations(organizations: SupabaseOrganization[]) {
  if (organizations.length === 0) {
    console.log("No Supabase organizations found for this account.")
    console.log("Build-worker behavior: creates a new organization, then creates the project in it.")
    return
  }

  const sortedOrganizations = [...organizations].sort((a, b) => a.name.localeCompare(b.name))
  const configuredOrgId = process.env.SUPABASE_ORG_ID?.trim()
  const configuredOrgSlug = process.env.SUPABASE_ORG_SLUG?.trim()
  const selectedOrganization = sortedOrganizations.find((organization) =>
    (configuredOrgId && organization.id === configuredOrgId) ||
    (configuredOrgSlug && organization.slug === configuredOrgSlug)
  )

  console.log(`Organizations: ${organizations.length}`)
  console.table(
    sortedOrganizations.map((organization, index) => ({
      selected_by_current_code: selectedOrganization && organization.id === selectedOrganization.id ? "yes" : "",
      sorted_index: index + 1,
      name: organization.name,
      id: organization.id,
      slug: organization.slug || "",
    })),
  )

  console.log("Build-worker behavior:")
  if (selectedOrganization) {
    console.log(`Uses configured organization: ${selectedOrganization.name} (${selectedOrganization.slug || selectedOrganization.id})`)
  } else if (configuredOrgId || configuredOrgSlug) {
    console.log("Configured organization was not found. Build should stop instead of guessing.")
  } else {
    console.log("No organization configured. Build creates a new organization, then creates the project in it.")
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
