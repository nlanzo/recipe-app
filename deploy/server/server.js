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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const multer_1 = __importDefault(require("multer"));
const client_s3_1 = require("@aws-sdk/client-s3");
const recipeQueries_1 = require("../db/recipeQueries");
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const authService_1 = require("./services/authService");
const auth_1 = require("./middleware/auth");
const bcrypt_1 = __importDefault(require("bcrypt"));
// Initialize Express app
const app = (0, express_1.default)();
const port = 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
// Configure Multer to handle file uploads
const storage = multer_1.default.memoryStorage(); // Store uploaded files in memory
const upload = (0, multer_1.default)({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
});
// Query the database for the recipe with the specified ID
app.get("/api/recipes/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const recipeId = parseInt(req.params.id);
    const recipe = yield (0, recipeQueries_1.getRecipeById)(recipeId);
    res.json(recipe);
}));
app.get("/api/recipes", (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const recipes = yield (0, recipeQueries_1.getRecipeCardData)();
    res.json(recipes);
}));
// TODO update this endpoint
app.post("/api/recipes", auth_1.authenticateToken, upload.array("images", 10), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    if (!userId) {
        res.status(401).json({ error: "User ID is required" });
        return;
    }
    const { title, description, instructions, activeTime, totalTime, servings, categories, ingredients, } = req.body;
    console.log("Request body:", req.body); // Debugging: Log the request body
    console.log("Request files:", req.files); // Debugging: Log the uploaded files
    try {
        // Parse the form data fields - make sure these are properly stringified on the client
        const parsedCategories = categories ? JSON.parse(categories) : [];
        const parsedIngredients = ingredients ? JSON.parse(ingredients) : [];
        yield db_1.db.transaction((trx) => __awaiter(void 0, void 0, void 0, function* () {
            // Step 1: Add Recipe
            const recipe = yield trx
                .insert(schema_1.recipesTable)
                .values({
                userId,
                title: title,
                description: description,
                instructions: instructions,
                activeTimeInMinutes: activeTime ? Number(activeTime) : 0,
                totalTimeInMinutes: Number(totalTime),
                numberOfServings: Number(servings),
            })
                .returning();
            const recipeId = recipe[0].id;
            // Step 2: Add Categories
            for (const category of parsedCategories) {
                let categoryRecord = yield trx
                    .select()
                    .from(schema_1.categoriesTable)
                    .where((0, drizzle_orm_1.eq)(schema_1.categoriesTable.name, category))
                    .limit(1);
                if (!categoryRecord.length) {
                    categoryRecord = yield trx
                        .insert(schema_1.categoriesTable)
                        .values({ name: category })
                        .returning();
                }
                yield trx.insert(schema_1.recipeCategoriesTable).values({
                    recipeId,
                    categoryId: categoryRecord[0].id,
                });
            }
            // Step 3: Add Ingredients
            for (const ingredient of parsedIngredients) {
                let ingredientRecord = yield trx
                    .select()
                    .from(schema_1.ingredientsTable)
                    .where((0, drizzle_orm_1.eq)(schema_1.ingredientsTable.name, ingredient.name))
                    .limit(1);
                if (!ingredientRecord.length) {
                    ingredientRecord = yield trx
                        .insert(schema_1.ingredientsTable)
                        .values({ name: ingredient.name })
                        .returning();
                }
                const unitRecord = yield trx
                    .select()
                    .from(schema_1.unitsTable)
                    .where((0, drizzle_orm_1.eq)(schema_1.unitsTable.name, ingredient.unit))
                    .limit(1);
                if (!unitRecord.length) {
                    return res
                        .status(400)
                        .json({ error: `Invalid unit: ${ingredient.unit}` });
                }
                yield trx.insert(schema_1.recipeIngredientsTable).values({
                    recipeId,
                    ingredientId: ingredientRecord[0].id,
                    unitId: unitRecord[0].id,
                    quantity: ingredient.quantity,
                });
            }
            if (Array.isArray(req.files) && req.files.length > 0) {
                console.log(`Uploading ${req.files.length} images to S3...`);
                for (const [index, file] of req.files.entries()) {
                    const s3Params = {
                        Bucket: process.env.S3_BUCKET_NAME,
                        Key: `recipes/${Date.now()}-${file.originalname}`, // Unique filename
                        Body: file.buffer,
                        ContentType: file.mimetype,
                    };
                    const uploadCommand = new client_s3_1.PutObjectCommand(Object.assign({}, s3Params));
                    try {
                        const s3Response = yield s3Client.send(uploadCommand);
                        console.log("S3 Response:", s3Response);
                    }
                    catch (caught) {
                        if (caught instanceof client_s3_1.S3ServiceException &&
                            caught.name === "EntityTooLarge") {
                            console.error("Image is too large:", caught);
                        }
                        else if (caught instanceof client_s3_1.S3ServiceException) {
                            console.error(`Error from S3 while uploading object to ${s3Params.Bucket}.  ${caught.name}: ${caught.message}`);
                            throw new Error("S3 upload failed");
                        }
                        else {
                            throw caught;
                        }
                    }
                    const imageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Params.Key}`;
                    yield trx.insert(schema_1.imagesTable).values({
                        recipeId,
                        imageUrl, // The S3 URL
                        altText: `Image of ${title}`,
                        isPrimary: index === 0, // Mark the first image as primary
                    });
                }
            }
            else {
                console.error("No files detected to upload.");
                throw new Error("No files uploaded");
            }
            res
                .status(201)
                .json({ message: "Recipe added successfully!", id: recipeId });
        }));
    }
    catch (error) {
        console.error("Error adding recipe:", error);
        res.status(500).json({ error: "Failed to add recipe." });
    }
}));
app.put("/api/recipes/:id", upload.array("newImages", 10), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Request body:", req.body); // Debugging: Log the request body
    console.log("Request files:", req.files); // Debugging: Log the uploaded files
    const recipeId = parseInt(req.params.id, 10);
    if (isNaN(recipeId)) {
        res.status(400).json({ error: "Invalid recipe ID" });
        return;
    }
    const { title, description, instructions, activeTimeInMinutes, totalTimeInMinutes, numberOfServings, categories, ingredients, removedImages, // Array of image URLs to delete from S3 (optional)
     } = req.body;
    try {
        yield db_1.db.transaction((trx) => __awaiter(void 0, void 0, void 0, function* () {
            // Step 1: Update the recipe details
            yield trx
                .update(schema_1.recipesTable)
                .set({
                title,
                description,
                instructions,
                activeTimeInMinutes: Number(activeTimeInMinutes),
                totalTimeInMinutes: Number(totalTimeInMinutes),
                numberOfServings: Number(numberOfServings),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.recipesTable.id, recipeId));
            // Step 2: Update Categories
            if (Array.isArray(categories)) {
                // Remove existing category links for the recipe
                yield trx
                    .delete(schema_1.recipeCategoriesTable)
                    .where((0, drizzle_orm_1.eq)(schema_1.recipeCategoriesTable.recipeId, recipeId));
                // Add the new categories
                for (const categoryName of categories) {
                    let categoryRecord = yield trx
                        .select()
                        .from(schema_1.categoriesTable)
                        .where((0, drizzle_orm_1.eq)(schema_1.categoriesTable.name, categoryName))
                        .limit(1);
                    if (!categoryRecord.length) {
                        categoryRecord = yield trx
                            .insert(schema_1.categoriesTable)
                            .values({ name: categoryName })
                            .returning();
                    }
                    yield trx.insert(schema_1.recipeCategoriesTable).values({
                        recipeId,
                        categoryId: categoryRecord[0].id,
                    });
                }
            }
            // Step 3: Update Ingredients
            if (Array.isArray(ingredients)) {
                // Remove existing ingredient links for the recipe
                yield trx
                    .delete(schema_1.recipeIngredientsTable)
                    .where((0, drizzle_orm_1.eq)(schema_1.recipeIngredientsTable.recipeId, recipeId));
                // Add the new ingredients
                for (const ingredient of ingredients) {
                    let ingredientRecord = yield trx
                        .select()
                        .from(schema_1.ingredientsTable)
                        .where((0, drizzle_orm_1.eq)(schema_1.ingredientsTable.name, ingredient.name))
                        .limit(1);
                    if (!ingredientRecord.length) {
                        ingredientRecord = yield trx
                            .insert(schema_1.ingredientsTable)
                            .values({ name: ingredient.name })
                            .returning();
                    }
                    const unitRecord = yield trx
                        .select()
                        .from(schema_1.unitsTable)
                        .where((0, drizzle_orm_1.eq)(schema_1.unitsTable.name, ingredient.unit))
                        .limit(1);
                    if (!unitRecord.length) {
                        res
                            .status(400)
                            .json({ error: `Invalid unit: ${ingredient.unit}` });
                        return;
                    }
                    yield trx.insert(schema_1.recipeIngredientsTable).values({
                        recipeId,
                        ingredientId: ingredientRecord[0].id,
                        unitId: unitRecord[0].id,
                        quantity: ingredient.quantity,
                    });
                }
            }
            // Step 4: Delete Old Images from S3 (if requested)
            const imagesToDelete = JSON.parse(removedImages);
            if (Array.isArray(imagesToDelete) && imagesToDelete.length > 0) {
                for (const imageUrl of imagesToDelete) {
                    console.log(imageUrl);
                    const key = imageUrl.split("/").slice(-1)[0]; // Extract the key from the URL
                    const deleteCommand = new client_s3_1.DeleteObjectCommand({
                        Bucket: process.env.S3_BUCKET_NAME,
                        Key: key,
                    });
                    try {
                        yield s3Client.send(deleteCommand);
                    }
                    catch (s3Error) {
                        console.error(`Error deleting image ${key} from S3:`, s3Error);
                    }
                    // Remove image record from the database
                    yield trx
                        .delete(schema_1.imagesTable)
                        .where((0, drizzle_orm_1.eq)(schema_1.imagesTable.imageUrl, imageUrl));
                }
            }
            else {
                console.log("No images to delete.");
            }
            // Step 5: Upload New Images to S3 (if provided)
            if (Array.isArray(req.files) && req.files.length > 0) {
                console.log(`Uploading ${req.files.length} images to S3...`);
                for (const [index, file] of req.files.entries()) {
                    const s3Params = {
                        Bucket: process.env.S3_BUCKET_NAME,
                        Key: `recipes/${Date.now()}-${file.originalname}`, // Unique filename
                        Body: file.buffer,
                        ContentType: file.mimetype,
                    };
                    const uploadCommand = new client_s3_1.PutObjectCommand(Object.assign({}, s3Params));
                    try {
                        const s3Response = yield s3Client.send(uploadCommand);
                        console.log("S3 Response:", s3Response);
                    }
                    catch (caught) {
                        if (caught instanceof client_s3_1.S3ServiceException &&
                            caught.name === "EntityTooLarge") {
                            console.error("Image is too large:", caught);
                        }
                        else if (caught instanceof client_s3_1.S3ServiceException) {
                            console.error(`Error from S3 while uploading object to ${s3Params.Bucket}.  ${caught.name}: ${caught.message}`);
                            throw new Error("S3 upload failed");
                        }
                        else {
                            throw caught;
                        }
                    }
                    const imageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Params.Key}`;
                    yield trx.insert(schema_1.imagesTable).values({
                        recipeId,
                        imageUrl, // The S3 URL
                        altText: `Image of ${title}`,
                        isPrimary: index === 0, // Mark the first image as primary
                    });
                }
            }
        }));
        res.status(200).json({ message: "Recipe updated successfully!" });
    }
    catch (error) {
        console.error("Error updating recipe:", error);
        res.status(500).json({ error: "Failed to update recipe." });
    }
}));
app.delete("/api/recipes/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const recipeId = parseInt(req.params.id, 10);
    console.log("Deleting recipe with ID:", recipeId);
    if (isNaN(recipeId)) {
        res.status(400).json({ error: "Invalid recipe ID" });
        return;
    }
    try {
        yield db_1.db.transaction((trx) => __awaiter(void 0, void 0, void 0, function* () {
            // Step 1: Fetch all image URLs for the recipe
            const images = yield trx
                .select()
                .from(schema_1.imagesTable)
                .where((0, drizzle_orm_1.eq)(schema_1.imagesTable.recipeId, recipeId));
            // Step 2: Delete images from AWS S3
            if (images.length > 0) {
                const objectsToDelete = images.map((image) => ({
                    Key: image.imageUrl,
                }));
                const deleteCommand = new client_s3_1.DeleteObjectsCommand({
                    Bucket: process.env.S3_BUCKET_NAME,
                    Delete: { Objects: objectsToDelete },
                });
                try {
                    yield s3Client.send(deleteCommand);
                    console.log("Images deleted from S3 successfully.");
                }
                catch (s3Error) {
                    console.error("Error deleting images from S3:", s3Error);
                    throw new Error("Failed to delete images from S3.");
                }
            }
            // Step 3: Delete from `imagesTable`
            yield trx.delete(schema_1.imagesTable).where((0, drizzle_orm_1.eq)(schema_1.imagesTable.recipeId, recipeId));
            // Step 4: Delete from `recipeIngredientsTable`
            yield trx
                .delete(schema_1.recipeIngredientsTable)
                .where((0, drizzle_orm_1.eq)(schema_1.recipeIngredientsTable.recipeId, recipeId));
            // Step 5: Delete from `recipeCategoriesTable`
            yield trx
                .delete(schema_1.recipeCategoriesTable)
                .where((0, drizzle_orm_1.eq)(schema_1.recipeCategoriesTable.recipeId, recipeId));
            // Step 6: Delete from `recipesTable`
            const deletedRecipe = yield trx
                .delete(schema_1.recipesTable)
                .where((0, drizzle_orm_1.eq)(schema_1.recipesTable.id, recipeId))
                .returning();
            if (deletedRecipe.length === 0) {
                throw new Error("Recipe not found or already deleted.");
            }
        }));
        res
            .status(200)
            .json({ message: "Recipe and associated data deleted successfully." });
    }
    catch (error) {
        console.error("Error deleting recipe:", error);
        res
            .status(500)
            .json({ error: "Failed to delete recipe. Please try again." });
    }
}));
// Add these routes to your existing Express app
app.post("/api/auth/register", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, email, password } = req.body;
        const result = yield authService_1.AuthService.register({ username, email, password });
        res.json(result);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Registration failed";
        res.status(400).json({ error: errorMessage });
    }
}));
app.post("/api/auth/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        const result = yield authService_1.AuthService.login({ email, password });
        res.json(result);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Login failed";
        res.status(401).json({ error: errorMessage });
    }
}));
// Save a recipe
app.post("/api/recipes/:id/save", auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const recipeId = parseInt(req.params.id);
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    if (!userId) {
        res.status(401).json({ error: "User ID is required" });
        return;
    }
    try {
        yield db_1.db.insert(schema_1.savedRecipesTable).values({
            recipeId,
            userId,
        });
        res.status(200).json({ message: "Recipe saved successfully" });
    }
    catch (error) {
        console.error("Error saving recipe:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to save recipe";
        res.status(500).json({ error: errorMessage });
    }
}));
// Unsave a recipe
app.delete("/api/recipes/:id/save", auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const recipeId = parseInt(req.params.id);
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    if (!userId) {
        res.status(401).json({ error: "User ID is required" });
        return;
    }
    try {
        yield db_1.db
            .delete(schema_1.savedRecipesTable)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.savedRecipesTable.userId, userId), (0, drizzle_orm_1.eq)(schema_1.savedRecipesTable.recipeId, recipeId)));
        res.status(200).json({ message: "Recipe unsaved successfully" });
    }
    catch (error) {
        console.error("Error unsaving recipe:", error);
        res.status(500).json({ error: "Failed to unsave recipe" });
    }
}));
// Get user's saved recipes
app.get("/api/user/saved-recipes", auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    if (!userId) {
        res.status(401).json({ error: "User ID is required" });
        return;
    }
    try {
        const savedRecipes = yield db_1.db
            .select({
            id: schema_1.recipesTable.id,
            title: schema_1.recipesTable.title,
            imageUrl: schema_1.imagesTable.imageUrl,
            totalTimeInMinutes: schema_1.recipesTable.totalTimeInMinutes,
            numberOfServings: schema_1.recipesTable.numberOfServings,
        })
            .from(schema_1.savedRecipesTable)
            .innerJoin(schema_1.recipesTable, (0, drizzle_orm_1.eq)(schema_1.savedRecipesTable.recipeId, schema_1.recipesTable.id))
            .leftJoin(schema_1.imagesTable, (0, drizzle_orm_1.eq)(schema_1.imagesTable.recipeId, schema_1.recipesTable.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.savedRecipesTable.userId, userId), (0, drizzle_orm_1.eq)(schema_1.imagesTable.isPrimary, true)));
        res.json(savedRecipes);
    }
    catch (error) {
        console.error("Error fetching saved recipes:", error);
        res.status(500).json({ error: "Failed to fetch saved recipes" });
    }
}));
// Get user's created recipes
app.get("/api/user/my-recipes", auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
    if (!userId) {
        res.status(401).json({ error: "User ID is required" });
        return;
    }
    try {
        const myRecipes = yield db_1.db
            .select({
            id: schema_1.recipesTable.id,
            title: schema_1.recipesTable.title,
            imageUrl: schema_1.imagesTable.imageUrl,
            totalTimeInMinutes: schema_1.recipesTable.totalTimeInMinutes,
            numberOfServings: schema_1.recipesTable.numberOfServings,
        })
            .from(schema_1.recipesTable)
            .leftJoin(schema_1.imagesTable, (0, drizzle_orm_1.eq)(schema_1.imagesTable.recipeId, schema_1.recipesTable.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.recipesTable.userId, userId), (0, drizzle_orm_1.eq)(schema_1.imagesTable.isPrimary, true)));
        res.json(myRecipes);
    }
    catch (error) {
        console.error("Error fetching user's recipes:", error);
        res.status(500).json({ error: "Failed to fetch user's recipes" });
    }
}));
app.put("/api/user/password", auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        // Get user from database
        const [user] = yield db_1.db
            .select()
            .from(schema_1.usersTable)
            .where((0, drizzle_orm_1.eq)(schema_1.usersTable.id, userId))
            .limit(1);
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        // Verify current password
        const isValidPassword = yield bcrypt_1.default.compare(currentPassword, user.passwordHash);
        if (!isValidPassword) {
            res.status(401).json({ error: "Current password is incorrect" });
            return;
        }
        // Hash new password
        const newPasswordHash = yield bcrypt_1.default.hash(newPassword, 10);
        // Update password in database
        yield db_1.db
            .update(schema_1.usersTable)
            .set({ passwordHash: newPasswordHash })
            .where((0, drizzle_orm_1.eq)(schema_1.usersTable.id, userId));
        res.status(200).json({ message: "Password updated successfully" });
    }
    catch (error) {
        console.error("Error updating password:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to update password";
        res.status(500).json({ error: errorMessage });
    }
}));
// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
