export interface PreviewItem {
  id: string
  newName: string
  originalName: string
}

interface PreviewListProps {
  items: PreviewItem[]
  dimmed?: boolean
}

export function PreviewList({ items, dimmed = false }: PreviewListProps) {
  if (items.length === 0) {
    return (
      <div className="preview-empty">
        <span>No frames selected</span>
      </div>
    )
  }

  return (
    <ul className={`preview-list${dimmed ? ' preview-list--dimmed' : ''}`}>
      {items.map(item => (
        <li key={item.id} className="preview-item">
          <span className="preview-item__new-name">{item.newName}</span>
          <span className="preview-item__original">{item.originalName}</span>
        </li>
      ))}
    </ul>
  )
}
