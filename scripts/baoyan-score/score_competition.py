"""竞赛按赛事名称与届次去重；同一赛事同一年只保留最高得分。"""
from math import fsum


def score_competition(awards, rules):
    details = []
    winners = {}
    for index, award in enumerate(awards):
        points = rules["competition"][award["level"]][award["prize"]]
        key = (award["event"].casefold(), award["year"])
        details.append(dict(award, base_score=points, counted=False, score=0))
        if key not in winners or points > details[winners[key]]["base_score"]:
            winners[key] = index
    for index in winners.values():
        details[index]["counted"] = True
        details[index]["score"] = details[index]["base_score"]
    for item in details:
        item["reason"] = "本赛事本年度最高奖项，纳入计分" if item["counted"] else "同一赛事同一年重复奖项，不重复计分"
    raw = fsum(item["score"] for item in details)
    cap = rules["max_scores"]["competition"]
    return {"status": "ok", "score": min(raw, cap), "max_score": cap,
            "raw_score": raw, "capped": raw > cap, "items": details,
            "reasons": ["按赛事名称与年度去重后累计，最多 {} 分".format(cap)]}
