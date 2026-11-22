/*
path :           lib/scrum/bulk.ts
tag :            ["scrum", "bulk", "import", "json", "upsert", "helper",
                  "feature", "persona", "epic", "user-story", "task", "sprint"]
projectId:       <UltimateBaseApp>
type:            helper
generic:         false

role:            Import en masse d'items Scrum (features, personas, epics,
                 sprints, user stories, tasks) dans un ScrumTree EXISTANT.
                 Accepte soit un tableau (entité choisie par l'appelant), soit
                 un objet multi-entités { features, personas, epics, sprints,
                 userStories, tasks } (clé "project" ignorée, toute autre clé
                 inconnue est refusée). Valide chaque groupe via les schémas
                 d'import permissifs de schema.ts, puis fait un UPSERT : si
                 l'item porte un id déjà présent → fusion des champs fournis
                 (mise à jour) ; sinon → création via les factories de
                 defaults.ts (un id fourni est conservé pour pouvoir lier une
                 US à un epic dans le même collage). Les groupes sont traités
                 dans l'ordre des dépendances (epics/sprints avant US avant
                 tasks), puis les références epicId / sprintId / usId sont
                 vérifiées sur l'arbre résultant. Aucune écriture ici : pure
                 fonction (tout ou rien), la Server Action persiste.

flow:            applyBulkImport(tree, payload, entity?) → normalise en
                 groupes → pour chaque entité (BULK_ENTITIES) : applyEntity →
                 safeParse + upsert → arbre suivant → checkReferences →
                 { ok: true, tree, created, updated } ou { ok: false, error,
                 issues }.

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
relatedFiles:    ["@/lib/scrum/schema.ts",
                  "@/lib/scrum/defaults.ts",
                  "@/lib/scrum/types.ts",
                  "@/app/(app)/scrum/actions/bulk.ts",
                  "@/components/scrum/ProjectJsonPanel.tsx"]
imports:         ["@/lib/scrum/schema", "@/lib/scrum/defaults",
                  "@/lib/scrum/types"]
exports:         ["BULK_ENTITIES", "BulkEntity", "BULK_ENTITY_LABELS",
                  "BULK_EXAMPLE_JSON", "BulkImportResult",
                  "applyBulkImport"]
useBy:           ["@/app/(app)/scrum/actions/bulk.ts",
                  "@/components/scrum/ProjectJsonPanel.tsx"]

userStories:     ["*en tant qu'utilisateur je veux coller un tableau JSON de features, personas, epics, US ou tasks",
                  "*en tant qu'utilisateur je veux importer plusieurs types d'items en un seul collage",
                  "*en tant qu'utilisateur je veux modifier des items existants en éditant leur JSON"]
status:          wip
pathChecked:     ✘false
metaDataChecked: ✘false
scriptChecked:   ✘false
*/
import {
  epicImportArraySchema,
  featureImportArraySchema,
  personaImportArraySchema,
  sprintImportArraySchema,
  taskImportArraySchema,
  userStoryImportArraySchema,
} from "@/lib/scrum/schema";
import {
  createEpic,
  createFeature,
  createPersona,
  createSprint,
  createTask,
  createUserStory,
  nextPosition,
} from "@/lib/scrum/defaults";
import type { ScrumTree } from "@/lib/scrum/types";

// Ordre = ordre des dépendances (les US référencent epics/sprints, les tasks
// référencent les US).
export const BULK_ENTITIES = [
  "features",
  "personas",
  "epics",
  "sprints",
  "userStories",
  "tasks",
] as const;

export type BulkEntity = (typeof BULK_ENTITIES)[number];

export const BULK_ENTITY_LABELS: Record<BulkEntity, string> = {
  features: "Features",
  personas: "Personas",
  epics: "Epics",
  sprints: "Sprints",
  userStories: "User Stories",
  tasks: "Tasks",
};

export const BULK_EXAMPLE_JSON = JSON.stringify(
  {
    features: [
      { name: "Authentification", description: "Connexion et inscription" },
    ],
    personas: [
      { name: "Marie", role: "Product Owner", goals: "Prioriser le backlog" },
    ],
    epics: [{ id: "epic-compte", title: "Compte utilisateur", priority: "HIGH" }],
    sprints: [{ id: "sprint-1", name: "Sprint 1", goal: "Socle d'authentification" }],
    userStories: [
      {
        id: "us-login",
        title: "Se connecter",
        asA: "utilisateur",
        iWant: "me connecter avec mon email",
        soThat: "accéder à mon espace",
        epicId: "epic-compte",
        sprintId: "sprint-1",
        storyPoints: 3,
      },
    ],
    tasks: [{ title: "Créer le formulaire de connexion", usId: "us-login" }],
  },
  null,
  2,
);

