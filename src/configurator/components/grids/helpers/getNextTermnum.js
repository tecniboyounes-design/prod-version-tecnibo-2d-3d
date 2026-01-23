export function getNextTermnum(configurator) {
  let maxTermnum = -1;

  function walkSections(sections) {
    sections.forEach(section => {
      if (typeof section.termnum === 'number' && section.termnum > maxTermnum) {
        maxTermnum = section.termnum;
      }

      if (section.fields) {
        section.fields.forEach(field => {
          if (typeof field.termnum === 'number' && field.termnum > maxTermnum) {
            maxTermnum = field.termnum;
          }
        });
      }

      if (section.sections) {
        walkSections(section.sections);
      }
    });
  }
  
  if (Array.isArray(configurator.sections)) {
    walkSections(configurator.sections);
  }
   
  if (Array.isArray(configurator.fields)) {
    configurator.fields.forEach(field => {
      if (typeof field.termnum === 'number' && field.termnum > maxTermnum) {
        maxTermnum = field.termnum;
      }
    });
  }

  const next = maxTermnum + 1;
  console.log(`✅ getNextTermnum() → next available termnum: ${next}`);
  return next;
}
