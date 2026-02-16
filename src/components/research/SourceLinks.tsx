interface SourceLinksProps {
  doi?: string | null;
  pubmedId?: string | null;
  trialId?: string | null;
  url?: string | null;
}

export function SourceLinks({ doi, pubmedId, trialId, url }: SourceLinksProps) {
  const links: { label: string; href: string }[] = [];

  if (doi) links.push({ label: 'DOI', href: `https://doi.org/${doi}` });
  if (pubmedId) links.push({ label: 'PubMed', href: `https://pubmed.ncbi.nlm.nih.gov/${pubmedId}/` });
  if (trialId) links.push({ label: trialId, href: `https://clinicaltrials.gov/study/${trialId}` });
  if (url) links.push({ label: 'Source', href: url });

  if (links.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {links.map(({ label, href }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md bg-surface px-2 py-0.5 text-[11px] font-mono text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
        >
          <svg className="h-2.5 w-2.5 opacity-50" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
          </svg>
          {label}
        </a>
      ))}
    </div>
  );
}
