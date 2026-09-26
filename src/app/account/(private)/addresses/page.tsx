import { getAppServices } from '@/infra/db';
import { requireCustomerPage } from '@/infra/auth/guards';
import { AddressManager } from '@/features/account/address-manager';

export default async function AddressesPage() {
  const session = await requireCustomerPage();
  const services = await getAppServices();
  const addresses = await services.accounts.listAddresses(session.sub);

  return <AddressManager addresses={addresses} />;
}
