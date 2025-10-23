import { z } from "zod";

export const datetimeSchema = z.iso.datetime({ offset: true });
