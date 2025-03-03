"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageRelations = exports.recipeIngredientRelations = exports.recipeCategoryRelations = exports.categoryRelations = exports.unitRelations = exports.ingredientRelations = exports.recipeRelations = exports.userRelations = exports.savedRecipesTable = exports.imagesTable = exports.recipeCategoriesTable = exports.categoriesTable = exports.unitsTable = exports.recipeIngredientsTable = exports.ingredientsTable = exports.recipesTable = exports.usersTable = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
exports.usersTable = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    username: (0, pg_core_1.varchar)("username", { length: 50 }).notNull().unique(),
    email: (0, pg_core_1.varchar)("email", { length: 255 }).notNull().unique(),
    passwordHash: (0, pg_core_1.varchar)("password_hash", { length: 255 }).notNull(),
    created_at: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.recipesTable = (0, pg_core_1.pgTable)("recipes", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    title: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    instructions: (0, pg_core_1.text)("instructions"),
    userId: (0, pg_core_1.integer)("user_id")
        .references(() => exports.usersTable.id)
        .notNull(), // Foreign key to users
    activeTimeInMinutes: (0, pg_core_1.integer)("active_time_in_minutes").notNull(), // Time actively working on the recipe
    totalTimeInMinutes: (0, pg_core_1.integer)("total_time_in_minutes").notNull(), // Total time to prepare the recipe
    numberOfServings: (0, pg_core_1.integer)("number_of_servings").notNull(), // Number of servings the recipe makes
    created_at: (0, pg_core_1.timestamp)().defaultNow(),
    updated_at: (0, pg_core_1.timestamp)().defaultNow(),
});
exports.ingredientsTable = (0, pg_core_1.pgTable)("ingredients", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
});
exports.recipeIngredientsTable = (0, pg_core_1.pgTable)("recipe_ingredients", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    recipeId: (0, pg_core_1.integer)("recipe_id")
        .references(() => exports.recipesTable.id)
        .notNull(), // Foreign key to recipes
    ingredientId: (0, pg_core_1.integer)("ingredient_id")
        .references(() => exports.ingredientsTable.id)
        .notNull(), // Foreign key to ingredients
    unitId: (0, pg_core_1.integer)("unit_id")
        .references(() => exports.unitsTable.id)
        .notNull(), // foreign key to units table
    quantity: (0, pg_core_1.varchar)("quantity", { length: 50 }).notNull(), // Could store values like '2', '1/4'
});
exports.unitsTable = (0, pg_core_1.pgTable)("units", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    name: (0, pg_core_1.varchar)("name", { length: 50 }).notNull(), // E.g., 'grams', 'cups', 'tablespoons',
    abbreviation: (0, pg_core_1.varchar)("abbreviation", { length: 10 }).notNull(), // e.g., "g," "cup"
});
exports.categoriesTable = (0, pg_core_1.pgTable)("categories", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull().unique(),
});
exports.recipeCategoriesTable = (0, pg_core_1.pgTable)("recipe_categories", {
    recipeId: (0, pg_core_1.integer)("recipe_id")
        .references(() => exports.recipesTable.id)
        .notNull(),
    categoryId: (0, pg_core_1.integer)("category_id")
        .references(() => exports.categoriesTable.id)
        .notNull(),
});
exports.imagesTable = (0, pg_core_1.pgTable)("images", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    recipeId: (0, pg_core_1.integer)("recipe_id")
        .references(() => exports.recipesTable.id)
        .notNull(), // Foreign key to recipes table
    imageUrl: (0, pg_core_1.varchar)("image_url", { length: 500 }).notNull(), // URL or file path of the image
    altText: (0, pg_core_1.varchar)("alt_text", { length: 255 }), // Optional alt text for accessibility
    createdAt: (0, pg_core_1.timestamp)().defaultNow().notNull(),
    isPrimary: (0, pg_core_1.boolean)("is_primary").default(false).notNull(), // Indicates if the image is the primary image for the recipe
});
exports.savedRecipesTable = (0, pg_core_1.pgTable)("saved_recipes", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.integer)("user_id")
        .references(() => exports.usersTable.id)
        .notNull(),
    recipeId: (0, pg_core_1.integer)("recipe_id")
        .references(() => exports.recipesTable.id)
        .notNull(),
    savedAt: (0, pg_core_1.timestamp)("saved_at").defaultNow(),
});
// Relations
exports.userRelations = (0, drizzle_orm_1.relations)(exports.usersTable, ({ many }) => ({
    recipes: many(exports.recipesTable),
    savedRecipes: many(exports.savedRecipesTable),
}));
exports.recipeRelations = (0, drizzle_orm_1.relations)(exports.recipesTable, ({ many, one }) => ({
    ingredients: many(exports.recipeIngredientsTable),
    categories: many(exports.recipeCategoriesTable),
    author: one(exports.usersTable, {
        fields: [exports.recipesTable.userId],
        references: [exports.usersTable.id],
    }),
    images: many(exports.imagesTable),
}));
exports.ingredientRelations = (0, drizzle_orm_1.relations)(exports.ingredientsTable, ({ many }) => ({
    recipe: many(exports.recipeIngredientsTable),
}));
exports.unitRelations = (0, drizzle_orm_1.relations)(exports.unitsTable, ({ many }) => ({
    recipeIngredients: many(exports.recipeIngredientsTable), // One unit can be used in many recipeIngredients
}));
exports.categoryRelations = (0, drizzle_orm_1.relations)(exports.categoriesTable, ({ many }) => ({
    recipes: many(exports.recipeCategoriesTable),
}));
exports.recipeCategoryRelations = (0, drizzle_orm_1.relations)(exports.recipeCategoriesTable, ({ one }) => ({
    recipe: one(exports.recipesTable, {
        fields: [exports.recipeCategoriesTable.recipeId],
        references: [exports.recipesTable.id],
    }),
    category: one(exports.categoriesTable, {
        fields: [exports.recipeCategoriesTable.categoryId],
        references: [exports.categoriesTable.id],
    }),
}));
exports.recipeIngredientRelations = (0, drizzle_orm_1.relations)(exports.recipeIngredientsTable, ({ one }) => ({
    recipe: one(exports.recipesTable, {
        fields: [exports.recipeIngredientsTable.recipeId],
        references: [exports.recipesTable.id],
    }),
    ingredient: one(exports.ingredientsTable, {
        fields: [exports.recipeIngredientsTable.ingredientId],
        references: [exports.ingredientsTable.id],
    }),
    unit: one(exports.unitsTable, {
        fields: [exports.recipeIngredientsTable.unitId],
        references: [exports.unitsTable.id],
    }), // Relation to units
}));
exports.imageRelations = (0, drizzle_orm_1.relations)(exports.imagesTable, ({ one }) => ({
    recipe: one(exports.recipesTable, {
        fields: [exports.imagesTable.recipeId],
        references: [exports.recipesTable.id],
    }), // Relationship to recipes
}));
