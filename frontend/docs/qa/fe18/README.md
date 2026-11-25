# FE18 교사·과목 명부 일괄 등록

재직 관리자로 로그인한 뒤 **관리자 도구 → 명부 일괄 등록**을 연다. 대상 학교와 학기를 선택한 후 양식을 내려받는다. 다른 학교를 선택하면 기존 학교 전환 흐름을 따라 해당 학교의 업무 홈으로 이동한다. 학기는 홈과 같은 학기 ID를 사용한다. 교사의 여러 과목은 인증 이메일을 반복해 한 행에 한 과목씩 작성한다.

## FE19·FE20 연동

| 경로 또는 모듈 | 계약 |
| --- | --- |
| `src/pages/history/HistoryView.jsx` | 기존 관리자 도구의 명부 탭에서 `RosterImportPanel`을 렌더링한다. 페이지 진입과 등록 요청 모두 활성 학교의 `ADMIN`·`HIRED`를 확인한다. |
| `src/api/rosterImport.ts` | 공유 인증 클라이언트를 사용한다. `/api/schools/{schoolId}/roster/terms/{termId}/imports` 아래에서 `GET /template`, multipart `POST /preview`, JSON `POST /{previewId}/confirm`을 호출한다. |
| `src/hooks/useRosterImport.ts` | `GET /api/schools/{schoolId}/roster?termId={termId}`로 명부를 조회한다. 학교 전체에 적용되는 표시 이름을 위해 `schoolRosterKey(schoolId)` 아래 다른 학기 조회도 무효화한다. 전체 키는 `['school-roster', schoolId, termId, session.scope]`다. 교사 프로필·교사 목록·홈 디렉터리 캐시도 갱신한다. |
| `src/types/rosterImport.ts` | 셀 오류는 시트·원본 행·열·셀·사유를 담는다. `UNCHANGED`는 등록 내용이 같은 교사 수이며, 파일 안의 중복 과목은 `DUPLICATE_SUBJECT` 셀 오류에 포함한다. |
| 확정 재시도 | 현재 파일의 SHA-256을 서버 미리보기와 대조한다. 결과를 받지 못하면 같은 미리보기 ID와 해시로 재시도한다. 파일 교체, 학교·학기 변경, 서버의 409 응답 시 기존 미리보기를 폐기한다. |

[BE 요청·응답 및 오류 예시](https://github.com/OurSchoolSchedule/AlgoRhythm-BE/blob/83225878b10cd9fb5acad9a9469dc7feb60b7927/docs/be-r2-roster-import.md) · [School42 명부 엑셀](https://github.com/OurSchoolSchedule/AlgoRhythm-BE/blob/83225878b10cd9fb5acad9a9469dc7feb60b7927/demo/school42-roster.xlsx)

## 검증

FE 기준 `fe/develop@b79d1a6`, BE 기준 `develop@8322587`. `frontend/`에서 `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`를 실행했다. Vitest 25개 파일의 206건이 통과했고 FE18 전용 검사 5건을 포함한다.

격리된 MySQL 8.4.7과 Redis 7.2.5, Spring Boot, 로컬 Chromium으로 학교 540001·학기 547001을 검증했다. 로컬 시연 세션을 발급한 후 브라우저에서 업무 메뉴와 학기 선택 화면을 거쳐 파일을 업로드했다. Vite 개발 서버와 프로덕션 빌드의 로컬 미리보기에서 같은 절차를 실행했다.

| 입력 또는 조작 | 확인한 결과 |
| --- | --- |
| 143행 명부에 중복 과목 한 행 추가 | HTTP 422, `교사명부 · C145`와 사유 표시. 확정 버튼 비활성. 수정본 선택 후 다시 검증 가능. |
| 원본 143행 확정 | 신규 42명, 저장된 명부 42명, 담당 과목 연결 142건. 동명이인 2명과 미배정 1명 유지. |
| 확정 연속 클릭, 서버 저장 직후 첫 응답 유실 | 첫 클릭 묶음은 HTTP 요청 한 번. 재시도 시 동일 영수증 반환, 명부 42명 유지. |
| 재업로드 후 한 사람의 이름 수정 | 동일 42명. 수정 파일은 변경 1명·동일 41명. 기존·새 이름 표시, 확정 후 명부 재조회. |
| 검증 후 같은 명부를 다른 요청으로 수정 | HTTP 409, 확정 버튼 제거. 파일을 다시 검증한 뒤 확정 가능. |
| 학교·학기 변경, 교사 로그인 | 이전 파일과 미리보기 폐기. 교사 메뉴에 관리자 도구가 표시되지 않고, 같은 교사 세션의 양식 요청은 HTTP 403. |
| 키보드·화면 크기 | 방향키로 관리 탭 선택. 1440px 라이트와 390px 다크에서 확인. 좁은 화면에서는 표 안에서 가로 스크롤. |

[데스크톱 신규 42명](desktop.webp) · [모바일 변경 1명](mobile.webp)

실제 이메일·패스키 로그인부터 시작하는 배포 환경 검수는 FE17·FE20 인계 항목이다.
