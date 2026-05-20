export function formatNumber(value) {
  return Number(value).toLocaleString('en-US', { maximumFractionDigits: 6 })
}

export function formatUsd(value) {
  if (value === undefined || value === null || value === '' || Number.isNaN(Number(value))) {
    return '---'
  }

  return `$${Number(value).toLocaleString('en-US', { maximumFractionDigits: 6 })}`
}

export function formatCompactUsd(value) {
  if (value === undefined || value === null || value === '' || Number.isNaN(Number(value))) {
    return '---'
  }

  return `$${Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(Number(value))}`
}

export function formatPercent(value) {
  if (value === undefined || value === null || value === '' || Number.isNaN(Number(value))) {
    return '---'
  }

  const numericValue = Number(value)
  return `${numericValue > 0 ? '+' : ''}${numericValue.toFixed(2)}%`
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}
