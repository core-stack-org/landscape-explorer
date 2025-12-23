import React from "react";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import FilterListIcon from "@mui/icons-material/FilterList";

export default function TableView({
  headers = [],
  rows = [],
  pageSize = null,
  sortField,
  sortOrder,
  onSort,
  onFilterClick,
  onInfoClick,
  onSearchChange,
  waterbodySearch,
  loading,
  onRowClick,
}) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const totalPages = pageSize
  ? Math.ceil(rows.length / pageSize)
  : 1;

const paginatedRows = React.useMemo(() => {
  if (!pageSize) return rows;

  const startIndex = (currentPage - 1) * pageSize;
  return rows.slice(startIndex, startIndex + pageSize);
}, [rows, currentPage, pageSize]);

React.useEffect(() => {
  setCurrentPage(1);
}, [rows.length]);


  return (
    <div className="mt-4 bg-white rounded-md shadow-sm overflow-x-auto">
      <table className="w-full border border-gray-200 text-sm md:text-base text-gray-800">
        {/* HEADER */}
        <thead className="bg-gray-100 font-semibold">
          <tr className="border-b">
            {headers.map((col) => (
              <th key={col.key} className="relative px-3 py-4 text-center" onClick={col.sortable ? () => onSort(col.key) : undefined}>
                <div
                  className={`flex items-center justify-center gap-1 ${
                    col.sortable ? "cursor-pointer select-none" : ""
                  }`}
                >
                  {col.label}

                  {/* Filter Button */}
                  {col.filter && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onFilterClick(e, col.key);
                      }}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <FilterListIcon fontSize="small" />
                    </button>
                  )}

                  {/* Info Button */}
                  {col.info && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onInfoClick(e.currentTarget, col.info, col.key);
                      }}
                      className="p-1 text-blue-600 hover:scale-110 transition-transform"
                    >
                      <InfoOutlinedIcon fontSize="small" />
                    </button>
                  )}

                  {/* Sort Indicator */}
                  {col.sortable && (
                    <span>
                      {sortField === col.key
                        ? sortOrder === "asc"
                          ? "🔼"
                          : "🔽"
                        : "🔼"}
                    </span>
                  )}
                </div>

                {/* Search Box */}
                {col.search && (
                  <div className="mt-2 flex justify-center">
                    <input
                      type="text"
                      placeholder={`Search ${col.label}`}
                      value={waterbodySearch}
                      onChange={(e) => onSearchChange(e.target.value)}
                      className="border-b border-gray-700 bg-gray-100 text-xs text-gray-700 px-1 py-0.5 w-40 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}
              </th>
            ))}
          </tr>
        </thead>

        {/* BODY */}
        <tbody className="text-sm text-gray-700">
          {paginatedRows.map((row) => (
            <tr
              key={row.id}
              className="hover:bg-gray-50 cursor-pointer transition-colors border-b"
              onClick={() => onRowClick(row)}
            >
              {headers.map((col) => (
               <td key={col.key} className="px-3 py-4 text-center">
               {col.render ? col.render(row) : row[col.key] ?? "NA"}
             </td>
             
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {pageSize && totalPages > 1 && (
  <div className="flex justify-center mt-6">
    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
      
      {/* Previous */}
      <button
        disabled={currentPage === 1}
        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
        className={`w-8 h-8 flex items-center justify-center rounded-full ${
          currentPage === 1
            ? "text-gray-400 cursor-not-allowed"
            : "hover:bg-gray-100"
        }`}
      >
        ‹
      </button>

      {/* Page numbers (max 5) */}
      {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
        const page = i + 1;
        return (
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            className={`w-8 h-8 rounded-full text-sm ${
              currentPage === page
                ? "bg-blue-500 text-white"
                : "hover:bg-gray-100"
            }`}
          >
            {page}
          </button>
        );
      })}

      {/* Next */}
      <button
        disabled={currentPage === totalPages}
        onClick={() =>
          setCurrentPage((p) => Math.min(p + 1, totalPages))
        }
        className={`w-8 h-8 flex items-center justify-center rounded-full ${
          currentPage === totalPages
            ? "text-gray-400 cursor-not-allowed"
            : "hover:bg-gray-100"
        }`}
      >
        ›
      </button>
    </div>
  </div>
)}

    </div>
  );
}


