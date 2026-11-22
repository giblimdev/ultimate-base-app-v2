/*
path :           components/scrum/ProjectJsonPanel.tsx
tag :            ["scrum", "json", "export", "import", "editor", "client",
                  "bulk", "copy", "download"]
projectId:       <UltimateBaseApp>
type:            component
generic:         false

role:            Panneau d'import/export JSON d'un projet Scrum. Deux cartes :
                 1) Export : JSON complet du projet (readonly), boutons Copier
                 et Télécharger (.json). 2) Items : sélecteur d'entité (Auto =
                 objet multi-entités, ou features / personas / epics /
                 sprints / user stories / tasks). Choisir une entité charge
                 son tableau actuel dans un texte éditable ; l'utilisateur
                 modifie (id présent → mise à jour) ou ajoute des objets
                 (sans id → création), puis « Appliquer » appelle
                 bulkUpsertEntities (écriture atomique). Fusion uniquement :
                 supprimer un objet du texte ne supprime pas l'item. Erreurs
                 de syntaxe et de schéma affichées inline. "use client"
                 justifié : état local, clipboard, Blob, Server Action.

flow:            ProjectJsonPanel({ scrumId, projectKey, tree }) → export :
                 serializeTreeJson(tree) → copier / télécharger. Items :
                 selectTarget(target) → setText(tableau de l'entité ou
                 exemple) → Appliquer → JSON.parse (pré-contrôle) →
                 bulkUpsertEntities({ scrumId, entity, json }) → toast +
                 router.refresh() (la page change la key du panneau grâce à
                 project.updatedAt).

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
relatedFiles:    ["@/app/(app)/scrum/actions/bulk.ts",
                  "@/lib/scrum/bulk.ts",
                  "@/lib/scrum/json-io.ts",
                  "@/lib/scrum/types.ts",
                  "@/app/(app)/scrum/projects/[projectId]/json/page.tsx"]
imports:         ["react", "next/navigation", "sonner", "lucide-react",
                  "@/app/(app)/scrum/actions/bulk", "@/lib/scrum/bulk",
                  "@/lib/scrum/json-io", "@/lib/scrum/types",
                  "@/components/ui/button", "@/components/ui/card",
                  "@/components/ui/textarea", "@/lib/utils"]
exports:         ["ProjectJsonPanel", "ProjectJsonPanelProps"]
useBy:           ["@/app/(app)/scrum/projects/[projectId]/json/page.tsx"]

userStories:     ["*en tant qu'utilisateur je veux copier ou télécharger mon projet en JSON",
                  "*en tant qu'utilisateur je veux éditer en texte les features, personas, epics, US et tasks",
                  "*en tant qu'utilisateur je veux coller un tableau d'objets pour ajouter des items en masse"]
status:          wip
pathChecked:     ✘false
metaDataChecked: ✘false
scriptChecked:   ✘false
*/
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Copy, Download, RotateCcw, Sparkles } from "lucide-react";
import { bulkUpsertEntities } from "@/app/(app)/scrum/actions/bulk";
import {
  BULK_ENTITIES,
  BULK_ENTITY_LABELS,
  BULK_EXAMPLE_JSON,
  type BulkEntity,
} from "@/lib/scrum/bulk";
import { serializeTreeJson } from "@/lib/scrum/json-io";
import type { ScrumTree } from "@/lib/scrum/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Target = "auto" | BulkEntity;

export type ProjectJsonPanelProps = {
  scrumId: string;
  projectKey: string;
  tree: ScrumTree;
};

function pretty(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "[]";
  }
}

function textFor(target: Target, tree: ScrumTree): string {
  return target === "auto" ? BULK_EXAMPLE_JSON : pretty(tree[target]);
}

