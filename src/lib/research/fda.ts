const FDA_BASE = 'https://api.fda.gov/drug/drugsfda.json';

export interface FdaRecord {
  applicationNumber: string;
  brandName?: string;
  genericName?: string;
  sponsorName?: string;
  actionType?: string;
  actionDate?: string;
  submissionType?: string;
  submissionStatus?: string;
}

// Known cell therapy and stem cell-based BLA application numbers
const KNOWN_BLAS = [
  'BLA125646', // KYMRIAH (tisagenlecleucel) - CAR-T cell therapy
  'BLA125643', // YESCARTA (axicabtagene ciloleucel) - CAR-T cell therapy
  'BLA125706', // TECARTUS (brexucabtagene autoleucel) - CAR-T cell therapy
  'BLA125714', // BREYANZI (lisocabtagene maraleucel) - CAR-T cell therapy
  'BLA125748', // ABECMA (idecabtagene vicleucel) - CAR-T cell therapy
  'BLA125764', // CARVYKTI (ciltacabtagene autoleucel) - CAR-T cell therapy
  'BLA761278', // SKYSONA (elivaldogene autotemcel) - HSC gene therapy (autologous stem cell)
  'BLA125745', // CASGEVY (exagamglogene autotemcel) - gene-edited HSCs
  'BLA125763', // LYFGENIA (lovotibeglogene autotemcel) - HSC gene therapy (autologous stem cell)
  'BLA125389', // PROVENGE (sipuleucel-T) - cell therapy
  'BLA125557', // GINTUIT - cell therapy
  'BLA125747', // OMISIRGE (omidubicel) - stem cell expansion
];

// Sponsors known for cell therapy / stem cell products
const THERAPY_SPONSORS = [
  'NOVARTIS',
  'KITE PHARMA',
  'BRISTOL-MYERS SQUIBB',
  'BLUEBIRD BIO',
  'VERTEX',
];

export async function searchFdaApprovals(limit = 50): Promise<FdaRecord[]> {
  const allRecords: FdaRecord[] = [];
  const seenApps = new Set<string>();

  // Fetch known BLA products in batches
  const blaQuery = KNOWN_BLAS.map((bla) => `application_number:${bla}`).join('+');
  try {
    const params = new URLSearchParams({
      search: blaQuery,
      limit: '100',
    });
    const res = await fetch(`${FDA_BASE}?${params}`);
    if (res.ok) {
      const data = await res.json();
      for (const app of (data.results || [])) {
        const records = parseApplication(app);
        for (const record of records) {
          if (record && !seenApps.has(record.applicationNumber)) {
            seenApps.add(record.applicationNumber);
            allRecords.push(record);
          }
        }
      }
    }
  } catch {
    // Continue with sponsor-based search
  }

  // Also search by sponsor to catch new approvals
  for (const sponsor of THERAPY_SPONSORS) {
    if (allRecords.length >= limit) break;
    try {
      const params = new URLSearchParams({
        search: `sponsor_name:"${sponsor}"`,
        limit: '10',
      });
      const res = await fetch(`${FDA_BASE}?${params}`);
      if (!res.ok) continue;

      const data = await res.json();
      for (const app of (data.results || [])) {
        const a = app as Record<string, unknown>;
        const appNum = (a.application_number as string) || '';
        // Only include BLA products (biologics) from sponsors
        if (!appNum.startsWith('BLA')) continue;

        const records = parseApplication(app);
        for (const record of records) {
          if (record && !seenApps.has(record.applicationNumber)) {
            seenApps.add(record.applicationNumber);
            allRecords.push(record);
          }
        }
      }
    } catch {
      continue;
    }
  }

  return allRecords.slice(0, limit);
}

function parseApplication(app: unknown): (FdaRecord | null)[] {
  try {
    const a = app as Record<string, unknown>;

    const applicationNumber = (a.application_number as string) || '';
    if (!applicationNumber) return [null];

    const sponsorName = (a.sponsor_name as string) || undefined;

    const products = (a.products as Record<string, unknown>[]) || [];
    const brandName = products[0]?.brand_name as string | undefined;
    const genericName = products[0]?.active_ingredients
      ? ((products[0].active_ingredients as Record<string, unknown>[])
          .map((i) => i.name as string)
          .filter(Boolean)
          .join(', ') || undefined)
      : undefined;

    const submissions = (a.submissions as Record<string, unknown>[]) || [];
    const latest = submissions[0];
    if (!latest) return [null];

    return [{
      applicationNumber,
      brandName,
      genericName,
      sponsorName,
      actionType: (latest.submission_type as string) || undefined,
      actionDate: formatSubmissionDate(latest.submission_status_date as string),
      submissionType: (latest.submission_type as string) || undefined,
      submissionStatus: (latest.submission_status as string) || undefined,
    }];
  } catch {
    return [null];
  }
}

function formatSubmissionDate(dateStr: string | undefined): string | undefined {
  if (!dateStr || dateStr.length !== 8) return undefined;
  return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
}
