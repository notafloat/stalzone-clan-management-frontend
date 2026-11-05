import {
  bigserial,
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import type { AbsenceKind, StageMark } from "../kv/kv";
import type { MapPlan } from "../maps/maps";
import type { Lineup } from "../squads/lineup";
import type { ClanInfo } from "../stalzone/types";

const timestampTz = (name: string) => timestamp(name, { withTimezone: true });

/** Keyed by UUID, because a player's name can change. */
export const players = pgTable(
  "players",
  {
    uuid: text("uuid").primaryKey(),
    name: text("name").notNull(),
    rank: text("rank").notNull(),
    joinedAt: timestampTz("joined_at").notNull(),
    lastLogin: timestampTz("last_login"),
    /** Null while the player is in the clan. */
    leftAt: timestampTz("left_at"),
    /** Set after a live check, so later page loads can find the player without the API. */
    characterId: text("character_id"),
    /** Only officers and above may read or change these. */
    note: text("note"),
    noteUpdatedBy: text("note_updated_by"),
    noteUpdatedAt: timestampTz("note_updated_at"),
    updatedAt: timestampTz("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("players_name_idx").on(table.name),
    index("players_character_id_idx").on(table.characterId),
  ],
);

/** The latest clan details, saved by the tracker so pages don't wait for the API. */
export const clanInfo = pgTable("clan_info", {
  id: integer("id").primaryKey(),
  data: jsonb("data").$type<ClanInfo>().notNull(),
  updatedAt: timestampTz("updated_at").notNull().defaultNow(),
});

export type EventType = "joined" | "left" | "promoted" | "demoted" | "renamed";

export const clanEvents = pgTable(
  "clan_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    playerUuid: text("player_uuid")
      .notNull()
      .references(() => players.uuid),
    /** The player's name when the event happened. */
    playerName: text("player_name").notNull(),
    type: text("type").$type<EventType>().notNull(),
    /** A rank, or a name for "renamed". */
    fromValue: text("from_value"),
    toValue: text("to_value"),
    /** Exact for "joined"; otherwise when the tracker noticed, up to one run late. */
    occurredAt: timestampTz("occurred_at").notNull(),
    /** Only officers and above may read or change these. */
    note: text("note"),
    noteUpdatedBy: text("note_updated_by"),
    noteUpdatedAt: timestampTz("note_updated_at"),
  },
  (table) => [
    index("clan_events_occurred_at_idx").on(table.occurredAt),
    unique("clan_events_once").on(
      table.playerUuid,
      table.type,
      table.occurredAt,
    ),
  ],
);

/** The clan's one current lineup. `version` stops officers overwriting each other's saves. */
export const lineups = pgTable("lineups", {
  id: integer("id").primaryKey(),
  data: jsonb("data").$type<Lineup>().notNull(),
  version: integer("version").notNull(),
  updatedBy: text("updated_by").notNull(),
  updatedAt: timestampTz("updated_at").notNull().defaultNow(),
});

const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });

/** Kept in the database so that the images are part of its backups. */
export const customMaps = pgTable("custom_maps", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  image: bytea("image").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestampTz("created_at").notNull().defaultNow(),
});

export const mapPlans = pgTable("map_plans", {
  id: text("id").primaryKey(),
  data: jsonb("data").$type<MapPlan>().notNull(),
  version: integer("version").notNull(),
  updatedBy: text("updated_by").notNull(),
  createdAt: timestampTz("created_at").notNull().defaultNow(),
  updatedAt: timestampTz("updated_at").notNull().defaultNow(),
});

/** Clan-wide settings that officers change on the admin page. */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedBy: text("updated_by").notNull(),
  updatedAt: timestampTz("updated_at").notNull().defaultNow(),
});

export const kvWars = pgTable("kv_wars", {
  date: date("date", { mode: "string" }).primaryKey(),
  confirmed: boolean("confirmed").notNull().default(false),
  /** Fixed when the war is created, so later rule changes don't rewrite past attendance. */
  mandatory: boolean("mandatory").notNull().default(true),
  createdBy: text("created_by").notNull(),
  createdAt: timestampTz("created_at").notNull().defaultNow(),
});

export const kvMarks = pgTable(
  "kv_marks",
  {
    warDate: date("war_date", { mode: "string" })
      .notNull()
      .references(() => kvWars.date),
    playerUuid: text("player_uuid")
      .notNull()
      .references(() => players.uuid),
    plan: text("plan").notNull(),
    stages: jsonb("stages").$type<StageMark[]>().notNull(),
    absence: text("absence").$type<AbsenceKind>().notNull(),
    reason: text("reason").notNull(),
    why: text("why").notNull(),
    updatedBy: text("updated_by").notNull(),
    updatedAt: timestampTz("updated_at").notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.warDate, table.playerUuid] })],
);

export const activityDays = pgTable(
  "activity_days",
  {
    playerUuid: text("player_uuid")
      .notNull()
      .references(() => players.uuid),
    /** The login's day in server time. */
    day: date("day", { mode: "string" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.playerUuid, table.day] })],
);
