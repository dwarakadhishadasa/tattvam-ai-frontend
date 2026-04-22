import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const queryMock = vi.fn()
const poolConstructorMock = vi.fn(function MockPool() {
  return {
    query: queryMock,
  }
})

vi.mock("pg", () => ({
  Pool: poolConstructorMock,
}))

describe("citation content store", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
    vi.resetModules()
  })

  it("reads lecture citation content from postgres using a dedicated database url", async () => {
    vi.stubEnv(
      "TATTVAM_LECTURE_CITATIONS_DATABASE_URL",
      "postgres://citations.example.com:6543/postgres?sslmode=require",
    )
    vi.stubEnv("TATTVAM_LECTURE_CITATIONS_TABLE", "public.lecture_citations")
    queryMock.mockResolvedValue({
      rows: [
        {
          url: "https://youtu.be/AAAAABBBBB1?t=11",
          content: "Hydrated lecture excerpt",
        },
        {
          url: "https://youtu.be/CCCCCDDDDD2?t=22",
          content: null,
        },
      ],
    })

    const { getCitationContentByUrls } = await import("../../lib/chat/citation-content-store")
    const result = await getCitationContentByUrls([
      "https://youtu.be/AAAAABBBBB1?t=11",
      "https://youtu.be/CCCCCDDDDD2?t=22",
      "https://youtu.be/AAAAABBBBB1?t=11",
      "",
    ])

    expect(poolConstructorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionString: "postgres://citations.example.com:6543/postgres?sslmode=require",
        max: 3,
        idleTimeoutMillis: 10_000,
        connectionTimeoutMillis: 5_000,
        allowExitOnIdle: true,
      }),
    )
    expect(queryMock).toHaveBeenCalledWith(
      'select url, content from "public"."lecture_citations" where url = any($1::text[])',
      [[
        "https://youtu.be/AAAAABBBBB1?t=11",
        "https://youtu.be/CCCCCDDDDD2?t=22",
      ]],
    )
    expect(result).toEqual(
      new Map([
        ["https://youtu.be/AAAAABBBBB1?t=11", "Hydrated lecture excerpt"],
        ["https://youtu.be/CCCCCDDDDD2?t=22", ""],
      ]),
    )
  })

  it("falls back to POSTGRES_URL when a dedicated citation database url is not configured", async () => {
    vi.stubEnv("POSTGRES_URL", "postgres://fallback.example.com:6543/postgres?sslmode=require")
    queryMock.mockResolvedValue({ rows: [] })

    const { getCitationContentByUrls } = await import("../../lib/chat/citation-content-store")
    await getCitationContentByUrls(["https://youtu.be/AAAAABBBBB1?t=11"])

    expect(poolConstructorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionString: "postgres://fallback.example.com:6543/postgres?sslmode=require",
      }),
    )
  })

  it("strips wrapping quotes from the configured database url", async () => {
    vi.stubEnv(
      "TATTVAM_LECTURE_CITATIONS_DATABASE_URL",
      '"postgres://quoted.example.com:6543/postgres?sslmode=no-verify&supa=base-pooler.x"',
    )
    queryMock.mockResolvedValue({ rows: [] })

    const { getCitationContentByUrls } = await import("../../lib/chat/citation-content-store")
    await getCitationContentByUrls(["https://youtu.be/AAAAABBBBB1?t=11"])

    expect(poolConstructorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionString:
          "postgres://quoted.example.com:6543/postgres?sslmode=no-verify&supa=base-pooler.x",
        ssl: {
          rejectUnauthorized: false,
        },
      }),
    )
  })

  it("throws a configuration error when no database url is available", async () => {
    const {
      getCitationContentByUrls,
      LectureCitationStoreConfigurationError,
    } = await import("../../lib/chat/citation-content-store")

    await expect(getCitationContentByUrls(["https://youtu.be/AAAAABBBBB1?t=11"])).rejects.toBeInstanceOf(
      LectureCitationStoreConfigurationError,
    )
  })

  it("enables relaxed tls validation when the database url requests sslmode=no-verify", async () => {
    vi.stubEnv(
      "TATTVAM_LECTURE_CITATIONS_DATABASE_URL",
      "postgres://citations.example.com:5432/postgres?sslmode=no-verify",
    )
    queryMock.mockResolvedValue({ rows: [] })

    const { getCitationContentByUrls } = await import("../../lib/chat/citation-content-store")
    await getCitationContentByUrls(["https://youtu.be/AAAAABBBBB1?t=11"])

    expect(poolConstructorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ssl: {
          rejectUnauthorized: false,
        },
      }),
    )
  })
})
