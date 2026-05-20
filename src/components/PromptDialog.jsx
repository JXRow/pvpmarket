export default function PromptDialog({ dialog, isOpen, onClose, onExited }) {
  if (!dialog) {
    return null
  }

  function handleAnimationEnd(event) {
    if (!isOpen && event.target === event.currentTarget) {
      onExited()
    }
  }

  function handleButtonClick(button) {
    button.onClick?.()
    onClose()
  }

  const buttons = dialog.buttons?.length ? dialog.buttons : [{ text: 'OK' }]

  return (
    <div className={`dialog-overlay ${isOpen ? 'open' : 'closing'}`} onAnimationEnd={handleAnimationEnd}>
      <div className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="prompt-dialog-title">
        <h2 id="prompt-dialog-title">{dialog.title}</h2>
        <p>{dialog.content}</p>
        <div className="dialog-actions">
          {buttons.map((button) => (
            <button className="dialog-action-btn" key={button.text} onClick={() => handleButtonClick(button)}>
              {button.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
