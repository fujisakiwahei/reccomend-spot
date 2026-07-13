"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { consumeDetailEntry } from "@/infrastructure/navigation/detail-return.client";

type DetailBackButtonProps = {
  slug: string;
};

export function DetailBackButton({ slug }: DetailBackButtonProps) {
  const router = useRouter();

  function navigateBack() {
    const sourcePath = consumeDetailEntry(slug);

    if (sourcePath === null) {
      router.push("/");
      return;
    }

    router.back();
  }

  return (
    <button className="back-button" type="button" onClick={navigateBack}>
      <ArrowLeft aria-hidden="true" size={20} strokeWidth={2.7} />
      前の画面へ戻る
    </button>
  );
}
