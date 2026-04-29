"""Extract chart images from the Shangcheng annual report docx into public/."""
import zipfile
from pathlib import Path

DOCX = Path(r"d:\360MoveData\Users\Admin\Desktop\智能体\2025年上城区地下病害年度报告.docx")
OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "reports" / "shangcheng-2025"

# Substantive chart files in docx (by name); image8/9 are tiny placeholders in source
CHART_FILES: list[tuple[str, str]] = [
    ("image2.png", "chart-01-workload.png"),
    ("image3.png", "chart-02-road-type.png"),
    ("image4.png", "chart-03-disease-by-lot.png"),
    ("image5.png", "chart-04-top-roads.png"),
    ("image6.png", "chart-05-disease-type.png"),
    ("image7.png", "chart-06-risk-level.png"),
    ("image10.png", "chart-07-per-km.png"),
]


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(DOCX) as z:
        for internal_name, public_name in CHART_FILES:
            src = f"word/media/{internal_name}"
            data = z.read(src)
            (OUT_DIR / public_name).write_bytes(data)
            print(public_name, len(data))


if __name__ == "__main__":
    main()
