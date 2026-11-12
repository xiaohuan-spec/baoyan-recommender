"""集中检查输入和配置，避免错误数据进入评分函数。"""
import copy
import math


class InputValidationError(ValueError):
    def __init__(self, errors):
        self.errors = errors
        super().__init__("；".join(errors))


def is_number(value):
    return type(value) in (int, float) and math.isfinite(value)


def clean_strings(value):
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, list):
        return [clean_strings(item) for item in value]
    if isinstance(value, dict):
        return {key: clean_strings(item) for key, item in value.items()}
    return value


def validate_input(student, rules):
    """返回去除首尾空格后的副本；一次汇报所有可识别的输入错误。"""
    if not isinstance(student, dict):
        raise InputValidationError(["输入最外层必须是 JSON 对象"])
    student = clean_strings(copy.deepcopy(student))
    errors = []

    def text_field(obj, key, path):
        if not isinstance(obj.get(key), str) or not obj[key]:
            errors.append(path + "." + key + " 必须是非空字符串")

    def keys(obj, allowed, path):
        for key in obj:
            if key not in allowed:
                errors.append(path + "." + key + " 是未支持的字段，请检查拼写")

    keys(student, {"name", "school_name", "undergraduate_major", "target_major", "ranking", "english", "competitions", "research"}, "student")
    for key in ("school_name", "undergraduate_major"):
        text_field(student, key, "student")
    if "name" in student and not isinstance(student["name"], str):
        errors.append("name 必须是字符串")
    if "target_major" in student:
        text_field(student, "target_major", "student")

    rank = student.get("ranking")
    if not isinstance(rank, dict):
        errors.append("ranking 必须是包含 position、total 的对象")
    else:
        keys(rank, {"position", "total"}, "ranking")
        for key in ("position", "total"):
            if type(rank.get(key)) is not int or rank[key] <= 0:
                errors.append("ranking." + key + " 必须是正整数")
        if all(type(rank.get(key)) is int and rank[key] > 0 for key in ("position", "total")):
            if rank["position"] > rank["total"]:
                errors.append("个人名次不能超过专业总人数")

    for field in ("english", "competitions", "research"):
        if not isinstance(student.get(field), list):
            errors.append(field + " 必须是数组；明确没有时填写 []，不能漏填")

    exams = student.get("english") if isinstance(student.get("english"), list) else []
    for index, exam in enumerate(exams):
        path = "english[{}]".format(index)
        if not isinstance(exam, dict):
            errors.append(path + " 必须是对象")
            continue
        keys(exam, {"type", "score"}, path)
        exam_type = exam.get("type")
        if not isinstance(exam_type, str) or exam_type not in rules["english"]:
            errors.append(path + ".type 只能是 CET4、CET6、IELTS、TOEFL")
            continue
        config = rules["english"][exam_type]
        value = exam.get("score")
        if not is_number(value) or not config["min"] <= value <= config["max"]:
            errors.append(path + ".score 必须在 {} 到 {} 之间".format(config["min"], config["max"]))
        elif not math.isclose(value / config["step"], round(value / config["step"]), abs_tol=1e-8):
            errors.append(path + ".score 必须按 {} 分递增".format(config["step"]))

    awards = student.get("competitions") if isinstance(student.get("competitions"), list) else []
    for index, award in enumerate(awards):
        path = "competitions[{}]".format(index)
        if not isinstance(award, dict):
            errors.append(path + " 必须是对象")
            continue
        keys(award, {"event", "year", "level", "prize"}, path)
        text_field(award, "event", path)
        if type(award.get("year")) is not int or not 1900 <= award["year"] <= 2100:
            errors.append(path + ".year 必须是 1900～2100 的整数年份")
        level, prize = award.get("level"), award.get("prize")
        if not isinstance(level, str) or level not in rules["competition"]:
            errors.append(path + ".level 只能是 国家级、省级、校级")
        elif not isinstance(prize, str) or prize not in rules["competition"][level]:
            errors.append(path + ".prize 只能是 一等奖、二等奖、三等奖")

    research = student.get("research") if isinstance(student.get("research"), list) else []
    seen = {}
    for index, item in enumerate(research):
        path = "research[{}]".format(index)
        if not isinstance(item, dict):
            errors.append(path + " 必须是对象")
            continue
        keys(item, {"id", "title", "type", "status", "role", "field"}, path)
        for key in ("id", "title", "field"):
            text_field(item, key, path)
        item_type = item.get("type")
        if not isinstance(item_type, str) or item_type not in rules["research"]["types"]:
            errors.append(path + ".type 不支持；可选：" + "、".join(rules["research"]["types"]))
        else:
            config = rules["research"]["types"][item_type]
            for key, mapping in (("status", "status_factors"), ("role", "role_factors")):
                if not isinstance(item.get(key), str) or item[key] not in config[mapping]:
                    errors.append(path + "." + key + " 可选：" + "、".join(config[mapping]))
        if isinstance(item.get("id"), str):
            if item["id"] in seen and seen[item["id"]] != item:
                errors.append(path + ".id 与已有成果相同，但内容冲突；同一成果请保留一条一致记录")
            seen[item["id"]] = item
    if errors:
        raise InputValidationError(errors)
    return student


