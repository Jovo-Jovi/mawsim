import { Suspense } from "react";
import { notFound } from "next/navigation";
import NotFoundPage from "../not-found";

function RaiseNotFound(): never {
  notFound();
}

export default function MissingPage() {
  return (
    <>
      <NotFoundPage />
      <Suspense>
        <RaiseNotFound />
      </Suspense>
    </>
  );
}
