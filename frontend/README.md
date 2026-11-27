# AlgoRhythm — Frontend

> AlgoRhythm 스케줄링 플랫폼의 웹 클라이언트. 인터랙티브 캘린더 UI와 시간표 확인/수정, 보결·교환 요청 UX를 제공합니다.
> 상위 프로젝트 소개는 [루트 README](../README.md)를 참고하세요.

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![Vercel](https://img.shields.io/badge/Vercel-Deploy-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com)

**[🌍 Live Demo](https://ourschoolschedule.vercel.app/)**

---

## 🛠️ Tech Stack

| 영역 | 사용 기술 |
|---|---|
| Core | React 19, Vite 8 (`@vitejs/plugin-react`) |
| Routing | react-router-dom 7 |
| Server State | @tanstack/react-query 5 |
| HTTP | axios |
| Lint / Format | ESLint 9, Prettier 3 |

- 경로 별칭: `@` → `src` (`vite.config.js`)
- 개발 서버 포트: `5173`

---

## ▶️ Getting Started

```bash
cd frontend

npm install
npm run dev        # 개발 서버  http://localhost:5173
npm run build      # 프로덕션 빌드
npm run preview     # 빌드 결과 미리보기
npm run lint        # ESLint 검사
```

---

## 🔑 환경 변수 (Environment Variables)

`.env.example`를 복사해 `.env`로 사용하세요.

| 변수 | 설명 |
|---|---|
| `VITE_API_BASE_URL` | 기본값은 빈 문자열. 브라우저가 같은 origin의 `/api`를 사용합니다. |
| `API_PROXY_TARGET` | Vite 개발 서버의 백엔드 origin. 로컬 백엔드 실행 시 `http://localhost:8080`으로 설정합니다. |

- 로컬에서는 Vite가 `/api`와 `/oauth2`의 경로·쿼리·요청 본문을 백엔드로 전달합니다.
- **배포(Vercel)**: `VITE_API_BASE_URL`을 비우고, `vercel.json`의 rewrite 프록시를 통해 백엔드로 요청을 전달합니다. (Vercel 대시보드에 값이 남아 있으면 제거)

---

## 📁 구조

```text
frontend/
├── index.html
├── src/
│   ├── main.jsx          # 엔트리
│   ├── App.jsx           # 라우트 구성
│   └── ...               # pages · components · api · hooks
├── vite.config.js        # @ → src 별칭, dev 포트 5173
├── eslint.config.js
├── .env.example
└── package.json
```

---

## 🚀 배포 (Deployment)

- **Vercel**로 배포됩니다 (`https://ourschoolschedule.vercel.app/`).
- `vercel.json`이 `/api/*`, `/oauth2/*` 요청을 백엔드(`https://edu.rssolplan.com`)로 rewrite(프록시)합니다.
- 백엔드는 현재 Railway 무료 요금제에 한시 배포되어 있으며, 무료 정책상 SMTP(이메일 인증) 발송이 제한될 수 있습니다. 2025년 7~8월 이후 AWS 환경으로 이전 예정입니다.

## 이메일 인증 후 패스키 발급

- 이메일 인증을 마치면 기존 패스키 등록 여부와 관계없이 **새 패스키 발급**을 표시합니다. 현재 기기에서 기존 키를 사용할 수 없는 경우에도 이메일 인증으로 새 키를 등록할 수 있습니다.
- `POST /api/auth/passkeys/registration/options`에 이메일 인증의 일회용 `flowToken`을 전달합니다. 등록 완료는 `includeRecoveryCode: false`를 사용하며, WebAuthn 검증이 끝난 업무 세션만 저장합니다. 복구 코드를 입력·표시·보관하는 화면은 없습니다.
- 서버의 `nextStep: REGISTER`(첫 등록)와 `AUTHENTICATE`(기존 키 보유)를 모두 처리하며 두 경우 모두 새 키를 발급할 수 있습니다. 기존 키를 사용할 수 있으면 같은 화면의 **등록한 패스키로 인증** 또는 첫 화면의 **패스키로 로그인**도 사용할 수 있습니다.
- 새 키를 추가해도 계정·학교 소속과 기존 키는 유지됩니다. 분실한 키는 로그인 후 패스키 관리에서 삭제할 수 있습니다.
- 등록 옵션을 요청하면 이메일 토큰이 소비되므로 취소·실패 뒤 재발급하려면 이메일 인증을 다시 해야 합니다. 이메일 토큰은 메모리에만 두고, 계정 전환·화면 이탈·취소 뒤 도착한 인증 결과는 사용하지 않습니다.
- **배포 순서:** 기존 계정의 이메일 토큰으로 `registration/options`를 허용하는 백엔드를 먼저 반영한 뒤 프런트를 배포합니다.

## School42 학년별 편성 및 학급 담당 시연

시연한들고등학교(학교 `540001`), 2026학년도 2학기(학기 `547001`)에 준비된 교사 42명, 학급 21개, 과목 35개를 사용합니다. [PC·모바일 검증 화면 10장](../docs/qa/school42-grade-profile/README.md)

1. [교사 명부 XLSX](https://github.com/OurSchoolSchedule/AlgoRhythm-BE/raw/5c740bea7175b46238d8d2e608e7e15c981a5b39/demo/school42-roster.xlsx)와 [시수표·학급 담당 통합 XLSX](public/school42-files/teaching_load_42_homeroom_demo.xlsx)를 준비합니다. 교사 명부는 **관리자 도구 → 명부 일괄 등록**에서 대상 학기를 확인한 뒤 검증하고 확정합니다.
2. 재직 관리자 계정으로 **시간표 생성 → 생성할 학기 설정**에서 기존 학기를 선택하거나 학년도·학기·시작일자·마감일자를 입력합니다. 시험 등으로 정규 수업이 없는 날은 **정규 수업 제외일 → 날짜 추가** 후 학기에 적용합니다. 날짜 제외는 해당 날짜의 학교·개인 시간표에 적용됩니다. 주간 편성 시수와 다른 주의 같은 요일은 그대로입니다. 통합 파일의 `시수표` 시트를 검증하면 배정 251건, 주 671차시입니다.
3. **관리자 도구 → 명부 일괄 등록 → 학급 담당**에서 같은 통합 파일을 선택하고 **담임·부담임 적용**을 누릅니다. **관리자 도구 → 학급**에서 대상 학기를 선택하고 21개 학급의 담임과 부담임을 확인합니다. `학급담당` 시트는 학교 소속 교사 ID와 학급 ID로 연결합니다. 예를 들어 1학년 7반(`544007`) 담임은 정수빈(`542005`), 부담임은 서연수(`542013`)입니다.
4. **시간표 생성 → 학년별 마지막 교시** 표에서 아래 값을 입력합니다. 마지막 열의 차이는 학급별 필요 차시에서 배치 가능한 칸 수를 뺀 값입니다. 예를 들어 1학년 금요일을 5교시로 줄이면 `29칸 / 30차시 · +1 초과`가 되어 생성이 차단됩니다. 금요일을 6교시로 되돌리고 2학년 7반의 `32칸 / 31차시 · -1 공강`을 확인한 뒤 후보를 생성합니다. 페이지를 다시 열어 업로드 검증 ID가 사라졌다면 같은 파일을 다시 검증합니다. 직접 API를 호출할 때는 [생성 요청 예시](public/school42-files/generate_request_42_grade_demo.json)의 `validatedLoadId`를 해당 업로드의 응답 값으로 바꿉니다.
5. 후보 비교에서 하루에 집중된 학급·과목과 하루 6차시 이상을 맡은 교사·요일을 펼쳐 확인합니다. 희망·기피 시간은 교시마다 따로 평가하거나 여러 교시를 한 묶음으로 평가할 수 있습니다.
6. 후보를 선택하고 적용 시작일 `2026-11-23`으로 게시합니다. 2학년 7반에서 수업 31차시, 운영 시간 안의 공강 1차시를 확인합니다. 같은 주를 관리자 학교 시간표와 개별 교사의 시간표에서 조회합니다. 학급의 마지막 교시 뒤와 학기 밖은 **수업 없음**으로 표시됩니다. 게시 수업의 공개 보결은 관리자가 학교 시간표의 수업 상세에서 모집한 뒤, 수업을 맡을 수 있는 교사가 지원하고 모집한 관리자가 할 일에서 한 명을 승인합니다.

| 학년 | 월 | 화 | 수 | 목 | 금 | 배치 가능 교시 | 1~7반 각 주간 시수 | 학년 시수 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 6 | 6 | 6 | 6 | 6 | 30 | 30, 30, 30, 30, 30, 30, 30 | 210 |
| 2 | 7 | 6 | 6 | 7 | 6 | 32 | 32, 32, 32, 32, 32, 32, 31 | 223 |
| 3 | 7 | 7 | 6 | 7 | 7 | 34 | 34, 34, 34, 34, 34, 34, 34 | 238 |

`frontend/`에서 Python 3와 `openpyxl` 3.1 이상을 사용합니다. 스크립트는 저장소의 기존 [시수표](public/school42-files/teaching_load_42.xlsx)와 [교사 명부](src/test/fixtures/school42/teacher_roster.csv)로부터 새 XLSX와 학년별 조건 JSON을 생성합니다.

```bash
python scripts/school42_demo.py
python scripts/school42_demo.py --check
```

격리된 School42 서버에서 업로드부터 게시까지 다시 실행하려면 관리자와 시연 교사의 로컬 세션 토큰을 각각 `SCHOOL42_ADMIN_TOKEN`, `SCHOOL42_TEACHER_TOKEN` 환경 변수로 설정합니다. 다음 [HTTP 검증 스크립트](scripts/verify-school42-publication.mjs)는 담당 명부를 두 번 적용하고 권한·초과·주말 입력을 확인한 뒤 실제 후보를 생성·게시하고 학교 및 개인 주간표를 검사합니다. 반복 실행은 격리 학기에 새 게시 버전을 만듭니다.

```bash
SCHOOL42_LOCAL_API=http://127.0.0.1:8080 node scripts/verify-school42-publication.mjs
```

다른 격리 학기에서는 `SCHOOL42_TERM_ID`와 `SCHOOL42_EFFECTIVE_FROM`을 지정합니다. 2026학년도 1학기 리허설에서는 3월 3일~7월 20일로 학기를 등록하고 4월 21일을 제외한 뒤 4월 13일을 게시 적용일로 지정했습니다. 검산 스크립트는 업로드 원본과 후보 전체의 학급·과목·교사별 시수를 대조하고, 게시 적용일부터 마감일까지의 날짜별 시간표를 학교·교사 주간표와 비교합니다. 리허설 게시본에서 평소 화요일은 133차시였고 4월 21일은 0차시였습니다. 4월 20일 주는 538차시, 4월 27일 주는 671차시였습니다.

실제 게시본을 검산할 때는 관리자 세션으로 `GET /api/timetable/year/2026/semester/2?termId=547001&weekOf=2026-11-23`과 `GET /api/v2/terms/547001/homerooms`의 응답 배열을 각각 `week.json`, `homerooms.json`에 저장한 뒤 실행합니다. 교사·과목·학급별 시수, 요일·교시 범위, 교사·학급 충돌 및 21개 학급의 담당 ID를 대조합니다.

```bash
python scripts/school42_demo.py --check --published-week week.json --homerooms homerooms.json
```

## 기존 School42 공통 교시 회귀 검증

`frontend/`에서 `npm test`를 실행하면 합성 명부와 원본 엑셀을 읽어 교사 42명·21학급·35과목의 배정 252건, 주 672차시를 검산합니다. `example_week.csv`는 가능한 배치 한 가지입니다. 후보의 합격 기준은 교사·과목·학급별 시수 일치, 허용 교시 준수, 동일 요일·교시의 교사·학급 중복 0건입니다.

실제 HTTP 검증에는 [주간표·담임 수정이 반영된 백엔드의 로컬 데모 실행 방법](https://github.com/OurSchoolSchedule/AlgoRhythm-BE/blob/a86243cb92732f87bec21d11ae9666d212483d26/demo/README.md)을 따릅니다. 백엔드 초기화 후 별도의 로컬 `algorhythm_demo` DB에 [School42 seed](src/test/fixtures/school42/school_seed.sql)를 적용하고 다음을 실행합니다.

```bash
npm run test:school42:local
```

기본 주소는 `http://127.0.0.1:8080`이며 `SCHOOL42_LOCAL_URL`로 다른 로컬 포트를 지정할 수 있습니다. 테스트는 학교 540001·학기 547001에서 검증 결과의 ID로 편성 작업을 생성하고 반환된 모든 후보를 검사합니다. 담임 조회 테스트는 1학년 6반의 연결을 임시로 등록한 뒤 원래의 미지정 상태로 복원합니다.

FE20 전체 검수에서는 새로 초기화한 School42 DB에서 다음 명령을 실행합니다.

```bash
FE20_VERIFY_PUBLICATION=1 npm run test:school42:local
```

이 검사는 학기 547001의 후보를 실제로 게시합니다. 2026-11-23 적용 주의 날짜 수업과 학교 주간표를 각각 672차시, 교사 542004를 15차시, 학급 544006을 32차시로 대조합니다. 같은 DB에서 게시 검사를 다시 실행하려면 게시 이력이 없는 원본 fixture로 시작해야 합니다.
