// backend/src/validators/dashboard.schema.js
import { z } from "zod";

export const dashboardQuerySchema = z.object({
  page: z.coerce.number().int().min(0).max(100000).default(0),
  pageSize: z.coerce.number().int().min(1).max(50).default(5),
});
