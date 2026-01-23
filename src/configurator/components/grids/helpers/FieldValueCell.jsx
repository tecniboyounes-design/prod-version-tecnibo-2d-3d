import React from "react";
import FieldRenderer from "../../common/FieldRenderer";

export default function FieldValueCell({ row }) {
  if (row.kind !== "field") return null;

  const { fieldData } = row;
  return (
    <FieldRenderer
      type={fieldData?.type}
      value={fieldData?.default_value}
      options={fieldData?.options}
    />
  );
}
