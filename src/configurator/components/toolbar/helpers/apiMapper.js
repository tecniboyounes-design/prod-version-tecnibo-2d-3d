/* ---------------------------------------------------------------
   helpers/apiMapper.ts
   --------------------------------------------------------------- */
export const prepareConfiguratorForApi = (cfg)=> {
  const mapField = (f) => ({
    ...f,
    inputField    : f.input_details      ?? f.inputField      ?? null,
    comboboxField : f.combobox_details   ?? f.comboboxField   ?? null,
    variables     : f.impacted_variables ?? f.variables       ?? [],
    descriptions  : f.field_descriptions ?? f.descriptions    ?? [],
    // strip UI-only keys
    input_details       : undefined,
    combobox_details    : undefined,
    impacted_variables  : undefined,
    field_descriptions  : undefined,
  });

  const mapSection = (s) => ({
    ...s,
    fields   : (s.fields   ?? []).map(mapField),
    sections : (s.sections ?? []).map(mapSection),
  });

  return {
    ...cfg,
    fields   : (cfg.fields   ?? []).map(mapField),
    sections : (cfg.sections ?? []).map(mapSection),
  };
};
