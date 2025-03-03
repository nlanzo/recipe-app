"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRecipe = addRecipe;
const schema_1 = require("../../db/schema");
const index_1 = require("../../db/index");
const drizzle_orm_1 = require("drizzle-orm");
// Function to add a new recipe with the specified details
function addRecipe(_a) {
    return __awaiter(this, arguments, void 0, function* ({ title, categories, description, instructions, userId, activeTimeInMinutes, totalTimeInMinutes, numberOfServings, createdAt, ingredients, images, }) {
        // Start a transaction to ensure all related data is inserted together
        yield index_1.db.transaction((trx) => __awaiter(this, void 0, void 0, function* () {
            // Ensure the author exists
            const author = yield trx
                .select()
                .from(schema_1.usersTable)
                .where((0, drizzle_orm_1.eq)(schema_1.usersTable.id, userId))
                .limit(1);
            if (author.length === 0)
                throw new Error("Author not found");
            // Insert the recipe
            const [newRecipe] = yield trx
                .insert(schema_1.recipesTable)
                .values({
                userId,
                title,
                description,
                instructions,
                activeTimeInMinutes,
                totalTimeInMinutes,
                numberOfServings,
                created_at: createdAt,
            })
                .returning();
            // Insert categories and associate them with the recipe
            for (const categoryName of categories) {
                // Check if category exists, otherwise insert it
                const [existingCategory] = yield trx
                    .select()
                    .from(schema_1.categoriesTable)
                    .where((0, drizzle_orm_1.eq)(schema_1.categoriesTable.name, categoryName))
                    .limit(1);
                const categoryId = existingCategory
                    ? existingCategory.id
                    : (yield trx
                        .insert(schema_1.categoriesTable)
                        .values({ name: categoryName })
                        .returning())[0].id;
                // Link category to the recipe in the recipeCategoriesTable
                yield trx.insert(schema_1.recipeCategoriesTable).values({
                    recipeId: newRecipe.id,
                    categoryId,
                });
            }
            // Insert ingredients and associate them with the recipe
            for (const { name, quantity, unit, abbreviation } of ingredients) {
                // Check if ingredient exists, otherwise insert it
                const [existingIngredient] = yield trx
                    .select()
                    .from(schema_1.ingredientsTable)
                    .where((0, drizzle_orm_1.eq)(schema_1.ingredientsTable.name, name))
                    .limit(1);
                const ingredientId = existingIngredient
                    ? existingIngredient.id
                    : (yield trx.insert(schema_1.ingredientsTable).values({ name }).returning())[0]
                        .id;
                // Check if unit exists, otherwise insert it
                const [existingUnit] = yield trx
                    .select()
                    .from(schema_1.unitsTable)
                    .where((0, drizzle_orm_1.eq)(schema_1.unitsTable.name, unit))
                    .limit(1);
                const unitId = existingUnit
                    ? existingUnit.id
                    : (yield trx
                        .insert(schema_1.unitsTable)
                        .values({ name: unit, abbreviation })
                        .returning())[0].id;
                // Link ingredient to the recipe in the recipeIngredientsTable with quantity and unit
                yield trx.insert(schema_1.recipeIngredientsTable).values({
                    recipeId: newRecipe.id,
                    ingredientId,
                    quantity: quantity.toString(),
                    unitId,
                });
            }
            // Insert images and associate them with the recipe
            for (const { imageUrl, altText } of images) {
                yield trx.insert(schema_1.imagesTable).values({
                    recipeId: newRecipe.id,
                    imageUrl,
                    altText,
                });
            }
        }));
    });
}
