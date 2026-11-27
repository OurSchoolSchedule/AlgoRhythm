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

## School42 데모 검증

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