def validate_config(rules, schools, majors):
    """配置改错时尽早报错：检查分值上限、曲线单调性和映射引用。"""
    def require(condition, message):
        if not condition:
            raise ValueError("配置错误：" + message)

    def number(value, low, high, label):
        require(is_number(value) and low <= value <= high, label + " 数值超出范围")

    def names(items, label):
        require(isinstance(items, list) and all(isinstance(item, str) and item.strip() == item and item for item in items), label + " 必须为非空名称的数组")

    for config in (rules, schools, majors):
        require(isinstance(config["version"], str) and bool(config["version"]), "必须填写 version")
        require(isinstance(config["notice"], str), "notice 必须是字符串")
    caps = rules["max_scores"]
    require(set(caps) == {"education", "ranking", "english", "competition", "research"}, "max_scores 必须包含五个维度")
    for key, value in caps.items():
        number(value, 1, 100, key)
    require(sum(caps.values()) == 100, "五项满分之和必须为 100")
    academic = rules["academic"]
    require(bool(academic["school_points"]) and bool(academic["major_points"]), "学校/专业分档不能为空")
    for school_level, school_points in academic["school_points"].items():
        number(school_points, 0, caps["education"], school_level)
        for major_level, major_points in academic["major_points"].items():
            number(major_points, 0, caps["education"] - school_points, major_level)
            curve_key = school_level + ":" + major_level
            curve = academic["rank_curves"][curve_key]
            require(isinstance(curve, list) and len(curve) >= 2, curve_key + " 至少需要两个节点")
            for point in curve:
                require(isinstance(point, list) and len(point) == 2, curve_key + " 节点必须是 [比例, 分数]")
                number(point[0], 0, 1, curve_key + " 排名比例")
                number(point[1], 0, caps["ranking"], curve_key + " 排名分数")
            require(curve[0][0] == 0 and curve[-1][0] == 1, curve_key + " 必须覆盖 0～1")
            require(all(a[0] < b[0] and a[1] >= b[1] for a, b in zip(curve, curve[1:])), curve_key + " 比例必须递增且分数不能递增")
    require(set(rules["english"]) == {"CET4", "CET6", "IELTS", "TOEFL"}, "英语考试类型不完整")
    for exam_type, config in rules["english"].items():
        number(config["min"], 0, 1000, exam_type)
        number(config["max"], config["min"], 1000, exam_type)
        number(config["step"], 0.01, 100, exam_type)
        bands = config["bands"]
        require(isinstance(bands, list) and bool(bands), exam_type + " 档位不能为空")
        for point in bands:
            require(isinstance(point, list) and len(point) == 2, exam_type + " 档位格式错误")
            number(point[0], config["min"], config["max"], exam_type + " 阈值")
            number(point[1], 0, caps["english"], exam_type + " 分数")
        require(all(a[0] < b[0] and a[1] <= b[1] for a, b in zip(bands, bands[1:])), exam_type + " 档位必须按成绩递增且得分不能下降")
    require(set(rules["competition"]) == {"国家级", "省级", "校级"}, "竞赛级别不完整")
    for prizes in rules["competition"].values():
        require(set(prizes) == {"一等奖", "二等奖", "三等奖"}, "奖项等次不完整")
        for score in prizes.values():
            number(score, 0, caps["competition"], "竞赛分")
        require(prizes["一等奖"] >= prizes["二等奖"] >= prizes["三等奖"], "竞赛奖项分值顺序不正确")
    for config in rules["research"]["types"].values():
        number(config["base_score"], 0, caps["research"], "成果基础分")
        for key in ("role_factors", "status_factors"):
            require(bool(config[key]), key + " 不能为空")
            for factor in config[key].values():
                number(factor, 0, 1, key)
    factors = rules["research"]["match_factors"]
    require(set(factors) == {"direct", "related", "unrelated"}, "专业匹配系数不完整")
    for factor in factors.values():
        number(factor, 0, 1, "专业匹配系数")
    require(factors["direct"] >= factors["related"] >= factors["unrelated"], "专业匹配系数顺序不正确")

    major_names = set(majors["majors"])
    known_names = set()
    for name, info in majors["majors"].items():
        names([name] + info["aliases"], "专业名称")
        for alias in [name] + info["aliases"]:
            require(alias not in known_names, "专业名称/别名重复：" + alias)
            known_names.add(alias)
        names(info["related"], "相关专业")
        require(set(info["related"]) <= major_names, "相关专业引用了不存在的专业：" + name)
    known_fields = set()
    for name, info in majors["research_fields"].items():
        names([name] + info["aliases"], "研究方向")
        for alias in [name] + info["aliases"]:
            require(alias not in known_fields, "研究方向名称/别名重复：" + alias)
            known_fields.add(alias)
        names(info["majors"], "方向对应专业")
        require(bool(info["majors"]) and set(info["majors"]) <= major_names, "研究方向专业引用错误：" + name)
    known_schools = set()
    for school in schools["schools"]:
        names([school["name"]] + school["aliases"], "学校名称")
        names(school["tags"], "院校标签")
        for alias in [school["name"]] + school["aliases"]:
            require(alias not in known_schools, "学校名称/别名重复：" + alias)
            known_schools.add(alias)
        require(school["level"] in academic["school_points"], "学校档次不存在")
        require(bool(school["majors"]), "每所学校至少需要配置一个专业")
        for major, level in school["majors"].items():
            require(major in major_names, "学校专业未在专业表中定义：" + major)
            require(level in academic["major_points"], "学校专业档次不存在")
