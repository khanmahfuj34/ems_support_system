import { z } from "zod";

export const createTicketSchema = z.object({
  subject: z
    .string()
    .min(1, "Subject is required")
    .max(255, "Subject must not exceed 255 characters")
    .trim(),
  categoryId: z.string().min(1, "Please select a category"),
  subCategoryId: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"], {
    message: "Please select a priority",
  }),
  description: z
    .string()
    .min(1, "Description is required")
    .refine((val) => {
      // Strip html tags and check if non-empty
      const stripped = val.replace(/<[^>]*>/g, "").trim();
      return stripped.length > 0;
    }, "Description must contain actual text"),
});

export type CreateTicketFormValues = z.infer<typeof createTicketSchema>;
