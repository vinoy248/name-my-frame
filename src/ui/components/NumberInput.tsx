interface NumberInputProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}

export function NumberInput({ value, onChange, disabled = false }: NumberInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseInt(e.target.value, 10)
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 9999) {
      onChange(parsed)
    }
  }

  return (
    <div className="number-input-group">
      <label htmlFor="base-number">Base number</label>
      <input
        id="base-number"
        type="number"
        min={1}
        max={9999}
        value={value || ''}
        onChange={handleChange}
        disabled={disabled}
        className="number-input"
      />
    </div>
  )
}
