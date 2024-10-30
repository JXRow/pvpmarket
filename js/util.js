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


export function loading(ref, str) {
	let loadingStr = '-\\|/'
	let startTime = Date.now()
	let startStr = ref.value
	let i = 1
	console.log('ref:', ref)
	ref.value = str.replaceAll('*', loadingStr.charAt(0))
	
	let interval = setInterval(function() {
		if (Date.now() - startTime > 9000) {
			clearInterval(interval)
			ref.value = startStr
			return
		}
		let nowStr = ref.value
		let clear = true
		for (let c=0; c<loadingStr.length; c++) {
			let char = loadingStr.charAt(c)
			if (nowStr.indexOf(char) > -1) {
				clear = false
				break
			}
		}
		
		if (clear) {
			clearInterval(interval)
		} else {
			ref.value = str.replaceAll('*', loadingStr.charAt(i))
			console.log(ref.value, nowStr)
			i++
			if (i == loadingStr.length) {
				i = 0
			}
		}
	}, 100)
}