/*
path :           lib/scrum/import-export.ts
tag :            ["scrum", "import", "export", "json", "tree", "helper",
                  "simplified", "remap-ids"]
projectId:       <UltimateBaseApp>
type:            helper
generic:         true

role:            Import/export de l'arbre Scrum complet au format JSON.
                 L'export est un JSON pretty-print du ScrumTree (ré-importable
                 tel quel). L'import accepte un JSON SIMPLIFIÉ : le projet
                 n'exige que name + key, les entités n'exigent ni id ni
                 position ni timestamps (schémas *ImportSchema). buildScrumTree
                 valide, génère de NOUVEAUX ids pour le projet et toutes les
                 entités (pas de collision entre projets) et remappe les
                 relations epicId / sprintId / usId via des tables ancien id →
                 nouvel id, par entité. Une référence vers un id inconnu est
                 signalée (jamais ignorée en silence). Ne lève jamais : retour
                 discriminé { ok }. Pur (aucun accès DB), importable côté
                 client et serveur.

flow:            importProjectJson(text) → JSON.parse (try/catch) →
                 buildScrumTree(raw) → scrumTreeImportSchema.safeParse →
                 withIds par entité → résolution des références → ScrumTree
                 complet { ok: true, tree } ou { ok: false, error, issues }.
                 exportProjectJson(tree) → serializeTreeJson(tree).

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
relatedFiles:    ["@/lib/scrum/json-io.ts",
                  "@/lib/scrum/schema.ts",
                  "@/lib/scrum/types.ts",
                  "@/lib/scrum/defaults.ts",
                  "@/app/(app)/scrum/actions/import-project.ts",
                  "@/app/(app)/scrum/projects/import/page.tsx"]
imports:         ["zod", "@/lib/scrum/json-io", "@/lib/scrum/schema",
                  "@/lib/scrum/defaults", "@/lib/scrum/types"]
exports:         ["projectImportSchema", "scrumTreeImportSchema",
                  "ScrumTreeImport", "PROJECT_EXAMPLE_JSON",
                  "exportProjectJson", "importProjectJson",
                  "buildScrumTree", "ImportProjectJsonResult"]
useBy:           ["@/app/(app)/scrum/actions/import-project.ts",
                  "@/app/(app)/scrum/projects/import/page.tsx"]

userStories:     ["*en tant qu'utilisateur je veux copier un projet entier en JSON",
                  "*en tant qu'utilisateur je veux importer un projet depuis un JSON simplifié",
                  "*en tant qu'utilisateur je veux que les relations epic/sprint/US soient conservées à l'import"]
status:          wip
pathChecked:     ✘false
metaDataChecked: ✘false
scriptChecked:   ✘false
*/
import { z } from "zod";
import { serializeTreeJson } from "@/lib/scrum/json-io";
import { newId } from "@/lib/scrum/defaults";
import {
  epicImportSchema,
  featureImportSchema,
  personaImportSchema,
  projectMethodologySchema,
  projectStatusSchema,
  projectVisibilitySchema,
  sprintImportSchema,
  taskImportSchema,
  userStoryImportSchema,
} from "@/lib/scrum/schema";
import type {
  Epic,
  Feature,
  Persona,
  Project,
  ScrumTree,
  Sprint,
  Task,
  UserStory,
} from "@/lib/scrum/types";

// ── Schéma d'import simplifié ─────────────────────────────────

export const projectImportSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1).max(255),
  key: z.string().min(1).max(30),
  description: z.string().max(2000).optional(),
  status: projectStatusSchema.optional(),
  visibility: projectVisibilitySchema.optional(),
  methodology: projectMethodologySchema.optional(),
  startDate: z.string().nullable().optional(),
  targetDate: z.string().nullable().optional(),
  progressPercent: z.number().min(0).max(100).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const scrumTreeImportSchema = z.object({
  project: projectImportSchema,
  features: z.array(featureImportSchema).default([]),
  personas: z.array(personaImportSchema).default([]),
  epics: z.array(epicImportSchema).default([]),
  sprints: z.array(sprintImportSchema).default([]),
  userStories: z.array(userStoryImportSchema).default([]),
  tasks: z.array(taskImportSchema).default([]),
});

export type ScrumTreeImport = z.infer<typeof scrumTreeImportSchema>;

