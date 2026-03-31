import { afterEach, describe, expect, it, vi } from "vitest"

import {
  ExtractionChatTargetsConfigurationError,
  getExtractionChatTargets,
} from "../../lib/chat/targets"

describe("extraction chat target registry", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("parses the approved four-target extraction registry", () => {
    vi.stubEnv(
      "TATTVAM_EXTRACTION_CHAT_TARGETS_JSON",
      JSON.stringify([
        {
          key: "ISKCON Bangalore Lectures",
          label: "From Senior devotees lectures",
          notebookId: "one",
        },
        {
          key: "Bhaktivedanta NotebookLM",
          label: "From Srila Prabhupad's books",
          notebookId: "two",
        },
        {
          key: "Srila Prabhupada Letters & Correspondence",
          label: "From Srila Prabhupad's letters and correspondence",
          notebookId: "three",
        },
        {
          key: "Srila Prabhupada Audio Transcripts",
          label: "From Srila Prabhupad's audio transcripts",
          notebookId: "four",
        },
      ]),
    )

    expect(getExtractionChatTargets()).toEqual([
      {
        key: "ISKCON Bangalore Lectures",
        label: "From Senior devotees lectures",
        notebookId: "one",
      },
      {
        key: "Bhaktivedanta NotebookLM",
        label: "From Srila Prabhupad's books",
        notebookId: "two",
      },
      {
        key: "Srila Prabhupada Letters & Correspondence",
        label: "From Srila Prabhupad's letters and correspondence",
        notebookId: "three",
      },
      {
        key: "Srila Prabhupada Audio Transcripts",
        label: "From Srila Prabhupad's audio transcripts",
        notebookId: "four",
      },
    ])
  })

  it("canonicalizes approved labels when env labels omit apostrophes", () => {
    vi.stubEnv(
      "TATTVAM_EXTRACTION_CHAT_TARGETS_JSON",
      JSON.stringify([
        {
          key: "ISKCON Bangalore Lectures",
          label: "From Senior devotees lectures",
          notebookId: "one",
        },
        {
          key: "Bhaktivedanta NotebookLM",
          label: "From Srila Prabhupads books",
          notebookId: "two",
        },
        {
          key: "Srila Prabhupada Letters & Correspondence",
          label: "From Srila Prabhupads letters and correspondence",
          notebookId: "three",
        },
        {
          key: "Srila Prabhupada Audio Transcripts",
          label: "From Srila Prabhupads audio transcripts",
          notebookId: "four",
        },
      ]),
    )

    expect(getExtractionChatTargets()).toEqual([
      {
        key: "ISKCON Bangalore Lectures",
        label: "From Senior devotees lectures",
        notebookId: "one",
      },
      {
        key: "Bhaktivedanta NotebookLM",
        label: "From Srila Prabhupad's books",
        notebookId: "two",
      },
      {
        key: "Srila Prabhupada Letters & Correspondence",
        label: "From Srila Prabhupad's letters and correspondence",
        notebookId: "three",
      },
      {
        key: "Srila Prabhupada Audio Transcripts",
        label: "From Srila Prabhupad's audio transcripts",
        notebookId: "four",
      },
    ])
  })

  it("rejects malformed registry json", () => {
    vi.stubEnv("TATTVAM_EXTRACTION_CHAT_TARGETS_JSON", "[")

    expect(() => getExtractionChatTargets()).toThrowError(
      ExtractionChatTargetsConfigurationError,
    )
    expect(() => getExtractionChatTargets()).toThrowError(
      "TATTVAM_EXTRACTION_CHAT_TARGETS_JSON must be valid JSON",
    )
  })

  it("rejects duplicate or unapproved targets", () => {
    vi.stubEnv(
      "TATTVAM_EXTRACTION_CHAT_TARGETS_JSON",
      JSON.stringify([
        {
          key: "ISKCON Bangalore Lectures",
          label: "From Senior devotees lectures",
          notebookId: "one",
        },
        {
          key: "ISKCON Bangalore Lectures",
          label: "From Senior devotees lectures",
          notebookId: "two",
        },
        {
          key: "Srila Prabhupada Letters & Correspondence",
          label: "From Srila Prabhupad's letters and correspondence",
          notebookId: "three",
        },
        {
          key: "Srila Prabhupada Audio Transcripts",
          label: "From Srila Prabhupad's audio transcripts",
          notebookId: "four",
        },
      ]),
    )

    expect(() => getExtractionChatTargets()).toThrowError(
      "Extraction chat target keys must be unique",
    )
  })

  it("rejects missing approved targets even when four rows are present", () => {
    vi.stubEnv(
      "TATTVAM_EXTRACTION_CHAT_TARGETS_JSON",
      JSON.stringify([
        {
          key: "ISKCON Bangalore Lectures",
          label: "From Senior devotees lectures",
          notebookId: "one",
        },
        {
          key: "Bhaktivedanta NotebookLM",
          label: "From Srila Prabhupad's books",
          notebookId: "two",
        },
        {
          key: "Srila Prabhupada Letters & Correspondence",
          label: "From Srila Prabhupad's letters and correspondence",
          notebookId: "three",
        },
        {
          key: "Unexpected Target",
          label: "Wrong label",
          notebookId: "four",
        },
      ]),
    )

    expect(() => getExtractionChatTargets()).toThrowError(
      "Target Unexpected Target does not match the approved extraction target registry",
    )
  })

  it("rejects approved keys paired with the wrong approved label", () => {
    vi.stubEnv(
      "TATTVAM_EXTRACTION_CHAT_TARGETS_JSON",
      JSON.stringify([
        {
          key: "ISKCON Bangalore Lectures",
          label: "From Senior devotees lectures",
          notebookId: "one",
        },
        {
          key: "Bhaktivedanta NotebookLM",
          label: "From Srila Prabhupad's letters and correspondence",
          notebookId: "two",
        },
        {
          key: "Srila Prabhupada Letters & Correspondence",
          label: "From Srila Prabhupad's letters and correspondence",
          notebookId: "three",
        },
        {
          key: "Srila Prabhupada Audio Transcripts",
          label: "From Srila Prabhupad's audio transcripts",
          notebookId: "four",
        },
      ]),
    )

    expect(() => getExtractionChatTargets()).toThrowError(
      "Target Bhaktivedanta NotebookLM does not match the approved extraction target registry",
    )
  })
})
