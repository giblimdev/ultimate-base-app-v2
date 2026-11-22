/*
path :           app/(app)/scrum/projects/[projectId]/json/page.tsx
tag :            ["scrum", "projects", "json", "import", "export", "page",
                  "server"]
projectId:       <UltimateBaseApp>
type:            page
generic:         false

role:            Page import/export JSON d'un projet Scrum. Server Component
                 wrapper avec <Suspense> (requis par Next.js 16 +
                 cacheComponents pour les routes dynamiques). JsonContent
                 charge l'arbre via loadScrumTree puis rend ProjectJsonPanel
                 (client) en lui passant l'arbre. La key du panneau dépend de
                 project.updatedAt pour réinitialiser son état local après
                 chaque import (bulkUpsertEntities met à jour updatedAt).
                 Si l'arbre est absent, notFound().

flow:            JsonPage({ params }) → <Suspense fallback> → JsonContent
                 (params) → await params → loadScrumTree → notFound si null →
                 header + <ProjectJsonPanel key={updatedAt} scrumId
                 projectKey tree />.

ecosystem:       Scrum = [
                   "@/app/(app)/scrum/actions/bulk.ts",
                   "@/app/(app)/scrum/actions/dnd.ts",
                   "@/app/(app)/scrum/actions/epic.ts",
                   "@/app/(app)/scrum/actions/feature.ts",
                   "@/app/(app)/scrum/actions/import-project.ts",
                   "@/app/(app)/scrum/actions/persona.ts",
                   "@/app/(app)/scrum/actions/project.ts",
                   "@/app/(app)/scrum/actions/sprint.ts",
                   "@/app/(app)/scrum/actions/task.ts",
                   "@/app/(app)/scrum/actions/us.ts",
                   "@/app/(app)/scrum/page.tsx",
                   "@/app/(app)/scrum/projects/[projectId]/dnd/page.tsx",
                   "@/app/(app)/scrum/projects/[projectId]/edit/page.tsx",
                   "@/app/(app)/scrum/projects/[projectId]/epics/page.tsx",
                   "@/app/(app)/scrum/projects/[projectId]/features/page.tsx",
                   "@/app/(app)/scrum/projects/[projectId]/json/page.tsx",
                   "@/app/(app)/scrum/projects/[projectId]/page.tsx",
                   "@/app/(app)/scrum/projects/[projectId]/personas/page.tsx",
                   "@/app/(app)/scrum/projects/[projectId]/project-detail-content.tsx",
                   "@/app/(app)/scrum/projects/[projectId]/sprints/page.tsx",
                   "@/app/(app)/scrum/projects/[projectId]/tasks/page.tsx",
                   "@/app/(app)/scrum/projects/[projectId]/us/page.tsx",
                   "@/app/(app)/scrum/projects/import/page.tsx",
                   "@/app/(app)/scrum/projects/new/page.tsx",
                   "@/app/(app)/scrum/projects/page.tsx",
                   "@/components/scrum/DeleteProjectButton.tsx",
                   "@/components/scrum/DndBoard.tsx",
                   "@/components/scrum/EpicBoard.tsx",
                   "@/components/scrum/FeatureBoard.tsx",
                   "@/components/scrum/JsonEditor.tsx",
                   "@/components/scrum/PersonaBoard.tsx",
                   "@/components/scrum/ProjectDndBoards.tsx",
                   "@/components/scrum/ProjectForm.tsx",
                   "@/components/scrum/ProjectJsonPanel.tsx",
                   "@/components/scrum/ProjectSummaryCard.tsx",
                   "@/components/scrum/SprintBoard.tsx",
                   "@/components/scrum/TaskBoard.tsx",
                   "@/components/scrum/UserStoryBoard.tsx",
                   "@/lib/scrum/access.ts",
                   "@/lib/scrum/bulk.ts",
                   "@/lib/scrum/defaults.ts",
                   "@/lib/scrum/import-export.ts",
                   "@/lib/scrum/json-io.ts",
                   "@/lib/scrum/mutations.ts",
                   "@/lib/scrum/queries.ts",
                   "@/lib/scrum/schema.ts",
                   "@/lib/scrum/types.ts",
                 ]
relatedFiles:    ["@/lib/scrum/queries.ts",
                  "@/components/scrum/ProjectJsonPanel.tsx",
                  "@/app/(app)/scrum/projects/[projectId]/page.tsx",
                  "@/app/(app)/scrum/projects/[projectId]/project-detail-content.tsx"]
imports:         ["react", "next/navigation", "next/link", "lucide-react",
                  "@/lib/scrum/queries",
                  "@/components/scrum/ProjectJsonPanel",
                  "@/components/ui/button"]
exports:         ["default JsonPage"]
useBy:           ["@/app/(app)/scrum/projects/[projectId]/project-detail-content.tsx"]

userStories:     ["*en tant qu'utilisateur je veux exporter et importer le JSON de mon projet",
                  "*en tant qu'utilisateur je veux éditer mes items Scrum en texte JSON"]
status:          wip
pathChecked:     ✘false
metaDataChecked: ✘false
scriptChecked:   ✘false
*/
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { loadScrumTree } from "@/lib/scrum/queries";
import { ProjectJsonPanel } from "@/components/scrum/ProjectJsonPanel";
import { Button } from "@/components/ui/button";

async function JsonContent({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const tree = await loadScrumTree(projectId);
  if (!tree) notFound();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-2">
        <Button
          nativeButton={false}
          variant="ghost"
          size="sm"
          className="w-fit"
          render={<Link href={`/scrum/projects/${projectId}`} />}
        >
          <ArrowLeft className="size-4" aria-hidden />
          Projet
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Import / export JSON · {tree.project.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Exportez le projet, ou éditez et importez des tableaux de features,
          personas, epics, sprints, user stories et tasks.
        </p>
      </header>

      <ProjectJsonPanel
        key={tree.project.updatedAt}
        scrumId={projectId}
        projectKey={tree.project.key}
        tree={tree}
      />
    </div>
  );
}

export default function JsonPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-2 px-4 py-12 sm:px-6">
          <p className="text-sm text-muted-foreground">Chargement…</p>
        </div>
      }
    >
      <JsonContent params={params} />
    </Suspense>
  );
}