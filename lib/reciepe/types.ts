/*
path :           lib/reciepe/types.ts
tag :            ["reciepe", "types", "recipe", "ingredient", "allergen"]
projectId:       <UltimateBaseApp>
type:            types
generic:         false

role:            Types partagés du module Recettes : Recipe, Ingredient,
                 IngredientCategory, Allergen, RecipeFile (format export/
                 import JSON), IngredientsFile, AllergensFile.
                 Source de vérité TypeScript alignée sur le modèle Prisma
                 SaveReciepes (champ JsonB saveReciepes).

flow:            importé par schema.ts, queries.ts, mutations.ts, io.ts,
                 files.ts et les composants UI.

--- GUIDE IA ---
INTERDIT : ✘ Ne pas renommer les champs sans migrer data/*.json.
AUTORISÉ : ✔ Ajouter des champs optionnels (compat ascendante).

ecosystem:       Reciepe = ["@/lib/reciepe/types.ts"]
relatedFiles:    ["@/lib/reciepe/schema.ts", "@/lib/reciepe/queries.ts",
                  "@/lib/reciepe/io.ts"]
imports:         []
exports:         ["Recipe", "Ingredient", "IngredientCategory",
                  "Allergen", "RecipeFile", "IngredientsFile",
                  "AllergensFile", "Difficulty"]
useBy:           ["@/lib/reciepe/schema.ts", "@/lib/reciepe/io.ts",
                  "@/components/reciepe/RecipeEditor.tsx"]
userStories:     ["*en tant que développeur je veux typer les recettes"]
status:          wip
pathChecked:     ✔true
metaDataChecked: ✔true
scriptChecked:   ✔true
*/
export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export type Ingredient = {
  id: string;
  label: string;
  unit: string;
  defaultQty: number;
};

export type IngredientCategory = {
  id: string;
  label: string;
  items: Ingredient[];
};

export type IngredientsFile = {
  version: number;
  updatedAt: string;
  categories: IngredientCategory[];
};

export type Allergen = {
  id: string;
  label: string;
  icon: string;
};

export type AllergensFile = {
  version: number;
  updatedAt: string;
  allergens: Allergen[];
};

export type RecipeIngredient = {
  ingredientId: string;
  label: string;
  qty: number;
  unit: string;
};

export type RecipeStep = {
  n: number;
  text: string;
};

export type Recipe = {
  id: string;
  slug: string;
  title: string;
  description?: string;
  servings: number;
  prepTimeMin: number;
  cookTimeMin: number;
  difficulty: Difficulty;
  category: string;
  tags: string[];
  allergens: string[];
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  createdAt: string;
  updatedAt: string;
};

export type RecipeFile = {
  version: number;
  exportedAt: string;
  recipe: Recipe;
};
