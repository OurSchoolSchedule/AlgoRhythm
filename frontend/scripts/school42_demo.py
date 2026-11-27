"""Build and independently check the two-sheet School42 demo (openpyxl 3.1+)."""
import argparse
import csv
import json
from collections import Counter
from pathlib import Path

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public' / 'school42-files'
FIXTURE = ROOT / 'src' / 'test' / 'fixtures' / 'school42'
DEMO = PUBLIC / 'teaching_load_42_homeroom_demo.xlsx'
REQUEST = PUBLIC / 'generate_request_42_grade_demo.json'
DAYS = ('MON', 'TUE', 'WED', 'THU', 'FRI')
LIMITS = {1: (6, 6, 6, 6, 6), 2: (7, 6, 6, 7, 6), 3: (7, 7, 6, 7, 7)}
CLASS_IDS = {f'{g}-{n}': 544001 + (g - 1) * 7 + n - 1 for g in LIMITS for n in range(1, 8)}
ROLE_HEADER = ('학년', '반', '학급 ID', '담임 교사 ID', '담임 이름', '부담임 교사 ID', '부담임 이름')


def ensure(condition, message):
    if not condition:
        raise ValueError(message)


def roster():
    with (FIXTURE / 'teacher_roster.csv').open(encoding='utf-8-sig', newline='') as file:
        teachers = {int(row['schoolUserId']): row for row in csv.DictReader(file)}
    ensure(set(teachers) == set(range(542001, 542043)), 'School42 교사 ID가 다릅니다.')
    return teachers


def grade_request():
    original = json.loads((PUBLIC / 'generate_request.json').read_text(encoding='utf-8'))
    return {
        'validatedLoadId': '검증 응답의 validatedLoadId로 교체',
        'gradeLastPeriods': [{'grade': grade, 'lastPeriods': dict(zip(DAYS, last))}
                             for grade, last in LIMITS.items()],
        'preferences': original['preferences'],
    }


def style(sheet, widths, freeze):
    sheet.freeze_panes = freeze
    sheet.auto_filter.ref = sheet.dimensions
    sheet.row_dimensions[1].height = 26
    for cell in sheet[1]:
        cell.fill = PatternFill('solid', fgColor='263F54')
        cell.font = Font(name='맑은 고딕', color='FFFFFF', bold=True)
        cell.alignment = Alignment(horizontal='center', vertical='center')
    for index, width in enumerate(widths, 1):
        sheet.column_dimensions[get_column_letter(index)].width = width


