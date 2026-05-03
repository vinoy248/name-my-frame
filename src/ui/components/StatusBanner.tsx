interface StatusBannerProps {
  type: 'success' | 'error' | null
  message: string
}

export function StatusBanner({ type, message }: StatusBannerProps) {
  if (type === null) return null

  return (
    <div role="status" className={`status-banner status-banner--${type}`}>
      {type === 'success' && <span className="status-banner__icon">✓</span>}
      <span>{message}</span>
    </div>
  )
}
