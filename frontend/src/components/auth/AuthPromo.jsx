import { useState } from 'react'
import {
  PasswordlessIllustration,
  TeamIllustration,
  PayrollIllustration,
} from './AuthIllustrations'
import { AuthLogoLoader, useAuthRedirect } from './AuthLogoLoader'

const SLIDES = [
  {
    title: 'Passwordless ready payroll',
    body: 'Sign in once and manage salaries, attendance, and compliance from a single People OS dashboard.',
    cta: 'Learn more',
    to: '/coming-soon',
    art: 'secure',
  },
  {
    title: 'Your team, self-served',
    body: 'Employees download payslips, apply for leave, and clock in without pinging HR.',
    cta: 'Open Team Portal',
    to: '/portal/login',
    art: 'team',
  },
  {
    title: 'People OS is live',
    body: 'Run payroll, attendance, and compliance from one dashboard, built for Indian teams.',
    cta: 'Learn more',
    to: '/people-os',
    art: 'people',
  },
]

const SLIDE_MS = 6500

function PromoArt({ kind }) {
  if (kind === 'team') return <TeamIllustration />
  if (kind === 'people') return <PayrollIllustration />
  return <PasswordlessIllustration />
}

export default function AuthPromo() {
  const [index, setIndex] = useState(0)
  const slide = SLIDES[index]
  const { redirecting, onRedirectClick } = useAuthRedirect()

  const goNext = () => setIndex((i) => (i + 1) % SLIDES.length)

  return (
    <div className="auth-promo">
      <AuthLogoLoader show={redirecting} />
      <div className="auth-promo-art" key={slide.art}>
        <PromoArt kind={slide.art} />
      </div>
      <p className="auth-promo-title">{slide.title}</p>
      <p className="auth-promo-body">{slide.body}</p>
      <a
        href={slide.to}
        className="auth-learn"
        onClick={onRedirectClick(slide.to, { replace: false })}
      >
        {slide.cta}
      </a>
      <div className="auth-dots">
        {SLIDES.map((item, i) => (
          <button
            key={item.title}
            type="button"
            aria-label={`Show slide ${i + 1}`}
            className={i === index ? 'is-on' : ''}
            onClick={() => setIndex(i)}
          >
            {i === index ? (
              <span
                key={index}
                className="auth-dot-fill"
                style={{ animationDuration: `${SLIDE_MS}ms` }}
                onAnimationEnd={goNext}
              />
            ) : null}
          </button>
        ))}
      </div>
    </div>
  )
}
