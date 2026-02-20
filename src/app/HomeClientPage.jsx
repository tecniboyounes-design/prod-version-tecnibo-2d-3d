'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import {
  Box, Container, Grid, Paper, Typography, ButtonBase, Chip, Divider,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ViewInArRoundedIcon from '@mui/icons-material/ViewInArRounded';
import SchemaRoundedIcon from '@mui/icons-material/SchemaRounded';
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import BuildCircleRoundedIcon from '@mui/icons-material/BuildCircleRounded';
import AccountCircleRoundedIcon from '@mui/icons-material/AccountCircleRounded';
import PriceChangeRoundedIcon from '@mui/icons-material/PriceChangeRounded';
import ShoppingBagRoundedIcon from '@mui/icons-material/ShoppingBagRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import SyncAltRoundedIcon from '@mui/icons-material/SyncAltRounded';

/** Prefer NEXT_PUBLIC_ODOO_BASE for client; fallback to erptest */
const ODOO_BASE =
  process.env.NEXT_PUBLIC_ODOO_BASE?.replace(/\/$/, '') || 'https://erptest.tecnibo.com';

/* ---------------- UI helpers ---------------- */
const Tile = ({ icon, title, subtitle, chip, onClick, external = false, disabled = false }) => {
  const chipColor = external ? 'info' : 'success';
  return (
    <ButtonBase
      onClick={disabled ? undefined : onClick}
      focusRipple
      disabled={disabled}
      sx={{
        width: '100%',
        textAlign: 'left',
        borderRadius: 2,
        p: { xs: 0.5, sm: 0 },
      }}
    >
      <Paper
        elevation={4}
        sx={{
          p: { xs: 1.5, sm: 2 },
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          borderRadius: 2,
          display: 'flex',
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: { xs: 1.5, sm: 2 },
          flexDirection: { xs: 'column', sm: 'row' },
          transition: 'transform 120ms ease, box-shadow 120ms ease',
          '&:hover': { transform: { sm: disabled ? 'none' : 'translateY(-2px)' } },
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <Box
          sx={{
            width: { xs: 52, sm: 44 },
            height: { xs: 52, sm: 44 },
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'grey.900',
            color: 'common.white',
            flex: '0 0 auto',
          }}
        >
          {icon}
        </Box>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.25, mb: { xs: 0.25, sm: 0 } }}>
            {title}
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: 'text.secondary', display: { xs: 'block', md: 'none' } }}
            title={subtitle}
          >
            {subtitle}
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: 'text.secondary', display: { xs: 'none', md: 'block' } }}
            noWrap
            title={subtitle}
          >
            {subtitle}
          </Typography>

          {chip && (
            <Box sx={{ mt: 1 }}>
              <Chip
                label={chip}
                size="small"
                variant="outlined"
                color={chipColor}
                sx={{
                  bgcolor: (t) => alpha(t.palette[chipColor].main, t.palette.mode === 'dark' ? 0.16 : 0.08),
                  borderColor: (t) => alpha(t.palette[chipColor].main, 0.35),
                }}
              />
            </Box>
          )}
        </Box>

        <Box sx={{ opacity: 0.7, display: 'grid', placeItems: 'center', alignSelf: { xs: 'flex-end', sm: 'center' } }}>
          {external ? <LaunchRoundedIcon /> : <ArrowForwardRoundedIcon />}
        </Box>
      </Paper>
    </ButtonBase>
  );
};

function coalesceSessionInfo(me) {
  // Accept both legacy cookie flow (session_info) and OAuth flow (userinfo)
  const si = me?.session_info || {};
  const ui = me?.userinfo || {};
  // Normalize a few fields we use in tiles
  return {
    uid: si?.uid ?? ui?.uid ?? ui?.user_id ?? null,
    name: si?.name ?? ui?.name ?? ui?.preferred_username ?? ui?.email ?? null,
    db: si?.db ?? ui?.db ?? null,
    baseUrl:
      si?.['web.base.url'] ??
      ui?.web_base_url ??
      ODOO_BASE, // safe fallback
  };
}

function buildOdooRecordUrl(baseUrl, db, model, id) {
  try {
    const base = (baseUrl || '').replace(/\/$/, '');
    if (!base || !id) return null;
    const dbq = db ? `?db=${encodeURIComponent(db)}` : '';
    return `${base}/web${dbq}#id=${encodeURIComponent(String(id))}&model=${model}&view_type=form`;
  } catch {
    return null;
  }
}

