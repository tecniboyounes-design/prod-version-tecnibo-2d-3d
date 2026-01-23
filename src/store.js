"use client"

import { configureStore } from '@reduxjs/toolkit';
import thunk from 'redux-thunk';
import { createSlice } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from "uuid";
import { generateUniqueProjectNumber } from './data/models';
import { configuratorData } from './configurator/data/configuratorData';
import { buildFlatRows } from './configurator/components/grids/helpers/buildFlatRows';
import { assignSequentialTermnums } from './configurator/components/grids/ConditionsTreeGrid';



const WALL_HEIGHT_METERS = 2.8;



// Define the initial state
const initialState = {
  configurator: {},

  initRoom: {
    points: [
      { id: 'p1', x: 0, y: 0 },
      { id: 'p2', x: 3, y: 0 },
      { id: 'p3', x: 3, y: 3 },
      { id: 'p4', x: 0, y: 3 },
    ],
    walls: [
      { id: 'w1', start: 'p1', end: 'p2' },
      { id: 'w2', start: 'p2', end: 'p3' },
      { id: 'w3', start: 'p3', end: 'p4' },
      { id: 'w4', start: 'p4', end: 'p1' },
    ],
    // NEW: parametric doors/windows along walls
    openings: [
      {
        id: 'o1',
        wallId: 'w1',
        type: 'door',      // 'door' | 'window'
        t: 0.5,            // along wall [0..1]
        width: 0.9,
        height: 2.1,
        sillHeight: 0,
      },
      // you can start with no openings if you want -> []
    ],
    // whether the wall loop is closed -> floor can be generated
    isClosed: true,
    lastClosedLoopPointIds: ['p1', 'p2', 'p3', 'p4'],
  },




  //   configurator: {
  //   "id": 4,
  //   "cpid": "YOUNES_TEST_CONF_1",
  //   "description": "",
  //   "createdAt": "2025-07-29T13:34:53.166Z",
  //   "updatedAt": null,
  //   "deletedAt": null,
  //   "sections": [
  //     {
  //       "id": "e3df6e19-d9a2-40cc-b305-18bd3c45c2a2",
  //       "parentId": null,
  //       "depth": 0,
  //       "kind": "section",
  //       "label": "C.T 2 P.T root",
  //       "type": "NONE",
  //       "description": "Root-level section",
  //       "order_index": 1,
  //       "termnum": 2,
  //       "parentTermnum": null,
  //       "sections": [
  //         {
  //           "id": "f029db65-47d8-4f0c-bde8-6f021078e950",
  //           "parentId": "e3df6e19-d9a2-40cc-b305-18bd3c45c2a2",
  //           "depth": 1,
  //           "kind": "section",
  //           "label": "C.T 3 P.T 2",
  //           "type": "NONE",
  //           "description": "Auto-added subsection",
  //           "order_index": 1,
  //           "termnum": 3,
  //           "parentTermnum": 2,
  //           "sections": [
  //             {
  //               "id": "1dfeeccd-4e8c-4b5d-946d-17330a64336f",
  //               "parentId": "f029db65-47d8-4f0c-bde8-6f021078e950",
  //               "depth": 2,
  //               "kind": "section",
  //               "label": "C.T 4 P.T 3",
  //               "type": "NONE",
  //               "description": "Auto-added subsection",
  //               "order_index": 1,
  //               "termnum": 4,
  //               "parentTermnum": 3,
  //               "created_at": "2025-07-29T13:35:14.274Z",
  //               "sections": [],
  //               "fields": []
  //             }
  //           ],
  //           "fields": [
  //             {
  //               "id": "73028b6d-4520-417b-8d2c-d2dc58024610",
  //               "name": "new_field_1753796113053",
  //               "type": "INPUT",
  //               "label": "New Field",
  //               "info": "",
  //               "required": false,
  //               "order_index": 1,
  //               "termnum": 5,
  //               "parentTermnum": 3,
  //               "configuratorId": 4,
  //               "createdAt": "2025-07-29T13:35:13.052Z"
  //             }
  //           ]
  //         },
  //         {
  //           "id": "ba87d1be-4e11-4701-813f-8a757cb7c7df",
  //           "parentId": "e3df6e19-d9a2-40cc-b305-18bd3c45c2a2",
  //           "depth": 1,
  //           "kind": "section",
  //           "label": "C.T 6 P.T 2",
  //           "type": "NONE",
  //           "description": "Auto-added subsection",
  //           "order_index": 2,
  //           "termnum": 6,
  //           "parentTermnum": 2,
  //           "sections": [],
  //           "fields": []
  //         },
  //         {
  //           "id": "e7eb0b28-7fa1-4bdc-9a1c-2cf8c2aadcac",
  //           "parentId": "e3df6e19-d9a2-40cc-b305-18bd3c45c2a2",
  //           "depth": 1,
  //           "kind": "section",
  //           "label": "C.T 7 P.T 2",
  //           "type": "NONE",
  //           "description": "Auto-added subsection",
  //           "order_index": 3,
  //           "termnum": 7,
  //           "parentTermnum": 2,
  //           "sections": [],
  //           "fields": []
  //         },
  //         {
  //           "id": "9e076f47-9776-435b-a59e-f8d38c42ddf8",
  //           "parentId": "e3df6e19-d9a2-40cc-b305-18bd3c45c2a2",
  //           "depth": 1,
  //           "kind": "section",
  //           "label": "C.T 8 P.T 2",
  //           "type": "NONE",
  //           "description": "Auto-added subsection",
  //           "order_index": 4,
  //           "termnum": 8,
  //           "parentTermnum": 2,
  //           "sections": [],
  //           "fields": []
  //         }
  //       ],
  //       "fields": [
  //         {
  //           "id": "1581bc8c-cf07-4e7b-a3ea-c3dea921b713",
  //           "name": "new_field_1753796109837",
  //           "type": "INPUT",
  //           "label": "New Field",
  //           "info": "",
  //           "required": false,
  //           "order_index": 1,
  //           "termnum": 9,
  //           "parentTermnum": 2,
  //           "configuratorId": 4,
  //           "createdAt": "2025-07-29T13:35:09.836Z"
  //         },
  //         {
  //           "id": "507ba479-f8fc-4235-96cd-5b39a77c711d",
  //           "name": "new_field_1753796110706",
  //           "type": "INPUT",
  //           "label": "New Field",
  //           "info": "",
  //           "required": false,
  //           "order_index": 2,
  //           "termnum": 10,
  //           "parentTermnum": 2,
  //           "configuratorId": 4,
  //           "createdAt": "2025-07-29T13:35:10.706Z"
  //         }
  //       ]
  //     },
  //     {
  //       "id": "8e7b7ffa-6b2c-4516-a042-2767efa0dc91",
  //       "parentId": null,
  //       "depth": 0,
  //       "kind": "section",
  //       "label": "C.T 11 P.T root",
  //       "type": "NONE",
  //       "description": "Root-level section",
  //       "order_index": 2,
  //       "termnum": 11,
  //       "parentTermnum": null,
  //       "sections": [],
  //       "fields": []
  //     },
  //     {
  //       "id": "a71fc53b-a5d1-4abd-a261-85002106fba1",
  //       "parentId": null,
  //       "depth": 0,
  //       "kind": "section",
  //       "label": "C.T 12 P.T root",
  //       "type": "NONE",
  //       "description": "Root-level section",
  //       "order_index": 3,
  //       "termnum": 12,
  //       "parentTermnum": null,
  //       "sections": [],
  //       "fields": []
  //     }
  //   ],
  //   "fields": [
  //     {
  //       "id": "744f5f14-45cf-47dd-8c4d-77e46e4aae99",
  //       "name": "new_field_1",
  //       "type": "INPUT",
  //       "label": "New Field",
  //       "info": "",
  //       "required": false,
  //       "order_index": 1,
  //       "termnum": 1,
  //       "parentTermnum": null,
  //       "configuratorId": 4,
  //       "createdAt": "2025-07-29T13:34:59.210Z"
  //     }
  //   ],
  //   "conditions": []
  // },

  configuratorList: [],


  snackbar: { open: false, message: '', severity: 'success' },

  drawerOpen: false,
  selectedField: null,


  descriptorInputs: {
    wall_type: "",
    neighbor_type: "",
    material: "",
    width: "",
    door_system: false,
  },








  loading: false,
  is2DView: false,
  isDrawing: false,
  wallHieght: 4,
  isClose: false,
  projectInfo: 'prices',
  isDragging: false,

  floorplanner: {
    version: "2.0.1a",

  },


  items: [],
  currentConfig: { type: 'room', id: '' },
  currentStep: null,

  settings: {
    gridSize: 40,
    gridColor: '#008000',
    axesHelperVisible: false,
    gridHelperVisible: false,
    pointColor: '#ff0000',
    draggingColor: '#0000ff',
    divisions: 10,
    actions: {
      addItemHint: 'Click this to add tables, chairs, or other items to the scene.',
      downloadStateHint: 'Click this to download the current Redux state as a JSON file.',
    },
  },


  previewArticle: {},

  projects: [],

  project: {},

  user: {}



};



