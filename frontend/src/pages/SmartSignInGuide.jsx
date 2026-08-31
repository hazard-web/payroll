import { useEffect, useState } from 'react'
import Lottie from 'lottie-react'

export default function SmartSignInGuide() {
  const [animationData, setAnimationData] = useState(null)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduceMotion(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    let alive = true
    fetch('/smart-signin-guide.json')
      .then((r) => r.json())
      .then((data) => {
        if (alive) setAnimationData(data)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="ssi-reel" aria-hidden="true">
      {animationData ? (
        <Lottie
          className="ssi-lottie"
          animationData={animationData}
          loop={!reduceMotion}
          autoplay={!reduceMotion}
          rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }}
        />
      ) : (
        <div className="ssi-lottie-skeleton" />
      )}
    </div>
  )
}
