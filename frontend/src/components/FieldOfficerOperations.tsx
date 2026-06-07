"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { MapPin, RadioTower, RotateCcw, ShieldCheck, UploadCloud, UserPlus } from "lucide-react";
import { useRef, useState } from "react";

import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { importFieldOfficers, inviteFieldOfficer, listFieldOfficers, type FieldOfficerRead } from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspace";

type FieldOfficerOperationsProps = {
  token: string | null;
};

function generateTemporaryPassword(): string {
  const words = ["Field", "Atlas", "Green", "Swift", "Clear", "Smart", "Signal", "Survey", "Active", "Verify"];
  const word = words[Math.floor(Math.random() * words.length)];
  const digits = String(Math.floor(100000 + Math.random() * 900000));
  return `${word}${digits}!`;
}

const previewOfficers: FieldOfficerRead[] = [
  {
    id: "officer-001",
    user_id: "user-001",
    email: "amina.field@example.com",
    full_name: "Amina Diallo",
    phone_number: "+237 600 000 121",
    employee_code: "FO-128",
    home_region: "Northwest",
    last_sync_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    last_seen_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    last_latitude: 5.9631,
    last_longitude: 10.1591,
    device_id: "android-field-7781",
    is_active: true
  },
  {
    id: "officer-002",
    user_id: "user-002",
    email: "joseph.field@example.com",
    full_name: "Joseph Mbarga",
    phone_number: "+237 600 000 122",
    employee_code: "FO-141",
    home_region: "Littoral",
    last_sync_at: new Date(Date.now() - 74 * 60 * 1000).toISOString(),
    last_seen_at: new Date(Date.now() - 51 * 60 * 1000).toISOString(),
    last_latitude: 4.0511,
    last_longitude: 9.7679,
    device_id: "android-field-8842",
    is_active: true
  }
];