/* ---------------- Main ---------------- */
export default function HomeClientPage({ me }) {
  const router = useRouter();

  // Optional: whatever you already store in Redux
  const userInfoFromRedux = useSelector((s) => s?.jsonData?.user);

  const normalized = coalesceSessionInfo(me || userInfoFromRedux || {});
  const name = normalized.name || 'there';
  const uid = normalized.uid || null;
  const userUrl = buildOdooRecordUrl(normalized.baseUrl, normalized.db, 'res.users', uid);

  const baseHost = (() => {
    try {
      return normalized.baseUrl ? new URL(normalized.baseUrl).host : 'Odoo';
    } catch { return 'Odoo'; }
  })();

  const goExternal = (href) => { if (href) window.open(href, '_blank', 'noopener,noreferrer'); };
  const goInternal = (href) => router.push(href);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        bgcolor: (t) => (t.palette.mode === 'dark' ? '#0b1220' : '#f7f8fb'),
        backgroundImage: (t) => `
          linear-gradient(${t.palette.mode === 'dark' ? '#101829' : '#ffffff'} 0 0),
          repeating-linear-gradient(0deg, transparent, transparent 22px, ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)'} 23px),
          repeating-linear-gradient(90deg, transparent, transparent 22px, ${t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)'} 23px)
        `,
        backgroundBlendMode: 'normal, multiply, multiply',
        py: { xs: 4, md: 10 },
      }}
    >
      <Container maxWidth="md">
        <Box sx={{ mb: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Welcome to Tecnibo Back Office
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Hi {name}, what would you like to open?
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={{ xs: 1.5, sm: 2 }}>
          <Grid item xs={12} sm={6}>
            <Tile
              icon={<ViewInArRoundedIcon fontSize="medium" />}
              title="Room Planner"
              subtitle="rp.tecnibo.com — plan & configure rooms"
              chip="External"
              external
              onClick={() => goExternal('https://rp.tecnibo.com')}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Tile
              icon={<SchemaRoundedIcon fontSize="medium" />}
              title="Descriptors / Compatibility"
              subtitle="Build trees and generate SQL for COMPAT_*"
              chip="Internal"
              onClick={() => goInternal('/descriptor/COMPAT_DOOR_AF20')}
            />
          </Grid>
         
          <Grid item xs={12} sm={6}>
            <Tile
              icon={<BuildCircleRoundedIcon fontSize="medium" />}
              title="RP Configurator"
              subtitle="IMOS | Odoo sync — internal"
              chip="Internal"
              onClick={() => goInternal('/v2/configurator/')}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Tile
              icon={<BuildCircleRoundedIcon fontSize="medium" />}
              title="Configurator Builder"
              subtitle="Next-gen builder — internal"
              chip="Internal"
              onClick={() => goInternal('/v2/conf-builder')}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Tile
              icon={<AccountCircleRoundedIcon fontSize="medium" />}
              title="My Odoo Profile"
              subtitle={`${baseHost} — user form`}
              chip="External"
              external
              onClick={() => goExternal(userUrl)}
              disabled={!userUrl}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Tile
              icon={<PriceChangeRoundedIcon fontSize="medium" />}
              title="Pricing"
              subtitle="IMOS-driven pricing • materials + fire/water performance"
              chip="External"
              external
              onClick={() => goExternal('http://192.168.30.92:3333/price')}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Tile
              icon={<ShoppingBagRoundedIcon fontSize="medium" />}
              title="Create Purchase"
              subtitle="Search products, choose project & phase, submit PO"
              chip="Internal"
              onClick={() => goInternal('/pm-create-purchase')}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Tile
              icon={<UploadFileRoundedIcon fontSize="medium" />}
              title="Convert Any"
              subtitle="DWG/DXF → any format (CloudConvert)"
              chip="Internal"
              onClick={() => goInternal('/convert-any-panel')}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Tile
              icon={<SyncAltRoundedIcon fontSize="medium" />}
              title="Digital Factory 3D Converter"
              subtitle="Convert and process 3D files in Digital Factory"
              chip="Internal"
              onClick={() => goInternal('/digitalfactory/3dconverter')}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Tile
              icon={<CloudUploadRoundedIcon fontSize="medium" />}
              title="Cloudflare Files"
              subtitle="Upload & browse Cloudflare R2"
              chip="Internal"
              onClick={() => goInternal('/cloudflare/upload')}
            />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
