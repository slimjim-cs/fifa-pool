'use client'

interface Props {
  page: number
  total: number
  limit: number
  onPageChange: (page: number) => void
}

export default function Pagination({ page, total, limit, onPageChange }: Props) {
  const totalPages = Math.ceil(total / limit)
  if (totalPages <= 1) return null

  return (
    <div className="pagination">
      <button
        className="page-btn"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        ← Prev
      </button>
      <span className="page-info">
        Page {page} of {totalPages}
      </span>
      <button
        className="page-btn"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next →
      </button>
    </div>
  )
}