export function FieldOfficerOperations({ token }: FieldOfficerOperationsProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [region, setRegion] = useState("");
  const [previewRows, setPreviewRows] = useState<FieldOfficerRead[]>(previewOfficers);
  const [inviteResult, setInviteResult] = useState("");
  const [importResult, setImportResult] = useState("");
  const [refreshResult, setRefreshResult] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pushToast = useWorkspaceStore((state) => state.pushToast);

  const officersQuery = useQuery({
    queryKey: ["field-officers", token],
    queryFn: () => listFieldOfficers(token ?? ""),
    enabled: Boolean(token && token !== "preview-token")
  });

  const inviteMutation = useMutation({
    mutationFn: (temporaryPassword: string) =>
      inviteFieldOfficer(token ?? "", {
        email,
        full_name: fullName,
        home_region: region,
        temporary_password: temporaryPassword
      }),
    onSuccess: async (_, temporaryPassword) => {
      setInviteResult(
        `${fullName} was invited. Share these sign-in details with them:\n\nEmail: ${email}\nPassword: ${temporaryPassword}\n\nThey can change their password after first sign-in.`
      );
      pushToast({ title: "Field officer invited", description: `Share the generated password with ${fullName}`, tone: "success" });
      setFullName("");
      setEmail("");
      setRegion("");
      await officersQuery.refetch();
    }
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => importFieldOfficers(token ?? "", file),
    onSuccess: async (response) => {
      setImportResult(`${response.created_count} officer account${response.created_count === 1 ? "" : "s"} created. ${response.skipped_count} row${response.skipped_count === 1 ? "" : "s"} skipped.`);
      pushToast({
        title: "Officer import complete",
        description: `${response.created_count} created, ${response.skipped_count} skipped`,
        tone: response.error_count ? "warning" : "success"
      });
      await officersQuery.refetch();
    },
    onError: () => {
      setImportResult("Import failed. Use a CSV with email and full_name columns. Optional columns: phone_number, employee_code, home_region, temporary_password.");
      pushToast({ title: "Officer import failed", description: "Check the file format and your officer management permission.", tone: "danger" });
    }
  });

  const isPreview = token === "preview-token";
  const officers = isPreview ? previewRows : officersQuery.data ?? [];
  const activeCount = officers.filter((officer) => officer.is_active).length;

  const columns: TableColumn<FieldOfficerRead>[] = [
    {
      key: "officer",
      header: "Officer",
      value: (officer) => `${officer.full_name} ${officer.email} ${officer.employee_code ?? ""}`,
      render: (officer) => (
        <div>
          <p className="font-medium">{officer.full_name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{officer.email}</p>
        </div>
      )
    },
    { key: "region", header: "Region", value: (officer) => officer.home_region ?? "", render: (officer) => officer.home_region ?? "Unassigned" },
    {
      key: "sync",
      header: "Sync",
      value: (officer) => officer.last_sync_at ?? "",
      render: (officer) => (
        <div>
          <p className="font-medium">{officer.last_sync_at ? new Date(officer.last_sync_at).toLocaleTimeString() : "Never"}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{officer.device_id ?? "No device paired"}</p>
        </div>
      )
    },
    {
      key: "location",
      header: "Location",
      value: (officer) => `${officer.last_latitude ?? ""},${officer.last_longitude ?? ""}`,
      render: (officer) =>
        officer.last_latitude && officer.last_longitude ? (
          <span className="font-mono text-xs">
            {officer.last_latitude.toFixed(4)}, {officer.last_longitude.toFixed(4)}
          </span>
        ) : (
          <span className="text-muted-foreground">Unavailable</span>
        )
    },
    {
      key: "status",
      header: "Status",
      value: (officer) => (officer.is_active ? "active" : "inactive"),
      render: (officer) => <Badge tone={officer.is_active ? "success" : "neutral"}>{officer.is_active ? "Active" : "Inactive"}</Badge>
    }
  ];

  return (
    <section aria-labelledby="officers-title" className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Field team</p>
          <h1 id="officers-title" className="mt-2 text-2xl font-semibold tracking-tight">
            Field team
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Invite officers, check who has synced recently, and see where field work is happening.
          </p>
        </div>
        <Button
          disabled={officersQuery.isFetching}
          onClick={async () => {
            if (!token) {
              setRefreshResult("Sign in before refreshing field team status.");
              pushToast({ title: "Sign in required", description: "Field status is only available for signed-in users.", tone: "warning" });
              return;
            }
            let refreshedActiveCount = activeCount;
            if (!isPreview) {
              const result = await officersQuery.refetch();
              if (result.isError) {
                setRefreshResult("Field status could not be refreshed. Check your field officer permission or try again after the backend is reachable.");
                pushToast({ title: "Refresh failed", description: "Check your field officer permission or backend connection.", tone: "danger" });
                return;
              }
              refreshedActiveCount = (result.data ?? []).filter((officer) => officer.is_active).length;
            }
            setRefreshResult(`${refreshedActiveCount} active officer${refreshedActiveCount === 1 ? "" : "s"} checked. Recent sync, device pairing, and GPS fields are visible in the roster.`);
            pushToast({ title: "Field status refreshed", description: "Officer sync, device, and location details were checked.", tone: "success" });
          }}
          type="button"
          variant="primary"
        >
          <RotateCcw aria-hidden="true" />
          {officersQuery.isFetching ? "Refreshing" : "Refresh status"}
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        {[
          ["Active officers", String(activeCount), ShieldCheck],
          ["Synced last hour", String(officers.filter((officer) => officer.last_sync_at).length), RadioTower],
          ["Recent location", String(officers.filter((officer) => officer.last_latitude && officer.last_longitude).length), MapPin],
          ["Correction queue", "0", RotateCcw]
        ].map(([label, value, Icon]) => (
          <article key={label as string} className="rounded-lg border bg-panel p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{label as string}</p>
              <Icon aria-hidden="true" className="text-muted-foreground" size={17} />
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight">{value as string}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <form
          className="rounded-lg border bg-panel p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (isPreview) {
              const nextOfficer: FieldOfficerRead = {
                id: `preview-officer-${Date.now()}`,
                user_id: `preview-user-${Date.now()}`,
                email,
                full_name: fullName,
                phone_number: null,
                employee_code: `FO-${String(previewRows.length + 151).padStart(3, "0")}`,
                home_region: region || "Unassigned",
                last_sync_at: null,
                last_seen_at: null,
                last_latitude: null,
                last_longitude: null,
                device_id: null,
                is_active: true
              };
              setPreviewRows((current) => [nextOfficer, ...current]);
              setInviteResult(`${nextOfficer.full_name} was added to the preview roster with employee code ${nextOfficer.employee_code}.`);
              pushToast({ title: "Preview invite staged", description: `${fullName || email} would receive mobile access`, tone: "success" });
              setFullName("");
              setEmail("");
              setRegion("");
              return;
            }
            inviteMutation.mutate(generateTemporaryPassword());
          }}
        >
          <div className="mb-4 flex items-center gap-2">
            <UserPlus aria-hidden="true" size={18} />
            <h2 className="text-sm font-semibold">Invite field officer</h2>
          </div>
          <label className="block text-sm font-medium">
            Full name
            <Input className="mt-2" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
          </label>
          <label className="mt-4 block text-sm font-medium">
            Email
            <Input className="mt-2" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="mt-4 block text-sm font-medium">
            Region / project area
            <Input className="mt-2" value={region} onChange={(event) => setRegion(event.target.value)} />
          </label>
          <Button className="mt-5 w-full" disabled={inviteMutation.isPending} type="submit" variant="primary">
            <UserPlus aria-hidden="true" />
            Invite officer
          </Button>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Officers receive sign-in details and can keep collecting data when the internet is unreliable.
          </p>
          {inviteResult ? (
            <div className="mt-4 rounded-lg border border-success/30 bg-success/10 p-3" aria-live="polite">
              <p className="text-sm font-semibold">Invite outcome</p>
              <pre className="mt-2 whitespace-pre-wrap rounded bg-background p-2 text-xs leading-5 text-foreground">{inviteResult}</pre>
              <p className="mt-2 text-xs text-muted-foreground">Copy these details and share them with the field officer directly. The password is not stored and cannot be retrieved again.</p>
            </div>
          ) : null}
          {refreshResult ? (
            <div className="mt-4 rounded-lg border bg-background p-3" aria-live="polite">
              <p className="text-sm font-semibold">Latest field status</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{refreshResult}</p>
            </div>
          ) : null}
        </form>

        <div className="space-y-4">
          <section className="rounded-lg border bg-panel p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold">Bulk import officers</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Upload a CSV to create many field officer accounts in one action. Required columns: email, full_name. Optional: phone_number, employee_code, home_region, temporary_password.
                </p>
              </div>
              <Button disabled={!token || isPreview || importMutation.isPending} onClick={() => fileInputRef.current?.click()} type="button" variant="secondary">
                <UploadCloud aria-hidden="true" />
                {importMutation.isPending ? "Importing" : "Upload CSV"}
              </Button>
            </div>
            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              accept=".csv"
              disabled={!token || isPreview || importMutation.isPending}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (file) importMutation.mutate(file);
                event.currentTarget.value = "";
              }}
            />
            {importResult ? (
              <div className="mt-3 rounded-lg border bg-background p-3" aria-live="polite">
                <p className="text-sm font-semibold">Import result</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{importResult}</p>
              </div>
            ) : null}
          </section>
          <DataTable columns={columns} emptyLabel="No field officers yet. Invite one person or upload a CSV to start the roster." rows={officers} searchLabel="Search officers" title="Officer roster" />
        </div>
      </div>
    </section>
  );
}
