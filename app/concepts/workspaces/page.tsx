import type { Metadata } from "next"

import { WorkspaceConceptPage } from "@/components/concepts/WorkspaceConceptPage"

export const metadata: Metadata = {
  title: "Workspace Concept | Tattvam AI",
  description: "A concept mockup for workspace-centric saving, artifacts, and recent workspaces.",
}

export default function WorkspacesConceptRoute() {
  return <WorkspaceConceptPage />
}
