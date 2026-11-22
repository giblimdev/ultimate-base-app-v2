/*
path :           app/(app)/scrum/actions/import-project.ts
tag :            ["scrum", "action", "import", "project", "server",
                  "create", "json"]
projectId:       <UltimateBaseApp>
type:            action
generic:         false

role:            Server Action d'import d'un projet Scrum complet. Reçoit un
                 JSON (objet, ou chaîne JSON) au format complet OU simplifié,
                 le valide et le convertit via buildScrumTree (nouveaux ids
                 pour le projet et toutes les entités, relations epicId /
                 sprintId / usId remappées). Corrige le bug précédent où la
                 table de remappage des sprints associait chaque ancien id à
                 lui-même (les US perdaient leur sprint). Crée ensuite une
                 nouvelle ligne Scrum (saveScrums) via createScrumRow et
                 retourne le scrumId pour la redirection client.

flow:            importProjectTree(input) → (string → JSON.parse) →
                 buildScrumTree → si !ok : { ok: false, error, issues } →
                 requireScrumAccess → createScrumRow({ tree, workspaceId,
                 authorId }) → revalidatePath → { ok: true, data: { scrumId } }.

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
relatedFiles:    ["@/lib/scrum/import-export.ts",
                  "@/lib/scrum/mutations.ts",
                  "@/lib/scrum/access.ts",
                  "@/app/(app)/scrum/actions/project.ts",
                  "@/app/(app)/scrum/projects/import/page.tsx"]
imports:         ["next/cache", "@/lib/scrum/import-export",
                  "@/lib/scrum/mutations", "@/lib/scrum/access",
                  "@/app/(app)/scrum/actions/project"]
exports:         ["importProjectTree"]
useBy:           ["@/app/(app)/scrum/projects/import/page.tsx"]

userStories:     ["*en tant qu'utilisateur je veux sauvegarder un projet entier importé depuis un JSON",
                  "*en tant qu'utilisateur je veux que les liens US → epic/sprint et task → US soient conservés à l'import"]
status:          wip
pathChecked:     ✘false
metaDataChecked: ✘false
scriptChecked:   ✘false
*/
"use server";

import { revalidatePath } from "next/cache";
import { buildScrumTree } from "@/lib/scrum/import-export";
import { createScrumRow } from "@/lib/scrum/mutations";
import { requireScrumAccess } from "@/lib/scrum/access";
import type { ActionResult } from "@/app/(app)/scrum/actions/project";

export async function importProjectTree(
  input: unknown,
): Promise<ActionResult<{ scrumId: string }>> {
  let raw: unknown = input;

  if (typeof input === "string") {
    try {
      raw = JSON.parse(input);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "JSON invalide (syntaxe).";
      return { ok: false, error: `JSON invalide : ${message}` };
    }
  }

  const built = buildScrumTree(raw);
  if (!built.ok) {
    return { ok: false, error: built.error, issues: built.issues };
  }

  const access = await requireScrumAccess();

  const row = await createScrumRow({
    tree: built.tree,
    workspaceId: access.workspaceId,
    authorId: access.userId,
  });

  revalidatePath("/scrum/projects");
  revalidatePath("/scrum");

  return { ok: true, data: { scrumId: row.id } };
}