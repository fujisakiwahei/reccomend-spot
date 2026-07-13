import { ExternalLink as ExternalLinkIcon } from "lucide-react";
import type { ReactNode } from "react";

type ExternalLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
};

export function ExternalLink({
  href,
  children,
  className = "external-link",
}: ExternalLinkProps) {
  return (
    <a
      className={className}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      <ExternalLinkIcon aria-hidden="true" size={17} strokeWidth={2.5} />
      <span className="visually-hidden">（外部サイトを新しいタブで開く）</span>
    </a>
  );
}
