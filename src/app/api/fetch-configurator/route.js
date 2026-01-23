// app/api/fetch-configurator/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

const configurators = {
  T100: {
    id: uuidv4(),
    sections: [
      { id: uuidv4(), label: "General Info", order_index: 1 },
      { id: uuidv4(), label: "Style Options", order_index: 2 },
    ],
    fields: [
      { id: uuidv4(), label: "Width", section_id: "section-general", field_type_id: "input_field", order_index: 1 },
      { id: uuidv4(), label: "Height", section_id: "section-general", field_type_id: "input_field", order_index: 2 },
      { id: uuidv4(), label: "Has Handle?", section_id: "section-style", field_type_id: "checkbox_field", order_index: 1 },
      { id: uuidv4(), label: "Material", section_id: "section-style", field_type_id: "combobox_field", order_index: 2 },
    ],
    fieldDetails: {
      width: { type: "number", min: 0.1, max: 1.2, unit: "m" },
      height: { type: "number", min: 2.0, max: 3.1, unit: "m" },
      hasHandle: { type: "boolean" },
      material: { type: "string", options: ["Rainures", "vitre plus claire"] },
    },
  },
  SILO: {
    id: uuidv4(),
    sections: [
      { id: uuidv4(), label: "Sound Features", order_index: 1 },
      { id: uuidv4(), label: "Installation", order_index: 2 },
    ],
    fields: [
      { id: uuidv4(), label: "Acoustic dB", section_id: "section-sound", field_type_id: "input_field", order_index: 1 },
      { id: uuidv4(), label: "Is Prefab?", section_id: "section-install", field_type_id: "checkbox_field", order_index: 1 },
    ],
    fieldDetails: {
      "Acoustic dB": { type: "number", min: 35, max: 50, unit: "dB" },
      "Is Prefab?": { type: "boolean" },
    },
  },
  ERA: {
    id: uuidv4(),
    sections: [
      { id: uuidv4(), label: "Dimensions", order_index: 1 },
      { id: uuidv4(), label: "Color Scheme", order_index: 2 },
    ],
    fields: [
      { id: uuidv4(), label: "Max Width", section_id: "section-dim", field_type_id: "input_field", order_index: 1 },
      { id: uuidv4(), label: "Color", section_id: "section-color", field_type_id: "combobox_field", order_index: 1 },
    ],
    fieldDetails: {
      "Max Width": { type: "number", min: 1.0, max: 2.5, unit: "m" },
      "Color": { type: "string", options: ["Green", "Gray"] },
    },
  },
  MIRO: {
    id: uuidv4(),
    sections: [
      { id: uuidv4(), label: "Transparency", order_index: 1 },
    ],
    fields: [
      { id: uuidv4(), label: "Opacity", section_id: "section-trans", field_type_id: "input_field", order_index: 1 },
    ],
    fieldDetails: {
      Opacity: { type: "number", min: 0.0, max: 1.0 },
    },
  },
  HAAS: {
    id: uuidv4(),
    sections: [
      { id: uuidv4(), label: "Thermal", order_index: 1 },
    ],
    fields: [
      { id: uuidv4(), label: "Insulation Level", section_id: "section-thermal", field_type_id: "input_field", order_index: 1 },
    ],
    fieldDetails: {
      "Insulation Level": { type: "number", min: 1, max: 10 },
    },
  },
  V100: {
    id: uuidv4(),
    sections: [
      { id: uuidv4(), label: "Fire Resistance", order_index: 1 },
    ],
    fields: [
      { id: uuidv4(), label: "Rating", section_id: "section-fire", field_type_id: "combobox_field", order_index: 1 },
    ],
    fieldDetails: {
      Rating: { type: "string", options: ["EI30", "EI60"] },
    },
  },
  BTG: {
    id: uuidv4(),
    sections: [
      { id: uuidv4(), label: "Extras", order_index: 1 },
    ],
    fields: [
      { id: uuidv4(), label: "Add Glass?", section_id: "section-extra", field_type_id: "checkbox_field", order_index: 1 },
    ],
    fieldDetails: {
      "Add Glass?": { type: "boolean" },
    },
  },
  ART: {
    id: uuidv4(),
    sections: [
      { id: uuidv4(), label: "Add-ons", order_index: 1 },
    ],
    fields: [
      { id: uuidv4(), label: "Lacobel Finish", section_id: "section-addon", field_type_id: "checkbox_field", order_index: 1 },
    ],
    fieldDetails: {
      "Lacobel Finish": { type: "boolean" },
    },
  },
};

export async function POST(req) {
  const { articleType } = await req.json();
  console.log('articleType:', articleType);
 
  if (!articleType || !configurators[articleType]) {
    return NextResponse.json(
      { error: "Invalid or missing articleType" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    configurator: configurators[articleType],
    formData: {},
  });
}