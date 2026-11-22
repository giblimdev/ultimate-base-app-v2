/*
path :           app/(app)/scrum/projects/new/page.tsx
tag :            ["scrum", "projects", "new", "page", "client",
                  "crud", "create", "toast"]
projectId:       <UltimateBaseApp>
type:            page
generic:         false

role:            Page de création d'un projet Scrum. Client Component qui
                 rend un ProjectForm avec onSubmit = wrapper appelant la
                 Server Action createProject, puis redirige vers le détail
                 du projet créé. Les erreurs (validation, DB) s'affichent
                 via toast Sonner (le Toaster est monté dans app/layout.tsx)
                 au lieu d'un console.error silencieux. "use client" justifié :
                 useRouter, toast et handler de formulaire.

flow:            NewProjectPage() → handleSubmit(data) → createProject(data)
                 → si !ok : toast.error(error + issues) → sinon :
                 toast.success + router.push(`/scrum/projects/${scrumId}`) +
                 router.refresh().

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
relatedFiles:    ["@/components/scrum/ProjectForm.tsx",
                  "@/app/(app)/scrum/actions/project.ts",
                  "@/lib/scrum/schema.ts",
                  "@/app/(app)/scrum/projects/page.tsx"]
imports:         ["next/navigation", "sonner",
                  "@/components/scrum/ProjectForm",
                  "@/app/(app)/scrum/actions/project",
                  "@/lib/scrum/schema"]
exports:         ["default NewProjectPage"]
useBy:           ["@/app/(app)/scrum/projects/page.tsx"]

userStories:     ["*en tant qu'utilisateur je veux créer un nouveau projet Scrum",
                  "*en tant qu'utilisateur je veux voir un message clair si la création échoue"]
status:          wip
pathChecked:     ✘false
metaDataChecked: ✘false
scriptChecked:   ✘false
*/
"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ProjectForm } from "@/components/scrum/ProjectForm";
import { createProject } from "@/app/(app)/scrum/actions/project";
import type { CreateProjectInput } from "@/lib/scrum/schema";

export default function NewProjectPage() {
  const router = useRouter();

  const handleSubmit = async (data: CreateProjectInput) => {
    const result = await createProject(data);

    if (!result.ok) {
      toast.error(result.error, {
        description: result.issues?.join("\n"),
      });
      return;
    }

    const scrumId = result.data?.scrumId;
    if (!scrumId) {
      toast.error("Projet créé, mais identifiant introuvable.");
      router.push("/scrum/projects");
      router.refresh();
      return;
    }

    toast.success("Projet créé.");
    router.push(`/scrum/projects/${scrumId}`);
    router.refresh();
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Nouveau projet
        </h1>
        <p className="text-sm text-muted-foreground">
          Créez un projet pour organiser vos features, epics et sprints.
        </p>
      </header>

      <ProjectForm onSubmit={handleSubmit} submitLabel="Créer le projet" />
    </div>
  );
}