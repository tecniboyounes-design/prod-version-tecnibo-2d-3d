import {
  alpha,
  Button,
  Chip,
  IconButton,
  InputBase,
  styled,
} from "@mui/material";

export const Search = styled("div")(({ theme }) => ({
  // position: "absolute",
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  "&:hover": {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginLeft: 0,
  width: "100%",
  [theme.breakpoints.up("sm")]: {
    marginLeft: theme.spacing(1),
    width: "auto",
  },
}));

export const SearchIconWrapper = styled("div")(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: "100%",
  position: "absolute",
  pointerEvents: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}));

export const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: "inherit",
  width: "100%",
  "& .MuiInputBase-input": {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create("width"),
    [theme.breakpoints.up("sm")]: {
      width: "12ch",
      "&:focus": {
        width: "20ch",
      },
    },
  },
}));

export const NewProjectButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.common.white,
  borderRadius: "8px",
  padding: "8px 16px",
  textTransform: "none",
  fontSize: "14px",
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
}));

export const ExpandMore = styled((props) => {
  const { expand, ...other } = props;
  return <IconButton {...other} />;
})(({ theme }) => ({
  marginLeft: "auto",
  transition: theme.transitions.create("transform", {
    duration: theme.transitions.duration.shortest,
  }),
  transform: (props) => (props.expand ? "rotate(180deg)" : "rotate(0deg)"),
}));

export const getGradientColor = (status) => {
  switch (status) {
    case "temp":
      return {
        background:
          "linear-gradient(95deg, rgb(255, 193, 7) 0%, rgb(255, 152, 0) 50%, rgb(230, 126, 0) 100%)", // Orange/Yellow
        hoverBackground:
          "linear-gradient(95deg, rgb(255, 173, 7) 0%, rgb(255, 132, 0) 50%, rgb(200, 100, 0) 100%)",
      };
    case "ordered":
      return {
        background:
          "linear-gradient(95deg, rgb(25, 118, 210) 0%, rgb(21, 101, 192) 50%, rgb(13, 71, 161) 100%)", // Blue
        hoverBackground:
          "linear-gradient(95deg, rgb(20, 100, 180) 0%, rgb(15, 90, 170) 50%, rgb(10, 60, 140) 100%)",
      };


    case "in planning":
      return {
        background:
          "linear-gradient(95deg, rgb(77, 182, 172) 0%, rgb(47, 128, 119) 50%, rgb(27, 94, 77) 100%)", // Teal (Distinct)
        hoverBackground:
          "linear-gradient(95deg, rgb(60, 150, 140) 0%, rgb(40, 120, 110) 50%, rgb(30, 90, 80) 100%)",
      };


    case "in working":
      return {
        background:
          "linear-gradient(95deg, rgb(156, 39, 176) 0%, rgb(123, 31, 162) 50%, rgb(106, 27, 154) 100%)", // Purple
        hoverBackground:
          "linear-gradient(95deg, rgb(140, 35, 160) 0%, rgb(110, 28, 150) 50%, rgb(90, 24, 140) 100%)",
      };
    case "finished":
      return {
        background:
          "linear-gradient(95deg, rgb(76, 175, 80) 0%, rgb(67, 160, 71) 50%, rgb(56, 142, 60) 100%)", // Green
        hoverBackground:
          "linear-gradient(95deg, rgb(70, 160, 75) 0%, rgb(60, 140, 65) 50%, rgb(50, 120, 55) 100%)",
      };
    default:
      return {
        background:
          "linear-gradient(95deg, rgb(158, 158, 158) 0%, rgb(117, 117, 117) 50%, rgb(97, 97, 97) 100%)", // Gray
        hoverBackground:
          "linear-gradient(95deg, rgb(140, 140, 140) 0%, rgb(100, 100, 100) 50%, rgb(80, 80, 80) 100%)",
      };
  }
};

const statusColors = {
  temp: "warning",
  ordered: "primary",
  "in planning": "info",
  "in working": "secondary",
  finished: "success",
  default: "default",
};

export const StatusChip = ({ status }) => {
  // Define specific styles for 'in planning' status
  const chipStyles = {
    fontWeight: "bold",
    padding: "2px 8px",
  };

  // Check for 'in planning' to override with custom background color
  if (status === "in planning") {
    chipStyles.backgroundColor = "#4db6ac"; 
    chipStyles.color = "#FFFFFF";
  }

  return (
    <Chip
      label={status}
      color={statusColors[status] || "default"}
      size="small"
      sx={chipStyles}
    />
  );
};


export const gridContainerStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '20px',
  padding: '20px',
  width: '100%',
  height: '100%',
  overflowY: 'auto',
  overflowX: 'hidden',
  marginBottom: '80px', 
};
