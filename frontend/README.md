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
| `VITE_API_BASE_URL` | 백엔드 API 베이스 URL. 로컬 개발 시 `https://edu.rssolplan.com` 등 직접 지정 |

- **로컬 개발**: 백엔드가 localhost CORS를 허용하므로 `VITE_API_BASE_URL`로 API 호스트를 직접 지정합니다.
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