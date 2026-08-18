import { prisma } from "@/lib/db";
import { InviteAcceptForm } from "./invite-accept-form";

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const invite = await prisma.invite.findUnique({
    where: { code },
    include: { organization: true },
  });

  const valid = invite && invite.status === "pending" && invite.expiresAt > new Date();

  if (!invite || !valid) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 text-center">
        <h1 className="mb-2 text-xl font-semibold">Invite not valid</h1>
        <p className="text-sm text-gray-500">This invite has expired, been revoked, or already been used.</p>
      </main>
    );
  }

  const existingUser = await prisma.user.findUnique({ where: { email: invite.email }, select: { id: true } });
  const role = await prisma.role.findUnique({
    where: { organizationId_key: { organizationId: invite.organizationId, key: invite.roleKey } },
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 text-xl font-semibold">Join {invite.organization.name}</h1>
      <p className="mb-6 text-sm text-gray-500">
        You&apos;ve been invited as <span className="font-medium text-gray-700">{role?.name ?? invite.roleKey}</span>.
      </p>
      <InviteAcceptForm code={code} email={invite.email} isExistingUser={!!existingUser} />
    </main>
  );
}
