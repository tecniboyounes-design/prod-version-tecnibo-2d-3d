// src/configurator/lib/sectionUtils.js

export function countAllSubSections(section) {
  if (!section.subSections || section.subSections.length === 0) {
    return 0;
  }

  let count = section.subSections.length;

  section.subSections.forEach(sub => {
    count += countAllSubSections(sub);
  });
  
  return count;
}


