"use client";

import { Paper } from "@mui/material";
import DependencyTable from "./DependencyTable";

export default function FieldCollapse({ fieldRow }) {
  return (
    <Paper sx={{ m: 1, p: 2, width: "100%" }}>
      <DependencyTable fieldRow={fieldRow} />
    </Paper>
  );
}
