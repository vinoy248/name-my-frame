import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NumberInput } from '../../src/ui/components/NumberInput'

describe('NumberInput', () => {
  it('renders with given value', () => {
    render(<NumberInput value={31} onChange={vi.fn()} />)
    expect(screen.getByRole('spinbutton')).toHaveValue(31)
  })

  it('renders "Base number" label', () => {
    render(<NumberInput value={1} onChange={vi.fn()} />)
    expect(screen.getByText('Base number')).toBeInTheDocument()
  })

  it('calls onChange with parsed integer on valid input', () => {
    const onChange = vi.fn()
    render(<NumberInput value={1} onChange={onChange} />)
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '42' } })
    expect(onChange).toHaveBeenCalledWith(42)
  })

  it('is disabled when disabled prop is true', () => {
    render(<NumberInput value={1} onChange={vi.fn()} disabled />)
    expect(screen.getByRole('spinbutton')).toBeDisabled()
  })
})
