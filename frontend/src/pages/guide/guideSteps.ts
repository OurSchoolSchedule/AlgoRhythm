export type GuideRole = 'teacher' | 'admin'

export interface GuideStep {
  id: string
  title: string
  location: string
  action: string
  result: string
  alt: string
}

const day: GuideStep = {
  id: 'day',
  title: '날짜별 실제 수업',
  location: '업무 홈 › 날짜별 실제 수업',
  action: '주간표 아래의 수업 날짜를 바꾸고 해당 교시의 담당 교사를 확인하세요.',
  result: '그날의 실제 담당자가 표시되고, 원래 담당자와 다르면 ‘담당 변경’이 붙습니다.',
  alt: '실제 수업 목록에서 과목과 학급 옆에 변경된 담당 교사가 표시된 예시',
}
const office: GuideStep[] = [
  {
    id: 'todos',
    title: '오늘의 할 일',
    location: '할 일',
    action: '할 일에서 오늘 처리할 업무를 확인하고 완료한 항목에 체크하세요.',
    result: '완료한 항목에 표시가 생겨 남은 업무와 구분할 수 있습니다.',
    alt: '오늘의 업무에 완료 표시와 남은 항목이 보이는 할 일 목록',
  },
  {
    id: 'notices',
    title: '알림 확인',
    location: '업무 홈 › 최근 알림',
    action: '최근 알림의 ‘전체 보기’를 열어 확인할 알림을 선택하세요.',
    result: '보결이나 승인처럼 학교에서 도착한 알림의 내용을 읽을 수 있습니다.',
    alt: '학교 업무와 관련된 알림을 확인하는 화면',
  },
  {
    id: 'history',
    title: '요청 내역 조회',
    location: '요청 내역',
    action: '조회할 달과 상태를 고른 뒤 확인할 요청을 펼쳐 보세요.',
    result: '조건에 맞는 요청의 처리 상태와 세부 내용을 확인할 수 있습니다.',
    alt: '조회 기간과 상태를 선택하는 요청 내역 화면',
  },
  {
    id: 'profile',
    title: '프로필과 학교 확인',
    location: '업무 홈 › 내 프로필',
    action: '내 프로필에서 소속 정보를 확인하고 ‘프로필·학교 관리’를 여세요.',
    result: '학교에 등록된 정보를 확인하고 연결된 학교를 관리할 수 있습니다.',
    alt: '담당 과목, 담임 학급, 프로필·학교 관리 버튼이 있는 예시 프로필',
  },
  {
    id: 'assistant',
    title: 'AI 도우미 사용',
    location: '업무 화면 › AI 도우미',
    action: 'AI 도우미에서 보결 또는 근무 불가 명령을 입력하고 미리보기를 확인하세요.',
    result: '명령이 어떻게 해석됐는지 살펴본 뒤 실행 여부를 결정할 수 있습니다.',
    alt: 'AI 도우미의 예시 명령과 텍스트·음성 입력란',
  },
]

