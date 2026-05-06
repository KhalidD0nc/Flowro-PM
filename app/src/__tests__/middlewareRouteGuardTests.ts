import { NextRequest } from "next/server"
import { isPublicLandingHost, isPublicLandingPath, middleware } from "../middleware"

type TestCase = {
  name: string
  run: () => boolean
}

const tests: TestCase[] = [
  {
    name: "flowro.app is treated as the public landing host",
    run: () => isPublicLandingHost("flowro.app"),
  },
  {
    name: "www.flowro.app is treated as the public landing host",
    run: () => isPublicLandingHost("www.flowro.app"),
  },
  {
    name: "localhost is not treated as the public landing host",
    run: () => !isPublicLandingHost("localhost:3000"),
  },
  {
    name: "/auth is blocked on the public landing host",
    run: () => !isPublicLandingPath("/auth"),
  },
  {
    name: "/app is blocked on the public landing host",
    run: () => !isPublicLandingPath("/app"),
  },
  {
    name: "/privacy remains public",
    run: () => isPublicLandingPath("/privacy"),
  },
  {
    name: "/terms remains public",
    run: () => isPublicLandingPath("/terms"),
  },
  {
    name: "/api/projects is blocked on the public landing host",
    run: () => !isPublicLandingPath("/api/projects"),
  },
  {
    name: "Next static assets remain public",
    run: () => isPublicLandingPath("/_next/static/chunks/app.js"),
  },
  {
    name: "public image assets remain public",
    run: () => isPublicLandingPath("/logo.svg"),
  },
  {
    name: "https://flowro.app/auth redirects to /",
    run: () => {
      const response = middleware(
        new NextRequest("https://flowro.app/auth", {
          headers: { host: "flowro.app" },
        })
      )

      return response.status === 307 && response.headers.get("location") === "https://flowro.app/"
    },
  },
  {
    name: "https://flowro.app/app redirects to /",
    run: () => {
      const response = middleware(
        new NextRequest("https://flowro.app/app", {
          headers: { host: "flowro.app" },
        })
      )

      return response.status === 307 && response.headers.get("location") === "https://flowro.app/"
    },
  },
  {
    name: "https://flowro.app/api/projects returns JSON 404",
    run: () => {
      const response = middleware(
        new NextRequest("https://flowro.app/api/projects", {
          headers: { host: "flowro.app" },
        })
      )

      return response.status === 404 && response.headers.get("content-type")?.includes("application/json") === true
    },
  },
  {
    name: "/examples/timeless/ is public on flowro.app (regression: iframe bug)",
    run: () => isPublicLandingPath("/examples/timeless/"),
  },
  {
    name: "/examples/salon-rawnq/ is public on flowro.app (regression: iframe bug)",
    run: () => isPublicLandingPath("/examples/salon-rawnq/"),
  },
  {
    name: "https://flowro.app/examples/timeless/ does NOT redirect to /",
    run: () => {
      const response = middleware(
        new NextRequest("https://flowro.app/examples/timeless/", {
          headers: { host: "flowro.app" },
        })
      )
      // Should NOT be a redirect (307), should pass through
      return response.status !== 307
    },
  },
  {
    name: "http://localhost:3000/auth still passes through",
    run: () => {
      const response = middleware(
        new NextRequest("http://localhost:3000/auth", {
          headers: { host: "localhost:3000" },
        })
      )

      return response.status === 200 && response.headers.get("x-middleware-next") === "1"
    },
  },
]

let failed = 0

for (const test of tests) {
  if (!test.run()) {
    failed += 1
    console.error(`FAIL: ${test.name}`)
  } else {
    console.log(`PASS: ${test.name}`)
  }
}

if (failed > 0) {
  process.exitCode = 1
}