def build():
    source = load_workbook(PUBLIC / 'teaching_load_42.xlsx', read_only=True, data_only=True)
    workbook = Workbook()
    load = workbook.active
    load.title = '시수표'
    rows = iter(source['시수표'].values)
    header = next(rows)
    ensure(list(header[2:-1]) == list(CLASS_IDS), '기준 파일의 학급 순서가 바뀌었습니다.')
    load.append(header)
    for teacher, subject, *values in rows:
        cells = values[:-1]
        for i, group in enumerate(header[2:-1]):
            if cells[i] is None:
                continue
            grade = int(group.split('-')[0])
            if grade == 1 and subject in ('공통국어2', '공통수학2'):
                cells[i] -= 1
            if grade == 3 and subject in ('언어와 매체', '확률과 통계'):
                cells[i] += 1
            if group == '2-7' and subject == '진로와 직업':
                ensure(cells[i] == 1, '2-7 진로와 직업 기준 시수 변경')
                cells[i] = None
        total = sum(n or 0 for n in cells)
        if total:
            load.append([teacher, subject, *cells, total])
    source.close()
    style(load, [13, 23, *([7] * len(CLASS_IDS)), 9], 'C2')
    teachers = roster()
    primary = {r['담임 학급']: (member, r) for member, r in teachers.items() if r['담임 학급']}
    deputies = sorted((member, r) for member, r in teachers.items() if not r['담임 학급'])
    ensure(set(primary) == set(CLASS_IDS) and len(deputies) == len(CLASS_IDS), '기준 담임 명부 확인 필요')
    roles = workbook.create_sheet('학급담당')
    roles.append(ROLE_HEADER)
    for (group, class_id), (deputy_id, deputy) in zip(CLASS_IDS.items(), deputies):
        grade, number = map(int, group.split('-'))
        member_id, head = primary[group]
        roles.append([grade, number, class_id, member_id, head['교사명'], deputy_id, deputy['교사명']])
    style(roles, [10, 10, 14, 20, 18, 20, 18], 'C2')
    workbook.properties.title = '시연한들고등학교 2026학년도 2학기 시수표·학급담당'
    workbook.save(DEMO)
    REQUEST.write_text(json.dumps(grade_request(), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def verify():
    teachers = roster()
    ids_by_name = {row['교사명']: member for member, row in teachers.items()}
    ensure(len(ids_by_name) == len(teachers), '시수표 이름이 중복되어 식별할 수 없습니다.')
    workbook = load_workbook(DEMO, read_only=True, data_only=False)
    ensure(workbook.sheetnames == ['시수표', '학급담당'], '시트명 오류')
    load = iter(workbook['시수표'].values)
    header = next(load)
    ensure(header == ('교사명', '과목명', *CLASS_IDS, '합계'), '시수표 머리글 오류')
    demands, totals, names, subjects = {}, Counter(), set(), set()
    for teacher, subject, *values in load:
        ensure(teacher in ids_by_name and isinstance(subject, str), '교사 또는 과목 오류')
        names.add(teacher)
        subjects.add(subject)
        cells, declared = values[:-1], values[-1]
        ensure(declared == sum(n or 0 for n in cells), f'{teacher}/{subject} 행 합계 오류')
        for group, n in zip(CLASS_IDS, cells):
            if n is None:
                continue
            ensure(type(n) is int and n > 0, f'{group} 시수 오류')
            key = (ids_by_name[teacher], subject, CLASS_IDS[group])
            ensure(key not in demands, f'중복 수업 배정 {key}')
            demands[key] = n
            totals[group] += n
    roles = iter(workbook['학급담당'].values)
    ensure(next(roles) == ROLE_HEADER, '학급담당 머리글 오류')
    classes, heads, deputies = set(), set(), set()
    role_pairs = {}
    for grade, number, class_id, head, head_name, deputy, deputy_name in roles:
        group = f'{grade}-{number}'
        ensure(CLASS_IDS.get(group) == class_id and group not in classes, f'학급 ID/중복 오류 {group}')
        ensure(head != deputy and head not in heads and deputy not in deputies, f'역할 중복 {group}')
        ensure(head in teachers and deputy in teachers, f'학교 명부에 없는 교사 {group}')
        ensure(teachers[head]['교사명'] == head_name and teachers[deputy]['교사명'] == deputy_name,
               f'학급담당 교사 ID/표시 이름 불일치 {group}')
        ensure(teachers[head]['담임 학급'] == group, f'원본 담임 연결 변경 {group}')
        role_pairs[class_id] = (head, deputy)
        classes.add(group)
        heads.add(head)
        deputies.add(deputy)
    workbook.close()
    ensure(classes == set(CLASS_IDS) and not heads & deputies and heads | deputies == set(teachers), '담당 누락 또는 중복')
    ensure(set(ids_by_name) == names and len(subjects) == 35, '교사 또는 과목 수 불일치')
    settings = json.loads(REQUEST.read_text(encoding='utf-8'))
    ensure(settings == grade_request(), '편성 조건 파일 불일치')
    for group, n in totals.items():
        grade = int(group.split('-')[0])
        ensure(n + (group == '2-7') == sum(LIMITS[grade]), f'{group} 시수/공강 불일치')
    ensure(set(totals) == classes and len(demands) == 251 and sum(totals.values()) == 671, '배정/전체 시수 불일치')
    for grade, periods in LIMITS.items():
        hours = [totals[f'{grade}-{number}'] for number in range(1, 8)]
        print(f'{grade}학년 월~금 {periods}, 1~7반 시수 {hours}, 합계 {sum(hours)}')
    print(f'교사 {len(names)}명 / 학급 {len(classes)}개 / 과목 {len(subjects)}개 / '
          f'배정 {len(demands)}건 / 주 {sum(totals.values())}차시 / 담임 {len(heads)}명 / 부담임 {len(deputies)}명')

    return demands, role_pairs


def check_publication(path, demands):
    rows = json.loads(path.read_text(encoding='utf-8'))
    actual = Counter()
    teacher_slots, class_slots = set(), set()
    for row in rows:
        member, class_id = row['teacherId'], row['schoolClassId']
        day, period = row['dayOfWeek'], row['periodNumber']
        grade, group = row['grade'], f"{row['grade']}-{row['classNumber']}"
        ensure(CLASS_IDS.get(group) == class_id, f'게시 학급 ID 오류 {group}')
        ensure(day in DAYS and 1 <= period <= LIMITS[grade][DAYS.index(day)], f'허용 교시 초과 {group} {day} {period}')
        teacher_slot = (member, day, period)
        class_slot = (class_id, day, period)
        ensure(teacher_slot not in teacher_slots, f'게시 교사 충돌 {teacher_slot}')
        ensure(class_slot not in class_slots, f'게시 학급 충돌 {class_slot}')
        teacher_slots.add(teacher_slot)
        class_slots.add(class_slot)
        actual[member, row['subjectName'], class_id] += 1
    ensure(actual == demands, '게시본 교사 ID·과목·학급 ID별 시수가 입력 파일과 다릅니다.')
    print(f'게시 주간표 {len(rows)}차시 일치, 범위 위반 0, 교사 충돌 0, 학급 충돌 0')


def check_roles(path, role_pairs):
    rows = json.loads(path.read_text(encoding='utf-8'))
    saved = {r['classId']: (r['homeroomTeacher']['schoolUserId'], r['deputyTeacher']['schoolUserId']) for r in rows}
    ensure(len(rows) == len(saved) and saved == role_pairs, '조회한 담임·부담임 연결이 입력 파일과 다릅니다.')
    print(f'조회 결과 {len(saved)}개 학급의 담임·부담임 ID 일치')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='기존 생성 파일만 읽어 검산')
    parser.add_argument('--published-week', type=Path, help='관리자 학교 주간표 GET 응답 JSON')
    parser.add_argument('--homerooms', type=Path, help='학기 학급 담당 GET 응답 JSON')
    args = parser.parse_args()
    if not args.check:
        build()
    expected_demands, expected_roles = verify()
    if args.published_week:
        check_publication(args.published_week, expected_demands)
    if args.homerooms:
        check_roles(args.homerooms, expected_roles)
