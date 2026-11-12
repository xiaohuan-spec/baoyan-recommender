"""各英语考试分别换算，取最高项，不累计。"""


def score_english(exams, rules):
    details = []
    for exam in exams:
        config = rules["english"][exam["type"]]
        points = 0
        for threshold, score in config["bands"]:
            if exam["score"] >= threshold:
                points = score
        details.append({"type": exam["type"], "original_score": exam["score"], "score": points})
    selected = max(details, key=lambda item: item["score"]) if details else None
    return {
        "status": "ok", "score": selected["score"] if selected else 0,
        "max_score": rules["max_scores"]["english"], "selected": selected, "items": details,
        "reasons": ["所有考试分别按分数档位换算，取最高分；不累计" if details else "明确填写无英语成绩，计 0 分"],
    }
