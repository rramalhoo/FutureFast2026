import { NativeSelect } from "@/components/ui/input";
import { BR_STATES } from "@/lib/labels";

export function StateSelect(props: React.ComponentProps<"select">) {
  return (
    <NativeSelect {...props}>
      <option value="">UF</option>
      {BR_STATES.map((uf) => (
        <option key={uf} value={uf}>
          {uf}
        </option>
      ))}
    </NativeSelect>
  );
}
