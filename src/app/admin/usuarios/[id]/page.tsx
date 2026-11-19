import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireRole } from "@/lib/auth";

/**
 * /admin/usuarios/{id}: accounts are edited in the list now (spec 011, research R8). Old links land there,
 * after the same administrator check as every admin page. The check reads the session cookie, so it runs
 * inside <Suspense> like the other admin pages (the route shell is prerendered).
 */
export default function EditUserPage() {
  return (
    <Suspense fallback={null}>
      <ToList />
    </Suspense>
  );
}

async function ToList(): Promise<null> {
  await requireRole("ADMINISTRATOR");
  redirect("/admin/usuarios");
}
