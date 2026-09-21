import { generateUuid } from "@/utils/generateUuid";

export function generateClientId(): string {
  return generateUuid();
}
