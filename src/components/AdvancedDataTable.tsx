import React, { useState, useMemo } from 'react';

interface FilterConfig {
  type: 'text' | 'select' | 'date' | 'number' | 'boolean';
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
}

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any, index: number) => React.ReactNode;
  width?: string;
  sortable?: boolean;
  filterable?: boolean;
  filterConfig?: FilterConfig;
}

interface AdvancedDataTableProps {
  columns: Column[];
  data: any[];
  globalSearchTerm?: string;
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
  onDetail?: (row: any) => void;
  showActions?: boolean;
  emptyMessage?: string;
  showNumbering?: boolean;
  itemsPerPage?: number;
  title?: string;
  showExport?: boolean;
  onExport?: () => void;
}

type SortDirection = 'asc' | 'desc' | null;

const AdvancedDataTable: React.FC<AdvancedDataTableProps> = ({
  columns,
  data,
  globalSearchTerm = '',
  onEdit,
  onDelete,
  onDetail,
  showActions = true,
  emptyMessage = "Tidak ada data",
  showNumbering = true,
  itemsPerPage = 10,
  title,
  showExport = false,
  onExport
}) => {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);

  const handleSort = (columnKey: string) => {
    const column = columns.find(col => col.key === columnKey);
    if (column?.sortable === false) return;

    if (sortColumn === columnKey) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handleColumnFilter = (columnKey: string, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [columnKey]: value
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setColumnFilters({});
    setCurrentPage(1);
  };

  const getComparableValue = (value: any): string | number => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return value.toLowerCase();
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (typeof value === 'object') {
      const candidateKeys = ['name', 'descriptionname', 'locationname', 'categoryname', 'code', 'label'];
      for (const k of candidateKeys) {
        if (k in value && value[k] != null) {
          const v = value[k];
          return typeof v === 'number' ? v : String(v).toLowerCase();
        }
      }
      try {
        return JSON.stringify(value).toLowerCase();
      } catch {
        return String(value).toLowerCase();
      }
    }
    return String(value).toLowerCase();
  };

  const getFilterableValue = (row: any, columnKey: string): string => {
    const value = row[columnKey];
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
      const candidateKeys = ['name', 'descriptionname', 'locationname', 'categoryname', 'code', 'label'];
      for (const k of candidateKeys) {
        if (k in value && value[k] != null) {
          return String(value[k]).toLowerCase();
        }
      }
      return JSON.stringify(value).toLowerCase();
    }
    return String(value).toLowerCase();
  };

  const filteredData = useMemo(() => {
    let filtered = data;

    // Apply global search
    const globalTerm = globalSearchTerm.trim().toLowerCase();
    if (globalTerm) {
      filtered = filtered.filter((row, idx) => {
        const values: any[] = [];
        values.push(String(idx + 1)); // row number
        columns.forEach((col) => {
          if (col.label.toLowerCase() === 'aksi') return;
          const v = row[col.key];
          if (v === null || v === undefined) return;
          try {
            if (typeof v === 'object') {
              values.push(JSON.stringify(v));
            } else {
              values.push(String(v));
            }
          } catch {}
        });
        const haystack = values.join(' | ').toLowerCase();
        return haystack.includes(globalTerm);
      });
    }

    // Apply column filters
    Object.entries(columnFilters).forEach(([columnKey, filterValue]) => {
      if (!filterValue.trim()) return;
      const filterTerm = filterValue.toLowerCase();
      
      filtered = filtered.filter(row => {
        const cellValue = getFilterableValue(row, columnKey);
        return cellValue.includes(filterTerm);
      });
    });

    return filtered;
  }, [data, columns, globalSearchTerm, columnFilters]);

  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = getComparableValue(a[sortColumn]);
      const bValue = getComparableValue(b[sortColumn]);

      if (aValue === '' && bValue !== '') return 1;
      if (bValue === '' && aValue !== '') return -1;

      let comparison = 0;
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue), 'id');
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortColumn, sortDirection]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    try {
      return date.toLocaleDateString('id-ID', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
    } catch {
      return date.toLocaleDateString();
    }
  };

  const generateFilterOptions = (columnKey: string): Array<{ value: string; label: string }> => {
    const uniqueValues = new Set();
    data.forEach(row => {
      const value = getFilterableValue(row, columnKey);
      if (value && value.trim()) {
        uniqueValues.add(value);
      }
    });
    return Array.from(uniqueValues)
      .sort()
      .map(value => ({ value: String(value), label: String(value) }));
  };

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <div className="text-gray-500 text-lg font-medium">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header with title and controls */}
      {(title || showExport || Object.keys(columnFilters).length > 0) && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {title && <h3 className="text-lg font-medium text-gray-900">{title}</h3>}
              {Object.keys(columnFilters).length > 0 && (
                <span className="text-sm text-gray-500">
                  {Object.values(columnFilters).filter(v => v.trim()).length} filter aktif
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filter
              </button>
              {Object.keys(columnFilters).some(key => columnFilters[key].trim()) && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-1.5 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors"
                >
                  Clear
                </button>
              )}
              {showExport && onExport && (
                <button
                  onClick={onExport}
                  className="px-3 py-1.5 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Column Filters */}
      {showFilters && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-25">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {columns.filter(col => col.filterable !== false && col.label.toLowerCase() !== 'aksi').map((column) => (
              <div key={column.key}>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {column.label}
                </label>
                {column.filterConfig?.type === 'select' ? (
                  <select
                    value={columnFilters[column.key] || ''}
                    onChange={(e) => handleColumnFilter(column.key, e.target.value)}
                    className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Semua</option>
                    {(column.filterConfig.options || generateFilterOptions(column.key)).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={columnFilters[column.key] || ''}
                    onChange={(e) => handleColumnFilter(column.key, e.target.value)}
                    placeholder={column.filterConfig?.placeholder || `Cari ${column.label.toLowerCase()}...`}
                    className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {showNumbering && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  No.
                </th>
              )}
              {columns.map((column) => (
                <th 
                  key={column.key} 
                  style={{ width: column.width }}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable === false ? '' : 'cursor-pointer hover:bg-gray-100 select-none'
                  }`}
                  onClick={() => handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {(column.sortable !== false) && (
                      <div className="flex flex-col">
                        <svg 
                          className={`w-3 h-3 ${sortColumn === column.key && sortDirection === 'asc' ? 'text-blue-600' : 'text-gray-400'}`} 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                        <svg 
                          className={`w-3 h-3 -mt-1 ${sortColumn === column.key && sortDirection === 'desc' ? 'text-blue-600' : 'text-gray-400'}`} 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </th>
              ))}
              {showActions && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.map((row, index) => (
              <tr key={row.id || index} className="hover:bg-gray-50 transition-colors">
                {showNumbering && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </td>
                )}
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(() => {
                      if (column.render) {
                        return column.render(row[column.key], row, (currentPage - 1) * itemsPerPage + index);
                      }
                      const raw = row[column.key];
                      const keyLower = (column.key || '').toLowerCase();
                      const isDateField = keyLower.includes('created_at') || keyLower.includes('updated_at') || keyLower.includes('date');
                      if (isDateField && typeof raw === 'string') {
                        const d = new Date(raw);
                        if (!isNaN(d.getTime())) return formatDate(raw);
                      }
                      return raw;
                    })()}
                  </td>
                ))}
                {showActions && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex space-x-2">
                      {onDetail && (
                        <button
                          onClick={() => onDetail(row)}
                          className="text-gray-700 hover:text-gray-900 p-1 rounded-md hover:bg-gray-50 transition-colors"
                          title="Detail"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      )}
                      {onEdit && (
                        <button
                          onClick={() => onEdit(row)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded-md hover:bg-blue-50 transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(row)}
                          className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sebelumnya
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Selanjutnya
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Menampilkan{' '}
                <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
                {' '}sampai{' '}
                <span className="font-medium">
                  {Math.min(currentPage * itemsPerPage, sortedData.length)}
                </span>
                {' '}dari{' '}
                <span className="font-medium">{sortedData.length}</span>
                {' '}hasil
                {filteredData.length !== data.length && (
                  <span className="text-gray-500"> (difilter dari {data.length} total)</span>
                )}
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Sebelumnya</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === page
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Selanjutnya</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedDataTable;