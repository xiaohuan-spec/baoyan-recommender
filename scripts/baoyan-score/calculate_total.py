"""评分总入口：调用四个模块，返回五项分数。函数不读写文件。"""
from math import fsum

from score_academic import score_academic
from score_english import score_english
from score_competition import score_competition
from score_research import score_research


def round_scores(value, key=""):
    """只在输出时舍入分数字段；排名比例保留原始计算精度。"""
    if isinstance(value, dict):
        return {name: round_scores(item, name) for name, item in value.items()}
    if isinstance(value, list):
        return [round_scores(item) for item in value]
    if isinstance(value, float) and (key == "score" or key.endswith("_score")):
        return round(value, 2)
    return value


def calculate_total(student, rules, school_config, major_config):
    """student 应先通过 validate_input；配置应先通过 validate_config。"""
    scores = score_academic(student, rules, school_config, major_config)
    scores["english"] = score_english(student["english"], rules)
    scores["competition"] = score_competition(student["competitions"], rules)
    scores["research"] = score_research(student, rules, major_config)
    pending = [reason for result in scores.values() if result["status"] == "pending" for reason in result["reasons"]]
    known = fsum(result["score"] for result in scores.values() if result["score"] is not None)
    return round_scores({
        "status": "pending" if pending else "ok",
        "student_name": student.get("name", ""),
        "rule_version": rules["version"], "school_data_version": school_config["version"],
        "major_data_version": major_config["version"],
        "total_score": None if pending else known, "max_score": sum(rules["max_scores"].values()),
        "known_dimensions_score": known, "scores": scores,
        "pending_reasons": list(dict.fromkeys(pending)),
        "notices": [rules["notice"], school_config["notice"], major_config["notice"],
                    "本结果用于综合评价，不是录取概率；不判断推免资格或目标项目的硬性申请门槛。"],
    })
