/** index.css 토큰을 가리킨다. 화면 렌더는 CSS var만 쓴다. */

export const SUBJECT_KEYS = ['rose', 'sky', 'violet', 'yellow', 'lime', 'cyan', 'sand', 'slate']

/** 라이트 hex (대비 스크립트·문서용). 렌더에는 쓰지 않는다. */
export const SUBJECT_HEX = {
  rose: { bg: '#fbe4e8', text: '#8f2a45', dot: '#e0607e' },
  sky: { bg: '#dff0fa', text: '#0b5278', dot: '#3a9bd0' },
  violet: { bg: '#ebe6f8', text: '#4a3590', dot: '#8a73d6' },
  yellow: { bg: '#f8f0cc', text: '#6b5400', dot: '#d9b32a' },
  lime: { bg: '#e8f3cf', text: '#4a6412', dot: '#8fb83a' },
  cyan: { bg: '#d6f1f2', text: '#0b5c63', dot: '#2fa4ad' },
  sand: { bg: '#f3e7da', text: '#6b4423', dot: '#c49563' },
  slate: { bg: '#e9ecf0', text: '#3b4654', dot: '#8794a5' },
}

export const SEMANTIC_HEX = {
  primary: { subtle: '#e8f7ee', border: '#9dd9b8', solid: '#27a859', text: '#18753c' },
  success: { subtle: '#e1f5ee', border: '#9fd9c4', solid: '#1d9e75', text: '#0f6e56' },
  warning: { subtle: '#faeeda', border: '#f0cf9c', solid: '#f09500', text: '#8a5300' },
  danger: { subtle: '#faece7', border: '#f0b9a5', solid: '#d85a30', text: '#a63a16' },
  info: { subtle: '#e6f1fb', border: '#a9cdee', solid: '#185fa5', text: '#0f4478' },
}

export const colors = {
  primary: 'var(--color-primary)',
  primarySubtle: 'var(--color-primary-subtle)',
  primaryBorder: 'var(--color-primary-border)',
  primarySolid: 'var(--color-primary-solid)',
  primaryText: 'var(--color-primary-text)',
  primaryLight: 'var(--color-primary-subtle)',
  primaryMuted: 'var(--color-primary-subtle)',
  primaryDark: 'var(--color-primary-600)',
  primaryButton: 'var(--color-primary-button)',
  onPrimary: 'var(--color-on-primary)',

  success: 'var(--color-success)',
  successSubtle: 'var(--color-success-subtle)',
  successBorder: 'var(--color-success-border)',
  successSolid: 'var(--color-success-solid)',
  successText: 'var(--color-success-text)',
  successLight: 'var(--color-success-subtle)',

  warning: 'var(--color-warning)',
  warningSubtle: 'var(--color-warning-subtle)',
  warningBorder: 'var(--color-warning-border)',
  warningSolid: 'var(--color-warning-solid)',
  warningText: 'var(--color-warning-text)',
  warningLight: 'var(--color-warning-subtle)',

  danger: 'var(--color-danger)',
  dangerSubtle: 'var(--color-danger-subtle)',
  dangerBorder: 'var(--color-danger-border)',
  dangerSolid: 'var(--color-danger-solid)',
  dangerText: 'var(--color-danger-text)',
  dangerLight: 'var(--color-danger-subtle)',

  info: 'var(--color-info)',
  infoSubtle: 'var(--color-info-subtle)',
  infoBorder: 'var(--color-info-border)',
  infoSolid: 'var(--color-info-solid)',
  infoText: 'var(--color-info-text)',
  infoLight: 'var(--color-info-subtle)',

  subject: Object.fromEntries(
    SUBJECT_KEYS.map((key) => [
      key,
      {
        bg: `var(--color-subject-${key}-bg)`,
        text: `var(--color-subject-${key}-text)`,
        dot: `var(--color-subject-${key}-dot)`,
      },
    ]),
  ),

  text: 'var(--color-text)',
  textSecondary: 'var(--color-text-secondary)',
  textMuted: 'var(--color-text-muted)',
  textSubtle: 'var(--color-text-subtle)',

  border: 'var(--color-border)',
  borderLight: 'var(--color-border-light)',
  borderInput: 'var(--color-border-input)',

  bg: 'var(--color-bg)',
  surface: 'var(--color-surface)',
  surfaceHover: 'var(--color-surface-hover)',
}
