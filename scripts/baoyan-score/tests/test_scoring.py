"""业务回归测试：运行 python3 -m unittest discover -s tests -v。"""
import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import shutil
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from main import choose_student, read_json
from calculate_total import calculate_total
from score_academic import interpolate
from score_english import score_english
from validate_input import InputValidationError, validate_config, validate_input


class ScoringTests(unittest.TestCase):
    def setUp(self):
        self.rules = read_json(ROOT / "config/scoring_rules.json")
        self.schools = read_json(ROOT / "config/school_major_levels.json")
        self.majors = read_json(ROOT / "config/major_relations.json")
        self.student = read_json(ROOT / "examples/student_input.json")

    def calculate(self):
        student = validate_input(self.student, self.rules)
        return calculate_total(student, self.rules, self.schools, self.majors)

    def test_configuration_and_full_example(self):
        validate_config(self.rules, self.schools, self.majors)
        result = self.calculate()
        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["total_score"], 84.13)
        self.assertEqual([result["scores"][key]["score"] for key in
                          ("education", "ranking", "english", "competition", "research")],
                         [16, 37, 17, 7.5, 6.63])

    def test_example_contract_matches_actual_result(self):
        self.assertEqual(self.calculate(), read_json(ROOT / "examples/score_output.json"))

    def test_school_and_rank_interaction(self):
        self.student["school_name"] = "示例985甲大学"
        self.student["ranking"]["position"] = 30
        strong = self.calculate()["scores"]
        self.student["school_name"] = "示例普通一本大学"
        self.student["ranking"]["position"] = 10
        ordinary = self.calculate()["scores"]
        self.assertEqual(strong["education"]["score"] + strong["ranking"]["score"], 54)
        self.assertEqual(ordinary["education"]["score"] + ordinary["ranking"]["score"], 44)

    def test_interpolation_and_all_curves_monotonic(self):
        self.student["ranking"]["position"] = 15
        self.assertAlmostEqual(self.calculate()["scores"]["ranking"]["score"], 35.5)
        for curve in self.rules["academic"]["rank_curves"].values():
            values = [interpolate(curve, i / 1000) for i in range(1, 1001)]
            self.assertTrue(all(0 <= value <= 40 for value in values))
            self.assertTrue(all(a >= b for a, b in zip(values, values[1:])))

    def test_lowest_and_highest_rank_are_defined(self):
        for position in (1, 100):
            self.student["ranking"]["position"] = position
            self.assertEqual(self.calculate()["status"], "ok")
        self.assertEqual(self.calculate()["scores"]["ranking"]["score"], 0)

    def test_english_best_only_and_thresholds(self):
        for exam_type, config in self.rules["english"].items():
            previous_score = 0
            for threshold, points in config["bands"]:
                with self.subTest(exam=exam_type, threshold=threshold):
                    self.assertEqual(score_english([{"type": exam_type, "score": threshold}], self.rules)["score"], points)
                    if threshold > config["min"]:
                        self.assertEqual(score_english([{"type": exam_type, "score": threshold - config["step"]}], self.rules)["score"], previous_score)
                    previous_score = points
        self.student["english"] = [{"type": "CET6", "score": 560}, {"type": "IELTS", "score": 7.5}, {"type": "TOEFL", "score": 110}]
        self.assertEqual(self.calculate()["scores"]["english"]["score"], 20)

    def test_competition_deduplication_and_cap(self):
        award = self.student["competitions"][0]
        self.student["competitions"].extend([copy.deepcopy(award), dict(award, event="另一赛事", prize="一等奖")])
        result = self.calculate()["scores"]["competition"]
        self.assertEqual(result["score"], 10)
        self.assertEqual(result["raw_score"], 17.5)
        self.assertTrue(result["capped"])
        self.assertEqual(sum(item["counted"] for item in result["items"]), 3)

    def test_research_deduplication_and_cap(self):
        paper = self.student["research"][0]
        self.student["research"] = [paper, copy.deepcopy(paper), dict(paper, id="paper-002", title="另一论文")]
        result = self.calculate()["scores"]["research"]
        self.assertEqual(result["score"], 10)
        self.assertEqual(result["raw_score"], 12)
        self.assertFalse(result["items"][1]["counted"])

    def test_research_conflicting_id_rejected(self):
        self.student["research"].append(dict(self.student["research"][0], role="其他作者"))
        with self.assertRaises(InputValidationError):
            self.calculate()

    def test_matching_direct_related_unrelated(self):
        paper = self.student["research"][0]
        for field, expected in [("机器学习", 6), ("统计建模", 4.2), ("文学研究", 1.2)]:
            with self.subTest(field=field):
                self.student["research"] = [dict(paper, field=field)]
                self.assertEqual(self.calculate()["scores"]["research"]["score"], expected)

    def test_target_major_changes_research_not_academic(self):
        previous = self.calculate()
        self.student["target_major"] = "汉语言文学"
        result = self.calculate()
        self.assertEqual(previous["scores"]["education"], result["scores"]["education"])
        self.assertEqual(previous["scores"]["ranking"], result["scores"]["ranking"])
        self.assertLess(result["scores"]["research"]["score"], previous["scores"]["research"]["score"])

    def test_missing_target_falls_back_to_undergraduate(self):
        before = self.calculate()
        del self.student["target_major"]
        self.assertEqual(before["total_score"], self.calculate()["total_score"])

    def test_unknown_school_or_major_is_pending(self):
        for field in ("school_name", "undergraduate_major"):
            with self.subTest(field=field):
                original = self.student[field]
                self.student[field] = "尚未配置"
                result = self.calculate()
                self.assertEqual(result["status"], "pending")
                self.assertIsNone(result["total_score"])
                self.assertIsNone(result["scores"]["education"]["score"])
                self.student[field] = original

    def test_unknown_research_field_is_pending(self):
        self.student["research"][0]["field"] = "尚未配置的方向"
        result = self.calculate()
        self.assertEqual(result["status"], "pending")
        self.assertIsNone(result["total_score"])
        self.assertIsNone(result["scores"]["research"]["score"])

    def test_unpublished_research_is_zero_even_for_unknown_field(self):
        self.student["research"] = [dict(self.student["research"][0], status="投稿中", field="未知")]
        self.assertEqual(self.calculate()["scores"]["research"]["score"], 0)
        self.assertEqual(self.calculate()["status"], "ok")

    def test_none_and_missing_are_distinct(self):
        for key in ("english", "competitions", "research"):
            self.student[key] = []
        result = self.calculate()
        self.assertEqual(result["total_score"], 53)
        del self.student["research"]
        with self.assertRaises(InputValidationError):
            self.calculate()

    def test_invalid_inputs(self):
        bad_values = [
            ("ranking", {"position": 101, "total": 100}),
            ("ranking", {"position": 1, "total": 0}),
            ("ranking", {"position": True, "total": 10}),
            ("ranking", {"position": 1.5, "total": 10}),
            ("english", [{"type": "CET6", "score": 711}]),
            ("english", [{"type": "IELTS", "score": 6.3}]),
            ("english", [{"type": "TOEFL", "score": float("nan")}]),
            ("english", [{"type": [], "score": 10}]),
            ("english", [{"type": "CET4", "score": True}]),
            ("competitions", [{}]), ("research", [{}]), ("target_major", ""),
        ]
        for field, value in bad_values:
            with self.subTest(field=field, value=value):
                data = copy.deepcopy(self.student)
                data[field] = value
                with self.assertRaises(InputValidationError):
                    validate_input(data, self.rules)

    def test_aliases_and_whitespace(self):
        self.student["school_name"] = " 示例B大学 "
        self.student["undergraduate_major"] = " 计算机 "
        self.student["target_major"] = "计算机"
        self.assertEqual(self.calculate()["total_score"], 84.13)

    def test_bad_curve_rejected(self):
        self.rules["academic"]["rank_curves"]["A:强"][3][1] = 41
        with self.assertRaises(ValueError):
            validate_config(self.rules, self.schools, self.majors)

    def test_ambiguous_alias_rejected(self):
        self.schools["schools"][1]["aliases"].append("示例A大学")
        with self.assertRaises(ValueError):
            validate_config(self.rules, self.schools, self.majors)

    def test_scores_always_bounded_across_profiles_and_ranks(self):
        for school in self.schools["schools"]:
            for major in school["majors"]:
                for position in (1, 5, 10, 15, 30, 50, 100):
                    self.student.update(school_name=school["name"], undergraduate_major=major)
                    self.student["ranking"]["position"] = position
                    result = self.calculate()
                    self.assertTrue(0 <= result["total_score"] <= 100)
                    for dimension in result["scores"].values():
                        self.assertTrue(0 <= dimension["score"] <= dimension["max_score"])

    def test_cli_from_another_directory_and_exit_codes(self):
        with tempfile.TemporaryDirectory() as temp:
            target = Path(temp)
            for expected_status, expected_code in [("ok", 0), ("pending", 3), ("invalid_input", 2)]:
                if expected_status == "pending":
                    self.student["school_name"] = "未知学校"
                if expected_status == "invalid_input":
                    self.student["ranking"]["total"] = 0
                input_path = target / "学生 输入.json"
                output_path = target / "result.json"
                input_path.write_text(json.dumps(self.student, ensure_ascii=False), encoding="utf-8")
                completed = subprocess.run([sys.executable, str(ROOT / "main.py"), "--input", str(input_path),
                                            "--output", str(output_path)], cwd=temp, capture_output=True, text=True)
                self.assertEqual(completed.returncode, expected_code, completed.stderr)
                result = json.loads(completed.stdout)
                self.assertEqual(result["status"], expected_status)
                self.assertEqual(result, read_json(output_path))

    def test_six_student_examples(self):
        for index, expected in enumerate([84.13, 85.13, 75.13, 77.13, 48, 100], 1):
            with self.subTest(student=index):
                self.student = read_json(ROOT / "stu_mes" / ("stu{}.json".format(index)))
                self.assertEqual(self.calculate()["total_score"], expected)

    def test_student_menu_accepts_number_stem_and_filename(self):
        for choice in ("2", "stu2", "stu2.json"):
            with self.subTest(choice=choice), patch("builtins.input", return_value=choice), patch("builtins.print"):
                self.assertEqual(choose_student(ROOT / "stu_mes").name, "stu2.json")

    def test_student_menu_retries_invalid_input_and_can_quit(self):
        with patch("builtins.input", side_effect=["", "99", "../main.py", "stu3"]), patch("builtins.print"):
            self.assertEqual(choose_student(ROOT / "stu_mes").name, "stu3.json")
        with patch("builtins.input", return_value="q"), patch("builtins.print"):
            self.assertIsNone(choose_student(ROOT / "stu_mes"))

    def test_student_menu_empty_missing_and_natural_order(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)
            with self.assertRaises(ValueError):
                choose_student(folder)
            with self.assertRaises(ValueError):
                choose_student(folder / "missing")
            for name in ("stu10.json", "stu2.json", "stu1.json"):
                (folder / name).write_text("{}", encoding="utf-8")
            with patch("builtins.input", return_value="2"), patch("builtins.print"):
                self.assertEqual(choose_student(folder).name, "stu2.json")

    def test_interactive_cli_from_other_directory_saves_result(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)
            project = folder / "project"
            shutil.copytree(ROOT, project, ignore=shutil.ignore_patterns("__pycache__", "results"))
            for choice, filename, score in [("2\n", "stu2_score.json", 85.13),
                                            ("stu3\n", "stu3_score.json", 75.13)]:
                completed = subprocess.run([sys.executable, str(project / "main.py")],
                                           input=choice, cwd=folder, capture_output=True, text=True)
                self.assertEqual(completed.returncode, 0, completed.stderr)
                self.assertIn("请选择要评分的学生", completed.stdout)
                self.assertIn("结果已保存", completed.stdout)
                self.assertEqual(read_json(project / "results" / filename)["total_score"], score)
            completed = subprocess.run([sys.executable, str(project / "main.py")],
                                       input="q\n", cwd=folder, capture_output=True, text=True)
            self.assertEqual(completed.returncode, 0)
            self.assertIn("已退出", completed.stdout)


if __name__ == "__main__":
    unittest.main()
