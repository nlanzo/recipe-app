# Recipe App

A modern, full-featured recipe management application built with React and Material UI. This application allows users to discover, create, and manage their favorite recipes with an intuitive interface.

![Application Screenshot](https://github.com/nlanzo/recipe-app/blob/main/Screenshot.png)

## Features

- **Recipe Management**

  - Create, edit, and delete recipes
  - Add detailed recipe information including ingredients, instructions, prep time, and servings
  - Upload multiple images per recipe
  - Categorize recipes (Breakfast, Lunch, Dinner, etc.)

- **Recipe Discovery**

  - Browse recipes with pagination
  - Search recipes by title and ingredients
  - Sort recipes by title or preparation time
  - Filter recipes by categories

- **User Features**
  - Save favorite recipes
  - AI-powered recipe assistant for personalized recommendations
  - User authentication and authorization

## Technology Stack

- **Frontend**

  - React
  - Material UI
  - TypeScript
  - Vite

- **Backend**
  - Node.js
  - Express
  - DrizzleORM
  - PostgreSQL

## Testing

This project uses Vitest and React Testing Library for testing:

- Component Tests
- Utility Tests
- API Tests

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables
4. Start the development server:
   ```bash
   npm run dev
   ```
