import { HAZMAT_NONE, HAZMAT_PRESETS, TRAILER_TYPES, TRAILER_LABELS } from "@/lib/equipment";

export function TrailerTypeSelect({
  id,
  name,
  defaultValue = "DRY_VAN",
}: {
  id: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <select id={id} name={name} className="field" defaultValue={defaultValue}>
      {TRAILER_TYPES.map((type) => (
        <option key={type} value={type}>
          {TRAILER_LABELS[type]}
        </option>
      ))}
    </select>
  );
}

export function HazmatSelect({
  id,
  name,
  defaultValue = HAZMAT_NONE,
}: {
  id: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <select id={id} name={name} className="field" defaultValue={defaultValue}>
      {HAZMAT_PRESETS.map((item) => (
        <option key={item.code} value={item.code}>
          {item.label}
        </option>
      ))}
    </select>
  );
}
