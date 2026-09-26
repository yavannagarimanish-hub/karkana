import { requireAdminPage } from '@/infra/auth/guards';
import { getAppServices } from '@/infra/db';
import { SectionEditor } from '@/features/admin/section-editor';

export default async function AdminSectionsPage() {
  await requireAdminPage();
  const services = await getAppServices();
  const sections = await services.admin.listSections();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-extrabold tracking-[0.02em] uppercase sm:text-3xl">Storefront sections</h1>
        <p className="mt-2 max-w-2xl text-sm text-fg-muted">
          Sections with no matching products are omitted from the home page automatically, so hiding
          an empty one is only needed to control ordering.
        </p>
      </header>

      <SectionEditor sections={sections} />
    </div>
  );
}
