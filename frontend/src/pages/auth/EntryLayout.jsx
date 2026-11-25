import { Icon } from '@/pages/home/HomePanels'
import timetableChick from '@/assets/mascots/시간표를 정중히 건네는 노란 병아리-3.webp?no-inline'
import weeklyExample from '@/pages/guide/examples/week.webp?no-inline'
import validationExample from '@/pages/guide/examples/validate.webp?no-inline'
import './entry.css'

const previews = [
  {
    role: '교사 가이드',
    title: '내 시간표와 수업 교환',
    href: '/guide#teacher/week',
    image: weeklyExample,
  },
  {
    role: '관리자 가이드',
    title: '시수표 검증과 시간표 게시',
    href: '/guide#admin/validate',
    image: validationExample,
  },
]

export default function EntryLayout({ children }) {
  return (
    <>
      <header className="entry-header">
        <div className="entry-header-inner">
          <h1 className="entry-brand"><span><Icon name="brand" /></span>우리학교 시간표</h1>
          <a className="entry-guide-link" href="/guide">사용 가이드 <Icon name="arrow" /></a>
        </div>
      </header>
      <main className="entry-main">
        <div className="entry-columns">
          <section className="entry-auth" aria-label="계정 인증">{children}</section>
          <div className="entry-overview">
            <section className="entry-intro" aria-label="서비스 소개">
              <div>
                <h2>학교 시간표와<br />보결 관리</h2>
                <p>교사는 수업을 확인하고 교환을 요청할 수 있습니다. 관리자는 시간표를 편성하고 변경 요청을 승인할 수 있습니다.</p>
              </div>
              <img src={timetableChick} alt="" width="180" height="180" />
            </section>
            <section className="entry-guides" aria-labelledby="entry-guide-heading">
              <h2 id="entry-guide-heading">어떻게 사용하나요?</h2>
              <div className="entry-preview-list">
                {previews.map(({ role, title, href, image }) => (
                  <a key={href} href={href} className="entry-preview">
                    <div className="entry-preview-image" aria-hidden="true">
                      <img src={image} alt="" loading="lazy" />
                    </div>
                    <div className="entry-preview-text">
                      <span>{role}</span>
                      <strong>{title}</strong>
                    </div>
                    <Icon name="next" />
                  </a>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  )
}
