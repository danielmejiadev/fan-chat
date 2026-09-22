import { z } from "zod";

const PAYMENT_METHOD_VALUES = ["card", "apple", "paypal", "crypto"] as const;

export const giftFormSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  amountCents: z.number().positive("Select a gift amount"),
  paymentMethod: z.enum(PAYMENT_METHOD_VALUES),
});

export type GiftFormValues = z.infer<typeof giftFormSchema>;
