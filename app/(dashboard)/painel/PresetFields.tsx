import type { FieldSpec } from "@/lib/professions";

export function PresetFields({
  fields,
  values,
}: {
  fields: FieldSpec[];
  values?: Record<string, string>;
}) {
  if (fields.length === 0) return null;

  return (
    <>
      {fields.map((field) => {
        const id = `details-${field.key}`;
        const name = `details.${field.key}`;
        const defaultValue = values?.[field.key] ?? "";

        return (
          <div key={field.key}>
            <label className="label" htmlFor={id}>
              {field.label}
            </label>
            {field.type === "select" ? (
              <select id={id} name={name} defaultValue={defaultValue} className="field mt-1.5">
                <option value="">Selecione</option>
                {field.options?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={id}
                name={name}
                type={field.type === "date" ? "date" : "text"}
                defaultValue={defaultValue}
                placeholder={field.placeholder}
                maxLength={200}
                className="field mt-1.5"
              />
            )}
          </div>
        );
      })}
    </>
  );
}
