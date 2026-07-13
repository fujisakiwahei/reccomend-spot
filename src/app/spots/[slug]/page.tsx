import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SpotDetail } from "@/components/detail/SpotDetail";
import { getAllSpots, getSpotBySlug } from "@/domain/spots/repository";

type SpotDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getAllSpots().map((spot) => ({ slug: spot.slug }));
}

export async function generateMetadata({
  params,
}: SpotDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const spot = getSpotBySlug(slug);

  if (spot === null) {
    return { title: "観光地が見つかりません" };
  }

  return {
    title: spot.name,
    description: spot.description,
  };
}

export default async function SpotDetailPage({ params }: SpotDetailPageProps) {
  const { slug } = await params;
  const spot = getSpotBySlug(slug);

  if (spot === null) {
    notFound();
  }

  return (
    <div className="detail-page">
      <SpotDetail spot={spot} />
    </div>
  );
}
