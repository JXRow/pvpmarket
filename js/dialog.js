import { createApp, ref } from 'vue'
import * as viem from 'viem'
			
const dialog = createApp({
	setup() {
		const title = ref('ATTENTION')
		const content = ref('This is content')
		const hasConfirm = ref(true)
		
		function onConfirm() {
			
		}
		
		return {
			title, content, hasConfirm, onConfirm
		}
	}
}).mount('#dialog-rounded')


export function showError(content) {
	dialog.title = 'ERROR:'
	dialog.content = content
	dialog.hasConfirm = false
	document.getElementById('dialog-rounded').showModal();
}


export function showTip(content) {
	dialog.title = 'TIP:'
	dialog.content = content
	dialog.hasConfirm = false
	document.getElementById('dialog-rounded').showModal();
}


export function showDialog(content, onConfirm) {
	dialog.title = 'ATTENTION:'
	dialog.content = content
	dialog.hasConfirm = true
	dialog.onConfirm = onConfirm
	document.getElementById('dialog-rounded').showModal();
}