export const guideSteps: Record<GuideRole, GuideStep[]> = {
  teacher: [
    {
      id: 'week',
      title: '내 시간표 확인',
      location: '업무 홈 › 이번 주 시간표',
      action: '이번 주 시간표에서 확인하고 싶은 요일과 교시의 수업을 선택하세요.',
      result: '선택한 칸의 과목과 학급을 확인할 수 있고, 오늘 열은 계속 강조됩니다.',
      alt: '가상 학교 교사의 주간 시간표에 표시된 과목과 오늘 열',
    },
    {
      id: 'homeroom',
      title: '담임 학급으로 전환',
      location: '업무 홈 › 이번 주 시간표',
      action: '학교에 담임 학급이 등록돼 있으면 ‘내 시간표’ 옆의 담임 학급을 선택하세요.',
      result: '같은 주의 시간표가 담당 학급 기준으로 바뀝니다.',
      alt: '담임 학급이 등록된 교사의 내 시간표와 담임 학급 선택 항목',
    },
    day,
    {
      id: 'lesson-detail',
      title: '주간표에서 수업 상세 열기',
      location: '시간표 › 수업 상세',
      action: '시간표 메뉴에서 조회할 주를 고르고 수업이 있는 칸을 여세요.',
      result: '과목과 담당 교사를 확인한 뒤 ‘공개 보결 모집’이나 ‘날짜 수업 변경’으로 이어갈 수 있습니다.',
      alt: '교사가 시간표의 수업을 선택해 연 수업 상세 대화상자',
    },
    {
      id: 'request',
      title: '수업 교환 신청',
      location: '보결·교환 업무 › 수업 교환 신청',
      action: '내 수업과 교환할 상대 수업의 날짜·교시를 골라 ‘교환 신청’을 누르세요.',
      result: '신청 번호가 발급되고 지정 교사가 응답할 수 있습니다.',
      alt: '내가 담당하는 수업과 교환할 상대 수업을 선택하는 신청 양식',
    },
    {
      id: 'response',
      title: '교환·보결 요청에 응답',
      location: '보결·교환 업무 › 변경 신청 목록',
      action: '본인이 지정된 요청에서 수업 내용을 확인한 뒤 수락 또는 거절을 선택하세요.',
      result: '수락한 요청은 관리자 승인 대기로 바뀌고 거절한 요청은 종료됩니다.',
      alt: '지정 교사가 신청의 수락 또는 거절을 선택하는 목록',
    },
    {
      id: 'preferences',
      title: '근무 불가 시간 제출',
      location: '내 프로필 › 시간대 선호도 제출',
      action: '시간대 선호도에서 근무할 수 없는 요일과 교시를 선택해 저장하세요.',
      result: '선택한 시간이 내 근무 불가 시간으로 등록됩니다.',
      alt: '요일과 교시별로 근무 불가 시간을 선택하는 표',
    },
    ...office,
  ],
  admin: [
    {
      id: 'validate',
      title: '시수표 검증',
      location: '시간표 생성 › 시수표 검증',
      action: '대상 학기를 확인한 뒤 시수표 엑셀 파일을 선택하고 ‘시수표 검증’을 누르세요.',
      result: '검증 결과에서 배정 건수를 확인하거나 오류가 표시된 셀을 찾아 수정할 수 있습니다.',
      alt: '엑셀 시수표 파일을 선택하고 검증 결과를 확인하는 화면',
    },
    {
      id: 'candidates',
      title: '후보 생성과 비교',
      location: '시간표 생성 › 후보 비교 및 게시',
      action:
        '검증을 통과하면 ‘후보 생성’을 누르고 준비된 후보의 희망·기피 시간 지표를 비교하세요.',
      result: '생성된 후보 중 하나를 선택해 학급별 주간 배치를 살펴볼 수 있습니다.',
      alt: '후보별 주당 차시와 희망 시간 충족, 기피 시간 회피 지표',
    },
    {
      id: 'publish',
      title: '시간표 게시',
      location: '시간표 생성 › 후보 비교 및 게시',
      action: '선택한 후보의 학급별 배치를 확인한 뒤 게시 적용일을 입력하고 게시를 확정하세요.',
      result: '게시 결과를 확인할 수 있고, 버전이 충돌하면 최신 상태에서 후보를 다시 선택합니다.',
      alt: '선택한 시간표 후보를 게시하기 위한 적용일과 확정 버튼',
    },
    {
      id: 'school-week',
      title: '학교 시간표 조회',
      location: '시간표',
      action: '시간표에서 조회할 주로 이동한 뒤 수업이 있는 칸을 선택하세요.',
      result: '해당 교시에 배정된 학급과 담당 교사를 확인할 수 있습니다.',
      alt: '학교 시간표의 요일·교시별 수업 배치',
    },
    day,
    {
      id: 'substitute',
      title: '보결 교사 지정',
      location: '보결·교환 업무 › 지정 교사 보결 신청',
      action: '보결할 날짜 수업과 지정 교사를 선택하고 ‘보결 신청’을 누르세요.',
      result: '선택한 교사가 수락하거나 거절할 수 있는 보결 요청이 접수됩니다.',
      alt: '보결할 수업과 지정 교사를 고르는 관리자 신청 양식',
    },
    {
      id: 'approve',
      title: '보결·교환 승인',
      location: '보결·교환 업무 › 변경 신청 목록',
      action: '‘수락 · 승인 대기’인 요청의 수업과 지정 교사를 확인하고 ‘승인 확정’을 누르세요.',
      result: '승인이 완료되면 해당 날짜 수업에 변경 내용이 반영됩니다.',
      alt: '수락된 변경 신청에 승인 확정 버튼이 표시된 관리자 화면',
    },
    {
      id: 'subjects',
      title: '과목 등록',
      location: '과목·수업 관리',
      action: '과목 이름을 입력해 등록하거나 ‘CSV 올리기’로 여러 과목을 등록하세요.',
      result: '등록된 과목 목록에서 추가한 이름을 확인할 수 있습니다.',
      alt: '과목 등록 입력란, CSV 올리기 버튼과 등록된 과목 목록',
    },
    {
      id: 'admin',
      title: '교사·학급·학교 설정',
      location: '관리자 도구',
      action: '관리자 도구에서 교사, 학급, 불가, 설정 중 확인할 탭을 선택하세요.',
      result: '선택한 탭에서 학교 명부와 학급, 근무 불가 시간 또는 학교 설정을 확인할 수 있습니다.',
      alt: '교사, 학급, 불가, 설정 탭과 가상 학교의 교사 명부',
    },
    ...office,
  ],
}

export function guideLocation(hash: string) {
  const [roleName, id] = hash.slice(1).split('/')
  const role: GuideRole = roleName === 'admin' ? 'admin' : 'teacher'
  const steps = guideSteps[role]
  const index =
    roleName === role
      ? Math.max(
          0,
          steps.findIndex((step) => step.id === id),
        )
      : 0
  return { role, steps, index, step: steps[index] }
}

export function guideHash(role: GuideRole, step = guideSteps[role][0]) {
  return '#' + role + '/' + step.id
}
