import { z } from "zod";

import { StorePurchaseStatus } from "@/features/purchases/types";

const PAYMENT_METHOD_VALUES = ["card", "apple", "paypal", "crypto"] as const;
const DEBUG_OUTCOME_VALUES = [
  StorePurchaseStatus.Succeeded,
  StorePurchaseStatus.Canceled,
  StorePurchaseStatus.Failed,
] as const;

export const giftFormSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  amountCents: z.number().positive("Select a gift amount"),
  paymentMethod: z.enum(PAYMENT_METHOD_VALUES),
  debugOutcome: z.enum(DEBUG_OUTCOME_VALUES).optional(),
});

export type GiftFormValues = z.infer<typeof giftFormSchema>;
