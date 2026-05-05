import {
    canonicalizeDataModels,
    generateSchema,
    validateGeneratedSchema,
} from "../lib/build-worker/schemaAgent"
import type { DatabasePlan } from "../lib/project-plan/schema"

const userOwnedPlan: DatabasePlan = {
    provider: "supabase_postgres",
    authMode: "email_only",
    rlsStrategy: "user_owned",
}

function runSchemaAgentTests(): Array<{ name: string; passed: boolean }> {
    return [
        {
            name: "canonicalizeDataModels converts model and field names to stable snake_case",
            passed: (() => {
                const tables = canonicalizeDataModels([
                    {
                        name: "Client Projects",
                        purpose: "Track projects",
                        fields: ["Project Title: string required", "Due Date: date", "Client ID: uuid"],
                    },
                ])
                return tables[0].tableName === "client_projects" &&
                    tables[0].columns.map((column) => column.columnName).join(",") === "project_title,due_date,client_id"
            })(),
        },
        {
            name: "generateSchema emits required base columns and user_id for auth-enabled tables",
            passed: (() => {
                const result = generateSchema([
                    { name: "Task", purpose: "Store tasks", fields: ["Title: string required"] },
                ], userOwnedPlan)
                return result.schemaSQL.includes("id uuid PRIMARY KEY DEFAULT gen_random_uuid()") &&
                    result.schemaSQL.includes("user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL") &&
                    result.schemaSQL.includes("created_at timestamptz NOT NULL DEFAULT now()") &&
                    result.schemaSQL.includes("updated_at timestamptz NOT NULL DEFAULT now()")
            })(),
        },
        {
            name: "generateSchema creates user-owned RLS policies",
            passed: (() => {
                const result = generateSchema([
                    { name: "Task", purpose: "Store tasks", fields: ["Title: string"] },
                ], userOwnedPlan)
                return result.schemaSQL.includes("ALTER TABLE public.task ENABLE ROW LEVEL SECURITY") &&
                    result.schemaSQL.includes("FOR SELECT TO authenticated USING (auth.uid() = user_id)") &&
                    result.schemaSQL.includes("FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)") &&
                    result.schemaSQL.includes("FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)") &&
                    result.schemaSQL.includes("FOR DELETE TO authenticated USING (auth.uid() = user_id)")
            })(),
        },
        {
            name: "public_read_user_write permits intentional public SELECT policies",
            passed: (() => {
                const databasePlan: DatabasePlan = {
                    provider: "supabase_postgres",
                    authMode: "email_only",
                    rlsStrategy: "public_read_user_write",
                }
                const result = generateSchema([
                    { name: "Article", purpose: "Published articles", fields: ["Title: string required"] },
                ], databasePlan)
                const validation = validateGeneratedSchema(result.schemaSQL, result.rlsPoliciesSQL, {
                    authEnabled: true,
                    rlsStrategy: "public_read_user_write",
                })
                return result.schemaSQL.includes("FOR SELECT TO anon, authenticated USING (true)") &&
                    validation.valid
            })(),
        },
        {
            name: "admin_only emits deny-all authenticated policy",
            passed: (() => {
                const databasePlan: DatabasePlan = {
                    provider: "supabase_postgres",
                    authMode: "email_only",
                    rlsStrategy: "admin_only",
                }
                const result = generateSchema([
                    { name: "Audit Log", purpose: "Sensitive logs", fields: ["Message: text"] },
                ], databasePlan)
                return result.schemaSQL.includes("FOR ALL TO authenticated USING (false) WITH CHECK (false)")
            })(),
        },
        {
            name: "anonymous data emits public read/write policies while keeping RLS enabled",
            passed: (() => {
                const databasePlan: DatabasePlan = {
                    provider: "supabase_postgres",
                    authMode: "none",
                    rlsStrategy: "user_owned",
                }
                const result = generateSchema([
                    { name: "Feedback", purpose: "Open feedback", fields: ["Message: text required"] },
                ], databasePlan)
                const validation = validateGeneratedSchema(result.schemaSQL, result.rlsPoliciesSQL, {
                    authEnabled: false,
                    rlsStrategy: "user_owned",
                })
                return result.schemaSQL.includes("ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY") &&
                    result.schemaSQL.includes("FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)") &&
                    !result.schemaSQL.includes("user_id uuid REFERENCES auth.users") &&
                    validation.valid
            })(),
        },
        {
            name: "validation rejects permissive policies unless strategy allows them",
            passed: (() => {
                const schemaSQL = `BEGIN; CREATE TABLE public.tasks (id uuid PRIMARY KEY); ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY; COMMIT;`
                const rlsSQL = `BEGIN; CREATE POLICY "bad" ON public.tasks FOR SELECT USING (true); COMMIT;`
                const strict = validateGeneratedSchema(schemaSQL, rlsSQL)
                const allowed = validateGeneratedSchema(schemaSQL, rlsSQL, {
                    authEnabled: true,
                    rlsStrategy: "public_read_user_write",
                })
                return !strict.valid && allowed.valid
            })(),
        },
        {
            name: "validation rejects missing RLS enable on generated public table",
            passed: (() => {
                const schemaSQL = `BEGIN; CREATE TABLE public.tasks (id uuid PRIMARY KEY); COMMIT;`
                const rlsSQL = `BEGIN; COMMIT;`
                const result = validateGeneratedSchema(schemaSQL, rlsSQL)
                return !result.valid && result.errors.some((error) => error.includes("ENABLE ROW LEVEL SECURITY"))
            })(),
        },
    ]
}

if (require.main === module) {
    const results = runSchemaAgentTests()
    const passed = results.filter((result) => result.passed).length
    console.log("\nSchemaAgent Tests\n")
    results.forEach((result) => {
        console.log(`${result.passed ? "PASS" : "FAIL"}  ${result.name}`)
    })
    console.log(`\nSummary: ${passed}/${results.length} passed`)
    if (passed !== results.length) {
        process.exit(1)
    }
}

export { runSchemaAgentTests }
