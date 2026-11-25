import './index.css'

// Keep protected queries and session bootstrap out of the public guide.
if (['/guide', '/guide/'].includes(window.location.pathname)) {
  void import('./pages/guide/main.jsx')
} else if (['/school42', '/school42/'].includes(window.location.pathname)) {
  void import('./pages/school42/main.jsx')
} else {
  void import('./main.jsx')
}
