
import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Button,
  Grid,
} from "@mui/material";

import { PreviewImage } from "@/components/Otman/UI/ItemList";
import { CustomPanel } from "@/components/Otman/UI/Panel";
import ProjectInfoBar from "@/components/Otman/UI/ProjectInfoBar";


const PngArticle = () => {

  return (
    <div
    style={{
        width: '100%',
        height: '100vh', 
        overflow: 'hidden', 
      }}    >    
    <ProjectInfoBar />

      <CustomPanel
        isPanelVisible={true}
        panelContent={<PngMenu />}
      >
        <PreviewImage />
      </CustomPanel>
    </div>
  );
};

const PngMenu = () => {
  const [selectedOption, setSelectedOption] = useState("devis");
  const [isDisabled, setIsDisabled] = useState(false);
  // const itemPreview = useSelector((state) => state.jsonData.PreviewArticle);
  // console.log('itemPreview:', itemPreview);

  // State for form fields
  const [numeroCR, setNumeroCR] = useState("");
  const [nomClient, setNomClient] = useState("");
  const [referenceClient, setReferenceClient] = useState("");
  const [nomTechnique, setNomTechnique] = useState("");
  const [description, setDescription] = useState("");
  const [quantite, setQuantite] = useState("");
  const [fournisseur, setFournisseur] = useState("");
  const [referenceFournisseur, setReferenceFournisseur] = useState("");

  return (
    <Paper
      elevation={3}
      sx={{
        width: "100%",
        maxWidth: 600,
        maxHeight: "80vh",
        overflowY: "auto",
        padding: 3,
        borderRadius: 3,
        boxShadow: 3,
        "&::-webkit-scrollbar": {
          width: "8px",
        },
        "&::-webkit-scrollbar-track": {
          background: "#f1f1f1",
          borderRadius: "8px",
        },
        "&::-webkit-scrollbar-thumb": {
          background: "#c1c1c1",
          borderRadius: "8px",
        },
        "&::-webkit-scrollbar-thumb:hover": {
          background: "#a8a8a8",
        },
      }}
    >
      {/* Title */}
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Crochet de porte-manteau Holly - Triple, rotatif
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        (T): 75 mm, avec vis visibles
      </Typography>

      {/* Radio Buttons for Devis/Design */}
      <FormControl component="fieldset" sx={{ width: "100%", mb: 3 }}>
        <FormLabel component="legend" sx={{ fontWeight: 600 }}>
          Sélectionnez un devis
        </FormLabel>
        <RadioGroup
          value={selectedOption}
          onChange={(e) => setSelectedOption(e.target.value)}
          row
        >
          <FormControlLabel value="devis" control={<Radio />} label="Devis" />
          <FormControlLabel value="design" control={<Radio />} label="Design" />
        </RadioGroup>
      </FormControl>

      {/* Conditional Fields for Devis */}
      {selectedOption === "devis" && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label="Numéro de CR"
              value={numeroCR}
              onChange={(e) => setNumeroCR(e.target.value)}
              variant="outlined"
              fullWidth
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Nom du client"
              value={nomClient}
              onChange={(e) => setNomClient(e.target.value)}
              variant="outlined"
              fullWidth
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Référence client"
              value={referenceClient}
              onChange={(e) => setReferenceClient(e.target.value)}
              variant="outlined"
              fullWidth
            />
          </Grid>
        </Grid>
      )}

      {/* Common Fields */}
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12}>
          <TextField
            label="Nom technique"
            value={nomTechnique}
            onChange={(e) => setNomTechnique(e.target.value)}
            variant="outlined"
            fullWidth
            disabled={isDisabled}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            variant="outlined"
            fullWidth
            disabled={isDisabled}
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            label="Quantité"
            value={quantite}
            onChange={(e) => setQuantite(e.target.value)}
            variant="outlined"
            fullWidth
            disabled={isDisabled}
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            label="Fournisseur"
            value={fournisseur}
            onChange={(e) => setFournisseur(e.target.value)}
            variant="outlined"
            fullWidth
            disabled={isDisabled}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Référence Fournisseur"
            value={referenceFournisseur}
            onChange={(e) => setReferenceFournisseur(e.target.value)}
            variant="outlined"
            fullWidth
            disabled={isDisabled}
          />
        </Grid>
      </Grid>

      {/* Submit Button */}
      <Box sx={{ textAlign: "center", mt: 4 }}>
        <Button
          variant="contained"
          color="primary"
          disabled={isDisabled}
          sx={{
            textTransform: "none",
            fontSize: "1rem",
            px: 4,
            py: 1.5,
            borderRadius: 2,
          }}
        >
          Valider
        </Button>
      </Box>
    </Paper>
  );
};




