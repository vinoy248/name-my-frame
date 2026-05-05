interface ModeToggleProps {
  mode: 'default' | 'subframe'
  onChange: (mode: 'default' | 'subframe') => void
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="mode-toggle">
      <button
        type="button"
        className={`mode-toggle__tab${mode === 'default' ? ' mode-toggle__tab--active' : ''}`}
        onClick={() => onChange('default')}
      >
        Default
      </button>
      <button
        type="button"
        className={`mode-toggle__tab${mode === 'subframe' ? ' mode-toggle__tab--active' : ''}`}
        onClick={() => onChange('subframe')}
      >
        Sub-frame
      </button>
    </div>
  )
}
