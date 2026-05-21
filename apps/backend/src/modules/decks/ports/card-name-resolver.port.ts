export const CARD_NAME_RESOLVER_PORT = Symbol("CARD_NAME_RESOLVER_PORT");

export interface CardNameCandidate {
  id: string;
  officialName: string;
}

export interface CardNameResolverPort {
  findCandidates(originalName: string): Promise<CardNameCandidate[]>;
}
