import { TextInput as RNTextInput, type TextInputProps } from "react-native";
import { clsx } from "clsx";

// Same reasoning as src/components/Text.tsx — bakes the default Geist
// weight in so callers don't repeat font-sans on every input.
export function TextInput({ className, ...props }: TextInputProps) {
  return <RNTextInput className={clsx("font-sans", className)} {...props} />;
}
