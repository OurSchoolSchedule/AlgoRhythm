# 프론트엔드 ↔ 백엔드 협업 문서

> 작성: 프론트엔드 팀 · 기준 브랜치: `fe/api`
> 목적: 현재 UI 구현 상태를 기준으로 **API 수정 요청 / 추가 요청 / 데이터 모델 불일치**를 정리하고, **프론트(학교 도메인) ↔ 백엔드(매장·알바 관리 도메인) 간 불일치**를 명확히 공유한다.

---

## 0. 핵심 요약 (먼저 읽어주세요)

- 현재 **UI는 "학교 시간표/교사" 도메인**, **백엔드 API는 "매장/파트타임(알바) 관리" 도메인**입니다. (예: `Payroll=시급/최저임금`, `Attendance=출퇴근`, `StoreSettings=영업시간`, `Position=OWNER/STAFF`)
- 프론트는 현재 **"학교 스킨 + 매장 엔진"** 전략으로 진행 중입니다. 즉 **API 데이터는 그대로 쓰되 화면 라벨만 학교 도메인으로 매핑**합니다. (`매장→학교`, `OWNER→관리자`, `STAFF→교사`)
- 이 문서의 요청 사항은 **두 갈래**입니다.
  1. **(공통/필수)** 도메인과 무관하게 필요한 수정 (알림 `id`, 읽음 처리, 에러 응답 표준화, dev-token refresh 등)
  2. **(도메인 의존)** 학교 개념(과목/학급/교시/담임)을 백엔드가 지원할지, 아니면 프론트에서 드롭/매핑할지 **의사결정 필요**

---

## 1. 현재 구현된 화면 목록

| # | 화면 | 파일 | 역할 |
|---|------|------|------|
| 1 | DevLogin | `pages/auth/DevLoginView.jsx` | 개발용 로그인(dev-token) |
| 2 | Home (관리자) | `pages/home/HomeView.jsx` | 대시보드 |
| 3 | WorkerHome (사용자) | `pages/home/WorkerHomeView.jsx` | 개인 홈 |
| 4 | Timetable | `pages/schedule/TimetableView.jsx` | 주간표 + 투두 탭 |
| 5 | (투두 탭) | `pages/schedule/ScheduleTodoTab.jsx` | 할 일 CRUD |
| 6 | ScheduleCreate | `pages/schedule/ScheduleCreateView.jsx` | 시간표 생성 마법사 |
| 7 | SubjectManage | `pages/store/SubjectManageView.jsx` | 과목·수업 관리 |
| 8 | History (내역) | `pages/history/HistoryView.jsx` | 처리 내역 |
| 9 | AdminView | `pages/history/HistoryView.jsx` | 관리자 도구(교사/학급/설정) |
| 10 | NotificationSidebar | `components/layout/NotificationSidebar.jsx` | 알림 패널 |
| 11 | HeaderUserMenu | `components/layout/HeaderUserMenu.jsx` | 프로필/로그아웃 |

---

## 2. 화면별 사용 중인 API

| 화면 | 연동 API | 상태 |
|------|----------|------|
| DevLogin | `POST /api/auth/dev-token` | ✅ 연동 |
| HeaderUserMenu (로그아웃) | `POST /api/auth/logout` | ✅ 연동 |
| Home — 할 일 카드 | `GET /api/todos?date=`, `PATCH /api/todos/{id}/toggle` | ✅ 연동 |
| Home — 오늘 수업표 / 브리핑 / 통계 | (없음) | ❌ mock |
| WorkerHome — 알림 / 미확인 수 | `GET /api/notifications` | ✅ 연동 |
| WorkerHome — 내 시간표 / 현재 수업 / 시수 / 보결 | (없음) | ❌ mock |
| Timetable — 주간 grid | (없음) | ❌ mock |
| Timetable — 투두 탭(ScheduleTodoTab) | `GET/POST/PUT/DELETE /api/todos`, `토글`, `GET /api/mypage/active-store`, 프로필 | ✅ 연동 |
| AdminView — 교사 탭 | `GET /api/store/staff/summary` | ✅ 연동 (OWNER 전용) |
| AdminView — 설정 탭 | `GET /api/store-settings`, `PATCH /api/store-settings` | ✅ 연동 (OWNER 전용) |
| AdminView — 학급 탭 | (없음) | ❌ mock |
| ScheduleCreate | (없음 — Schedule Generation 미연동) | ❌ mock |
| SubjectManage | (없음) | ❌ mock |
| History | (없음 — 이력 API 없음) | ❌ mock |
| NotificationSidebar | `GET /api/notifications` | ✅ 연동 |

