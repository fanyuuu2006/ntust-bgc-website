# API Documentation

OpenAPI 3.1 specification: docs/api/openapi.yaml. It covers the 68 route-handler paths and 90 explicit HTTP operations currently found in src/app/api.

## Validation

- npm run openapi:lint validates YAML, OpenAPI structure, refs, and path parameters with Redocly CLI.
- npm run test:openapi scans route.ts files, converts Next.js [param] segments to OpenAPI {param} segments, and compares explicit HTTP methods.

The document describes Cookie Session authentication and never contains session tokens, secrets, or private user data. Detailed domain schemas must be maintained from the actual route handlers and Zod schemas; they must not be inferred from path names.

## Maintenance

When adding or changing a route handler, update the OpenAPI document with its method, parameters, request body, response, status codes, and authorization. Run both validation commands before review. Keep documentation changes separate from API business logic changes.

## Redocly path warning

/api/admin/board-games/suggests/{id} and /api/admin/board-games/{id}/image are real, distinct Next.js routes. OpenAPI path templates trigger Redocly no-ambiguous-paths as a warning for this pair; both paths are retained and no other validation rule is disabled.

Swagger UI is not included yet; the validated YAML and endpoint consistency test are the current documentation foundation.
