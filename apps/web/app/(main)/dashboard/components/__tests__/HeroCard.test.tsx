import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// Mock external dependencies
vi.mock('@repo/design-system/lib/utils', () => ({
  cn: (...classes: (string | undefined | null | false)[]) =>
    classes.filter(Boolean).join(' '),
}))

vi.mock('lucide-react', () => ({
  Pencil: () => null,
  Wallet: () => null,
}))

import { HeroCard } from '../HeroCard'

// Minimal props for rendering HeroCard with a StatItem that has a yield badge
const baseProps = {
  totalAsset: 10000000,
  totalInvested: 9000000,
  totalProfit: 1000000,
  totalYield: 11.11,
}

describe('HeroCard – StatItem yield badge sign', () => {
  it('shows "+" prefix in yield badge when yieldPercent is positive', () => {
    render(
      <HeroCard
        {...baseProps}
        totalProfit={1000000}
        totalYield={11.1}
      />,
    )

    // The yield badge for 누적손익 should show "+11.1%"
    expect(screen.getByText('+11.1%')).toBeInTheDocument()
  })

  it('shows negative value in yield badge when yieldPercent is negative', () => {
    render(
      <HeroCard
        {...baseProps}
        totalProfit={-500000}
        totalYield={-5.6}
      />,
    )

    // toFixed preserves the minus sign for negative numbers
    expect(screen.getByText('-5.6%')).toBeInTheDocument()
  })

  it('shows negative yield badge when amount is positive but yieldPercent is negative (the bug case)', () => {
    // The bug: code used `isPositive` (based on amount >= 0) for the yield sign,
    // so a positive amount with negative yield would show "+-5.0%" instead of "-5.0%"
    render(
      <HeroCard
        {...baseProps}
        totalProfit={100}       // positive amount → isPositive = true
        totalYield={-98.4}      // but yield is deeply negative
      />,
    )

    // Should show "-98.4%", NOT "+-98.4%"
    expect(screen.getByText('-98.4%')).toBeInTheDocument()
    expect(screen.queryByText('+-98.4%')).not.toBeInTheDocument()
  })

  it('shows positive yield badge when amount is negative but yieldPercent is positive', () => {
    // Opposite case: negative amount, positive yield
    render(
      <HeroCard
        {...baseProps}
        totalProfit={-100}    // negative amount
        totalYield={0.5}      // but yield is positive
      />,
    )

    // yield badge should show "+0.5%"
    expect(screen.getByText('+0.5%')).toBeInTheDocument()
  })

  it('yield badge has green (emerald) styling when yieldPercent >= 0', () => {
    const { container } = render(
      <HeroCard
        {...baseProps}
        totalProfit={500000}
        totalYield={5.0}
      />,
    )

    // Find the yield badge span
    const badge = container.querySelector('.bg-emerald-50.text-emerald-700')
    expect(badge).not.toBeNull()
    expect(badge?.textContent).toBe('+5.0%')
  })

  it('yield badge has red styling when yieldPercent < 0', () => {
    const { container } = render(
      <HeroCard
        {...baseProps}
        totalProfit={-500000}
        totalYield={-5.0}
      />,
    )

    // Find the yield badge span
    const badge = container.querySelector('.bg-red-50.text-red-700')
    expect(badge).not.toBeNull()
    expect(badge?.textContent).toBe('-5.0%')
  })

  it('yield badge shows "0.0%" with green styling when yieldPercent is exactly 0', () => {
    const { container } = render(
      <HeroCard
        {...baseProps}
        totalProfit={0}
        totalYield={0}
      />,
    )

    // 0% is non-negative → green styling
    const badge = container.querySelector('.bg-emerald-50.text-emerald-700')
    expect(badge).not.toBeNull()
    expect(badge?.textContent).toBe('+0.0%')
  })
})
