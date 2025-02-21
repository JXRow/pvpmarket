export function maxPrecision(num, len) {
	if (isNaN(num) || num == '') return num
	
	let n = toPrecision(num, len)
	return parseFloat(n).toString()
}


export function toPrecision(num, len) {
	if (isNaN(num) || num == '') return num
	
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


let refToInfo = new Map()
const loadingStr = '-\\|/'
export function loading(ref, startStr) {
	let info = refToInfo.get(ref)
	if (info) {
		// console.log('refToInfo:', refToInfo)
		// console.log('ref:', ref)
		// console.log('info:', info)
		info.startTime = Date.now()
		info.startStr = startStr
		// console.log('loading 1 startTime', info.startTime, startStr, ref.value)
		return
	}
	
	info = {
		startTime: Date.now(),
		startStr,
		nowStr: startStr.replaceAll('*', loadingStr.charAt(0)),
		i: 1
	}
	// console.log('loading 0 startTime', info.startTime, startStr)
	refToInfo.set(ref, info)
	ref.value = info.nowStr
	
	let interval = setInterval(function() {
		if (info.nowStr != ref.value) {
			// console.log('loading clear startTime', info.startTime, startStr, info.nowStr, ref.value)
			clearInterval(interval)
			refToInfo.delete(ref)
			return
		}
		
		if (Date.now() - info.startTime > 10000) {
			// console.log('loading loop startTime', info.startTime, startStr)
			clearInterval(interval)
			info.nowStr = info.startStr.replaceAll('*', '').trim()
			ref.value = info.nowStr
			refToInfo.delete(ref)
			return
		}
		
		info.nowStr = info.startStr.replaceAll('*', loadingStr.charAt(info.i))
		ref.value = info.nowStr
		// console.log(info.nowStr)
		info.i++
		if (info.i == loadingStr.length) {
			info.i = 0
		}
	}, 100)
}