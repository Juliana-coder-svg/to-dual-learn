import { requireUser } from "@/lib/auth/session";
import { PublicShell } from "@/components/shared/PublicShell";
import { ClaimRunner } from "@/components/try/ClaimRunner";

export const metadata = { title: "Перенос пробного ответа", robots: { index: false } };

export default async function TryClaimPage() {
  await requireUser();
  return (
    <PublicShell>
      <div className="flex flex-1 flex-col justify-center py-12">
        <ClaimRunner />
      </div>
    </PublicShell>
  );
}
