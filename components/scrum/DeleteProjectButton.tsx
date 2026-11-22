/*
path :           components/scrum/DeleteProjectButton.tsx
tag :            ["scrum", "project", "delete", "client", "button", "ux"]
projectId:       <UltimateBaseApp>
type:            component
generic:         false

role:            Bouton de suppression (soft delete) d'un projet Scrum.
                 Demande une confirmation native, appelle la Server Action
                 deleteProject, affiche un toast (succès / erreur), puis
                 redirige vers /scrum/projects. État pending désactivant le
                 bouton. "use client" justifié : confirm, toast, router et
                 appel de Server Action.

flow:            DeleteProjectButton({ scrumId, projectName }) → clic →
                 window.confirm → deleteProject(scrumId) → si !ok :
                 toast.error → sinon toast.success + router.push(
                 "/scrum/projects") + router.refresh().

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
relatedFiles:    ["@/app/(app)/scrum/actions/project.ts",
                  "@/app/(app)/scrum/projects/[projectId]/project-detail-content.tsx"]
imports:         ["react", "next/navigation", "sonner", "lucide-react",
                  "@/app/(app)/scrum/actions/project",
                  "@/components/ui/button"]
exports:         ["DeleteProjectButton", "DeleteProjectButtonProps"]
useBy:           ["@/app/(app)/scrum/projects/[projectId]/project-detail-content.tsx"]

userStories:     ["*en tant qu'utilisateur je veux supprimer un projet Scrum"]
status:          wip
pathChecked:     ✘false
metaDataChecked: ✘false
scriptChecked:   ✘false
*/
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteProject } from "@/app/(app)/scrum/actions/project";
import { Button } from "@/components/ui/button";

export type DeleteProjectButtonProps = {
  scrumId: string;
  projectName: string;
};

export function DeleteProjectButton({
  scrumId,
  projectName,
}: DeleteProjectButtonProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Supprimer le projet « ${projectName} » ? Il n'apparaîtra plus dans la liste.`,
    );
    if (!confirmed) return;

    setPending(true);
    try {
      const result = await deleteProject(scrumId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Projet supprimé.");
      router.push("/scrum/projects");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleDelete}
      disabled={pending}
      className="text-destructive hover:text-destructive"
    >
      <Trash2 className="size-4" aria-hidden />
      {pending ? "Suppression…" : "Supprimer"}
    </Button>
  );
}