---

## 3. 화면에서 필요하지만 현재 API에 없는 데이터

| 화면 | 필요한 데이터 | 현재 API 상태 | 중요도 |
|------|---------------|---------------|:---:|
| Home/Worker/Timetable | 시간표 **셀 내용**(과목·학급·장소) | `WorkShiftDto`엔 `start/endDatetime + user`만 존재 | 높음 |
| Home/Worker/Timetable | **교시(period) 인덱스** | API는 datetime 기반, 교시 개념 없음 | 높음 |
| Home (브리핑) | 실시간 변동(보결/변경) 피드 | 없음 | 중간 |
| Home (통계) | 오늘 수업 수 / 이번 주 보결 수 | shift/swap 집계 API 없음 | 중간 |
| Home (통계) | 등록 교사 수 | `staff/summary.totalStaffCount`로 대체 가능 | 낮음 |
| AdminView 교사 | 담당 과목 / 담임 여부 / 담임 학반 | 프로필·staff DTO에 없음 | 높음(도메인 의존) |
| SubjectManage | 과목/수업 엔티티 | **API 자체가 없음** | 높음(도메인 의존) |
| AdminView 학급 | 학급/학년/반/정원 | **API 자체가 없음** | 중간(도메인 의존) |
| History | 처리 내역(audit log) | **엔드포인트 없음** | 중간 |
| HeaderUserMenu | 프로필(담당 과목/담임 학급) | 프로필 DTO에 없음 | 낮음 |

---

## 4. API는 존재하지만 UI와 데이터 구조가 맞지 않는 부분

| API | 구조 | UI 기대 | 불일치 |
|-----|------|---------|--------|
| `WorkShiftDto` / `MyWorkShiftDto` | `startDatetime`, `endDatetime`(연속 시간) | 8교시 grid(이산 교시 슬롯) | **시간축 모델 자체가 다름** — 변환/매핑 규칙 필요 |
| `StoreSettingDto` | `useSegments`, `segments[]`(구간 분할), 영업시간 | 학교 운영시간 | 매장 전용 필드(구간 분할)는 학교 UI에서 숨김 처리 중 |
| `StaffSummaryDto` | `monthlyPay`, `bankName`, `accountNumber`(급여/계좌) | 교사 목록 | 급여·계좌는 학교 교사 목록에 부적합 → FE에서 컬럼 숨김 |
| `NotificationResponseDto` | `shiftSwapRequestId`, `extraShiftStatus` 등 매장 시프트 지향 | 학교 알림(보결/변경/안내) | 알림 분류(category/type) 의미 불일치, **고유 `id` 없음** |
| `TodoListResponseDto` | `STORE / HANDOVER / PERSONAL` | 학교 할 일 | `HANDOVER(인수인계)`의 학교 의미 모호 (FE는 "전체 공지" 등으로 라벨 매핑) |
| `ScheduleRequestDto` | `staffRequirement`(필요 인원/세그먼트) | 교사·과목·제약(교시) | 생성 입력 모델이 인원 기반 vs 수업 배치 기반 |

---

## 5. 프론트에서 임시 변환 중인 필드

> 백엔드 응답을 그대로 못 쓰고 FE가 가공하는 항목. **API 변경 시 영향**을 받습니다.

| 항목 | 백엔드 값 | FE 변환 | 위치 |
|------|-----------|---------|------|
| `role` (Position) | `OWNER` / `STAFF` | `관리자` / `교사` | `HistoryView.jsx` `ROLE_LABEL` |
| `employmentStatus` | `HIRED`/`ON_LEAVE`/`RESIGNED` | `재직`/`휴직`/`퇴직` + 색상 | `HistoryView.jsx` `STATUS_LABEL` |
| 시간 형식 | `"HH:mm:ss"` | `<input type=time>`용 `"HH:mm"` (양방향) | `toInputTime`/`toApiTime` |
| `monthlyPay` | `number` | `toLocaleString()+원` (현재 컬럼 숨김) | AdminView |
| Todo 그룹 | `storeTodos/handoverTodos/personalTodos` | 단일 리스트로 concat (Home) | HomeView |
| Notification 시간 | `createdAt(ISO)` | 로컬 포맷 + 오늘/이번주/이전 그룹핑 | NotificationSidebar |
| Notification 키 | (고유 id 없음) | **배열 index를 key로 사용 중** ⚠ | NotificationSidebar/WorkerHome |
| 인증 | dev-token = accessToken만 | refresh token 없음 → 만료 시 강제 로그아웃 | `client.js` |

