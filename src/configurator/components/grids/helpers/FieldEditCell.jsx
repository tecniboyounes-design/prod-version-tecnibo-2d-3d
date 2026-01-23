import React from "react";
import FieldEditor from "../../common/FieldEditor";

export default function FieldEditCell({ row, onChange }) {
  if (row.kind !== "field") return null;

  const { fieldData } = row;
  return (
    <FieldEditor
      type={fieldData?.type}
      value={fieldData?.default_value}
      options={fieldData?.options}
      onChange={onChange}
    />
  );
}
