export default function CalloutNotice({ notice, onHide }) {
  if (!notice) {
    return null
  }

  return (
    <aside className={`callout-notice ${notice.closing ? 'closing' : ''} ${notice.instant ? 'instant' : 'open'}`}>
      <div className="callout-content">{notice.content}</div>
      {notice.showHide && (
        <button className="callout-hide-btn" onClick={onHide}>Hide</button>
      )}
    </aside>
  )
}
