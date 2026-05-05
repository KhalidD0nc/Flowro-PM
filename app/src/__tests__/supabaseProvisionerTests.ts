import { readFile } from "fs/promises"
import path from "path"
import {
    disableSupabaseEmailConfirmation,
    SupabaseProvisioningError,
} from "../lib/build-worker/supabaseProvisioner"

type FetchCall = {
    url: string
    init?: RequestInit
}

function installFetchMock(
    response: { status: number; body: unknown },
): { calls: FetchCall[]; restore: () => void } {
    const originalFetch = globalThis.fetch
    const calls: FetchCall[] = []

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        calls.push({ url: String(input), init })
        return new Response(JSON.stringify(response.body), {
            status: response.status,
            headers: { "Content-Type": "application/json" },
        })
    }) as typeof fetch

    return {
        calls,
        restore: () => {
            globalThis.fetch = originalFetch
        },
    }
}

async function authConfigPatchUsesAutoconfirm(): Promise<boolean> {
    const mock = installFetchMock({ status: 200, body: { ok: true } })
    try {
        await disableSupabaseEmailConfirmation("projref123", "test-token")
        const call = mock.calls[0]
        return call.url === "https://api.supabase.com/v1/projects/projref123/config/auth" &&
            call.init?.method === "PATCH" &&
            call.init?.headers instanceof Object &&
            (call.init.headers as Record<string, string>).Authorization === "Bearer test-token" &&
            call.init.body === JSON.stringify({ mailer_autoconfirm: true })
    } finally {
        mock.restore()
    }
}

async function authConfigFailureIsActionable(): Promise<boolean> {
    const mock = installFetchMock({ status: 403, body: { message: "Forbidden" } })
    try {
        await disableSupabaseEmailConfirmation("projref123", "test-token")
        return false
    } catch (error) {
        return error instanceof SupabaseProvisioningError &&
            error.message.includes("Failed to disable Supabase email confirmation") &&
            error.message.includes("auth:write") &&
            error.message.includes("auth_config_write") &&
            error.message.includes("project_admin_write") &&
            error.message.includes("403")
    } finally {
        mock.restore()
    }
}

async function signupTemplateHandlesAutoconfirmAndFallback(): Promise<boolean> {
    const template = await readFile(
        path.resolve(__dirname, "../lib/build-worker/authTemplates/SignupPage.tsx"),
        "utf-8",
    )

    return template.includes("const navigate = useNavigate()") &&
        template.includes("const { data, error } = await signUpWithEmail(email, password)") &&
        template.includes("data.session") &&
        template.includes('navigate("/app")') &&
        template.includes("setSuccess(true)") &&
        template.includes("Check your email")
}

export async function runSupabaseProvisionerTests(): Promise<Array<{ name: string; passed: boolean }>> {
    return [
        {
            name: "disableSupabaseEmailConfirmation patches auth config with mailer_autoconfirm",
            passed: await authConfigPatchUsesAutoconfirm(),
        },
        {
            name: "disableSupabaseEmailConfirmation returns actionable permission errors",
            passed: await authConfigFailureIsActionable(),
        },
        {
            name: "signup template redirects on immediate session and keeps email fallback",
            passed: await signupTemplateHandlesAutoconfirmAndFallback(),
        },
    ]
}

if (require.main === module) {
    runSupabaseProvisionerTests().then((results) => {
        const passed = results.filter((result) => result.passed).length

        console.log("\nSupabaseProvisioner Tests\n")
        results.forEach((result) => {
            console.log(`${result.passed ? "PASS" : "FAIL"}  ${result.name}`)
        })
        console.log(`\nSummary: ${passed}/${results.length} passed`)

        if (passed !== results.length) {
            process.exit(1)
        }
    }).catch((error) => {
        console.error(error)
        process.exit(1)
    })
}
