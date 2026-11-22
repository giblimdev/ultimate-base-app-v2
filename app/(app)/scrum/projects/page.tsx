/*
path :           app/(app)/scrum/projects/page.tsx
tag :            ["scrum", "projects", "list", "server", "prisma"]
projectId:       <UltimateBaseApp>
type:            page
generic:         false

role:            Page liste des projets Scrum. Server Component qui charge
                 les projets via listScrumProjects() et les affiche.
                 Rendue dynamiquement à la requête : `await connection()`
                 est appelé DANS le sous-composant <ProjectsList>, lui-même
                 enveloppé dans <Suspense>. Sans cette double protection
                 (connection + Suspense boundary), Next 16 (Cache
                 Components) tente de prérendre la page et Prisma déclenche
                 require('node:crypto').randomBytes() → build KO.

flow:            ProjectsPage() → header statique → <Suspense fallback>
                 → <ProjectsList> → await connection() → listScrumProjects()
                 → rendu liste ou état vide.

--- GUIDE IA — LIRE AVANT TOUTE MODIFICATION ---

INTERDIT :
  ✘ Ne PAS appeler listScrumProjects() directement dans ProjectsPage.
     Toujours passer par <ProjectsList> enveloppé de <Suspense>.
  ✘ Ne PAS retirer `await connection()` — c'est ce qui désactive le
     prerender et évite l'erreur randomBytes.
  ✘ Ne PAS mettre `"use cache"` sur cette page (données temps réel).

AUTORISÉ :
  ✔ Ajouter des filtres/tri via searchParams (penser à `await
     searchParams` en Next 16).
  ✔ Extraire le rendu de carte dans ProjectSummaryCard (déjà dans
     ecosystem).

PIÈGES :
  ⚠ `connection()` doit être la PREMIÈRE instruction async de
     ProjectsList, avant tout appel Prisma.
  ⚠ En Next 16, `params` et `searchParams` sont des Promises → `await`.
  ⚠ Le `<Suspense fallback>` est intégré à la coquille statique : il
     doit rester léger (skeleton, texte).

CONVENTIONS PROJET :
  • Tokens shadcn uniquement (bg-card, text-muted-foreground…).
  • Mobile first (grid-cols-1 md:grid-cols-2).
  • En-tête Genesis obligatoire.

ecosystem:       ScrumProjects = [
                   "@/app/(app)/scrum/projects/page.tsx",
                   "@/lib/scrum/queries.ts",
                   "@/components/ui/card.tsx",
                   "@/components/ui/badge.tsx",
                   "@/lib/utils.ts",
                 ]
relatedFiles:    ["@/lib/scrum/queries.ts",
                  "@/lib/scrum/types.ts",
                  "@/app/(app)/scrum/page.tsx"]
imports:         ["react", "next/server", "@/lib/scrum/queries",
                  "@/components/ui/card", "@/components/ui/badge"]
exports:         ["default ProjectsPage"]
useBy:           []
userStories:     ["*en tant qu'utilisateur je veux voir la liste de mes projets Scrum à jour"]
status:          wip
pathChecked:     ✘false
metaDataChecked: ✘false
scriptChecked:   ✘false
*/
import { Suspense } from "react";
import { connection } from "next/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listScrumProjects } from "@/lib/scrum/queries";

/**
 * Sous-composant dynamique : charge les projets et les affiche.
 * Isolé + enveloppé dans <Suspense> pour que Next 16 ne tente pas
 * de le prérendre (Prisma → randomBytes → build KO sinon).
 */
async function ProjectsList() {
  // ⚠️ OBLIGATOIRE et EN PREMIER : force le rendu à la requête.
  await connection();

  const projects = await listScrumProjects();

  if (projects.length === 0) {
    return (
      <Card className="border-dashed border-border bg-card/50">
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <p className="text-sm font-medium text-foreground">
            Aucun projet pour le moment
          </p>
          <p className="text-xs text-muted-foreground">
            Créez un premier projet pour démarrer votre backlog Scrum.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {projects.map((project) => (
        <Card
          key={project.id}
          className="border-border/60 bg-card/80 transition-colors hover:border-primary/30"
        >
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <CardTitle className="truncate text-base">
                  {project.name}
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {project.key} · {project.methodology}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0">
                {project.status}
              </Badge>
            </div>
            {project.description ? (
              <CardDescription className="line-clamp-3 text-xs">
                {project.description}
              </CardDescription>
            ) : null}
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 pt-0 text-xs text-muted-foreground">
            <span>{project.counts.epics} epics</span>
            <span>·</span>
            <span>{project.counts.userStories} stories</span>
            <span>·</span>
            <span>{project.counts.tasks} tasks</span>
            <span>·</span>
            <span>{project.progressPercent}%</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Fallback léger pendant la requête (fait partie de la coquille statique). */
function ProjectsListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="border-border/60 bg-card/40">
          <CardHeader>
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-muted" />
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Projets Scrum
        </h1>
        <p className="text-sm text-muted-foreground">
          Tous les projets Scrum de votre espace.
        </p>
      </header>

      <Suspense fallback={<ProjectsListSkeleton />}>
        <ProjectsList />
      </Suspense>
    </main>
  );
}