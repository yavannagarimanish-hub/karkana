import { getAppServices } from '@/infra/db';
import { requireAdmin } from '@/infra/auth/guards';
import { ok, toErrorResponse } from '@/infra/http';
import { z } from 'zod';

const sectionPatchSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1).max(200).optional(),
  subtitle: z.string().trim().max(400).optional(),
  isVisible: z.boolean().optional(),
  displayPosition: z.number().int().min(0).max(999).optional(),
});

export async function GET() {
  try {
    const services = await getAppServices();
    return ok({ sections: await services.admin.listSections() });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const { id, ...patch } = sectionPatchSchema.parse(await request.json());

    const services = await getAppServices();
    const section = await services.admin.updateSection(id, patch);

    return ok({ section });
  } catch (error) {
    return toErrorResponse(error);
  }
}
