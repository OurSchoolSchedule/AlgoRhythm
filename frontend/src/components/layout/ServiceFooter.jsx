import './serviceFooter.css'

const footer = {
  copyright: '© Algorhythm',
  contacts: [
    { label: '서비스 문의', email: 'aaaalgorhthm@gmail.com' },
    { label: '개발자 연락처', email: null },
  ],
}

export default function ServiceFooter() {
  return (
    <footer className="service-footer">
      <small>{footer.copyright}</small>
      {footer.contacts
        .filter(({ email }) => email)
        .map(({ label, email }) => (
          <span className="service-footer-contact" key={label}>
            {label}
            <a href={`mailto:${email}`}>{email}</a>
          </span>
        ))}
    </footer>
  )
}
