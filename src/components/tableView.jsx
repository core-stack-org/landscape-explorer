import React,{useState,useEffect,useMemo} from "react";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import FilterListIcon from "@mui/icons-material/FilterList";
import Tooltip from "@mui/material/Tooltip";


export default function TableView({
  headers = [],
  rows = [],
  pageSize = null,
  onRowClick,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [infoAnchor, setInfoAnchor] = useState(null);
  const [infoText, setInfoText] = useState("");
  const [filterAnchor, setFilterAnchor] = useState(null);
  const [activeFilterKey, setActiveFilterKey] = useState(null);
  const [columnFilters, setColumnFilters] = useState({});
  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");
  const [searchText, setSearchText] = useState("");


  const totalPages = pageSize ? Math.ceil(rows.length / pageSize): 1;

  const filteredRows = useMemo(() => {
    return rows.filter((row) =>
      Object.entries(columnFilters).every(([key, values]) => {
        if (!values || values.length === 0) return true;
        return values.includes(row[key]);
      })
    );
  }, [rows, columnFilters]);

  const searchedRows = useMemo(() => {
    if (!searchText) {
      return filteredRows;
    }
  
    const term = searchText.toLowerCase();
  
    const results = filteredRows.filter(r => {
      return (
        r.farmerName?.toLowerCase().includes(term) ||
        r.waterbody?.toLowerCase().includes(term)
      );
    });
      return results;
  }, [filteredRows, searchText]);
  
  
  
  const sortedRows = useMemo(() => {
    if (!sortField) return searchedRows;
  
    return [...searchedRows].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
  
      // numeric sort
      if (!isNaN(parseFloat(aVal)) && !isNaN(parseFloat(bVal))) {
        return sortOrder === "asc"
          ? parseFloat(aVal) - parseFloat(bVal)
          : parseFloat(bVal) - parseFloat(aVal);
      }
  
      // string sort
      return sortOrder === "asc"
        ? String(aVal ?? "").localeCompare(String(bVal ?? ""))
        : String(bVal ?? "").localeCompare(String(aVal ?? ""));
    });
  }, [searchedRows, sortField, sortOrder]);
  
  const paginatedRows = useMemo(() => {
    if (!pageSize) return sortedRows;
    const startIndex = (currentPage - 1) * pageSize;
    return sortedRows.slice(startIndex, startIndex + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [rows.length]);

  useEffect(() => {
    const closePopups = () => {
      setInfoAnchor(null);
      setFilterAnchor(null);
    };

    window.addEventListener("click", closePopups);
    window.addEventListener("scroll", closePopups);

    return () => {
      window.removeEventListener("click", closePopups);
      window.removeEventListener("scroll", closePopups);
    };
  }, []);

  const handleInfoClick = (anchor, text) => {
    setInfoAnchor(anchor);
    setInfoText(text);
  };
  

  const handleFilterClick = (anchor, key) => {
    setFilterAnchor(anchor);
    setActiveFilterKey(key);
  };

  const handleSortInternal = (field) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortOrder("asc");
      return field;
    });
  };

  const getUniqueValues = (key) => {
    return Array.from(
      new Set(rows.map((r) => r[key]).filter(Boolean))
    );
  };

  return (
    <div className="mt-2 bg-white rounded-md shadow-sm overflow-x-auto w-full p-0">
      <table className="min-w-[1200px] text-[7px] sm:text-[8px] md:text-[9px] lg:text-[10px] xl:text-[12px] 2xl:text-[14px] border border-gray-200">
        <thead className="bg-gray-100 font-medium">
          <tr className="border-b">
          <th className="
              px-[2px] py-[2px]
              sm:px-1 sm:py-1
              md:px-2 md:py-1.5
              lg:px-2 lg:py-2
              align-center text-center whitespace-normal break-words
            ">
            S.No.
          </th>

            {headers.map((col) => (
              <th key={col.key} className=" relative
                  px-[2px] py-[2px]
                  sm:px-1 sm:py-1
                  md:px-2 md:py-1.5
                  lg:px-2 lg:py-2
                  align-center text-center whitespace-normal break-words
                ">
                <div
                  className={`flex items-center justify-center gap-1 ${
                    col.sortable ? "cursor-pointer select-none" : ""
                  }`}
                  onClick={
                    col.sortable
                      ? () => handleSortInternal(col.key)
                      : undefined
                  }
                >
                  {col.label}
                {/* Filter Button */}
                {col.filter && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFilterClick(e.currentTarget, col.key);
                    }}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <FilterListIcon fontSize="small" />
                  </button>
                )}

                {/* Info Button */}
                {col.info && (
                  <Tooltip title="Click the Info icon for details" arrow placement="top">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInfoClick(e.currentTarget, col.info);
                      }}
                      className="p-1 text-blue-600 hover:scale-110 transition-transform"
                    >
                      <InfoOutlinedIcon fontSize="small" />
                    </button>
                  </Tooltip>
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
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      className="border-b border-gray-700 bg-gray-100 text-xs text-gray-700 px-1 py-0.5 w-40 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}
              </th>
            ))}
          </tr>
        </thead>

        {/* BODY */}
        <tbody className="text-gray-700">
          {paginatedRows.map((row,index) => (
            <tr
              key={row.id}
              className="hover:bg-gray-50 cursor-pointer transition-colors border-b"
              onClick={() => onRowClick(row)}
            >
              <td className="
                px-[2px] py-[2px]
                sm:px-1 sm:py-1
                md:px-2 md:py-1.5
                lg:px-2 lg:py-2
                align-center text-center whitespace-normal break-words
              ">
                {pageSize
                  ? (currentPage - 1) * pageSize + index + 1
                  : index + 1}
              </td>
              {headers.map((col) => (
                <td key={col.key} className="
                px-[2px] py-[2px]
                sm:px-1 sm:py-1
                md:px-2 md:py-1.5
                lg:px-2 lg:py-2
                align-center text-center whitespace-normal break-words
              "
              >
                {col.render ? col.render(row) : row[col.key] ?? "NA"}
              </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
          {infoAnchor && (
          <div
            className="fixed z-50 bg-white border shadow-lg rounded-md p-3 text-sm max-w-xs"
            style={{
              top: infoAnchor.getBoundingClientRect().bottom + 6,
              left: infoAnchor.getBoundingClientRect().left,
            }}
          >
            <p className="text-gray-700">{infoText}</p>
          </div>
        )}

          {filterAnchor && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="fixed z-50 bg-white border shadow-lg rounded-md p-3 text-sm min-w-[220px] max-h-[240px] overflow-auto"
              style={{
                top: filterAnchor.getBoundingClientRect().bottom + 6,
                left: filterAnchor.getBoundingClientRect().left,
              }}
            >
              <p className="font-semibold mb-2 text-gray-800 capitalize">
                Filter by {activeFilterKey}
              </p>

              {getUniqueValues(activeFilterKey).map((val) => (
                <label key={val} className="flex items-center gap-2 text-sm py-1">
                  <input
                    type="checkbox"
                    checked={columnFilters[activeFilterKey]?.includes(val) || false}
                    onChange={() => {
                      setColumnFilters((prev) => {
                        const current = prev[activeFilterKey] || [];
                        const updated = current.includes(val)
                          ? current.filter((v) => v !== val)
                          : [...current, val];

                        return {
                          ...prev,
                          [activeFilterKey]: updated,
                        };
                      });
                    }}
                  />
                  <span>{val}</span>
                </label>
              ))}
            </div>
          )}

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


