import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, describe, vi } from 'vitest'
import { Input } from '../input'

describe('Input Component', () => {
  test('renders input element', () => {
    render(<Input placeholder="Enter text" />)
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
  })

  test('handles value changes', async () => {
    const handleChange = vi.fn()
    const user = userEvent.setup()
    
    render(<Input onChange={handleChange} />)
    const input = screen.getByRole('textbox')
    
    await user.type(input, 'test')
    expect(handleChange).toHaveBeenCalledTimes(4) // Called for each character
  })

  test('applies disabled state correctly', () => {
    render(<Input disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  test('applies type attribute correctly', () => {
    render(<Input type="email" />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('type', 'email')
  })

  test('applies password type correctly', () => {
    render(<Input type="password" />)
    const input = screen.getByLabelText(/password/i) || screen.getByDisplayValue('')
    expect(input).toHaveAttribute('type', 'password')
  })

  test('forwards ref correctly', () => {
    const ref = vi.fn()
    render(<Input ref={ref} />)
    expect(ref).toHaveBeenCalled()
  })

  test('applies custom className', () => {
    render(<Input className="custom-input" />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('custom-input')
  })

  test('applies default input styling', () => {
    render(<Input />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('flex', 'h-9', 'w-full', 'rounded-md')
  })

  test('handles controlled input correctly', async () => {
    const handleChange = vi.fn()
    const user = userEvent.setup()
    
    render(<Input value="controlled" onChange={handleChange} />)
    const input = screen.getByRole('textbox') as HTMLInputElement
    
    expect(input.value).toBe('controlled')
    
    await user.clear(input)
    await user.type(input, 'new value')
    
    expect(handleChange).toHaveBeenCalled()
  })
})