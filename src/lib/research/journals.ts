export interface JournalInfo {
  name: string;
  issn?: string;
  eIssn?: string;
  openalexId?: string;
  impactFactor?: number;
}

export const TARGET_JOURNALS: JournalInfo[] = [
  { name: 'Nature', issn: '0028-0836', eIssn: '1476-4687', openalexId: 'S137773608', impactFactor: 64.8 },
  { name: 'Science', issn: '0036-8075', eIssn: '1095-9203', openalexId: 'S3880285', impactFactor: 56.9 },
  { name: 'Cell', issn: '0092-8674', eIssn: '1097-4172', openalexId: 'S95457728', impactFactor: 64.5 },
  { name: 'Cell Stem Cell', issn: '1934-5909', eIssn: '1875-9777', openalexId: 'S182692271', impactFactor: 23.9 },
  { name: 'Nature Cell Biology', issn: '1465-7392', eIssn: '1476-4679', openalexId: 'S10637672', impactFactor: 21.3 },
  { name: 'Nature Medicine', issn: '1078-8956', eIssn: '1546-170X', openalexId: 'S49861275', impactFactor: 82.9 },
  { name: 'Nature Biotechnology', issn: '1087-0156', eIssn: '1546-1696', openalexId: 'S136199984', impactFactor: 46.9 },
  { name: 'The Lancet', issn: '0140-6736', eIssn: '1474-547X', openalexId: 'S49861275', impactFactor: 168.9 },
  { name: 'New England Journal of Medicine', issn: '0028-4793', eIssn: '1533-4406', openalexId: 'S112952864', impactFactor: 176.1 },
  { name: 'Stem Cells', issn: '1066-5099', eIssn: '1549-4918', openalexId: 'S105795698', impactFactor: 5.2 },
  { name: 'Stem Cell Reports', issn: '2213-6711', openalexId: 'S2764556823', impactFactor: 5.9 },
  { name: 'Stem Cell Research & Therapy', issn: '1757-6512', openalexId: 'S64914585', impactFactor: 7.5 },
  { name: 'Cell Reports', issn: '2211-1247', openalexId: 'S119769103', impactFactor: 8.8 },
  { name: 'Nature Communications', issn: '2041-1723', openalexId: 'S21847314', impactFactor: 16.6 },
  { name: 'Science Translational Medicine', issn: '1946-6234', eIssn: '1946-6242', impactFactor: 17.1 },
  { name: 'Developmental Cell', issn: '1534-5807', eIssn: '1878-1551', impactFactor: 11.8 },
  { name: 'EMBO Journal', issn: '0261-4189', eIssn: '1460-2075', impactFactor: 11.4 },
  { name: 'Blood', issn: '0006-4971', eIssn: '1528-0020', impactFactor: 21.0 },
  { name: 'Journal of Clinical Investigation', issn: '0021-9738', eIssn: '1558-8238', impactFactor: 15.9 },
  { name: 'Molecular Cell', issn: '1097-2765', eIssn: '1097-4164', impactFactor: 16.0 },
];

export function getJournalISSNs(): string[] {
  return TARGET_JOURNALS
    .flatMap((j) => [j.issn, j.eIssn])
    .filter((issn): issn is string => !!issn);
}

export function getJournalNames(): string[] {
  return TARGET_JOURNALS.map((j) => j.name);
}

export function getOpenAlexSourceIds(): string[] {
  return TARGET_JOURNALS
    .map((j) => j.openalexId)
    .filter((id): id is string => !!id);
}
