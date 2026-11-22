/*
path :           app/(app)/scrum/projects/import/page.tsx
tag :            ["scrum", "projects", "import", "json", "page", "client",
                  "upload", "create"]
projectId:       <UltimateBaseApp>
type:            page
generic:         false

role:            Page d'import d'un projet Scrum depuis un JSON (collé ou
                 chargé depuis un fichier .json). Accepte le format complet
                 (export) ou simplifié (project.name + project.key suffisent,
                 ids/positions optionnels). « Valider » exécute
                 importProjectJson côté client (aperçu des compteurs ou
                 erreurs détaillées) ; « Importer » envoie le JSON à la
                 Server Action importProjectTree, qui revalide, remappe les
                 ids et crée la ligne Scrum, puis redirige vers le hub du
                 projet. Bouton « Insérer un exemple ». "use client"
                 justifié : état local, FileReader, router, Server Action.

flow:            ImportProjectPage() → fichier → file.text() → setText |
                 Valider → importProjectJson(text) → toast / erreurs |
                 Importer → importProjectJson (pré-contrôle) →
                 importProjectTree(JSON.parse(text)) → si ok : toast +
                 router.push(`/scrum/projects/${scrumId}`) + refresh.

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
relatedFiles:    ["@/app/(app)/scrum/actions/import-project.ts",
                  "@/lib/scrum/import-export.ts",
                  "@/app/(app)/scrum/projects/page.tsx",
                  "@/app/(app)/scrum/projects/new/page.tsx"]
imports:         ["react", "next/link", "next/navigation", "sonner",
                  "lucide-react",
                  "@/app/(app)/scrum/actions/import-project",
                  "@/lib/scrum/import-export",
                  "@/components/ui/button", "@/components/ui/card",
                  "@/components/ui/input", "@/components/ui/label",
                  "@/components/ui/textarea"]
exports:         ["default ImportProjectPage"]
useBy:           []

userStories:     ["*en tant qu'utilisateur je veux importer un projet complet depuis un JSON collé ou un fichier",
                  "*en tant qu'utilisateur je veux écrire un JSON simplifié sans ids ni positions",
                  "*en tant qu'utilisateur je veux des erreurs claires si mon JSON est invalide"]
status:          wip
pathChecked:     ✘false
metaDataChecked: ✘false
scriptChecked:   ✘false
*/
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Check, FileUp, Sparkles } from "lucide-react";
import { importProjectTree } from "@/app/(app)/scrum/actions/import-project";
import {
  PROJECT_EXAMPLE_JSON,
  importProjectJson,
} from "@/lib/scrum/import-export";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ImportProjectPage() {
  const router = useRouter();
  const [text, setText] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [issues, setIssues] = React.useState<string[]>([]);
  const [pending, setPending] = React.useState(false);

  function clearErrors() {
    setError(null);
    setIssues([]);
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setText(await file.text());
      clearErrors();
    } catch {
      toast.error("Impossible de lire le fichier.");
    } finally {
      event.target.value = "";
    }
  }

  function validate(): boolean {
    clearErrors();
    if (!text.trim()) {
      setError("Collez un JSON ou chargez un fichier.");
      return false;
    }
    const result = importProjectJson(text);
    if (!result.ok) {
      setError(result.error);
      setIssues(result.issues ?? []);
      return false;
    }
    const { tree } = result;
    toast.success(
      `JSON valide : ${tree.features.length} features, ${tree.personas.length} personas, ${tree.epics.length} epics, ${tree.userStories.length} US, ${tree.tasks.length} tasks, ${tree.sprints.length} sprints.`,
    );
    return true;
  }

  async function handleImport() {
    if (!validate()) return;

    setPending(true);
    try {
      const result = await importProjectTree(JSON.parse(text));
      if (!result.ok) {
        setError(result.error);
        setIssues(result.issues ?? []);
        toast.error(result.error);
        return;
      }
      const scrumId = result.data?.scrumId;
      toast.success("Projet importé.");
      router.push(scrumId ? `/scrum/projects/${scrumId}` : "/scrum/projects");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-2">
        <Button
          nativeButton={false}
          variant="ghost"
          size="sm"
          className="w-fit"
          render={<Link href="/scrum/projects" />}
        >
          <ArrowLeft className="size-4" aria-hidden />
          Projets
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Importer un projet
        </h1>
        <p className="text-sm text-muted-foreground">
          Créez un projet à partir d&apos;un JSON : export complet, ou format
          simplifié (seuls <code className="font-mono">project.name</code> et{" "}
          <code className="font-mono">project.key</code> sont obligatoires).
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">JSON du projet</CardTitle>
          <CardDescription className="text-xs">
            Les relations{" "}
            <code className="font-mono">epicId / sprintId / usId</code> peuvent
            pointer vers les <code className="font-mono">id</code> que vous
            choisissez dans le même JSON ; de nouveaux ids sont générés à
            l&apos;import.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-json-file">Charger un fichier .json</Label>
            <Input
              id="project-json-file"
              type="file"
              accept="application/json,.json"
              onChange={handleFile}
              disabled={pending}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-json">Ou coller le JSON</Label>
            <Textarea
              id="project-json"
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck={false}
              disabled={pending}
              placeholder='{ "project": { "name": "…", "key": "…" }, "epics": [] }'
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "import-json-error" : undefined}
              className="min-h-72 font-mono text-xs"
            />
          </div>

          {error && (
            <div
              id="import-json-error"
              role="alert"
              className="flex flex-col gap-1 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive"
            >
              <p className="font-medium">{error}</p>
              {issues.length > 0 && (
                <ul className="flex list-disc flex-col gap-0.5 pl-4">
                  {issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleImport} disabled={pending}>
              <FileUp className="size-4" aria-hidden />
              {pending ? "Import…" : "Importer"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => validate()}
              disabled={pending}
            >
              <Check className="size-4" aria-hidden />
              Valider
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setText(PROJECT_EXAMPLE_JSON);
                clearErrors();
              }}
              disabled={pending}
            >
              <Sparkles className="size-4" aria-hidden />
              Insérer un exemple
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}