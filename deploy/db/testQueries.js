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
// testQueries.ts
const recipeQueries_1 = require("./recipeQueries");
function testQueries() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Test getRecipeCardData
            const recipeCardData = yield (0, recipeQueries_1.getRecipeCardData)();
            console.log("Recipe Card Data:", JSON.stringify(recipeCardData, null, 2));
            // Test getRecipeById
            const recipeById = yield (0, recipeQueries_1.getRecipeById)(1); // Replace with a valid recipe ID
            console.log("Recipe by ID:", JSON.stringify(recipeById, null, 2));
        }
        catch (error) {
            console.error("Error testing queries:", error);
        }
    });
}
testQueries();
