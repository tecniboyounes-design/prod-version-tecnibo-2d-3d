import React, { useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { setDragging, setLoading } from '@/store';

const withDraggable = (WrappedComponent) => {
  return (props) => {
    const { id, initialPosition = { x: null, y: null } } = props;
    const [position, setPosition] = useState(initialPosition);
    const [isDragging, setIsDraggingState] = useState(false); // For UI updates
    const isDraggingRef = useRef(false); // For event logic
    const offsetRef = useRef({ offsetX: 0, offsetY: 0 });
    const dispatch = useDispatch();

    const handleMouseDown = (e) => {
      console.log('Mouse Down: Starting drag');
      dispatch(setDragging(true)); 
      dispatch(setLoading(true)); 
      e.stopPropagation();
      setIsDraggingState(true);
      isDraggingRef.current = true;

      const offsetX = e.clientX - (position.x ?? e.clientX);
      const offsetY = e.clientY - (position.y ?? e.clientY);
      offsetRef.current = { offsetX, offsetY };

      console.log('Mouse Down: Calculated offsets', offsetRef.current);

      // Add global event listeners for drag tracking
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e) => {
      if (!isDraggingRef.current) {
        console.log('Mouse Move: Not dragging, exiting');
        return;
      }

      console.log('Mouse Move: Dragging in progress');
      const { offsetX, offsetY } = offsetRef.current;
      const newPosition = {
        x: e.clientX - offsetX,
        y: e.clientY - offsetY,
      };
      console.log('Mouse Move: New position', newPosition);

      setPosition(newPosition);
    };

    const handleMouseUp = () => {
      console.log('Mouse Up: Dragging ended');
      dispatch(setDragging(false)); 
      dispatch(setLoading(false));  
      setIsDraggingState(false);
      isDraggingRef.current = false;

      // Clean up event listeners
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    const handleDragStart = (e) => {
      console.log(`Drag Start: ${id}`, props.item);
      if (!props.item) {
        console.error("No item to drag!");
        return;
      }
      e.dataTransfer.setData("application/item", JSON.stringify(props.item));
    };
    
    
    
    return (
      <div
        style={{
          position: position.x !== null && position.y !== null ? 'absolute' : 'static',
          top: position.y !== null ? position.y : undefined,
          left: position.x !== null ? position.x : undefined,
          cursor: isDragging ? 'grabbing' : 'grab',
          backgroundColor: isDragging ? 'rgba(0, 123, 255, 0.2)' : 'transparent',
          border: isDragging ? '2px dashed #007bff' : 'none',
          borderRadius: isDragging ? '8px' : 'none',
          transition: 'background-color 0.3s ease, border 0.3s ease',
        }}
        draggable="true" 
        onMouseDown={handleMouseDown}
        onDragStart={handleDragStart}
        id={`draggable-${id}`}
      >
        <WrappedComponent {...props} position={position} />
      </div>
    );
  };
};

export default withDraggable;
