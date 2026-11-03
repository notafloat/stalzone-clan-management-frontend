/** ISO 8601 date-time. */
type IsoDateTime = string;

export interface Lot {
  itemId: string;
  amount: number;
  startPrice: number;
  currentPrice: number;
  buyoutPrice: number;
  startTime: IsoDateTime;
  endTime: IsoDateTime;
  additional: Record<string, unknown>;
}

export interface LotListing {
  total: number;
  lots: Lot[];
}

export interface PriceEntry {
  amount: number;
  price: number;
  time: IsoDateTime;
  additional: Record<string, unknown>;
}

export interface PricesListing {
  total: number;
  prices: PriceEntry[];
}

export type ClanRank =
  | "RECRUIT"
  | "COMMONER"
  | "SOLDIER"
  | "SERGEANT"
  | "OFFICER"
  | "COLONEL"
  | "LEADER";

export interface ClanInfo {
  id: string;
  name: string;
  tag: string;
  level: number;
  levelPoints: number;
  registrationTime: IsoDateTime;
  alliance: string;
  description: string;
  leader: string;
  memberCount: number;
}

export interface ClanMember {
  name: string;
  rank: ClanRank;
  joinTime: IsoDateTime;
}

export interface CharacterClanInfo {
  info: ClanInfo;
  member: ClanMember;
}

export interface ClansListResponse {
  totalClans: number;
  data: ClanInfo[];
}

export type StatType = "INTEGER" | "DECIMAL" | "DATE" | "DURATION";

export interface CharacterStatValue {
  id: string;
  type: StatType;
  value: unknown;
}

export interface CharacterProfileData {
  username: string;
  uuid: string;
  status: string;
  alliance: string;
  lastLogin: IsoDateTime;
  displayedAchievements: string[];
  clan?: CharacterClanInfo;
  stats: CharacterStatValue[];
}

export interface EmissionResponse {
  currentStart: IsoDateTime;
  previousStart: IsoDateTime;
  previousEnd: IsoDateTime;
}

export interface OperationSessionParticipant {
  username: string;
  death: number;
  mobKills: number;
  damageReceived: number;
  damageDealt: number;
  armorClass: string;
  armorItemId: string;
  armorLevel: number;
  primaryWeaponItemId: string;
  primaryWeaponLevel: number;
  secondaryWeaponItemId: string;
  secondaryWeaponLevel: number;
}

export interface OperationSession {
  id: number;
  map: string;
  startTime: IsoDateTime;
  endTime: IsoDateTime;
  difficulty: number;
  sessionDurationSeconds: number;
  difficultyReward: number;
  participants: OperationSessionParticipant[];
}

export interface OperationSessionListing {
  total: number;
  sessions: OperationSession[];
}

export interface Region {
  id: string;
  name: string;
}
