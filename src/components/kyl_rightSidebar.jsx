// src/components/kyl_rightSidebar.jsx
import React from "react";
import SelectButton from "./buttons/select_button";
import filtersDetails from "../components/data/Filters.json";
import { ArrowLeft, Loader2, Table, FileText, FileSpreadsheet, X, ChevronRight } from 'lucide-react';
import KYLMWSProfilePanel from "./kyl_MWSProfilePanel.jsx";
import KYLWaterbodyPanel from "./kyl_waterbodypanel.jsx";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  getFormattedSelectedFilters,
  getFormattedSelectedPatterns,
  handlePatternRemoval,
  selectedMWS,
  selectedVillages,
  toggleStates,
  setToggleStates,
  currentLayer,
  setCurrentLayer,
  mapRef,
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
  showConnectivity,
  setShowConnectivity,
  mwsArrowLayerRef,
  villageJson = [],
  dataJson = [],
  selectedWaterbodyIds,
  mwsDrainageLayerRef
}) => {
  const [loadingWB, setLoadingWB] = React.useState(false);
  const [showSelectionPopup, setShowSelectionPopup] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);

  const showBothPanels = selectedMWSProfile && selectedWaterbodyProfile;

   const transformName = (name) => {
      if (!name) return name;
      return name
        .replace(/[()]/g, "")
        .replace(/\s+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "")
        .toLowerCase()
  };


  const mwsVillageIntersections = React.useMemo(() => {
    if (!selectedMWS || selectedMWS.length === 0 || !dataJson || !Array.isArray(dataJson)) return [];

    return selectedMWS.map(mwsId => {
      const mwsRecord = dataJson.find(d => String(d.mws_id) === String(mwsId));
      if (!mwsRecord) return { mwsId, villages: [], waterbodies: [] };

      // ── Villages ──
      const villages = (mwsRecord.mws_intersect_villages || []).map(villageId => {
        let villageName = '';

        // Try villageJson first
        if (villageJson && Array.isArray(villageJson)) {
          const v = villageJson.find(v => String(v.village_id) === String(villageId));
          if (v) villageName = v.village_name || v.vill_name || v.name || '';
        }

        // Fall back to boundary layer features
        if (!villageName && boundaryLayerRef?.current) {
          try {
            const f = boundaryLayerRef.current.getSource().getFeatures()
              .find(feat => {
                const p = feat.getProperties();
                return String(p.vill_ID ?? p.village_id) === String(villageId);
              });
            if (f) {
              const p = f.getProperties();
              villageName = p.vill_name || p.village_name || p.name || '';
            }
          } catch (_) {}
        }

        return { villageId: String(villageId), villageName: villageName || 'Unknown' };
      });

      // ── Waterbodies ──
      const waterbodies = (mwsRecord.mws_intersect_swb || []).map(swb => {
        if (typeof swb === 'object' && swb !== null) {
          return {
            swbId:      String(swb.swbId ?? swb.id ?? ''),
            swbName:    swb.swbName || swb.name || '',
            latitude:   Number(swb.latitude  ?? swb.lat  ?? 0),
            longitude:  Number(swb.longitude ?? swb.long ?? swb.lng ?? 0),
            ...swb,
          };
        }
        return { swbId: String(swb), swbName: '', latitude: 0, longitude: 0 };
      });

      return { mwsId: String(mwsId), villages, waterbodies };
    });
  }, [selectedMWS, dataJson, villageJson, boundaryLayerRef]);

  const handleUniversalBack = () => {
    onResetMWS();
    onResetWaterbody();
  };

  const handleIndicatorRemoval = (filter) => {
    if (toggleStates[filter.name]) {
      const layerToRemove = currentLayer.find((l) => l.name === filter.name);
      if (layerToRemove) {
        layerToRemove.layerRef.forEach((layer) => {
          if (mapRef.current) mapRef.current.removeLayer(layer);
        });
        setCurrentLayer((prev) => prev.filter((l) => l.name !== filter.name));
      }
    }
    setToggleStates((prevStates) => ({ ...prevStates, [filter.name]: false }));

    const sourceType = (function () {
      for (const topLevelKey of Object.keys(filtersDetails)) {
        if (filtersDetails[topLevelKey]) {
          for (const categoryKey of Object.keys(filtersDetails[topLevelKey])) {
            const found = filtersDetails[topLevelKey][categoryKey].find((f) => f.name === filter.name);
            if (found) return topLevelKey;
          }
        }
      }
      return null;
    })();

    if (sourceType === "MWS") {
      setFilterSelections((prev) => ({
        ...prev,
        selectedMWSValues: { ...prev.selectedMWSValues, [filter.name]: null },
      }));
    } else if (sourceType === "Village") {
      setFilterSelections((prev) => ({
        ...prev,
        selectedVillageValues: { ...prev.selectedVillageValues, [filter.name]: null },
      }));
    } else if (sourceType === "Waterbody") {
      setFilterSelections((prev) => ({
        ...prev,
        selectedWaterbodyValues: { ...prev.selectedWaterbodyValues, [filter.name]: null },
      }));
    }
  };

  const toggleWaterbodies = () => {
    if (!waterbodiesLayerRef.current) {
      console.warn("Waterbodies layer not loaded yet");
      return;
    }

    if (!showWB) {
      const source = waterbodiesLayerRef.current.getSource();

      if (source.getState() === "ready" && source.getFeatures().length > 0) {
        waterbodiesLayerRef.current.setZIndex(9998);
        mapRef.current.addLayer(waterbodiesLayerRef.current);
        setShowWB(true);
        return;
      }

      setLoadingWB(true);
      const onSourceChange = () => {
        if (source.getState() === "ready") {
          setLoadingWB(false);
          source.un("change", onSourceChange);
        }
      };
      source.on("change", onSourceChange);

      waterbodiesLayerRef.current.setZIndex(9998);
      mapRef.current.addLayer(waterbodiesLayerRef.current);
      setShowWB(true);
    } else {
      mapRef.current.removeLayer(waterbodiesLayerRef.current);
      setShowWB(false);
    }
  };

  const toggleConnectivity = () => {
    if (!mwsArrowLayerRef?.current) { console.warn("Arrow layer not ready"); return; }
    const newVisibility = !showConnectivity;
    mwsArrowLayerRef.current.setVisible(newVisibility);
    mwsDrainageLayerRef.current.setVisible(newVisibility)
    setShowConnectivity(newVisibility);
  };

  const handleTehsilReport = () => {
    const reportURL = `${process.env.REACT_APP_API_URL}/generate_tehsil_report/?state=${transformName(state?.label)}&district=${transformName(district?.label)}&block=${transformName(block?.label)}`;
    window.open(reportURL, '_blank', 'noopener,noreferrer');
  };

  const generateSelectionTableData = () => {
    const mwsData = [];
    const villageData = [];

    if (selectedMWS && selectedMWS.length > 0) {
      selectedMWS.forEach((mwsId, index) => {
        mwsData.push({ id: `${mwsId}-${index}`, name: String(mwsId) });
      });
    }

    if (selectedVillages && selectedVillages.size > 0) {
      let villageIndex = 0;
      selectedVillages.forEach((villageId) => {
        const villageIdStr = String(villageId);
        let vName = '';
        if (villageJson && Array.isArray(villageJson)) {
          const v = villageJson.find(v => String(v.village_id) === villageIdStr);
          if (v) vName = v.village_name || v.vill_name || v.name || '';
        }
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
          } catch (_) {}
        }
        villageData.push({
          id: `village-${villageIdStr}-${villageIndex}`,
          villageId: villageIdStr,
          villageName: vName || 'Unknown Village',
        });
        villageIndex++;
      });
    }

    return { mwsData, villageData };
  };

  // ─── WB property display resolver — uses cached precomputed props ───
  const getWBDisplayValue = (filterName, swb) => {
    if (filterName === "waterbody_type") {
      const raw = swb.waterbody_type;
      if (raw === undefined || raw === null) return "N/A";
      return raw === "river" ? "On River" : "Off River";
    }
    if (filterName === "drainage_line") {
      if (swb.wbDrainage === "onDrainage") return "On Drainage";
      if (swb.wbDrainage === "offDrainage") return "Off Drainage";
      const val = Number(swb.on_drainage_line ?? null);
      if (!isNaN(val)) return val === 1 ? "On Drainage" : "Off Drainage";
      return "N/A";
    }
    if (filterName === "surface_water_trend") {
      const trend = swb.wbTrend;
      if (!trend) return "N/A";
      return trend.charAt(0).toUpperCase() + trend.slice(1);
    }
    if (filterName === "waterbody_size") {
      const area = Number(swb.area_ored ?? swb.AREA_HA ?? 0);
      if (isNaN(area)) return "N/A";
      if (area < 1) return "Small (<1 ha)";
      if (area < 5) return "Medium (1–5 ha)";
      if (area < 10) return "Large (5–10 ha)";
      return "Very Large (>10 ha)";
    }
    return "N/A";
  };

  const downloadPDF = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const { mwsData, villageData } = generateSelectionTableData();

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
                const viewport = map.getViewport();
                viewport.querySelectorAll('canvas').forEach((layerCanvas) => {
                  if (layerCanvas.width > 0) {
                    const parentOpacity = layerCanvas.parentNode.style.opacity;
                    ctx.globalAlpha = parentOpacity !== "" ? parseFloat(parentOpacity) : 1;
                    const transform = layerCanvas.style.transform;
                    if (transform) {
                      const matrix = transform.match(/^matrix\(([^)]*)\)$/)?.[1].split(',').map(Number);
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

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.width;

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
        if (yPos + imgH > doc.internal.pageSize.height - 15) { doc.addPage(); yPos = 20; }
        doc.addImage(mapImageData, 'JPEG', 14, yPos, imgW, imgH);
        yPos += imgH + 8;
      } else {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(160, 160, 160);
        doc.text('(Map screenshot could not be captured)', 14, yPos + 4);
        yPos += 12;
      }

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
              const villagesStr = mwsGroup ? mwsGroup.villages.map(v => `${v.villageName || 'Unknown'} (${v.villageId})`).join(', ') : 'None';
              const swbStr = mwsGroup && mwsGroup.waterbodies?.length > 0
                ? mwsGroup.waterbodies.map(swb => swb.swbName ? `${swb.swbName} (${swb.swbId})` : swb.swbId).join(', ')
                : 'None';
              return [i + 1, item.name, villagesStr, swbStr];
            }),
            theme: 'grid',
            headStyles: { fillColor: [37, 99, 235], fontSize: 9 },
            bodyStyles: { fontSize: 8 },
            columnStyles: { 0: { cellWidth: 12, halign: 'center' }, 1: { cellWidth: 40 }, 2: { cellWidth: 70 }, 3: { cellWidth: 'auto' } },
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
            columnStyles: { 0: { cellWidth: 15, halign: 'center' }, 1: { cellWidth: 35 }, 2: { cellWidth: 'auto' } },
            margin: { left: 14, right: 14 },
          });
          yPos = doc.lastAutoTable.finalY + 8;
        }
      }

      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${pageCount}`, pageW / 2, doc.internal.pageSize.height - 8, { align: 'center' });
      }

      doc.save(`kyl_report_${transformName(state?.label) || 'report'}_${new Date().toISOString().split('T')[0]}.pdf`);
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

      const mwsFilters = [];
      const villageFilters = [];
      const waterbodyFilters = [];

      selectedFilters.forEach(f => {
        for (const topLevelKey of Object.keys(filtersDetails)) {
          for (const categoryKey of Object.keys(filtersDetails[topLevelKey] || {})) {
            if (Array.isArray(filtersDetails[topLevelKey][categoryKey]) &&
              filtersDetails[topLevelKey][categoryKey].some(i => i.name === f.name)) {
              if (topLevelKey === "MWS") mwsFilters.push(f);
              if (topLevelKey === "Village") villageFilters.push(f);
              if (topLevelKey === "Waterbody") waterbodyFilters.push(f);
            }
          }
        }
      });

      const getLabelFromValue = (filterName, value) => {
        for (const topLevelKey of Object.keys(filtersDetails)) {
          for (const categoryKey of Object.keys(filtersDetails[topLevelKey] || {})) {
            const filterObj = filtersDetails[topLevelKey][categoryKey].find(f => f.name === filterName);
            if (filterObj && filterObj.type === 1) {
              const match = filterObj.values.find(v => String(v.value) === String(value));
              return match ? match.label : value;
            }
          }
        }
        return value;
      };

      // Sheet 0 — Selected Filters
      const sheet0Data = selectedFilters.map((f, i) => ({
        "S.NO": i + 1,
        "INDICATOR NAME": f.filterName || f.name,
        "SELECTED VALUES": (f.values || []).join(", "),
      }));

      // Sheet 1 — Selected MWS
      const sheet1Data = mwsData.map(item => {
        const row = { "MICRO-WATERSHED ID": item.name };
        if (dataJson && Array.isArray(dataJson)) {
          const mRecord = dataJson.find(m => String(m.mws_id) === String(item.name));
          if (mRecord) {
            mwsFilters.forEach(f => {
              let val = mRecord[f.name];
              if (val === undefined || val === null) val = "N/A";
              else {
                val = getLabelFromValue(f.name, val);
                if (typeof val === "number") val = Number(val.toFixed(3));
              }
              row[(f.filterName || f.name).toUpperCase()] = val;
            });
          }
        }
        return row;
      });

      // Sheet 2 — Selected Villages
      const sheet2Data = villageData.map(item => {
        const row = { "VILLAGE ID": item.villageId, "VILLAGE NAME": item.villageName };
        if (villageJson && Array.isArray(villageJson)) {
          const vRecord = villageJson.find(v => String(v.village_id || v.vill_ID) === String(item.villageId));
          if (vRecord) {
            villageFilters.forEach(f => {
              let val = vRecord[f.name];
              if (val === undefined || val === null) val = "N/A";
              else {
                val = getLabelFromValue(f.name, val);
                if (typeof val === "number") val = Number(val.toFixed(3));
              }
              row[(f.filterName || f.name).toUpperCase()] = val;
            });
          }
        }
        return row;
      });

      // Sheet 3 — Selected Waterbodies
      // Uses getWBDisplayValue for correct resolution of precomputed cached props
      // selectedWaterbodyIds now populated from dataJsonIndex — works even when showWB is false
      const uniqueSwbs = new Map();
      mwsVillageIntersections.forEach(group => {
        group.waterbodies.forEach(swb => {
          if (!uniqueSwbs.has(swb.swbId) && selectedWaterbodyIds && selectedWaterbodyIds.has(String(swb.swbId))) {
            const row = {
              "SWB ID": swb.swbId,
              "WATERBODY NAME": swb.swbName || "Unknown",
              "LATITUDE": swb.latitude || 0,
              "LONGITUDE": swb.longitude || 0,
            };
            waterbodyFilters.forEach(f => {
              row[(f.filterName || f.name).toUpperCase()] = getWBDisplayValue(f.name, swb);
            });
            uniqueSwbs.set(swb.swbId, row);
          }
        });
      });
      const sheet3Data = Array.from(uniqueSwbs.values());

      // Sheet 4 — MWS-Village Intersections
      const sheet4Data = [];
      mwsVillageIntersections.forEach(group => {
        group.villages.forEach(v => {
          sheet4Data.push({ "MWS ID": group.mwsId, "VILLAGE ID": v.villageId, "VILLAGE NAME": v.villageName });
        });
      });

      // Sheet 5 — MWS-Waterbody Intersections
      const sheet5Data = [];
      mwsVillageIntersections.forEach(group => {
        group.waterbodies.forEach(swb => {
          sheet5Data.push({ "MWS ID": group.mwsId, "SWB ID": swb.swbId, "WATERBODY NAME": swb.swbName || "" });
        });
      });

      const workbook = XLSX.utils.book_new();
      const boldStyle = { font: { bold: true } };

      const activeSheets = [
        { sheet: XLSX.utils.json_to_sheet(sheet0Data), name: "Selected Filters", width: [{ wch: 8 }, { wch: 40 }, { wch: 60 }] },
      ];

      const mWidths = [{ wch: 25 }];
      mwsFilters.forEach(() => mWidths.push({ wch: 20 }));
      activeSheets.push({ sheet: XLSX.utils.json_to_sheet(sheet1Data), name: "Selected MWS", width: mWidths });

      if (villageFilters.length > 0) {
        const vWidths = [{ wch: 25 }, { wch: 40 }];
        villageFilters.forEach(() => vWidths.push({ wch: 20 }));
        activeSheets.push({ sheet: XLSX.utils.json_to_sheet(sheet2Data), name: "Selected Villages", width: vWidths });
      }

      if (sheet3Data.length > 0) {
        // All WB filter columns included — no skip needed since getWBDisplayValue handles all
        const wbWidths = [{ wch: 25 }, { wch: 40 }, { wch: 18 }, { wch: 18 }];
        waterbodyFilters.forEach(() => wbWidths.push({ wch: 22 }));
        activeSheets.push({ sheet: XLSX.utils.json_to_sheet(sheet3Data), name: "Selected Waterbodies", width: wbWidths });
      }

      activeSheets.push({ sheet: XLSX.utils.json_to_sheet(sheet4Data), name: "MWS-Village Intersects", width: [{ wch: 25 }, { wch: 25 }, { wch: 40 }] });
      activeSheets.push({ sheet: XLSX.utils.json_to_sheet(sheet5Data), name: "MWS-Waterbody Intersects", width: [{ wch: 25 }, { wch: 25 }, { wch: 40 }] });

      activeSheets.forEach(({ sheet, name, width }) => {
        if (sheet["!ref"]) {
          const range = XLSX.utils.decode_range(sheet["!ref"]);
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const addr = XLSX.utils.encode_cell({ r: 0, c: C });
            if (sheet[addr]) sheet[addr].s = boldStyle;
          }
        }
        sheet["!cols"] = width;
        XLSX.utils.book_append_sheet(workbook, sheet, name);
      });

      XLSX.writeFile(workbook, `kyl_selection_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Excel generation error:', error);
      alert('Error generating Excel file.');
    }
  };

  // ─── Selection Popup ─────────────────────────────────────────────────────
  const SelectionPopup = () => {
    const [activeTab, setActiveTab] = React.useState('mws');
    if (!showSelectionPopup) return null;

    const { mwsData, villageData } = generateSelectionTableData();
    const seenVillageIds = new Set();

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

    const selectedFiltersCount = getFormattedSelectedFilters();
    const selectedPatternsCount = getFormattedSelectedPatterns();

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

    const hasVillagePattern = selectedPatternsCount.some(p => p.level);

    const sheet1Count = mwsData.length;
    const sheet2Count = villageData.length;
    const sheet3Count = waterbodyData.length;
    const sheet4Count = mwsVillageIntersections.reduce((acc, curr) => acc + (curr.villages?.length || 0), 0);
    const sheet5Count = mwsVillageIntersections.reduce((acc, curr) => acc + (curr.waterbodies?.length || 0), 0);

    const tabs = [
      { key: 'mws', label: 'Watersheds', count: mwsData.length, always: true, color: 'blue' },
      { key: 'villages', label: 'Villages', count: villageData.length, always: false, show: hasVillageFilter, color: 'green' },
      { key: 'waterbodies', label: 'Waterbodies', count: waterbodyData.length, always: false, show: hasWaterbodyFilter, color: 'cyan' },
    ];

    return (
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-50"
        onClick={() => setShowSelectionPopup(false)}
      >
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col mx-4"
          onClick={e => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
            <div>
              <h3 className="text-base font-bold text-gray-800 tracking-tight">Selection Details</h3>
              <p className="text-xs text-gray-400 mt-0.5">{totalItems} items across {mwsData.length} watersheds</p>
            </div>

            <div className="flex items-center gap-2">
              {/* Tabs */}
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                {tabs.filter(t => t.always || t.show).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 flex items-center gap-1.5 ${
                      activeTab === tab.key
                        ? 'bg-white text-gray-800 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      activeTab === tab.key ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>{tab.count}</span>
                  </button>
                ))}
              </div>

              {/* Download buttons */}
              <button
                onClick={downloadPDF}
                disabled={isDownloading}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                  isDownloading
                    ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
                    : 'border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300'
                }`}
              >
                {isDownloading ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /><span>Generating…</span></>
                ) : (
                  <><FileText className="w-3 h-3" /><span>PDF</span></>
                )}
              </button>

              <button
                onClick={downloadExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-all"
              >
                <FileSpreadsheet className="w-3 h-3" />
                <span>Excel</span>
              </button>

              <button
                onClick={() => setShowSelectionPopup(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Tab Content ── */}
          <div className="overflow-y-auto flex-1 p-4 bg-gray-50/50">

            {/* MWS Tab */}
            {activeTab === 'mws' && (
              mwsData.length > 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gradient-to-r from-purple-600 to-purple-500 text-white">
                        <th className="text-left px-4 py-2.5 font-semibold w-8">#</th>
                        <th className="text-left px-4 py-2.5 font-semibold">Watershed ID</th>
                        <th className="text-center px-4 py-2.5 font-semibold">Report</th>
                        <th className="text-left px-4 py-2.5 font-semibold">Intersecting Villages</th>
                        <th className="text-left px-4 py-2.5 font-semibold">Intersecting Waterbodies</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {mwsData.map((item, i) => {
                        const mwsGroup = mwsVillageIntersections.find(g => g.mwsId === item.name);
                        return (
                          <tr key={item.id} className="hover:bg-blue-50/30 align-top transition-colors">
                            <td className="px-4 py-2.5 text-gray-400 font-mono">{i + 1}</td>
                            <td className="px-4 py-2.5">
                              <span className="font-mono text-gray-800 bg-gray-100 px-2 py-0.5 rounded text-[11px]">{item.name}</span>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <a
                                href={`https://geoserver.core-stack.org/api/v1/generate_mws_report/?state=${transformName(state?.label)}&district=${transformName(district?.label)}&block=${transformName(block?.label)}&uid=${item.name}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold"
                              >
                                View <ChevronRight className="w-3 h-3" />
                              </a>
                            </td>
                            <td className="px-4 py-2.5">
                              {mwsGroup && mwsGroup.villages.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
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
                                      <span
                                        key={v.villageId}
                                        title={`${isSelected ? 'Matches filter' : 'Intersects'} | ID: ${v.villageId}`}
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                          isSelected
                                            ? 'bg-emerald-500 border-emerald-600 text-white'
                                            : 'bg-violet-50 border-violet-200 text-violet-700'
                                        }`}
                                      >
                                        {v.villageName || 'Unknown'}
                                        <span className="opacity-70 font-mono text-[9px]">({v.villageId})</span>
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-gray-300 italic text-[10px]">No intersections</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5">
                              {(() => {
                                // Directly read from dataJson — most reliable source,
                                // doesn't depend on WB layer being loaded or selectedWaterbodyIds timing
                                const mwsRecord = dataJson?.find(d => d.mws_id === item.name);
                                const allSwbs = mwsRecord?.mws_intersect_swb || [];

                                if (allSwbs.length === 0) {
                                  return <span className="text-gray-300 italic text-[10px]">None</span>;
                                }

                                return (
                                  <div className="flex flex-wrap gap-1">
                                    {allSwbs.map(swb => {
                                      const swbIdStr = typeof swb === 'object' ? String(swb.swbId) : String(swb);
                                      const swbName = typeof swb === 'object' ? (swb.swbName || '') : '';

                                      // Green if WB filter is active and this WB matched it
                                      // Blue if just a structural intersection
                                      const isFilterMatched = hasWaterbodyFilter &&
                                        selectedWaterbodyIds &&
                                        selectedWaterbodyIds.has(swbIdStr);

                                      return (
                                        <span
                                          key={swbIdStr}
                                          title={`${isFilterMatched ? 'Matches filter' : 'Structural intersection'} | ID: ${swbIdStr}`}
                                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
                                            isFilterMatched
                                              ? 'bg-emerald-500 border-emerald-600 text-white'
                                              : 'bg-sky-50 border-sky-200 text-sky-700'
                                          }`}
                                        >
                                          {swbName ? `${swbName} (${swbIdStr})` : swbIdStr}
                                        </span>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                    <Table className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-medium">No micro-watersheds selected</p>
                  <p className="text-xs mt-1">Apply a filter to see results here</p>
                </div>
              )
            )}

            {/* Villages Tab */}
            {activeTab === 'villages' && (
              villageData.length > 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white">
                        <th className="text-left px-4 py-2.5 font-semibold w-8">#</th>
                        <th className="text-left px-4 py-2.5 font-semibold">Village ID</th>
                        <th className="text-left px-4 py-2.5 font-semibold">Village Name</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {villageData.map((item, i) => (
                        <tr key={item.id} className="hover:bg-emerald-50/30 transition-colors">
                          <td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
                          <td className="px-4 py-2.5">
                            <span className="font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded text-[11px]">{item.villageId}</span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-800 font-medium">{item.villageName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <p className="text-sm font-medium">No filter-matched villages found</p>
                </div>
              )
            )}

            {/* Waterbodies Tab */}
            {activeTab === 'waterbodies' && (
              waterbodyData.length > 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gradient-to-r from-cyan-600 to-cyan-500 text-white">
                        <th className="text-left px-4 py-2.5 font-semibold w-8">#</th>
                        <th className="text-left px-4 py-2.5 font-semibold">SWB ID</th>
                        <th className="text-left px-4 py-2.5 font-semibold">Waterbody Name</th>
                        <th className="text-left px-4 py-2.5 font-semibold">Coordinates</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {waterbodyData.map((swb, i) => (
                        <tr key={swb.swbId} className="hover:bg-cyan-50/30 transition-colors">
                          <td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
                          <td className="px-4 py-2.5">
                            <span className="font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded text-[11px]">{swb.swbId}</span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-800 font-medium">{swb.swbName || 'Unknown'}</td>
                          <td className="px-4 py-2.5 font-mono text-gray-400 text-[10px]">
                            {swb.latitude?.toFixed(5)}, {swb.longitude?.toFixed(5)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <p className="text-sm font-medium">No waterbodies in selection</p>
                </div>
              )
            )}
          </div>

          {/* ── Footer ── */}
          <div className="px-6 py-3 border-t border-gray-100 bg-white flex justify-between items-center flex-shrink-0">
            {/* Excel sheet counts */}
            <div className="flex items-center gap-3">
              {[
                { label: "MWS", count: sheet1Count, color: "text-blue-600" },
                { label: "Villages", count: sheet2Count, color: "text-emerald-600", show: hasVillageFilter },
                { label: "Waterbodies", count: sheet3Count, color: "text-cyan-600", show: hasWaterbodyFilter },
                { label: "MWS ∩ Villages", count: sheet4Count, color: "text-violet-600" },
                { label: "MWS ∩ Waterbodies", count: sheet5Count, color: "text-indigo-600" },
              ].filter(s => s.show !== false).map((stat, i, arr) => (
                <React.Fragment key={stat.label}>
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] uppercase text-gray-400 font-bold tracking-widest leading-none mb-0.5">{stat.label}</span>
                    <span className={`${stat.color} font-bold text-base leading-none`}>{stat.count}</span>
                  </div>
                  {i < arr.length - 1 && <div className="w-px h-6 bg-gray-200" />}
                </React.Fragment>
              ))}
            </div>

            <button
              onClick={() => setShowSelectionPopup(false)}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ─── Shared section header component ─────────────────────────────────────
  const SectionHeader = ({ title, count, action }) => (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-700">{title}</span>
        {count !== undefined && (
          <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">{count}</span>
        )}
      </div>
      {action}
    </div>
  );

  return (
    <div className="w-[320px] flex flex-col gap-2">
      <SelectionPopup />

      {/* Universal Back Button */}
      {showBothPanels && (
        <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
          <button
            onClick={handleUniversalBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Map
          </button>
        </div>
      )}

      {selectedMWSProfile && (
        <KYLMWSProfilePanel mwsData={selectedMWSProfile} onBack={onResetMWS} hideBackButton={showBothPanels} />
      )}

      {selectedWaterbodyProfile && (
        <KYLWaterbodyPanel waterbody={selectedWaterbodyProfile} onBack={onResetWaterbody} hideBackButton={showBothPanels} />
      )}

      {!selectedMWSProfile && !selectedWaterbodyProfile && (
        <div className="flex flex-col gap-2">

          {/* ── Hint banner ── */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2">
            <p className="text-[11px] text-indigo-600 font-medium">
              Click on a micro-watershed (blue outline) to view its report.
            </p>
          </div>

          {/* ── Location selector ── */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="space-y-3">
              {[
                { label: "State", val: state, setVal: setState, data: statesData },
                { label: "District", val: district, setVal: setDistrict, data: state?.district ?? null },
                { label: "Tehsil", val: block, setVal: setBlock, data: district?.blocks ?? null },
              ].map(({ label, val, setVal, data }) => (
                <div key={label} className="flex items-center gap-3">
                  <label className="text-xs font-medium text-gray-500 w-12 shrink-0">{label}</label>
                  <SelectButton
                    currVal={val || { label: `Select ${label}` }}
                    stateData={data}
                    handleItemSelect={handleItemSelect}
                    setState={setVal}
                    className="w-full"
                  />
                </div>
              ))}
            </div>

            {block && (
              <div className="mt-4 flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleTehsilReport}
                    className="flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7s-8.268-2.943-9.542-7z" />
                    </svg>
                    Tehsil Report
                  </button>

                  <button
                    onClick={toggleWaterbodies}
                    disabled={loadingWB}
                    className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-colors border ${
                      showWB
                        ? 'text-red-600 bg-red-50 hover:bg-red-100 border-red-100'
                        : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
                    }`}
                  >
                    {loadingWB ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" />Loading…</>
                    ) : showWB ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2C12 2 7 8 7 12a5 5 0 0 0 8.6 3.5" />
                          <line x1="3" y1="3" x2="21" y2="21" />
                        </svg>
                        Hide Waterbodies
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2C12 2 7 8 7 12a5 5 0 0 0 10 0c0-4-5-10-5-10z" />
                        </svg>
                        Show Waterbodies
                      </>
                    )}
                  </button>
                </div>

                <button
                  onClick={toggleConnectivity}
                  className={`w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-colors border ${
                    showConnectivity
                      ? 'text-red-600 bg-red-50 hover:bg-red-100 border-red-100'
                      : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-indigo-100'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="5" cy="12" r="2" /><circle cx="19" cy="5" r="2" /><circle cx="19" cy="19" r="2" />
                    <line x1="7" y1="12" x2="17" y2="6" /><line x1="7" y1="12" x2="17" y2="18" />
                  </svg>
                  {showConnectivity ? "Hide MWS Connectivity" : "Show MWS Connectivity"}
                </button>
              </div>
            )}
          </div>

          {/* ── Selected Indicators ── */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <SectionHeader
              title="Selected Indicators"
              count={getFormattedSelectedFilters().length}
              action={
                getFormattedSelectedFilters().length > 0 && (
                  <button
                    onClick={() => setShowSelectionPopup(true)}
                    className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-100"
                  >
                    <Table className="w-3 h-3" />
                    View Selection
                  </button>
                )
              }
            />

            {getFormattedSelectedFilters().length > 0 ? (
              <>
                <div className="max-h-[160px] overflow-y-auto pr-1 space-y-1.5">
                  {getFormattedSelectedFilters().map((filter, index) => (
                    <div key={index} className="flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2 group">
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-gray-700 truncate">{filter.filterName}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {filter.values.map((value, vi) => (
                            <span key={vi} className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-medium">{value}</span>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => handleIndicatorRemoval(filter)}
                        className={`text-gray-300 hover:text-red-400 mt-0.5 transition-colors shrink-0 ${
                          toggleStates[filter.name] && filter.layer_store?.[0] !== "waterbody" ? "invisible" : ""
                        }`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100">
                  {selectedMWS !== null && selectedMWS.length === 0 && selectedVillages !== null && selectedVillages.size === 0 ? (
                    <p className="text-[11px] text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">
                      No micro-watersheds or villages match the selected filters.
                    </p>
                  ) : (
                    <div className="flex gap-2">
                      <div className="flex-1 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-center">
                        <p className="text-lg font-bold text-blue-600 leading-none">{selectedMWS?.length ?? 0}</p>
                        <p className="text-[10px] text-blue-400 font-medium mt-0.5">Watersheds</p>
                      </div>
                      <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 text-center">
                        <p className="text-lg font-bold text-emerald-600 leading-none">{selectedVillages?.size ?? 0}</p>
                        <p className="text-[10px] text-emerald-400 font-medium mt-0.5">Villages</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-[11px] text-gray-400 italic text-center py-3">
                No indicators selected. Use the left panel to apply filters.
              </p>
            )}
          </div>

          {/* ── Selected Patterns ── */}
          {getFormattedSelectedPatterns().length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <SectionHeader title="Selected Patterns" count={getFormattedSelectedPatterns().length} />
              <div className="max-h-[140px] overflow-y-auto pr-1 space-y-1.5">
                {getFormattedSelectedPatterns().map((pattern, index) => (
                  <div key={index} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-gray-700 truncate">{pattern.category}</p>
                      {pattern.patternName && pattern.patternName !== pattern.category && (
                        <p className="text-[10px] text-gray-400 mt-0.5">{pattern.patternName}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handlePatternRemoval(pattern)}
                      className={`text-gray-300 hover:text-red-400 transition-colors shrink-0 ${
                        toggleStates[pattern.patternName] ? "invisible" : ""
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Clicked Waterbody (legacy) ── */}
          {clickedWaterbodyId && (
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-sky-800 mb-2">Waterbody: {clickedWaterbodyId}</p>
              <button
                onClick={() => window.open(waterbodyDashboardUrl, "_blank")}
                className="w-full py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                View Dashboard →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default KYLRightSidebar;