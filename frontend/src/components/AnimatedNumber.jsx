import { useEffect, useState } from 'react'
import { motion, useSpring, useTransform, animate } from 'framer-motion'

export default function AnimatedNumber({ value, prefix = '₹', suffix = '', decimals = 0 }) {
  const [displayValue, setDisplayValue] = useState(value)

  useEffect(() => {
    const controls = animate(displayValue, value, {
      duration: 0.5,
      ease: [0.32, 0, 0.67, 0],
      onUpdate: (latest) => setDisplayValue(latest),
    })
    return () => controls.stop()
  }, [value])

  return (
    <motion.span 
      key={value}
      initial={{ filter: 'blur(2px)', opacity: 0.7 }}
      animate={{ filter: 'blur(0px)', opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {prefix}{displayValue.toLocaleString('en-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}{suffix}
    </motion.span>
  )
}
