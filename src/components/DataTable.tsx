// Simple DataTable component
import { useState } from 'react';
import { cn } from "@/lib/utils";


interface Column {
  accessorKey: string;
  header: string;
  cell?: (props: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  loading?: boolean;
  onRowClick?: (row: any) => void;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  } | null;
}

import { Button } from "@/components/ui/button";

export const DataTable = ({ columns, data, loading, onRowClick, pagination }: DataTableProps) => {

  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (accessorKey: string) => {
    if (sortBy === accessorKey) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(accessorKey);
      setSortDir('asc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortBy) return 0;
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="border rounded-lg">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              {columns.map((column, idx) => (
                <th 
                  key={column.accessorKey || (column as any).id || idx}
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground"
                  onClick={() => handleSort(column.accessorKey)}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-muted-foreground">
                  No data
                </td>
              </tr>
            ) : (
              sortedData.map((row) => (
                <tr 
                  key={row.id || row._id || Math.random()} 
                  className={cn(
                    "border-b transition-colors",
                    onRowClick ? "hover:bg-muted cursor-pointer" : "hover:bg-muted/50"
                  )}
                  onClick={() => onRowClick && onRowClick(row)}
                >

                  {columns.map((column, idx) => (
                    <td key={column.accessorKey || (column as any).id || idx} className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {column.cell ? (column.cell({ row }) || '—') : (row[column.accessorKey] || '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}

          </tbody>
        </table>
      </div>
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 bg-muted/50 border-t">
          <div className="text-sm text-muted-foreground">
            Page {pagination.currentPage} of {pagination.totalPages}
          </div>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

