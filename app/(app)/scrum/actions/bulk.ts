/*
path :           app/(app)/scrum/actions/bulk.ts
tag :            ["scrum", "action", "bulk", "import", "json", "upsert",
                  "server"]
projectId:       <UltimateBaseApp>
type:            action
generic:         false

role:            Server Action d'import en masse d'items Scrum dans un projet
                 existant. Reçoit { scrumId, entity?, json } où json est le
                 TEXTE collé par l'utilisateur (tableau ou objet
                 multi-entités). Parse le JSON, charge l'arbre, applique
                 applyBulkImport (validation + upsert + vérification des
                 références, tout ou rien), met à jour project.updatedAt, puis
                 réécrit l'arbre en UNE seule écriture via replaceScrumTree
                 (remplace l'ancienne boucle add/update d'appels séquentiels
                 des boards). Retourne le nombre d'items créés / mis à jour.

flow:            bulkUpsertEntities(input) → zod.safeParse → JSON.parse →
                 requireScrumOwner → loadScrumTree → applyBulkImport →
                 replaceScrumTree → revalidatePath (pages du projet) →
                 { ok: true, data: { created, updated } }.

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
relatedFiles:    ["@/lib/scrum/bulk.ts",
                  "@/lib/scrum/queries.ts",
                  "@/lib/scrum/mutations.ts",
                  "@/lib/scrum/access.ts",
                  "@/app/(app)/scrum/actions/project.ts",
                  "@/components/scrum/ProjectJsonPanel.tsx"]
imports:         ["next/cache", "zod", "@/lib/scrum/bulk",
                  "@/lib/scrum/queries", "@/lib/scrum/mutations",
                  "@/lib/scrum/access",
                  "@/app/(app)/scrum/actions/project"]
exports:         ["bulkUpsertEntities"]
useBy:           ["@/components/scrum/ProjectJsonPanel.tsx"]

userStories:     ["*en tant qu'utilisateur je veux importer des tableaux d'items en JSON dans mon projet",
                  "*en tant qu'utilisateur je veux que l'import soit atomique (tout ou rien)"]
status:          wip
pathChecked:     ✘false
metaDataChecked: ✘false
scriptChecked:   ✘false
*/
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { BULK_ENTITIES, applyBulkImport } from "@/lib/scrum/bulk";
import { loadScrumTree } from "@/lib/scrum/queries";
import { replaceScrumTree } from "@/lib/scrum/mutations";
import { requireScrumOwner } from "@/lib/scrum/access";
import type { ActionResult } from "@/app/(app)/scrum/actions/project";

const bulkInputSchema = z.object({
  scrumId: z.string().min(1),
  entity: z.enum(BULK_ENTITIES).nullable().optional(),
  json: z.string().min(1, "Le JSON est vide."),
});

const PROJECT_SUBPATHS = [
  "",
  "/features",
  "/personas",
  "/epics",
  "/us",
  "/tasks",
  "/sprints",
  "/dnd",
  "/json",
] as const;

export async function bulkUpsertEntities(
  input: unknown,
): Promise<ActionResult<{ created: number; updated: number }>> {
  const parsed = bulkInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Données invalides.",
      issues: parsed.error.issues.map(
        (i) => `${i.path.join(".") || "(racine)"} : ${i.message}`,
      ),
    };
  }

  const { scrumId, entity, json } = parsed.data;

  let payload: unknown;
  try {
    payload = JSON.parse(json);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "JSON invalide (syntaxe).";
    return { ok: false, error: `JSON invalide : ${message}` };
  }

  await requireScrumOwner(scrumId);

  const tree = await loadScrumTree(scrumId);
  if (!tree) return { ok: false, error: "Projet introuvable." };

  const result = applyBulkImport(tree, payload, entity);
  if (!result.ok) {
    return { ok: false, error: result.error, issues: result.issues };
  }

  await replaceScrumTree(scrumId, {
    ...result.tree,
    project: { ...result.tree.project, updatedAt: new Date().toISOString() },
  });

  revalidatePath("/scrum/projects");
  for (const sub of PROJECT_SUBPATHS) {
    revalidatePath(`/scrum/projects/${scrumId}${sub}`);
  }

  return {
    ok: true,
    data: { created: result.created, updated: result.updated },
  };
}