---

## 6. 학교 도메인 UI ↔ 매장 도메인 API 불일치

| 학교 UI 개념 | 매장 API 개념 | 매핑 | 처리 방향(제안) |
|--------------|---------------|------|------------------|
| 교사 | 직원(STAFF) | 가능 | 라벨 매핑 |
| 관리자/교감 | 사장(OWNER) | 가능 | 라벨 매핑 |
| 학교 | 매장(Store) | 가능 | 라벨 매핑 |
| 교시(1~8교시) | 근무시간(datetime shift) | 부분 | **변환 규칙 합의 필요** |
| 보결 | 대타(Shift Swap) | 유사 | 매핑 가능 |
| 추가 감독 | 추가 근무(Extra Shift) | 유사 | 매핑 가능 |
| 과목 | (대응 없음) | ❌ | 화면 드롭 또는 API 신규 |
| 학급/학년·반 | (대응 없음) | ❌ | 화면 드롭 또는 API 신규 |
| 담임/담당 과목 | (대응 없음) | ❌ | 프로필 필드 추가 또는 드롭 |
| 시수 | 총 근무 횟수 | 단위 다름 | 라벨 매핑("총 수업") |
| 급여/시급/최저임금 | Payroll | 학교 부적합 | MVP 제외 |
| 출퇴근 | Attendance | 학교 부적합 | 보류(우선순위 하향) |

---

## 7. 백엔드 수정 요청 사항

### 7-A. 필드 추가가 필요한 DTO

| DTO | 추가 요청 필드 | 사유 | 중요도 | 프론트 영향도 | 예상 작업량 |
|-----|----------------|------|:---:|:---:|:---:|
| `NotificationResponseDto` | **고유 `id`(Long)** | FE가 index를 key로 쓰는 중(렌더링 버그 위험), 읽음 처리 키 필요 | **높음** | 높음 | 작음 |
| `WorkShiftDto` / `MyWorkShiftDto` | (학교 유지 시) `subject`, `className`, `location` 또는 라벨 필드 | 시간표 셀에 표시할 내용 부재 | 높음(도메인) | 높음 | 중간 |
| `StaffSummaryDto` | (학교 유지 시) `subject`, `isHomeroom`, `homeroomClass` | 교사 목록 컬럼 | 중간(도메인) | 중간 | 중간 |
| `OwnerProfile/StaffProfileResponse` | (학교 유지 시) 담당 과목/담임 학급 | 헤더 프로필 표시 | 낮음 | 낮음 | 중간 |

### 7-B. 신규 API가 필요한 기능

| 기능 | 제안 엔드포인트 | 사유 | 중요도 | 프론트 영향도 | 예상 작업량 |
|------|------------------|------|:---:|:---:|:---:|
| 알림 읽음 처리 | `PATCH /api/notifications/{id}/read` (+ `read-all`) | 미확인 수/뱃지 갱신 | **높음** | 높음 | 작음 |
| 처리 내역(History) | `GET /api/history` 또는 변경/대타 이력 조회 | History 화면 데이터 부재 | 중간 | 중간 | 중간 |
| 과목/학급 (학교 유지 시) | `GET/POST /api/subjects`, `/api/classes` | SubjectManage·학급 탭 | 중간(도메인) | 중간 | 큼 |
| 대시보드 통계 집계 | `GET /api/dashboard/summary` | Home 통계/브리핑 | 낮음 | 중간 | 중간 |

### 7-C. 응답 구조 변경이 필요한 부분

| 대상 | 요청 | 사유 | 중요도 | 예상 작업량 |
|------|------|------|:---:|:---:|
| 공통 에러 응답 | `{ success, error(code), message }` **포맷 표준화 및 HTTP status 일관화** | FE가 403/권한/검증 에러를 화면 메시지로 분기해야 함 | **높음** | 작음 |
| 주간 근무표 | 날짜/요일·시간대로 **그룹핑된 형태** 또는 정렬 보장 | grid 변환 비용 절감 | 중간 | 중간 |
| `dev-token` | 응답에 **refreshToken 포함** (또는 dev 모드 무한 토큰) | 현재 accessToken만 → 만료 시 즉시 로그아웃 | 중간 | 작음 |

### 7-D. 권한 처리 관련 요청

| 항목 | 현재 | 요청 |
|------|------|------|
| `GET /api/store/staff/summary` | OWNER 전용 | 권한 부족 시 **명확한 에러 코드**(예: `FORBIDDEN`) 반환 → FE 안내 분기 |
| `PATCH /api/store-settings` | OWNER 전용 | 동일 |
| Payroll 전반 | OWNER/본인 구분 | 역할별 접근 범위 문서화 |
| 공통 | 401 vs 403 혼용 가능성 | **401(미인증) / 403(권한없음) 구분** 명확화 (FE 토큰 재발급 로직과 직결) |

