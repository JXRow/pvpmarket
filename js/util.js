export function maxPrecision(num, len) {
	let n = toPrecision(num, len)
	return parseFloat(n).toString()
}

export function toPrecision(num, len) {
	let n = new Number(num).toPrecision(len)
	if (n.indexOf('0') == 0) {
		n = n.substr(0, n.length - 1)
	}
	return n
}

export function toDateStr(time) {
	let now = parseInt(Date.now() / 1000)
	if (now - time < 60) {
		return 'Recently'
	} else if (now - time < 60 * 60) {
		return parseInt((now - time) / 60) + ' min ago'
	} else if (now - time < 60 * 60 * 24) {
		return parseInt((now - time) / 60 / 60) + ' hrs ago'
	}
	return new Date(time * 1000).toLocaleDateString()
}