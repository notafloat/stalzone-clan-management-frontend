"use client";

import { useMemo, useState } from "react";
import { needsAttention, type MemberData } from "@/lib/members/members";
import { MembersFilter, type RankFilter } from "./MembersFilter";
import { MembersTable } from "./MembersTable";

export function MembersView({
  members,
  initialAttentionOnly = false,
}: {
  members: MemberData[];
  initialAttentionOnly?: boolean;
}) {
  const [rank, setRank] = useState<RankFilter>("all");
  const [attentionOnly, setAttentionOnly] = useState(initialAttentionOnly);

  const visibleMembers = useMemo(
    () =>
      members.filter(
        (member) =>
          (rank === "all" || member.rank === rank) &&
          (!attentionOnly || needsAttention(member)),
      ),
    [members, rank, attentionOnly],
  );

  return (
    <div className="flex flex-col gap-3">
      <MembersFilter
        members={members}
        rank={rank}
        onRankChange={setRank}
        attentionOnly={attentionOnly}
        onAttentionOnlyChange={setAttentionOnly}
      />
      <MembersTable
        members={visibleMembers}
        emptyText={
          members.length === 0
            ? "В клане пока никого нет"
            : "Никого не найдено по фильтру"
        }
      />
    </div>
  );
}
