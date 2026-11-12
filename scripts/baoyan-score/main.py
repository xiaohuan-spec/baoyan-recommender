#!/usr/bin/env python3
"""命令行入口：只负责读写文件，评分逻辑在 score_*.py 中。"""
import argparse
import json
import re
import sys
from pathlib import Path

from calculate_total import calculate_total
from validate_input import InputValidationError, validate_config, validate_input


def read_json(path):
    with Path(path).open(encoding="utf-8-sig") as handle:
        return json.load(handle)


def choose_student(directory):
    """列出学生文件，支持输入编号、stu1 或 stu1.json；返回选中的路径。"""
    if not directory.is_dir():
        raise ValueError("学生信息目录不存在：" + str(directory))

    def sort_key(path):
        return [int(part) if part.isdigit() else part.casefold()
                for part in re.split(r"(\d+)", path.name)]

    files = sorted((path for path in directory.glob("*.json") if path.is_file()), key=sort_key)
    if not files:
        raise ValueError("学生信息目录中没有 JSON 文件：" + str(directory))
    print("\n请选择要评分的学生（目录：{}）：".format(directory))
    for index, path in enumerate(files, 1):
        try:
            data = read_json(path)
            description = " | ".join(str(data.get(key, "未填写")) for key in
                                     ("name", "school_name", "undergraduate_major")) if isinstance(data, dict) else "数据格式错误"
        except (OSError, ValueError):
            description = "文件无法读取或 JSON 格式错误，选择后查看错误"
        print("  {}. {} | {}".format(index, path.name, description))
    while True:
        choice = input("\n输入编号或文件名（如 1、stu1），输入 q 退出：").strip()
        if choice.lower() == "q":
            return None
        if choice.isascii() and choice.isdigit() and 1 <= int(choice) <= len(files):
            return files[int(choice) - 1]
        selected = next((path for path in files if choice in (path.name, path.stem)), None)
        if selected:
            return selected
        print("选择无效，请输入列表中的编号或文件名。")


def print_summary(result):
    """交互模式先显示易读的五项得分，完整计算明细仍在 JSON 输出中。"""
    if "scores" not in result:
        return
    print("\n学生：{}".format(result.get("student_name") or "未填写姓名"))
    labels = {"education": "院校背景", "ranking": "专业排名", "english": "英语能力",
              "competition": "竞赛加分", "research": "科研加分"}
    for key, label in labels.items():
        item = result["scores"][key]
        points = "待确认" if item["score"] is None else "{:.2f}".format(item["score"])
        print("  {}：{} / {}".format(label, points, item["max_score"]))
    total = result["total_score"]
    print("总分：{}\n".format("待确认，请查看 pending_reasons" if total is None else "{:.2f} / 100".format(total)))


def main():
    root = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(description="保研综合评分（实验规则，非录取概率）")
    parser.add_argument("--input", help="可选：直接指定学生 JSON；不填则显示学生选择菜单")
    parser.add_argument("--student-dir", default=str(root / "stu_mes"), help="学生信息目录，默认是程序旁的 stu_mes")
    parser.add_argument("--output", help="可选：将结果保存为 JSON 文件")
    parser.add_argument("--config-dir", default=str(root / "config"), help="评分配置目录")
    args = parser.parse_args()
    interactive = args.input is None
    try:
        input_path = choose_student(Path(args.student_dir)) if interactive else Path(args.input)
    except (EOFError, KeyboardInterrupt):
        print("\n未完成选择，已退出。")
        return 0
    except (OSError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        return 2
    if input_path is None:
        print("已退出。")
        return 0
    output_path = Path(args.output) if args.output else (root / "results" / (input_path.stem + "_score.json") if interactive else None)
    if output_path and input_path.resolve() == output_path.resolve():
        parser.error("输入文件和输出文件不能是同一个文件")

    try:
        config_dir = Path(args.config_dir)
        rules = read_json(config_dir / "scoring_rules.json")
        schools = read_json(config_dir / "school_major_levels.json")
        majors = read_json(config_dir / "major_relations.json")
        validate_config(rules, schools, majors)
    except (OSError, ValueError, KeyError, TypeError, AttributeError, IndexError, OverflowError) as exc:
        print(json.dumps({"status": "config_error", "message": str(exc)}, ensure_ascii=False, indent=2))
        return 2

    try:
        student = validate_input(read_json(input_path), rules)
        result = calculate_total(student, rules, schools, majors)
        exit_code = 0 if result["status"] == "ok" else 3
    except InputValidationError as exc:
        result = {"status": "invalid_input", "errors": exc.errors}
        exit_code = 2
    except (OSError, ValueError) as exc:
        result = {"status": "invalid_input", "errors": [str(exc)]}
        exit_code = 2

    content = json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False)
    if interactive:
        print_summary(result)
    print(content)
    if output_path:
        try:
            output = output_path
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(content + "\n", encoding="utf-8")
            if interactive:
                print("\n结果已保存：" + str(output))
        except OSError as exc:
            print("保存结果失败：" + str(exc), file=sys.stderr)
            return 2
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
