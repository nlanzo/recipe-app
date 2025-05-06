Work in progress

Recipe App developed with React, Material UI, Node, express, DrizzleORM, PostgreSQL, Vite.

![](https://github.com/nlanzo/recipe-app/blob/main/Screenshot.png)

## Testing

This project uses Vitest and React Testing Library for testing. The following types of tests are implemented:

- **Component Tests**: Testing React components with React Testing Library
- **Utility Tests**: Testing utility functions
- **API Tests**: Testing API endpoints with Supertest

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- path/to/test/file.test.ts
```

### Test Organization

Tests are organized in `__tests__` directories next to the code they test:

- `src/components/__tests__/` - Component tests
- `src/pages/__tests__/` - Page component tests
- `src/server/__tests__/` - API/server tests
- `src/utils/__tests__/` - Utility function tests

### Test Setup

The test setup file is located at `src/test/setup.ts` and includes configuration for React Testing Library and jest-dom matchers.

A custom render function is provided in `src/test/utils.tsx` that wraps the tested components with necessary providers (Router, Theme, etc.).
