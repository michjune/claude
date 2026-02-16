interface SourcePillsProps {
  doi?: string;
  pubmedId?: string;
  trialId?: string;
  url?: string;
}

export function SourcePills({ doi, pubmedId, trialId, url }: SourcePillsProps) {
  const links: { label: string; href: string }[] = [];

  if (doi) links.push({ label: 'DOI', href: `https://doi.org/${doi}` });
  if (pubmedId) links.push({ label: 'PubMed', href: `https://pubmed.ncbi.nlm.nih.gov/${pubmedId}/` });
  if (trialId) links.push({ label: trialId, href: `https://clinicaltrials.gov/study/${trialId}` });
  if (url) links.push({ label: 'Source', href: url });

  if (links.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      {links.map(({ label, href }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-border-subtle bg-surface/80 px-2 py-0.5 text-[10.5px] font-mono font-medium text-muted-foreground/70 transition-all hover:border-primary/30 hover:text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <svg className="h-2.5 w-2.5 opacity-40" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
          </svg>
          {label}
        </a>
      ))}
    </div>
  );
}
