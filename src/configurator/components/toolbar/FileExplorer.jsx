"use client";

import * as React from "react";
import { styled, alpha } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import ArticleIcon from "@mui/icons-material/Article";
import FolderRounded from "@mui/icons-material/FolderRounded";
import ImageIcon from "@mui/icons-material/Image";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import VideoCameraBackIcon from "@mui/icons-material/VideoCameraBack";
import { RichTreeView } from "@mui/x-tree-view/RichTreeView";
import { useTreeItem } from "@mui/x-tree-view/useTreeItem";
import {
  TreeItemCheckbox,
  TreeItemIconContainer,
  TreeItemLabel,
  TreeItemGroupTransition,
} from "@mui/x-tree-view/TreeItem";
import { TreeItemIcon } from "@mui/x-tree-view/TreeItemIcon";
import { TreeItemProvider } from "@mui/x-tree-view/TreeItemProvider";
import { useTreeItemModel, useTreeViewApiRef } from "@mui/x-tree-view/hooks";
import { useDispatch, useSelector } from "react-redux";
import { setConfigurator } from "@/store";
import StorageIcon from '@mui/icons-material/Storage';
import { IconButton, Tooltip } from "@mui/material";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';

/* ──────────────── helpers ──────────────── */
function DotIcon() {
  return (
    <Box sx={{
      width: 6, height: 6, minWidth: 6, minHeight: 6,
      borderRadius: '50%', bgcolor: 'warning.main', mx: 1, flexShrink: 0,
    }} />
  );
}

const iconFromType = (t) => ({
  image: ImageIcon,
  pdf: PictureAsPdfIcon,
  doc: ArticleIcon,
  video: VideoCameraBackIcon,
  folder: StorageIcon,
}[t] || ArticleIcon);

const TreeItemRoot = styled("li")(({ theme }) => ({
  listStyle: "none",
  margin: 0,
  padding: 0,
  color: theme.palette.grey[400],
  ...theme.applyStyles("light", { color: theme.palette.grey[800] }),
}));

const TreeItemContent = styled("div")(({ theme }) => ({
  padding: theme.spacing(0.5, 1),
  paddingLeft: `calc(${theme.spacing(1)} + var(--TreeView-itemChildrenIndentation)*var(--TreeView-itemDepth))`,
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  cursor: "pointer",
  flexDirection: "row-reverse",
  borderRadius: theme.spacing(0.7),
  fontWeight: 500,
  "&[data-focused], &[data-selected]": {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
  },
  "&:hover:not([data-focused]):not([data-selected])": {
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
  },
}));



const CustomLabel = ({ icon: Icon, expandable, children, onDelete, onDuplicate, itemId, ...other }) => {
  const isRoot = itemId === "db-root";

  return (
    <TreeItemLabel
      {...other}
      sx={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        position: "relative",
        pr: 6, // space for icons
        overflow: "hidden",
      }}
    >
      {/* Icon (optional) */}
      {Icon && <Box component={Icon} sx={{ mr: 1, fontSize: "1.2rem", flexShrink: 0 }} />}

      {/* Label with fixed max width and ellipsis */}
      <Tooltip title={children} arrow>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "calc(100% - 30px)",
            display: "inline-block",
          }}
        >
          {children}
        </Typography>
      </Tooltip>

      {/* Action buttons */}
      {!isRoot && (
        <Box
          sx={{
            position: "absolute",
            right: 4,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            gap: 0.5,
            alignItems: "center",
          }}
        >
          <Tooltip title="Duplicate" arrow>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(itemId);
              }}
              sx={{ p: 0.3, color: "green" }}
            >
              <ContentCopyIcon fontSize="inherit" sx={{ fontSize: "0.85rem" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete" arrow>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(itemId);
              }}
              sx={{ p: 0.3, color: "error.main" }}
            >
              <DeleteIcon fontSize="inherit" sx={{ fontSize: "0.85rem" }} />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </TreeItemLabel>
  );
};




