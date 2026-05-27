"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { MapPin, RadioTower, RotateCcw, ShieldCheck, UserPlus } from "lucide-react";
import { useState } from "react";

import { DataTable, type TableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inviteFieldOfficer, listFieldOfficers, type FieldOfficerRead } from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspace";

type FieldOfficerOperationsProps = {
  token: string | null;
};

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
  const pushToast = useWorkspaceStore((state) => state.pushToast);

  const officersQuery = useQuery({
    queryKey: ["field-officers", token],
    queryFn: () => listFieldOfficers(token ?? ""),
    enabled: Boolean(token && token !== "preview-token")
  });

  const inviteMutation = useMutation({
    mutationFn: () =>
      inviteFieldOfficer(token ?? "", {
        email,
        full_name: fullName,
        home_region: region,
        temporary_password: "ChangeMe12345!"
      }),
    onSuccess: async () => {
      pushToast({ title: "Field officer invited", description: `${fullName} can sync assigned forms`, tone: "success" });
      setFullName("");
      setEmail("");
      setRegion("");
      await officersQuery.refetch();
    }
  });

  const officers = officersQuery.data?.length ? officersQuery.data : previewOfficers;
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
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Field force</p>
          <h1 id="officers-title" className="mt-2 text-2xl font-semibold tracking-tight">
            Field officer operations
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Invite officers, monitor sync health, inspect GPS presence, and keep mobile collection teams accountable.
          </p>
        </div>
        <Button variant="primary">
          <RotateCcw aria-hidden="true" />
          Refresh sync state
        </Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        {[
          ["Active officers", String(activeCount), ShieldCheck],
          ["Synced last hour", String(officers.filter((officer) => officer.last_sync_at).length), RadioTower],
          ["GPS reporting", String(officers.filter((officer) => officer.last_latitude && officer.last_longitude).length), MapPin],
          ["Correction queue", "17", RotateCcw]
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
            if (token === "preview-token") {
              pushToast({ title: "Preview invite staged", description: `${fullName || email} would receive mobile access`, tone: "success" });
              setFullName("");
              setEmail("");
              setRegion("");
              return;
            }
            inviteMutation.mutate();
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
            Officers receive mobile-ready credentials and can sync assigned forms offline.
          </p>
        </form>

        <DataTable columns={columns} emptyLabel="No field officers yet" rows={officers} searchLabel="Search officers" title="Officer roster" />
      </div>
    </section>
  );
}
