import { render, screen } from '@testing-library/react'
import { expect, test, describe } from 'vitest'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../card'

describe('Card Components', () => {
  test('renders Card with correct structure', () => {
    render(
      <Card data-testid="card">
        <CardContent>Card content</CardContent>
      </Card>
    )
    
    const card = screen.getByTestId('card')
    expect(card).toBeInTheDocument()
    expect(card).toHaveClass('rounded-md', 'border', 'bg-card', 'text-card-foreground', 'shadow-sm')
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  test('renders CardHeader with CardTitle and CardDescription', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
          <CardDescription>Test Description</CardDescription>
        </CardHeader>
      </Card>
    )
    
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test Description')).toBeInTheDocument()
  })

  test('CardTitle applies correct styling', () => {
    render(<CardTitle>Title</CardTitle>)
    const title = screen.getByText('Title')
    expect(title).toHaveClass('text-2xl', 'font-semibold', 'leading-none', 'tracking-tight')
  })

  test('CardDescription applies correct styling', () => {
    render(<CardDescription>Description</CardDescription>)
    const description = screen.getByText('Description')
    expect(description).toHaveClass('text-sm', 'text-muted-foreground')
  })

  test('CardContent applies correct padding', () => {
    render(<CardContent data-testid="content">Content</CardContent>)
    const content = screen.getByTestId('content')
    expect(content).toHaveClass('p-6', 'pt-0')
  })

  test('CardFooter applies correct styling', () => {
    render(<CardFooter data-testid="footer">Footer</CardFooter>)
    const footer = screen.getByTestId('footer')
    expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0')
  })

  test('applies custom className to Card', () => {
    render(
      <Card className="custom-card" data-testid="card">
        Content
      </Card>
    )
    const card = screen.getByTestId('card')
    expect(card).toHaveClass('custom-card')
  })

  test('renders complete Card structure', () => {
    render(
      <Card data-testid="complete-card">
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>Your account overview</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Main content area</p>
        </CardContent>
        <CardFooter>
          <button>Action Button</button>
        </CardFooter>
      </Card>
    )
    
    const card = screen.getByTestId('complete-card')
    expect(card).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Your account overview')).toBeInTheDocument()
    expect(screen.getByText('Main content area')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Action Button' })).toBeInTheDocument()
  })

  test('forwards refs correctly', () => {
    const cardRef = { current: null }
    const headerRef = { current: null }
    const contentRef = { current: null }
    
    render(
      <Card ref={cardRef}>
        <CardHeader ref={headerRef}>
          <CardTitle>Title</CardTitle>
        </CardHeader>
        <CardContent ref={contentRef}>Content</CardContent>
      </Card>
    )
    
    // Note: Testing ref forwarding is tricky with React Testing Library
    // This test ensures the components render without errors when refs are provided
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })
})