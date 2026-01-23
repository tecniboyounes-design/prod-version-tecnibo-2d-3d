'use client';

import * as React from 'react';
import { Box, CircularProgress, Tooltip, Typography } from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage';
import ArticleIcon from '@mui/icons-material/Article';
import FolderRounded from '@mui/icons-material/FolderRounded';
import { styled, alpha } from '@mui/material/styles';
import { RichTreeView } from '@mui/x-tree-view/RichTreeView';
import { useTreeItem } from '@mui/x-tree-view/useTreeItem';
import {
  TreeItemCheckbox,
  TreeItemIconContainer,
  TreeItemLabel,
  TreeItemGroupTransition,
} from '@mui/x-tree-view/TreeItem';
import { TreeItemIcon } from '@mui/x-tree-view/TreeItemIcon';
import { TreeItemProvider } from '@mui/x-tree-view/TreeItemProvider';
import { useTreeItemModel } from '@mui/x-tree-view/hooks';
import { useParams, useRouter } from 'next/navigation';

/* ---------------- styled tree item ---------------- */
const TreeItemRoot = styled('li')(({ theme }) => ({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  color: theme.palette.grey[400],
  ...theme.applyStyles?.('light', { color: theme.palette.grey[800] }),
}));

const TreeItemContent = styled('div')(({ theme }) => ({
  padding: theme.spacing(0.5, 1),
  paddingLeft: `calc(${theme.spacing(1)} + var(--TreeView-itemChildrenIndentation)*var(--TreeView-itemDepth))`,
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  cursor: 'pointer',
  flexDirection: 'row-reverse',
  borderRadius: theme.spacing(0.7),
  fontWeight: 500,
  '&[data-focused], &[data-selected]': {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
  },
  '&:hover:not([data-focused]):not([data-selected])': {
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
  },
}));

const Label = ({ icon: Icon, primary, ...other }) => (
  <TreeItemLabel
    {...other}
    sx={{ display: 'flex', alignItems: 'center', width: '100%', overflow: 'hidden', gap: 1 }}
  >
    {Icon && <Box component={Icon} sx={{ mr: 0.5, fontSize: '1.1rem', flexShrink: 0 }} />}
    <Tooltip title={primary} arrow>
      <Typography
        variant="body2"
        sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        {primary}
      </Typography>
    </Tooltip>
  </TreeItemLabel>
);

const CustomTreeItem = React.forwardRef(function CustomTreeItem(props, ref) {
  const { id, itemId, label, disabled, children, ...other } = props;
  const api = useTreeItem({ id, itemId, children, label, disabled, rootRef: ref });
  const { getContextProviderProps, getRootProps, getContentProps, getIconContainerProps, getCheckboxProps, getLabelProps, getGroupTransitionProps, status } = api;

  const item = useTreeItemModel(itemId);
  const isFolder = item?.fileType === 'folder';
  const Icon = isFolder ? FolderRounded : ArticleIcon;

  return (
    <TreeItemProvider {...getContextProviderProps()}>
      <TreeItemRoot {...getRootProps(other)}>
        <TreeItemContent {...getContentProps()}>
          <TreeItemIconContainer {...getIconContainerProps()}>
            <TreeItemIcon status={status} />
          </TreeItemIconContainer>
          <TreeItemCheckbox {...getCheckboxProps()} />
          <Label icon={isFolder ? StorageIcon : Icon} primary={label} {...getLabelProps()} />
        </TreeItemContent>
        {children && <TreeItemGroupTransition {...getGroupTransitionProps()} />}
      </TreeItemRoot>
    </TreeItemProvider>
  );
});

/* ---------------- Explorer ---------------- */

export default function DescriptorsExplorer({
  descriptors,
  defaultExpandRoot = true,
  busy = false,
}) {
  const router = useRouter();
  const params = useParams();
  const currentName = decodeURIComponent(params?.name || '');

  const [selectedItems, setSelectedItems] = React.useState([]);

  const { items, descMetaById } = React.useMemo(() => {
    const list = Array.isArray(descriptors) ? descriptors : [];
    const metaById = new Map();

    const children = list.map((d, i) => {
      const id = d.id ? String(d.id) : `desc::${d.name}::${i}`;
      const node = { id, label: d.name, fileType: 'doc' };
      metaById.set(id, { id, name: d.name });
      return node;
    });

    return {
      items: [
        {
          id: 'desc-root',
          label: 'Descriptors',
          fileType: 'folder',
          children,
        },
      ],
      descMetaById: metaById,
    };
  }, [descriptors]);

  // highlight current descriptor based on URL param
  React.useEffect(() => {
    if (!currentName) return;
    for (const [id, meta] of descMetaById.entries()) {
      if (meta.name === currentName) {
        setSelectedItems([id]);
        break;
      }
    }
  }, [currentName, descMetaById]);

  const handleItemClick = React.useCallback(
    (_, itemId) => {
      if (itemId === 'desc-root') return;
      setSelectedItems([itemId]);

      const meta = descMetaById.get(itemId);
      if (meta) {
        // 🔑 Navigate to descriptor route
        router.push(`/descriptor/${encodeURIComponent(meta.name)}`);
      }
    },
    [descMetaById, router],
  );

  if (!items) {
    return (
      <Box p={2} display="flex" justifyContent="center">
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <RichTreeView
      items={items}
      defaultExpandedItems={defaultExpandRoot ? ['desc-root'] : []}
      selectedItems={selectedItems}
      onItemClick={handleItemClick}
      slots={{ item: (props) => <CustomTreeItem {...props} /> }}
      itemChildrenIndentation={24}
      sx={{ width: 280, overflowY: 'auto', p: 1, opacity: busy ? 0.4 : 1 }}
    />
  );
}
