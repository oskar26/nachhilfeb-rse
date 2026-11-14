import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { domMax, LazyMotion, MotionConfig } from 'motion/react'
import '@fontsource-variable/plus-jakarta-sans'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { APP_TRANSITION } from './lib/motion'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <MotionConfig reducedMotion="user" transition={APP_TRANSITION}>
        <LazyMotion features={domMax}>
          <App />
        </LazyMotion>
      </MotionConfig>
    </ErrorBoundary>
  </StrictMode>,
)
