import { useLayoutEffect, useRef, useSyncExternalStore } from 'react'
import ServiceFooter from '@/components/layout/ServiceFooter'
import { Icon } from '@/pages/home/HomePanels'
import guideChick from '@/assets/mascots/포인터를 든 노란 병아리-2.webp?no-inline'
import { guideHash, guideLocation, type GuideRole } from './guideSteps'
import './guide.css'

const roles: Record<GuideRole, string> = { teacher: '교사', admin: '관리자' }
const screenshots = import.meta.glob<string>('./examples/*.webp', {
  eager: true,
  import: 'default',
  query: '?url&no-inline',
})

function subscribeToHash(update: () => void) {
  window.addEventListener('hashchange', update)
  return () => window.removeEventListener('hashchange', update)
}

export default function GuidePage() {
  const hash = useSyncExternalStore(subscribeToHash, () => window.location.hash)
  const { role, steps, index, step } = guideLocation(hash)
  const stepTitle = useRef<HTMLHeadingElement>(null)
  const previousHash = useRef(hash)
  const enlarged = useRef<HTMLDialogElement>(null)
  const picture = screenshots['./examples/' + step.id + '.webp']

  useLayoutEffect(() => {
    document.title = step.title + ' · ' + roles[role] + ' 사용 가이드 · 우리학교시간표'
    if (hash !== previousHash.current) {
      previousHash.current = hash
      stepTitle.current?.focus({ preventScroll: true })
      stepTitle.current?.scrollIntoView({ block: 'nearest' })
    }
  }, [hash, role, step.title])

  return (
    <div className="guide-page">
      <header className="guide-bar">
        <div className="guide-bar-inner">
          <a className="guide-brand" href="/" aria-label="우리학교시간표 홈">
            <span>
              <Icon name="brand" />
            </span>{' '}
            우리학교시간표
          </a>
          <a className="guide-home" href="/">
            서비스로 돌아가기 <Icon name="arrow" />
          </a>
        </div>
      </header>
      <main className="guide-body">
        <header className="guide-intro">
          <div>
            <h1>어떻게 사용하나요?</h1>
            <p>내 역할을 고르고 가상 학교의 실제 화면을 따라가 보세요.</p>
          </div>
          <img src={guideChick} alt="" width="108" height="108" />
        </header>
        <div className="guide-columns">
          <nav className="guide-contents" aria-label="역할별 가이드 목차">
            <h2>사용 가이드</h2>
            <div className="guide-roles" role="group" aria-label="안내할 역할">
              {(['teacher', 'admin'] as const).map((item) => (
                <a
                  key={item}
                  href={guideHash(item)}
                  aria-current={item === role ? 'true' : undefined}
                >
                  <Icon name={item === 'teacher' ? 'person' : 'school'} /> {roles[item]}
                </a>
              ))}
            </div>
            <ol className="guide-list">
              {steps.map((item, i) => (
                <li key={item.id}>
                  <a href={guideHash(role, item)} aria-current={i === index ? 'step' : undefined}>
                    <span aria-hidden="true">{String(i + 1).padStart(2, '0')}</span> {item.title}
                  </a>
                </li>
              ))}
            </ol>
            <label className="guide-picker">
              단계 선택
              <select
                value={step.id}
                onChange={(e) => {
                  window.location.hash = role + '/' + e.target.value
                }}
              >
                {steps.map((item, i) => (
                  <option key={item.id} value={item.id}>
                    {i + 1}. {item.title}
                  </option>
                ))}
              </select>
            </label>
          </nav>
          <article className="guide-article" aria-labelledby="guide-step-title">
            <header className="guide-progress">
              <span>{roles[role]} 가이드</span>
              <span>
                전체 {steps.length}단계 중 <strong>{index + 1}단계</strong>
              </span>
              <progress aria-label="가이드 진행" max={steps.length} value={index + 1} />
            </header>
            <div className="guide-step" key={role + '/' + step.id}>
              <h2 id="guide-step-title" ref={stepTitle} tabIndex={-1}>
                {step.title}
              </h2>
              <p className="guide-action">{step.action}</p>
              <figure className="guide-example">
                <figcaption>
                  <span>
                    <Icon name="timetable" /> {step.location}
                  </span>
                  <button type="button" onClick={() => enlarged.current?.showModal()}>
                    화면 확대
                  </button>
                </figcaption>
                <img src={picture} alt={step.alt} />
              </figure>
              <p className="guide-result">
                <strong>확인할 결과</strong>
                {step.result}
              </p>
              <dialog
                className="guide-zoom"
                ref={enlarged}
                aria-label={step.title + ' 예시 화면 확대'}
              >
                <header>
                  <strong>{step.title}</strong>
                  <button type="button" onClick={() => enlarged.current?.close()}>
                    닫기
                  </button>
                </header>
                <div tabIndex={0} role="region" aria-label="확대된 화면">
                  <img src={picture} alt={step.alt} />
                </div>
              </dialog>
            </div>
            <div className="guide-pager" role="group" aria-label="단계 이동">
              <button
                disabled={index === 0}
                onClick={() => {
                  window.location.hash = guideHash(role, steps[index - 1])
                }}
              >
                <Icon name="prev" /> 이전
              </button>
              {index < steps.length - 1 ? (
                <a href={guideHash(role, steps[index + 1])}>
                  다음 <Icon name="next" />
                </a>
              ) : (
                <a href="/">
                  서비스로 돌아가기 <Icon name="arrow" />
                </a>
              )}
            </div>
          </article>
        </div>
      </main>
      <ServiceFooter />
    </div>
  )
}
