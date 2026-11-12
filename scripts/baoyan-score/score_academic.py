"""院校与专业排名联动计分。两项结果分别展示，但共享学校与专业档次。"""


def interpolate(points, value):
    """按节点线性插值；节点为 [[排名比例, 分数], ...]，比例递增。"""
    if value <= points[0][0]:
        return float(points[0][1])
    for (left_x, left_y), (right_x, right_y) in zip(points, points[1:]):
        if value <= right_x:
            fraction = (value - left_x) / (right_x - left_x)
            return left_y + fraction * (right_y - left_y)
    return float(points[-1][1])


def canonical_major(name, major_config):
    for standard, info in major_config["majors"].items():
        if name == standard or name in info["aliases"]:
            return standard
    return None


def score_academic(student, rules, school_config, major_config):
    school_name = student["school_name"]
    major_name = canonical_major(student["undergraduate_major"], major_config)
    school = next((item for item in school_config["schools"]
                   if school_name == item["name"] or school_name in item["aliases"]), None)
    rank = student["ranking"]
    ratio = rank["position"] / rank["total"]
    pending = []
    if school is None:
        pending.append("学校未配置：" + school_name + "；请补充 school_major_levels.json")
    elif major_name not in school["majors"]:
        pending.append("该校的本科专业未配置：" + student["undergraduate_major"])

    if pending:
        return {
            "education": {"status": "pending", "score": None, "max_score": rules["max_scores"]["education"], "reasons": pending},
            "ranking": {"status": "pending", "score": None, "max_score": rules["max_scores"]["ranking"], "ratio": ratio,
                        "percentile_text": "前 {:.2f}%".format(ratio * 100), "reasons": pending},
        }

    school_level = school["level"]
    major_level = school["majors"][major_name]
    school_points = rules["academic"]["school_points"][school_level]
    major_points = rules["academic"]["major_points"][major_level]
    curve_name = school_level + ":" + major_level
    curve = rules["academic"]["rank_curves"][curve_name]
    return {
        "education": {
            "status": "ok", "score": school_points + major_points,
            "max_score": rules["max_scores"]["education"],
            "school_name": school["name"], "school_tags": school["tags"],
            "undergraduate_major": major_name, "school_level": school_level, "major_level": major_level,
            "school_points": school_points, "major_points": major_points,
            "reasons": ["学校 {} 档 {} 分 + 本科专业 {} 档 {} 分".format(school_level, school_points, major_level, major_points)],
        },
        "ranking": {
            "status": "ok", "score": interpolate(curve, ratio), "max_score": rules["max_scores"]["ranking"],
            "position": rank["position"], "total": rank["total"], "ratio": ratio,
            "percentile_text": "前 {:.2f}%".format(ratio * 100), "curve": curve_name,
            "reasons": ["排名比例 = {} / {}；使用 {} 曲线，节点之间线性插值".format(rank["position"], rank["total"], curve_name)],
        },
    }