export type BulkImportResult =
  | { ok: true; tree: ScrumTree; created: number; updated: number }
  | { ok: false; error: string; issues?: string[] };

type EntityOutcome =
  | { ok: true; tree: ScrumTree; created: number; updated: number }
  | { ok: false; issues: string[] };

type Positioned = { id: string; position: number };
type ImportLike = { id?: string; position?: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(raw: unknown): unknown[] {
  return Array.isArray(raw) ? raw : [raw];
}

function formatIssues(
  entity: BulkEntity,
  issues: { path: PropertyKey[]; message: string }[],
): string[] {
  return issues.map(
    (i) =>
      `${entity}${i.path.length > 0 ? "." + i.path.map(String).join(".") : ""} : ${i.message}`,
  );
}

function upsert<T extends Positioned, I extends ImportLike>(
  existing: T[],
  items: I[],
  create: (item: I, position: number) => T,
): { next: T[]; created: number; updated: number } {
  const next = existing.slice();
  let created = 0;
  let updated = 0;

  for (const item of items) {
    const index = item.id ? next.findIndex((e) => e.id === item.id) : -1;

    if (index >= 0) {
      const patch: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(item)) {
        if (key !== "id" && value !== undefined) patch[key] = value;
      }
      next[index] = { ...next[index], ...patch } as T;
      updated += 1;
    } else {
      const made = create(item, nextPosition(next));
      next.push(item.id ? { ...made, id: item.id } : made);
      created += 1;
    }
  }

  return { next, created, updated };
}

function applyEntity(
  tree: ScrumTree,
  entity: BulkEntity,
  raw: unknown,
): EntityOutcome {
  const input = asArray(raw);

  switch (entity) {
    case "features": {
      const parsed = featureImportArraySchema.safeParse(input);
      if (!parsed.success) {
        return { ok: false, issues: formatIssues(entity, parsed.error.issues) };
      }
      const r = upsert(tree.features, parsed.data, (i, position) =>
        createFeature({
          name: i.name,
          description: i.description,
          position: i.position ?? position,
        }),
      );
      return {
        ok: true,
        tree: { ...tree, features: r.next },
        created: r.created,
        updated: r.updated,
      };
    }

    case "personas": {
      const parsed = personaImportArraySchema.safeParse(input);
      if (!parsed.success) {
        return { ok: false, issues: formatIssues(entity, parsed.error.issues) };
      }
      const r = upsert(tree.personas, parsed.data, (i, position) =>
        createPersona({
          name: i.name,
          role: i.role,
          goals: i.goals,
          frustrations: i.frustrations,
          position: i.position ?? position,
        }),
      );
      return {
        ok: true,
        tree: { ...tree, personas: r.next },
        created: r.created,
        updated: r.updated,
      };
    }

    case "epics": {
      const parsed = epicImportArraySchema.safeParse(input);
      if (!parsed.success) {
        return { ok: false, issues: formatIssues(entity, parsed.error.issues) };
      }
      const r = upsert(tree.epics, parsed.data, (i, position) =>
        createEpic({
          title: i.title,
          description: i.description,
          priority: i.priority,
          status: i.status,
          position: i.position ?? position,
        }),
      );
      return {
        ok: true,
        tree: { ...tree, epics: r.next },
        created: r.created,
        updated: r.updated,
      };
    }

    case "sprints": {
      const parsed = sprintImportArraySchema.safeParse(input);
      if (!parsed.success) {
        return { ok: false, issues: formatIssues(entity, parsed.error.issues) };
      }
      const r = upsert(tree.sprints, parsed.data, (i, position) =>
        createSprint({
          name: i.name,
          goal: i.goal,
          startDate: i.startDate,
          endDate: i.endDate,
          status: i.status,
          position: i.position ?? position,
        }),
      );
      return {
        ok: true,
        tree: { ...tree, sprints: r.next },
        created: r.created,
        updated: r.updated,
      };
    }

    case "userStories": {
      const parsed = userStoryImportArraySchema.safeParse(input);
      if (!parsed.success) {
        return { ok: false, issues: formatIssues(entity, parsed.error.issues) };
      }
      const r = upsert(tree.userStories, parsed.data, (i, position) =>
        createUserStory({
          title: i.title,
          asA: i.asA,
          iWant: i.iWant,
          soThat: i.soThat,
          epicId: i.epicId,
          sprintId: i.sprintId,
          acceptanceCriteria: i.acceptanceCriteria,
          storyPoints: i.storyPoints,
          priority: i.priority,
          status: i.status,
          position: i.position ?? position,
        }),
      );
      return {
        ok: true,
        tree: { ...tree, userStories: r.next },
        created: r.created,
        updated: r.updated,
      };
    }

    case "tasks": {
      const parsed = taskImportArraySchema.safeParse(input);
      if (!parsed.success) {
        return { ok: false, issues: formatIssues(entity, parsed.error.issues) };
      }
      const r = upsert(tree.tasks, parsed.data, (i, position) =>
        createTask({
          title: i.title,
          usId: i.usId,
          done: i.done,
          position: i.position ?? position,
        }),
      );
      return {
        ok: true,
        tree: { ...tree, tasks: r.next },
        created: r.created,
        updated: r.updated,
      };
    }
  }
}