export const PROJECT_EXAMPLE_JSON = JSON.stringify(
  {
    project: {
      name: "Mon application",
      key: "APP",
      description: "Description du projet",
      methodology: "SCRUM",
    },
    features: [{ name: "Authentification", description: "Connexion et inscription" }],
    personas: [{ name: "Marie", role: "Product Owner", goals: "Prioriser le backlog" }],
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

// ── Résultat ──────────────────────────────────────────────────

export type ImportProjectJsonResult =
  | { ok: true; tree: ScrumTree }
  | { ok: false; error: string; issues?: string[] };

// ── Export ────────────────────────────────────────────────────

export function exportProjectJson(tree: ScrumTree): string {
  return serializeTreeJson(tree);
}

// ── Import ────────────────────────────────────────────────────

function withIds<T extends { id?: string }>(
  items: T[],
): { items: (T & { id: string })[]; map: Map<string, string> } {
  const map = new Map<string, string>();
  const next = items.map((item) => {
    const id = newId();
    if (item.id) map.set(item.id, id);
    return { ...item, id };
  });
  return { items: next, map };
}

function resolveRef(
  value: string | null | undefined,
  map: Map<string, string>,
  path: string,
  issues: string[],
): string | null {
  if (!value) return null;
  const mapped = map.get(value);
  if (!mapped) {
    issues.push(`${path} : référence introuvable (« ${value} »)`);
    return null;
  }
  return mapped;
}

export function buildScrumTree(raw: unknown): ImportProjectJsonResult {
  const parsed = scrumTreeImportSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "JSON de projet invalide.",
      issues: parsed.error.issues.map(
        (i) => `${i.path.map(String).join(".") || "(racine)"} : ${i.message}`,
      ),
    };
  }

  const data = parsed.data;
  const now = new Date().toISOString();
  const issues: string[] = [];

  const project: Project = {
    id: newId(),
    name: data.project.name,
    key: data.project.key,
    description: data.project.description,
    status: data.project.status ?? "PLANNING",
    visibility: data.project.visibility ?? "PRIVATE",
    methodology: data.project.methodology ?? "SCRUM",
    startDate: data.project.startDate ?? null,
    targetDate: data.project.targetDate ?? null,
    progressPercent: data.project.progressPercent ?? 0,
    createdAt: now,
    updatedAt: now,
  };

  const features: Feature[] = data.features.map((f, index) => ({
    id: newId(),
    name: f.name,
    description: f.description,
    position: f.position ?? index,
  }));

  const personas: Persona[] = data.personas.map((p, index) => ({
    id: newId(),
    name: p.name,
    role: p.role,
    goals: p.goals,
    frustrations: p.frustrations,
    position: p.position ?? index,
  }));

  const epicsWithIds = withIds(data.epics);
  const epics: Epic[] = epicsWithIds.items.map((e, index) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    priority: e.priority ?? "MEDIUM",
    status: e.status ?? "TODO",
    position: e.position ?? index,
  }));

  const sprintsWithIds = withIds(data.sprints);
  const sprints: Sprint[] = sprintsWithIds.items.map((s, index) => ({
    id: s.id,
    name: s.name,
    goal: s.goal,
    startDate: s.startDate ?? null,
    endDate: s.endDate ?? null,
    status: s.status ?? "PLANNED",
    position: s.position ?? index,
  }));

  const storiesWithIds = withIds(data.userStories);
  const userStories: UserStory[] = storiesWithIds.items.map((u, index) => ({
    id: u.id,
    epicId: resolveRef(
      u.epicId,
      epicsWithIds.map,
      `userStories[${index}].epicId`,
      issues,
    ),
    sprintId: resolveRef(
      u.sprintId,
      sprintsWithIds.map,
      `userStories[${index}].sprintId`,
      issues,
    ),
    title: u.title,
    asA: u.asA,
    iWant: u.iWant,
    soThat: u.soThat,
    acceptanceCriteria: u.acceptanceCriteria ?? [],
    storyPoints: u.storyPoints ?? null,
    priority: u.priority ?? "MEDIUM",
    status: u.status ?? "TODO",
    position: u.position ?? index,
  }));

  const tasks: Task[] = data.tasks.map((t, index) => ({
    id: newId(),
    usId: resolveRef(
      t.usId,
      storiesWithIds.map,
      `tasks[${index}].usId`,
      issues,
    ),
    title: t.title,
    done: t.done ?? false,
    position: t.position ?? index,
  }));

  if (issues.length > 0) {
    return {
      ok: false,
      error: "Le JSON référence des éléments qui n'existent pas.",
      issues,
    };
  }

  return {
    ok: true,
    tree: { project, features, personas, epics, userStories, tasks, sprints },
  };
}

export function importProjectJson(text: string): ImportProjectJsonResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "JSON invalide (syntaxe).";
    return { ok: false, error: `JSON invalide : ${message}` };
  }
  return buildScrumTree(raw);
}