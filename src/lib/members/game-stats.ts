import type { CharacterProfileData } from "@/lib/stalzone/types";

const MS_PER_HOUR = 60 * 60 * 1000;

function statNumber(profile: CharacterProfileData, id: string) {
  const value = profile.stats.find((stat) => stat.id === id)?.value;
  return typeof value === "number" ? value : null;
}

export function getGameStats(profile: CharacterProfileData) {
  const kills = statNumber(profile, "kil");
  const deaths = statNumber(profile, "dea");
  const playTimeMs = statNumber(profile, "pla-tim");

  return {
    kills,
    deaths,
    killDeathRatio: kills !== null && deaths ? kills / deaths : null,
    hoursPlayed:
      playTimeMs === null ? null : Math.floor(playTimeMs / MS_PER_HOUR),
  };
}
