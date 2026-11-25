import { fileURLToPath } from "node:url";
import { buildOpenApiDocument } from "@mini-trade/contracts/openapi";

/** Where the checked-in copy lives, so reviewers can read the API on GitHub. */
export const OPENAPI_FILE = fileURLToPath(new URL("../../../../docs/openapi.json", import.meta.url));

/** The exact text written to `docs/openapi.json` (stable key order, trailing newline). */
export const openApiJson = () => `${JSON.stringify(buildOpenApiDocument(), null, 2)}\n`;

/**
 * Interactive docs page for `/docs`. Swagger UI is loaded from a CDN so the
 * server gains no dependency; it's a dev convenience, not part of the app.
 */
export const DOCS_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Mini Trade mock API</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="docs"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      SwaggerUIBundle({ url: "/api/openapi.json", dom_id: "#docs", tryItOutEnabled: true });
    </script>
  </body>
</html>
`;
