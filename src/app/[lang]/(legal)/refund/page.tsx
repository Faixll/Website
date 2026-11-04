import type { Metadata } from 'next';
import type { Lang } from '@/config/site';
import { getDict } from '@/lib/i18n';
import { LegalPage } from '../LegalPage';

// TODO (business): replace the placeholder with the real text.
export async function generateMetadata({ params }: { params: Promise<{ lang: Lang }> }): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(lang).refund };
}

export default async function Page({ params }: { params: Promise<{ lang: Lang }> }) {
  const { lang } = await params;
  return <LegalPage lang={lang} title={getDict(lang).refund} />;
}