function checkReferences(tree: ScrumTree): string[] {
  const issues: string[] = [];
  const epicIds = new Set(tree.epics.map((e) => e.id));
  const sprintIds = new Set(tree.sprints.map((s) => s.id));
  const usIds = new Set(tree.userStories.map((u) => u.id));

  for (const us of tree.userStories) {
    if (us.epicId && !epicIds.has(us.epicId)) {
      issues.push(`userStories « ${us.title} » : epicId introuvable (${us.epicId})`);
    }
    if (us.sprintId && !sprintIds.has(us.sprintId)) {
      issues.push(`userStories « ${us.title} » : sprintId introuvable (${us.sprintId})`);
    }
  }

  for (const task of tree.tasks) {
    if (task.usId && !usIds.has(task.usId)) {
      issues.push(`tasks « ${task.title} » : usId introuvable (${task.usId})`);
    }
  }

  return issues;
}

export function applyBulkImport(
  tree: ScrumTree,
  payload: unknown,
  entity?: BulkEntity | null,
): BulkImportResult {
  const groups: Partial<Record<BulkEntity, unknown>> = {};

  if (Array.isArray(payload)) {
    if (!entity) {
      return {
        ok: false,
        error:
          "Un tableau nécessite de choisir le type d'items (features, epics…).",
      };
    }
    groups[entity] = payload;
  } else if (isRecord(payload)) {
    const keys = Object.keys(payload).filter((k) => k !== "project");
    const known = BULK_ENTITIES.filter((k) => keys.includes(k));
    const unknown = keys.filter(
      (k) => !(BULK_ENTITIES as readonly string[]).includes(k),
    );

    if (known.length === 0) {
      if (!entity) {
        return {
          ok: false,
          error: `Objet sans clé reconnue. Clés attendues : ${BULK_ENTITIES.join(", ")}.`,
        };
      }
      groups[entity] = [payload];
    } else {
      if (unknown.length > 0) {
        return {
          ok: false,
          error: `Clés inconnues : ${unknown.join(", ")}. Clés attendues : ${BULK_ENTITIES.join(", ")}.`,
        };
      }
      for (const key of known) groups[key] = payload[key];
    }
  } else {
    return {
      ok: false,
      error: "Le JSON doit être un tableau ou un objet.",
    };
  }

  let current = tree;
  let created = 0;
  let updated = 0;
  const issues: string[] = [];

  for (const key of BULK_ENTITIES) {
    if (groups[key] === undefined) continue;
    const outcome = applyEntity(current, key, groups[key]);
    if (!outcome.ok) {
      issues.push(...outcome.issues);
      continue;
    }
    current = outcome.tree;
    created += outcome.created;
    updated += outcome.updated;
  }

  if (issues.length > 0) {
    return {
      ok: false,
      error: "Le JSON ne respecte pas le schéma attendu.",
      issues,
    };
  }

  const referenceIssues = checkReferences(current);
  if (referenceIssues.length > 0) {
    return {
      ok: false,
      error:
        "Des références pointent vers des éléments inexistants (importez d'abord les epics, sprints ou US concernés).",
      issues: referenceIssues,
    };
  }

  return { ok: true, tree: current, created, updated };
}