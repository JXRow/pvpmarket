export function formatNumber(value) {
  if (value === undefined || value === null || value === '' || Number.isNaN(Number(value))) {
    return '---'
  }
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

export function cleanNumberInput(value, maxDecimals) {
  let cleaned = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
  if (typeof maxDecimals === 'number' && maxDecimals >= 0) {
    const dotIndex = cleaned.indexOf('.')
    if (dotIndex !== -1) {
      cleaned = cleaned.slice(0, dotIndex + maxDecimals + 1)
    }
  }
  return cleaned
}

export function formatInputDisplay(raw) {
  if (!raw) return ''
  if (raw === '.') return '.'

  // Ends with a decimal point
  if (raw.endsWith('.')) {
    const integerPart = raw.slice(0, -1)
    const num = Number(integerPart)
    if (Number.isNaN(num)) return raw
    return num.toLocaleString('en-US') + '.'
  }

  // Contains a decimal point — preserve exact fractional digits
  const dotIndex = raw.indexOf('.')
  if (dotIndex !== -1) {
    const integerPart = raw.slice(0, dotIndex)
    const fractionalPart = raw.slice(dotIndex + 1)
    const num = Number(integerPart)
    if (Number.isNaN(num)) return raw
    return num.toLocaleString('en-US') + '.' + fractionalPart
  }

  // No decimal point — normal formatting
  const num = Number(raw)
  if (Number.isNaN(num)) return raw
  return num.toLocaleString('en-US', { maximumFractionDigits: 6 })
}