const CustomTreeItem = React.forwardRef(function CustomTreeItem(props, ref) {
  const { id, itemId, label, disabled, children, onDelete, ...other } = props;
  const { getContextProviderProps, getRootProps, getContentProps, getIconContainerProps, getCheckboxProps, getLabelProps, getGroupTransitionProps, status } =
    useTreeItem({ id, itemId, children, label, disabled, rootRef: ref });

  const item = useTreeItemModel(itemId);
  const Icon = itemId === 'db-root' ? StorageIcon : status.expandable ? FolderRounded : iconFromType(item.fileType);
  const handleDuplicate = (id) => console.log('duplicate', id);

  return (
    <TreeItemProvider {...getContextProviderProps()}>
      <TreeItemRoot {...getRootProps(other)}>
        <TreeItemContent {...getContentProps()}>
          <TreeItemIconContainer {...getIconContainerProps()}>
            <TreeItemIcon status={status} />
          </TreeItemIconContainer>
          <TreeItemCheckbox {...getCheckboxProps()} />

          <CustomLabel
            icon={Icon}
            expandable={status.expandable && status.expanded}
            itemId={itemId}
            onDelete={onDelete}
            onDuplicate={handleDuplicate}
            {...getLabelProps()}
          />

        </TreeItemContent>
        {children && <TreeItemGroupTransition {...getGroupTransitionProps()} />}
      </TreeItemRoot>
    </TreeItemProvider>
  );
});

export default function FileExplorer() {
  const apiRef = useTreeViewApiRef();
  const [error, setError] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const dispatch = useDispatch();
  const configuratorList = useSelector((s) => s.jsonData.configuratorList);
  const [selectedItems, setSelectedItems] = React.useState([]);

  const loadConfigurator = React.useCallback(async (id) => {
  try {
    setBusy(true);
    const res = await fetch(`/api/configurator/${id}`);
    if (!res.ok) throw new Error(`GET /api/configurator/${id} → ${res.status}`);
    const cfg = await res.json();
    dispatch(setConfigurator(cfg));
    console.info("[FileExplorer] loaded configurator", id);
  } catch (e) {
    console.error(e);
  } finally {
    setBusy(false);
  }
}, [dispatch]);




  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this configurator?')) return;

    try {
      const res = await fetch(`http://192.168.30.92:4343/configurator/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error(`Failed to delete (status ${res.status})`);

      console.log(`Configurator ${id} deleted`);

      // remove from tree
      setItems((prev) =>
        prev.map((root) => ({
          ...root,
          children: root.children.filter((child) => child.id !== String(id)),
        }))
      );
    } catch (err) {
      console.error('Error deleting configurator:', err);
    }
  };


  React.useEffect(() => {
    if (configuratorList?.length > 0 && selectedItems.length === 0) {
      const first = configuratorList[0];
      const firstId = String(first.id);
      console.log('[AutoSelect] No selection, selecting first configurator:', firstId);
      setSelectedItems([firstId]);
      loadConfigurator(first.id);
    }
  }, [configuratorList, loadConfigurator, selectedItems]);




  const handleItemClick = React.useCallback((_, itemId) => {
    if (itemId !== 'db-root') {
      console.log('[ItemClick] selected item:', itemId);
      setSelectedItems([itemId]);
      loadConfigurator(Number(itemId));
    }
  }, [loadConfigurator]);




  const items = React.useMemo(() => {
    console.log('configuratorList', configuratorList);
    if (!configuratorList) return null;
    return [{
      id: "db-root",
      label: "Postgres Configurators",
      fileType: "folder",
      children: configuratorList.map(cfg => ({
        id: String(cfg.id),
        label: cfg.cpid,
        fileType: "doc",
      }))
    }];
  }, [configuratorList]);




  if (error) return <Box p={2} color="error.main">Failed to load configurators<br />({error})</Box>;
  if (!items) return <Box p={2} display="flex" justifyContent="center"><CircularProgress size={24} /></Box>;

  return (
    <RichTreeView
      items={items}
      apiRef={apiRef}
      defaultExpandedItems={["db-root"]}
      selectedItems={selectedItems} // 👈 highlight selected
      onItemClick={handleItemClick}
      slots={{ item: (props) => <CustomTreeItem {...props} onDelete={handleDelete} /> }}
      itemChildrenIndentation={24}
      sx={{ width: 280, overflowY: "auto", p: 1, opacity: busy ? 0.4 : 1 }}
    />

  );
}
