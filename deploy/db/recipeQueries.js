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
exports.getRecipeCardData = getRecipeCardData;
exports.getRecipeById = getRecipeById;
const schema_1 = require("./schema");
const index_1 = require("./index");
const drizzle_orm_1 = require("drizzle-orm");
function getRecipeCardData() {
    return __awaiter(this, void 0, void 0, function* () {
        const recipes = yield index_1.db
            .select({
            id: schema_1.recipesTable.id,
            title: schema_1.recipesTable.title,
            imageUrl: schema_1.imagesTable.imageUrl,
            totalTimeInMinutes: schema_1.recipesTable.totalTimeInMinutes,
            numberOfServings: schema_1.recipesTable.numberOfServings,
        })
            .from(schema_1.recipesTable)
            .leftJoin(schema_1.imagesTable, (0, drizzle_orm_1.eq)(schema_1.imagesTable.recipeId, schema_1.recipesTable.id))
            .where((0, drizzle_orm_1.eq)(schema_1.imagesTable.isPrimary, true)) // Fetch only the primary image
            .execute();
        return recipes;
    });
}
// fetch a single recipe by id.  include the recipe's title, author, description, instructions, activeTimeInMinutes, totalTimeInMinutes, numberOfServings, created_at, and updated_at.  include ingredient names, quantities, and units.  Also include the recipe's image URLs. This query is used to populate the RecipeDetails page.
function getRecipeById(id) {
    return __awaiter(this, void 0, void 0, function* () {
        // Fetch the main recipe details
        const recipe = yield index_1.db
            .select({
            title: schema_1.recipesTable.title,
            author: schema_1.usersTable.username,
            userId: schema_1.recipesTable.userId,
            description: schema_1.recipesTable.description,
            instructions: schema_1.recipesTable.instructions,
            activeTimeInMinutes: schema_1.recipesTable.activeTimeInMinutes,
            totalTimeInMinutes: schema_1.recipesTable.totalTimeInMinutes,
            numberOfServings: schema_1.recipesTable.numberOfServings,
            createdAt: schema_1.recipesTable.created_at,
            updatedAt: schema_1.recipesTable.updated_at,
        })
            .from(schema_1.recipesTable)
            .leftJoin(schema_1.usersTable, (0, drizzle_orm_1.eq)(schema_1.usersTable.id, schema_1.recipesTable.userId))
            .where((0, drizzle_orm_1.eq)(schema_1.recipesTable.id, id))
            .execute();
        // Fetch the ingredients for the recipe
        const ingredients = yield index_1.db
            .select({
            name: schema_1.ingredientsTable.name,
            quantity: schema_1.recipeIngredientsTable.quantity,
            unit: schema_1.unitsTable.name,
        })
            .from(schema_1.recipeIngredientsTable)
            .leftJoin(schema_1.ingredientsTable, (0, drizzle_orm_1.eq)(schema_1.ingredientsTable.id, schema_1.recipeIngredientsTable.ingredientId))
            .leftJoin(schema_1.unitsTable, (0, drizzle_orm_1.eq)(schema_1.unitsTable.id, schema_1.recipeIngredientsTable.unitId))
            .where((0, drizzle_orm_1.eq)(schema_1.recipeIngredientsTable.recipeId, id))
            .execute();
        // Fetch the images for the recipe
        const images = yield index_1.db
            .select({
            imageUrl: schema_1.imagesTable.imageUrl,
            altText: schema_1.imagesTable.altText,
        })
            .from(schema_1.imagesTable)
            .where((0, drizzle_orm_1.eq)(schema_1.imagesTable.recipeId, id))
            .execute();
        // Fetch the categories for the recipe
        const categories = yield index_1.db
            .select({
            name: schema_1.categoriesTable.name,
        })
            .from(schema_1.recipeCategoriesTable)
            .leftJoin(schema_1.categoriesTable, (0, drizzle_orm_1.eq)(schema_1.categoriesTable.id, schema_1.recipeCategoriesTable.categoryId))
            .where((0, drizzle_orm_1.eq)(schema_1.recipeCategoriesTable.recipeId, id))
            .execute();
        const categoriesList = categories.map((category) => category.name);
        // Combine the results into a single object
        const recipeDetails = Object.assign(Object.assign({}, recipe[0]), { categories: categoriesList, ingredients,
            images });
        return recipeDetails;
    });
}