export const generateRoomKey = (pointIds) => { return pointIds.sort().join(',') };


export const gatherAllCorners = (corners) => { return Object.keys(corners) };


export const getRandomPrice = () => Math.floor(Math.random() * (100 - 10 + 1)) + 10;




const sanitizePayload = (payload) => {
  // Convert to a plain object without DOM properties
  return JSON.parse(JSON.stringify(payload, (key, value) => {
    if (typeof value === "function" || value instanceof Node) {
      return undefined; // Remove functions and DOM elements
    }
    return value;
  }));
};


export function rebuildNestedTree(flatRows) {
  const sectionMap = new Map();
  const fieldMap = new Map();
  const rootSections = [];
  const rootFields = [];

  // Separate sections and fields
  for (const row of flatRows) {
    if (row.kind === 'section') {
      sectionMap.set(row.termnum, { ...row, sections: [], fields: [] });
    }
    if (row.kind === 'field') {
      fieldMap.set(row.termnum, { ...row.fieldData });
    }
  }

  // Re-attach fields to their parent sections
  for (const field of fieldMap.values()) {
    if (field.parentTermnum === null) {
      rootFields.push(field);
    } else {
      const parentSection = sectionMap.get(field.parentTermnum);
      if (parentSection) {
        parentSection.fields.push(field);
      }
    }
  }

  // Re-attach subsections to their parent sections
  for (const section of sectionMap.values()) {
    if (section.parentTermnum === null) {
      rootSections.push(section);
    } else {
      const parentSection = sectionMap.get(section.parentTermnum);
      if (parentSection) {
        parentSection.sections.push(section);
      }
    }
  }

  // Final sort inside parents by order_index or termnum
  const sortChildren = (sections) => {
    return sections.map(sec => ({
      ...sec,
      sections: sortChildren(sec.sections).sort((a, b) => a.termnum - b.termnum),
      fields: [...(sec.fields || [])].sort((a, b) => a.termnum - b.termnum)
    }));
  };

  return {
    sections: sortChildren(rootSections).sort((a, b) => a.termnum - b.termnum),
    fields: rootFields.sort((a, b) => a.termnum - b.termnum)
  };
}


export const makeDependencyValue = (condId) => ({
  id: uuidv4(),     // tmp – DB replaces
  result: '',
  condition_id: condId,         // FK to a condition
  dependency_id: null            // filled when we insert
});


export const makeDependency = (fieldId) => ({
  id: uuidv4(),     // tmp – DB replaces
  action: 'FILTER',   // default
  fieldId,
  dependency_values: [makeDependencyValue()]
});


const findField = (sections, fieldId) => {
  for (const s of sections) {
    const f = s.fields.find(f => String(f.id) === String(fieldId));
    if (f) return f;
    const deep = findField(s.sections, fieldId);
    if (deep) return deep;
  }
  return null;
};







