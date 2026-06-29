import CreateOrganisation from '@/components/organisation/CreateOrganisation';
import { ORGANISATION_TYPES } from '@/_types/organisation';

export default function CreateOrganisationPage() {
  return <CreateOrganisation organisationTypes={ORGANISATION_TYPES} />;
}
