// src/components/kyl_rightSidebar.jsx
import React from "react";
import SelectButton from "./buttons/select_button";
import filtersDetails from "../components/data/Filters.json";
import { ArrowLeft, Loader2, Table } from 'lucide-react';
import ToggleButton from "./buttons/toggle_button_kyl";
import {
  stateDataAtom,
  stateAtom,
  districtAtom,
  blockAtom,
  filterSelectionsAtom,
} from "../store/locationStore.jsx";
import KYLMWSProfilePanel from "./kyl_MWSProfilePanel.jsx";
import KYLWaterbodyPanel from "./kyl_waterbodypanel.jsx";
import { useRecoilState } from "recoil";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import XLSX from 'xlsx-js-style';

const KYLRightSidebar = ({
  state,
  district,
  block,
  setState,
  setDistrict,
  setBlock,
  statesData,
  handleItemSelect,
  setFilterSelections,
  setPatternSelections,
  getFormattedSelectedFilters,
  getFormattedSelectedPatterns,
  handlePatternRemoval,
  selectedMWS,
  selectedVillages,
  handleLayerSelection,
  toggleStates,
  setToggleStates,
  currentLayer,
  setCurrentLayer,
  mapRef,
  mapElement,
  onResetMWS,
  selectedMWSProfile,
  waterbodiesLayerRef,
  clickedWaterbodyId,
  waterbodyDashboardUrl,
  selectedWaterbodyProfile,
  onResetWaterbody,
  setShowWB,
  showWB,
  boundaryLayerRef,
  mwsConnectivityLayerRef,
  showConnectivity,
  setShowConnectivity,
  mwsArrowLayerRef,
  baseLayerRef,
  mwsVillageIntersections = [],
  villageJson = [],
  selectedWaterbodyIds,
}) => {
  const [globalState, setGlobalState] = useRecoilState(stateAtom);
  const [globalDistrict, setGlobalDistrict] = useRecoilState(districtAtom);
  const [globalBlock, setGlobalBlock] = useRecoilState(blockAtom);
  const [loadingWB, setLoadingWB] = React.useState(false);
  const [showSelectionPopup, setShowSelectionPopup] = React.useState(false); // Add this line



  // Check if both panels are shown
  const showBothPanels = selectedMWSProfile && selectedWaterbodyProfile;

  const transformName = (name) => {
    if (!name) return name;
    return name
      .replace(/[().]/g, "")        // Remove parentheses and dots
      .replace(/[-\s]+/g, "_")      // Replace dashes and spaces with "_"
      .replace(/_+/g, "_")          // Collapse multiple underscores
      .replace(/^_|_$/g, "")        // Remove leading/trailing underscores
      .toLowerCase();
  };


  // Universal back handler - resets both panels
  const handleUniversalBack = () => {
    onResetMWS();
    onResetWaterbody();
  };

  const handleIndicatorRemoval = (filter) => {
    // First, remove the visualization if it exists
    if (toggleStates[filter.name]) {
      // Find the layer in currentLayer
      const layerToRemove = currentLayer.find((l) => l.name === filter.name);
      if (layerToRemove) {
        // Remove all associated layers from the map
        layerToRemove.layerRef.forEach((layer) => {
          if (mapRef.current) {
            mapRef.current.removeLayer(layer);
          }
        });

        // Update currentLayer state by filtering out the removed layer
        setCurrentLayer((prev) => prev.filter((l) => l.name !== filter.name));
      }
    }

    // Reset the toggle state for this filter
    setToggleStates((prevStates) => ({
      ...prevStates,
      [filter.name]: false,
    }));

    // Then remove the filter selection
    const sourceType = (function () {
      for (const topLevelKey of Object.keys(filtersDetails)) {
        if (filtersDetails[topLevelKey]) {
          for (const categoryKey of Object.keys(filtersDetails[topLevelKey])) {
            const found = filtersDetails[topLevelKey][categoryKey].find(
              (f) => f.name === filter.name
            );
            if (found) return topLevelKey;
          }
        }
      }
      return null;
    })();

    if (sourceType === "MWS") {
      setFilterSelections((prev) => ({
        ...prev,
        selectedMWSValues: {
          ...prev.selectedMWSValues,
          [filter.name]: null,
        },
      }));
    } else if (sourceType === "Village") {
      setFilterSelections((prev) => ({
        ...prev,
        selectedVillageValues: {
          ...prev.selectedVillageValues,
          [filter.name]: null,
        },
      }));
    }
    else if (sourceType === "Waterbody") {
      setFilterSelections((prev) => ({
        ...prev,
        selectedWaterbodyValues: {
          ...prev.selectedWaterbodyValues,
          [filter.name]: null,
        },
      }));
    }
  };

  const toggleWaterbodies = () => {
    if (!waterbodiesLayerRef.current) {
      console.warn("Waterbodies layer not loaded yet");
      return;
    }

    const source = waterbodiesLayerRef.current.getSource();

    if (!showWB) {
      setLoadingWB(true);

      const handleSourceChange = () => {
        if (source.getState() === "ready") {
          setLoadingWB(false);
        }
      };

      // attach change listener
      source.once("change", handleSourceChange);

      mapRef.current.removeLayer(boundaryLayerRef.current);
      mapRef.current.addLayer(waterbodiesLayerRef.current);
      mapRef.current.addLayer(boundaryLayerRef.current);

      setShowWB(true);

    } else {
      mapRef.current.removeLayer(waterbodiesLayerRef.current);
      setShowWB(false);
    }
  };

  const toggleConnectivity = () => {
    if (!mwsArrowLayerRef?.current) {
      console.warn("Arrow layer not ready");
      return;
    }

    const layer = mwsArrowLayerRef.current;

    const newVisibility = !showConnectivity;
    layer.setVisible(newVisibility);
    setShowConnectivity(newVisibility);
  };

  const handleTehsilReport = () => {
    const reportURL = `${process.env.REACT_APP_API_URL}/generate_tehsil_report/?state=${transformName(state?.label)}&district=${transformName(district?.label)}&block=${transformName(block?.label)}`;
    window.open(reportURL, '_blank', 'noopener,noreferrer');
  };


  // Generate table data for selected MWS and villages
  // Generate table data for selected MWS and villages
  const generateSelectionTableData = () => {
    const mwsData = [];
    const villageData = [];

    // Add MWS data
    if (selectedMWS && selectedMWS.length > 0) {
      selectedMWS.forEach((mwsId, index) => {
        mwsData.push({
          id: `${mwsId}-${index}`,
          name: String(mwsId) // Convert to string
        });
      });
    }

    // Add Village data
    if (selectedVillages && selectedVillages.size > 0) {
      let villageIndex = 0;
      selectedVillages.forEach((villageId) => {
        const villageIdStr = String(villageId);

        // Name lookup from villageJson
        let vName = '';
        if (villageJson && Array.isArray(villageJson)) {
          const v = villageJson.find(v => String(v.village_id) === villageIdStr);
          if (v) vName = v.village_name || v.vill_name || v.name || '';
        }

        // Fallback to boundaryLayer features if name empty
        if (!vName && boundaryLayerRef.current) {
          try {
            const features = boundaryLayerRef.current.getSource().getFeatures();
            const f = features.find(feat => {
              const props = feat.getProperties();
              return String(props.vill_ID ?? props.village_id) === villageIdStr;
            });
            if (f) {
              const props = f.getProperties();
              vName = props.vill_name || props.village_name || props.name || '';
            }
          } catch (_) { }
        }

        villageData.push({
          id: `village-${villageIdStr}-${villageIndex}`,
          villageId: villageIdStr,
          villageName: vName || 'Unknown Village'
        });
        villageIndex++;
      });
    }

    return { mwsData, villageData };
  };


  // Add state for loading
  const [isDownloading, setIsDownloading] = React.useState(false);

  // Updated download function with loading state
  // Client-side PDF download without API
  const downloadPDF = async () => {
    if (isDownloading) return;
    setIsDownloading(true);

    try {
      const { mwsData, villageData } = generateSelectionTableData();

      // ── Capture map using OpenLayers native canvas compositing ──────
      let mapImageData = null;
      try {
        const map = mapRef.current;
        if (map) {
          mapImageData = await new Promise((resolve) => {
            map.render();
            map.once('rendercomplete', () => {
              try {
                const mapCanvas = document.createElement('canvas');
                const size = map.getSize();
                mapCanvas.width = size[0];
                mapCanvas.height = size[1];
                const ctx = mapCanvas.getContext('2d');

                // Composite every visible OL canvas in DOM order
                const mapEl = map.getTargetElement();
                const viewport = map.getViewport();
                viewport.querySelectorAll('canvas').forEach((layerCanvas) => {
                  if (layerCanvas.width > 0) {
                    const parentOpacity = layerCanvas.parentNode.style.opacity;
                    ctx.globalAlpha = parentOpacity !== "" ? parseFloat(parentOpacity) : 1;

                    const transform = layerCanvas.style.transform;
                    if (transform) {
                      const matrix = transform
                        .match(/^matrix\(([^)]*)\)$/)?.[1]
                        .split(',')
                        .map(Number);
                      if (matrix) ctx.setTransform(...matrix);
                    } else {
                      ctx.setTransform(1, 0, 0, 1, 0, 0);
                    }
                    ctx.drawImage(layerCanvas, 0, 0);
                  }
                });

                ctx.globalAlpha = 1;
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                resolve(mapCanvas.toDataURL('image/jpeg', 0.9));
              } catch (e) {
                console.warn('Canvas composite failed:', e);
                resolve(null);
              }
            });

            map.renderSync();
          });
        }
      } catch (mapErr) {
        console.warn('Map capture failed:', mapErr);
      }
      // ────────────────────────────────────────────────────────────────

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.width;

      // ── Title ──────────────────────────────────────────────────────
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text('KYL Dashboard Report', 14, 14);
      doc.setDrawColor(180, 180, 180);
      doc.line(14, 17, pageW - 14, 17);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(140, 140, 140);
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageW - 14, 14, { align: 'right' });

      // ── Location block ─────────────────────────────────────────────
      let yPos = 23;
      doc.setFillColor(245, 247, 255);
      doc.roundedRect(14, yPos - 3, pageW - 28, 14, 2, 2, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 60, 60);
      doc.text('Location:', 18, yPos + 4);
      doc.setFont('helvetica', 'normal');
      doc.text(`State: ${state?.label || 'N/A'}`, 50, yPos + 4);
      doc.text(`District: ${district?.label || 'N/A'}`, 110, yPos + 4);
      doc.text(`Block / Tehsil: ${block?.label || 'N/A'}`, 185, yPos + 4);
      yPos += 18;

      // ── Selected Filters section ───────────────────────────────────
      const selectedFilters = getFormattedSelectedFilters();
      const selectedPatterns = getFormattedSelectedPatterns();

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 120);
      doc.text('Selected Filters / Indicators', 14, yPos);
      yPos += 2;

      if (selectedFilters.length > 0) {
        autoTable(doc, {
          startY: yPos,
          head: [['#', 'Filter Name', 'Value(s)']],
          body: selectedFilters.map((f, i) => [i + 1, f.filterName || f.name || '', (f.values || []).join(', ')]),
          theme: 'grid',
          headStyles: { fillColor: [63, 81, 181], fontSize: 9 },
          bodyStyles: { fontSize: 8 },
          columnStyles: { 0: { cellWidth: 12, halign: 'center' }, 1: { cellWidth: 70 } },
          margin: { left: 14, right: 14 },
        });
        yPos = doc.lastAutoTable.finalY + 4;
      } else {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(160, 160, 160);
        doc.text('No filters selected.', 18, yPos + 4);
        yPos += 10;
      }

      if (selectedPatterns.length > 0) {
        autoTable(doc, {
          startY: yPos,
          head: [['#', 'Pattern']],
          body: selectedPatterns.map((p, i) => [i + 1, p.category || p.patternName || '']),
          theme: 'grid',
          headStyles: { fillColor: [76, 175, 80], fontSize: 9 },
          bodyStyles: { fontSize: 8 },
          columnStyles: { 0: { cellWidth: 12, halign: 'center' } },
          margin: { left: 14, right: 14 },
        });
        yPos = doc.lastAutoTable.finalY + 4;
      }

      // ── Map screenshot ─────────────────────────────────────────────
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text('Map View', 14, yPos + 6);
      yPos += 8;

      if (mapImageData) {
        const imgProps = doc.getImageProperties(mapImageData);
        const maxW = pageW - 28;
        const remainingH = doc.internal.pageSize.height - yPos - 20;
        const maxH = Math.max(remainingH, 60);
        const ratio = Math.min(maxW / imgProps.width, maxH / imgProps.height);
        const imgW = imgProps.width * ratio;
        const imgH = imgProps.height * ratio;
        if (yPos + imgH > doc.internal.pageSize.height - 15) {
          doc.addPage();
          yPos = 20;
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text('Map View', 14, yPos);
          yPos += 6;
        }
        doc.addImage(mapImageData, 'JPEG', 14, yPos, imgW, imgH);
        yPos += imgH + 8;
      } else {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(160, 160, 160);
        doc.text('(Map screenshot could not be captured)', 14, yPos + 4);
        yPos += 12;
      }

      // ── MWS & Villages tables ──────────────────────────────────────
      if (mwsData.length > 0 || villageData.length > 0) {
        if (yPos > doc.internal.pageSize.height - 50) { doc.addPage(); yPos = 20; }

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 30, 30);
        doc.text(
          `Selected Items: ${mwsData.length + villageData.length} total  (MWS: ${mwsData.length} | Villages: ${villageData.length})`,
          14, yPos
        );
        yPos += 4;

        if (mwsData.length > 0) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(37, 99, 235);
          doc.text(`Micro-watersheds (${mwsData.length})`, 14, yPos + 6);
          autoTable(doc, {
            startY: yPos + 8,
            head: [['#', 'Micro-watershed ID', 'Intersecting Villages', 'Intersecting Waterbodies']],
            body: mwsData.map((item, i) => {
              const mwsGroup = mwsVillageIntersections.find(g => g.mwsId === item.name);
              const villagesStr = mwsGroup
                ? mwsGroup.villages.map(v => `${v.villageName || 'Unknown'} (${v.villageId})`).join(', ')
                : 'None';
              const swbStr = mwsGroup && mwsGroup.waterbodies && mwsGroup.waterbodies.length > 0
                ? mwsGroup.waterbodies.map(swb => swb.swbName ? `${swb.swbName} (${swb.swbId})` : swb.swbId).join(', ')
                : 'None';
              return [i + 1, item.name, villagesStr, swbStr];
            }),
            theme: 'grid',
            headStyles: { fillColor: [37, 99, 235], fontSize: 9 },
            bodyStyles: { fontSize: 8 },
            columnStyles: {
              0: { cellWidth: 12, halign: 'center' },
              1: { cellWidth: 40 },
              2: { cellWidth: 70 },
              3: { cellWidth: 'auto' }
            },
            margin: { left: 14, right: 14 },
          });
          yPos = doc.lastAutoTable.finalY + 8;
        }

        if (villageData.length > 0) {
          if (yPos > doc.internal.pageSize.height - 40) { doc.addPage(); yPos = 20; }
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(22, 163, 74);
          doc.text(`Villages (${villageData.length})`, 14, yPos);
          autoTable(doc, {
            startY: yPos + 4,
            head: [['S.No.', 'Village ID', 'Village Name']],
            body: villageData.map((item, i) => [i + 1, item.villageId, item.villageName]),
            theme: 'striped',
            headStyles: { fillColor: [22, 163, 74], fontSize: 9 },
            bodyStyles: { fontSize: 8 },
            columnStyles: {
              0: { cellWidth: 15, halign: 'center' },
              1: { cellWidth: 35 },
              2: { cellWidth: 'auto' }
            },
            margin: { left: 14, right: 14 },
          });
          yPos = doc.lastAutoTable.finalY + 8;
        }
      }

      // Footer on every page
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${pageCount}`, pageW / 2, doc.internal.pageSize.height - 8, { align: 'center' });
      }

      const filename = `kyl_report_${transformName(state?.label) || 'report'}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);

    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadExcel = () => {
    try {
      const { mwsData, villageData } = generateSelectionTableData();
      const selectedFilters = getFormattedSelectedFilters();

      // Identify demographic (Village-level) and Waterbody-level filters
      const villageFilters = [];
      const waterbodyFilters = [];

      selectedFilters.forEach(f => {
        for (const topLevelKey of Object.keys(filtersDetails)) {
          for (const categoryKey of Object.keys(filtersDetails[topLevelKey] || {})) {
            if (Array.isArray(filtersDetails[topLevelKey][categoryKey]) &&
              filtersDetails[topLevelKey][categoryKey].some(i => i.name === f.name)) {
              if (topLevelKey === "Village") villageFilters.push(f);
              if (topLevelKey === "Waterbody") waterbodyFilters.push(f);
            }
          }
        }
      });

      // 0 - Selected Filters Sheet
      const sheet0Data = selectedFilters.map((f, i) => ({
        "S.NO": i + 1,
        "INDICATOR NAME": f.filterName || f.name,
        "SELECTED VALUES": (f.values || []).join(", ")
      }));

      // 1 - Selected MWS Sheet
      const sheet1Data = mwsData.map(item => ({
        "MICRO-WATERSHED ID": item.name
      }));

      // 2 - Selected Village Sheet (with indicators if demographic filter selected)
      const sheet2Data = villageData.map(item => {
        const row = {
          "VILLAGE ID": item.villageId,
          "VILLAGE NAME": item.villageName
        };
        if (villageJson && Array.isArray(villageJson)) {
          const vRecord = villageJson.find(v => String(v.village_id || v.vill_ID) === String(item.villageId));
          if (vRecord) {
            villageFilters.forEach(f => {
              const colName = (f.filterName || f.name).toUpperCase();
              let val = vRecord[f.name];
              if (val === undefined || val === null) val = "N/A";
              else if (typeof val === "number") val = Number(val.toFixed(3));
              row[colName] = val;
            });
          }
        }
        return row;
      });

      const uniqueSwbs = new Map();
      mwsVillageIntersections.forEach(group => {
        group.waterbodies.forEach(swb => {
          // Only include selected (matched) waterbodies
          if (!uniqueSwbs.has(swb.swbId) && selectedWaterbodyIds && selectedWaterbodyIds.has(String(swb.swbId))) {
            const row = {
              "SWB ID": swb.swbId,
              "WATERBODY NAME": swb.swbName || "Unknown",
              "LATITUDE": swb.latitude || 0,
              "LONGITUDE": swb.longitude || 0
            };
            waterbodyFilters.forEach(f => {
              const colName = (f.filterName || f.name).toUpperCase();
              let val = swb[f.name];
              if (val === undefined || val === null) val = "N/A";
              row[colName] = val;
            });
            uniqueSwbs.set(swb.swbId, row);
          }
        });
      });
      const sheet3Data = Array.from(uniqueSwbs.values());

      const sheet4Data = [];
      mwsVillageIntersections.forEach(group => {
        group.villages.forEach(v => {
          sheet4Data.push({
            "MWS ID": group.mwsId,
            "VILLAGE ID": v.villageId,
            "VILLAGE NAME": v.villageName
          });
        });
      });

      const sheet5Data = [];
      mwsVillageIntersections.forEach(group => {
        group.waterbodies.forEach(swb => {
          sheet5Data.push({
            "MWS ID": group.mwsId,
            "SWB ID": swb.swbId,
            "WATERBODY NAME": swb.swbName
          });
        });
      });

      const workbook = XLSX.utils.book_new();
      const sheet0 = XLSX.utils.json_to_sheet(sheet0Data);
      const sheet1 = XLSX.utils.json_to_sheet(sheet1Data);
      const sheet2 = XLSX.utils.json_to_sheet(sheet2Data);
      const sheet3 = XLSX.utils.json_to_sheet(sheet3Data);
      const sheet4 = XLSX.utils.json_to_sheet(sheet4Data);
      const sheet5 = XLSX.utils.json_to_sheet(sheet5Data);

      const boldStyle = { font: { bold: true } };
      const activeSheets = [
        { sheet: sheet0, name: "Selected Filters", width: [{ wch: 8 }, { wch: 40 }, { wch: 60 }] },
        { sheet: sheet1, name: "Selected MWS", width: [{ wch: 30 }] }
      ];

      // Add Village sheet only if demographic filter is selected
      if (villageFilters.length > 0) {
        const vWidths = [{ wch: 25 }, { wch: 40 }];
        villageFilters.forEach(() => vWidths.push({ wch: 20 }));
        activeSheets.push({ sheet: sheet2, name: "Selected Villages", width: vWidths });
      }

      // Add Waterbody details sheet only if waterbody filter is selected
      if (waterbodyFilters.length > 0) {
        const wbWidths = [{ wch: 25 }, { wch: 40 }, { wch: 18 }, { wch: 18 }];
        waterbodyFilters.forEach(() => wbWidths.push({ wch: 20 }));
        activeSheets.push({ sheet: sheet3, name: "Selected Waterbodies", width: wbWidths });
      }

      // Intersection sheets are always included for reference
      activeSheets.push({ sheet: sheet4, name: "MWS-Village Intersects", width: [{ wch: 25 }, { wch: 25 }, { wch: 40 }] });
      activeSheets.push({ sheet: sheet5, name: "MWS-Waterbody Intersects", width: [{ wch: 25 }, { wch: 25 }, { wch: 40 }] });

      activeSheets.forEach(({ sheet, name, width }) => {
        const range = XLSX.utils.decode_range(sheet["!ref"]);
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const addr = XLSX.utils.encode_cell({ r: 0, c: C });
          if (sheet[addr]) sheet[addr].s = boldStyle;
        }
        sheet["!cols"] = width;
        XLSX.utils.book_append_sheet(workbook, sheet, name);
      });

      const filename = `kyl_selection_report_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, filename);
    } catch (error) {
      console.error('Excel generation error:', error);
      alert('Error generating Excel file.');
    }
  };

  const SelectionPopup = () => {
    const [activeTab, setActiveTab] = React.useState('mws');
    if (!showSelectionPopup) return null;

    const { mwsData, villageData } = generateSelectionTableData();
    const seenVillageIds = new Set(); // dedup tracker — villages shown only in their first MWS
    const uniqueSwbs = new Map();
    mwsVillageIntersections.forEach(group => {
      group.waterbodies.forEach(swb => {
        if (!uniqueSwbs.has(swb.swbId) && selectedWaterbodyIds && selectedWaterbodyIds.has(String(swb.swbId))) {
          uniqueSwbs.set(swb.swbId, swb);
        }
      });
    });
    const waterbodyData = Array.from(uniqueSwbs.values());
    const totalItems = mwsData.length + villageData.length + waterbodyData.length;

    const tabClass = (tab) =>
      `px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === tab
        ? 'bg-indigo-600 text-white shadow-sm'
        : 'text-gray-600 hover:bg-gray-100'
      }`;

    // ── Counts for the 5 Excel Sheets ──────────────────────────────
    const sheet1Count = mwsData.length; // Selected MWS
    const sheet2Count = villageData.length; // Selected Villages
    const sheet3Count = waterbodyData.length; // Selected Waterbodies
    const sheet4Count = mwsVillageIntersections.reduce((acc, curr) => acc + (curr.villages?.length || 0), 0); // MWS-Village Intersects
    const sheet5Count = mwsVillageIntersections.reduce((acc, curr) => acc + (curr.waterbodies?.length || 0), 0); // MWS-Waterbody Intersects

    // Determine filter-based visibility for Sheet 2 and 3 counts
    const selectedFiltersCount = getFormattedSelectedFilters();
    const hasVillageFilter = selectedFiltersCount.some(f => {
      for (const topKey of Object.keys(filtersDetails)) {
        if (topKey === "Village") {
          for (const catKey of Object.keys(filtersDetails[topKey] || {})) {
            if (filtersDetails[topKey][catKey].some(i => i.name === f.name)) return true;
          }
        }
      }
      return false;
    });
    const hasWaterbodyFilter = selectedFiltersCount.some(f => {
      for (const topKey of Object.keys(filtersDetails)) {
        if (topKey === "Waterbody") {
          for (const catKey of Object.keys(filtersDetails[topKey] || {})) {
            if (filtersDetails[topKey][catKey].some(i => i.name === f.name)) return true;
          }
        }
      }
      return false;
    });

    const selectedPatternsCount = getFormattedSelectedPatterns();
    const hasVillagePattern = selectedPatternsCount.some(p => p.level); // Village-level patterns have a truthy 'level'

    const checkWaterbodyMatch = (swb) => {
      if (!hasWaterbodyFilter) return false;
      if (!selectedWaterbodyIds || selectedWaterbodyIds.size === 0) return false;
      return selectedWaterbodyIds.has(String(swb.swbId));
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in" onClick={() => setShowSelectionPopup(false)}>
        <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 flex-shrink-0">
            <h3 className="text-lg font-bold text-gray-800">
              Selection Details <span className="text-gray-500 font-normal ml-2">({totalItems} total)</span>
            </h3>
            <div className="flex items-center gap-3">
              {/* Tab switcher */}
              <div className="flex gap-1 bg-gray-200 p-1 rounded-lg mr-2">
                <button className={tabClass('mws')} onClick={() => setActiveTab('mws')}>
                  MWS ({mwsData.length})
                </button>
                {hasVillageFilter && (
                  <button className={tabClass('villages')} onClick={() => setActiveTab('villages')}>
                    Selected Villages ({villageData.length})
                  </button>
                )}
                {hasWaterbodyFilter && (
                  <button className={tabClass('waterbodies')} onClick={() => setActiveTab('waterbodies')}>
                    Selected Waterbodies ({waterbodyData.length})
                  </button>
                )}
              </div>
              {/* PDF Download Button */}
              <button
                onClick={downloadPDF}
                disabled={isDownloading}
                className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-md transition-colors ${isDownloading
                  ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                  : 'text-red-600 hover:bg-red-50'
                  }`}
                title="Download as PDF"
              >
                {isDownloading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>PDF</span>
                  </>
                )}
              </button>

              {/* Excel Download Button */}
              <button
                onClick={downloadExcel}
                className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md transition-colors text-green-600 hover:bg-green-50"
                title="Download as Excel"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Excel</span>
              </button>

              {/* Close Button */}
              <button onClick={() => setShowSelectionPopup(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="overflow-y-auto flex-1 p-4">

            {/* ── Tab: MWS ─────────────────────────────────────── */}
            {activeTab === 'mws' && (
              mwsData.length > 0 ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-blue-50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 text-blue-700 font-semibold w-10">#</th>
                        <th className="text-left px-3 py-2 text-blue-700 font-semibold">Micro-watershed ID</th>
                        <th className="text-right px-3 py-2 text-blue-700 font-semibold">Report</th>
                        <th className="text-left px-3 py-2 text-blue-700 font-semibold pl-6">Intersecting Villages</th>
                        <th className="text-left px-3 py-2 text-blue-700 font-semibold pl-6">Intersecting Waterbodies</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {mwsData.map((item, i) => {
                        const mwsGroup = mwsVillageIntersections.find(g => g.mwsId === item.name);
                        return (
                          <tr key={item.id} className="hover:bg-gray-50 align-top">
                            <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                            <td className="px-3 py-2 font-mono text-gray-800">{item.name}</td>
                            <td className="px-3 py-2 text-right">
                              <a
                                href={`https://geoserver.core-stack.org/api/v1/generate_mws_report/?state=${transformName(state?.label)}&district=${transformName(district?.label)}&block=${transformName(block?.label)}&uid=${item.name}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:text-indigo-800 font-medium whitespace-nowrap"
                              >
                                View Report →
                              </a>
                            </td>
                            <td className="px-3 py-2 pl-6">
                              {mwsGroup && mwsGroup.villages.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {mwsGroup.villages.filter(v => {
                                    const id = String(v.villageId);
                                    if (seenVillageIds.has(id)) return false;
                                    seenVillageIds.add(id);
                                    return true;
                                  }).map(v => {
                                    const villageIdStr = String(v.villageId);
                                    let isSelected = false;
                                    if (hasVillageFilter || hasVillagePattern) {
                                      if (selectedVillages instanceof Set) {
                                        isSelected = selectedVillages.has(villageIdStr) || selectedVillages.has(Number(v.villageId));
                                      } else if (Array.isArray(selectedVillages)) {
                                        isSelected = selectedVillages.some(sid => String(sid) === villageIdStr);
                                      }
                                    }

                                    return (
                                      <div
                                        key={v.villageId}
                                        className={`border rounded px-2 py-0.5 shadow-sm transform transition-all ${isSelected
                                          ? 'bg-green-600 border-green-700 text-white font-extrabold z-10'
                                          : 'bg-purple-50 border-purple-100 text-purple-700 font-medium'}`}
                                        title={`${isSelected ? 'Selected (Matches Filters)' : 'Structural Intersection'} | ID: ${v.villageId}`}
                                      >
                                        <span className="text-[10px]">
                                          {v.villageName || 'Unknown Village'}
                                          <span className={`${isSelected ? 'opacity-80' : 'text-purple-400'} ml-1 font-mono text-[9px]`}>({v.villageId})</span>
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-gray-400 italic text-[10px]">No intersections</span>
                              )}
                            </td>
                            <td className="px-3 py-2 pl-6">
                              {mwsGroup && mwsGroup.waterbodies && mwsGroup.waterbodies.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {mwsGroup.waterbodies.map(swb => {
                                    const isSelected = checkWaterbodyMatch(swb);
                                    return (
                                      <div
                                        key={swb.swbId}
                                        className={`border rounded px-2 py-0.5 shadow-sm transition-all ${isSelected
                                          ? 'bg-green-600 border-green-700 text-white font-extrabold z-10'
                                          : 'bg-blue-50 border-blue-100 text-blue-700 font-medium'}`}
                                        title={`${isSelected ? 'Selected (Matches Filters)' : 'Intersection Only'} | ID: ${swb.swbId}`}
                                      >
                                        <span className="text-[10px]">
                                          {swb.swbName ? `${swb.swbName} (${swb.swbId})` : swb.swbId}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-gray-400 italic text-[10px]">No SWB intersections</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10 text-gray-400 text-sm">No micro-watersheds selected</div>
              )
            )}

            {/* ── Tab: Villages (filter-matched) ────────────────── */}
            {activeTab === 'villages' && (
              villageData.length > 0 ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-green-50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 text-green-700 font-semibold w-10">#</th>
                        <th className="text-left px-3 py-2 text-green-700 font-semibold">Village ID</th>
                        <th className="text-left px-3 py-2 text-green-700 font-semibold pl-6">Village Name</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {villageData.map((item, i) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                          <td className="px-3 py-2 font-mono text-gray-800">{item.villageId}</td>
                          <td className="px-3 py-2 text-gray-800 pl-6 font-medium">{item.villageName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10 text-gray-400 text-sm">No filter-matched villages found.</div>
              )
            )}

            {/* ── Tab: Waterbodies ────────────────────────────── */}
            {activeTab === 'waterbodies' && (
              waterbodyData.length > 0 ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-cyan-50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 text-cyan-700 font-semibold w-10">#</th>
                        <th className="text-left px-3 py-2 text-cyan-700 font-semibold">SWB ID</th>
                        <th className="text-left px-3 py-2 text-cyan-700 font-semibold pl-6">Waterbody Name</th>
                        <th className="text-left px-3 py-2 text-cyan-700 font-semibold pl-6">Coordinates</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {waterbodyData.map((swb, i) => (
                        <tr key={swb.swbId} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                          <td className="px-3 py-2 font-mono text-gray-800">{swb.swbId}</td>
                          <td className="px-3 py-2 text-gray-800 pl-6 font-medium">{swb.swbName || 'Unknown'}</td>
                          <td className="px-3 py-2 text-gray-500 pl-6 font-mono text-[10px]">
                            {swb.latitude?.toFixed(4)}, {swb.longitude?.toFixed(4)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10 text-gray-400 text-sm font-medium">No waterbodies found in the selection.</div>
              )
            )}

          </div>

          {/* Footer with 5 Sheet Counts */}
          <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center flex-shrink-0">
            <div className="flex gap-4 items-center">
              {/* Sheet 1: Selected MWS */}
              <div className="flex flex-col">
                <span className="text-[9px] uppercase text-gray-400 font-bold tracking-wider">MWS</span>
                <span className="text-blue-600 font-bold text-base leading-tight">{sheet1Count}</span>
              </div>

              {/* Sheet 2: Selected Villages (Conditional) */}
              {hasVillageFilter && (
                <>
                  <div className="w-[1px] bg-gray-200 h-6"></div>
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase text-gray-400 font-bold tracking-wider">Villages</span>
                    <span className="text-green-600 font-bold text-base leading-tight">{sheet2Count}</span>
                  </div>
                </>
              )}

              {/* Sheet 3: Selected Waterbodies (Conditional) */}
              {hasWaterbodyFilter && (
                <>
                  <div className="w-[1px] bg-gray-200 h-6"></div>
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase text-gray-400 font-bold tracking-wider">Waterbodies</span>
                    <span className="text-cyan-600 font-bold text-base leading-tight">{sheet3Count}</span>
                  </div>
                </>
              )}

              {/* Sheet 4: M-V Intersects */}
              <div className="w-[1px] bg-gray-200 h-6"></div>
              <div className="flex flex-col">
                <span className="text-[9px] uppercase text-gray-400 font-bold tracking-wider">MWS Int. Villages</span>
                <span className="text-purple-600 font-bold text-base leading-tight">{sheet4Count}</span>
              </div>

              {/* Sheet 5: M-W Intersects */}
              <div className="w-[1px] bg-gray-200 h-6"></div>
              <div className="flex flex-col">
                <span className="text-[9px] uppercase text-gray-400 font-bold tracking-wider">MWS Int. Waterbodies</span>
                <span className="text-indigo-600 font-bold text-base leading-tight">{sheet5Count}</span>
              </div>
            </div>

            <button
              onClick={() => setShowSelectionPopup(false)}
              className="px-8 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg shadow-md hover:bg-indigo-700 active:transform active:scale-95 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };



  return (
    <div className="w-[320px] flex flex-col gap-2">
      <SelectionPopup />
      {/* Universal Back Button - Shows only when both panels are selected */}
      {showBothPanels && (
        <div className="bg-white rounded-lg border border-gray-100 p-3">
          <button
            onClick={handleUniversalBack}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">Back to Map</span>
          </button>
        </div>
      )}

      {/* MWS Profile Panel - Shows first when both are selected */}
      {selectedMWSProfile && (
        <KYLMWSProfilePanel
          mwsData={selectedMWSProfile}
          onBack={onResetMWS}
          hideBackButton={showBothPanels}
        />
      )}

      {/* Waterbody Panel - Shows second when both are selected */}
      {selectedWaterbodyProfile && (
        <KYLWaterbodyPanel
          waterbody={selectedWaterbodyProfile}
          onBack={onResetWaterbody}
          hideBackButton={showBothPanels}
        />
      )}

      {/* Default view - Shows only when neither MWS nor Waterbody is selected */}
      {!selectedMWSProfile && !selectedWaterbodyProfile && (
        <div className="bg-white rounded-lg border border-gray-100 p-3">
          <button
            className="w-full py-2 px-2 text-indigo-600 bg-indigo-100 rounded-lg text-xs font-medium text-left mb-1"
          >
            Click on a micro-watershed (blue outline) to view its report.
          </button>
          <div className="bg-white rounded-lg border border-gray-100 p-3">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600 min-w-[45px]">
                  State
                </label>
                <SelectButton
                  currVal={state || { label: "Select State" }}
                  stateData={statesData}
                  handleItemSelect={handleItemSelect}
                  setState={(val) => {
                    setState(val);
                    setGlobalState(val);
                  }}
                  className="w-full border border-gray-200 rounded-md py-1.5 px-3"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600 min-w-[45px]">
                  District
                </label>
                <SelectButton
                  currVal={district || { label: "Select District" }}
                  stateData={state !== null ? state.district : null}
                  handleItemSelect={handleItemSelect}
                  setState={(val) => {
                    setDistrict(val);
                    setGlobalDistrict(val);
                  }}
                  className="w-full border border-gray-200 rounded-md py-1.5 px-3"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600 min-w-[45px]">
                  Tehsil
                </label>
                <SelectButton
                  currVal={block || { label: "Select Tehsil" }}
                  stateData={district !== null ? district.blocks : null}
                  handleItemSelect={handleItemSelect}
                  setState={(val) => {
                    setBlock(val);
                    setGlobalBlock(val);
                  }}
                  className="w-full border border-gray-200 rounded-md py-1.5 px-3"
                />
              </div>
            </div>
            {block && (
              <div className="mt-6 flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    className="flex-1 flex items-center justify-center gap-1 text-indigo-600 py-2 text-sm hover:bg-indigo-50 rounded-md transition-colors"
                    onClick={handleTehsilReport}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7s-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    View Tehsil Report
                  </button>
                  <button
                    onClick={() => toggleWaterbodies()}
                    disabled={loadingWB}
                    className={`flex-1 flex items-center justify-center gap-1 py-2 text-sm 
                              rounded-md transition-colors hover:bg-indigo-50 
                              ${showWB ? "text-red-600" : "text-indigo-600"}`}
                  >
                    {loadingWB ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading…
                      </>
                    ) : showWB ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg"
                          width="18" height="18" viewBox="0 0 24 24"
                          fill="none" stroke="currentColor" strokeWidth="2"
                          strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2C12 2 7 8 7 12a5 5 0 0 0 8.6 3.5" />
                          <path d="M5 12a7 7 0 0 0 11.6 4.5" />
                          <line x1="3" y1="3" x2="21" y2="21" />
                        </svg>
                        Hide Waterbodies
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg"
                          width="18" height="18" viewBox="0 0 24 24"
                          fill="none" stroke="currentColor" strokeWidth="2"
                          strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2C12 2 7 8 7 12a5 5 0 0 0 10 0c0-4-5-10-5-10z" />
                          <path d="M5 12a7 7 0 0 0 14 0" />
                        </svg>
                        Show Waterbodies
                      </>
                    )}
                  </button>
                </div>

                <button
                  onClick={toggleConnectivity}
                  className={`w-full flex items-center justify-center gap-1 py-2 text-sm 
                              rounded-md transition-colors hover:bg-indigo-50
                              ${showConnectivity ? "text-red-600" : "text-indigo-600"}`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="5" cy="12" r="2" />
                    <circle cx="19" cy="5" r="2" />
                    <circle cx="19" cy="19" r="2" />
                    <line x1="7" y1="12" x2="17" y2="6" />
                    <line x1="7" y1="12" x2="17" y2="18" />
                  </svg>
                  {showConnectivity ? "Hide MWS Connectivity" : "Show MWS Connectivity"}
                </button>
              </div>
            )}
          </div>
          <div className="bg-white rounded-lg border border-gray-100 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Selected Indicators ({getFormattedSelectedFilters().length})
              </span>
              {getFormattedSelectedFilters().length > 0 && (
                <button
                  onClick={() => setShowSelectionPopup(true)}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                  title="View selected MWS and villages"
                >
                  <Table className="w-3 h-3" />
                  View Selection
                </button>
              )}
            </div>
            <div className="mt-2 max-h-[150px] overflow-y-auto pr-2">
              <div className="space-y-2">
                {getFormattedSelectedFilters().map((filter, index) => (
                  <div key={index} className="flex items-center justify-between gap-2">
                    <div className="flex-1 flex items-center bg-gray-50 rounded px-2 py-1.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col gap-y-0.5 text-[10px]">
                          <div className="flex gap-x-1">
                            <span className="text-gray-900 font-medium">
                              {filter.filterName}
                            </span>
                            <span className="text-gray-400">-</span>
                          </div>
                          {filter.values.map((value, valueIndex) => (
                            <span key={valueIndex} className="text-gray-500 pl-1">
                              {value}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => handleIndicatorRemoval(filter)}
                        className={`text-gray-400 hover:text-gray-600 ml-2 ${toggleStates[filter.name] && filter.layer_store?.[0] !== "waterbody"
                          ? "invisible"
                          : "visible"
                          }`}
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          viewBox="0 0 12 12"
                        >
                          <path
                            d="M8.5 3.5l-5 5M3.5 3.5l5 5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    </div>

                    {/* {filter.name !== "area_wide_scale_restoration" && filter.name !== "area_protection" && 
                    <ToggleButton
                      isOn={toggleStates[filter.name]}
                      toggleSwitch={() => handleLayerSelection(filter)}
                    />} */}
                  </div>
                ))}
              </div>
            </div>
            {getFormattedSelectedFilters().length > 0 && (
              <div className="mt-4 text-xs text-gray-600">
                {selectedMWS !== null && selectedMWS.length === 0 && selectedVillages !== null && selectedVillages.size === 0
                  ? "There are no micro-watersheds and villages that matches your selected Filters."
                  : `The map on the left shows ${selectedMWS.length} micro-watersheds and ${selectedVillages.size} corresponding villages based on your selected filters.`}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-100 p-3 mt-2">
            <span className="text-sm font-medium">
              Selected Patterns ({getFormattedSelectedPatterns().length})
            </span>
            <div className="mt-2 max-h-[150px] overflow-y-auto pr-2">
              <div className="space-y-2">
                {getFormattedSelectedPatterns().map((pattern, index) => (
                  <div key={index} className="flex items-center justify-between gap-2">
                    <div className="flex-1 flex items-center bg-gray-50 rounded px-2 py-1.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-x-1 text-[10px]">
                          <span className="text-gray-900 font-medium">
                            {pattern.category}
                          </span>
                          <span className="text-gray-400">-</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handlePatternRemoval(pattern)}
                        className={`text-gray-400 hover:text-gray-600 ml-2 ${toggleStates[pattern.patternName] ? "invisible" : "visible"
                          }`}
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          viewBox="0 0 12 12"
                        >
                          <path
                            d="M8.5 3.5l-5 5M3.5 3.5l5 5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {clickedWaterbodyId && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded mt-3">
              <p className="font-semibold text-blue-800">
                Waterbody Selected: {clickedWaterbodyId}
              </p>
              <button
                onClick={() => window.open(waterbodyDashboardUrl, "_blank")}
                className="mt-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Click to View Dashboard →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default KYLRightSidebar; 