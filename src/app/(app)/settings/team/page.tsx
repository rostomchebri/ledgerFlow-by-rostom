import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Mail, ShieldCheck, Users } from "lucide-react";

import { InviteMemberForm } from "@/components/firms/invite-member-form";
import { MemberActions } from "@/components/firms/member-actions";
import { RevokeInvitationButton } from "@/components/firms/revoke-invitation-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listFirmMembers, listPendingInvitations } from "@/lib/firms/invitations";
import { requireFirmContext } from "@/lib/firm-context";
import { assignableRoles, can, outranks } from "@/lib/rbac";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("team.meta");
  return { title: t("title"), description: t("description") };
}

export default async function TeamPage() {
  const { firmId, userId, role } = await requireFirmContext();
  const t = await getTranslations("team");
  const tRoles = await getTranslations("roles");
  const locale = await getLocale();

  const canInvite = can(role, "member.invite");
  const canManageMembers = can(role, "member.manage");
  const roles = assignableRoles(role);

  const [members, invitations] = await Promise.all([
    listFirmMembers(firmId),
    canInvite ? listPendingInvitations(firmId) : Promise.resolve([]),
  ]);

  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="space-y-2">
        <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/90">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.14)]"
          />
          {t("eyebrow")}
        </p>
        <h1 className="text-gradient text-[30px] font-bold leading-tight tracking-[-0.04em] sm:text-[34px]">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{t("description")}</p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
            <Users aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <CardTitle>{t("membersTitle")}</CardTitle>
            <CardDescription>{t("membersDescription", { count: members.length })}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-[hsl(var(--border)/0.55)] bg-[hsl(var(--card)/0.22)]">
            <Table>
              <TableHeader>
                <TableRow className="bg-[hsl(var(--card)/0.32)] hover:bg-[hsl(var(--card)/0.32)]">
                  <TableHead className="ps-4">{t("columns.member")}</TableHead>
                  <TableHead>{t("columns.role")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("columns.joined")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="ps-4">
                      <p className="flex flex-wrap items-center gap-2 font-medium">
                        {member.user.name}
                        {member.user.id === userId ? (
                          <Badge variant="muted">{t("you")}</Badge>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground">{member.user.email}</p>
                    </TableCell>
                    <TableCell>
                      {canManageMembers &&
                      member.user.id !== userId &&
                      member.role !== "OWNER" &&
                      outranks(role, member.role) ? (
                        <MemberActions
                          memberId={member.id}
                          role={member.role}
                          roles={roles}
                        />
                      ) : (
                        <Badge variant={member.role === "OWNER" ? "success" : "outline"}>
                          {tRoles(member.role)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-muted-foreground sm:table-cell">
                      {dateFormatter.format(member.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {canInvite ? (
        <Card>
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
              <Mail aria-hidden="true" className="h-5 w-5" />
            </span>
            <div className="space-y-1">
              <CardTitle>{t("inviteTitle")}</CardTitle>
              <CardDescription>{t("inviteDescription")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <InviteMemberForm roles={roles} />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">{t("pendingTitle")}</h2>
              </div>

              {invitations.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("pendingEmpty")}</p>
              ) : (
                <ul className="space-y-2">
                  {invitations.map((invitation) => (
                    <li
                      key={invitation.id}
                      className="glass-soft flex flex-col gap-1 rounded-xl px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="truncate font-medium">{invitation.email}</span>
                      <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">{tRoles(invitation.role)}</Badge>
                        {t("expires", { date: dateFormatter.format(invitation.expiresAt) })}
                        <RevokeInvitationButton invitationId={invitation.id} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
