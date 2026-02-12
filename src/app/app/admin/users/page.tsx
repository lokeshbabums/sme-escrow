import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function AdminUsersPage() {
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;
  if (role !== "ADMIN") redirect("/app");

  const users = await prisma.user.findMany({
    where: { role: { not: "ADMIN" } },
    include: { profile: true },
    orderBy: { createdAt: "desc" },
  });

  const kycBadge = (status: string) => {
    if (status === "APPROVED") return "bg-green-100 text-green-800 border-green-200";
    if (status === "PENDING") return "bg-yellow-100 text-yellow-800 border-yellow-200";
    if (status === "REJECTED") return "bg-red-100 text-red-800 border-red-200";
    return "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-[hsl(var(--muted-foreground))]">Clients and vendors on the platform.</p>
        </div>
        <Link href="/app/admin/create-user"><Button>Create User</Button></Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User List</CardTitle>
          <CardDescription>{users.length} users</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {users.length === 0 ? (
            <div className="text-sm text-[hsl(var(--muted-foreground))]">No users found.</div>
          ) : (
            users.map((u) => {
              const kyc = u.profile?.kycStatus ?? "NOT_STARTED";
              return (
                <div key={u.id} className="rounded-2xl border p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">{u.name ?? u.email}</div>
                    <div className="text-sm text-[hsl(var(--muted-foreground))] truncate">{u.email}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge>{u.role}</Badge>
                    <Badge variant="outline" className={kycBadge(kyc)}>{kyc}</Badge>
                    <Link href={`/app/admin/users/${u.id}`}>
                      <Button variant="outline" size="sm">Manage</Button>
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
