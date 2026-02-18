import { z } from 'zod';

const PUBMED_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

const PubMedArticleSchema = z.object({
  pmid: z.string(),
  title: z.string(),
  abstract: z.string().optional(),
  authors: z.array(z.string()),
  journal: z.string().optional(),
  publishedDate: z.string().optional(),
  doi: z.string().optional(),
  keywords: z.array(z.string()),
  meshTerms: z.array(z.string()),
});

export type PubMedArticle = z.infer<typeof PubMedArticleSchema>;

export async function searchPubMed(query: string, maxResults = 50): Promise<string[]> {
  const params = new URLSearchParams({
    db: 'pubmed',
    term: query,
    retmax: maxResults.toString(),
    retmode: 'json',
    sort: 'date',
    datetype: 'edat',
    reldate: '7', // last 7 days
  });

  const res = await fetch(`${PUBMED_BASE}/esearch.fcgi?${params}`);
  if (!res.ok) throw new Error(`PubMed search failed: ${res.status}`);

  const data = await res.json();
  return data.esearchresult?.idlist || [];
}

export async function fetchPubMedArticles(pmids: string[]): Promise<PubMedArticle[]> {
  if (pmids.length === 0) return [];

  const params = new URLSearchParams({
    db: 'pubmed',
    id: pmids.join(','),
    retmode: 'xml',
    rettype: 'abstract',
  });

  const res = await fetch(`${PUBMED_BASE}/efetch.fcgi?${params}`);
  if (!res.ok) throw new Error(`PubMed fetch failed: ${res.status}`);

  const xml = await res.text();
  return parsePubMedXml(xml);
}

function parsePubMedXml(xml: string): PubMedArticle[] {
  const articles: PubMedArticle[] = [];
  const articleRegex = /<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g;
  let match;

  while ((match = articleRegex.exec(xml)) !== null) {
    const articleXml = match[1];

    const pmid = extractTag(articleXml, 'PMID') || '';
    const title = extractTag(articleXml, 'ArticleTitle') || 'Untitled';
    const abstract = extractTag(articleXml, 'AbstractText') || undefined;
    const journal = extractTag(articleXml, 'Title') || undefined;

    // Extract authors
    const authors: string[] = [];
    const authorRegex = /<Author[\s\S]*?>([\s\S]*?)<\/Author>/g;
    let authorMatch;
    while ((authorMatch = authorRegex.exec(articleXml)) !== null) {
      const lastName = extractTag(authorMatch[1], 'LastName');
      const foreName = extractTag(authorMatch[1], 'ForeName');
      if (lastName) {
        authors.push(foreName ? `${foreName} ${lastName}` : lastName);
      }
    }

    // Extract DOI
    const doiMatch = articleXml.match(/<ArticleId IdType="doi">(.*?)<\/ArticleId>/);
    const doi = doiMatch ? doiMatch[1] : undefined;

    // Extract published date
    const year = extractTag(articleXml, 'Year');
    const month = extractTag(articleXml, 'Month');
    const day = extractTag(articleXml, 'Day');
    const publishedDate = year ? `${year}-${(month || '01').padStart(2, '0')}-${(day || '01').padStart(2, '0')}` : undefined;

    // Extract keywords
    const keywords: string[] = [];
    const keywordRegex = /<Keyword[^>]*>(.*?)<\/Keyword>/g;
    let kwMatch;
    while ((kwMatch = keywordRegex.exec(articleXml)) !== null) {
      keywords.push(kwMatch[1]);
    }

    // Extract MeSH terms
    const meshTerms: string[] = [];
    const meshRegex = /<DescriptorName[^>]*>(.*?)<\/DescriptorName>/g;
    let meshMatch;
    while ((meshMatch = meshRegex.exec(articleXml)) !== null) {
      meshTerms.push(meshMatch[1]);
    }

    articles.push({
      pmid,
      title: cleanHtml(title),
      abstract: abstract ? cleanHtml(abstract) : undefined,
      authors,
      journal: journal ? cleanHtml(journal) : undefined,
      publishedDate,
      doi,
      keywords,
      meshTerms,
    });
  }

  return articles;
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 's');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function cleanHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .trim();
}

export function buildStemCellQuery(journals?: string[]): string {
  const baseTerms = [
    'stem cell',
    'iPSC',
    'induced pluripotent',
    'embryonic stem cell',
    'mesenchymal stem cell',
    'hematopoietic stem cell',
    'regenerative medicine',
    'cell therapy',
    'organoid',
  ];

  let query = `(${baseTerms.map((t) => `"${t}"[Title/Abstract]`).join(' OR ')})`;

  if (journals && journals.length > 0) {
    const journalFilter = journals.map((j) => `"${j}"[Journal]`).join(' OR ');
    query += ` AND (${journalFilter})`;
  }

  return query;
}
