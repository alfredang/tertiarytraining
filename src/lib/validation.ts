import { z } from "zod";

export const emailSchema = z.string().email().max(200);
export const passwordSchema = z.string().min(8).max(200);
export const nameSchema = z.string().min(1).max(120);

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
});

export const otpSendSchema = z.object({
  email: emailSchema,
});

export const otpVerifySchema = z.object({
  email: emailSchema,
  code: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
});

export const environmentSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(1000),
  dockerImage: z.string().min(1).max(200),
  defaultPort: z.coerce.number().int().min(1).max(65535),
  accessUrl: z.string().url().max(500),
  enabled: z.boolean().optional(),
});

export const containerSchema = z.object({
  name: z.string().min(1).max(120),
  environmentId: z.string().min(1),
  containerUrl: z.string().url().max(500),
  port: z.coerce.number().int().min(1).max(65535),
  assignedUserId: z.string().nullable().optional(),
  status: z.enum(["RUNNING", "STOPPED", "REFRESHING", "ERROR"]).optional(),
});

export const userCreateSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  role: z.enum(["LEARNER", "TRAINER", "ADMIN"]),
  status: z.enum(["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"]).optional(),
});

export const userUpdateSchema = z.object({
  email: emailSchema.optional(),
  name: nameSchema.optional(),
  role: z.enum(["LEARNER", "TRAINER", "ADMIN"]).optional(),
  status: z.enum(["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"]).optional(),
  password: passwordSchema.optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});
