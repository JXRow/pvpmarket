const chartRanges = ['1H', '24H', '7D']
const chartWidth = 336
const chartTop = 24
const chartBottom = 164

function buildChartPoints(chartData) {
  const values = chartData?.points?.map((point) => point.close) ?? []

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || max || 1
  const xStep = chartWidth / (values.length - 1)

  return values.map((value, index) => {
    const x = xStep * index
    const y = chartBottom - ((value - min) / range) * (chartBottom - chartTop)

    return [x, y]
  })
}

function formatGridLabel(value) {
  if (!Number.isFinite(value)) {
    return '--'
  }

  if (value >= 1) {
    return `$${value.toFixed(2)}`
  }

  return `$${value.toFixed(4)}`
}

function buildGridLabels(chartData) {
  const values = chartData?.points?.map((point) => point.close) ?? []

  if (values.length < 2) {
    return ['$0.16', '$0.12', '$0.08', '$0.04']
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const step = (max - min) / 3

  return [max, max - step, max - step * 2, min].map(formatGridLabel)
}

export default function ChartPanel({ chartData, chartRange = '24H', onRangeChange }) {
  const isChartAvailable = chartData?.source === 'geckoterminal' && (chartData?.points?.length ?? 0) >= 2
  const chartPoints = isChartAvailable ? buildChartPoints(chartData) : []
  const gridLabels = isChartAvailable ? buildGridLabels(chartData) : []
  const path = chartPoints.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ')
  const areaPath = `${path} L ${chartWidth} ${chartBottom} L 0 ${chartBottom} Z`
  const activePoint = chartPoints.at(-1)

  return (
    <section className="card chart-card">
      <div className="chart-canvas">
        {isChartAvailable ? (
          <>
            <div className="chart-grid">
              {gridLabels.map((label, index) => (
                <span key={`${label}-${index}`}>{label}</span>
              ))}
            </div>
            <svg viewBox="0 0 336 180" role="img" aria-label="Price chart">
              <defs>
                <linearGradient id="chartLine" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#ff4b89" />
                  <stop offset="100%" stopColor="#64df6e" />
                </linearGradient>
                <linearGradient id="chartArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#ff4b89" stopOpacity="0.24" />
                  <stop offset="100%" stopColor="#ff4b89" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path className="chart-area" d={areaPath} />
              <path className="chart-line" d={path} />
              <circle className="chart-active-glow" cx={activePoint[0]} cy={activePoint[1]} r="13" />
              <circle className="chart-active-point" cx={activePoint[0]} cy={activePoint[1]} r="4.5" />
            </svg>
          </>
        ) : (
          <div className="chart-unavailable">Chart data unavailable</div>
        )}
      </div>
      {isChartAvailable ? (
        <div className="chart-tabs">
          {chartRanges.map((range) => (
            <button
              className={chartRange === range ? 'active' : ''}
              key={range}
              onClick={() => onRangeChange?.(range)}
            >
              {range}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}
