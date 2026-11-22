/*
path :           components/scrum/ProjectDndBoards.tsx
tag :            ["scrum", "dnd", "boards", "client", "wrapper", "task",
                  "user-story", "epic", "sprint"]
projectId:       <UltimateBaseApp>
type:            component
generic:         false

role:            Wrapper client des 3 boards DnD d'un projet Scrum (Tasks → US,
                 US → Epics, US → Sprints). Existe parce qu'un Server Component
                 ne peut pas passer de fonctions inline (onMove/onReorder) à un
                 Client Component. Reçoit uniquement des données sérialisables
                 (tasks, userStories, epics, sprints), construit les items et
                 colonnes de chaque DndBoard (tri par position, colonne
                 « sans parent »), et branche les Server Actions de dnd.ts.
                 Une action en échec lève une Error : DndBoard l'affiche.
                 "use client" justifié : fonctions de rappel + DndBoard client.

flow:            ProjectDndBoards({ scrumId, tasks, userStories, epics,
                 sprints }) → useMemo → items/colonnes de chaque flux →
                 <DndBoard onMove onReorder> → action dnd.ts → assertOk →
                 (DndBoard fait router.refresh()).

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
relatedFiles:    ["@/components/scrum/DndBoard.tsx",
                  "@/app/(app)/scrum/actions/dnd.ts",
                  "@/app/(app)/scrum/projects/[projectId]/dnd/page.tsx",
                  "@/lib/scrum/types.ts"]
imports:         ["react", "@/components/scrum/DndBoard",
                  "@/app/(app)/scrum/actions/dnd",
                  "@/app/(app)/scrum/actions/project",
                  "@/lib/scrum/types"]
exports:         ["ProjectDndBoards", "ProjectDndBoardsProps"]
useBy:           ["@/app/(app)/scrum/projects/[projectId]/dnd/page.tsx"]

userStories:     ["*en tant qu'utilisateur je veux glisser-déposer mes tâches et US entre les colonnes",
                  "*en tant qu'utilisateur je veux réordonner mes tâches et US dans une colonne"]
status:          wip
pathChecked:     ✘false
metaDataChecked: ✘false
scriptChecked:   ✘false
*/
"use client";

import * as React from "react";
import {
  DndBoard,
  type DndColumn,
  type DndItem,
} from "@/components/scrum/DndBoard";
import {
  moveTaskToUserStory,
  moveUserStoryToEpic,
  moveUserStoryToSprint,
  reorderTasksInUserStory,
  reorderUserStoriesInEpic,
  reorderUserStoriesInSprint,
} from "@/app/(app)/scrum/actions/dnd";
import type { ActionResult } from "@/app/(app)/scrum/actions/project";
import type { Epic, Sprint, Task, UserStory } from "@/lib/scrum/types";

const NO_COLUMN_ID = "__none__";

function toNullable(columnId: string): string | null {
  return columnId === NO_COLUMN_ID ? null : columnId;
}

function assertOk(result: ActionResult): void {
  if (!result.ok) throw new Error(result.error);
}

export type ProjectDndBoardsProps = {
  scrumId: string;
  tasks: Task[];
  userStories: UserStory[];
  epics: Epic[];
  sprints: Sprint[];
};

export function ProjectDndBoards({
  scrumId,
  tasks,
  userStories,
  epics,
  sprints,
}: ProjectDndBoardsProps) {
  const sortedUserStories = React.useMemo(
    () => userStories.slice().sort((a, b) => a.position - b.position),
    [userStories],
  );

  // Flux 1 : Tasks → User Stories
  const taskItems = React.useMemo<DndItem[]>(
    () =>
      tasks
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((t) => ({
          id: t.id,
          label: t.title,
          columnId: t.usId ?? NO_COLUMN_ID,
        })),
    [tasks],
  );
  const taskColumns = React.useMemo<DndColumn[]>(
    () => [
      { id: NO_COLUMN_ID, label: "Sans US" },
      ...userStories.map((u) => ({ id: u.id, label: u.title })),
    ],
    [userStories],
  );

  // Flux 2 : US → Epics
  const usForEpicItems = React.useMemo<DndItem[]>(
    () =>
      sortedUserStories.map((u) => ({
        id: u.id,
        label: u.title,
        description: u.asA,
        columnId: u.epicId ?? NO_COLUMN_ID,
      })),
    [sortedUserStories],
  );
  const epicColumns = React.useMemo<DndColumn[]>(
    () => [
      { id: NO_COLUMN_ID, label: "Sans epic" },
      ...epics.map((e) => ({ id: e.id, label: e.title })),
    ],
    [epics],
  );

  // Flux 3 : US → Sprints
  const usForSprintItems = React.useMemo<DndItem[]>(
    () =>
      sortedUserStories.map((u) => ({
        id: u.id,
        label: u.title,
        description: u.asA,
        columnId: u.sprintId ?? NO_COLUMN_ID,
      })),
    [sortedUserStories],
  );
  const sprintColumns = React.useMemo<DndColumn[]>(
    () => [
      { id: NO_COLUMN_ID, label: "Backlog" },
      ...sprints.map((s) => ({ id: s.id, label: s.name })),
    ],
    [sprints],
  );

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Tasks → User Stories</h2>
        <DndBoard
          items={taskItems}
          columns={taskColumns}
          onMove={async (taskId, targetColumnId) => {
            assertOk(
              await moveTaskToUserStory({
                scrumId,
                taskId,
                targetUsId: toNullable(targetColumnId),
              }),
            );
          }}
          onReorder={async (columnId, orderedIds) => {
            assertOk(
              await reorderTasksInUserStory({
                scrumId,
                usId: toNullable(columnId),
                orderedIds,
              }),
            );
          }}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">US → Epics</h2>
        <DndBoard
          items={usForEpicItems}
          columns={epicColumns}
          onMove={async (usId, targetColumnId) => {
            assertOk(
              await moveUserStoryToEpic({
                scrumId,
                usId,
                targetEpicId: toNullable(targetColumnId),
              }),
            );
          }}
          onReorder={async (columnId, orderedIds) => {
            assertOk(
              await reorderUserStoriesInEpic({
                scrumId,
                epicId: toNullable(columnId),
                orderedIds,
              }),
            );
          }}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">US → Sprints</h2>
        <DndBoard
          items={usForSprintItems}
          columns={sprintColumns}
          onMove={async (usId, targetColumnId) => {
            assertOk(
              await moveUserStoryToSprint({
                scrumId,
                usId,
                targetSprintId: toNullable(targetColumnId),
              }),
            );
          }}
          onReorder={async (columnId, orderedIds) => {
            assertOk(
              await reorderUserStoriesInSprint({
                scrumId,
                sprintId: toNullable(columnId),
                orderedIds,
              }),
            );
          }}
        />
      </section>
    </div>
  );
}