# 🤝 Contributing to AlgoRhythm

AlgoRhythm 팀의 협업 규칙입니다. 모든 기여는 아래 흐름을 따릅니다.

> 본 문서는 팀의 협업 컨벤션 **선언**입니다. 일부 항목(브랜치 보호 규칙 등)은
> 도입 진행 중이며, PR 이력이 쌓이며 정착시키는 것을 목표로 합니다.

## 🌿 브랜치 전략

```
main           # 배포 가능한 안정 브랜치 (직접 push 금지, PR로만 병합)
 └─ dev        # 통합 개발 브랜치
     ├─ feat/fe/#12-timetable-api
     ├─ feat/be/#13-notification-read-api
     └─ fix/be/#21-payroll-rounding
```

- **브랜치 네이밍**: `<type>/<area>/#<issue-no>-<short-desc>`
  - `type`: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`
  - `area`: `fe`, `be`, `infra`
  - 예) `feat/fe/#12-timetable-api`

## ✍️ 커밋 & PR 컨벤션

커밋/PR 제목은 대괄호 태그로 시작합니다.

| 태그 | 의미 |
| --- | --- |
| `[FEAT]` | 기능 개발 |
| `[FIX]` / `[BUG]` | 버그 수정 |
| `[REFACT]` | 리팩토링 |
| `[PERFOR]` | 성능 개선 |
| `[DOCS]` | 문서 작업 |
| `[CICD]` | CI/CD 작업 |
| `[TEST]` | 테스트 코드 |
| `[CHORE]` | 오타·사소한 스타일 |

예) `[FEAT] 시간표 주간 조회 API 연동 (#12)`

## 🔀 PR & 리뷰 규칙

1. 작업은 **Issue → 브랜치 → PR** 순서로 진행합니다.
2. PR 템플릿의 **무엇을 / 왜 / 어떻게 테스트했는지**를 최소 3줄이라도 작성합니다.
3. **최소 1명 이상 approve** 후 머지합니다.
4. PR은 관련 이슈를 `Closes #<번호>`로 연결합니다.
5. `CODEOWNERS`에 지정된 오너가 자동 리뷰어로 등록됩니다.

## 🧪 로컬 테스트

PR 전에 변경 영역의 테스트를 실행합니다.

```bash
# Backend
cd backend
./gradlew test

# Frontend
cd frontend
npm install
npm test
```

CI(`.github/workflows/ci.yml`)에서 PR마다 BE/FE 테스트가 자동 실행됩니다.

## 📁 이슈 / 템플릿

- 기능: `✨ Feature Request`
- 버그: `🐞 Bug Report`
- 세팅/문서/인프라: `🧰 Chore / Setup`

이슈는 작게 쪼개서 등록합니다. (예: "#12 FE 시간표 API 연동", "#13 알림 read API")
