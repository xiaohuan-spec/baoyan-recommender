"""科研得分 = 成果基础分 × 状态系数 × 贡献系数 × 专业匹配系数。"""
from math import fsum

from score_academic import canonical_major


def match_research(field, target, major_config, rules):
    """依赖人工维护的专业/方向表，不做关键词猜测。未知时明确待确认。"""
    target_name = canonical_major(target, major_config)
    field_info = next((info for name, info in major_config["research_fields"].items()
                       if field == name or field in info["aliases"]), None)
    if target_name is None or field_info is None:
        return None, None
    direct = field_info["majors"]
    if target_name in direct:
        label = "direct"
    elif set(major_config["majors"][target_name]["related"]) & set(direct):
        label = "related"
    else:
        label = "unrelated"
    return label, rules["research"]["match_factors"][label]


def score_research(student, rules, major_config):
    target = student.get("target_major") or student["undergraduate_major"]
    details, pending, seen = [], [], set()
    for item in student["research"]:
        if item["id"] in seen:
            details.append(dict(item, score=0, counted=False, reason="相同成果 ID 已计入，忽略重复记录"))
            continue
        seen.add(item["id"])
        config = rules["research"]["types"][item["type"]]
        base = config["base_score"]
        status_factor = config["status_factors"][item["status"]]
        contribution = config["role_factors"][item["role"]]
        detail = dict(item, base_score=base, status_factor=status_factor, contribution_factor=contribution, counted=True)
        # 未发表/未授权等状态本身不计分，无须再判断研究方向。
        if status_factor == 0:
            detail.update(score=0, match_level=None, match_factor=None, reason="当前成果状态不计分")
        else:
            match_level, factor = match_research(item["field"], target, major_config, rules)
            detail.update(match_level=match_level, match_factor=factor)
            if factor is None:
                reason = "成果 {} 的研究方向或目标专业未配置，请补充 major_relations.json".format(item["id"])
                pending.append(reason)
                detail.update(score=None, reason=reason)
            else:
                score = base * status_factor * contribution * factor
                detail.update(score=score, reason="{} × {} × {} × {} = {:.2f}".format(base, status_factor, contribution, factor, score))
        details.append(detail)
    raw = fsum(item["score"] for item in details if item["score"] is not None)
    cap = rules["max_scores"]["research"]
    return {"status": "pending" if pending else "ok", "score": None if pending else min(raw, cap),
            "max_score": cap, "target_major_used": target,
            "raw_score": None if pending else raw, "known_items_score": raw,
            "capped": None if pending else raw > cap, "items": details,
            "reasons": pending or ["按成果 ID 去重后累计，最多 {} 分".format(cap)]}
