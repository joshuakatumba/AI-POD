import { redirect } from 'next/navigation';

interface OrganisationPageProps {
  params: Promise<{ locale: string }>;
}

export default async function OrganisationPage({ params }: OrganisationPageProps) {
  const { locale } = await params;
  redirect(`/${locale}/organisation/members`);
}
