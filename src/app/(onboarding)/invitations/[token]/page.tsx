import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AlertTriangle, Building2, MailCheck } from "lucide-react";

import { InvitationAcceptButton } from "@/components/firms/invitation-accept-button";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getInvitationByToken } from "@/lib/firms/invitations";
import { getFirmContext } from "@/lib/firm-context";
import { requireSession } from "@/lib/session";

type InvitationPageProps = {
  params: Promise<{ token: string }>;
};

export const metadata: Metadata = {
  title: "Invitation",
};

function Shell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <MailCheck aria-hidden="true" className="h-8 w-8 text-primary" />
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

export default async function InvitationPage({ params }: InvitationPageProps) {
  const { token } = await params;
  const { user } = await requireSession();
  const t = await getTranslations("team.accept");
  const tRoles = await getTranslations("roles");

  const invitation = await getInvitationByToken(token);

  if (!invitation) {
    return (
      <Shell title={t("notFoundTitle")} description={t("notFoundBody")}>
        <Link
          href="/dashboard"
          className={buttonVariants({ variant: "outline", className: "w-full" })}
        >
          {t("goToDashboard")}
        </Link>
      </Shell>
    );
  }

  if (invitation.status === "ACCEPTED") {
    return (
      <Shell title={t("alreadyAcceptedTitle")} description={t("alreadyAcceptedBody")}>
        <Link href="/dashboard" className={buttonVariants({ className: "w-full" })}>
          {t("goToDashboard")}
        </Link>
      </Shell>
    );
  }

  if (invitation.status !== "PENDING" || invitation.expiresAt <= new Date()) {
    return (
      <Shell title={t("expiredTitle")} description={t("expiredBody")}>
        <Link
          href="/dashboard"
          className={buttonVariants({ variant: "outline", className: "w-full" })}
        >
          {t("goToDashboard")}
        </Link>
      </Shell>
    );
  }

  if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
    return (
      <Shell
        title={t("mismatchTitle")}
        description={t("mismatchBody", { email: invitation.email })}
      >
        <Alert variant="destructive">
          <p className="flex items-start gap-2">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            {t("signedInAs", { email: user.email })}
          </p>
        </Alert>
        <Link
          href="/dashboard"
          className={buttonVariants({ variant: "outline", className: "w-full" })}
        >
          {t("goToDashboard")}
        </Link>
      </Shell>
    );
  }

  const context = await getFirmContext();
  if (context?.firmId === invitation.firmId) {
    redirect("/dashboard");
  }

  return (
    <Shell
      title={t("title")}
      description={t("description", {
        inviter: invitation.invitedBy?.name ?? invitation.firm.name,
        firm: invitation.firm.name,
      })}
    >
      <div className="rounded-lg border bg-muted/40 p-4">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Building2 aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
          {invitation.firm.name}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("role", { role: tRoles(invitation.role) })}
        </p>
      </div>

      <InvitationAcceptButton token={invitation.token} />

      <p className="text-center text-xs text-muted-foreground">
        {t("wrongAccount", { email: user.email })}
      </p>
    </Shell>
  );
}
