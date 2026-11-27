import { Link } from "react-router";
import { paths } from "../helpers/constants";

export function NotFoundScreen() {
  return (
    <main className="mx-auto max-w-page p-6">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <Link
        to={paths.markets()}
        className="mt-2 inline-block text-brand-primary underline"
      >
        Back to markets
      </Link>
    </main>
  );
}
