const CT_BASE = 'https://clinicaltrials.gov/api/v2/studies';

export interface ClinicalTrial {
  nctId: string;
  title: string;
  summary?: string;
  phase?: string;
  status?: string;
  sponsor?: string;
  conditions: string[];
  interventions: string[];
  startDate?: string;
  lastUpdateDate?: string;
}

const SEARCH_TERMS = [
  '"stem cell"',
  '"iPSC"',
  '"CAR-T"',
  '"cell therapy"',
  '"gene therapy"',
  '"induced pluripotent"',
];

function buildAdvancedFilter(minDate: string): string {
  const areaTerms = SEARCH_TERMS.flatMap((term) => [
    `AREA[InterventionName]${term}`,
    `AREA[BriefTitle]${term}`,
  ]);
  areaTerms.push(`AREA[ConditionSearch]"stem cell"`);
  return `AREA[LastUpdatePostDate]RANGE[${minDate},MAX] AND (${areaTerms.join(' OR ')})`;
}

export async function searchClinicalTrials(maxResults = 50): Promise<ClinicalTrial[]> {
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const minDate = formatCtDate(lastWeek);

  const params = new URLSearchParams({
    'filter.advanced': buildAdvancedFilter(minDate),
    pageSize: Math.min(maxResults, 100).toString(),
    format: 'json',
  });

  const res = await fetch(`${CT_BASE}?${params}`);
  if (!res.ok) throw new Error(`ClinicalTrials.gov search failed: ${res.status}`);

  const data = await res.json();
  const studies: unknown[] = data.studies || [];

  return studies.map(parseStudy).filter((t): t is ClinicalTrial => t !== null);
}

function parseStudy(study: unknown): ClinicalTrial | null {
  try {
    const s = study as Record<string, unknown>;
    const proto = s.protocolSection as Record<string, unknown> | undefined;
    if (!proto) return null;

    const idModule = proto.identificationModule as Record<string, unknown> | undefined;
    const statusModule = proto.statusModule as Record<string, unknown> | undefined;
    const sponsorModule = proto.sponsorCollaboratorsModule as Record<string, unknown> | undefined;
    const conditionsModule = proto.conditionsModule as Record<string, unknown> | undefined;
    const armsModule = proto.armsInterventionsModule as Record<string, unknown> | undefined;
    const descModule = proto.descriptionModule as Record<string, unknown> | undefined;
    const designModule = proto.designModule as Record<string, unknown> | undefined;

    const nctId = (idModule?.nctId as string) || '';
    if (!nctId) return null;

    const title = (idModule?.briefTitle as string) || 'Untitled';
    const summary = (descModule?.briefSummary as string) || undefined;
    const status = (statusModule?.overallStatus as string) || undefined;

    const phases = (designModule?.phases as string[]) || [];
    const phase = phases.length > 0 ? phases.join(', ') : undefined;

    const leadSponsor = sponsorModule?.leadSponsor as Record<string, unknown> | undefined;
    const sponsor = (leadSponsor?.name as string) || undefined;

    const conditions = (conditionsModule?.conditions as string[]) || [];

    const interventionList = (armsModule?.interventions as Record<string, unknown>[]) || [];
    const interventions = interventionList
      .map((i) => i.name as string)
      .filter(Boolean);

    const startDateStruct = statusModule?.startDateStruct as Record<string, unknown> | undefined;
    const startDate = (startDateStruct?.date as string) || undefined;

    const lastUpdateStruct = statusModule?.lastUpdatePostDateStruct as Record<string, unknown> | undefined;
    const lastUpdateDate = (lastUpdateStruct?.date as string) || undefined;

    return {
      nctId,
      title,
      summary,
      phase,
      status,
      sponsor,
      conditions,
      interventions,
      startDate,
      lastUpdateDate,
    };
  } catch {
    return null;
  }
}

function formatCtDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
