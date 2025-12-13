import React from "react";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import FilterListIcon from "@mui/icons-material/FilterList";

export default function TableView({
  headers = [],
  rows = [],
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
  return (
    <div className="mt-4 bg-white rounded-md shadow-sm overflow-x-auto">
      <table className="w-full border border-gray-200 text-sm md:text-base text-gray-800">
        {/* HEADER */}
        <thead className="bg-gray-100 font-semibold">
          <tr className="border-b">
            {headers.map((col) => (
              <th
                key={col.key}
                className="relative px-3 py-4 text-center"
                onClick={col.sortable ? () => onSort(col.key) : undefined}
              >
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
          {rows.map((row) => (
            <tr
              key={row.id}
              className="hover:bg-gray-50 cursor-pointer transition-colors border-b"
              onClick={() => onRowClick(row)}
            >
              {headers.map((col) => (
                <td key={col.key} className="px-3 py-4 text-center">
                  {formatCell(row, col.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(row, key) {
  if (key === "avgWaterAvailabilityRabi") {
    return (
      <>
        {row.avgWaterAvailabilityRabi ?? "NA"}{" "}
        {/* {row.ImpactRabi && (
          <span style={{ color: row.ImpactRabiColor }}>({row.ImpactRabi})</span>
        )} */}
      </>
    );
  }

  if (key === "avgWaterAvailabilityZaid") {
    return (
      <>
        {row.avgWaterAvailabilityZaid ?? "NA"}{" "}
        {/* {row.ImpactZaid && (
          <span style={{ color: row.ImpactZaidColor }}>({row.ImpactZaid})</span>
        )} */}
      </>
    );
  }

  if (key === "areaOred") {
    return row.areaOred?.toFixed?.(2) ?? "NA";
  }

  return row[key] ?? "NA";
}
