import { getAppServices } from '@/infra/db';
import { readCustomerSession } from '@/infra/auth/guards';
import { Navbar } from '@/ui/navbar';

/**
 * Server component that feeds the client navbar its live data: module counts
 * straight from the catalogue, and the signed-in customer's first name.
 */
export async function SiteHeader() {
  const services = await getAppServices();
  const session = await readCustomerSession();

  const [home, customer] = await Promise.all([
    services.catalogue.home(),
    session ? services.repos.customers.findById(session.sub) : Promise.resolve(null),
  ]);

  return (
    <Navbar
      modules={home.moduleCards.map((card) => ({
        slug: card.slug,
        label: card.module.toLowerCase(),
        count: card.count,
      }))}
      customerName={customer?.name ?? null}
    />
  );
}
