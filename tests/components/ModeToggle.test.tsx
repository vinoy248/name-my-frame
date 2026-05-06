import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ModeToggle } from '../../src/ui/components/ModeToggle'

describe('ModeToggle', () => {
  it('renders Default and Sub-frame buttons', () => {
    render(<ModeToggle mode="default" onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Default' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sub-frame' })).toBeInTheDocument()
  })

  it('default mode — Default button has active class', () => {
    render(<ModeToggle mode="default" onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Default' })).toHaveClass('mode-toggle__tab--active')
  })

  it('default mode — Sub-frame button does not have active class', () => {
    render(<ModeToggle mode="default" onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Sub-frame' })).not.toHaveClass('mode-toggle__tab--active')
  })

  it('subframe mode — Sub-frame button has active class', () => {
    render(<ModeToggle mode="subframe" onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Sub-frame' })).toHaveClass('mode-toggle__tab--active')
  })

  it('subframe mode — Default button does not have active class', () => {
    render(<ModeToggle mode="subframe" onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Default' })).not.toHaveClass('mode-toggle__tab--active')
  })

  it('clicking Sub-frame calls onChange with "subframe"', async () => {
    const onChange = vi.fn()
    render(<ModeToggle mode="default" onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Sub-frame' }))
    expect(onChange).toHaveBeenCalledWith('subframe')
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('clicking Default calls onChange with "default"', async () => {
    const onChange = vi.fn()
    render(<ModeToggle mode="subframe" onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Default' }))
    expect(onChange).toHaveBeenCalledWith('default')
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('both buttons have type="button" to prevent form submission', () => {
    render(<ModeToggle mode="default" onChange={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    buttons.forEach(btn => expect(btn).toHaveAttribute('type', 'button'))
  })
})
