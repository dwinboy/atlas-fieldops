import { type FormField } from "@/lib/forms";

export function FieldInputPreview({ field }: { field: FormField }) {
  if (field.options?.length) {
    return (
      <div className="mt-2 flex flex-wrap gap-1.5">
        {field.options.slice(0, 6).map((option) => (
          <span
            className="rounded-md border bg-surface-container-lowest px-3 py-1.5 text-xs text-muted-foreground"
            key={option}
          >
            {option}
          </span>
        ))}
      </div>
    );
  }

  if (["matrix_single", "matrix_multi", "grid"].includes(field.type)) {
    return (
      <div className="mt-2 overflow-hidden rounded-md border bg-surface-container-lowest">
        <div className="grid grid-cols-4 border-b text-[11px] text-muted-foreground">
          <span className="p-2">Row</span>
          {(field.matrix?.columns ?? ["Option 1", "Option 2", "Option 3"])
            .slice(0, 3)
            .map((column) => (
              <span className="border-l p-2" key={column}>
                {column}
              </span>
            ))}
        </div>
        {(field.matrix?.rows ?? ["Row 1", "Row 2"]).slice(0, 2).map((row) => (
          <div
            className="grid grid-cols-4 border-b last:border-b-0 text-xs"
            key={row}
          >
            <span className="p-2 text-muted-foreground">{row}</span>
            <span className="border-l p-2 text-center text-muted-foreground">
              ○
            </span>
            <span className="border-l p-2 text-center text-muted-foreground">
              ○
            </span>
            <span className="border-l p-2 text-center text-muted-foreground">
              ○
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (field.type === "repeat_group") {
    return (
      <div className="mt-2 rounded-md border border-dashed bg-surface-container-lowest px-3 py-2 text-xs text-muted-foreground">
        Add item · remove item · duplicate item · repeat limit{" "}
        {field.repeat?.max ?? "not set"}
      </div>
    );
  }

  if (["gps", "geolocation", "map", "geofence"].includes(field.type)) {
    return (
      <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
        {["Latitude", "Longitude", "Accuracy", "Timestamp"].map((label) => (
          <span
            className="rounded-md border bg-surface-container-lowest px-3 py-2 text-muted-foreground"
            key={label}
          >
            {label}
          </span>
        ))}
      </div>
    );
  }

  if (field.type === "polygon") {
    return (
      <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
        {[
          `Min vertices: ${field.polygon?.minVertices ?? 3}`,
          field.polygon?.requireClosed === false ? "Open shape allowed" : "Closed shape required",
          field.polygon?.overlapCheck === false ? "Overlap check off" : "Overlap check on",
        ].map((label) => (
          <span
            className="rounded-md border bg-surface-container-lowest px-3 py-2 text-muted-foreground"
            key={label}
          >
            {label}
          </span>
        ))}
      </div>
    );
  }

  if (
    ["photo", "image", "video", "audio", "file", "signature"].includes(
      field.type,
    )
  ) {
    return (
      <div className="mt-2 rounded-md border border-dashed bg-surface-container-lowest px-3 py-2.5 text-center text-xs text-muted-foreground">
        Capture or upload {field.type.replace("_", " ")}
      </div>
    );
  }

  if (field.type === "calculated") {
    return (
      <div className="mt-2 rounded-md border bg-surface-container-lowest px-3 py-2 font-mono text-xs text-muted-foreground">
        {field.calculation?.expression ?? "Formula preview"}
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-md border bg-surface-container-lowest px-3 py-2 text-sm text-muted-foreground">
      {field.appearance?.placeholder ?? field.hint ?? "Answer goes here"}
    </div>
  );
}
