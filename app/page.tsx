import HomeClient from '@/components/HomeClient'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; refresh?: string }>
}) {
  const params = await searchParams
  return <HomeClient initialUrl={params.url} refresh={params.refresh === '1'} />
}
