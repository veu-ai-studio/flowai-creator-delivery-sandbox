import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { initSentryBrowser, Sentry } from '@/lib/observability/sentry-browser'

initSentryBrowser();

const Root = Sentry.ErrorBoundary
  ? ({ children }) => (
      <Sentry.ErrorBoundary fallback={<div role="alert" style={{ padding: 16 }}>Something went wrong.</div>}>
        {children}
      </Sentry.ErrorBoundary>
    )
  : ({ children }) => children;

ReactDOM.createRoot(document.getElementById('root')).render(
  <Root>
    <App />
  </Root>
)
