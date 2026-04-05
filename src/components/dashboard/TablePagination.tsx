import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  pageSize: number;
}

const TablePagination = ({ currentPage, totalPages, onPageChange, totalItems, pageSize }: TablePaginationProps) => {
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border/30">
      <p className="text-xs text-muted-foreground">
        {start}–{end} of {totalItems}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
          .reduce<(number | "ellipsis")[]>((acc, p, idx, arr) => {
            if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("ellipsis");
            acc.push(p);
            return acc;
          }, [])
          .map((item, idx) =>
            item === "ellipsis" ? (
              <span key={`e-${idx}`} className="px-1 text-xs text-muted-foreground">…</span>
            ) : (
              <Button
                key={item}
                variant={item === currentPage ? "default" : "ghost"}
                size="sm"
                className="h-8 w-8 p-0 text-xs"
                onClick={() => onPageChange(item as number)}
              >
                {item}
              </Button>
            )
          )}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default TablePagination;

export function usePagination<T>(items: T[], pageSize = 10) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  return {
    totalPages,
    totalItems: items.length,
    pageSize,
    getPage: (page: number) => items.slice((page - 1) * pageSize, page * pageSize),
  };
}
