import {
  integer,
  pgTable,
  varchar,
  serial,
  text,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core"

import { relations } from "drizzle-orm"

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  created_at: timestamp("created_at").defaultNow(),
})

export const recipesTable = pgTable("recipes", {
  id: serial("id").primaryKey(),
  title: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  instructions: text("instructions"),
  userId: integer("user_id")
    .references(() => usersTable.id)
    .notNull(), // Foreign key to users
  activeTimeInMinutes: integer("active_time_in_minutes").notNull(), // Time actively working on the recipe
  totalTimeInMinutes: integer("total_time_in_minutes").notNull(), // Total time to prepare the recipe
  numberOfServings: integer("number_of_servings").notNull(), // Number of servings the recipe makes
  created_at: timestamp().defaultNow(),
  updated_at: timestamp().defaultNow(),
})

export const ingredientsTable = pgTable("ingredients", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
})

export const recipeIngredientsTable = pgTable("recipe_ingredients", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id")
    .references(() => recipesTable.id)
    .notNull(), // Foreign key to recipes
  ingredientId: integer("ingredient_id")
    .references(() => ingredientsTable.id)
    .notNull(), // Foreign key to ingredients
  unitId: integer("unit_id")
    .references(() => unitsTable.id)
    .notNull(), // foreign key to units table
  quantity: varchar("quantity", { length: 50 }).notNull(), // Could store values like '2', '1/4'
})

export const unitsTable = pgTable("units", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(), // E.g., 'grams', 'cups', 'tablespoons',
  abbreviation: varchar("abbreviation", { length: 10 }).notNull(), // e.g., "g," "cup"
})

export const categoriesTable = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
})

export const recipeCategoriesTable = pgTable("recipe_categories", {
  recipeId: integer("recipe_id")
    .references(() => recipesTable.id)
    .notNull(),
  categoryId: integer("category_id")
    .references(() => categoriesTable.id)
    .notNull(),
})

export const imagesTable = pgTable("images", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id")
    .references(() => recipesTable.id)
    .notNull(), // Foreign key to recipes table
  imageUrl: varchar("image_url", { length: 500 }).notNull(), // URL or file path of the image
  altText: varchar("alt_text", { length: 255 }), // Optional alt text for accessibility
  createdAt: timestamp().defaultNow().notNull(),
  isPrimary: boolean("is_primary").default(false).notNull(), // Indicates if the image is the primary image for the recipe
})

export const savedRecipesTable = pgTable("saved_recipes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => usersTable.id)
    .notNull(),
  recipeId: integer("recipe_id")
    .references(() => recipesTable.id)
    .notNull(),
  savedAt: timestamp("saved_at").defaultNow(),
})

// Relations

export const userRelations = relations(usersTable, ({ many }) => ({
  recipes: many(recipesTable),
  savedRecipes: many(savedRecipesTable),
}))

export const recipeRelations = relations(recipesTable, ({ many, one }) => ({
  ingredients: many(recipeIngredientsTable),
  categories: many(recipeCategoriesTable),
  author: one(usersTable, {
    fields: [recipesTable.userId],
    references: [usersTable.id],
  }),
  images: many(imagesTable),
}))

export const ingredientRelations = relations(ingredientsTable, ({ many }) => ({
  recipe: many(recipeIngredientsTable),
}))

export const unitRelations = relations(unitsTable, ({ many }) => ({
  recipeIngredients: many(recipeIngredientsTable), // One unit can be used in many recipeIngredients
}))

export const categoryRelations = relations(categoriesTable, ({ many }) => ({
  recipes: many(recipeCategoriesTable),
}))

export const recipeCategoryRelations = relations(
  recipeCategoriesTable,
  ({ one }) => ({
    recipe: one(recipesTable, {
      fields: [recipeCategoriesTable.recipeId],
      references: [recipesTable.id],
    }),
    category: one(categoriesTable, {
      fields: [recipeCategoriesTable.categoryId],
      references: [categoriesTable.id],
    }),
  })
)

export const recipeIngredientRelations = relations(
  recipeIngredientsTable,
  ({ one }) => ({
    recipe: one(recipesTable, {
      fields: [recipeIngredientsTable.recipeId],
      references: [recipesTable.id],
    }),
    ingredient: one(ingredientsTable, {
      fields: [recipeIngredientsTable.ingredientId],
      references: [ingredientsTable.id],
    }),
    unit: one(unitsTable, {
      fields: [recipeIngredientsTable.unitId],
      references: [unitsTable.id],
    }), // Relation to units
  })
)

export const imageRelations = relations(imagesTable, ({ one }) => ({
  recipe: one(recipesTable, {
    fields: [imagesTable.recipeId],
    references: [recipesTable.id],
  }), // Relationship to recipes
}))
