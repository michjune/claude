interface SourceLinksProps {
  doi?: string;
  pubmedId?: string;
  trialId?: string;
  url?: string;
}

export function SourceLinks({ doi, pubmedId, trialId, url }: SourceLinksProps) {
  const links: { label: string; href: string }[] = [];

  if (doi) {
    links.push({ label: 'DOI', href: `https://doi.org/${doi}` });
  }
  if (pubmedId) {
    links.push({ label: 'PubMed', href: `https://pubmed.ncbi.nlm.nih.gov/${pubmedId}/` });
  }
  if (trialId) {
    links.push({ label: trialId, href: `https://clinicaltrials.gov/study/${trialId}` });
  }
  if (url) {
    links.push({ label: 'Source', href: url });
  }

  if (links.length === 0) return null;

  return (
    <div className="flex items-center gap-3">
      {links.map(({ label, href }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] font-mono text-muted-foreground/70 underline decoration-border-subtle underline-offset-2 transition-colors hover:text-primary hover:decoration-primary/40"
        >
          {label}
        </a>
      ))}
    </div>
  );
}