---

## 8. MVP 기준 반드시 필요한 API

| API | 용도 | 상태 |
|-----|------|------|
| `POST /api/auth/dev-token` (+ refresh 포함) | 로그인 | ✅ (refresh 보강 요청) |
| `POST /api/auth/logout` | 로그아웃 | ✅ |
| `GET /api/mypage/active-store`, 프로필 | 역할/부트스트랩 | ✅ |
| `GET /api/todos`, CRUD, toggle | 할 일 | ✅ |
| `GET /api/notifications` + **읽음 처리** | 알림 | ⚠ 읽음 API 필요 |
| `GET /api/store/staff/summary` | 교사(직원) 목록 | ✅ |
| `GET/PATCH /api/store-settings` | 운영 설정 | ✅ |
| **Work Shift** (`/api/schedules/*week`, CRUD) | 시간표/근무표(핵심) | ⛔ UI 재설계 + 연동 필요 |
| **Schedule Generation** (`/api/schedules/requests/*`) | 시간표 생성(핵심) | ⛔ UI 재설계 + 연동 필요 |
| **Availability** (`/api/me/availabilities`) | 생성 선행 입력 | ⛔ 미연동 |

---

## 9. 있으면 좋은 API (Nice-to-have)

| API | 용도 | 비고 |
|-----|------|------|
| Shift Swap (`/api/shift-swap/*`) | 보결(대타) | 학교 "보결"과 매핑 좋음 |
| Extra Shift (`/api/extra-shift/*`) | 추가 감독 | |
| History/Audit | 처리 내역 화면 | 신규 필요 |
| Dashboard summary | 통계/브리핑 | 신규 필요 |

---

## 10. 현재 사용되지 않는 API (FE 미연동)

| API 그룹 | 사용 여부 | MVP 분류 |
|----------|:---:|------|
| Schedule Generation | ❌ | MVP 핵심(재설계 예정) |
| Work Shift | ❌ | MVP 핵심(재설계 예정) |
| Availability | ❌ | MVP(생성 선행) |
| Shift Swap | ❌ | Nice-to-have |
| Extra Shift | ❌ | Nice-to-have |
| Payroll (시급/급여/최저임금) | ❌ | MVP 제외(학교 부적합) |
| Attendance (출퇴근) | ❌ | 보류(우선순위 하향) |
| MyPage 매장 생성/참여/탈퇴, 프로필 수정 | ❌(active-store/프로필 조회만 일부) | 온보딩 정식화 시 |
| Onboarding / Email 인증 | ❌ | 인증 정식화 시 |

---

## 11. A / B / C 분류 (화면 단위)

| 분류 | 화면 |
|------|------|
| **A. 현재 상태로 유지 가능** | DevLogin, AdminView(교사/설정), NotificationSidebar, WorkerHome 알림, Home 할일, Timetable 투두 탭 |
| **B. 간단 수정 후 사용 가능** | HeaderUserMenu(프로필 API 연결), Home 통계 카드(staff summary 일부 치환) |
| **C. 도메인 달라 재설계 필요** | Timetable 주간 grid, Home/Worker 시간표, ScheduleCreate, SubjectManage, AdminView 학급, History, Worker 보결 블록 |

---

## 12. 백엔드 팀에 바라는 의사결정 (요약)

1. **도메인 방향 확정**: 학교 개념(과목/학급/교시/담임)을 **백엔드가 1급 엔티티로 지원**할 것인가, 아니면 **프론트가 매장 엔진 위에 스킨만** 입힐 것인가?
   - 후자면 → 7-A/7-B의 "도메인 의존" 항목은 **불필요**, 프론트가 해당 화면을 드롭/매핑.
2. **(공통·즉시 가능)** 아래는 도메인과 무관하게 우선 반영 요청:
   - 알림 **고유 id** + **읽음 처리 API**
   - **에러 응답 표준화** 및 **401/403 구분**
   - **dev-token refresh** 토큰 포함
3. **시간축 매핑 규칙**: 근무표 `datetime` ↔ 시간표 `교시`. 학교 유지 시 교시 정의(시작시간/길이)를 어디서 관리할지 합의 필요.

---

_문의: 프론트엔드 팀. 본 문서는 `fe/api` 브랜치 구현 기준이며, 화면 연동 진행에 따라 갱신됩니다._
