import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const poolAddress = process.argv[2] ?? '0x659bD0BC4167BA25c62E05656F78043E7eD4a9da'
const pool = poolAddress.toLowerCase()
const cases = [
  ['monad', 'hour', 'aggregate=1&limit=12'],
  ['monad', 'day', 'aggregate=1&limit=12'],
  ['monad', 'minute', 'aggregate=5&limit=12'],
  [`https://api.dexscreener.com/latest/dex/pairs/monad/${pool}`],
  ['monad', 'hour', 'aggregate=2&limit=12'],
  ['monad', 'hour', 'limit=12'],
  ['monad', 'day', 'limit=12'],
  ['monad-testnet', 'hour', 'aggregate=2&limit=12'],
  ['monad_testnet', 'hour', 'aggregate=2&limit=12'],
]

async function request(url) {
  try {
    const { stdout } = await execFileAsync('curl', [
      '-L',
      '--max-time',
      '8',
      '-sS',
      '-w',
      '\\n__STATUS__:%{http_code}',
      '-H',
      'accept: application/json',
      '-H',
      'user-agent: Mozilla/5.0',
      url,
    ])
    const marker = '\n__STATUS__:'
    const markerIndex = stdout.lastIndexOf(marker)
    const body = markerIndex >= 0 ? stdout.slice(0, markerIndex) : stdout
    const statusLine = markerIndex >= 0 ? stdout.slice(markerIndex + marker.length) : '0'

    return {
      status: Number(statusLine),
      body,
    }
  } catch (error) {
    return {
      status: 'ERROR',
      body: error?.message ?? String(error),
    }
  }
}

for (const testCase of cases) {
  const url = testCase.length === 1
    ? testCase[0]
    : `https://api.geckoterminal.com/api/v2/networks/${testCase[0]}/pools/${pool}/ohlcv/${testCase[1]}?${testCase[2]}`
  const result = await request(url)
  const preview = String(result.body).replaceAll('\n', ' ').slice(0, 220)

  console.log(`${result.status} ${url}`)
  console.log(preview)

  if (result.status === 200) {
    console.log('\nFOUND_OK')
    process.exit(0)
  }
}

console.log('\nNO_OK')
