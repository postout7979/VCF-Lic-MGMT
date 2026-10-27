interface Props {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const BLOCK_SIZE = 10;

function Pagination({ currentPage, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  const blockStart = Math.floor((currentPage - 1) / BLOCK_SIZE) * BLOCK_SIZE + 1;
  const blockEnd = Math.min(blockStart + BLOCK_SIZE - 1, totalPages);
  const pages = Array.from({ length: blockEnd - blockStart + 1 }, (_, i) => blockStart + i);

  return (
    <div className="pagination">
      <button onClick={() => onPageChange(1)} disabled={currentPage === 1} title="첫 페이지">
        «
      </button>
      <button
        onClick={() => onPageChange(Math.max(1, blockStart - BLOCK_SIZE))}
        disabled={blockStart === 1}
        title="이전 10페이지"
      >
        ‹
      </button>
      {pages.map((page) => (
        <button
          key={page}
          className={page === currentPage ? "active" : ""}
          onClick={() => onPageChange(page)}
        >
          {page}
        </button>
      ))}
      <button
        onClick={() => onPageChange(Math.min(totalPages, blockStart + BLOCK_SIZE))}
        disabled={blockEnd === totalPages}
        title="다음 10페이지"
      >
        ›
      </button>
      <button
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        title="끝 페이지"
      >
        »
      </button>
    </div>
  );
}

export default Pagination;
