import { writeFileSync } from "node:fs";
import { OPENAPI_FILE, openApiJson } from "./document";

// Regenerates docs/openapi.json from the contracts. A test fails if it's out of date.
writeFileSync(OPENAPI_FILE, openApiJson());
console.log(`wrote ${OPENAPI_FILE}`);
