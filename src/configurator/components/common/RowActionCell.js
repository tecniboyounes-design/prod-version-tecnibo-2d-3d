import React from 'react';
import { Add, AddBox, Delete, DragIndicator, BorderInner } from '@mui/icons-material';
import IconButtonSmall from './IconButtonSmall';
import { useDispatch, useSelector } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import { addSubSection, addField } from '@/store';
import { getNextTermnum } from '../grids/helpers/getNextTermnum';
import { buildFlatRows } from '../grids/helpers/buildFlatRows';
import EditIcon from '@mui/icons-material/Edit';
import { Tooltip } from '@mui/material';

export function RowActionCell1({ parentId, parentTermnum, disableAddField }) {
  const dispatch = useDispatch();
  const configurator = useSelector(state => state.jsonData.configurator);
  const rows = buildFlatRows(configurator.sections, configurator.fields);
  const parentSection = rows.find(r => String(r.id) === String(parentId));

  const childSectionCount = rows.filter(r => r.parentTermnum === parentTermnum && r.kind === 'section').length;
  const childFieldCount = rows.filter(r => r.parentTermnum === parentTermnum && r.kind === 'field').length;

  const handleAddSubSection = () => {
    const newSection = {
      id: uuidv4(),
      label: `New Subsection`,  // termnum + label will be generated later
      type: 'NONE',
      description: 'Auto-added subsection',
      order_index: childSectionCount + 1,
      termnum: null,  // placeholder, will be reassigned
      parentTermnum: parentTermnum || null,
      configuratorId: configurator.id,
      fields: [],
      sections: [],
      createdAt: new Date().toISOString(),
    };

    console.log('🚀 Dispatching addSubSection with:', newSection);
    dispatch(addSubSection({ parentId: String(parentId), newSection }));
  };

  const handleAddField = () => {
    const newField = {
      id: uuidv4(),
      name: `new_field_${childFieldCount + 1}`,
      type: 'INPUT',
      label: 'New Field',
      info: '',
      required: false,
      order_index: childFieldCount + 1,
      termnum: null,  // placeholder, will be reassigned
      parentTermnum: parentTermnum || null,
      configuratorId: configurator.id,
      createdAt: new Date().toISOString(),
    };

    console.log('🚀 Dispatching addField with:', newField);
    dispatch(addField({ sectionId: String(parentId), newField }));
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <IconButtonSmall
        icon={<BorderInner sx={{ color: '#2196f3' }} />}
        onClick={handleAddSubSection}
        title="Add Subsection"
      />
      <IconButtonSmall
        icon={<Add sx={{ color: disableAddField ? 'text.disabled' : '#4caf50' }} />}
        onClick={handleAddField}
        title={disableAddField ? "Cannot add field in TAB section" : "Add Field"}
        disabled={disableAddField}
      />

    </div>
  );
}




export function RowActionCell2({ onDelete, onDrag }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <IconButtonSmall
        icon={<Delete sx={{ color: '#f44336' }} />}
        onClick={onDelete}
        title="Delete"
      />
      <IconButtonSmall
        icon={<DragIndicator sx={{ color: '#9e9e9e' }} />}
        onClick={onDrag}
        title="Drag"
      />
    </div>
  );
}



export function RowActionCellField({ onOpenDrawer }) {
  return (
    <Tooltip title="Edit Field Info">
      <span>
        <IconButtonSmall
          icon={<EditIcon sx={{ color: '#1976d2' }} />}
          onClick={onOpenDrawer}
          title="Edit Field Info"
        />
      </span>
    </Tooltip>
  );
}
