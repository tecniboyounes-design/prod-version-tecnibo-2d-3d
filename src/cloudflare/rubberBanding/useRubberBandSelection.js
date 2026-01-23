// src/cloudflare/rubberBanding/useRubberBandSelection.js
//
// Standalone rubber-band multi-selection hook (no UI).
// Adapted from src/Rubber-Banding/File-Manager-main/File-Manager-main/hooks/use-file-manager.ts
// to keep marquee selection, ctrl/cmd toggle, and shift range selection.

import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * @param {Object} params
 * @param {Array<any>} params.items - Ordered list of items currently rendered.
 * @param {(item:any)=>string} [params.getKey] - Extracts stable key from item (default: item.path || item.id).
 * @returns {{
 *  selectedKeys: Set<string>,
 *  setSelectedKeys: React.Dispatch<React.SetStateAction<Set<string>>>,
 *  containerRef: React.RefObject<HTMLElement>,
 *  itemRefs: React.MutableRefObject<Map<string, HTMLElement>>,
 *  isSelecting: boolean,
 *  selectionBox: {x:number,y:number,width:number,height:number},
 *  handleMouseDown: (e: React.MouseEvent) => void,
 *  handleItemClick: (item:any, e: React.MouseEvent) => void,
 *  clearSelection: () => void,
 * }}
 */
export function useRubberBandSelection({ items = [], getKey } = {}) {
  const keyFor = useCallback(
    (it) => {
      if (getKey) return String(getKey(it) || '');
      return String(it?.path || it?.id || '');
    },
    [getKey]
  );

  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const itemRefs = useRef(new Map());

  
  const clearSelection = useCallback(() => {
    setSelectedKeys(new Set());
  }, []);


  const handleItemClick = useCallback(
    (item, event) => {
      const key = keyFor(item);
      if (!key) return;

      const isToggle = event?.metaKey || event?.ctrlKey;
      const isRange = event?.shiftKey && selectedKeys.size > 0;

      if (isRange) {
        const orderedKeys = items.map((it) => keyFor(it)).filter(Boolean);
        const last = Array.from(selectedKeys).pop();
        const startIdx = orderedKeys.indexOf(last);
        const endIdx = orderedKeys.indexOf(key);
        if (startIdx === -1 || endIdx === -1) {
          setSelectedKeys(new Set([key]));
          return;
        }
        const [from, to] = [Math.min(startIdx, endIdx), Math.max(startIdx, endIdx)];
        const range = orderedKeys.slice(from, to + 1);
        setSelectedKeys((prev) => {
          const next = new Set(prev);
          range.forEach((k) => next.add(k));
          return next;
        });
        return;
      }

      setSelectedKeys((prev) => {
        const next = isToggle ? new Set(prev) : new Set();
        if (isToggle && next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    },
    [items, keyFor, selectedKeys]
  );


  
  const handleMouseDown = useCallback(
    (event) => {
      if (!containerRef.current) return;
      if (event.button !== 0) return;

      // Skip marquee if the user is interacting with an input/control (e.g., rename text field).
      const ignoreTarget = event.target?.closest('input, textarea, select, button, [data-rb-ignore="true"]');
      if (ignoreTarget) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      dragStartRef.current = { x, y };
      setSelectionBox({ x, y, width: 0, height: 0 });
      setIsSelecting(true);
      console.debug('[rb] drag start', { x, y });

      if (!event.metaKey && !event.ctrlKey) {
        setSelectedKeys(new Set());
      }
    },
    []
  );

  useEffect(() => {
    if (!isSelecting) return;

    const handleMove = (event) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const currentX = event.clientX - rect.left;
      const currentY = event.clientY - rect.top;

      const x = Math.min(dragStartRef.current.x, currentX);
      const y = Math.min(dragStartRef.current.y, currentY);
      const width = Math.abs(currentX - dragStartRef.current.x);
      const height = Math.abs(currentY - dragStartRef.current.y);

      setSelectionBox({ x, y, width, height });

      const next = new Set(selectedKeys);
      for (const [key, el] of itemRefs.current.entries()) {
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const rx = r.left - rect.left;
        const ry = r.top - rect.top;
        const overlaps = x < rx + r.width && x + width > rx && y < ry + r.height && y + height > ry;
        if (overlaps) next.add(key);
      }
      setSelectedKeys(next);
    };

    const handleUp = () => {
      setIsSelecting(false);
      setSelectionBox({ x: 0, y: 0, width: 0, height: 0 });
      console.debug('[rb] drag end', { count: selectedKeys.size });
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [isSelecting, selectedKeys, keyFor]);

  return {
    selectedKeys,
    setSelectedKeys,
    clearSelection,
    containerRef,
    itemRefs,
    isSelecting,
    selectionBox,
    handleMouseDown,
    handleItemClick,
  };
}