export function ProjectJsonPanel({
  scrumId,
  projectKey,
  tree,
}: ProjectJsonPanelProps) {
  const router = useRouter();
  const exportJson = React.useMemo(() => serializeTreeJson(tree), [tree]);

  const [target, setTarget] = React.useState<Target>("auto");
  const [text, setText] = React.useState(() => textFor("auto", tree));
  const [error, setError] = React.useState<string | null>(null);
  const [issues, setIssues] = React.useState<string[]>([]);
  const [pending, setPending] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  function clearErrors() {
    setError(null);
    setIssues([]);
  }

  function selectTarget(next: Target) {
    setTarget(next);
    setText(textFor(next, tree));
    clearErrors();
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(exportJson);
      setCopied(true);
      toast.success("JSON copié.");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Impossible de copier. Vérifiez les permissions du navigateur.");
    }
  }

  function handleDownload() {
    const blob = new Blob([exportJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${projectKey.toLowerCase() || "projet"}.scrum.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function handleFormat() {
    try {
      setText(pretty(JSON.parse(text)));
      clearErrors();
    } catch (err) {
      setError(
        err instanceof Error ? `JSON invalide : ${err.message}` : "JSON invalide.",
      );
      setIssues([]);
    }
  }

  async function handleApply() {
    clearErrors();

    try {
      JSON.parse(text);
    } catch (err) {
      setError(
        err instanceof Error ? `JSON invalide : ${err.message}` : "JSON invalide.",
      );
      return;
    }

    setPending(true);
    try {
      const result = await bulkUpsertEntities({
        scrumId,
        entity: target === "auto" ? null : target,
        json: text,
      });

      if (!result.ok) {
        setError(result.error);
        setIssues(result.issues ?? []);
        toast.error(result.error);
        return;
      }

      const created = result.data?.created ?? 0;
      const updated = result.data?.updated ?? 0;
      toast.success(`${created} créé(s), ${updated} mis à jour.`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Exporter le projet</CardTitle>
          <CardDescription className="text-xs">
            JSON complet du projet. Il peut être réimporté tel quel depuis la
            page « Importer un projet ».
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Textarea
            readOnly
            value={exportJson}
            spellCheck={false}
            aria-label="JSON du projet"
            className="min-h-48 font-mono text-xs"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={handleCopy}>
              {copied ? (
                <Check className="size-4" aria-hidden />
              ) : (
                <Copy className="size-4" aria-hidden />
              )}
              {copied ? "Copié" : "Copier"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleDownload}
            >
              <Download className="size-4" aria-hidden />
              Télécharger
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Éditer ou importer des items</CardTitle>
          <CardDescription className="text-xs">
            Choisissez un type pour éditer son tableau actuel : un objet avec
            un <code className="font-mono">id</code> existant est mis à jour,
            un objet sans <code className="font-mono">id</code> est créé. Mode
            « Auto » : collez un objet{" "}
            <code className="font-mono">
              {"{ features, personas, epics, sprints, userStories, tasks }"}
            </code>
            . Fusion uniquement : supprimer un objet du texte ne le supprime
            pas du projet.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div
            role="group"
            aria-label="Type d'items"
            className="flex flex-wrap gap-1.5"
          >
            {(["auto", ...BULK_ENTITIES] as Target[]).map((option) => (
              <Button
                key={option}
                type="button"
                size="xs"
                variant={target === option ? "default" : "outline"}
                aria-pressed={target === option}
                onClick={() => selectTarget(option)}
                disabled={pending}
                className={cn(target === option && "shadow-sm")}
              >
                {option === "auto" ? "Auto (multi)" : BULK_ENTITY_LABELS[option]}
              </Button>
            ))}
          </div>

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            disabled={pending}
            aria-label="JSON des items"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "bulk-json-error" : undefined}
            className="min-h-72 font-mono text-xs"
          />

          {error && (
            <div
              id="bulk-json-error"
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
            <Button type="button" size="sm" onClick={handleApply} disabled={pending}>
              <Check className="size-4" aria-hidden />
              {pending ? "Application…" : "Appliquer"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleFormat}
              disabled={pending}
            >
              <Sparkles className="size-4" aria-hidden />
              Formater
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => selectTarget(target)}
              disabled={pending}
            >
              <RotateCcw className="size-4" aria-hidden />
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}