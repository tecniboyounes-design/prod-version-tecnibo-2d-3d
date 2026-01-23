import React from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ConfiguratorSummaryHeader from './ConfiguratorSummaryHeader';

/**
 * SectionAccordion wraps section grids in collapsible MUI accordions.
 * Props:
 * - label: title string
 * - children: grid inside
 */

export default function SectionAccordion({ label, children, defaultExpanded = true }) {
  return (
    <Accordion defaultExpanded={defaultExpanded} sx={{ border: '1px solid #ccc', boxShadow: 'none' }}>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon sx={{ color: '#424242' }} />}
        sx={{
          bgcolor: '#f5f5f5',
          minHeight: 48,
          px: 2,
          '& .MuiAccordionSummary-content': {
            margin: 0,
            alignItems: 'center',
          },
        }}
      >
        <ConfiguratorSummaryHeader />
      </AccordionSummary>

      <AccordionDetails sx={{ p: 0 }}>{children}</AccordionDetails>
    </Accordion>
  );
}