const jsonData = createSlice({
  name: 'JSONDATA',
  initialState,
  reducers: {




    // CAD section reducers


    setInitRoomClosed: (state, action) => {
      if (!state.initRoom) return;
      const { isClosed, pointIds } = action.payload || {};

      state.initRoom.isClosed = !!isClosed;

      // if we closed AND have a valid loop, remember it
      if (Array.isArray(pointIds) && pointIds.length >= 3) {
        state.initRoom.lastClosedLoopPointIds = pointIds.slice();
      } else if (!isClosed) {
        // if we explicitly open it, clear the last loop
        state.initRoom.lastClosedLoopPointIds = null;
      }
    },


    removeInitRoomWall: (state, action) => {
      const id = action.payload.id;
      if (!state.initRoom || !state.initRoom.walls) return;
      state.initRoom.walls = state.initRoom.walls.filter((w) => w.id !== id);

      // Also remove any openings attached to this wall
      if (Array.isArray(state.initRoom.openings)) {
        state.initRoom.openings = state.initRoom.openings.filter(
          (o) => o.wallId !== id
        );
      }
    },

    addInitRoomPoint: (state, action) => {
      const { id, x, y } = action.payload;
      if (!state.initRoom) return;
      const exists = state.initRoom.points.find((p) => p.id === id);
      if (!exists) {
        state.initRoom.points.push({ id, x, y });
      }
    },

    addInitRoomWall: (state, action) => {
      const wall = action.payload;
      if (!state.initRoom) return;
      state.initRoom.walls.push(wall);
    },

    updateInitRoomPoint: (state, action) => {
      const { id, x, y } = action.payload;
      if (!state.initRoom) return;
      const p = state.initRoom.points.find((pt) => pt.id === id);
      if (p) {
        if (typeof x === 'number') p.x = x;
        if (typeof y === 'number') p.y = y;
      }
    },

    updateInitRoomWall: (state, action) => {
      const { id, ifc, color } = action.payload;
      if (!state.initRoom || !state.initRoom.walls) return;

      const wall = state.initRoom.walls.find((w) => w.id === id);
      if (!wall) return;

      if (ifc) {
        wall.ifc = { ...(wall.ifc || {}), ...ifc };
      }

      if (typeof color === 'string') {
        wall.color = color;
      }
    },

    // NEW: mark room as closed/open (for floor creation)
    setInitRoomClosed: (state, action) => {
      if (!state.initRoom) return;
      const { isClosed } = action.payload;
      state.initRoom.isClosed = !!isClosed;
    },

    // NEW: manage parametric openings (doors/windows)
    addInitRoomOpening: (state, action) => {
      if (!state.initRoom) return;
      const opening = action.payload;
      if (!Array.isArray(state.initRoom.openings)) {
        state.initRoom.openings = [];
      }
      state.initRoom.openings.push(opening);
    },

    updateInitRoomOpening: (state, action) => {
      if (!state.initRoom || !Array.isArray(state.initRoom.openings)) return;
      const { id, patch } = action.payload;
      const o = state.initRoom.openings.find((o) => o.id === id);
      if (!o || !patch) return;

      // clamp t to [0,1]
      if (typeof patch.t === 'number') {
        let t = patch.t;
        if (t < 0) t = 0;
        if (t > 1) t = 1;
        o.t = t;
      }

      // width/height in meters
      if (typeof patch.width === 'number') {
        o.width = Math.max(0.1, patch.width);
      }

      if (typeof patch.height === 'number') {
        const hMin = 0.5;
        const hMax = WALL_HEIGHT_METERS;
        let h = patch.height;
        if (h < hMin) h = hMin;
        if (h > hMax) h = hMax;
        o.height = h;
      }

      if (typeof patch.sillHeight === 'number') {
        const h = typeof o.height === 'number' ? o.height : 0.9;
        let sill = patch.sillHeight;
        if (sill < 0) sill = 0;
        if (sill + h > WALL_HEIGHT_METERS) {
          sill = WALL_HEIGHT_METERS - h;
        }
        o.sillHeight = sill;
      }

      // copy any other scalar props directly
      Object.keys(patch).forEach((key) => {
        if (['t', 'width', 'height', 'sillHeight'].includes(key)) return;
        // eslint-disable-next-line no-param-reassign
        o[key] = patch[key];
      });
    },

    removeInitRoomOpening: (state, action) => {
      if (!state.initRoom || !Array.isArray(state.initRoom.openings)) return;
      const { id } = action.payload;
      state.initRoom.openings = state.initRoom.openings.filter(
        (o) => o.id !== id
      );
    },
  },





  // CAD section reducers


  loadPlanGeometry: (state, action) => {
    const { corners, walls } = action.payload;
    state.floorplanner.corners = corners;
    state.floorplanner.walls = walls;
  },
  /* ❷ NEW reducers for ConditionTable ----------------------------------- */
  updateCondition: (state, action) => {
    const { condition, dependencyId } = action.payload; // pass dependencyId from UI
    let incoming = condition;
    const isNew = !incoming.id;

    if (isNew) incoming.id = uuidv4(); // or Date.now()

    // Flatten hydrated format
    if (incoming.operations?.some(op => op.comparisons)) {
      let term = 0;
      const flatOps = [];
      const flatCmps = [];
      incoming.operations.forEach(op => {
        term += 1;
        const opTerm = term;
        flatOps.push({
          id: op.id,
          operationType: op.operationType,
          termnum: op.termnum ?? opTerm,
          parentTermnum: 0
        });
        (op.comparisons || []).forEach(cmp => {
          term += 1;
          flatCmps.push({
            id: cmp.id,
            termnum: cmp.termnum ?? term,
            parentTermnum: cmp.parentTermnum ?? opTerm,
            leftValue: cmp.leftValue,
            comparisonType: cmp.comparisonType,
            rightValue: cmp.rightValue
          });
        });
      });
      incoming = { ...incoming, operations: flatOps, comparisons: flatCmps };
    }

    // ✅ Only link to the one dependency being edited
    state.configurator.sections?.forEach(section => {
      section.fields?.forEach(field => {
        (field.dependencies || []).forEach(dep => {
          if (String(dep.id) === String(dependencyId)) {
            const alreadyLinked = dep.dependency_values?.some(
              dv => String(dv.condition_id) === String(incoming.id)
            );
            if (!alreadyLinked) {
              dep.dependency_values = [
                ...(dep.dependency_values || []),
                {
                  result: "",
                  condition_id: incoming.id,
                  dependency_id: dep.id
                }
              ];
            }
          }
        });
      });
    });

    // Replace or insert condition
    const pos = state.configurator.conditions.findIndex(
      c => String(c.id) === String(incoming.id)
    );
    if (pos === -1) {
      state.configurator.conditions.push(incoming);
    } else {
      state.configurator.conditions[pos] = incoming;
    }
  }
  ,



  addDependency: (state, { payload }) => {
    /** payload: { fieldId, action? } */
    const field = findField(state.configurator.sections, payload.fieldId);
    if (!field) {
      console.warn("❌ [addDependency] Field not found for fieldId:", payload.fieldId);
      return;
    }

    // Create new condition with uuid
    const newConditionId = uuidv4();
    const newCondition = {
      id: newConditionId,
      comment: "",
      operations: [],
      comparisons: []
    };
    state.configurator.conditions.push(newCondition);

    // Create dependency with uuid
    const newDepId = uuidv4();
    const newDep = {
      ...makeDependency(payload.fieldId),
      id: newDepId,
      action: payload.action || "FILTER",
      dependency_values: [
        {
          ...makeDependencyValue(newConditionId),
          dependency_id: newDepId
        }
      ]
    };

    // Push dependency to field
    field.dependencies ??= [];
    field.dependencies.push(newDep);
  },





  removeDependency: (state, { payload }) => {
    /** payload: { fieldId, depId } */
    const field = findField(state.configurator.sections, payload.fieldId);
    if (!field?.dependencies) return;
    field.dependencies = field.dependencies.filter(d => d.id !== payload.depId);
  },

  addDependencyValue: (state, { payload }) => {
    /** payload: { fieldId, depId, conditionId } */
    const field = findField(state.configurator.sections, payload.fieldId);
    const dep = field?.dependencies?.find(d => d.id === payload.depId);
    if (!dep) return;

    dep.dependency_values.push(makeDependencyValue(payload.conditionId));
  },

  removeDependencyValue: (state, { payload }) => {
    /** payload: { fieldId, depId, depValId } */
    const field = findField(state.configurator.sections, payload.fieldId);
    const dep = field?.dependencies?.find(d => d.id === payload.depId);
    if (!dep) return;

    dep.dependency_values = dep.dependency_values
      .filter(v => v.id !== payload.depValId);
  },







  deleteCondition: (state, action) => {
    /** payload = condition id */
    const id = action.payload;

    // 1) remove the condition itself
    state.configurator.conditions =
      state.configurator.conditions.filter(c => String(c.id) !== String(id));

    // 2) clean dependency_values that reference it
    const cleanDependencies = secs => {
      secs.forEach(sec => {
        // fields at this level
        (sec.fields ?? []).forEach(f => {
          (f.dependencies ?? []).forEach(dep => {
            dep.dependency_values =
              (dep.dependency_values ?? [])
                .filter(dv => String(dv.condition_id) !== String(id));
          });
        });
        // recurse
        cleanDependencies(sec.sections ?? []);
      });
    };
    cleanDependencies(state.configurator.sections ?? []);
  },



























































  deleteField: (state, action) => {
    const { sectionId, fieldId } = action.payload;

    const normalizedSectionId = String(sectionId);
    const normalizedFieldId = String(fieldId);

    function recurse(sections) {
      return sections.map(section => {
        if (String(section.id) === normalizedSectionId) {
          return {
            ...section,
            fields: section.fields
              ? section.fields.filter(f => String(f.id) !== normalizedFieldId)
              : []
          };
        }
        if (section.sections?.length) {
          return { ...section, sections: recurse(section.sections) };
        }
        return section;
      });
    }

    console.log(
      `🗑️ deleteField • section ${sectionId} • field ${fieldId}`
    );

    state.configurator.sections = recurse(state.configurator.sections);
  },

  setConfiguratorList: (state, action) => {
    console.log("[Redux] setConfiguratorList called with:", action.payload);
    state.configuratorList = action.payload;
  },

  setDescriptorInput: (state, action) => {
    const { key, value } = action.payload;
    state.descriptorInputs[key] = value;
  },




  replaceFieldFully: (state, action) => {
    console.log('🛠 Before replaceFieldFully:', JSON.parse(JSON.stringify(state.configurator)));
    const updatedField = action.payload;
    const fieldId = Number(updatedField.id.replace("field-", ""));

    const replaceField = (existingField) => {
      return {
        ...existingField,
        ...updatedField,
        id: fieldId
      };
    };

    const updateFields = (fields) =>
      fields.map((field) => (field.id === fieldId ? replaceField(field) : field));

    const walkSections = (sections) =>
      sections.map((section) => ({
        ...section,
        fields: updateFields(section.fields || []),
        sections: section.sections ? walkSections(section.sections) : [],
      }));

    // First try nested sections
    state.configurator.sections = walkSections(state.configurator.sections || []);

    // Then top-level fields
    state.configurator.fields = updateFields(state.configurator.fields || []);
    console.log('✅ After replaceFieldFully:', JSON.parse(JSON.stringify(state.configurator)));
  },





  setDrawerOpen: (state, action) => {
    state.drawerOpen = action.payload;
  },
  setSelectedField: (state, action) => {
    state.selectedField = action.payload;
  },












  updateConditionRow: (state, action) => {
    const updatedRow = action.payload;

    // Helper to clear irrelevant details based on type
    const enforceTypeDetails = (row) => {
      if (row.field_type === "INPUT") {
        return { ...row, combobox_details: {} };
      }
      if (row.field_type === "COMBOBOX") {
        return { ...row, input_details: {} };
      }
      if (row.field_type === "TEXT") {
        return { ...row, input_details: {}, combobox_details: {} };
      }
      return row;
    };

    const updateField = (field) => {
      if (`field-${field.id}` !== String(updatedRow.id)) return field;
      if (updatedRow.kind !== "field") return field;

      let updatedField = {
        ...field,
        type: updatedRow.field_type ?? field.type,
        input_type: updatedRow.input_type ?? field.input_type,
        label: updatedRow.label,
        info: updatedRow.description,
        required: updatedRow.required ?? field.required, // ✅ FIX: Include required
        input_details: updatedRow.input_details ?? {},
        combobox_details: updatedRow.combobox_details ?? {},
        impacted_variables: updatedRow.impacted_variables ?? [],
        field_descriptions: updatedRow.field_descriptions ?? [],
        dependencies: updatedRow.dependencies ?? [],
        comparisons: updatedRow.comparisons ?? []
      };

      updatedField = enforceTypeDetails(updatedField);
      return updatedField;
    };

    // Update root-level fields
    if (state.configurator.fields?.length > 0) {
      state.configurator.fields = state.configurator.fields.map(updateField);
    }

    // Update nested sections
    const recurse = (sections) => {
      return sections.map(section => {
        if (section.fields?.length > 0) {
          section.fields = section.fields.map(updateField);
        }
        if (section.sections?.length > 0) {
          section.sections = recurse(section.sections);
        }
        return section;
      });
    };

    state.configurator.sections = recurse(state.configurator.sections);
  },



  setConfigurator: (state, action) => {
    console.log('[setConfigurator] Action payload:', action.payload);
    if (!action.payload) {
      console.warn('⚠️ setConfigurator called with empty payload!');
      return;
    }
    state.configurator = action.payload;
  },



  addRootSection: (state, action) => {
    const { newSection } = action.payload;
    console.log('✅ Adding root section:', newSection);
    state.configurator.sections = [
      ...(state.configurator.sections || []),
      newSection
    ].sort((a, b) => a.order_index - b.order_index);
    console.log('✅ After addRootSection:', JSON.parse(JSON.stringify(state.configurator.sections)));
  },


  addRootField: (state, action) => {
    const { newField } = action.payload;
    console.log('✅ Adding root field:', newField);
    state.configurator.fields = [
      ...(state.configurator.fields || []),
      newField
    ].sort((a, b) => a.order_index - b.order_index);
    console.log('✅ After addRootField:', JSON.parse(JSON.stringify(state.configurator.fields)));
  },



  deleteRootField: (state, action) => {
    const { fieldId } = action.payload;

    const before = state.configurator.fields.length;
    state.configurator.fields = state.configurator.fields
      .filter(f => String(f.id) !== String(fieldId));

    console.log(
      `🗑️ deleteRootField • removed ${before - state.configurator.fields.length} entry`
    );
  },





  addSubSection: (state, action) => {
    const { parentId, newSection } = action.payload;

    // 1. Insert the new subsection under correct parent
    function recurse(sections) {
      return sections.map(section => {
        if (String(section.id) === String(parentId)) {
          return {
            ...section,
            sections: [...(section.sections || []), newSection]
          };
        }
        if (section.sections?.length > 0) {
          return { ...section, sections: recurse(section.sections) };
        }
        return section;
      });
    }

    // 2. Replace sections tree with new subsection inserted
    const updatedSections = recurse(state.configurator.sections);

    // 3. Flatten → assign termnums → rebuild nested
    const flat = buildFlatRows(updatedSections, state.configurator.fields);
    const numbered = assignSequentialTermnums(flat);
    const rebuilt = rebuildNestedTree(numbered);

    // 4. Replace state
    state.configurator.sections = rebuilt.sections;
    state.configurator.fields = rebuilt.fields;
  }
  ,





  addField: (state, action) => {
    const { sectionId, newField } = action.payload;
    const normalizedSectionId = String(sectionId);

    // 1. Attach field to correct section by id
    function recurse(sections) {
      return sections.map(section => {
        if (String(section.id) === normalizedSectionId) {
          return {
            ...section,
            fields: [...(section.fields || []), newField],
          };
        }
        if (section.sections?.length) {
          return { ...section, sections: recurse(section.sections) };
        }
        return section;
      });
    }

    // 2. Update in-place
    state.configurator.sections = recurse(state.configurator.sections);

    // 3. Flatten everything and assign termnums
    const flatRows = buildFlatRows(state.configurator.sections, state.configurator.fields);
    const updatedFlatRows = assignSequentialTermnums(flatRows);

    // 4. Rebuild tree and write back to state
    const rebuilt = rebuildNestedTree(updatedFlatRows);
    state.configurator.sections = rebuilt.sections;
    state.configurator.fields = rebuilt.fields;
  },




  deleteSection: (state, action) => {
    const { sectionId } = action.payload;
    const normalizedSectionId = String(sectionId);

    function recurse(sections) {
      return sections
        .filter(section => String(section.id) !== normalizedSectionId)
        .map(section => ({
          ...section,
          sections: section.sections ? recurse(section.sections) : []
        }));
    }

    console.log('🗑️ Before deleteSection:', JSON.parse(JSON.stringify(state.configurator.sections)));
    state.configurator.sections = recurse(state.configurator.sections);
    console.log('✅ After deleteSection:', JSON.parse(JSON.stringify(state.configurator.sections)));
  },




  addField: (state, action) => {
    const { sectionId, newField } = action.payload;
    const normalizedSectionId = String(sectionId);

    // 1. Ensure unique name using timestamp
    const uniqueField = {
      ...newField,
      name: `new_field_${Date.now()}`
    };

    // 2. Attach field to correct section
    function recurse(sections) {
      return sections.map(section => {
        if (String(section.id) === normalizedSectionId) {
          return {
            ...section,
            fields: [...(section.fields || []), uniqueField],
          };
        }
        if (section.sections?.length) {
          return { ...section, sections: recurse(section.sections) };
        }
        return section;
      });
    }

    // 3. Apply updates
    state.configurator.sections = recurse(state.configurator.sections);

    // 4. Flatten → assign termnums → rebuild
    const flatRows = buildFlatRows(state.configurator.sections, state.configurator.fields);
    const updatedFlatRows = assignSequentialTermnums(flatRows);
    const rebuilt = rebuildNestedTree(updatedFlatRows);

    state.configurator.sections = rebuilt.sections;
    state.configurator.fields = rebuilt.fields;
  }
  ,




  setSnackbar: (state, action) => {
    state.snackbar = action.payload;
  },







  updateSection: (state, action) => {
    // { sectionId, updates }
  },


  moveSection: (state, action) => {
    // { sectionId, direction: 'up' | 'down' }
  },

  updateField: (state, action) => {
    // { sectionId, fieldId, updates }
  },
  moveField: (state, action) => {
    // { sectionId, fieldId, direction: 'up' | 'down' }
  },
  // ...existing code...




  updateFieldValue: (state, action) => {
    // { field, value }
    state[action.payload.field] = action.payload.value;
  },

















  updateItems: (state, action) => {
    const items = action.payload;
    console.log('items:', items);
    state.floorplanner.items = items;
  },

  updateFloorPlan: (state, action) => {
    const floorplan = action.payload;
    console.log('floorplan', floorplan);
  },

  deleteArticle: (state, action) => {
    const itemId = action.payload;
    state.floorplanner.items = state.floorplanner.items.filter(item => item.id !== itemId);
  },

  setUser: (state, action) => {
    const user = action.payload
    state.user = user
  },

  pushArticles: (state, action) => {
    console.log('action payload:', action.payload);

    if (!Array.isArray(state.floorplanner.items)) {
      console.warn("⚠️ state.floorplanner.items is not an array! Initializing as an empty array.");
      state.floorplanner.items = [];
    }

    let newItem = sanitizePayload(action.payload);

    // Assign unique ID if not present
    if (!newItem.id) {
      newItem.id = uuidv4();
    }

    // Assign random price directly to item if not present
    if (typeof newItem.price === 'undefined') {
      newItem.price = getRandomPrice();
    }

    // Set default quantity
    if (!newItem.quantity) {
      newItem.quantity = 1;
    }

    state.floorplanner.items.push(newItem);
  },




  updateProjectStatus: (state, action) => {
    // console.log('action', action.payload); // Log the action to check the payload

    const { id, status } = action.payload;

    // First, try to find the project in state.projects (array of multiple projects)
    let project = state.projects.find(p => p.id === id);

    if (project) {
      console.log('Found project in state.projects:', project); // Log the found project in state.projects
      project.status = status; // Update the status in the found project
      // console.log('Updated project in state.projects:', project); // Log the updated project
    } else {
      // If not found in state.projects, look for the project in state.project (single project)
      console.warn('Project not found in state.projects, looking in state.project...');

      if (state.project && state.project.id === id) {
        // console.log('Found project in state.project:', state.project); // Log the found project in state.project
        state.project.status = status; // Update the status in the staged project
        // console.log('Updated project in state.project:', state.project); // Log the updated staged project
      } else {
        // If project is not found in either state.projects or state.project, log an error
        console.error(`Project with id: ${id} not found in state.projects or state.project`);
      }
    }
  },


  // Reducer to update the quantity of an item based on its ID
  updateItemQuantity: (state, action) => {
    const { id, quantity } = action.payload;

    // Find the item by ID and update its quantity
    const itemIndex = state.floorplanner.items.findIndex((item) => item.id === id);

    if (itemIndex !== -1) {
      state.floorplanner.items[itemIndex].quantity = quantity;
    } else {
      console.warn(`⚠️ Item with ID ${id} not found.`);
    }
  },



  addProject: (state, action) => {
    const copiedProject = { ...action.payload };
    copiedProject.title = `Copied Basket: ${copiedProject.title}`;
    copiedProject.id = uuidv4();
    state.projects.push(copiedProject)
  },


  deleteProject: (state, action) => {
    const { id, type } = action.payload;

    // If the type is 'active', clear the active project
    if (type === 'active') {
      state.project = {}; // Clear the active project
    }

    // Find and remove the project from the projects array
    const index = state.projects.findIndex(project => project.id === id);
    if (index !== -1) {
      state.projects.splice(index, 1);
    }
  },






  pushProject: (state, action) => {
    state.project = { ...action.payload };
  },







  updatePreview: (state, action) => {
    state.previewArticle = action.payload || {};
  },

  clearPreview: (state) => {
    state.previewArticle = {};
  },

  setProjectInfo: (state, action) => {
    state.projectInfo = action.payload;
  },

  setDragging: (state, action) => {
    // console.log('action:', action.payload)
    state.isDragging = action.payload;
  },

  setLoading: (state, action) => {
    // console.log('action:', action.payload)
    state.loading = action.payload;
  },

  updateWallWithStarConfig(state, action) {
    console.log('Updating wall with star config:', action.payload);

    const { wallId, config } = action.payload;
    // console.log('walls',)

    if (state.floorplanner && state.floorplanner.walls[wallId]) {
      const wall = state.floorplanner.walls[wallId];
      // console.log('Wall:', wall);
      // wall.thickness = config.thickness;
      // wall.type = config.type;
      // wall.wallColor = config.wallColor;
      // wall.wallTexture = config.wallTexture;
      // wall.wallType = config.wallType;
    } else {
      console.error(`Wall with ID ${wallId} not found.`);
    }

  },


  setWallConfig: (state, action) => {
    // console.log('Updating wall config:', action.payload);

    const { id, key, value } = action.payload;

    if (id) {
      // Update specific wall by ID
      const wall = state.floorplanner.walls.find(wall => wall.id === id);
      if (wall) {
        wall[key] = value;
      }
    } else {
      state.floorplanner.walls.forEach(wall => {
        wall[key] = value;
      });
    }
  },


  starWall(state, action) {
    const { wallId } = action.payload;

    // Find the wall by its ID from the state
    const wall = state.floorplanner.walls.find((w) => w.id === wallId);

    if (wall) {
      // Add the current date to the wall object before saving it to localStorage
      const starredWall = { ...wall, starredAt: new Date().toISOString() };

      // Retrieve the existing favorites from the state, or an empty array if none
      const existingFavorites = state.favorite || [];

      // Add the new starred wall to the favorites array
      const updatedFavorites = [...existingFavorites, starredWall];

      // Save the updated favorites array to localStorage
      localStorage.setItem('starredWall', JSON.stringify(updatedFavorites));

      // Update the favorite state in Redux
      state.favorite = updatedFavorites;

      // console.log(`✨ Wall with ID ${wallId} has been starred and added to favorites! 🌟`, wall);
    } else {
      console.log(`❌ Wall with ID ${wallId} not found... Sorry, no stars here.`);
    }
  },




  setCurrentConfig: (state, action) => {
    // console.log('Setting config:', action.payload);
    const newConfig = action.payload;
    state.currentConfig = newConfig;
  },


  setHouse: (state, action) => {
    const house = action.payload;
    state.floorplanner = {
      version: "1.0.0",
      corners: house.corners,
      walls: house.walls,
      rooms: house.rooms,
      units: "m",
    };
  },

  updateSettings: (state, action) => {
    // console.log('updateSettings', action.payload);
    const { key, value } = action.payload;
    state.settings[key] = value;
  },


  setCurrentStep: (state, action) => {
    state.currentStep = action.payload;
  },

  updateItemPositionAndRotation: (state, action) => {
    // console.log('updateItemPositionAndRotation', action.payload);
    const { id, newPosition, newRotation } = action.payload;
    const item = state.floorplanner.items.find(item => item.id === id);
    if (item) {
      item.position = newPosition;
      item.rotation = newRotation;
    } else {
      console.warn(`Item with ID ${id} not found.`);
    }
  },

  saveProjectSetup: (state, action) => {
    const { projectName, questions, description, startDate, clientName, clientEmail } = action.payload;
    state.projectSetup.projectName = projectName;
    state.projectSetup.questions = questions;
    state.projectSetup.description = description;
    state.projectSetup.startDate = startDate;
    state.projectSetup.clientName = clientName;
    state.projectSetup.clientEmail = clientEmail;
  },


  // Updates the entire state
  updateJSONDATA(state, action) {
    return action.payload;
  },


  updateCorner: (state, action) => {
    // console.log("updateCorner", action.payload);
    // console.log("state.corners", state.floorplanner.corners['71d4f128-ae80-3d58-9bd2-711c6ce6cdf2']);
    const { id, position } = action.payload;

    // Check if the corner exists in the state
    if (state.floorplanner && state.floorplanner.corners[id]) {
      // Only update x and z properties, leaving others unchanged
      state.floorplanner.corners[id] = {
        ...state.floorplanner.corners[id],
        x: position.x,  // Update x
        z: position.z   // Update z
      };
    } else {
      console.error(`Corner with ID ${id} not found.`);
    }
  },



  createPoint(state, action) {
    // console.log('createPoint', action.payload)
    const { id, position, elevation, connectedWalls } = action.payload;

    // Check if the point with the same coordinates already exists (using swapped y and z)
    const existingCorner = Object.values(state.floorplanner.corners).find(
      (corner) => corner.x === position.x && corner.y === position.z // Compare x and z (not y)
    );

    if (existingCorner) {
      console.warn(`Corner with position (${position.x}, ${position.z}) already exists.`);
      return;
    }

    // Add a new corner if no duplicates are found
    if (state.floorplanner.corners[id]) {
      console.warn(`Corner with id ${id} already exists.`);
      return;
    }

    // Adding the new corner to the store
    state.floorplanner.corners[id] = {
      x: position.x,
      y: position.y,
      z: position.z,
      // Storing z as y in the state
      elevation,
      connectedWalls,
    };


  },



  removePoint(state, action) {
    // console.log("Removing point", action.payload);
    const { id } = action.payload;
    if (!id) {
      console.warn("Payload does not contain a valid 'id'.", action.payload);
      return;
    }

    if (state.floorplanner.corners[id]) {
      const { [id]: _, ...remainingCorners } = state.floorplanner.corners;

      state.floorplanner.corners = remainingCorners;
      state.floorplanner.walls = state.floorplanner.walls.filter(
        (wall) => wall.corner1 !== id && wall.corner2 !== id
      );
    } else {
      console.warn(`Point with ID ${id} not found in corners.`);
    }

  },




  updateWallWithNewCorner: (state, action) => {
    // Destructure the points from the action payload
    const { virtualPoint, realPoint } = action.payload;

    // Access the ids from the point objects
    const virtualCornerId = virtualPoint.id;
    const realPointId = realPoint.id;

    // console.log('virtualCorner', virtualCornerId);
    // console.log('realCorner', realPointId);

    // Iterate through walls and update corners
    state.floorplanner.walls.forEach((wall) => {
      if (wall.corner1 === virtualCornerId) {
        wall.corner1 = realPointId; // Replace the virtual corner with the real point ID
      }

      if (wall.corner2 === virtualCornerId) {
        wall.corner2 = realPointId; // Replace the virtual corner with the real point ID
      }
    });
  },


  createRoom: (state, action) => {
    // console.log('Room created:', action.payload);

    const corners = state.floorplanner.corners;
    // console.log('Room corners:', JSON.parse(JSON.stringify(corners)));

    const pointIds = gatherAllCorners(corners);
    const roomName = `Room ${Object.keys(state.floorplanner.rooms).length + 1}`;

    // Generate a unique key for the new room
    const roomKey = generateRoomKey(pointIds);

    // Ensure rooms object exists
    if (!state.floorplanner.rooms) {
      state.floorplanner.rooms = {};
    }

    // Add the room to the state
    state.floorplanner.rooms[roomKey] = { name: roomName };

    // Log the newly created room
    console.log('Newly created room:', JSON.parse(JSON.stringify(state.floorplanner.rooms[roomKey])));

    // Log all current rooms
    console.log('All current rooms:', JSON.parse(JSON.stringify(state.floorplanner.rooms)));
  },





  createWall: (state, action) => {
    const {
      id = uuidv4(),
      corner1,
      corner2,
      thickness = 0.2,
      type = "STRAIGHT",
      name = "T100",
      material = {},
      length = 0,
      ...otherProps
    } = action.payload;

    const newWall = {
      id,
      corner1,
      corner2,
      thickness,
      type,
      name,
      material,
      length,
      ...otherProps,
    };

    state.floorplanner.walls.push(newWall);
  },


  selectItemForRoom: (state, action) => {
    // console.log('Selected item:', action.payload);
    const { itemId, roomName } = action.payload;

    // Find the room by name
    const roomKey = Object.keys(state.floorplanner.rooms).find(key => state.floorplanner.rooms[key].name === roomName);
    if (!roomKey) {
      console.warn(`Room with name "${roomName}" not found.`);
      return;
    }

    // Find the item by ID
    const item = state.floorplanner.items.find(item => item.id === itemId);
    if (!item) {
      console.warn(`Item with id ${itemId} not found.`);
      return;
    }


    // Mark the item as staged
    item.isStaged = true;

    // Add itemId to room's itemIds array if not already included
    const room = state.floorplanner.rooms[roomKey];

    // Ensure the itemIds array exists and update it immutably
    const updatedItemIds = room.itemIds ? [...room.itemIds] : [];
    if (!updatedItemIds.includes(itemId)) {
      updatedItemIds.push(itemId);
    }

    // Update the room with the new itemIds array
    state.floorplanner.rooms = {
      ...state.floorplanner.rooms,
      [roomKey]: {
        ...room,
        itemIds: updatedItemIds,
      }
    };

    console.log('Updated room:', state.floorplanner.rooms[roomKey]);
  },






  setIsDrawing(state, action) {
    state.isDrawing = action.payload;
    // if (action.payload) {
    //   state.is2DView = true;
    // }
  },



  setIs2DView(state, action) {
    state.is2DView = action.payload;
  },



  // Action to update a room's name
  updateRoomName: (state, action) => {
    const { pointIds, newName } = action.payload;
    const roomKey = generateRoomKey(pointIds);

    if (state[roomKey]) {
      state[roomKey].name = newName;
    }
  },


  // Action to delete a room by point IDs
  deleteRoom: (state, action) => {
    const { pointIds } = action.payload;
    const roomKey = generateRoomKey(pointIds);

    delete state[roomKey];
  },


  // Redux slice - updateBothCorners reducer
  updateBothCorners: (state, action) => {
    // console.log("updateBothCorners", action.payload);

    // Destructure the payload to get the corner IDs and their new positions
    const { corner1Id, corner2Id, position1, position2 } = action.payload;

    // Ensure both corners exist in the state
    if (
      state.floorplanner &&
      state.floorplanner.corners[corner1Id] &&
      state.floorplanner.corners[corner2Id]
    ) {
      // Update corner1
      state.floorplanner.corners[corner1Id] = {
        ...state.floorplanner.corners[corner1Id],
        x: position1.x,  // Update x for corner1
        z: position1.z   // Update z for corner1
      };

      // Update corner2
      state.floorplanner.corners[corner2Id] = {
        ...state.floorplanner.corners[corner2Id],
        x: position2.x,  // Update x for corner2
        z: position2.z   // Update z for corner2
      };

    } else {
      console.error(`Corners with IDs ${corner1Id} and ${corner2Id} not found.`);
    }
  },


  updatePoints: (state, action) => {
    // console.log("updatePoints", action.payload);

    const { corner1Id, corner2Id, newPositions } = action.payload;

    if (state.floorplanner.corners[corner1Id]) {
      state.floorplanner.corners[corner1Id] = {
        ...state.floorplanner.corners[corner1Id],
        ...newPositions.pointA,
      }
    }

    if (state.floorplanner.corners[corner2Id]) {
      state.floorplanner.corners[corner2Id] = {
        ...state.floorplanner.corners[corner2Id],
        ...newPositions.pointB,
      };
    }
  },


  // New reducer: setWallPrice
  setWallPrice: (state, action) => {
    const { wallId, totalPrice } = action.payload;
    // Find the wall by ID and update its total_price
    const wall = state.floorplanner.walls.find(w => w.id === wallId);
    if (wall) {
      wall.total_price = totalPrice;
      console.log(`Wall price updated in state: wallId=${wallId}, totalPrice=${totalPrice}`);
    } else {
      console.warn(`Wall with id ${wallId} not found in state.`);
    }
  },


  // New reducer: setWallInfo
  setWallInfo: (state, action) => {
    // action.payload should be an object: { wallId, info }
    const { wallId, info } = action.payload;
    state.wallInfo[wallId] = info;
    console.log(`Wall info updated in state: wallId=${wallId}`, info);
  },


  setFloorplannerData: (state, action) => {
    const { corners, walls } = action.payload;
    state.jsonData.floorplanner.corners = corners || state.jsonData.floorplanner.corners;
    state.jsonData.floorplanner.walls = walls || state.jsonData.floorplanner.walls;
  }


});


