// /app/ifc_test/Home.jsx
'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { MOUSE } from 'three';
import { Provider } from 'react-redux';
import store from '../store'; // adjust if path is ../store
import TestScene from './test-scene';
import TopDownCamera from './camera/TopDownCamera';
import useInitRoomIfcDrawing from './hooks/useInitRoomIfcDrawing';

function PreviewWall({ segment, wallHeight = 2.8 }) {
  if (!segment) return null;
  const { from, to } = segment;

  const dx = to.x - from.x;
  const dz = to.y - from.y;
  const length = Math.hypot(dx, dz);
  const angle = Math.atan2(dz, dx);

  const cx = (from.x + to.x) / 2;
  const cz = (from.y + to.y) / 2;

  return (
    <mesh position={[cx, wallHeight / 2, cz]} rotation={[0, -angle, 0]}>
      <boxGeometry args={[length, wallHeight, 0.05]} />
      <meshStandardMaterial color="#38bdf8" opacity={0.4} transparent />
    </mesh>
  );
}

export default function Home() {
  const showHelpers = process.env.NODE_ENV === 'development';
  const [actions, setActions] = useState(null);
  const [busy, setBusy] = useState(false);

  const [viewMode, setViewMode] = useState('2D'); // '2D' | '3D'
  const is2D = viewMode === '2D';

  const [drawEnabled, setDrawEnabled] = useState(false);

  const controlsRef = useRef(null);

  const roomCenter = useMemo(() => [1.5, 0, 1.5], []);
  const default3DPosition = useMemo(() => [3, 3, 3], []);
  const WALL_HEIGHT = 2.8;
  const GRID_SIZE = 50;

  const {
    handleClick: handleDrawClick,
    handlePointerMove: handleDrawMove,
    previewSegment,
    reset: resetDrawing,
  } = useInitRoomIfcDrawing({ enabled: is2D && drawEnabled });

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setDrawEnabled(false);
        resetDrawing();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [resetDrawing]);

  const handleToggleView = () => {
    setViewMode((prev) => {
      const next = prev === '2D' ? '3D' : '2D';
      if (next === '3D') {
        setDrawEnabled(false);
        resetDrawing();
      }
      return next;
    });
  };

  const handleToggleDraw = () => {
    setViewMode((prev) => (prev === '3D' ? '2D' : prev));
    setDrawEnabled((prev) => {
      const next = !prev;
      resetDrawing();
      return next;
    });
  };

  return (
    <Provider store={store}>
      {/* Fullscreen container */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          overflow: 'hidden',
        }}
      >
        <Canvas
          camera={{ position: [3, 3, 3], fov: 50 }}
          style={{ width: '100%', height: '100%' }}
        >
          <TopDownCamera
            mode={viewMode}
            center={roomCenter}
            distance={10}
            default3DPosition={default3DPosition}
            controlsRef={controlsRef}
          />

          <color attach="background" args={['#000000']} />
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 5, 5]} />

          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[roomCenter[0], 0, roomCenter[2]]}
            onClick={is2D && drawEnabled ? handleDrawClick : undefined}
            onPointerMove={is2D && drawEnabled ? handleDrawMove : undefined}
          >
            {/* ✅ clickable area now as big as the grid */}
            <planeGeometry args={[GRID_SIZE, GRID_SIZE]} />
            <meshBasicMaterial visible={false} />
          </mesh>


          <PreviewWall segment={previewSegment} wallHeight={WALL_HEIGHT} />

          <TestScene
            setActions={setActions}
            is2D={is2D}
            controlsRef={controlsRef}
          />

          {/* {showHelpers && ( */}
            <>
              <gridHelper
                args={[GRID_SIZE, GRID_SIZE, '#888', '#444']}
                position={[roomCenter[0], 0, roomCenter[2]]}
              />
              <axesHelper
                args={[4]}
                position={[roomCenter[0], 0, roomCenter[2]]}
              />
            </>
          {/* )} */}


          <OrbitControls
            ref={controlsRef}
            enableRotate={!is2D}
            enablePan
            enableZoom
            target={roomCenter}
            mouseButtons={{
              LEFT: is2D ? MOUSE.PAN : MOUSE.ROTATE,
              MIDDLE: MOUSE.DOLLY,
              RIGHT: MOUSE.PAN,
            }}
          />
        </Canvas>

        {/* Buttons overlay – unchanged */}
        <div
          style={{
            position: 'absolute',
            right: 16,
            top: 16,
            display: 'flex',
            gap: 8,
            padding: 12,
            background: 'rgba(255,255,255,0.9)',
            border: '1px solid #ddd',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            zIndex: 20,
            alignItems: 'center',
          }}
        >
          <button
            onClick={handleToggleView}
            style={{
              padding: '10px 14px',
              borderRadius: 6,
              border: '1px solid #4b5563',
              background: is2D ? '#f3f4f6' : '#111827',
              color: is2D ? '#111827' : '#f9fafb',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {is2D ? 'Switch to 3D' : 'Switch to 2D'}
          </button>

          <button
            onClick={handleToggleDraw}
            disabled={!is2D}
            style={{
              padding: '10px 14px',
              borderRadius: 6,
              border: '1px solid #16a34a',
              background: drawEnabled ? '#16a34a' : '#dcfce7',
              color: drawEnabled ? '#f9fafb' : '#166534',
              cursor: is2D ? 'pointer' : 'not-allowed',
              fontWeight: 500,
            }}
          >
            {drawEnabled ? 'Stop drawing (Esc)' : 'Draw IFC walls'}
          </button>

          <button
            onClick={() => actions?.exportGLB()}
            disabled={!actions || busy}
            style={{
              padding: '10px 14px',
              borderRadius: 6,
              border: '1px solid #bbb',
              background: 'black',
              cursor: actions && !busy ? 'pointer' : 'not-allowed',
              color: 'white',
            }}
          >
            Export GLB
          </button>

          <button
            onClick={async () => {
              if (!actions || busy) return;
              try {
                setBusy(true);
                await actions.exportIFC();
              } finally {
                setBusy(false);
              }
            }}
            disabled={!actions || busy}
            style={{
              padding: '10px 14px',
              borderRadius: 6,
              border: '1px solid #1d4ed8',
              background: busy ? '#93c5fd' : '#3b82f6',
              color: '#fff',
              cursor: actions && !busy ? 'pointer' : 'not-allowed',
            }}
          >
            {busy ? 'Exporting IFC…' : 'Export IFC'}
          </button>

          <button
            onClick={async () => {
              if (!actions || busy) return;
              try {
                setBusy(true);
                await actions.exportDXF('dxf');
              } finally {
                setBusy(false);
              }
            }}
            disabled={!actions || busy}
            style={{
              padding: '10px 14px',
              borderRadius: 6,
              border: '1px solid #0f766e',
              background: busy ? '#99f6e4' : '#0d9488',
              color: '#fff',
              cursor: actions && !busy ? 'pointer' : 'not-allowed',
            }}
          >
            {busy ? 'Exporting DXF…' : 'Export DXF'}
          </button>

          <button
            onClick={async () => {
              if (!actions || busy) return;
              try {
                setBusy(true);
                await actions.exportDXF('dwg');
              } finally {
                setBusy(false);
              }
            }}
            disabled={!actions || busy}
            style={{
              padding: '10px 14px',
              borderRadius: 6,
              border: '1px solid #7c3aed',
              background: busy ? '#ddd6fe' : '#7c3aed',
              color: '#fff',
              cursor: actions && !busy ? 'pointer' : 'not-allowed',
            }}
          >
            {busy ? 'Exporting DWG…' : 'Export DWG'}
          </button>
        </div>
      </div>
    </Provider>
  );
}
