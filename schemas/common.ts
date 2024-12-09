import { z } from "zod";

export const datetimeSchema = z.string().datetime({ offset: true });
