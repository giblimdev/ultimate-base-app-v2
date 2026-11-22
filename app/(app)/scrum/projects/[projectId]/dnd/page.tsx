/*
path :           app/(app)/scrum/projects/[projectId]/dnd/page.tsx
tag :            ["scrum", "dnd", "page", "server", "tasks", "user-story",
                  "epic", "sprint", "sortable"]
projectId:       <UltimateBaseApp>
type:            page
generic:         false

role:            Page DnD d'un projet Scrum. Server Component wrapper +
                 Suspense (requis par Next.js 16 + cacheComponents). DndContent
                 charge l'arbre via loadScrumTree puis délègue TOUT le rendu
                 interactif à ProjectDndBoards (Client Component) en ne lui
                 passant que des données sérialisables. Corrige l'erreur
                 « Functions cannot be passed directly to Client Components »
                 de l'ancienne version (onMove/onReorder inline).

flow:            DndPage({ params }) → <Suspense> → DndContent(params) →
                 loadScrumTree → notFound si null → header + <ProjectDndBoards
                 scrumId tasks userStories epics sprints />.

ecosystem:       Scrum = [
                   "@/app/(app)/scrum/actions/dnd.ts",
                   "@/app/(app)/scrum/actions/epic.ts",
                   "@/app/(app)/scrum/actions/feature.ts",
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
                   "@/app/(app)/scrum/projects/[projectId]/page.tsx",
                   "@/app/(app)/scrum/projects/[projectId]/personas/page.tsx",
                   "@/app/(app)/scrum/projects/[projectId]/project-detail-content.tsx",
                   "@/app/(app)/scrum/projects/[projectId]/sprints/page.tsx",
                   "@/app/(app)/scrum/projects/[projectId]/tasks/page.tsx",
                   "@/app/(app)/scrum/projects/[projectId]/us/page.tsx",
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
                   "@/components/scrum/ProjectSummaryCard.tsx",
                   "@/components/scrum/SprintBoard.tsx",
                   "@/components/scrum/TaskBoard.tsx",
                   "@/components/scrum/UserStoryBoard.tsx",
                   "@/lib/scrum/access.ts",
                   "@/lib/scrum/defaults.ts",
                   "@/lib/scrum/json-io.ts",
                   "@/lib/scrum/mutations.ts",
                   "@/lib/scrum/queries.ts",
                   "@/lib/scrum/schema.ts",
                   "@/lib/scrum/types.ts",
                 ]
relatedFiles:    ["@/components/scrum/ProjectDndBoards.tsx",
                  "@/components/scrum/DndBoard.tsx",
                  "@/app/(app)/scrum/actions/dnd.ts",
                  "@/lib/scrum/queries.ts"]
imports:         ["react", "next/navigation", "next/link", "lucide-react",
                  "@/lib/scrum/queries",
                  "@/components/scrum/ProjectDndBoards",
                  "@/components/ui/button"]
exports:         ["default DndPage"]
useBy:           ["@/app/(app)/scrum/projects/[projectId]/project-detail-content.tsx"]

userStories:     ["*en tant qu'utilisateur je veux glisser-déposer mes tâches et US entre les colonnes",
                  "*en tant qu'utilisateur je veux réordonner mes tâches et US dans une colonne"]
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
import { ProjectDndBoards } from "@/components/scrum/ProjectDndBoards";
import { Button } from "@/components/ui/button";

async function DndContent({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const tree = await loadScrumTree(projectId);
  if (!tree) notFound();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
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
          Glisser-déposer · {tree.project.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Rattachez vos tâches aux US, vos US aux epics et aux sprints, et
          réordonnez-les.
        </p>
      </header>

      <ProjectDndBoards
        scrumId={projectId}
        tasks={tree.tasks}
        userStories={tree.userStories}
        epics={tree.epics}
        sprints={tree.sprints}
      />
    </div>
  );
}

export default function DndPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-12 sm:px-6">
          <p className="text-sm text-muted-foreground">Chargement…</p>
        </div>
      }
    >
      <DndContent params={params} />
    </Suspense>
  );
}