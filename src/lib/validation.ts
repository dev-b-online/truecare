import { z } from "zod";

export const IL_PHONE_REGEX = /^05\d{8}$/;

export const phoneSchema = z
  .string()
  .trim()
  .regex(IL_PHONE_REGEX, "מספר טלפון ישראלי לא תקין (05XXXXXXXX)");

export const emailSchema = z.string().trim().email("כתובת אימייל לא תקינה").max(255);

export const nameSchema = z.string().trim().min(2, "שם חייב לפחות 2 תווים").max(40, "שם ארוך מדי");

export const registerSchema = z
  .object({
    firstName: nameSchema,
    channel: z.enum(["sms", "email"]),
    phone: z.string().trim().optional(),
    email: z.string().trim().optional(),
    startDate: z.string().min(1, "תאריך התחלה נדרש"),
    reminders: z.enum(["on", "off"]),
  })
  .superRefine((val, ctx) => {
    if (val.channel === "sms") {
      if (!val.phone || !IL_PHONE_REGEX.test(val.phone)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["phone"],
          message: "מספר טלפון ישראלי לא תקין (05XXXXXXXX)",
        });
      }
    } else if (val.channel === "email") {
      if (!val.email || !z.string().email().safeParse(val.email).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["email"],
          message: "כתובת אימייל לא תקינה",
        });
      }
    }
  });

export type RegisterInput = z.infer<typeof registerSchema>;