// Configure the store
const store = configureStore({
  reducer: {
    jsonData: jsonData.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(thunk),
});



// Export actions for use in components
export const {
   removeInitRoomOpening,
  setInitRoomClosed,
  updateInitRoomOpening,
  addInitRoomOpening,
  removeInitRoomWall,
  addInitRoomPoint,
  addInitRoomWall,
  updateInitRoomPoint,
  updateInitRoomWall,
  loadPlanGeometry,
  addDependency, removeDependency, addDependencyValue, removeDependencyValue,
  updateCondition, deleteCondition,
  setConfiguratorList,
  setDescriptorInput,
  replaceFieldFully,
  setDrawerOpen, setSelectedField,
  deleteRootField,
  addRootSection, addRootField, setSnackbar,
  setConfigurator,
  deleteField,
  addSubSection, addField, deleteSection, updateSection, moveSection,
  updateConditionRow,
  updateFieldValue, setFloorplannerData,
  updateFloorPlan, setUser, deleteArticle, updateItemQuantity, updateProjectStatus, addProject, deleteProject, pushProject, pushArticles, updatePreview, clearPreview, setLoading, setDragging, setProjectInfo, updateWallWithStarConfig, starWall, setWallConfig, updateJSONDATA, updateItems, updateCorner, setIsDrawing, setIs2DView, createPoint, createWall, updatePoints, createRoom, removePoint, updateWallWithNewCorner, updateBothCorners, selectItemForRoom, updateItemPositionAndRotation, setCurrentStep, saveProjectSetup, setHouse, setCurrentConfig, updateSettings, resetSettings, setWallPrice, setWallInfo } = jsonData.actions;


export default store;