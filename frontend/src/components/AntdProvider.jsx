import { ConfigProvider, App as AntApp } from 'antd'
import { useTheme } from '../context/ThemeContext'
import { darkTheme, lightTheme } from '../theme/antdTheme'
import '../theme/antd-app.css'

const MESSAGE_CFG = {
  duration: 3,
  maxCount: 2,
}

const NOTIFICATION_CFG = {
  placement: 'top',
  duration: 3,
  maxCount: 2,
  stack: { threshold: 2 },
}

export default function AntdProvider({ children }) {
  const { theme } = useTheme()
  return (
    <ConfigProvider theme={theme === 'dark' ? darkTheme : lightTheme}>
      <AntApp message={MESSAGE_CFG} notification={NOTIFICATION_CFG}>
        {children}
      </AntApp>
    </ConfigProvider>
  )
}
