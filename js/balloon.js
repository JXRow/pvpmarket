import { createApp, ref } from 'vue'
import * as viem from 'viem'

let jumpURL = ''
			
const balloon = createApp({
	setup() {
		const show = ref(false)
		const content = ref('This is content')
		
		function onClick() {
			console.log('jumpURL:', jumpURL)
			if (jumpURL != '') {
				window.open(jumpURL, '_blank')
			}
		}
		
		return {
			show, content, onClick
		}
	}
}).mount('#balloon-tip')


export function show(content, url) {
	balloon.content = content
	balloon.show = true
	jumpURL = url
	
	setTimeout(function() {
		balloon.content = ''
		balloon.show = false
		jumpURL = ''
	}, 5000)
}