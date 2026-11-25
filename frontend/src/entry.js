import './index.css'

// Keep protected queries and session bootstrap out of the public guide.
if (['/guide', '/guide/'].includes(window.location.pathname)) {
  void import('./pages/guide/main.jsx')
} else {
  void import('./main.jsx')
}
