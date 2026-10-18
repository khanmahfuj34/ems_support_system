import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Please enter a valid email address.").max(255, "Email must be 255 characters or fewer."),
  password: z.string().min(8, "Password must be at least 8 characters.").max(128, "Password must be 128 characters or fewer."),
  rememberMe: z.boolean(),
});

export const registerSchema = z
  .object({
    fullName: z.string().min(1, "Please enter your full name."),
    email: z.email("Please enter an accredited institutional email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Please confirm your password."),
    agreeToTerms: z
      .boolean()
      .refine((accepted) => accepted, { message: "Please accept the Terms of Service and Privacy Policy." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type RegisterValues = z.infer<typeof registerSchema>;

export type LoginValues = z.infer<typeof loginSchema>;
