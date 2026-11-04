"use server";

import { getOfficerContext } from "@/lib/members/roster";
import {
  parseAbsenceRules,
  parseKvRules,
  parseTemplates,
} from "@/lib/settings/settings";
import {
  getTemplateSettings,
  saveAbsenceRules,
  saveKvRules,
  saveTemplateSettings,
} from "@/lib/settings/store";
import { applyTemplate } from "@/lib/squads/lineup";
import { getLineup, writeLineup } from "@/lib/squads/store";

const ADMIN_PATH = "/admin";

/** These are callable by anyone who can reach the site, so each one checks the rank live. */
export async function updateAbsenceRules(value: unknown) {
  const officer = await getOfficerContext(ADMIN_PATH);
  const rules = parseAbsenceRules(value);
  if (!officer || !rules) return false;
  await saveAbsenceRules(officer.db, rules, officer.name);
  return true;
}

export async function updateKvRules(value: unknown) {
  const officer = await getOfficerContext(ADMIN_PATH);
  const rules = parseKvRules(value);
  if (!officer || !rules) return false;
  await saveKvRules(officer.db, rules, officer.name);
  return true;
}

export async function updateTemplates(value: unknown) {
  const officer = await getOfficerContext(ADMIN_PATH);
  const templates = parseTemplates(value);
  if (!officer || !templates) return false;
  await saveTemplateSettings(officer.db, templates, officer.name);
  return true;
}

export async function applyTemplateToLineup(templateId: unknown) {
  const officer = await getOfficerContext(ADMIN_PATH);
  if (!officer) return false;
  const { templates } = await getTemplateSettings();
  const template = templates.find(({ id }) => id === templateId);
  if (!template) return false;
  const { lineup, version } = await getLineup(officer.db);
  const saved = await writeLineup(
    officer.db,
    applyTemplate(lineup, template),
    version,
    officer.name,
  );
  return saved !== null;
}
