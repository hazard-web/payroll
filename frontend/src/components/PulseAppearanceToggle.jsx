import { MoonOutlined, SunOutlined } from '@ant-design/icons'
import { Button, Tooltip } from 'antd'
import { useTheme } from '../context/ThemeContext'

export default function PulseAppearanceToggle({ variant = 'icon' }) {
  const { theme, setTheme } = useTheme()
  const dark = theme === 'dark'
  const label = dark ? 'Switch to light mode' : 'Switch to dark mode'
  const icon = dark ? <SunOutlined /> : <MoonOutlined />
  const toggle = () => setTheme(dark ? 'light' : 'dark')

  if (variant === 'rail') {
    return (
      <button
        type="button"
        aria-label={label}
        aria-pressed={dark}
        className={dark ? 'is-on' : undefined}
        onClick={toggle}
      >
        {icon}
      </button>
    )
  }

  if (variant === 'ribbon') {
    return (
      <button
        type="button"
        className={`pulse-ribbon-btn${dark ? ' is-on' : ''}`}
        aria-label={label}
        aria-pressed={dark}
        onClick={toggle}
      >
        {icon}
      </button>
    )
  }

  return (
    <Tooltip title={label}>
      <Button type="text" icon={icon} aria-label={label} aria-pressed={dark} onClick={toggle} />
    </Tooltip>
  )
}
