/* ============================================================
   AV Schematics Pro — Schematic / Patching Tool
   Depends on: React, ReactDOM, htm (all loaded via CDN/vendor)
              html2canvas, jsPDF (vendor/) for export
   ============================================================ */
(function () {
  'use strict';

  // ── dependency guard ──────────────────────────────────────
  const _R  = window.React;
  const _RD = window.ReactDOM;
  const _H  = window.htm;
  if (!_R || !_RD || !_H) {
    console.warn('AVEngineeringPro: React / ReactDOM / htm not found');
    return;
  }
  const { useState, useRef, useEffect, useCallback, useMemo } = _R;
  const html = _H.bind(_R.createElement);

  // ─────────────────────────────────────────────────────────────
  // SIGNAL TYPES
  // ─────────────────────────────────────────────────────────────
  const SIG = {
    HDMI:    { label: 'HDMI',        color: '#facc15' },
    HDMI21:  { label: 'HDMI 2.1',    color: '#fde047' },
    DP:      { label: 'DisplayPort', color: '#3b82f6' },
    MDP:     { label: 'Mini-DP',     color: '#60a5fa' },
    SDI3G:   { label: '3G-SDI',      color: '#22c55e' },
    SDI12G:  { label: '12G-SDI',     color: '#4ade80' },
    HDSDI:   { label: 'HD-SDI',      color: '#86efac' },
    NDI:     { label: 'NDI',         color: '#a855f7' },
    RJ45:    { label: 'RJ45 / Eth',  color: '#f97316' },
    DVI:     { label: 'DVI',         color: '#ec4899' },
    FIBER:   { label: 'Fiber',       color: '#14b8a6' },
    DANTE:   { label: 'Dante',       color: '#818cf8' },
    USB:     { label: 'USB',         color: '#94a3b8' },
    CUSTOM:  { label: 'Custom',      color: '#9ca3af' },
  };

  // Which types are directly compatible (no converter warning)
  const COMPAT = {
    HDMI:   ['HDMI','HDMI21','DVI'],
    HDMI21: ['HDMI21','HDMI','DVI'],
    DP:     ['DP','MDP'],
    MDP:    ['MDP','DP'],
    SDI3G:  ['SDI3G','HDSDI'],
    SDI12G: ['SDI12G','SDI3G'],
    HDSDI:  ['HDSDI','SDI3G'],
    NDI:    ['NDI','RJ45'],
    RJ45:   ['RJ45','NDI','DANTE'],
    DVI:    ['DVI','HDMI','HDMI21'],
    FIBER:  ['FIBER'],
    DANTE:  ['DANTE','RJ45'],
    USB:    ['USB'],
    CUSTOM: Object.keys(SIG),
  };

  function validateConn(outType, inType) {
    if (!outType || !inType) return { ok: false, msg: 'Unknown port type' };
    if (outType === inType) return { ok: true, msg: '' };
    const compat = COMPAT[outType] || [];
    if (compat.includes(inType)) return { ok: true, msg: `Adapter may be needed (${SIG[outType]?.label} → ${SIG[inType]?.label})` };
    return { ok: false, msg: `Incompatible: ${SIG[outType]?.label} → ${SIG[inType]?.label}` };
  }

  // ─────────────────────────────────────────────────────────────
  // DEVICE CATALOG
  // ─────────────────────────────────────────────────────────────
  const CAT = {
    media_server: { label: 'Media Servers',   icon: '🖥️',  color: '#1d4ed8' },
    switcher:     { label: 'Switchers / MEs', icon: '🔀',  color: '#7c3aed' },
    projector:    { label: 'Projectors',      icon: '📽️',  color: '#b45309' },
    matrix:       { label: 'AV Matrix / Dist',icon: '🔲',  color: '#065f46' },
    converter:    { label: 'Converters',      icon: '⚡',  color: '#374151' },
    ledprocessor: { label: 'LED Processors',  icon: '💡',  color: '#9f1239' },
    ledwall:      { label: 'LED Walls',        icon: '🖼️',  color: '#0d9488' },
    network:      { label: 'Network Switches', icon: '🌐',  color: '#0891b2' },
    custom:       { label: 'Custom Device',   icon: '⚙️',  color: '#4b5563' },
  };

  const DEVICES = [
    // ── MEDIA SERVERS ──────────────────────────────────────────
    {
      id: 'disguise_vx4', category: 'media_server', brand: 'Disguise', model: 'vx4',
      inputs: [
        { id:'i1', type:'HDMI',  label:'HDMI In 1' },
        { id:'i2', type:'HDMI',  label:'HDMI In 2' },
        { id:'i3', type:'SDI3G', label:'3G-SDI In 1' },
        { id:'i4', type:'SDI3G', label:'3G-SDI In 2' },
        { id:'i5', type:'RJ45',  label:'Network / NDI' },
      ],
      outputs: [
        { id:'o1', type:'DP',   label:'DP Out 1' },
        { id:'o2', type:'DP',   label:'DP Out 2' },
        { id:'o3', type:'DP',   label:'DP Out 3' },
        { id:'o4', type:'DP',   label:'DP Out 4' },
        { id:'o5', type:'HDMI', label:'HDMI Out 1' },
        { id:'o6', type:'NDI',  label:'NDI Output' },
      ],
      properties: { resolution:'3840×2160', refresh:'60Hz', outputs:4 },
    },
    {
      id: 'disguise_vx4plus', category: 'media_server', brand: 'Disguise', model: 'vx4+',
      inputs: [
        { id:'i1', type:'HDMI',  label:'HDMI In 1' },
        { id:'i2', type:'HDMI',  label:'HDMI In 2' },
        { id:'i3', type:'SDI12G',label:'12G-SDI In 1' },
        { id:'i4', type:'RJ45',  label:'Network / NDI' },
      ],
      outputs: [
        { id:'o1', type:'DP',    label:'DP Out 1' },
        { id:'o2', type:'DP',    label:'DP Out 2' },
        { id:'o3', type:'DP',    label:'DP Out 3' },
        { id:'o4', type:'DP',    label:'DP Out 4' },
        { id:'o5', type:'DP',    label:'DP Out 5' },
        { id:'o6', type:'DP',    label:'DP Out 6' },
        { id:'o7', type:'NDI',   label:'NDI Output' },
      ],
      properties: { resolution:'7680×4320', refresh:'60Hz', outputs:6 },
    },
    {
      id: 'disguise_vx2', category: 'media_server', brand: 'Disguise', model: 'vx2',
      inputs: [
        { id:'i1', type:'HDMI', label:'HDMI In 1' },
        { id:'i2', type:'RJ45', label:'Network / NDI' },
      ],
      outputs: [
        { id:'o1', type:'DP',   label:'DP Out 1' },
        { id:'o2', type:'DP',   label:'DP Out 2' },
        { id:'o3', type:'HDMI', label:'HDMI Out' },
        { id:'o4', type:'NDI',  label:'NDI Output' },
      ],
      properties: { resolution:'3840×2160', refresh:'60Hz', outputs:2 },
    },
    {
      id: 'disguise_gx2c', category: 'media_server', brand: 'Disguise', model: 'gx 2c',
      inputs: [
        { id:'i1', type:'SDI3G', label:'3G-SDI In' },
        { id:'i2', type:'HDMI',  label:'HDMI In' },
        { id:'i3', type:'RJ45',  label:'Network' },
      ],
      outputs: [
        { id:'o1', type:'DP',   label:'DP Out 1' },
        { id:'o2', type:'DP',   label:'DP Out 2' },
        { id:'o3', type:'DP',   label:'DP Out 3' },
        { id:'o4', type:'DP',   label:'DP Out 4' },
        { id:'o5', type:'DP',   label:'DP Out 5' },
        { id:'o6', type:'DP',   label:'DP Out 6' },
        { id:'o7', type:'DP',   label:'DP Out 7' },
        { id:'o8', type:'DP',   label:'DP Out 8' },
      ],
      properties: { resolution:'3840×2160', refresh:'120Hz', outputs:8 },
    },
    {
      id: 'dataton_wo_prod', category: 'media_server', brand: 'Dataton', model: 'WATCHOUT Production PC',
      inputs: [
        { id:'i1', type:'RJ45', label:'Ethernet (Cluster)' },
        { id:'i2', type:'USB',  label:'USB Control' },
      ],
      outputs: [
        { id:'o1', type:'RJ45', label:'Ethernet (Cluster)' },
        { id:'o2', type:'DVI',  label:'Operator Display' },
      ],
      properties: { role:'Production/Control', protocol:'WATCHOUT' },
    },
    {
      id: 'dataton_wo_disp', category: 'media_server', brand: 'Dataton', model: 'WATCHOUT Display PC',
      inputs: [
        { id:'i1', type:'RJ45', label:'Ethernet (Cluster)' },
      ],
      outputs: [
        { id:'o1', type:'DP',   label:'DP Out 1' },
        { id:'o2', type:'DP',   label:'DP Out 2' },
        { id:'o3', type:'HDMI', label:'HDMI Out' },
        { id:'o4', type:'DVI',  label:'DVI Out' },
      ],
      properties: { protocol:'WATCHOUT', outputs:4 },
    },
    {
      id: 'pixera_one', category: 'media_server', brand: 'Pixera', model: 'one',
      inputs: [
        { id:'i1', type:'HDMI', label:'HDMI In' },
        { id:'i2', type:'RJ45', label:'Network / NDI' },
      ],
      outputs: [
        { id:'o1', type:'DP',   label:'DP Out 1' },
        { id:'o2', type:'DP',   label:'DP Out 2' },
        { id:'o3', type:'HDMI', label:'HDMI Out' },
        { id:'o4', type:'NDI',  label:'NDI Output' },
      ],
      properties: { resolution:'3840×2160', refresh:'60Hz', outputs:2 },
    },
    {
      id: 'pixera_two', category: 'media_server', brand: 'Pixera', model: 'two',
      inputs: [
        { id:'i1', type:'HDMI',  label:'HDMI In 1' },
        { id:'i2', type:'HDMI',  label:'HDMI In 2' },
        { id:'i3', type:'SDI3G', label:'3G-SDI In' },
        { id:'i4', type:'RJ45',  label:'Network / NDI' },
      ],
      outputs: [
        { id:'o1', type:'DP',   label:'DP Out 1' },
        { id:'o2', type:'DP',   label:'DP Out 2' },
        { id:'o3', type:'DP',   label:'DP Out 3' },
        { id:'o4', type:'DP',   label:'DP Out 4' },
        { id:'o5', type:'NDI',  label:'NDI Output' },
      ],
      properties: { resolution:'3840×2160', refresh:'60Hz', outputs:4 },
    },
    {
      id: 'pixera_three', category: 'media_server', brand: 'Pixera', model: 'three',
      inputs: [
        { id:'i1', type:'HDMI',   label:'HDMI In 1' },
        { id:'i2', type:'HDMI',   label:'HDMI In 2' },
        { id:'i3', type:'SDI12G', label:'12G-SDI In 1' },
        { id:'i4', type:'SDI12G', label:'12G-SDI In 2' },
        { id:'i5', type:'RJ45',   label:'Network / NDI' },
      ],
      outputs: [
        { id:'o1', type:'DP', label:'DP Out 1' }, { id:'o2', type:'DP', label:'DP Out 2' },
        { id:'o3', type:'DP', label:'DP Out 3' }, { id:'o4', type:'DP', label:'DP Out 4' },
        { id:'o5', type:'DP', label:'DP Out 5' }, { id:'o6', type:'DP', label:'DP Out 6' },
        { id:'o7', type:'DP', label:'DP Out 7' }, { id:'o8', type:'DP', label:'DP Out 8' },
        { id:'o9', type:'NDI', label:'NDI Output' },
      ],
      properties: { resolution:'7680×4320', refresh:'60Hz', outputs:8 },
    },
    {
      id: 'resolume_arena', category: 'media_server', brand: 'Resolume', model: 'Arena',
      inputs: [
        { id:'i1', type:'HDMI', label:'Capture In 1' },
        { id:'i2', type:'HDMI', label:'Capture In 2' },
        { id:'i3', type:'RJ45', label:'NDI / Network' },
      ],
      outputs: [
        { id:'o1', type:'HDMI', label:'HDMI Out 1' },
        { id:'o2', type:'HDMI', label:'HDMI Out 2' },
        { id:'o3', type:'DP',   label:'DP Out 1' },
        { id:'o4', type:'NDI',  label:'NDI Output' },
      ],
      properties: { protocol:'Resolume Arena (Software)' },
    },
    {
      id: 'resolume_avenue', category: 'media_server', brand: 'Resolume', model: 'Avenue',
      inputs: [
        { id:'i1', type:'HDMI', label:'Capture In' },
        { id:'i2', type:'RJ45', label:'NDI / Network' },
      ],
      outputs: [
        { id:'o1', type:'HDMI', label:'HDMI Out 1' },
        { id:'o2', type:'HDMI', label:'HDMI Out 2' },
        { id:'o3', type:'NDI',  label:'NDI Output' },
      ],
      properties: { protocol:'Resolume Avenue (Software)' },
    },
    {
      id: 'millumin_v4', category: 'media_server', brand: 'Millumin', model: 'v4',
      inputs: [
        { id:'i1', type:'HDMI', label:'Capture In' },
        { id:'i2', type:'RJ45', label:'NDI / Syphon' },
      ],
      outputs: [
        { id:'o1', type:'HDMI', label:'HDMI Out 1' },
        { id:'o2', type:'HDMI', label:'HDMI Out 2' },
        { id:'o3', type:'DP',   label:'DP Out' },
        { id:'o4', type:'NDI',  label:'NDI Output' },
      ],
      properties: { protocol:'Millumin 4 (Mac Software)' },
    },

    // ── SWITCHERS ──────────────────────────────────────────────
    {
      id: 'barco_e2', category: 'switcher', brand: 'Barco', model: 'E2',
      inputs: [
        { id:'i1', type:'HDMI',   label:'HDMI In 1' }, { id:'i2', type:'HDMI',   label:'HDMI In 2' },
        { id:'i3', type:'HDMI',   label:'HDMI In 3' }, { id:'i4', type:'HDMI',   label:'HDMI In 4' },
        { id:'i5', type:'DP',     label:'DP In 1' },   { id:'i6', type:'DP',     label:'DP In 2' },
        { id:'i7', type:'SDI3G',  label:'SDI In 1' },  { id:'i8', type:'SDI3G',  label:'SDI In 2' },
        { id:'i9', type:'RJ45',   label:'Ethernet' },
      ],
      outputs: [
        { id:'o1', type:'HDMI',  label:'HDMI Out 1' }, { id:'o2', type:'HDMI', label:'HDMI Out 2' },
        { id:'o3', type:'DP',    label:'DP Out 1' },   { id:'o4', type:'DP',   label:'DP Out 2' },
        { id:'o5', type:'SDI3G', label:'SDI Out 1' },  { id:'o6', type:'SDI3G',label:'SDI Out 2' },
      ],
      properties: { mixers:2, resolution:'3840×2160', protocol:'Barco E2' },
    },
    {
      id: 'barco_s3', category: 'switcher', brand: 'Barco', model: 'S3-4K',
      inputs: [
        { id:'i1', type:'HDMI',  label:'HDMI In 1' }, { id:'i2', type:'HDMI',  label:'HDMI In 2' },
        { id:'i3', type:'HDMI',  label:'HDMI In 3' }, { id:'i4', type:'DP',    label:'DP In 1' },
        { id:'i5', type:'DP',    label:'DP In 2' },   { id:'i6', type:'SDI3G', label:'SDI In 1' },
        { id:'i7', type:'RJ45',  label:'Ethernet' },
      ],
      outputs: [
        { id:'o1', type:'HDMI',  label:'HDMI Out 1' }, { id:'o2', type:'HDMI', label:'HDMI Out 2' },
        { id:'o3', type:'DP',    label:'DP Out 1' },   { id:'o4', type:'DP',   label:'DP Out 2' },
        { id:'o5', type:'SDI3G', label:'SDI Out' },
      ],
      properties: { mixers:1, resolution:'3840×2160' },
    },
    {
      id: 'analogway_aquilon', category: 'switcher', brand: 'AnalogWay', model: 'Aquilon RS4',
      inputs: [
        { id:'i1', type:'HDMI',  label:'HDMI In 1' }, { id:'i2', type:'HDMI',  label:'HDMI In 2' },
        { id:'i3', type:'HDMI',  label:'HDMI In 3' }, { id:'i4', type:'HDMI',  label:'HDMI In 4' },
        { id:'i5', type:'DP',    label:'DP In 1' },   { id:'i6', type:'DP',    label:'DP In 2' },
        { id:'i7', type:'SDI3G', label:'SDI In 1' },  { id:'i8', type:'SDI3G', label:'SDI In 2' },
        { id:'i9', type:'RJ45',  label:'Ethernet' },
      ],
      outputs: [
        { id:'o1', type:'HDMI', label:'HDMI Out 1' }, { id:'o2', type:'HDMI', label:'HDMI Out 2' },
        { id:'o3', type:'HDMI', label:'HDMI Out 3' }, { id:'o4', type:'HDMI', label:'HDMI Out 4' },
        { id:'o5', type:'DP',   label:'DP Out 1' },   { id:'o6', type:'DP',   label:'DP Out 2' },
        { id:'o7', type:'DP',   label:'DP Out 3' },   { id:'o8', type:'DP',   label:'DP Out 4' },
      ],
      properties: { mixers:4, resolution:'3840×2160', seamless:true },
    },
    {
      id: 'analogway_lp', category: 'switcher', brand: 'AnalogWay', model: 'LivePremier',
      inputs: [
        { id:'i1', type:'HDMI', label:'HDMI In 1' }, { id:'i2', type:'HDMI', label:'HDMI In 2' },
        { id:'i3', type:'HDMI', label:'HDMI In 3' }, { id:'i4', type:'HDMI', label:'HDMI In 4' },
        { id:'i5', type:'DP',   label:'DP In 1' },   { id:'i6', type:'DP',   label:'DP In 2' },
        { id:'i7', type:'RJ45', label:'Ethernet' },
      ],
      outputs: [
        { id:'o1', type:'HDMI', label:'HDMI Out 1' }, { id:'o2', type:'HDMI', label:'HDMI Out 2' },
        { id:'o3', type:'DP',   label:'DP Out 1' },   { id:'o4', type:'DP',   label:'DP Out 2' },
      ],
      properties: { mixers:2, resolution:'3840×2160' },
    },
    {
      id: 'roland_v1200', category: 'switcher', brand: 'Roland', model: 'V-1200HD',
      inputs: [
        { id:'i1', type:'HDMI',  label:'HDMI In 1' }, { id:'i2', type:'HDMI',  label:'HDMI In 2' },
        { id:'i3', type:'HDMI',  label:'HDMI In 3' }, { id:'i4', type:'HDMI',  label:'HDMI In 4' },
        { id:'i5', type:'SDI3G', label:'SDI In 1' },  { id:'i6', type:'SDI3G', label:'SDI In 2' },
        { id:'i7', type:'RJ45',  label:'Ethernet' },
      ],
      outputs: [
        { id:'o1', type:'HDMI',  label:'HDMI Out 1' }, { id:'o2', type:'HDMI',  label:'HDMI Out 2' },
        { id:'o3', type:'SDI3G', label:'SDI Out 1' },  { id:'o4', type:'SDI3G', label:'SDI Out 2' },
      ],
      properties: { resolution:'1920×1080', seamless:true },
    },
    {
      id: 'roland_xs84', category: 'switcher', brand: 'Roland', model: 'XS-84H',
      inputs: [
        { id:'i1', type:'HDMI', label:'HDMI In 1' }, { id:'i2', type:'HDMI', label:'HDMI In 2' },
        { id:'i3', type:'HDMI', label:'HDMI In 3' }, { id:'i4', type:'HDMI', label:'HDMI In 4' },
        { id:'i5', type:'HDMI', label:'HDMI In 5' }, { id:'i6', type:'HDMI', label:'HDMI In 6' },
        { id:'i7', type:'HDMI', label:'HDMI In 7' }, { id:'i8', type:'HDMI', label:'HDMI In 8' },
        { id:'i9', type:'RJ45', label:'Ethernet' },
      ],
      outputs: [
        { id:'o1', type:'HDMI', label:'HDMI Out 1' }, { id:'o2', type:'HDMI', label:'HDMI Out 2' },
        { id:'o3', type:'HDMI', label:'HDMI Out 3' }, { id:'o4', type:'HDMI', label:'HDMI Out 4' },
      ],
      properties: { resolution:'1920×1080' },
    },
    {
      id: 'pixelhue_h3', category: 'switcher', brand: 'PixelHue', model: 'H3',
      inputs: [
        { id:'i1', type:'HDMI', label:'HDMI In 1' }, { id:'i2', type:'HDMI', label:'HDMI In 2' },
        { id:'i3', type:'HDMI', label:'HDMI In 3' }, { id:'i4', type:'HDMI', label:'HDMI In 4' },
        { id:'i5', type:'DP',   label:'DP In 1' },   { id:'i6', type:'DP',   label:'DP In 2' },
        { id:'i7', type:'RJ45', label:'Ethernet' },
      ],
      outputs: [
        { id:'o1', type:'HDMI', label:'HDMI Out 1' }, { id:'o2', type:'HDMI', label:'HDMI Out 2' },
        { id:'o3', type:'DP',   label:'DP Out 1' },   { id:'o4', type:'DP',   label:'DP Out 2' },
        { id:'o5', type:'DP',   label:'DP Out 3' },   { id:'o6', type:'DP',   label:'DP Out 4' },
      ],
      properties: { resolution:'3840×2160' },
    },

    // ── PROJECTORS ─────────────────────────────────────────────
    {
      id: 'panasonic_rq35k', category: 'projector', brand: 'Panasonic', model: 'PT-RQ35K',
      inputs: [
        { id:'i1', type:'HDMI21', label:'HDMI 2.0 In 1' }, { id:'i2', type:'HDMI21', label:'HDMI 2.0 In 2' },
        { id:'i3', type:'DP',     label:'DP In 1' },        { id:'i4', type:'DP',     label:'DP In 2' },
        { id:'i5', type:'SDI12G', label:'12G-SDI In' },     { id:'i6', type:'RJ45',   label:'LAN Control' },
      ],
      outputs: [{ id:'o1', type:'HDMI', label:'Monitor Out' }],
      properties: { lumens:35000, resolution:'3840×2400 (WQUXGA)', laser:'solid-state', lens:'interchangeable', series:'PT-RQ' },
    },
    {
      id: 'panasonic_rq22k', category: 'projector', brand: 'Panasonic', model: 'PT-RQ22K',
      inputs: [
        { id:'i1', type:'HDMI21', label:'HDMI 2.0 In 1' }, { id:'i2', type:'HDMI21', label:'HDMI 2.0 In 2' },
        { id:'i3', type:'DP',     label:'DP In 1' },        { id:'i4', type:'DP',     label:'DP In 2' },
        { id:'i5', type:'SDI3G',  label:'3G-SDI In' },      { id:'i6', type:'RJ45',   label:'LAN Control' },
      ],
      outputs: [{ id:'o1', type:'HDMI', label:'Monitor Out' }],
      properties: { lumens:22000, resolution:'3840×2400 (WQUXGA)', laser:'solid-state', series:'PT-RQ' },
    },
    {
      id: 'panasonic_rq13k', category: 'projector', brand: 'Panasonic', model: 'PT-RQ13K',
      inputs: [
        { id:'i1', type:'HDMI', label:'HDMI In 1' }, { id:'i2', type:'HDMI', label:'HDMI In 2' },
        { id:'i3', type:'DP',   label:'DP In 1' },   { id:'i4', type:'DP',   label:'DP In 2' },
        { id:'i5', type:'RJ45', label:'LAN Control' },
      ],
      outputs: [{ id:'o1', type:'HDMI', label:'Monitor Out' }],
      properties: { lumens:13000, resolution:'3840×2400 (WQUXGA)', laser:'solid-state', series:'PT-RQ' },
    },
    {
      id: 'panasonic_rz31k', category: 'projector', brand: 'Panasonic', model: 'PT-RZ31K',
      inputs: [
        { id:'i1', type:'HDMI',  label:'HDMI In 1' }, { id:'i2', type:'HDMI',  label:'HDMI In 2' },
        { id:'i3', type:'DP',    label:'DP In 1' },   { id:'i4', type:'DP',    label:'DP In 2' },
        { id:'i5', type:'SDI3G', label:'3G-SDI In' }, { id:'i6', type:'RJ45',  label:'LAN Control' },
      ],
      outputs: [
        { id:'o1', type:'HDMI', label:'HDMI Monitor Out' },
      ],
      properties: { lumens:31000, resolution:'1920×1200 (WUXGA)', lens:'interchangeable' },
    },
    {
      id: 'panasonic_rz21k', category: 'projector', brand: 'Panasonic', model: 'PT-RZ21K',
      inputs: [
        { id:'i1', type:'HDMI',  label:'HDMI In 1' }, { id:'i2', type:'HDMI',  label:'HDMI In 2' },
        { id:'i3', type:'DP',    label:'DP In' },      { id:'i4', type:'SDI3G', label:'3G-SDI In' },
        { id:'i5', type:'RJ45',  label:'LAN Control' },
      ],
      outputs: [
        { id:'o1', type:'HDMI', label:'HDMI Monitor Out' },
      ],
      properties: { lumens:20000, resolution:'1920×1200 (WUXGA)' },
    },
    {
      id: 'panasonic_mz20k', category: 'projector', brand: 'Panasonic', model: 'PT-MZ20K',
      inputs: [
        { id:'i1', type:'HDMI', label:'HDMI In 1' }, { id:'i2', type:'HDMI', label:'HDMI In 2' },
        { id:'i3', type:'DP',   label:'DP In' },     { id:'i4', type:'RJ45', label:'LAN Control' },
      ],
      outputs: [
        { id:'o1', type:'HDMI', label:'HDMI Monitor Out' },
      ],
      properties: { lumens:20000, resolution:'1920×1200 (WUXGA)' },
    },
    {
      id: 'christie_boxer_4k35', category: 'projector', brand: 'Christie', model: 'BOXER 4K35',
      inputs: [
        { id:'i1', type:'HDMI21', label:'HDMI 2.0 In 1' }, { id:'i2', type:'HDMI21', label:'HDMI 2.0 In 2' },
        { id:'i3', type:'DP',     label:'DP In 1' },        { id:'i4', type:'DP',     label:'DP In 2' },
        { id:'i5', type:'SDI3G',  label:'3G-SDI In' },      { id:'i6', type:'RJ45',   label:'LAN Control' },
      ],
      outputs: [{ id:'o1', type:'HDMI', label:'Monitor Out' }],
      properties: { lumens:35000, resolution:'3840×2160 (4K UHD)', lens:'interchangeable', series:'BOXER' },
    },
    {
      id: 'christie_boxer_4k30', category: 'projector', brand: 'Christie', model: 'BOXER 4K30',
      inputs: [
        { id:'i1', type:'HDMI21', label:'HDMI 2.0 In 1' }, { id:'i2', type:'HDMI21', label:'HDMI 2.0 In 2' },
        { id:'i3', type:'DP',     label:'DP In 1' },        { id:'i4', type:'DP',     label:'DP In 2' },
        { id:'i5', type:'SDI3G',  label:'3G-SDI In' },      { id:'i6', type:'RJ45',   label:'LAN Control' },
      ],
      outputs: [{ id:'o1', type:'HDMI', label:'Monitor Out' }],
      properties: { lumens:30000, resolution:'3840×2160 (4K UHD)', lens:'interchangeable', series:'BOXER' },
    },
    {
      id: 'christie_boxer_2k30', category: 'projector', brand: 'Christie', model: 'BOXER 2K30',
      inputs: [
        { id:'i1', type:'HDMI', label:'HDMI In 1' }, { id:'i2', type:'HDMI', label:'HDMI In 2' },
        { id:'i3', type:'DP',   label:'DP In 1' },   { id:'i4', type:'DP',   label:'DP In 2' },
        { id:'i5', type:'SDI3G',label:'3G-SDI In' }, { id:'i6', type:'RJ45', label:'LAN Control' },
      ],
      outputs: [{ id:'o1', type:'HDMI', label:'Monitor Out' }],
      properties: { lumens:30000, resolution:'2560×1600 (WQXGA / 2K)', series:'BOXER' },
    },
    {
      id: 'christie_boxer_2k20', category: 'projector', brand: 'Christie', model: 'BOXER 2K20',
      inputs: [
        { id:'i1', type:'HDMI', label:'HDMI In 1' }, { id:'i2', type:'HDMI', label:'HDMI In 2' },
        { id:'i3', type:'DP',   label:'DP In 1' },   { id:'i4', type:'DP',   label:'DP In 2' },
        { id:'i5', type:'SDI3G',label:'3G-SDI In' }, { id:'i6', type:'RJ45', label:'LAN Control' },
      ],
      outputs: [{ id:'o1', type:'HDMI', label:'Monitor Out' }],
      properties: { lumens:20000, resolution:'2560×1600 (WQXGA / 2K)', series:'BOXER' },
    },
    {
      id: 'christie_griffyn', category: 'projector', brand: 'Christie', model: 'Griffyn 4K35-RGB',
      inputs: [
        { id:'i1', type:'HDMI21', label:'HDMI 2.1 In 1' }, { id:'i2', type:'HDMI21', label:'HDMI 2.1 In 2' },
        { id:'i3', type:'DP',     label:'DP In 1' },        { id:'i4', type:'DP',     label:'DP In 2' },
        { id:'i5', type:'SDI3G',  label:'3G-SDI In' },      { id:'i6', type:'RJ45',   label:'LAN Control' },
      ],
      outputs: [
        { id:'o1', type:'HDMI', label:'Monitor Out' },
      ],
      properties: { lumens:35000, resolution:'3840×2400 (4K+)', laser:'RGB' },
    },
    {
      id: 'christie_mirage', category: 'projector', brand: 'Christie', model: 'Mirage SST',
      inputs: [
        { id:'i1', type:'HDMI',  label:'HDMI In 1' }, { id:'i2', type:'HDMI', label:'HDMI In 2' },
        { id:'i3', type:'DP',    label:'DP In 1' },   { id:'i4', type:'DP',   label:'DP In 2' },
        { id:'i5', type:'SDI3G', label:'3G-SDI In' }, { id:'i6', type:'RJ45', label:'LAN Control' },
      ],
      outputs: [
        { id:'o1', type:'HDMI', label:'Monitor Out' },
      ],
      properties: { lumens:25000, resolution:'2560×1600 (WQXGA)' },
    },

    // ── AV MATRIX / DISTRIBUTION ───────────────────────────────
    {
      id: 'bmd_atem_2me', category: 'matrix', brand: 'Blackmagic', model: 'ATEM 2 M/E Constellation',
      inputs: [
        { id:'i1',  type:'SDI3G',  label:'SDI In 1' }, { id:'i2',  type:'SDI3G',  label:'SDI In 2' },
        { id:'i3',  type:'SDI3G',  label:'SDI In 3' }, { id:'i4',  type:'SDI3G',  label:'SDI In 4' },
        { id:'i5',  type:'SDI3G',  label:'SDI In 5' }, { id:'i6',  type:'SDI3G',  label:'SDI In 6' },
        { id:'i7',  type:'SDI3G',  label:'SDI In 7' }, { id:'i8',  type:'SDI3G',  label:'SDI In 8' },
        { id:'i9',  type:'HDMI',   label:'HDMI In 1' }, { id:'i10', type:'HDMI',  label:'HDMI In 2' },
        { id:'i11', type:'RJ45',   label:'Ethernet / IP' },
      ],
      outputs: [
        { id:'o1', type:'SDI3G', label:'SDI PGM 1' }, { id:'o2', type:'SDI3G', label:'SDI PGM 2' },
        { id:'o3', type:'SDI3G', label:'SDI AUX 1' }, { id:'o4', type:'SDI3G', label:'SDI AUX 2' },
        { id:'o5', type:'HDMI',  label:'HDMI Out 1' }, { id:'o6', type:'HDMI', label:'HDMI Out 2' },
      ],
      properties: { mixers:2, resolution:'1080p/4K', protocol:'Blackmagic ATEM' },
    },
    {
      id: 'bmd_atem_4me', category: 'matrix', brand: 'Blackmagic', model: 'ATEM 4 M/E Broadcast Studio',
      inputs: [
        { id:'i1',  type:'SDI3G', label:'SDI In 1' }, { id:'i2',  type:'SDI3G', label:'SDI In 2' },
        { id:'i3',  type:'SDI3G', label:'SDI In 3' }, { id:'i4',  type:'SDI3G', label:'SDI In 4' },
        { id:'i5',  type:'SDI3G', label:'SDI In 5' }, { id:'i6',  type:'SDI3G', label:'SDI In 6' },
        { id:'i7',  type:'SDI3G', label:'SDI In 7' }, { id:'i8',  type:'SDI3G', label:'SDI In 8' },
        { id:'i9',  type:'HDMI',  label:'HDMI In 1' }, { id:'i10', type:'HDMI', label:'HDMI In 2' },
        { id:'i11', type:'RJ45',  label:'Ethernet / IP' },
      ],
      outputs: [
        { id:'o1', type:'SDI3G', label:'SDI PGM 1' }, { id:'o2', type:'SDI3G', label:'SDI PGM 2' },
        { id:'o3', type:'SDI3G', label:'SDI AUX 1' }, { id:'o4', type:'SDI3G', label:'SDI AUX 2' },
        { id:'o5', type:'SDI3G', label:'SDI AUX 3' }, { id:'o6', type:'SDI3G', label:'SDI AUX 4' },
        { id:'o7', type:'HDMI',  label:'HDMI Out 1' }, { id:'o8', type:'HDMI', label:'HDMI Out 2' },
      ],
      properties: { mixers:4, resolution:'1080p/4K' },
    },
    {
      id: 'bmd_hub_40x40', category: 'matrix', brand: 'Blackmagic', model: 'Smart Videohub 40×40',
      inputs:  Array.from({length:20},(_,i)=>({ id:`i${i+1}`, type:'SDI3G', label:`SDI In ${i+1}` })),
      outputs: Array.from({length:20},(_,i)=>({ id:`o${i+1}`, type:'SDI3G', label:`SDI Out ${i+1}` })),
      properties: { routing:'40×40 SDI', protocol:'Blackmagic Videohub' },
    },
    {
      id: 'lightware_mx2', category: 'matrix', brand: 'Lightware', model: 'MX2-16x16-HDMI20',
      inputs:  Array.from({length:8},(_,i)=>({ id:`i${i+1}`, type:'HDMI21', label:`HDMI In ${i+1}` })),
      outputs: Array.from({length:8},(_,i)=>({ id:`o${i+1}`, type:'HDMI21', label:`HDMI Out ${i+1}` })),
      properties: { routing:'16×16 HDMI 2.0', bandwidth:'18Gbps/port' },
    },
    {
      id: 'lightware_opt_tx', category: 'matrix', brand: 'Lightware', model: 'HDMI20-OPT-TX110',
      inputs:  [{ id:'i1', type:'HDMI21', label:'HDMI 2.0 In' }],
      outputs: [{ id:'o1', type:'FIBER',  label:'Fiber Out (LC)' }],
      properties: { protocol:'HDMI over Fiber', distance:'300m (OM3)' },
    },
    {
      id: 'lightware_opt_rx', category: 'matrix', brand: 'Lightware', model: 'HDMI20-OPT-RX110',
      inputs:  [{ id:'i1', type:'FIBER',  label:'Fiber In (LC)' }],
      outputs: [{ id:'o1', type:'HDMI21', label:'HDMI 2.0 Out' }],
      properties: { protocol:'HDMI over Fiber', distance:'300m (OM3)' },
    },

    // ── LED PROCESSORS ─────────────────────────────────────────
    {
      id: 'novastar_vx1000', category: 'ledprocessor', brand: 'Novastar', model: 'VX1000',
      inputs: [
        { id:'i1', type:'HDMI', label:'HDMI In 1' }, { id:'i2', type:'HDMI', label:'HDMI In 2' },
        { id:'i3', type:'DP',   label:'DP In 1' },   { id:'i4', type:'DP',   label:'DP In 2' },
        { id:'i5', type:'RJ45', label:'Ethernet' },
      ],
      outputs: Array.from({length:10},(_,i)=>({ id:`o${i+1}`, type:'RJ45', label:`Ethernet Out ${i+1} (LED)` })),
      properties: { pixelCapacity:'1,300,000 px', protocol:'NovaCom', maxRes:'3840×2160' },
    },
    {
      id: 'novastar_vx600', category: 'ledprocessor', brand: 'Novastar', model: 'VX600',
      inputs: [
        { id:'i1', type:'HDMI', label:'HDMI In 1' }, { id:'i2', type:'HDMI', label:'HDMI In 2' },
        { id:'i3', type:'DP',   label:'DP In' },     { id:'i4', type:'RJ45', label:'Ethernet' },
      ],
      outputs: Array.from({length:6},(_,i)=>({ id:`o${i+1}`, type:'RJ45', label:`Ethernet Out ${i+1} (LED)` })),
      properties: { pixelCapacity:'650,000 px', protocol:'NovaCom' },
    },
    {
      id: 'novastar_vx400', category: 'ledprocessor', brand: 'Novastar', model: 'VX400',
      inputs: [
        { id:'i1', type:'HDMI', label:'HDMI In 1' }, { id:'i2', type:'HDMI', label:'HDMI In 2' },
        { id:'i3', type:'DP',   label:'DP In' },     { id:'i4', type:'RJ45', label:'Ethernet' },
      ],
      outputs: Array.from({length:4},(_,i)=>({ id:`o${i+1}`, type:'RJ45', label:`Ethernet Out ${i+1} (LED)` })),
      properties: { pixelCapacity:'400,000 px', protocol:'NovaCom' },
    },
    {
      id: 'novastar_vx1u', category: 'ledprocessor', brand: 'Novastar', model: 'VX1U',
      inputs: [
        { id:'i1', type:'HDMI21', label:'HDMI 2.0 In 1' }, { id:'i2', type:'HDMI21', label:'HDMI 2.0 In 2' },
        { id:'i3', type:'DP',     label:'DP In 1' },        { id:'i4', type:'DP',     label:'DP In 2' },
        { id:'i5', type:'RJ45',   label:'Ethernet' },
      ],
      outputs: Array.from({length:16},(_,i)=>({ id:`o${i+1}`, type:'RJ45', label:`Ethernet Out ${i+1} (LED)` })),
      properties: { pixelCapacity:'2,300,000 px', protocol:'NovaCom', maxRes:'3840×2160', formFactor:'1U' },
    },
    {
      id: 'novastar_vx2u', category: 'ledprocessor', brand: 'Novastar', model: 'VX2U',
      inputs: [
        { id:'i1', type:'HDMI21', label:'HDMI 2.0 In 1' }, { id:'i2', type:'HDMI21', label:'HDMI 2.0 In 2' },
        { id:'i3', type:'DP',     label:'DP In 1' },        { id:'i4', type:'DP',     label:'DP In 2' },
        { id:'i5', type:'RJ45',   label:'Ethernet' },
      ],
      outputs: Array.from({length:20},(_,i)=>({ id:`o${i+1}`, type:'RJ45', label:`Ethernet Out ${i+1} (LED)` })),
      properties: { pixelCapacity:'3,900,000 px', protocol:'NovaCom', maxRes:'3840×2160', formFactor:'2U' },
    },
    {
      id: 'novastar_vx4u', category: 'ledprocessor', brand: 'Novastar', model: 'VX4U',
      inputs: [
        { id:'i1', type:'HDMI21', label:'HDMI 2.0 In 1' }, { id:'i2', type:'HDMI21', label:'HDMI 2.0 In 2' },
        { id:'i3', type:'DP',     label:'DP In 1' },        { id:'i4', type:'DP',     label:'DP In 2' },
        { id:'i5', type:'RJ45',   label:'Ethernet' },
      ],
      outputs: Array.from({length:32},(_,i)=>({ id:`o${i+1}`, type:'RJ45', label:`Ethernet Out ${i+1} (LED)` })),
      properties: { pixelCapacity:'7,800,000 px', protocol:'NovaCom', maxRes:'7680×2160', formFactor:'4U' },
    },
    {
      id: 'novastar_vx16s', category: 'ledprocessor', brand: 'Novastar', model: 'VX16s',
      inputs: [
        { id:'i1', type:'HDMI21', label:'HDMI 2.0 In 1' }, { id:'i2', type:'HDMI21', label:'HDMI 2.0 In 2' },
        { id:'i3', type:'DP',     label:'DP In 1' },        { id:'i4', type:'DP',     label:'DP In 2' },
        { id:'i5', type:'RJ45',   label:'Ethernet' },
      ],
      outputs: Array.from({length:16},(_,i)=>({ id:`o${i+1}`, type:'RJ45', label:`Ethernet Out ${i+1} (LED)` })),
      properties: { pixelCapacity:'2,300,000 px', protocol:'NovaCom', maxRes:'3840×2160', note:'Seamless switching' },
    },
    {
      id: 'novastar_h9', category: 'ledprocessor', brand: 'Novastar', model: 'H9',
      inputs: [
        { id:'i1', type:'HDMI21', label:'HDMI 2.0 In 1' }, { id:'i2', type:'HDMI21', label:'HDMI 2.0 In 2' },
        { id:'i3', type:'DP',     label:'DP In 1' },        { id:'i4', type:'DP',     label:'DP In 2' },
        { id:'i5', type:'RJ45',   label:'Ethernet (Control)' },
      ],
      outputs: Array.from({length:8},(_,i)=>({ id:`o${i+1}`, type:'FIBER', label:`Fiber Out ${i+1} (LED)` })),
      properties: { pixelCapacity:'4,000,000 px', protocol:'NovaCom / ColorLight', maxRes:'3840×2160', note:'Fiber output' },
    },
    {
      id: 'brompton_tessera', category: 'ledprocessor', brand: 'Brompton', model: 'Tessera SX40',
      inputs: [
        { id:'i1', type:'HDMI21', label:'HDMI 2.0 In 1' }, { id:'i2', type:'HDMI21', label:'HDMI 2.0 In 2' },
        { id:'i3', type:'DP',     label:'DP In 1' },         { id:'i4', type:'DP',     label:'DP In 2' },
        { id:'i5', type:'RJ45',   label:'Ethernet' },
      ],
      outputs: Array.from({length:24},(_,i)=>({ id:`o${i+1}`, type:'FIBER', label:`Fiber Out ${i+1} (LED)` })),
      properties: { pixelCapacity:'8,294,400 px', protocol:'Brompton', hdr:true },
    },

    // ── CONVERTERS ─────────────────────────────────────────────
    {
      id: 'conv_sdi_hdmi', category: 'converter', brand: 'Generic', model: 'SDI → HDMI Converter',
      inputs:  [{ id:'i1', type:'SDI3G', label:'SDI In' }],
      outputs: [{ id:'o1', type:'HDMI',  label:'HDMI Out' }],
      properties: { note:'Signal conversion — check resolution support' },
    },
    {
      id: 'conv_hdmi_sdi', category: 'converter', brand: 'Generic', model: 'HDMI → SDI Converter',
      inputs:  [{ id:'i1', type:'HDMI',  label:'HDMI In' }],
      outputs: [{ id:'o1', type:'SDI3G', label:'SDI Out' }],
      properties: { note:'Signal conversion' },
    },
    {
      id: 'conv_dp_hdmi', category: 'converter', brand: 'Generic', model: 'DP → HDMI Adapter',
      inputs:  [{ id:'i1', type:'DP',   label:'DP In' }],
      outputs: [{ id:'o1', type:'HDMI', label:'HDMI Out' }],
      properties: { note:'Passive or active adapter' },
    },
    {
      id: 'conv_hdmi_dp', category: 'converter', brand: 'Generic', model: 'HDMI → DP Converter',
      inputs:  [{ id:'i1', type:'HDMI', label:'HDMI In' }],
      outputs: [{ id:'o1', type:'DP',   label:'DP Out' }],
      properties: { note:'Active converter required' },
    },
    {
      id: 'conv_fiber_hdmi', category: 'converter', brand: 'Generic', model: 'Fiber HDMI Extender (TX)',
      inputs:  [{ id:'i1', type:'HDMI',  label:'HDMI In' }],
      outputs: [{ id:'o1', type:'FIBER', label:'Fiber Out' }],
      properties: { distance:'100–300m', protocol:'HDBaseT / Fiber' },
    },
    {
      id: 'conv_fiber_hdmi_rx', category: 'converter', brand: 'Generic', model: 'Fiber HDMI Extender (RX)',
      inputs:  [{ id:'i1', type:'FIBER', label:'Fiber In' }],
      outputs: [{ id:'o1', type:'HDMI',  label:'HDMI Out' }],
      properties: { distance:'100–300m', protocol:'HDBaseT / Fiber' },
    },
    {
      id: 'conv_mdp_dp', category: 'converter', brand: 'Generic', model: 'Mini-DP → DP Adapter',
      inputs:  [{ id:'i1', type:'MDP', label:'Mini-DP In' }],
      outputs: [{ id:'o1', type:'DP',  label:'DP Out' }],
      properties: { note:'Passive adapter' },
    },

    // ── NETWORK SWITCHES ───────────────────────────────────────
    {
      id: 'netgear_m4300', category: 'network', brand: 'Netgear', model: 'M4300-24X',
      inputs: [
        { id:'i1', type:'RJ45', label:'Port 1' }, { id:'i2', type:'RJ45', label:'Port 2' },
        { id:'i3', type:'RJ45', label:'Port 3' }, { id:'i4', type:'RJ45', label:'Port 4' },
        { id:'i5', type:'RJ45', label:'Port 5' }, { id:'i6', type:'RJ45', label:'Port 6' },
        { id:'i7', type:'RJ45', label:'Port 7' }, { id:'i8', type:'RJ45', label:'Port 8' },
      ],
      outputs: [
        { id:'o1', type:'RJ45', label:'Port 9' },  { id:'o2', type:'RJ45', label:'Port 10' },
        { id:'o3', type:'RJ45', label:'Port 11' }, { id:'o4', type:'RJ45', label:'Port 12' },
        { id:'o5', type:'RJ45', label:'Port 13' }, { id:'o6', type:'RJ45', label:'Port 14' },
        { id:'o7', type:'RJ45', label:'Port 15' }, { id:'o8', type:'RJ45', label:'Port 16' },
      ],
      properties: { speed:'10G', ports:24, managed:true, protocol:'AV-over-IP / NDI' },
    },
    {
      id: 'generic_switch_8p', category: 'network', brand: 'Generic', model: '8-Port Gigabit Switch',
      inputs: [
        { id:'i1', type:'RJ45', label:'Port 1' }, { id:'i2', type:'RJ45', label:'Port 2' },
        { id:'i3', type:'RJ45', label:'Port 3' }, { id:'i4', type:'RJ45', label:'Port 4' },
      ],
      outputs: [
        { id:'o1', type:'RJ45', label:'Port 5' }, { id:'o2', type:'RJ45', label:'Port 6' },
        { id:'o3', type:'RJ45', label:'Port 7' }, { id:'o4', type:'RJ45', label:'Port 8' },
      ],
      properties: { speed:'1G', ports:8, managed:false },
    },

    // ── LED WALLS ──────────────────────────────────────────────
    {
      id: 'ledwall_indoor_ph15', category: 'ledwall', brand: 'Generic', model: 'Indoor LED PH1.5',
      inputs:  [
        { id:'i1', type:'RJ45', label:'Ethernet In 1' },
        { id:'i2', type:'RJ45', label:'Ethernet In 2' },
      ],
      outputs: [{ id:'o1', type:'RJ45', label:'Ethernet Loop-Out' }],
      properties: { pitch:'1.5mm', panelRes:'192×192 px', protocol:'NovaCom / ColorLight', install:'Indoor' },
    },
    {
      id: 'ledwall_indoor_ph19', category: 'ledwall', brand: 'Generic', model: 'Indoor LED PH1.9',
      inputs:  [
        { id:'i1', type:'RJ45', label:'Ethernet In 1' },
        { id:'i2', type:'RJ45', label:'Ethernet In 2' },
      ],
      outputs: [{ id:'o1', type:'RJ45', label:'Ethernet Loop-Out' }],
      properties: { pitch:'1.9mm', panelRes:'160×160 px', protocol:'NovaCom / ColorLight', install:'Indoor' },
    },
    {
      id: 'ledwall_indoor_ph26', category: 'ledwall', brand: 'Generic', model: 'Indoor LED PH2.6',
      inputs:  [
        { id:'i1', type:'RJ45', label:'Ethernet In 1' },
        { id:'i2', type:'RJ45', label:'Ethernet In 2' },
      ],
      outputs: [{ id:'o1', type:'RJ45', label:'Ethernet Loop-Out' }],
      properties: { pitch:'2.6mm', panelRes:'192×192 px', protocol:'NovaCom / ColorLight', install:'Indoor' },
    },
    {
      id: 'ledwall_outdoor_ph39', category: 'ledwall', brand: 'Generic', model: 'Outdoor LED PH3.9',
      inputs:  [
        { id:'i1', type:'RJ45', label:'Ethernet In 1' },
        { id:'i2', type:'RJ45', label:'Ethernet In 2' },
      ],
      outputs: [{ id:'o1', type:'RJ45', label:'Ethernet Loop-Out' }],
      properties: { pitch:'3.9mm', panelRes:'128×128 px', protocol:'NovaCom / ColorLight', install:'Outdoor / IP65' },
    },
    {
      id: 'ledwall_outdoor_ph59', category: 'ledwall', brand: 'Generic', model: 'Outdoor LED PH5.9',
      inputs:  [
        { id:'i1', type:'RJ45', label:'Ethernet In 1' },
        { id:'i2', type:'RJ45', label:'Ethernet In 2' },
      ],
      outputs: [{ id:'o1', type:'RJ45', label:'Ethernet Loop-Out' }],
      properties: { pitch:'5.9mm', panelRes:'128×128 px', protocol:'NovaCom / ColorLight', install:'Outdoor / IP65' },
    },
    {
      id: 'ledwall_brompton_indoor', category: 'ledwall', brand: 'Brompton', model: 'HDR LED Panel (Fiber)',
      inputs:  [
        { id:'i1', type:'FIBER', label:'Fiber In 1' },
        { id:'i2', type:'FIBER', label:'Fiber In 2' },
      ],
      outputs: [{ id:'o1', type:'FIBER', label:'Fiber Loop-Out' }],
      properties: { pitch:'1.5–2.6mm', protocol:'Brompton HDR', install:'Indoor / HDR' },
    },
    {
      id: 'novastar_ph15_panel', category: 'ledwall', brand: 'Novastar', model: 'PH1.5 Cabinet',
      inputs:  [
        { id:'i1', type:'RJ45', label:'Ethernet In 1' },
        { id:'i2', type:'RJ45', label:'Ethernet In 2' },
      ],
      outputs: [{ id:'o1', type:'RJ45', label:'Ethernet Loop-Out' }],
      properties: { pitch:'1.5mm', panelRes:'320×160 px', protocol:'NovaCom', install:'Indoor' },
    },
    {
      id: 'absen_polaris19', category: 'ledwall', brand: 'Absen', model: 'Polaris PH1.9',
      inputs:  [
        { id:'i1', type:'RJ45', label:'Ethernet In 1' },
        { id:'i2', type:'RJ45', label:'Ethernet In 2' },
      ],
      outputs: [{ id:'o1', type:'RJ45', label:'Ethernet Loop-Out' }],
      properties: { pitch:'1.9mm', panelRes:'288×288 px', protocol:'ColorLight / Absen', install:'Indoor' },
    },
    {
      id: 'absen_outdoor_ph39', category: 'ledwall', brand: 'Absen', model: 'Acclaim PH3.9',
      inputs:  [
        { id:'i1', type:'RJ45', label:'Ethernet In 1' },
        { id:'i2', type:'RJ45', label:'Ethernet In 2' },
      ],
      outputs: [{ id:'o1', type:'RJ45', label:'Ethernet Loop-Out' }],
      properties: { pitch:'3.9mm', panelRes:'128×128 px', protocol:'ColorLight / Absen', install:'Outdoor / IP65' },
    },
    {
      id: 'unilumin_upad26', category: 'ledwall', brand: 'Unilumin', model: 'UPad III PH2.6',
      inputs:  [
        { id:'i1', type:'RJ45', label:'Ethernet In 1' },
        { id:'i2', type:'RJ45', label:'Ethernet In 2' },
      ],
      outputs: [{ id:'o1', type:'RJ45', label:'Ethernet Loop-Out' }],
      properties: { pitch:'2.6mm', panelRes:'192×192 px', protocol:'NovaCom / ColorLight', install:'Indoor' },
    },
    {
      id: 'gloshine_pl195', category: 'ledwall', brand: 'Gloshine', model: 'PL1.95 Cabinet',
      inputs:  [
        { id:'i1', type:'RJ45', label:'Ethernet In 1' },
        { id:'i2', type:'RJ45', label:'Ethernet In 2' },
      ],
      outputs: [{ id:'o1', type:'RJ45', label:'Ethernet Loop-Out' }],
      properties: { pitch:'1.95mm', panelRes:'320×160 px', protocol:'NovaCom', install:'Indoor' },
    },
  ];

  // ─────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────
  let _uid = 1;
  function uid() { return 'n' + (Date.now()).toString(36) + (_uid++).toString(36); }

  const CUSTOM_DEV_KEY = 'aveng_custom_devices_v1';
  let _runtimeCustomDevices = []; // synced from App state via useEffect

  function getDevice(id) {
    return DEVICES.find(d => d.id === id) || _runtimeCustomDevices.find(d => d.id === id);
  }

  function getNode(nodes, id) { return nodes.find(n => n.id === id); }

  function getPort(node, portId) {
    const dev = getDevice(node.deviceId);
    if (!dev) return null;
    return [...(dev.inputs||[]), ...(dev.outputs||[])].find(p => p.id === portId) || null;
  }

  // Card layout constants
  const NW = 340;          // node width
  const HDR = 52;          // header height
  const PH = 30;           // port row height
  const COL_HDR = 26;      // column header ("INPUTS" / "OUTPUTS") height
  const BODY_PAD = 10;     // body top padding before column header

  // Short display names used in auto-renaming port labels when card type changes
  const SIG_SHORT = {
    HDMI:'HDMI', HDMI21:'HDMI 2.1', DP:'DP', MDP:'Mini-DP',
    SDI3G:'SDI', SDI12G:'12G-SDI', HDSDI:'HD-SDI',
    NDI:'NDI', RJ45:'RJ45', DVI:'DVI', FIBER:'Fiber', DANTE:'Dante', USB:'USB',
  };

  // Merge device base ports with per-node overrides (type swaps + label renames + extra cards)
  function resolveNodePorts(node, overrides) {
    const dev = getDevice(node.deviceId);
    if (!dev) return { inputs: [], outputs: [] };
    const ov = (overrides || {})[node.id] || {};
    const inputs  = (dev.inputs  || []).map(p => ({ ...p, type: ov.portTypes?.[p.id] ?? p.type, label: ov.portLabels?.[p.id] ?? p.label }));
    const outputs = (dev.outputs || []).map(p => ({ ...p, type: ov.portTypes?.[p.id] ?? p.type, label: ov.portLabels?.[p.id] ?? p.label }));
    return {
      inputs:  [...inputs,  ...(ov.extraInputs  || [])],
      outputs: [...outputs, ...(ov.extraOutputs || [])],
    };
  }

  function nodeHeight(node, overrides) {
    const { inputs, outputs } = resolveNodePorts(node, overrides);
    const rows = Math.max(inputs.length, outputs.length);
    if (!rows) return HDR + 60;
    return HDR + BODY_PAD + COL_HDR + rows * PH + 10;
  }

  // Get the canvas-space coordinates of a port handle
  function portCoords(node, portId, isOutput, overrides) {
    const { inputs, outputs } = resolveNodePorts(node, overrides);
    const list = isOutput ? outputs : inputs;
    const idx = list.findIndex(p => p.id === portId);
    if (idx < 0) return { x: node.position.x, y: node.position.y };
    const x = isOutput ? node.position.x + NW : node.position.x;
    const y = node.position.y + HDR + BODY_PAD + COL_HDR + idx * PH + PH / 2;
    return { x, y };
  }

  // ── Orthogonal Z-routing ────────────────────────────────────
  // Exits output port horizontally → bends at midpoint → enters input port horizontally
  const ORTHO_GAP = 64; // horizontal stub length from each port edge
  const CORNER_R  = 10; // rounded corner radius in px

  const LANE_STEP = 26; // px spacing between parallel cables sharing the same trunk

  function orthoPath(x1, y1, x2, y2, midXOffset = 0, lineOffY = 0) {
    if (x2 > x1 + ORTHO_GAP * 2) {
      // Normal left-to-right route — stagger the vertical trunk column
      const mid = (x1 + x2) / 2 + midXOffset;
      const vy  = y1 === y2 ? 0 : (y2 > y1 ? 1 : -1);
      if (vy === 0) return `M ${x1} ${y1} H ${x2}`; // straight wire
      const cr = Math.min(CORNER_R, Math.abs(y2 - y1) / 2, (mid - x1) / 2, (x2 - mid) / 2);
      return [
        `M ${x1} ${y1}`,
        `H ${mid - cr}`, `Q ${mid} ${y1} ${mid} ${y1 + vy * cr}`,
        `V ${y2 - vy * cr}`, `Q ${mid} ${y2} ${mid + cr} ${y2}`,
        `H ${x2}`,
      ].join(' ');
    } else {
      // Back-route: nodes overlap or right-to-left — loop around vertically
      const ex1  = x1 + ORTHO_GAP + Math.max(0, midXOffset);
      const ex2  = x2 - ORTHO_GAP + Math.min(0, midXOffset);
      const topY = Math.min(y1, y2) - 68 - Math.abs(midXOffset) * 0.7 + lineOffY;
      const hGap = Math.abs(ex1 - ex2);
      const cr   = Math.min(CORNER_R,
        Math.abs(y1 - topY) / 2,
        Math.abs(y2 - topY) / 2,
        hGap > 0 ? hGap / 2 : CORNER_R,
        ORTHO_GAP / 2
      );
      return [
        `M ${x1} ${y1}`,
        `H ${ex1 - cr}`, `Q ${ex1} ${y1} ${ex1} ${y1 - cr}`,
        `V ${topY + cr}`, `Q ${ex1} ${topY} ${ex1 - cr} ${topY}`,
        `H ${ex2 + cr}`, `Q ${ex2} ${topY} ${ex2} ${topY + cr}`,
        `V ${y2 - cr}`, `Q ${ex2} ${y2} ${ex2 + cr} ${y2}`,
        `H ${x2}`,
      ].join(' ');
    }
  }

  function orthoLabelPos(x1, y1, x2, y2, midXOffset = 0) {
    if (x2 > x1 + ORTHO_GAP * 2) {
      const mid = (x1 + x2) / 2 + midXOffset;
      return { x: mid + 6, y: (y1 + y2) / 2 - 10 };
    }
    const ex1  = x1 + ORTHO_GAP + Math.max(0, midXOffset);
    const topY = Math.min(y1, y2) - 68 - Math.abs(midXOffset) * 0.7;
    return { x: ex1 + 6, y: topY - 8 };
  }

  // ── Helpers for draggable cable label badges ────────────────
  // Returns the list of orthogonal segments for a connection path
  function buildOrthoSegments(x1, y1, x2, y2, midXOffset, lineOffY = 0) {
    if (x2 > x1 + ORTHO_GAP * 2) {
      const mid = (x1 + x2) / 2 + midXOffset;
      return [
        { ax: x1,  ay: y1,   bx: mid, by: y1  },
        { ax: mid, ay: y1,   bx: mid, by: y2  },
        { ax: mid, ay: y2,   bx: x2,  by: y2  },
      ];
    }
    const ex1  = x1 + ORTHO_GAP + Math.max(0, midXOffset);
    const ex2  = x2 - ORTHO_GAP + Math.min(0, midXOffset);
    const topY = Math.min(y1, y2) - 68 - Math.abs(midXOffset) * 0.7 + lineOffY;
    return [
      { ax: x1,  ay: y1,   bx: ex1, by: y1   },
      { ax: ex1, ay: y1,   bx: ex1, by: topY },
      { ax: ex1, ay: topY, bx: ex2, by: topY },
      { ax: ex2, ay: topY, bx: ex2, by: y2   },
      { ax: ex2, ay: y2,   bx: x2,  by: y2   },
    ];
  }

  // Returns {x,y} for a parametric position t in [0,1] along a segment array
  function pointAtT(segs, t) {
    const lengths = segs.map(s => Math.hypot(s.bx - s.ax, s.by - s.ay));
    const total   = lengths.reduce((a, b) => a + b, 0);
    if (total === 0) return { x: segs[0].ax, y: segs[0].ay };
    let rem = Math.max(0, Math.min(1, t)) * total;
    for (let i = 0; i < segs.length; i++) {
      if (rem <= lengths[i] || i === segs.length - 1) {
        const frac = lengths[i] > 0 ? rem / lengths[i] : 0;
        return {
          x: segs[i].ax + (segs[i].bx - segs[i].ax) * frac,
          y: segs[i].ay + (segs[i].by - segs[i].ay) * frac,
        };
      }
      rem -= lengths[i];
    }
    return { x: segs[segs.length - 1].bx, y: segs[segs.length - 1].by };
  }

  // Returns the t value [0,1] of the nearest point on the path to (px, py)
  function nearestTOnPath(segs, px, py) {
    const lengths = segs.map(s => Math.hypot(s.bx - s.ax, s.by - s.ay));
    const total   = lengths.reduce((a, b) => a + b, 0);
    if (total === 0) return 0.5;
    let bestDist = Infinity, bestT = 0.5, cumLen = 0;
    for (let i = 0; i < segs.length; i++) {
      const { ax, ay, bx, by } = segs[i];
      const len = lengths[i];
      if (len === 0) { cumLen += len; continue; }
      const dx = bx - ax, dy = by - ay;
      const t0 = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (len * len)));
      const nearX = ax + t0 * dx, nearY = ay + t0 * dy;
      const dist  = Math.hypot(px - nearX, py - nearY);
      if (dist < bestDist) { bestDist = dist; bestT = (cumLen + t0 * len) / total; }
      cumLen += len;
    }
    return Math.max(0, Math.min(1, bestT));
  }

  // ── Distributed segment arrows ──────────────────────────────
  //  Returns array of {x, y, angle} for chevrons placed every ~ARROW_STEP px
  //  along each segment of the orthogonal path, skipping very short segments.
  const ARROW_STEP = 58;  // pixels between arrows on a segment
  const ARROW_MIN_SEG = 36; // minimum segment length to draw an arrow on

  function segmentArrows(x1, y1, x2, y2, midXOffset = 0, lineOffY = 0) {
    let segs;
    if (x2 > x1 + ORTHO_GAP * 2) {
      const mid = (x1 + x2) / 2 + midXOffset;
      segs = [
        { ax: x1, ay: y1, bx: mid, by: y1 },   // horizontal →
        { ax: mid, ay: y1, bx: mid, by: y2 },   // vertical
        { ax: mid, ay: y2, bx: x2, by: y2 },    // horizontal →
      ];
    } else {
      const ex1 = x1 + ORTHO_GAP + Math.max(0, midXOffset);
      const ex2 = x2 - ORTHO_GAP + Math.min(0, midXOffset);
      const topY = Math.min(y1, y2) - 68 - Math.abs(midXOffset) * 0.7 + lineOffY;
      segs = [
        { ax: x1,  ay: y1,   bx: ex1, by: y1   },
        { ax: ex1, ay: y1,   bx: ex1, by: topY  },
        { ax: ex1, ay: topY, bx: ex2, by: topY  },
        { ax: ex2, ay: topY, bx: ex2, by: y2    },
        { ax: ex2, ay: y2,   bx: x2,  by: y2    },
      ];
    }

    const arrows = [];
    for (const { ax, ay, bx, by } of segs) {
      const dx = bx - ax, dy = by - ay;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < ARROW_MIN_SEG) continue;
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      // place arrows at 1/3 and 2/3 for segments >= 2*ARROW_STEP, else at 1/2
      if (len >= ARROW_STEP * 1.7) {
        arrows.push({ x: ax + dx * 0.33, y: ay + dy * 0.33, angle });
        arrows.push({ x: ax + dx * 0.67, y: ay + dy * 0.67, angle });
      } else {
        arrows.push({ x: ax + dx * 0.5, y: ay + dy * 0.5, angle });
      }
    }
    return arrows;
  }

  // ── Manual (free-form polyline) routing helpers ──────────────
  // Build SVG path string from start → optional waypoints → end (straight-line segments)
  function manualPath(x1, y1, x2, y2, waypoints) {
    const pts = [{ x: x1, y: y1 }, ...(waypoints || []), { x: x2, y: y2 }];
    return pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
  }
  // Build segment array [{ax,ay,bx,by}] for the same polyline (used by pointAtT / badge)
  function manualSegs(x1, y1, x2, y2, waypoints) {
    const pts = [{ x: x1, y: y1 }, ...(waypoints || []), { x: x2, y: y2 }];
    const segs = [];
    for (let i = 0; i < pts.length - 1; i++)
      segs.push({ ax: pts[i].x, ay: pts[i].y, bx: pts[i + 1].x, by: pts[i + 1].y });
    return segs;
  }
  // Arrows for a manual polyline (place one chevron per segment at midpoint)
  function manualArrows(x1, y1, x2, y2, waypoints) {
    const segs = manualSegs(x1, y1, x2, y2, waypoints);
    return segs.map(({ ax, ay, bx, by }) => {
      const dx = bx - ax, dy = by - ay;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < ARROW_MIN_SEG) return null;
      return { x: ax + dx * 0.5, y: ay + dy * 0.5, angle: Math.atan2(dy, dx) * 180 / Math.PI };
    }).filter(Boolean);
  }

  // ── Cable auto-label ─────────────────────────────────────────
  const SIG_PREFIX = {
    HDMI:'V', HDMI21:'V', DP:'V', MDP:'V', DVI:'V',
    SDI3G:'V', SDI12G:'V', HDSDI:'V',
    NDI:'N', RJ45:'N',
    FIBER:'F',
    DANTE:'A',
    USB:'U',
  };
  function nextCableLabel(existingConns, portType) {
    const prefix = SIG_PREFIX[portType] || 'C';
    const existing = existingConns.filter(c => (c.cableLabel||'').startsWith(prefix)).length;
    return `${prefix}${String(existing + 1).padStart(2, '0')}`;
  }

  // ─────────────────────────────────────────────────────────────
  // PROJECT STORE (localStorage)
  // ─────────────────────────────────────────────────────────────
  const STORE_KEY = 'aveng_projects_v1';

  const ProjectStore = {
    list() {
      try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch { return []; }
    },
    save(name, state) {
      const projects = ProjectStore.list();
      const existing = projects.findIndex(p => p.name === name);
      const entry = { id: uid(), name, savedAt: new Date().toISOString(), nodes: state.nodes, connections: state.connections, viewport: state.viewport, textBoxes: state.textBoxes || [], rackOrder: state.rackOrder || [] };
      if (existing >= 0) projects[existing] = entry;
      else projects.unshift(entry);
      try { localStorage.setItem(STORE_KEY, JSON.stringify(projects)); } catch (e) { alert('Storage full — cannot save project.'); }
      return projects;
    },
    delete(name) {
      const projects = ProjectStore.list().filter(p => p.name !== name);
      try { localStorage.setItem(STORE_KEY, JSON.stringify(projects)); } catch {}
      return projects;
    },
  };

  // ─────────────────────────────────────────────────────────────
  // PDF VECTOR SCHEMATIC RENDERER
  // ─────────────────────────────────────────────────────────────
  // PDF VECTOR SCHEMATIC RENDERER  (A3 landscape, fixed-size elements)
  // ─────────────────────────────────────────────────────────────
  function drawVectorSchematicPage(pdf, nodes, connections, nodeOverrides, W, H, isDark) {
    if (isDark === undefined) isDark = true;

    // ── Colour helper ──────────────────────────────────────────
    function hRgb(hex) {
      const h = ((hex || '#64748b').replace('#', '') + '000000').slice(0, 6);
      return [parseInt(h.slice(0,2),16)||100, parseInt(h.slice(2,4),16)||116, parseInt(h.slice(4,6),16)||139];
    }

    // ── Fixed visual-element sizes (always readable, never scaled down) ──
    const WIRE_W      = 0.9;   // mm — main wire stroke
    const WIRE_SHD    = 1.8;   // mm — shadow stroke
    const PORT_R      = 2.0;   // mm — port handle radius
    const BORDER_W    = 0.6;   // mm — card border
    const DIV_W       = 0.25;  // mm — thin dividers
    const ARROW_ARM   = 3.5;   // mm — half-length of arrowhead arm
    const CABLE_BADGE_R = 0.8; // rounded corner on cable badge

    // Font sizes (pt) — these are always set directly on the pdf object
    const FS_BRAND = 7;    // device brand
    const FS_MODEL = 10;   // model / custom label
    const FS_CHDR  = 6;    // column headers (INPUTS / OUTPUTS)
    const FS_PORT  = 7.5;  // port label
    const FS_CABLE = 7;    // cable badge label
    const FS_FOOT  = 7.5;  // footer text

    // ── Background ────────────────────────────────────────────
    if (isDark) {
      pdf.setFillColor(3, 13, 30);
      pdf.rect(0, 0, W, H, 'F');
      pdf.setFillColor(18, 40, 68);
    } else {
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, W, H, 'F');
      pdf.setFillColor(220, 228, 240);
    }
    // subtle dot grid
    const GRID = 8;
    for (let gx = GRID; gx < W; gx += GRID) {
      for (let gy = GRID; gy < H; gy += GRID) {
        pdf.circle(gx, gy, 0.18, 'F');
      }
    }

    if (nodes.length === 0) {
      pdf.setTextColor(40, 80, 120);
      pdf.setFontSize(16);
      pdf.text('No devices on canvas', W / 2, H / 2, { align: 'center' });
      return;
    }

    // ── Compute scene bounding box ─────────────────────────────
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      const { inputs, outputs } = resolveNodePorts(n, nodeOverrides);
      const rows = Math.max(inputs.length, outputs.length);
      const h = HDR + BODY_PAD + COL_HDR + rows * PH + 10;
      // include stub space for connection routing
      minX = Math.min(minX, n.position.x - ORTHO_GAP * 2);
      minY = Math.min(minY, n.position.y - 60);
      maxX = Math.max(maxX, n.position.x + NW + ORTHO_GAP * 2);
      maxY = Math.max(maxY, n.position.y + h + 60);
    });

    // Page margins (leave room for bottom title bar)
    const MG   = 14;      // side/top margin mm
    const FOOT = 10;      // bottom footer bar height mm
    const availW = W - MG * 2;
    const availH = H - MG - FOOT - 6;

    const sceneW = (maxX - minX) || 1;
    const sceneH = (maxY - minY) || 1;

    // Geometric scale: fit scene into available page area
    // Cap at 0.7 so single-node diagrams don't overflow
    const sc = Math.min(availW / sceneW, availH / sceneH, 0.7);

    // Centre the scene in the available area
    const ox = MG + (availW - sceneW * sc) / 2 - minX * sc;
    const oy = MG + (availH - sceneH * sc) / 2 - minY * sc;

    // Coordinate helpers — position only
    const mx  = x => ox + x * sc;
    const my  = y => oy + y * sc;
    // Scaled sizes — used for geometry, clamped with minimum floors
    const mw  = (s, floor) => Math.max(floor, s * sc);

    // ── Lane offsets ──────────────────────────────────────────
    const pairCount = {}, pairIdx = {}, laneMap = {};
    connections.forEach(c => {
      const k = `${c.fromNodeId}→${c.toNodeId}`;
      pairCount[k] = (pairCount[k] || 0) + 1;
    });
    connections.forEach(c => {
      const k = `${c.fromNodeId}→${c.toNodeId}`;
      if (pairIdx[k] === undefined) pairIdx[k] = 0;
      laneMap[c.id] = pairIdx[k]++;
    });

    // ── Helper: compute port xy in mm from fixed layout ───────
    // Mirrors portCoords() but works in mm using the scaled card layout
    function portMM(node, portId, isOutput) {
      const { inputs, outputs } = resolveNodePorts(node, nodeOverrides);
      const list = isOutput ? outputs : inputs;
      const idx  = list.findIndex(p => p.id === portId);
      if (idx < 0) return { x: mx(node.position.x), y: my(node.position.y) };

      const cardH_mm = mw(HDR, 11) + mw(BODY_PAD, 2) + mw(COL_HDR, 3.5)
                     + list.length * mw(PH, 5) + mw(10, 2);
      const nx  = mx(node.position.x);
      const ny  = my(node.position.y);
      const nw  = mw(NW, 38);
      const pY  = ny + mw(HDR, 11) + mw(BODY_PAD, 2) + mw(COL_HDR, 3.5) + idx * mw(PH, 5) + mw(PH, 5) / 2;
      return { x: isOutput ? nx + nw : nx, y: pY };
    }

    // ── CONNECTIONS (drawn behind nodes) ──────────────────────
    connections.forEach(c => {
      const fNode = nodes.find(n => n.id === c.fromNodeId);
      const tNode = nodes.find(n => n.id === c.toNodeId);
      if (!fNode || !tNode) return;

      const p1 = portMM(fNode, c.fromPortId, true);
      const p2 = portMM(tNode, c.toPortId,   false);
      const x1 = p1.x, y1 = p1.y, x2 = p2.x, y2 = p2.y;

      const { outputs: fOuts } = resolveNodePorts(fNode, nodeOverrides);
      const fromPort  = fOuts.find(p => p.id === c.fromPortId);
      const sigColor  = SIG[fromPort?.type]?.color || '#64748b';
      const wireColor = !c.valid ? '#ef4444' : (c.msg ? '#f59e0b' : sigColor);
      const [wr, wg, wb] = hRgb(wireColor);

      const pairKey    = `${c.fromNodeId}→${c.toNodeId}`;
      const totalLanes = pairCount[pairKey] || 1;
      const laneIdx    = laneMap[c.id] || 0;
      // Lane offset in mm
      const LANE_MM    = mw(LANE_STEP, 5);
      const midXOffset = (laneIdx - (totalLanes - 1) / 2) * LANE_MM;
      // Apply user manual re-routing offsets (stored in px, scale to mm)
      const pdfLineOffX = (c.lineOffX || 0) * sc;
      const pdfLineOffY = (c.lineOffY || 0) * sc;

      // Build segments in mm
      const GAP = mw(ORTHO_GAP, 10);
      function buildSegs() {
        // Manual routing: use saved waypoints (convert from canvas px → mm via mx/my)
        if (c.routeMode === 'manual') {
          const wps = (c.waypoints || []).map(w => [mx(w.x), my(w.y)]);
          const pts  = [[x1, y1], ...wps, [x2, y2]];
          const result = [];
          for (let i = 0; i < pts.length - 1; i++)
            result.push([pts[i][0], pts[i][1], pts[i+1][0], pts[i+1][1]]);
          return result.length > 0 ? result : [[x1, y1, x2, y2]];
        }
        // Auto (orthogonal) routing
        const effX = midXOffset + pdfLineOffX;
        if (x2 > x1 + GAP * 2) {
          const mid = (x1 + x2) / 2 + effX;
          return [
            [x1, y1, mid, y1],
            [mid, y1, mid, y2],
            [mid, y2, x2, y2],
          ];
        } else {
          const ex1  = x1 + GAP + Math.max(0, effX);
          const ex2  = x2 - GAP + Math.min(0, effX);
          const topY = Math.min(y1, y2) - mw(68, 8) - Math.abs(effX) * 0.7 + pdfLineOffY;
          return [
            [x1, y1, ex1, y1],
            [ex1, y1, ex1, topY],
            [ex1, topY, ex2, topY],
            [ex2, topY, ex2, y2],
            [ex2, y2, x2, y2],
          ];
        }
      }

      const segs = buildSegs();

      function drawSegs() {
        segs.forEach(([ax, ay, bx, by]) => pdf.line(ax, ay, bx, by));
      }

      // Shadow pass
      if (isDark) pdf.setDrawColor(0, 5, 15); else pdf.setDrawColor(200, 210, 225);
      pdf.setLineWidth(WIRE_SHD);
      pdf.setLineDashPattern([], 0);
      drawSegs();

      // Colour pass
      pdf.setDrawColor(wr, wg, wb);
      pdf.setLineWidth(WIRE_W);
      const dashLen = mw(12, 4);
      const gapLen  = mw(5,  2);
      if (!c.valid)   pdf.setLineDashPattern([mw(6,3), gapLen], 0);
      else if (c.msg) pdf.setLineDashPattern([dashLen * 0.75, gapLen], 0);
      else            pdf.setLineDashPattern([dashLen, gapLen * 0.8], 0);
      drawSegs();
      pdf.setLineDashPattern([], 0);

      // Arrowhead at destination (fwd/bidi)
      const dir = c.direction || 'fwd';
      pdf.setLineWidth(WIRE_W * 1.1);
      if (dir === 'fwd' || dir === 'bidi') {
        pdf.line(x2 - ARROW_ARM, y2 - ARROW_ARM * 0.58, x2, y2);
        pdf.line(x2, y2, x2 - ARROW_ARM, y2 + ARROW_ARM * 0.58);
      }
      if (dir === 'bwd' || dir === 'bidi') {
        pdf.line(x1 + ARROW_ARM, y1 - ARROW_ARM * 0.58, x1, y1);
        pdf.line(x1, y1, x1 + ARROW_ARM, y1 + ARROW_ARM * 0.58);
      }

      // Source dot
      pdf.setFillColor(wr, wg, wb);
      pdf.circle(x1, y1, WIRE_W * 1.3, 'F');

      // Cable label badge
      if (c.cableLabel) {
        // Font size: honour user setting, fall back to default
        const fs = c.cableLabelSize || FS_CABLE;
        // Badge position: use saved t-value along the path, or 0.5
        const labelT  = c.cableLabelT != null ? c.cableLabelT : 0.5;
        const segsObj = segs.map(([ax,ay,bx,by]) => ({ax,ay,bx,by}));
        const { x: lx, y: ly } = pointAtT(segsObj, labelT);
        // Estimate text width: 0.6mm per pt per char
        const tw = c.cableLabel.length * fs * 0.55 / 2.835 + 2.5;
        const th = fs / 2.835 + 2.0;
        if (isDark) pdf.setFillColor(8, 18, 38); else pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(wr, wg, wb);
        pdf.setLineWidth(0.3);
        pdf.roundedRect(lx - tw / 2, ly - th - 1, tw, th, CABLE_BADGE_R, CABLE_BADGE_R, 'FD');
        pdf.setTextColor(wr, wg, wb);
        pdf.setFontSize(fs);
        pdf.setFont(undefined, 'bold');
        pdf.text(c.cableLabel, lx, ly - 1.4, { align: 'center' });
        pdf.setFont(undefined, 'normal');
      }
    });

    // ── DEVICE NODE CARDS ─────────────────────────────────────
    nodes.forEach(n => {
      const dev = getDevice(n.deviceId);
      if (!dev) return;
      const catInfo = CAT[dev.category] || CAT.custom;
      const { inputs, outputs } = resolveNodePorts(n, nodeOverrides);
      const rows = Math.max(inputs.length, outputs.length);

      // All card dimensions from mw() with a sensible floor
      const nw    = mw(NW,  38);      // card width
      const hdrH  = mw(HDR, 11);      // header height
      const bpad  = mw(BODY_PAD, 2);  // body top padding
      const chH   = mw(COL_HDR, 3.5); // column header height
      const rowH  = mw(PH, 5);        // port row height
      const nh    = hdrH + bpad + chH + rows * rowH + mw(10, 2);

      const nx = mx(n.position.x);
      const ny = my(n.position.y);
      const [cr, cg, cb] = hRgb(catInfo.color);

      // Drop shadow
      if (isDark) pdf.setFillColor(0, 4, 14); else pdf.setFillColor(190, 200, 215);
      pdf.roundedRect(nx + 1, ny + 1.4, nw, nh, 1.5, 1.5, 'F');

      // Card body
      if (isDark) pdf.setFillColor(11, 22, 41); else pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(cr, cg, cb);
      pdf.setLineWidth(BORDER_W);
      pdf.roundedRect(nx, ny, nw, nh, 1.5, 1.5, 'FD');

      // Header fill (two-tone)
      const hDark = [Math.round(cr*0.82), Math.round(cg*0.82), Math.round(cb*0.82)];
      pdf.setFillColor(...hDark);
      pdf.roundedRect(nx, ny, nw, hdrH, 1.5, 1.5, 'F');
      // cover the rounded bottom corners of header
      pdf.setFillColor(...hDark);
      pdf.rect(nx, ny + hdrH - 2, nw, 2.5, 'F');
      // accent line under header
      pdf.setDrawColor(cr, cg, cb);
      pdf.setLineWidth(0.5);
      pdf.line(nx, ny + hdrH, nx + nw, ny + hdrH);

      // Brand text
      if (isDark) pdf.setTextColor(210, 225, 245); else pdf.setTextColor(80, 95, 120);
      pdf.setFontSize(FS_BRAND);
      pdf.setFont(undefined, 'normal');
      // Baseline offset: approx font size in mm = pt/2.835
      const bsB = FS_BRAND / 2.835;
      const bsM = FS_MODEL / 2.835;
      const bsP = FS_PORT  / 2.835;
      const bsC = FS_CHDR  / 2.835;
      // Brand: upper area of header
      pdf.text(dev.brand, nx + 3, ny + hdrH * 0.38 + bsB * 0.5);
      // Model / label: lower area of header
      pdf.setFontSize(FS_MODEL);
      pdf.setFont(undefined, 'bold');
      if (isDark) pdf.setTextColor(255, 255, 255); else pdf.setTextColor(30, 40, 60);
      pdf.text(n.label || dev.model, nx + 3, ny + hdrH * 0.76 + bsM * 0.4);
      pdf.setFont(undefined, 'normal');

      // Column headers
      const bodyY = ny + hdrH + bpad;
      if (isDark) pdf.setTextColor(80, 115, 160); else pdf.setTextColor(100, 120, 150);
      pdf.setFontSize(FS_CHDR);
      pdf.setFont(undefined, 'bold');
      pdf.text('INPUTS',  nx + 3,        bodyY + bsC + 0.5);
      pdf.text('OUTPUTS', nx + nw - 3,   bodyY + bsC + 0.5, { align: 'right' });
      pdf.setFont(undefined, 'normal');
      if (isDark) pdf.setDrawColor(30, 60, 100); else pdf.setDrawColor(200, 210, 225);
      pdf.setLineWidth(DIV_W);
      pdf.line(nx, bodyY + chH, nx + nw, bodyY + chH);

      // Port rows
      for (let i = 0; i < rows; i++) {
        const inp = inputs[i];
        const out = outputs[i];
        const ry  = bodyY + chH + i * rowH;
        const rCY = ry + rowH / 2;   // row vertical centre

        // Alt row bg
        if (i % 2 === 1) {
          if (isDark) pdf.setFillColor(14, 28, 56); else pdf.setFillColor(242, 245, 250);
          pdf.rect(nx, ry, nw, rowH, 'F');
        }

        // Row divider
        if (isDark) pdf.setDrawColor(22, 48, 82); else pdf.setDrawColor(215, 222, 232);
        pdf.setLineWidth(0.15);
        pdf.line(nx, ry + rowH, nx + nw, ry + rowH);

        // Centre divider
        if (isDark) pdf.setDrawColor(30, 60, 100); else pdf.setDrawColor(200, 210, 225);
        pdf.setLineWidth(DIV_W);
        pdf.line(nx + nw/2, ry + rowH*0.15, nx + nw/2, ry + rowH*0.85);

        // INPUT port
        if (inp) {
          const [pr,pg,pb] = hRgb((SIG[inp.type]||SIG.CUSTOM).color);
          // Port handle (circle, left edge of card)
          pdf.setFillColor(pr,pg,pb);
          if (isDark) pdf.setDrawColor(8,18,36); else pdf.setDrawColor(220,225,235);
          pdf.setLineWidth(0.4);
          pdf.circle(nx, rCY, PORT_R, 'FD');
          // Port label
          if (isDark) pdf.setTextColor(185, 210, 230); else pdf.setTextColor(50, 65, 85);
          pdf.setFontSize(FS_PORT);
          // Truncate if too long for half-card
          const maxLabelW = (nw / 2 - PORT_R - 3);
          pdf.text(inp.label, nx + PORT_R + 2, rCY + bsP * 0.42, {
            maxWidth: maxLabelW,
          });
        }

        // OUTPUT port
        if (out) {
          const [pr,pg,pb] = hRgb((SIG[out.type]||SIG.CUSTOM).color);
          // Port handle, right edge
          pdf.setFillColor(pr,pg,pb);
          if (isDark) pdf.setDrawColor(8,18,36); else pdf.setDrawColor(220,225,235);
          pdf.setLineWidth(0.4);
          pdf.circle(nx + nw, rCY, PORT_R, 'FD');
          // Port label (right-aligned)
          if (isDark) pdf.setTextColor(185, 210, 230); else pdf.setTextColor(50, 65, 85);
          pdf.setFontSize(FS_PORT);
          const maxLabelW = (nw / 2 - PORT_R - 3);
          pdf.text(out.label, nx + nw - PORT_R - 2, rCY + bsP * 0.42, {
            align: 'right',
            maxWidth: maxLabelW,
          });
        }
      }
    });

    // ── FOOTER BAR ────────────────────────────────────────────
    const fY = H - FOOT;
    if (isDark) pdf.setFillColor(2, 8, 22); else pdf.setFillColor(240, 243, 248);
    pdf.rect(0, fY, W, FOOT, 'F');
    if (isDark) pdf.setDrawColor(25, 58, 115); else pdf.setDrawColor(180, 195, 220);
    pdf.setLineWidth(0.4);
    pdf.line(0, fY, W, fY);
    // accent stripe
    pdf.setFillColor(30, 80, 180);
    pdf.rect(0, fY, 1.5, FOOT, 'F');

    if (isDark) pdf.setTextColor(60, 110, 170); else pdf.setTextColor(40, 80, 150);
    pdf.setFontSize(FS_FOOT);
    pdf.setFont(undefined, 'bold');
    pdf.text('AV SCHEMATICS', 5, fY + FOOT * 0.66);
    pdf.setFont(undefined, 'normal');
    if (isDark) pdf.setTextColor(45, 85, 135); else pdf.setTextColor(80, 110, 150);
    pdf.text(
      `${nodes.length} device${nodes.length!==1?'s':''}  ·  ${connections.length} connection${connections.length!==1?'s':''}  ·  ${connections.filter(c=>!c.valid).length} incompatible`,
      W / 2, fY + FOOT * 0.66, { align: 'center' }
    );
    if (isDark) pdf.setTextColor(35, 68, 112); else pdf.setTextColor(100, 130, 165);
    pdf.text(new Date().toLocaleString(), W - 5, fY + FOOT * 0.66, { align: 'right' });
  }

  // ─────────────────────────────────────────────────────────────
  // EXPORT HELPERS
  // ─────────────────────────────────────────────────────────────
  async function exportCapture(nodes, nodeOverrides, connections, canvasRef, format, printMode, authorInfo, rackOrder) {
    if (format !== 'pdf' && !window.html2canvas) { alert('html2canvas not loaded'); return; }
    if (format === 'pdf' && !window.jspdf) { alert('jsPDF not loaded'); return; }

    // printMode: 'dark' (default screen style) or 'light' (print-friendly white background)
    const isDark = printMode !== 'light';

    // ── PDF export: fully vector — no html2canvas needed ──────
    if (format === 'pdf') {
      try {
      const { jsPDF } = window.jspdf;
      const PAGE_W_MM = 420;  // A3 landscape
      const PAGE_H_MM = 297;
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });

      // ── Page 1: Vector schematic (reliable — no html2canvas) ──
      drawVectorSchematicPage(pdf, nodes, connections, nodeOverrides, PAGE_W_MM, PAGE_H_MM, isDark);

      // ── Page 2: Rack Elevation View ─────────────────────────
      {
        pdf.addPage([PAGE_W_MM, PAGE_H_MM], 'landscape');
        const W = PAGE_W_MM, H = PAGE_H_MM;
        const startX = 10;
        const HDR_H = 20, FTR_H = 10;

        // Background
        if (isDark) { pdf.setFillColor(3, 13, 30); pdf.rect(0, 0, W, H, 'F'); }
        else { pdf.setFillColor(255, 255, 255); pdf.rect(0, 0, W, H, 'F'); }

        // Header banner
        if (isDark) {
          pdf.setFillColor(6, 22, 58); pdf.rect(0, 0, W, HDR_H, 'F');
          pdf.setFillColor(10, 30, 70); pdf.rect(0, 0, W, HDR_H * 0.55, 'F');
          pdf.setDrawColor(30, 80, 180);
        } else {
          pdf.setFillColor(235, 240, 250); pdf.rect(0, 0, W, HDR_H, 'F');
          pdf.setFillColor(225, 232, 245); pdf.rect(0, 0, W, HDR_H * 0.55, 'F');
          pdf.setDrawColor(60, 100, 200);
        }
        pdf.setLineWidth(0.6); pdf.line(0, HDR_H, W, HDR_H);
        pdf.setTextColor(isDark ? 96 : 30, isDark ? 165 : 70, isDark ? 250 : 180);
        pdf.setFontSize(14); pdf.setFont(undefined, 'bold');
        pdf.text('RACK ELEVATION VIEW', startX, 13.5);
        pdf.setFont(undefined, 'normal');
        pdf.setTextColor(isDark ? 100 : 80, isDark ? 140 : 100, isDark ? 200 : 160);
        pdf.setFontSize(7);
        pdf.text(`Pixelogic AV Schematics  ·  ${new Date().toLocaleString()}  ·  Equipment rack layout`, W - startX, 13.5, { align: 'right' });

        // Sort nodes for rack (same logic as RackView component)
        const catOrder = ['media_server','switcher','ledprocessor','matrix','projector','ledwall','network','converter','custom'];
        let rackSorted;
        if (rackOrder && rackOrder.length > 0) {
          const byId = new Map(rackOrder.map((id, i) => [id, i]));
          const inOrd = nodes.filter(n => byId.has(n.id)).sort((a,b) => byId.get(a.id) - byId.get(b.id));
          const rest = nodes.filter(n => !byId.has(n.id)).sort((a,b) => {
            const da = getDevice(a.deviceId), db = getDevice(b.deviceId);
            return catOrder.indexOf(da?.category||'custom') - catOrder.indexOf(db?.category||'custom');
          });
          rackSorted = [...inOrd, ...rest];
        } else {
          rackSorted = [...nodes].sort((a,b) => {
            const da = getDevice(a.deviceId), db = getDevice(b.deviceId);
            return catOrder.indexOf(da?.category||'custom') - catOrder.indexOf(db?.category||'custom');
          });
        }
        const rackItems = rackSorted.filter(n => { const d = getDevice(n.deviceId); return d?.category !== 'projector' && d?.category !== 'ledwall'; });
        const floorItems = rackSorted.filter(n => { const d = getDevice(n.deviceId); return d?.category === 'projector' || d?.category === 'ledwall'; });

        const totalRU = rackItems.reduce((s, n) => s + (DEVICE_RU[getDevice(n.deviceId)?.category] || 1), 0);
        const totalPower = rackItems.reduce((s, n) => s + (DEVICE_POWER[getDevice(n.deviceId)?.category] || 0), 0);
        const totalWeight = rackItems.reduce((s, n) => s + (DEVICE_WEIGHT[getDevice(n.deviceId)?.category] || 0), 0);
        const rackCap = Math.max(totalRU + 4, 42);

        function hRgbR(hex) {
          const h = ((hex || '#64748b').replace('#', '') + '000000').slice(0, 6);
          return [parseInt(h.slice(0,2),16)||100, parseInt(h.slice(2,4),16)||116, parseInt(h.slice(4,6),16)||139];
        }

        // ── Draw rack chassis ──────────────────────────────
        const rackBodyY = HDR_H + 4;
        const rackBodyH = H - HDR_H - FTR_H - 8;
        const rackW = 180;       // mm rack width
        const railW = 8;         // mm rail width
        const rackX = startX + 8;

        // Outer rack border
        if (isDark) pdf.setFillColor(1, 8, 16); else pdf.setFillColor(248, 250, 253);
        pdf.roundedRect(rackX, rackBodyY, rackW + railW * 2, rackBodyH, 1.5, 1.5, 'F');
        if (isDark) pdf.setDrawColor(30, 58, 95); else pdf.setDrawColor(180, 195, 215);
        pdf.setLineWidth(0.5);
        pdf.roundedRect(rackX, rackBodyY, rackW + railW * 2, rackBodyH, 1.5, 1.5, 'D');

        // Rack header bar
        if (isDark) pdf.setFillColor(11, 22, 41); else pdf.setFillColor(230, 236, 245);
        const rackHdrH = 7;
        pdf.rect(rackX, rackBodyY, rackW + railW * 2, rackHdrH, 'F');
        pdf.setTextColor(isDark ? 148 : 70, isDark ? 163 : 85, isDark ? 184 : 110);
        pdf.setFontSize(6); pdf.setFont(undefined, 'bold');
        pdf.text('AV EQUIPMENT RACK', rackX + railW + 2, rackBodyY + 4.5);
        pdf.setFont(undefined, 'normal');
        pdf.setTextColor(isDark ? 100 : 110, isDark ? 116 : 120, isDark ? 139 : 140);
        pdf.setFontSize(5);
        pdf.text(`${totalRU}U / ${rackCap}U`, rackX + rackW + railW * 2 - 2, rackBodyY + 4.5, { align: 'right' });

        // Rail backgrounds
        if (isDark) pdf.setFillColor(13, 27, 46); else pdf.setFillColor(238, 242, 248);
        pdf.rect(rackX, rackBodyY + rackHdrH, railW, rackBodyH - rackHdrH, 'F');
        pdf.rect(rackX + railW + rackW, rackBodyY + rackHdrH, railW, rackBodyH - rackHdrH, 'F');

        // Rail divider lines
        if (isDark) pdf.setDrawColor(30, 58, 95); else pdf.setDrawColor(190, 200, 215);
        pdf.setLineWidth(0.3);
        pdf.line(rackX + railW, rackBodyY + rackHdrH, rackX + railW, rackBodyY + rackBodyH);
        pdf.line(rackX + railW + rackW, rackBodyY + rackHdrH, rackX + railW + rackW, rackBodyY + rackBodyH);

        // Device slots area
        const slotStartY = rackBodyY + rackHdrH + 2;
        const slotAreaH = rackBodyH - rackHdrH - 4;
        // Scale: how many mm per RU, based on available space
        const mmPerRU = Math.min(8, slotAreaH / Math.max(rackCap, 1));
        let slotY = slotStartY;
        let ruNum = 1;

        rackItems.forEach(node => {
          const dev = getDevice(node.deviceId);
          if (!dev) return;
          const catInfo = CAT[dev.category] || CAT.custom;
          const ru = DEVICE_RU[dev.category] || 1;
          const power = DEVICE_POWER[dev.category] || 0;
          const slotH = mmPerRU * ru;
          const [cr, cg, cb] = hRgbR(catInfo.color);
          const nodeConns = connections.filter(c => c.fromNodeId === node.id || c.toNodeId === node.id);

          // RU numbers on left rail
          pdf.setFontSize(4.5);
          pdf.setTextColor(isDark ? 50 : 150, isDark ? 75 : 160, isDark ? 120 : 175);
          for (let u = 0; u < ru; u++) {
            pdf.text(String(ruNum + u), rackX + railW / 2, slotY + u * mmPerRU + mmPerRU * 0.65, { align: 'center' });
          }

          // Slot background
          if (isDark) pdf.setFillColor(Math.round(cr * 0.08) + 5, Math.round(cg * 0.08) + 8, Math.round(cb * 0.08) + 16);
          else pdf.setFillColor(Math.round(cr * 0.06) + 240, Math.round(cg * 0.06) + 242, Math.round(cb * 0.06) + 248);
          pdf.rect(rackX + railW, slotY, rackW, slotH - 0.5, 'F');

          // Left accent stripe
          pdf.setFillColor(cr, cg, cb);
          pdf.rect(rackX + railW, slotY, 1.2, slotH - 0.5, 'F');

          // Slot border
          if (isDark) pdf.setDrawColor(Math.round(cr * 0.3) + 10, Math.round(cg * 0.3) + 15, Math.round(cb * 0.3) + 25);
          else pdf.setDrawColor(Math.round(cr * 0.4) + 140, Math.round(cg * 0.4) + 150, Math.round(cb * 0.4) + 170);
          pdf.setLineWidth(0.2);
          pdf.rect(rackX + railW, slotY, rackW, slotH - 0.5, 'D');

          // RU badge
          pdf.setFillColor(cr, cg, cb);
          const bdgW = 8, bdgH = 3.5;
          pdf.roundedRect(rackX + railW + 3, slotY + (slotH - 0.5 - bdgH) / 2, bdgW, bdgH, 0.6, 0.6, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(5); pdf.setFont(undefined, 'bold');
          pdf.text(ru + 'U', rackX + railW + 3 + bdgW / 2, slotY + (slotH - 0.5) / 2 + 1.2, { align: 'center' });
          pdf.setFont(undefined, 'normal');

          // Device brand + model
          const textX = rackX + railW + 13;
          pdf.setTextColor(isDark ? 140 : 100, isDark ? 160 : 110, isDark ? 180 : 120);
          pdf.setFontSize(5);
          pdf.text(dev.brand, textX, slotY + (slotH - 0.5) / 2 - 0.8);
          pdf.setTextColor(isDark ? 220 : 30, isDark ? 232 : 40, isDark ? 245 : 60);
          pdf.setFontSize(7); pdf.setFont(undefined, 'bold');
          const labelTxt = (node.label || dev.model);
          pdf.text(labelTxt.length > 25 ? labelTxt.substring(0, 24) + '…' : labelTxt, textX, slotY + (slotH - 0.5) / 2 + 3);
          pdf.setFont(undefined, 'normal');

          // Port color dots (right side of slot)
          const dotX = rackX + railW + rackW - 30;
          const ports = [...(dev.inputs || []).slice(0, 4), ...(dev.outputs || []).slice(0, 4)];
          ports.forEach((p, pi) => {
            const [pr, pg, pb] = hRgbR((SIG[p.type] || SIG.CUSTOM).color);
            pdf.setFillColor(pr, pg, pb);
            pdf.circle(dotX + pi * 3, slotY + (slotH - 0.5) / 2, 1, 'F');
          });

          // Power + connection count on far right
          const infoX = rackX + railW + rackW - 4;
          if (power > 0) {
            pdf.setTextColor(isDark ? 80 : 130, isDark ? 100 : 140, isDark ? 140 : 155);
            pdf.setFontSize(4.5);
            pdf.text(power + 'W', infoX, slotY + (slotH - 0.5) / 2 - 0.5, { align: 'right' });
          }
          if (nodeConns.length > 0) {
            pdf.setFillColor(29, 78, 216);
            const cnBdgW = 7, cnBdgH = 3;
            pdf.roundedRect(infoX - cnBdgW, slotY + (slotH - 0.5) / 2 + 0.5, cnBdgW, cnBdgH, 0.6, 0.6, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(4.5); pdf.setFont(undefined, 'bold');
            pdf.text(String(nodeConns.length), infoX - cnBdgW / 2, slotY + (slotH - 0.5) / 2 + 2.6, { align: 'center' });
            pdf.setFont(undefined, 'normal');
          }

          slotY += slotH;
          ruNum += ru;
        });

        // Empty slots visualization (show a few)
        const emptySlots = Math.min(6, Math.max(0, rackCap - totalRU));
        for (let i = 0; i < emptySlots; i++) {
          if (isDark) pdf.setDrawColor(15, 31, 53); else pdf.setDrawColor(220, 228, 238);
          pdf.setLineWidth(0.15);
          pdf.setLineDashPattern([2, 2], 0);
          pdf.rect(rackX + railW, slotY, rackW, mmPerRU - 0.5, 'D');
          pdf.setFontSize(4); pdf.setTextColor(isDark ? 30 : 190, isDark ? 50 : 200, isDark ? 80 : 215);
          pdf.text(String(ruNum + i), rackX + railW / 2, slotY + mmPerRU * 0.6, { align: 'center' });
          slotY += mmPerRU;
        }
        pdf.setLineDashPattern([], 0);
        if (rackCap - totalRU > 6) {
          pdf.setFontSize(4.5); pdf.setTextColor(isDark ? 30 : 170, isDark ? 58 : 185, isDark ? 95 : 200);
          pdf.text(`+ ${rackCap - totalRU - 6} more empty slots`, rackX + railW + rackW / 2, slotY + 3, { align: 'center' });
        }

        // Rack base bar
        if (isDark) pdf.setFillColor(11, 22, 41); else pdf.setFillColor(230, 236, 245);
        pdf.rect(rackX, rackBodyY + rackBodyH - 5, rackW + railW * 2, 5, 'F');
        pdf.setTextColor(isDark ? 51 : 120, isDark ? 65 : 130, isDark ? 85 : 150);
        pdf.setFontSize(4.5);
        pdf.text('PIXELOGIC — AV SCHEMATICS', rackX + 4, rackBodyY + rackBodyH - 1.5);
        pdf.text(`${connections.length} cables patched`, rackX + rackW + railW * 2 - 4, rackBodyY + rackBodyH - 1.5, { align: 'right' });

        // ── Right side: Rack Summary panel ─────────────────
        const panelX = rackX + rackW + railW * 2 + 16;
        const panelW = W - panelX - startX;
        let panelY = rackBodyY;

        // Summary card
        if (isDark) pdf.setFillColor(7, 19, 35); else pdf.setFillColor(245, 247, 252);
        if (isDark) pdf.setDrawColor(30, 58, 95); else pdf.setDrawColor(190, 200, 220);
        pdf.setLineWidth(0.4);
        const summCardH = 50;
        pdf.roundedRect(panelX, panelY, panelW, summCardH, 2, 2, 'FD');

        pdf.setFontSize(8); pdf.setFont(undefined, 'bold');
        pdf.setTextColor(isDark ? 148 : 70, isDark ? 163 : 85, isDark ? 184 : 110);
        pdf.text('RACK SUMMARY', panelX + 8, panelY + 8);
        pdf.setFont(undefined, 'normal');
        isDark ? pdf.setDrawColor(22, 50, 100) : pdf.setDrawColor(200, 210, 225);
        pdf.setLineWidth(0.2);
        pdf.line(panelX + 8, panelY + 10.5, panelX + panelW - 8, panelY + 10.5);

        // Summary metrics grid (2x2)
        const metricW = (panelW - 24) / 2;
        const metricH = 14;
        const metrics = [
          { value: totalRU + 'U', sub: `of ${rackCap}U used`, color: isDark ? [96,165,250] : [30,100,200] },
          { value: totalPower + 'W', sub: 'Total Power', color: totalPower > 3000 ? [239,68,68] : totalPower > 2000 ? [245,158,11] : [34,197,94] },
          { value: totalWeight.toFixed(1) + 'kg', sub: 'Total Weight', color: isDark ? [167,139,250] : [120,80,220] },
          { value: String(rackItems.length), sub: 'Devices', color: isDark ? [148,163,184] : [80,95,120] },
        ];
        metrics.forEach((m, i) => {
          const mx = panelX + 8 + (i % 2) * (metricW + 8);
          const my = panelY + 14 + Math.floor(i / 2) * (metricH + 4);
          if (isDark) pdf.setFillColor(10, 26, 48); else pdf.setFillColor(238, 242, 250);
          pdf.roundedRect(mx, my, metricW, metricH, 1.5, 1.5, 'F');
          pdf.setTextColor(...m.color);
          pdf.setFontSize(11); pdf.setFont(undefined, 'bold');
          pdf.text(m.value, mx + metricW / 2, my + 7, { align: 'center' });
          pdf.setFont(undefined, 'normal');
          pdf.setTextColor(isDark ? 71 : 120, isDark ? 85 : 130, isDark ? 105 : 145);
          pdf.setFontSize(5);
          pdf.text(m.sub, mx + metricW / 2, my + 11, { align: 'center' });
        });

        // Utilization bar
        const barY = panelY + 44;
        if (isDark) pdf.setFillColor(10, 26, 48); else pdf.setFillColor(230, 235, 242);
        pdf.roundedRect(panelX + 8, barY, panelW - 16, 3, 1, 1, 'F');
        const utilPct = Math.min(1, totalRU / rackCap);
        const barColor = utilPct > 0.85 ? [239,68,68] : utilPct > 0.65 ? [245,158,11] : [34,197,94];
        pdf.setFillColor(...barColor);
        pdf.roundedRect(panelX + 8, barY, (panelW - 16) * utilPct, 3, 1, 1, 'F');
        pdf.setTextColor(isDark ? 71 : 120, isDark ? 85 : 130, isDark ? 105 : 145);
        pdf.setFontSize(4.5);
        pdf.text(Math.round(utilPct * 100) + '% capacity', panelX + panelW - 8, barY + 6, { align: 'right' });

        panelY += summCardH + 8;

        // ── Floor/Mounted items (if any) ──────────────────
        if (floorItems.length > 0) {
          const flrCardH = 8 + floorItems.length * 8;
          if (isDark) pdf.setFillColor(7, 19, 35); else pdf.setFillColor(245, 247, 252);
          pdf.setLineWidth(0.4);
          pdf.roundedRect(panelX, panelY, panelW, flrCardH, 2, 2, 'FD');

          pdf.setFontSize(7); pdf.setFont(undefined, 'bold');
          pdf.setTextColor(isDark ? 148 : 70, isDark ? 163 : 85, isDark ? 184 : 110);
          pdf.text('FLOOR / MOUNTED (Non-Rack)', panelX + 8, panelY + 6);
          pdf.setFont(undefined, 'normal');

          floorItems.forEach((node, fi) => {
            const dev = getDevice(node.deviceId);
            if (!dev) return;
            const flY = panelY + 10 + fi * 8;
            const catInfo = CAT[dev.category] || CAT.custom;
            const [cr2, cg2, cb2] = hRgbR(catInfo.color);
            pdf.setFillColor(cr2, cg2, cb2);
            pdf.circle(panelX + 12, flY + 2, 1.5, 'F');
            pdf.setTextColor(isDark ? 140 : 80, isDark ? 160 : 90, isDark ? 180 : 110);
            pdf.setFontSize(5);
            pdf.text(dev.brand, panelX + 16, flY + 1);
            pdf.setTextColor(isDark ? 220 : 30, isDark ? 232 : 40, isDark ? 245 : 60);
            pdf.setFontSize(6.5); pdf.setFont(undefined, 'bold');
            pdf.text(node.label || dev.model, panelX + 16, flY + 5);
            pdf.setFont(undefined, 'normal');
            if (dev.properties?.lumens) {
              pdf.setTextColor(isDark ? 180 : 160, isDark ? 83 : 100, isDark ? 9 : 40);
              pdf.setFontSize(5);
              pdf.text(String(dev.properties.lumens) + ' lm', panelX + panelW - 8, flY + 3, { align: 'right' });
            }
          });
          panelY += flrCardH + 8;
        }

        // ── Device List by Category ───────────────────────
        const devByCategory = {};
        rackItems.forEach(n => {
          const dev = getDevice(n.deviceId);
          if (!dev) return;
          const cat = dev.category || 'custom';
          if (!devByCategory[cat]) devByCategory[cat] = [];
          devByCategory[cat].push({ node: n, dev });
        });

        const catEntries = Object.entries(devByCategory);
        if (catEntries.length > 0) {
          const devListH = 10 + catEntries.reduce((h, [, items]) => h + 6 + items.length * 6, 0);
          if (isDark) pdf.setFillColor(7, 19, 35); else pdf.setFillColor(245, 247, 252);
          pdf.setLineWidth(0.4);
          pdf.roundedRect(panelX, panelY, panelW, Math.min(devListH, rackBodyH - (panelY - rackBodyY) - 6), 2, 2, 'FD');

          pdf.setFontSize(7); pdf.setFont(undefined, 'bold');
          pdf.setTextColor(isDark ? 148 : 70, isDark ? 163 : 85, isDark ? 184 : 110);
          pdf.text('DEVICE LIST BY CATEGORY', panelX + 8, panelY + 6);
          pdf.setFont(undefined, 'normal');

          let dlY = panelY + 11;
          catEntries.forEach(([cat, items]) => {
            const catInfo = CAT[cat] || CAT.custom;
            const [cr3, cg3, cb3] = hRgbR(catInfo.color);
            pdf.setFillColor(cr3, cg3, cb3);
            pdf.roundedRect(panelX + 8, dlY, 3, 3, 0.5, 0.5, 'F');
            pdf.setTextColor(cr3, cg3, cb3);
            pdf.setFontSize(6); pdf.setFont(undefined, 'bold');
            pdf.text(catInfo.label.toUpperCase(), panelX + 14, dlY + 2.5);
            pdf.setFont(undefined, 'normal');
            dlY += 5;
            items.forEach(({ node, dev }) => {
              pdf.setTextColor(isDark ? 180 : 50, isDark ? 200 : 60, isDark ? 225 : 80);
              pdf.setFontSize(5.5);
              pdf.text(`${dev.brand} ${node.label || dev.model}`, panelX + 14, dlY + 2);
              const ru = DEVICE_RU[dev.category] || 1;
              const pw = DEVICE_POWER[dev.category] || 0;
              pdf.setTextColor(isDark ? 80 : 130, isDark ? 100 : 140, isDark ? 140 : 160);
              pdf.setFontSize(4.5);
              pdf.text(`${ru}U  ${pw}W`, panelX + panelW - 8, dlY + 2, { align: 'right' });
              dlY += 6;
            });
            dlY += 1;
          });
        }

        // Footer
        if (isDark) pdf.setFillColor(4, 14, 34); else pdf.setFillColor(240, 242, 248);
        pdf.rect(0, H - FTR_H, W, FTR_H, 'F');
        if (isDark) pdf.setDrawColor(25, 55, 110); else pdf.setDrawColor(180, 195, 220);
        pdf.setLineWidth(0.35);
        pdf.line(0, H - FTR_H, W, H - FTR_H);
        pdf.setTextColor(isDark ? 50 : 100, isDark ? 90 : 110, isDark ? 140 : 140);
        pdf.setFontSize(6.5);
        pdf.text(`${rackItems.length} rack devices  ·  ${totalRU}U used  ·  ${totalPower}W  ·  ${totalWeight.toFixed(1)}kg`, startX, H - 3.5);
        pdf.setTextColor(isDark ? 35 : 120, isDark ? 65 : 130, isDark ? 110 : 160);
        pdf.text('Pixelogic — AV Schematics', W - startX, H - 3.5, { align: 'right' });
      }

      // ─────────────────────────────────────────────────
      // TABLE LAYOUT CONSTANTS  (pages 3+)
      // ─────────────────────────────────────────────────
      const W = PAGE_W_MM, H = PAGE_H_MM;
        //  Col:       CableID  FromDev  FromPort  ToDev    ToPort  SigType   Dir    Status
        const headers = ['Cable ID', 'From Device', 'From Port', 'To Device', 'To Port', 'Signal', 'Direction', 'Status'];
        const colW    = [20,          64,             38,          64,          38,         28,        24,          26];
        // per-column char caps (to prevent text bleeding past the cell boundary)
        const colCap  = [10,          27,             17,          27,          17,         13,        12,          13];
        const startX  = 10;
        const tableW  = colW.reduce((a, b) => a + b, 0);  // 302 mm
        const PAGE_HDR_H   = 20;  // top banner height mm
        const COL_HDR_H    = 10;  // column label row height mm
        const ROW_H        = 9;   // data row height mm
        const FOOTER_H     = 10;  // bottom footer height mm
        const BODY_START_Y = PAGE_HDR_H + COL_HDR_H; // first data row Y
        const MAX_ROW_Y    = H - FOOTER_H - ROW_H;   // last allowed row Y

        // ── build patch rows ──────────────────────────────
        const patchRows = [];
        connections.forEach((c, i) => {
          const fNode = nodes.find(n => n.id === c.fromNodeId);
          const tNode = nodes.find(n => n.id === c.toNodeId);
          if (!fNode || !tNode) return;
          const fDev = getDevice(fNode.deviceId);
          const tDev = getDevice(tNode.deviceId);
          // Use resolveNodePorts so port-override labels/types are reflected
          const { outputs: fOuts } = resolveNodePorts(fNode, nodeOverrides);
          const { inputs:  tIns  } = resolveNodePorts(tNode, nodeOverrides);
          const fPort = fOuts.find(p => p.id === c.fromPortId);
          const tPort = tIns.find(p => p.id === c.toPortId);
          const dirLabel = c.direction === 'bidi' ? 'Bi-dir' : c.direction === 'bwd' ? 'Reverse' : 'Forward';
          patchRows.push([
            c.cableLabel || ('C' + String(i + 1).padStart(2, '0')),
            (`${fDev?.brand || ''} ${fDev?.model || ''}`).trim() + (fNode.label && fNode.label !== fDev?.model ? ` (${fNode.label})` : ''),
            fPort?.label || c.fromPortId || '—',
            (`${tDev?.brand || ''} ${tDev?.model || ''}`).trim() + (tNode.label && tNode.label !== tDev?.model ? ` (${tNode.label})` : ''),
            tPort?.label || c.toPortId || '—',
            SIG[fPort?.type]?.label || fPort?.type || '?',
            dirLabel,
            c.valid ? 'OK' : 'INCOMPATIBLE',
          ]);
        });

        // ── page-drawing helpers ──────────────────────────
        const totalValid       = patchRows.filter(r => r[7] === 'OK').length;
        const totalIncompat    = patchRows.length - totalValid;
        const exportDateStr    = new Date().toLocaleString();

        function drawPageBanner(pdf, pageNum, totalPages) {
          if (isDark) {
            pdf.setFillColor(3, 13, 30);
            pdf.rect(0, 0, W, H, 'F');
            pdf.setFillColor(6, 22, 58);
            pdf.rect(0, 0, W, PAGE_HDR_H, 'F');
            pdf.setFillColor(10, 30, 70);
            pdf.rect(0, 0, W, PAGE_HDR_H * 0.55, 'F');
            pdf.setDrawColor(30, 80, 180);
          } else {
            pdf.setFillColor(255, 255, 255);
            pdf.rect(0, 0, W, H, 'F');
            pdf.setFillColor(235, 240, 250);
            pdf.rect(0, 0, W, PAGE_HDR_H, 'F');
            pdf.setFillColor(225, 232, 245);
            pdf.rect(0, 0, W, PAGE_HDR_H * 0.55, 'F');
            pdf.setDrawColor(60, 100, 200);
          }
          // accent line
          pdf.setLineWidth(0.6);
          pdf.line(0, PAGE_HDR_H, W, PAGE_HDR_H);
          // title
          pdf.setTextColor(isDark ? 96 : 30, isDark ? 165 : 70, isDark ? 250 : 180);
          pdf.setFontSize(14);
          pdf.setFont(undefined, 'bold');
          pdf.text('PATCH LIST', startX, 13.5);
          pdf.setFont(undefined, 'normal');
          // subtitle info
          pdf.setTextColor(isDark ? 100 : 80, isDark ? 140 : 100, isDark ? 200 : 160);
          pdf.setFontSize(7);
          const subtitle = `Pixelogic AV Schematics  ·  ${exportDateStr}  ·  ${patchRows.length} connection${patchRows.length !== 1 ? 's' : ''}  ·  ${totalValid} valid  ·  ${totalIncompat} incompatible`;
          pdf.text(subtitle, W - startX, 13.5, { align: 'right' });
          // page number
          if (totalPages > 1) {
            pdf.setTextColor(isDark ? 60 : 100, isDark ? 100 : 120, isDark ? 160 : 170);
            pdf.setFontSize(7);
            pdf.text(`Page ${pageNum} of ${totalPages}`, W / 2, 13.5, { align: 'center' });
          }
        }

        function drawColumnHeaders(pdf, y) {
          // header background
          if (isDark) { pdf.setFillColor(14, 38, 90); } else { pdf.setFillColor(210, 222, 245); }
          pdf.rect(startX, y, tableW, COL_HDR_H, 'F');
          // top accent line
          if (isDark) { pdf.setDrawColor(40, 100, 200); } else { pdf.setDrawColor(100, 140, 200); }
          pdf.setLineWidth(0.5);
          pdf.line(startX, y, startX + tableW, y);
          // bottom accent line
          if (isDark) { pdf.setDrawColor(20, 55, 130); } else { pdf.setDrawColor(170, 190, 220); }
          pdf.setLineWidth(0.3);
          pdf.line(startX, y + COL_HDR_H, startX + tableW, y + COL_HDR_H);
          // labels
          pdf.setTextColor(isDark ? 148 : 30, isDark ? 202 : 50, isDark ? 255 : 120);
          pdf.setFontSize(7.5);
          pdf.setFont(undefined, 'bold');
          let hx = startX + 3;
          headers.forEach((lbl, i) => {
            pdf.text(lbl, hx, y + 6.8);
            hx += colW[i];
          });
          pdf.setFont(undefined, 'normal');
          // vertical col separators in header
          if (isDark) { pdf.setDrawColor(25, 60, 130); } else { pdf.setDrawColor(180, 195, 220); }
          pdf.setLineWidth(0.25);
          let sx = startX;
          colW.forEach((cw, i) => {
            sx += cw;
            if (i < colW.length - 1) pdf.line(sx, y + 1, sx, y + COL_HDR_H - 1);
          });
        }

        function drawPageFooter(pdf) {
          if (isDark) { pdf.setFillColor(4, 14, 34); } else { pdf.setFillColor(240, 242, 248); }
          pdf.rect(0, H - FOOTER_H, W, FOOTER_H, 'F');
          if (isDark) { pdf.setDrawColor(25, 55, 110); } else { pdf.setDrawColor(180, 195, 220); }
          pdf.setLineWidth(0.35);
          pdf.line(0, H - FOOTER_H, W, H - FOOTER_H);
          pdf.setTextColor(isDark ? 50 : 100, isDark ? 90 : 110, isDark ? 140 : 140);
          pdf.setFontSize(6.5);
          pdf.text(`${totalValid} valid  ·  ${totalIncompat} incompatible  ·  Total: ${patchRows.length} connections`, startX, H - 3.5);
          pdf.setTextColor(isDark ? 35 : 120, isDark ? 65 : 130, isDark ? 110 : 160);
          pdf.text('Pixelogic — AV Schematics', W - startX, H - 3.5, { align: 'right' });
        }

        // ── paginate rows ─────────────────────────────────
        const rowsPerPage = Math.floor((H - PAGE_HDR_H - COL_HDR_H - FOOTER_H) / ROW_H);
        const totalPages  = Math.max(1, Math.ceil(patchRows.length / rowsPerPage));

        for (let pg = 0; pg < totalPages; pg++) {
          pdf.addPage([PAGE_W_MM, PAGE_H_MM], 'landscape');

          drawPageBanner(pdf, pg + 1, totalPages);
          drawColumnHeaders(pdf, PAGE_HDR_H);

          const sliceStart = pg * rowsPerPage;
          const sliceEnd   = Math.min(sliceStart + rowsPerPage, patchRows.length);
          let y = BODY_START_Y;

          for (let ri = sliceStart; ri < sliceEnd; ri++) {
            const row = patchRows[ri];
            const rowIndex = ri - sliceStart;
            // alternating row background
            if (isDark) {
              pdf.setFillColor(rowIndex % 2 === 0 ? 5 : 7, rowIndex % 2 === 0 ? 16 : 22, rowIndex % 2 === 0 ? 44 : 54);
            } else {
              pdf.setFillColor(rowIndex % 2 === 0 ? 255 : 245, rowIndex % 2 === 0 ? 255 : 248, rowIndex % 2 === 0 ? 255 : 252);
            }
            pdf.rect(startX, y, tableW, ROW_H, 'F');

            const ok = row[7] === 'OK';
            // highlight incompatible row with subtle red tint
            if (!ok) {
              if (isDark) { pdf.setFillColor(38, 10, 10); } else { pdf.setFillColor(255, 235, 235); }
              pdf.rect(startX, y, tableW, ROW_H, 'F');
            }

            pdf.setFontSize(7.5);
            let rx = startX + 3;
            row.forEach((cell, ci) => {
              const cellStr = String(cell).substring(0, colCap[ci]);
              if (ci === 7) {
                if (ok) { isDark ? pdf.setTextColor(74, 222, 128) : pdf.setTextColor(22, 128, 57); }
                else    { isDark ? pdf.setTextColor(248, 113, 113) : pdf.setTextColor(200, 40, 40); }
                pdf.setFont(undefined, 'bold');
              } else if (ci === 6) {
                isDark ? pdf.setTextColor(147, 197, 253) : pdf.setTextColor(50, 90, 160);
                pdf.setFont(undefined, 'normal');
              } else if (ci === 0) {
                isDark ? pdf.setTextColor(250, 204, 21) : pdf.setTextColor(160, 110, 0);
                pdf.setFont(undefined, 'bold');
              } else {
                isDark ? pdf.setTextColor(210, 228, 248) : pdf.setTextColor(30, 40, 60);
                pdf.setFont(undefined, 'normal');
              }
              pdf.text(cellStr, rx, y + 6);
              rx += colW[ci];
            });
            pdf.setFont(undefined, 'normal');

            // row bottom divider
            isDark ? pdf.setDrawColor(15, 38, 75) : pdf.setDrawColor(210, 218, 230);
            pdf.setLineWidth(0.15);
            pdf.line(startX, y + ROW_H, startX + tableW, y + ROW_H);

            // vertical col separators for data row
            isDark ? pdf.setDrawColor(18, 44, 85) : pdf.setDrawColor(215, 222, 235);
            pdf.setLineWidth(0.2);
            let sx = startX;
            colW.forEach((cw, i) => {
              sx += cw;
              if (i < colW.length - 1) pdf.line(sx, y, sx, y + ROW_H);
            });

            y += ROW_H;
          }

          // outer table border
          isDark ? pdf.setDrawColor(30, 70, 150) : pdf.setDrawColor(120, 150, 200);
          pdf.setLineWidth(0.4);
          pdf.rect(startX, PAGE_HDR_H, tableW, COL_HDR_H + (sliceEnd - sliceStart) * ROW_H);

          drawPageFooter(pdf);
        }

        // ── PAGE: CABLE COLOR REFERENCE ───────────────────────
        pdf.addPage([PAGE_W_MM, PAGE_H_MM], 'landscape');

        // Local hex→rgb helper (same logic as the one in drawVectorSchematicPage)
        function hRgbCC(hex) {
          const h = ((hex || '#64748b').replace('#', '') + '000000').slice(0, 6);
          return [parseInt(h.slice(0,2),16)||100, parseInt(h.slice(2,4),16)||116, parseInt(h.slice(4,6),16)||139];
        }

        // Background + dot grid
        if (isDark) {
          pdf.setFillColor(3, 13, 30);
          pdf.rect(0, 0, W, H, 'F');
          pdf.setFillColor(18, 40, 68);
          for (let gx = 8; gx < W; gx += 8)
            for (let gy = 8; gy < H; gy += 8)
              pdf.circle(gx, gy, 0.18, 'F');
        } else {
          pdf.setFillColor(255, 255, 255);
          pdf.rect(0, 0, W, H, 'F');
          pdf.setFillColor(220, 228, 240);
          for (let gx = 8; gx < W; gx += 8)
            for (let gy = 8; gy < H; gy += 8)
              pdf.circle(gx, gy, 0.18, 'F');
        }

        // Header band (same style as patch list pages)
        if (isDark) {
          pdf.setFillColor(6, 22, 58);
          pdf.rect(0, 0, W, PAGE_HDR_H, 'F');
          pdf.setFillColor(10, 30, 70);
          pdf.rect(0, 0, W, PAGE_HDR_H * 0.55, 'F');
          pdf.setDrawColor(30, 80, 180);
        } else {
          pdf.setFillColor(235, 240, 250);
          pdf.rect(0, 0, W, PAGE_HDR_H, 'F');
          pdf.setFillColor(225, 232, 245);
          pdf.rect(0, 0, W, PAGE_HDR_H * 0.55, 'F');
          pdf.setDrawColor(60, 100, 200);
        }
        pdf.setLineWidth(0.6);
        pdf.line(0, PAGE_HDR_H, W, PAGE_HDR_H);
        // left accent stripe
        pdf.setFillColor(isDark ? 30 : 60, isDark ? 80 : 100, isDark ? 180 : 200);
        pdf.rect(0, PAGE_HDR_H - 0.6, W, 0.6, 'F');
        // Title
        pdf.setTextColor(isDark ? 96 : 30, isDark ? 165 : 70, isDark ? 250 : 180);
        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.text('CABLE COLOR REFERENCE', startX, 13.5);
        pdf.setFont(undefined, 'normal');
        pdf.setTextColor(isDark ? 100 : 80, isDark ? 140 : 100, isDark ? 200 : 160);
        pdf.setFontSize(7);
        pdf.text(`Pixelogic AV Schematics  ·  ${exportDateStr}  ·  Signal type colour legend`, W - startX, 13.5, { align: 'right' });

        // Collect which signal types are actually used in this schematic
        const ccUsedTypes = new Set();
        connections.forEach(c => {
          const fNode = nodes.find(n => n.id === c.fromNodeId);
          if (!fNode) return;
          const { outputs: ccFOuts } = resolveNodePorts(fNode, nodeOverrides);
          const ccFPort = ccFOuts.find(p => p.id === c.fromPortId);
          if (ccFPort?.type) ccUsedTypes.add(ccFPort.type);
        });

        // Layout constants
        const CC_COLS  = 3;
        const CC_GAP   = 8;    // mm gap between columns
        const CC_SW    = (W - startX * 2 - CC_GAP * (CC_COLS - 1)) / CC_COLS;  // card width
        const CC_SH    = 22;   // card height mm
        const CC_CSW   = 14;   // colour swatch box width mm
        const CC_CSH   = 14;   // colour swatch box height mm
        const CC_TOP_Y = PAGE_HDR_H + 6;

        // Section heading
        pdf.setFontSize(8);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(isDark ? 148 : 30, isDark ? 202 : 60, isDark ? 255 : 140);
        pdf.text('SIGNAL TYPE COLOUR LEGEND', startX, CC_TOP_Y + 4);
        pdf.setFont(undefined, 'normal');
        isDark ? pdf.setDrawColor(25, 65, 135) : pdf.setDrawColor(160, 180, 210);
        pdf.setLineWidth(0.3);
        pdf.line(startX, CC_TOP_Y + 6, W - startX, CC_TOP_Y + 6);

        const CC_BODY_Y = CC_TOP_Y + 9;
        const ccSigKeys = Object.keys(SIG);

        ccSigKeys.forEach((key, idx) => {
          const col   = idx % CC_COLS;
          const row   = Math.floor(idx / CC_COLS);
          const sx    = startX + col * (CC_SW + CC_GAP);
          const sy    = CC_BODY_Y + row * CC_SH;
          const sig   = SIG[key];
          const [sr, sg, sb] = hRgbCC(sig.color);
          const inUse = ccUsedTypes.has(key);

          // Card background
          if (isDark) {
            pdf.setFillColor(inUse ? 12 : 7, inUse ? 26 : 17, inUse ? 60 : 40);
          } else {
            pdf.setFillColor(inUse ? 240 : 248, inUse ? 244 : 250, inUse ? 255 : 252);
          }
          pdf.roundedRect(sx, sy, CC_SW, CC_SH - 2, 1.2, 1.2, 'F');
          // Coloured border on "in use" cards
          if (inUse) {
            if (isDark) {
              pdf.setDrawColor(Math.round(sr * 0.45), Math.round(sg * 0.45), Math.round(sb * 0.45));
            } else {
              pdf.setDrawColor(Math.round(sr * 0.7), Math.round(sg * 0.7), Math.round(sb * 0.7));
            }
            pdf.setLineWidth(0.35);
            pdf.roundedRect(sx, sy, CC_SW, CC_SH - 2, 1.2, 1.2, 'D');
          }

          // Colour swatch box
          pdf.setFillColor(sr, sg, sb);
          const cBoxX = sx + 4;
          const cBoxY = sy + (CC_SH - 2 - CC_CSH) / 2;
          pdf.roundedRect(cBoxX, cBoxY, CC_CSW, CC_CSH, 0.8, 0.8, 'F');

          // Signal type name
          pdf.setFontSize(9.5);
          pdf.setFont(undefined, 'bold');
          pdf.setTextColor(sr, sg, sb);
          pdf.text(sig.label, sx + CC_CSW + 8, sy + 9);

          // Hex colour value
          pdf.setFontSize(6.5);
          pdf.setFont(undefined, 'normal');
          isDark ? pdf.setTextColor(75, 105, 155) : pdf.setTextColor(120, 130, 150);
          pdf.text(sig.color.toUpperCase(), sx + CC_CSW + 8, sy + 15);

          // "IN USE" badge on right side of card
          if (inUse) {
            const bdgW = 18;
            const bdgH = 5.5;
            const bdgX = sx + CC_SW - bdgW - 3;
            const bdgY = sy + (CC_SH - 2 - bdgH) / 2;
            if (isDark) {
              pdf.setFillColor(Math.round(sr * 0.15), Math.round(sg * 0.15), Math.round(sb * 0.15));
            } else {
              pdf.setFillColor(Math.round(sr * 0.12 + 225), Math.round(sg * 0.12 + 225), Math.round(sb * 0.12 + 225));
            }
            pdf.roundedRect(bdgX, bdgY, bdgW, bdgH, 1, 1, 'F');
            pdf.setTextColor(isDark ? sr : Math.round(sr*0.7), isDark ? sg : Math.round(sg*0.7), isDark ? sb : Math.round(sb*0.7));
            pdf.setFontSize(5.5);
            pdf.setFont(undefined, 'bold');
            pdf.text('IN USE', bdgX + bdgW / 2, bdgY + 4, { align: 'center' });
            pdf.setFont(undefined, 'normal');
          }
        });

        // Notes / legend key below the grid
        const ccNotesY = CC_BODY_Y + Math.ceil(ccSigKeys.length / CC_COLS) * CC_SH + 4;
        isDark ? pdf.setDrawColor(20, 52, 105) : pdf.setDrawColor(170, 185, 210);
        pdf.setLineWidth(0.3);
        pdf.line(startX, ccNotesY, W - startX, ccNotesY);
        pdf.setFontSize(7);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(isDark ? 100 : 50, isDark ? 145 : 80, isDark ? 200 : 150);
        pdf.text('HOW TO READ CABLE COLOURS', startX, ccNotesY + 5.5);
        pdf.setFont(undefined, 'normal');
        pdf.setTextColor(isDark ? 75 : 80, isDark ? 110 : 95, isDark ? 165 : 130);
        pdf.setFontSize(6.5);
        pdf.text('Wire colour = signal type.  Solid line = compatible.  Dashed line = adapter likely needed.  Red dashed = incompatible connection.', startX, ccNotesY + 11.5);
        pdf.text('"IN USE" badge marks signal types active in this schematic.  See the schematic diagram (page 1) and patch list (pages 2+) for full connection details.', startX, ccNotesY + 17);

        // ── DOCUMENT INFO / AUTHOR BLOCK (right side) ──────────
        const ai = authorInfo || {};
        const hasAuthor = ai.name || ai.company || ai.email || ai.projectName;
        if (hasAuthor) {
          const aiW = 105;   // block width mm
          // Count visible fields to compute dynamic height
          const aiFieldsData = [
            { label: 'PROJECT',    value: ai.projectName },
            { label: 'CREATED BY', value: ai.name },
            { label: 'COMPANY',    value: ai.company },
            { label: 'EMAIL',      value: ai.email },
            { label: 'DATE',       value: new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) },
          ];
          const visibleFields = aiFieldsData.filter(f => f.value);
          const aiH = 16 + visibleFields.length * 9 + 2;  // header(16) + fields + padding
          const aiX = W - startX - aiW;
          const aiY = H - FOOTER_H - aiH - 6;

          // Background card
          if (isDark) pdf.setFillColor(7, 16, 34); else pdf.setFillColor(245, 247, 252);
          if (isDark) pdf.setDrawColor(22, 55, 110); else pdf.setDrawColor(180, 195, 220);
          pdf.setLineWidth(0.4);
          pdf.roundedRect(aiX, aiY, aiW, aiH, 2, 2, 'FD');

          // Accent stripe (left edge of card)
          pdf.setFillColor(30, 80, 180);
          pdf.roundedRect(aiX, aiY, 2, aiH, 2, 0, 'F');
          pdf.rect(aiX + 1, aiY, 1.5, aiH, 'F');

          // Header
          pdf.setFontSize(7.5);
          pdf.setFont(undefined, 'bold');
          pdf.setTextColor(isDark ? 96 : 30, isDark ? 165 : 70, isDark ? 250 : 180);
          pdf.text('DOCUMENT INFO', aiX + 7, aiY + 7);
          pdf.setFont(undefined, 'normal');
          isDark ? pdf.setDrawColor(22, 55, 110) : pdf.setDrawColor(190, 200, 220);
          pdf.setLineWidth(0.25);
          pdf.line(aiX + 7, aiY + 9.5, aiX + aiW - 5, aiY + 9.5);

          // Field rows
          let fy = aiY + 15;
          visibleFields.forEach(f => {
            pdf.setFontSize(5.5);
            pdf.setFont(undefined, 'bold');
            pdf.setTextColor(isDark ? 70 : 120, isDark ? 100 : 130, isDark ? 150 : 155);
            pdf.text(f.label, aiX + 7, fy);
            pdf.setFontSize(7);
            pdf.setFont(undefined, 'normal');
            pdf.setTextColor(isDark ? 180 : 40, isDark ? 210 : 55, isDark ? 240 : 80);
            pdf.text(String(f.value), aiX + 7, fy + 5);
            fy += 9;
          });
        }

        drawPageFooter(pdf);

        if (typeof window.demoControl !== 'undefined') {
          try {
            const n = pdf.getNumberOfPages ? pdf.getNumberOfPages() : pdf.internal.getNumberOfPages();
            for (let i = 1; i <= n; i++) {
              try { pdf.setPage(i); } catch(_) {}
              const pw = pdf.internal.pageSize.getWidth();
              const ph = pdf.internal.pageSize.getHeight();
              pdf.setFontSize(52); pdf.setTextColor(220, 90, 0);
              const xs = [pw * 0.2, pw * 0.5, pw * 0.8];
              const ys = [ph * 0.25, ph * 0.52, ph * 0.78];
              for (const y of ys) for (const x of xs) { try { pdf.text('DEMO', x, y, { align: 'center' }); } catch(_) {} }
              pdf.setFontSize(7); pdf.setTextColor(180, 83, 9);
              try { pdf.text('DEMO VERSION \u2014 For evaluation use only', pw * 0.5, ph - 5, { align: 'center' }); } catch(_) {}
            }
            pdf.setTextColor(0, 0, 0);
          } catch(_) {}
        }
        pdf.save(`AV-Schematic-${Date.now()}.pdf`);
      } catch (pdfErr) {
        console.error('PDF export error:', pdfErr);
        alert('PDF export failed: ' + (pdfErr?.message || String(pdfErr)) + '\n\nCheck the browser console for details.');
      }
      return;
    }

    // ── PNG export — html2canvas ────────────────────────────
    const OUT_W = 3840;
    const OUT_H = 2160;
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const srcW = Math.max(1, Math.round(canvasEl.clientWidth || canvasEl.offsetWidth || 1));
    const srcH = Math.max(1, Math.round(canvasEl.clientHeight || canvasEl.offsetHeight || 1));
    const shell = document.createElement('div');
    Object.assign(shell.style, { position: 'fixed', top: '0', left: '0', width: '0', height: '0', overflow: 'hidden', zIndex: '-9999', pointerEvents: 'none' });
    const tmp = document.createElement('div');
    Object.assign(tmp.style, { position: 'absolute', top: '0', left: '0', width: srcW + 'px', height: srcH + 'px', overflow: 'hidden', background: '#030d1e' });
    const canvasClone = canvasEl.cloneNode(true);
    Object.assign(canvasClone.style, { position: 'absolute', top: '0', left: '0', width: srcW + 'px', height: srcH + 'px', overflow: 'hidden' });
    ['Configure port cards', 'Delete node'].forEach(t => {
      canvasClone.querySelectorAll(`button[title="${t}"]`).forEach(btn => {
        if (btn.parentElement) btn.parentElement.style.display = 'none';
        btn.remove();
      });
    });
    canvasClone.querySelectorAll('[data-export-hide]').forEach(el => el.remove());
    tmp.appendChild(canvasClone);
    shell.appendChild(tmp);
    document.body.appendChild(shell);
    for (let i = 0; i < 4; i++) await new Promise(r => requestAnimationFrame(r));
    try {
      const HC_SCALE = Math.max(1, Math.min(2.5, OUT_W / srcW, OUT_H / srcH));
      const hcCanvas = await window.html2canvas(tmp, {
        backgroundColor: '#030d1e', scale: HC_SCALE, useCORS: true, allowTaint: true,
        logging: false, x: 0, y: 0, scrollX: 0, scrollY: 0,
        width: srcW, height: srcH, windowWidth: srcW, windowHeight: srcH, imageTimeout: 0,
      });
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = OUT_W; finalCanvas.height = OUT_H;
      const ctx = finalCanvas.getContext('2d');
      ctx.fillStyle = '#030d1e'; ctx.fillRect(0, 0, OUT_W, OUT_H);
      const drawnW = hcCanvas.width, drawnH = hcCanvas.height;
      const fit = Math.min(1, OUT_W / drawnW, OUT_H / drawnH);
      const dw = Math.round(drawnW * fit), dh = Math.round(drawnH * fit);
      const dx = Math.round((OUT_W - dw) / 2), dy = Math.round((OUT_H - dh) / 2);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(hcCanvas, dx, dy, dw, dh);
      if (typeof window.demoControl !== 'undefined') {
        try {
          const w = finalCanvas.width, h = finalCanvas.height;
          const ctx2 = finalCanvas.getContext('2d');
          const fs = Math.max(40, Math.min(Math.round(w / 6), 100));
          ctx2.save();
          ctx2.font = `bold ${fs}px Arial,sans-serif`;
          ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle';
          ctx2.fillStyle = 'rgba(220,90,0,1)'; ctx2.globalAlpha = 0.18;
          for (const row of [0.3, 0.7]) for (const col of [0.25, 0.75]) {
            ctx2.save(); ctx2.translate(w * col, h * row); ctx2.rotate(-0.52);
            ctx2.fillText('DEMO', 0, 0); ctx2.restore();
          }
          ctx2.restore();
          const bh = Math.max(28, Math.round(h * 0.05));
          ctx2.globalAlpha = 0.92; ctx2.fillStyle = '#b45309';
          ctx2.fillRect(0, h - bh, w, bh);
          ctx2.globalAlpha = 1; ctx2.fillStyle = '#ffffff';
          ctx2.font = `bold ${Math.max(12, Math.round(bh * 0.52))}px Arial,sans-serif`;
          ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle';
          ctx2.fillText('DEMO VERSION \u2014 For evaluation use only', w / 2, h - bh / 2);
        } catch(_) {}
      }
      const a = document.createElement('a');
      a.href = finalCanvas.toDataURL('image/png');
      a.download = `AV-Schematic-${Date.now()}.png`;
      a.click();
    } finally {
      document.body.removeChild(shell);
    }
  }

  function exportPatchCSV(nodes, connections) {
    const rows = [['Cable ID','From Device','From Port','To Device','To Port','Signal Type','Status','Notes']];
    connections.forEach((c, i) => {
      const fNode = nodes.find(n => n.id === c.fromNodeId);
      const tNode = nodes.find(n => n.id === c.toNodeId);
      if (!fNode || !tNode) return;
      const fDev = getDevice(fNode.deviceId);
      const tDev = getDevice(tNode.deviceId);
      const fPort = (fDev?.outputs||[]).find(p => p.id === c.fromPortId);
      const tPort = (tDev?.inputs||[]).find(p => p.id === c.toPortId);
      rows.push([
        c.cableLabel || `C${String(i+1).padStart(2,'0')}`,
        `${fDev?.brand} ${fDev?.model}${fNode.label !== fDev?.model ? ' ('+fNode.label+')' : ''}`,
        fPort?.label || c.fromPortId,
        `${tDev?.brand} ${tDev?.model}${tNode.label !== tDev?.model ? ' ('+tNode.label+')' : ''}`,
        tPort?.label || c.toPortId,
        SIG[fPort?.type]?.label || fPort?.type || '?',
        c.valid ? 'OK' : 'INCOMPATIBLE',
        c.msg || '',
      ]);
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.href = url;
    a.download = `PatchList-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    try { URL.revokeObjectURL(url); } catch(_) {}
  }

  // ─────────────────────────────────────────────────────────────
  // IMPORT PATCH CSV
  // ─────────────────────────────────────────────────────────────
  function importPatchCSV(csvText, allDevices) {
    // Parse CSV (handles quoted fields with commas / escaped quotes)
    function parseCSV(text) {
      const rows = []; let row = []; let cell = ''; let inQ = false;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQ) {
          if (ch === '"' && text[i+1] === '"') { cell += '"'; i++; }
          else if (ch === '"') inQ = false;
          else cell += ch;
        } else {
          if (ch === '"') inQ = true;
          else if (ch === ',') { row.push(cell.trim()); cell = ''; }
          else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && text[i+1] === '\n') i++;
            row.push(cell.trim()); if (row.some(c => c)) rows.push(row); row = []; cell = '';
          } else cell += ch;
        }
      }
      row.push(cell.trim()); if (row.some(c => c)) rows.push(row);
      return rows;
    }

    const rows = parseCSV(csvText);
    if (rows.length < 2) return { nodes: [], connections: [], errors: ['CSV has no data rows'] };

    // Normalise header row
    const hdr = rows[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const col = (name) => { const aliases = { cableid:['cableid','cable','id'], fromdevice:['fromdevice','from','source','sourcedevice'], fromport:['fromport','sourceport','fromoutput','output'], todevice:['todevice','to','dest','destination','destdevice','destinationdevice'], toport:['toport','destport','destinationport','input','toinput'], signaltype:['signaltype','signal','type','sigtype'], status:['status','valid','ok'], notes:['notes','note','comment','msg'] }; const a = aliases[name] || [name]; return hdr.findIndex(h => a.some(al => h.includes(al))); };
    const iCable = col('cableid'), iFrom = col('fromdevice'), iFPort = col('fromport'), iTo = col('todevice'), iTPort = col('toport'), iSig = col('signaltype');

    if (iFrom < 0 || iTo < 0) return { nodes: [], connections: [], errors: ['Could not find "From Device" and "To Device" columns'] };

    // Match a device string like "Barco E2 (Main E2)" → brand+model, optional label in parens
    function matchDevice(str) {
      if (!str) return null;
      const m = str.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
      const devStr = m ? m[1].trim() : str.trim();
      const label = m ? m[2].trim() : null;
      // Try exact brand+model match
      const lower = devStr.toLowerCase();
      let dev = allDevices.find(d => `${d.brand} ${d.model}`.toLowerCase() === lower);
      // Try fuzzy: model-only match
      if (!dev) dev = allDevices.find(d => d.model.toLowerCase() === lower);
      // Try substring match
      if (!dev) dev = allDevices.find(d => lower.includes(d.model.toLowerCase()) && lower.includes(d.brand.toLowerCase()));
      return dev ? { device: dev, label: label || dev.model } : null;
    }

    // Match a port string to a device's port list
    function matchPort(ports, portStr) {
      if (!portStr || !ports.length) return ports[0] || null;
      const lower = portStr.toLowerCase();
      return ports.find(p => p.label.toLowerCase() === lower)
        || ports.find(p => p.label.toLowerCase().includes(lower) || lower.includes(p.label.toLowerCase()))
        || ports.find(p => p.id.toLowerCase() === lower)
        || ports[0];
    }

    // Build unique nodes from device references
    const nodeMap = new Map(); // key: "deviceId|label" → node
    const errors = [];
    const dataRows = rows.slice(1);

    function getOrCreateNode(devStr) {
      const result = matchDevice(devStr);
      if (!result) { errors.push(`Device not found: "${devStr}"`); return null; }
      const key = result.device.id + '|' + result.label;
      if (!nodeMap.has(key)) {
        const col = nodeMap.size % 3;
        const row = Math.floor(nodeMap.size / 3);
        nodeMap.set(key, {
          id: uid(), deviceId: result.device.id, label: result.label,
          position: { x: 80 + col * 350, y: 80 + row * 280 }
        });
      }
      return nodeMap.get(key);
    }

    const newConnections = [];
    dataRows.forEach((r, ri) => {
      const fromStr = r[iFrom] || '';
      const toStr   = r[iTo]   || '';
      if (!fromStr || !toStr) return;

      const fromNode = getOrCreateNode(fromStr);
      const toNode   = getOrCreateNode(toStr);
      if (!fromNode || !toNode) return;

      const fDev = getDevice(fromNode.deviceId);
      const tDev = getDevice(toNode.deviceId);
      const fromPort = matchPort(fDev?.outputs || [], r[iFPort]);
      const toPort   = matchPort(tDev?.inputs  || [], r[iTPort]);
      if (!fromPort || !toPort) { errors.push(`Row ${ri+2}: Could not match ports`); return; }

      const { ok, msg } = validateConn(fromPort.type, toPort.type);
      const cableLabel = (iCable >= 0 && r[iCable]) ? r[iCable] : nextCableLabel(newConnections, fromPort.type);

      newConnections.push({
        id: uid(),
        fromNodeId: fromNode.id, fromPortId: fromPort.id,
        toNodeId: toNode.id,     toPortId: toPort.id,
        valid: ok, msg,
        cableLabel,
      });
    });

    return { nodes: [...nodeMap.values()], connections: newConnections, errors };
  }

  // ─────────────────────────────────────────────────────────────
  // SIGNAL DOT COMPONENT
  // ─────────────────────────────────────────────────────────────
  function SignalDot({ type, size = 10 }) {
    const info = SIG[type] || SIG.CUSTOM;
    return html`<span title=${info.label} style=${{ display:'inline-block', width:size, height:size, borderRadius:'50%', background:info.color, flexShrink:0, border:'1.5px solid rgba(255,255,255,0.3)' }}></span>`;
  }

  // ─────────────────────────────────────────────────────────────
  // NODE CARD COMPONENT
  // ─────────────────────────────────────────────────────────────
  function NodeCard({ node, selected, pendingConn, nodeOverrides, onSelect, onDelete, onDragStart, onPortMouseDown, onPortMouseUp, onConfigurePorts }) {
    const dev = getDevice(node.deviceId);
    if (!dev) return null;
    const catInfo = CAT[dev.category] || CAT.custom;
    const { inputs, outputs } = resolveNodePorts(node, nodeOverrides);
    const rows   = Math.max(inputs.length, outputs.length);
    const height = HDR + BODY_PAD + COL_HDR + rows * PH + 10;
    const hasOverrides = (() => {
      const ov = (nodeOverrides||{})[node.id];
      return ov && (Object.keys(ov.portTypes||{}).length > 0 || (ov.extraInputs||[]).length > 0 || (ov.extraOutputs||[]).length > 0);
    })();

    const borderColor = selected ? '#60a5fa' : catInfo.color + '88';

    return html`
      <div
        style=${{
          position:'absolute',
          left: node.position.x, top: node.position.y,
          width: NW, minHeight: height,
          background:'#0b1629',
          border:`1.5px solid ${borderColor}`,
          borderRadius:8,
          boxShadow: selected ? `0 0 0 2px #60a5fa66, 0 4px 24px #00000088` : '0 4px 18px #00000066',
          userSelect:'none',
          zIndex: selected ? 20 : 10,
          overflow:'visible',
        }}
        onClick=${(e) => { e.stopPropagation(); onSelect(node.id); }}
      >
        <!-- HEADER -->
        <div
          style=${{
            height: HDR, borderRadius:'6px 6px 0 0',
            background: `linear-gradient(135deg, ${catInfo.color}dd 0%, ${catInfo.color}88 100%)`,
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'0 10px', cursor:'move', gap:6,
          }}
          onMouseDown=${(e) => { e.stopPropagation(); onDragStart(e, node.id); }}
        >
          <div style=${{ display:'flex', alignItems:'center', gap:7, minWidth:0 }}>
            <span style=${{ fontSize:16 }}>${catInfo.icon}</span>
            <div style=${{ minWidth:0 }}>
              <div style=${{ fontSize:11, color:'rgba(255,255,255,0.6)', lineHeight:1.3, whiteSpace:'nowrap' }}>${dev.brand}</div>
              <div style=${{ fontSize:13, fontWeight:700, color:'#fff', lineHeight:1.3, whiteSpace:'nowrap' }}>${node.label || dev.model}</div>
            </div>
          </div>
          <div style=${{ display:'flex', gap:4, flexShrink:0, alignItems:'center' }}>
            <button
              title="Configure port cards"
              onClick=${(e) => { e.stopPropagation(); onConfigurePorts(node.id); }}
              style=${{ background: hasOverrides ? 'rgba(59,130,246,0.35)' : 'rgba(255,255,255,0.1)', border: hasOverrides ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.2)', color: hasOverrides ? '#93c5fd' : 'rgba(255,255,255,0.7)', borderRadius:6, width:26, height:26, cursor:'pointer', lineHeight:1, display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}
            >
              <span style=${{ display:'block', fontSize:13, fontWeight:700, lineHeight:1, transform:'translateY(-3px)', fontFamily:'Segoe UI Symbol, Segoe UI, Arial, sans-serif' }}>⚙︎</span>
            </button>
            <button
              title="Delete node"
              onClick=${(e) => { e.stopPropagation(); onDelete(node.id); }}
              style=${{ background:'rgba(239,68,68,0.25)', border:'1px solid rgba(239,68,68,0.5)', color:'#fca5a5', borderRadius:6, width:26, height:26, cursor:'pointer', lineHeight:1, display:'flex', alignItems:'center', justifyContent:'center', padding:0, flexShrink:0 }}
            >
              <span style=${{ display:'block', fontSize:14, fontWeight:700, lineHeight:1, transform:'translateY(-3px)', fontFamily:'Segoe UI Symbol, Segoe UI, Arial, sans-serif' }}>×</span>
            </button>
          </div>
        </div>

        <!-- BODY -->
        <div style=${{ padding:`${BODY_PAD}px 0 8px` }}>
          <!-- column headers -->
          <div style=${{ display:'flex', height:COL_HDR, alignItems:'center', borderBottom:'1px solid rgba(255,255,255,0.07)', marginBottom:0, padding:'0 12px' }}>
            <div style=${{ flex:1, fontSize:9, fontWeight:700, color:'#94a3b8', letterSpacing:'0.08em' }}>INPUTS</div>
            <div style=${{ flex:1, fontSize:9, fontWeight:700, color:'#94a3b8', letterSpacing:'0.08em', textAlign:'right' }}>OUTPUTS</div>
          </div>

          <!-- port rows -->
          ${Array.from({ length: rows }).map((_, i) => {
            const inp = inputs[i];
            const out = outputs[i];
            const inpActv = pendingConn && !pendingConn.isOutput;
            const outActv = pendingConn && pendingConn.isOutput;
            const inpSig  = inp ? (SIG[inp.type] || SIG.CUSTOM) : null;
            const outSig  = out ? (SIG[out.type] || SIG.CUSTOM) : null;

            // highlight compatible ports when in pending-connection mode
            const pendType = pendingConn?.portType;
            const inpCompat = pendingConn?.isOutput && inp  ? validateConn(pendType, inp.type).ok  : null;
            const outCompat = pendingConn && !pendingConn.isOutput && out ? validateConn(out.type, pendType).ok : null;
            const inpHighlight = inpCompat === true ? 'compat' : inpCompat === false ? 'incompat' : '';
            const outHighlight = outCompat === true ? 'compat' : outCompat === false ? 'incompat' : '';

            return html`
              <div key=${i} style=${{ display:'flex', height:PH, alignItems:'center', position:'relative' }}>
                <!-- INPUT side -->
                <div style=${{ flex:1, display:'flex', alignItems:'center', gap:5, paddingLeft:14, paddingRight:4, background: inpHighlight==='compat' ? 'rgba(34,197,94,0.1)' : inpHighlight==='incompat' ? 'rgba(239,68,68,0.07)' : 'transparent', borderRadius:'3px 0 0 3px', height:'100%' }}>
                  ${inp ? html`
                    <!-- port handle -->
                    <div
                      title=${`${inp.label} (${inpSig?.label})`}
                      style=${{
                        position:'absolute', left:-8,
                        width:14, height:14, borderRadius:'50%',
                        background: inpHighlight==='compat' ? '#22c55e' : inpSig?.color || '#9ca3af',
                        border: inpHighlight==='compat' ? '2px solid #22c55e' : inpHighlight==='incompat' ? '2px solid rgba(239,68,68,0.5)' : '2px solid #0b1629',
                        cursor:'pointer', flexShrink:0, zIndex:30,
                        boxShadow: inpHighlight==='compat' ? '0 0 0 5px rgba(34,197,94,0.3), 0 0 18px rgba(34,197,94,0.65)' : inpHighlight==='incompat' ? '0 0 4px rgba(239,68,68,0.3)' : `0 0 6px ${inpSig?.color || '#9ca3af'}66`,
                        transform: inpHighlight==='compat' ? 'scale(1.45)' : 'scale(1)',
                        transition: 'transform 0.12s ease, box-shadow 0.12s ease',
                        opacity: inpHighlight==='incompat' ? 0.35 : 1,
                      }}
                      onMouseDown=${(e) => { e.stopPropagation(); onPortMouseDown(e, node.id, inp.id, false); }}
                      onMouseUp=${(e) => { e.stopPropagation(); onPortMouseUp(e, node.id, inp.id, false); }}
                    ></div>
                    <${SignalDot} type=${inp.type} size=${8} />
                    <span style=${{ fontSize:10, color:'#cbd5e1', flex:1, minWidth:0, whiteSpace:'nowrap', lineHeight:'1.25' }}>${inp.label}</span>
                  ` : ''}
                </div>

                <!-- divider -->
                <div style=${{ width:1, height:'70%', background:'rgba(255,255,255,0.08)', flexShrink:0 }}></div>

                <!-- OUTPUT side -->
                <div style=${{ flex:1, display:'flex', alignItems:'center', justifyContent:'flex-end', gap:5, paddingRight:14, paddingLeft:4, background: outHighlight==='compat' ? 'rgba(34,197,94,0.1)' : outHighlight==='incompat' ? 'rgba(239,68,68,0.07)' : 'transparent', borderRadius:'0 3px 3px 0', height:'100%' }}>
                  ${out ? html`
                    <span style=${{ fontSize:10, color:'#cbd5e1', flex:1, minWidth:0, whiteSpace:'nowrap', lineHeight:'1.25', textAlign:'right' }}>${out.label}</span>
                    <${SignalDot} type=${out.type} size=${8} />
                    <!-- port handle -->
                    <div
                      title=${`${out.label} (${outSig?.label})`}
                      style=${{
                        position:'absolute', right:-8,
                        width:14, height:14, borderRadius:'50%',
                        background: outHighlight==='compat' ? '#22c55e' : outSig?.color || '#9ca3af',
                        border: outHighlight==='compat' ? '2px solid #22c55e' : outHighlight==='incompat' ? '2px solid rgba(239,68,68,0.5)' : '2px solid #0b1629',
                        cursor:'pointer', flexShrink:0, zIndex:30,
                        boxShadow: outHighlight==='compat' ? '0 0 0 5px rgba(34,197,94,0.3), 0 0 18px rgba(34,197,94,0.65)' : outHighlight==='incompat' ? '0 0 4px rgba(239,68,68,0.3)' : `0 0 6px ${outSig?.color || '#9ca3af'}66`,
                        transform: outHighlight==='compat' ? 'scale(1.45)' : 'scale(1)',
                        transition: 'transform 0.12s ease, box-shadow 0.12s ease',
                        opacity: outHighlight==='incompat' ? 0.35 : 1,
                      }}
                      onMouseDown=${(e) => { e.stopPropagation(); onPortMouseDown(e, node.id, out.id, true); }}
                      onMouseUp=${(e) => { e.stopPropagation(); onPortMouseUp(e, node.id, out.id, true); }}
                    ></div>
                  ` : ''}
                </div>
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // CONNECTION LINES (SVG) — orthogonal Z-routing
  // ─────────────────────────────────────────────────────────────
  function ConnectionLines({ nodes, connections, selectedConnId, onSelectConn, tempConn, nodeOverrides, onUpdateConn, viewport }) {
    const svgRef        = useRef(null);
    const labelDragRef  = useRef(null);
    const segDragRef    = useRef(null);
    const wpDragRef     = useRef(null);
    const viewportRef   = useRef(viewport);
    viewportRef.current = viewport;
    const [ctxMenu, setCtxMenu] = useState(null);
    // ctxMenu: { type:'wire', connId, waypoints, segs, isManual, svgX, svgY, insertPt, insertIdx }
    //        | { type:'wp',   connId, wpIdx, waypoints, svgX, svgY }
    const [wpDragHint, setWpDragHint] = useState(null);
    // wpDragHint: { x, y, a1, a2 } — live angle display while dragging a waypoint

    // Dismiss context menu on any external click
    useEffect(() => {
      if (!ctxMenu) return;
      const dismiss = (ev) => { if (!ev._ctxMenuStop) setCtxMenu(null); };
      document.addEventListener('mousedown', dismiss);
      return () => document.removeEventListener('mousedown', dismiss);
    }, [ctxMenu]);

    // Convert client coords → SVG user-space coords (accounts for CSS scale/translate on canvas)
    function clientToSVG(clientX, clientY) {
      const svgEl = svgRef.current;
      if (!svgEl) return { x: 0, y: 0 };
      const rect  = svgEl.getBoundingClientRect();
      const scale = viewportRef.current?.scale || 1;
      return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale };
    }

    // Drag a cable label badge along its wire path
    function startLabelDrag(e, connId, segs) {
      e.stopPropagation();
      e.preventDefault();
      const svgEl   = svgRef.current;
      if (!svgEl) return;
      const badgeEl = svgEl.querySelector(`[data-badge="${connId}"]`);
      labelDragRef.current = { connId, segs, badgeEl, currentT: undefined, hasMoved: false };

      function onMove(ev) {
        const dr = labelDragRef.current;
        if (!dr) return;
        dr.hasMoved = true;
        const sp = clientToSVG(ev.clientX, ev.clientY);
        const t  = nearestTOnPath(dr.segs, sp.x, sp.y);
        dr.currentT = t;
        if (dr.badgeEl) {
          const pos = pointAtT(dr.segs, t);
          dr.badgeEl.setAttribute('transform', `translate(${pos.x},${pos.y})`);
          dr.badgeEl.setAttribute('data-t', String(t));
        }
      }

      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup',   onUp);
        const dr = labelDragRef.current;
        labelDragRef.current = null;
        if (dr && dr.hasMoved && dr.currentT !== undefined && onUpdateConn) {
          onUpdateConn(dr.connId, { cableLabelT: dr.currentT });
        }
      }

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup',   onUp);
    }

    // Drag a wire segment sideways/up-down to re-route it and avoid overlaps
    // type 'X' → drag vertical trunk left/right (straight) or side stubs (back route)
    // type 'Y' → drag top horizontal up/down (back route only)
    function startSegDrag(e, connId, type, initOffX, initOffY, x1, y1, x2, y2, baseMidX) {
      e.stopPropagation();
      e.preventDefault();
      const svgEl   = svgRef.current;
      const startPt = type === 'X' ? e.clientX : e.clientY;
      const initVal = type === 'X' ? initOffX : initOffY;
      segDragRef.current = { connId, type, pending: initVal };

      function onMove(ev) {
        const scale  = viewportRef.current?.scale || 1;
        const delta  = ((type === 'X' ? ev.clientX : ev.clientY) - startPt) / scale;
        const newVal = initVal + delta;
        if (segDragRef.current) segDragRef.current.pending = newVal;
        if (!svgEl) return;
        const newTotalX = baseMidX + (type === 'X' ? newVal : initOffX);
        const newOffY   = type === 'Y' ? newVal : initOffY;
        const newD = orthoPath(x1, y1, x2, y2, newTotalX, newOffY);
        svgEl.querySelectorAll(`[data-conn-d="${connId}"]`).forEach(el => el.setAttribute('d', newD));
        // Keep badge position in sync during live drag
        const badge = svgEl.querySelector(`[data-badge="${connId}"]`);
        if (badge) {
          const t    = parseFloat(badge.getAttribute('data-t') || '0.5');
          const nSeg = buildOrthoSegments(x1, y1, x2, y2, newTotalX, newOffY);
          const pos  = pointAtT(nSeg, t);
          badge.setAttribute('transform', `translate(${pos.x},${pos.y})`);
        }
      }

      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup',   onUp);
        const dr = segDragRef.current;
        segDragRef.current = null;
        if (dr && onUpdateConn) {
          if (type === 'X') onUpdateConn(connId, { lineOffX: dr.pending });
          else              onUpdateConn(connId, { lineOffY: dr.pending });
        }
      }

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup',   onUp);
    }

    // ── Waypoint handle drag (existing waypoints, outside draw session) ───────
    // Uses delta from drag-start — never jumps regardless of where you grab.
    function startWpDrag(e, connId, wpIdx, initX, initY, allWaypoints, x1, y1, x2, y2) {
      e.stopPropagation(); e.preventDefault();
      const svgEl   = svgRef.current;
      const startSV = clientToSVG(e.clientX, e.clientY);
      wpDragRef.current = { connId, wpIdx, pending: { x: initX, y: initY } };

      // Helper: compute angle in degrees from pointA to pointB, normalised 0–360
      function segAngle(ax, ay, bx, by) {
        let deg = Math.atan2(by - ay, bx - ax) * 180 / Math.PI;
        if (deg < 0) deg += 360;
        return Math.round(deg);
      }

      function onMove(ev) {
        const dr = wpDragRef.current; if (!dr) return;
        const sp = clientToSVG(ev.clientX, ev.clientY);
        let dx = sp.x - startSV.x, dy = sp.y - startSV.y;
        // Hold Shift to snap to nearest 45° increment
        if (ev.shiftKey) {
          const angle = Math.atan2(dy, dx);
          const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
          const len = Math.hypot(dx, dy);
          dx = Math.cos(snapped) * len;
          dy = Math.sin(snapped) * len;
        }
        const newPt  = { x: initX + dx, y: initY + dy };
        dr.pending   = newPt;
        const newWPs = allWaypoints.map((w, i) => i === wpIdx ? newPt : w);
        if (svgEl) {
          svgEl.querySelectorAll(`[data-conn-d="${connId}"]`).forEach(el =>
            el.setAttribute('d', manualPath(x1, y1, x2, y2, newWPs)));
          const grp = svgEl.querySelector(`[data-wpg="${connId}-${wpIdx}"]`);
          if (grp) grp.setAttribute('transform', `translate(${newPt.x},${newPt.y})`);
          syncBadge(svgEl, connId, x1, y1, x2, y2, newWPs);
        }
        // Compute angles of incoming and outgoing segments
        const allPts = [{ x: x1, y: y1 }, ...newWPs, { x: x2, y: y2 }];
        const ptIdx  = wpIdx + 1; // index in allPts (0 = source)
        const prevPt = allPts[ptIdx - 1];
        const nextPt = allPts[ptIdx + 1];
        const a1 = prevPt ? segAngle(prevPt.x, prevPt.y, newPt.x, newPt.y) : null;
        const a2 = nextPt ? segAngle(newPt.x, newPt.y, nextPt.x, nextPt.y) : null;
        setWpDragHint({ x: newPt.x, y: newPt.y, a1, a2 });
      }

      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup',   onUp);
        const dr = wpDragRef.current; wpDragRef.current = null;
        setWpDragHint(null);
        if (dr && onUpdateConn) {
          onUpdateConn(dr.connId, { waypoints: allWaypoints.map((w, i) => i === dr.wpIdx ? dr.pending : w) });
        }
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup',   onUp);
    }

    // ── Segment-push drag (outside draw session) ──────────────────────────────
    function startSegPush(e, connId, segIdx, waypoints, x1, y1, x2, y2) {
      e.stopPropagation(); e.preventDefault();
      const svgEl = svgRef.current;
      const allPts = [{ x: x1, y: y1 }, ...waypoints, { x: x2, y: y2 }];
      const pA = allPts[segIdx], pB = allPts[segIdx + 1];
      // Insert 2 intermediate control points at 1/3 and 2/3 of this segment.
      // NEVER copy source/dest port coordinates as fixed waypoints — they must stay dynamic.
      const insA = { x: pA.x + (pB.x - pA.x) / 3,     y: pA.y + (pB.y - pA.y) / 3     };
      const insB = { x: pA.x + 2*(pB.x - pA.x) / 3,   y: pA.y + 2*(pB.y - pA.y) / 3   };
      // segIdx in allPts maps directly to the insertion index in the waypoints array
      // (0 = before first wp, N = after last wp).
      const baseWPs = [
        ...waypoints.slice(0, segIdx),
        { ...insA }, { ...insB },
        ...waypoints.slice(segIdx),
      ];
      const idxA = segIdx, idxB = segIdx + 1;
      const startSVG = clientToSVG(e.clientX, e.clientY);
      wpDragRef.current = { connId, baseWPs, idxA, idxB, origA: { ...insA }, origB: { ...insB }, startSVG, pending: baseWPs };

      let hasMoved = false;
      function onMove(ev) {
        const dr = wpDragRef.current; if (!dr) return;
        const sp = clientToSVG(ev.clientX, ev.clientY);
        let dx = sp.x - dr.startSVG.x, dy = sp.y - dr.startSVG.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved = true;
        if (!hasMoved) return;
        if (ev.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
        const updated = dr.baseWPs.map((w, i) => {
          if (i === dr.idxA) return { x: dr.origA.x + dx, y: dr.origA.y + dy };
          if (i === dr.idxB) return { x: dr.origB.x + dx, y: dr.origB.y + dy };
          return w;
        });
        dr.pending = updated;
        if (svgEl) {
          svgEl.querySelectorAll(`[data-conn-d="${connId}"]`).forEach(el =>
            el.setAttribute('d', manualPath(x1, y1, x2, y2, updated)));
          syncBadge(svgEl, connId, x1, y1, x2, y2, updated);
        }
      }

      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup',   onUp);
        const dr = wpDragRef.current; wpDragRef.current = null;
        if (dr && onUpdateConn && hasMoved) onUpdateConn(dr.connId, { waypoints: dr.pending });
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup',   onUp);
    }

    function syncBadge(svgEl, connId, x1, y1, x2, y2, wps) {
      const badge = svgEl && svgEl.querySelector(`[data-badge="${connId}"]`);
      if (!badge) return;
      const t   = parseFloat(badge.getAttribute('data-t') || '0.5');
      const pos = pointAtT(manualSegs(x1, y1, x2, y2, wps), t);
      badge.setAttribute('transform', `translate(${pos.x},${pos.y})`);
    }

    function removeWaypoint(e, connId, wpIdx, waypoints) {
      e.stopPropagation();
      e.preventDefault();
      const newWPs = waypoints.filter((_, i) => i !== wpIdx);
      if (onUpdateConn) {
        onUpdateConn(connId, { waypoints: newWPs });
      }
    }

    // ── Shared helpers ───────────────────────────────────────────────────────
    function findNearestOnSegs(segs, sp) {
      let bestSegIdx = 0, bestDist = Infinity, bestPoint = { ...sp };
      segs.forEach((seg, idx) => {
        const dx = seg.bx - seg.ax, dy = seg.by - seg.ay;
        const len2 = dx * dx + dy * dy;
        const t = len2 > 0 ? Math.max(0, Math.min(1, ((sp.x - seg.ax) * dx + (sp.y - seg.ay) * dy) / len2)) : 0;
        const px = seg.ax + dx * t, py = seg.ay + dy * t;
        const dist = Math.hypot(sp.x - px, sp.y - py);
        if (dist < bestDist) { bestDist = dist; bestSegIdx = idx; bestPoint = { x: px, y: py }; }
      });
      return { bestSegIdx, bestDist, bestPoint };
    }

    function buildBaseWaypoints(waypoints, segs, isManual) {
      if (isManual) return [...(waypoints || [])];
      const pts = [];
      for (let i = 0; i < segs.length - 1; i++) {
        const j = { x: segs[i].bx, y: segs[i].by };
        const prev = pts[pts.length - 1];
        if (!prev || Math.hypot(prev.x - j.x, prev.y - j.y) > 0.001) pts.push(j);
      }
      return pts;
    }

    let _lastWpAddConn = null, _lastWpAddTime = 0;
    function addWaypointAtCursor(e, connId, waypoints, segs, isManual) {
      e.stopPropagation();
      e.preventDefault();
      // Debounce: ignore duplicate firing within 300ms on the same connection
      const now = Date.now();
      if (_lastWpAddConn === connId && now - _lastWpAddTime < 300) return;
      _lastWpAddConn = connId; _lastWpAddTime = now;
      if (!segs || !segs.length) return;
      // Always select the wire — fixes React-18 batching where isSelected hasn't updated yet
      if (onSelectConn) onSelectConn(connId);
      const sp = clientToSVG(e.clientX, e.clientY);
      const pxTolerance = 24 / (viewportRef.current?.scale || 1);
      const { bestSegIdx, bestDist, bestPoint } = findNearestOnSegs(segs, sp);
      if (bestDist > pxTolerance) return;
      const baseWaypoints = buildBaseWaypoints(waypoints, segs, isManual);
      const insertIdx = Math.max(0, Math.min(baseWaypoints.length, bestSegIdx));
      baseWaypoints.splice(insertIdx, 0, { ...bestPoint });
      if (onUpdateConn) onUpdateConn(connId, { waypoints: baseWaypoints });
    }

    // ── Right-click context menu ─────────────────────────────────────────────
    function openWireCtxMenu(e, connId, waypoints, segs, isManual) {
      e.stopPropagation(); e.preventDefault();
      if (!segs || !segs.length) return;
      e._ctxMenuStop = true;
      const sp = clientToSVG(e.clientX, e.clientY);
      const { bestSegIdx, bestPoint } = findNearestOnSegs(segs, sp);
      setCtxMenu({ type: 'wire', connId, waypoints, segs, isManual, svgX: sp.x, svgY: sp.y, insertPt: bestPoint, insertIdx: bestSegIdx });
    }

    function openWpCtxMenu(e, connId, wpIdx, waypoints) {
      e.stopPropagation(); e.preventDefault();
      e._ctxMenuStop = true;
      const sp = clientToSVG(e.clientX, e.clientY);
      setCtxMenu({ type: 'wp', connId, wpIdx, waypoints, svgX: sp.x, svgY: sp.y });
    }

    function execAddWaypoint() {
      if (!ctxMenu || ctxMenu.type !== 'wire') return;
      const { connId, waypoints, segs, isManual, insertPt, insertIdx } = ctxMenu;
      if (onSelectConn) onSelectConn(connId);
      const baseWaypoints = buildBaseWaypoints(waypoints, segs, isManual);
      const insertAt = Math.max(0, Math.min(baseWaypoints.length, insertIdx));
      baseWaypoints.splice(insertAt, 0, { ...insertPt });
      if (onUpdateConn) onUpdateConn(connId, { waypoints: baseWaypoints });
      setCtxMenu(null);
    }

    function execRemoveWaypoint() {
      if (!ctxMenu || ctxMenu.type !== 'wp') return;
      const { connId, wpIdx, waypoints } = ctxMenu;
      if (onUpdateConn) onUpdateConn(connId, { waypoints: waypoints.filter((_, i) => i !== wpIdx) });
      setCtxMenu(null);
    }

    function execResetRouting() {
      if (!ctxMenu) return;
      if (onUpdateConn) onUpdateConn(ctxMenu.connId, { waypoints: [] });
      setCtxMenu(null);
    }

    return html`
      <svg ref=${svgRef} style=${{ position:'absolute', inset:0, width:'100%', height:'100%', overflow:'visible',
        pointerEvents: 'none',
        cursor: 'default',
      }}>
        <defs>
          <filter id="glow-sel">
            <feGaussianBlur stdDeviation="2.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow-wire">
            <feGaussianBlur stdDeviation="3.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="label-shadow">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.6"/>
          </filter>
          <style dangerouslySetInnerHTML=${{__html: `
            @keyframes wire-flow { to { stroke-dashoffset: -38; } }
            .wire-anim { animation: wire-flow 0.45s linear infinite; }
            [data-badge]:hover .badge-hover-ring { opacity: 0.35 !important; }
            [data-badge]:hover { cursor: grab; }
            [data-badge]:active { cursor: grabbing; }
            .seg-h:hover { stroke: rgba(96,165,250,0.22) !important; }
            /* segment push zones in manual mode */
            .seg-push { cursor: grab; }
            .seg-push:hover { stroke: rgba(96,165,250,0.18) !important; }
            /* waypoint handles */
            .wp-handle { cursor: move; }
            .wp-handle:hover .wp-outer { stroke-opacity: 0.85 !important; }
            .wp-handle:hover .wp-dot   { r: 7 !important; }
            .wp-handle:active { cursor: grabbing; }
            /* context menu hover highlight */
            #ctx-wire-add:hover text, #ctx-wp-remove:hover text { opacity: 0.85; }
            #ctx-wire-add:hover rect, #ctx-wp-remove:hover rect,
            #ctx-wp-reset:hover rect { fill: rgba(96,165,250,0.07) !important; }
          `}} />
          <marker id="arrow-tip" markerWidth="10" markerHeight="7"
            refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#60a5fa" opacity="0.95"/>
          </marker>
          <marker id="arrow-tip-dot" markerWidth="5" markerHeight="5"
            refX="2.5" refY="2.5" orient="auto">
            <circle cx="2.5" cy="2.5" r="2.5" fill="#60a5fa" opacity="0.7"/>
          </marker>
        </defs>

        ${(() => {
          // ── Build per-connection lane offsets so parallel cables don't stack ──
          // Key = fromNodeId→toNodeId; cables sharing a key are spread LANE_STEP apart
          const pairCount = {};
          connections.forEach(c => {
            const k = `${c.fromNodeId}→${c.toNodeId}`;
            pairCount[k] = (pairCount[k] || 0) + 1;
          });
          const pairIdx = {};
          const laneMap = {};
          connections.forEach(c => {
            const k = `${c.fromNodeId}→${c.toNodeId}`;
            if (pairIdx[k] === undefined) pairIdx[k] = 0;
            laneMap[c.id] = pairIdx[k]++;
          });

          return connections.map(c => {
          const fNode = nodes.find(n => n.id === c.fromNodeId);
          const tNode = nodes.find(n => n.id === c.toNodeId);
          if (!fNode || !tNode) return null;
          const { outputs: fOuts } = resolveNodePorts(fNode, nodeOverrides);
          const { inputs: tIns }   = resolveNodePorts(tNode, nodeOverrides);
          const { x:x1, y:y1 } = portCoords(fNode, c.fromPortId, true,  nodeOverrides);
          const { x:x2, y:y2 } = portCoords(tNode, c.toPortId,   false, nodeOverrides);
          const fromPort = fOuts.find(p => p.id === c.fromPortId);
          const toPort   = tIns.find(p => p.id === c.toPortId);
          const sigColor = SIG[fromPort?.type]?.color || '#64748b';
          const strokeColor = !c.valid ? '#ef4444' : (c.msg ? '#f59e0b' : sigColor);
          const isSelected = c.id === selectedConnId;
          // Build hover tooltip text
          const fDev = getDevice(fNode.deviceId);
          const tDev = getDevice(tNode.deviceId);
          const tipLines = [
            (c.cableLabel || '') + '  (' + (SIG[fromPort?.type]?.label || fromPort?.type || '?') + ')',
            (fDev ? fDev.brand + ' ' + fDev.model : fNode.label) + '  →  ' + (tDev ? tDev.brand + ' ' + tDev.model : tNode.label),
            (fromPort?.label || c.fromPortId) + '  →  ' + (toPort?.label || c.toPortId),
            c.valid ? '✓ Compatible' : '✗ ' + (c.msg || 'Incompatible'),
          ];
          const tooltipText = tipLines.join('\n');
          // lane offset: centre the group around the natural midpoint
          const pairKey = `${c.fromNodeId}→${c.toNodeId}`;
          const totalLanes = pairCount[pairKey] || 1;
          const laneIdx    = laneMap[c.id] || 0;
          const midXOffset = (laneIdx - (totalLanes - 1) / 2) * LANE_STEP;
          // Manual re-routing offsets stored per connection
          const lineOffX   = c.lineOffX || 0;
          const lineOffY   = c.lineOffY || 0;
          const totalXOff  = midXOffset + lineOffX;
          const isStraight = x2 > x1 + ORTHO_GAP * 2;
          const isManual   = (c.waypoints || []).length > 0;
          const waypoints  = c.waypoints || [];
          const d    = isManual ? manualPath(x1, y1, x2, y2, waypoints)
                                : orthoPath(x1, y1, x2, y2, totalXOff, lineOffY);
          const segs = isManual ? manualSegs(x1, y1, x2, y2, waypoints)
                                : buildOrthoSegments(x1, y1, x2, y2, totalXOff, lineOffY);
          const bp   = pointAtT(segs, c.cableLabelT != null ? c.cableLabelT : 0.5);
          const cLabel = c.cableLabel || '';

          return html`
            <g key=${c.id}
              style=${{ pointerEvents: 'stroke', cursor: 'pointer' }}
              onClick=${(e) => {
                e.stopPropagation();
                onSelectConn(c.id);
              }}>
              <title>${tooltipText}</title>
              <!-- wide invisible hit area -->
              <path d=${d} stroke="transparent" strokeWidth="28" fill="none" style=${{ pointerEvents:'stroke' }}
                onDblClick=${(e) => { addWaypointAtCursor(e, c.id, waypoints, segs, isManual); }}
                onContextMenu=${(e) => { openWireCtxMenu(e, c.id, waypoints, segs, isManual); }}
              />
              <!-- track shadow for depth -->
              <path data-conn-d=${c.id} d=${d} stroke="#000918" strokeWidth=${isSelected ? 6 : 4.5} fill="none"
                strokeOpacity="0.6" strokeLinecap="round" strokeLinejoin="round"/>
              <!-- main orthogonal cable -->
              <path data-conn-d=${c.id} d=${d}
                stroke=${strokeColor}
                strokeWidth=${isSelected ? 2.8 : 2}
                fill="none"
                strokeDasharray=${!c.valid ? '6 5' : c.msg ? '10 5' : '16 5'}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter=${isSelected ? 'url(#glow-sel)' : ''}
                opacity=${isSelected ? 1 : 0.9}
              />
              <!-- directional arrows — fwd/bwd/bidi -->
              ${(() => {
                const dir = c.direction || 'fwd';
                const fs  = c.cableLabelSize || 9;
                const bh  = Math.ceil(fs * 2.1);
                const bw  = Math.ceil(cLabel.length * fs * 0.67 + 14);
                const arrowPts = isManual
                  ? manualArrows(x1, y1, x2, y2, waypoints)
                  : segmentArrows(x1, y1, x2, y2, totalXOff, lineOffY);
                const ao = isSelected ? 1 : 0.82;
                return html`
                  <!-- endpoint dot at source -->
                  <circle cx=${x1} cy=${y1} r="3" fill=${strokeColor} opacity="0.6"/>
                  <!-- distributed arrows along segments -->
                  ${arrowPts.map((pt, i) => html`
                    <g key=${i} transform=${`translate(${pt.x},${pt.y}) rotate(${dir==='bwd' ? pt.angle+180 : pt.angle})`}>
                      <path d="M -7 -5 L 1 0 L -7 5"
                        stroke=${strokeColor} strokeWidth=${isSelected ? 2.2 : 1.8}
                        fill="none" strokeLinecap="round" strokeLinejoin="round"
                        opacity=${ao}/>
                      ${dir === 'bidi' && html`
                        <path d="M 7 -5 L -1 0 L 7 5"
                          stroke=${strokeColor} strokeWidth=${isSelected ? 2.2 : 1.8}
                          fill="none" strokeLinecap="round" strokeLinejoin="round"
                          opacity=${ao}/>
                      `}
                    </g>
                  `)}
                  <!-- arrowhead at destination for fwd/bidi -->
                  ${(dir === 'fwd' || dir === 'bidi') && html`
                    <path d=${`M ${x2-12} ${y2-6} L ${x2-1} ${y2} L ${x2-12} ${y2+6}`}
                      stroke=${strokeColor} strokeWidth=${isSelected ? 2.4 : 2}
                      fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.95"/>
                  `}
                  <!-- arrowhead at source for bwd/bidi -->
                  ${(dir === 'bwd' || dir === 'bidi') && html`
                    <path d=${`M ${x1+12} ${y1-6} L ${x1+1} ${y1} L ${x1+12} ${y1+6}`}
                      stroke=${strokeColor} strokeWidth=${isSelected ? 2.4 : 2}
                      fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.95"/>
                  `}
                  <!-- cable label badge — draggable along the path -->
                  ${cLabel && html`
                    <g
                      data-badge=${c.id}
                      data-t=${String(c.cableLabelT != null ? c.cableLabelT : 0.5)}
                      transform=${`translate(${bp.x},${bp.y})`}
                      filter="url(#label-shadow)"
                      style=${{ pointerEvents:'all', cursor:'grab' }}
                      onMouseDown=${(e) => { e.stopPropagation(); startLabelDrag(e, c.id, segs); }}
                      onClick=${(e) => e.stopPropagation()}
                    >
                      <!-- hover highlight ring -->
                      <rect
                        x=${-bw/2 - 3} y=${-bh - 7}
                        width=${bw + 6} height=${bh + 4} rx="5" ry="5"
                        fill="none" stroke=${strokeColor} strokeWidth="1.5"
                        class="badge-hover-ring"
                        style=${{ opacity: 0, transition:'opacity 0.15s' }}
                      />
                      <!-- badge background -->
                      <rect
                        x=${-bw/2} y=${-bh - 4}
                        width=${bw} height=${bh} rx="3" ry="3"
                        fill=${isSelected ? strokeColor : '#0f172a'}
                        stroke=${strokeColor} strokeWidth="1"
                        opacity=${isSelected ? 0.95 : 0.9}
                      />
                      <!-- drag grip dots -->
                      <circle cx=${-bw/2 + 4} cy=${-bh/2 - 4} r="1.2" fill=${isSelected ? '#000' : strokeColor} opacity="0.45"/>
                      <circle cx=${-bw/2 + 4} cy=${-bh/2 - 1} r="1.2" fill=${isSelected ? '#000' : strokeColor} opacity="0.45"/>
                      <circle cx=${-bw/2 + 7} cy=${-bh/2 - 4} r="1.2" fill=${isSelected ? '#000' : strokeColor} opacity="0.45"/>
                      <circle cx=${-bw/2 + 7} cy=${-bh/2 - 1} r="1.2" fill=${isSelected ? '#000' : strokeColor} opacity="0.45"/>
                      <!-- label text -->
                      <text
                        x=${0} y=${-4}
                        fontSize=${fs} fontWeight="700"
                        textAnchor="middle"
                        fill=${isSelected ? '#000' : strokeColor}
                        fontFamily="'Courier New',monospace"
                        letterSpacing="0.04em" dominantBaseline="auto"
                      >${cLabel}</text>
                      <!-- connector tick to line -->
                      <line x1="0" y1="0" x2="0" y2="-4" stroke=${strokeColor} strokeWidth="1" opacity="0.5"/>
                    </g>
                  `}
                `;
              })()}
              <!-- route handles: manual waypoints OR auto-ortho drag handles -->
              ${isManual ? html`
                <!-- MANUAL MODE: seg-push + wp-drag handles -->

                <!-- Segment push zones + midpoint "+" hints -->
                ${segs.map((seg, segIdx) => {
                  const smx    = (seg.ax + seg.bx) / 2;
                  const smy    = (seg.ay + seg.by) / 2;
                  const segLen = Math.hypot(seg.bx - seg.ax, seg.by - seg.ay);
                  return html`
                    <g key=${'sg-'+segIdx}>
                      <line
                        x1=${seg.ax} y1=${seg.ay} x2=${seg.bx} y2=${seg.by}
                        stroke="rgba(96,165,250,0)" strokeWidth="28"
                        className="seg-push"
                        style=${{ pointerEvents:'stroke' }}
                        onMouseDown=${(e) => startSegPush(e, c.id, segIdx, waypoints, x1, y1, x2, y2)}
                        onDblClick=${(e) => {
                          if (!isSelected) return;
                          addWaypointAtCursor(e, c.id, waypoints, segs, true);
                        }}
                      />
                      ${(isSelected && segLen > 30) && html`
                        <g style=${{ pointerEvents:'none', opacity: 0.42 }}>
                          <circle cx=${smx} cy=${smy} r="5.5"
                            fill="rgba(5,14,28,0.92)"
                            stroke=${strokeColor} strokeWidth="1" strokeDasharray="2 1.5"/>
                          <line x1=${smx-3} y1=${smy} x2=${smx+3} y2=${smy} stroke=${strokeColor} strokeWidth="1.2"/>
                          <line x1=${smx} y1=${smy-3} x2=${smx} y2=${smy+3} stroke=${strokeColor} strokeWidth="1.2"/>
                        </g>
                      `}
                    </g>
                  `;
                })}

                <!-- Waypoint handles -->
                ${waypoints.map((wp, wpIdx) => html`
                  <g
                    key=${'wp-'+wpIdx}
                    data-wpg=${c.id+'-'+wpIdx}
                    className="wp-handle"
                    transform=${`translate(${wp.x},${wp.y})`}
                    onMouseDown=${(e) => startWpDrag(e, c.id, wpIdx, wp.x, wp.y, waypoints, x1, y1, x2, y2)}
                    onDblClick=${(e) => removeWaypoint(e, c.id, wpIdx, waypoints)}
                    onContextMenu=${(e) => openWpCtxMenu(e, c.id, wpIdx, waypoints)}
                    style=${{ pointerEvents:'all' }}
                  >
                    <circle cx="0" cy="0"
                      className="wp-outer"
                      r=${isSelected ? 11 : 9}
                      fill=${strokeColor} fillOpacity="0.1"
                      stroke=${strokeColor} strokeOpacity="0.4" strokeWidth="1"
                    />
                    <circle cx="0" cy="0"
                      className="wp-dot"
                      r=${isSelected ? 5.5 : 4.5}
                      fill="#facc15"
                      stroke="#0a0a0a" strokeWidth="1.8"
                    />
                    <line x1="-2.8" y1="0" x2="2.8" y2="0"
                      stroke="#0a0a0a" strokeWidth="1.2" opacity="0.7"
                      style=${{ pointerEvents:'none' }}/>
                    <line x1="0" y1="-2.8" x2="0" y2="2.8"
                      stroke="#0a0a0a" strokeWidth="1.2" opacity="0.7"
                      style=${{ pointerEvents:'none' }}/>
                  </g>
                `)}
              ` : html`
              <!-- moveable segment drag handles (transparent — hover to reveal, drag to re-route) -->
              ${(() => {
                if (isStraight) {
                  const mid = (x1 + x2) / 2 + totalXOff;
                  return html`
                    <line x1=${mid} y1=${Math.min(y1,y2)} x2=${mid} y2=${Math.max(y1,y2)}
                      className="seg-h"
                      stroke="rgba(96,165,250,0)" strokeWidth="18"
                      style=${{ cursor:'ew-resize', pointerEvents:'stroke' }}
                      onMouseDown=${(e) => startSegDrag(e, c.id, 'X', lineOffX, lineOffY, x1, y1, x2, y2, midXOffset)}
                    />
                  `;
                } else {
                  const exT1 = x1 + ORTHO_GAP + Math.max(0, totalXOff);
                  const exT2 = x2 - ORTHO_GAP + Math.min(0, totalXOff);
                  const tY   = Math.min(y1, y2) - 68 - Math.abs(totalXOff) * 0.7 + lineOffY;
                  return html`
                    <line x1=${exT1} y1=${tY} x2=${exT2} y2=${tY}
                      className="seg-h"
                      stroke="rgba(96,165,250,0)" strokeWidth="18"
                      style=${{ cursor:'ns-resize', pointerEvents:'stroke' }}
                      onMouseDown=${(e) => startSegDrag(e, c.id, 'Y', lineOffX, lineOffY, x1, y1, x2, y2, midXOffset)}
                    />
                    <line x1=${exT1} y1=${Math.min(y1,tY)} x2=${exT1} y2=${Math.max(y1,tY)}
                      className="seg-h"
                      stroke="rgba(96,165,250,0)" strokeWidth="18"
                      style=${{ cursor:'ew-resize', pointerEvents:'stroke' }}
                      onMouseDown=${(e) => startSegDrag(e, c.id, 'X', lineOffX, lineOffY, x1, y1, x2, y2, midXOffset)}
                    />
                  `;
                }
              })()}
              `}
            </g>
          `;
          });
        })()}

        <!-- temp in-progress wire -->
        ${tempConn && (() => {
          const td = orthoPath(tempConn.x1, tempConn.y1, tempConn.x2, tempConn.y2);
          const segs = segmentArrows(tempConn.x1, tempConn.y1, tempConn.x2, tempConn.y2);
          return html`
            <!-- glow shadow track -->
            <path d=${td} stroke="#0f2a4a" strokeWidth="6" fill="none"
              strokeDasharray="14 10" strokeLinecap="round" opacity="0.55"/>
            <!-- animated flowing wire -->
            <path d=${td} stroke="#60a5fa" strokeWidth="2.2" fill="none"
              strokeDasharray="14 10" strokeLinecap="round"
              opacity="0.95" filter="url(#glow-wire)" className="wire-anim" strokeDashoffset="0"/>
            <!-- direction chevrons along path -->
            ${segs.map((pt, i) => html`
              <g key=${i} transform=${`translate(${pt.x},${pt.y}) rotate(${pt.angle})`}>
                <path d="M -8 -5.5 L 1 0 L -8 5.5"
                  stroke="#60a5fa" strokeWidth="2" fill="none"
                  strokeLinecap="round" strokeLinejoin="round" opacity="0.85"/>
              </g>
            `)}
            <!-- source dot -->
            <circle cx=${tempConn.x1} cy=${tempConn.y1} r="4"
              fill="#3b82f6" opacity="0.7" filter="url(#glow-sel)"/>
            <!-- destination: pulsing target ring + arrowhead -->
            <circle cx=${tempConn.x2} cy=${tempConn.y2} r="10" fill="none"
              stroke="#60a5fa" strokeWidth="1.5" opacity="0.5" filter="url(#glow-wire)"/>
            <circle cx=${tempConn.x2} cy=${tempConn.y2} r="5" fill="none"
              stroke="#60a5fa" strokeWidth="1.5" opacity="0.85"/>
            <circle cx=${tempConn.x2} cy=${tempConn.y2} r="2.5"
              fill="#60a5fa" opacity="1" filter="url(#glow-sel)"/>
          `;
        })()}

        <!-- ── Right-click context menu ──────────────────────────────────── -->
        ${ctxMenu && html`
          <g key="ctx-menu" style=${{ pointerEvents:'all' }}
            onMouseDown=${(e) => { e._ctxMenuStop = true; e.stopPropagation(); }}>
            <!-- full-canvas dismiss backdrop -->
            <rect x="-99999" y="-99999" width="999999" height="999999"
              fill="transparent"
              onMouseDown=${() => setCtxMenu(null)}
              onContextMenu=${(e) => { e.preventDefault(); setCtxMenu(null); }}
            />
            <!-- drop shadow -->
            <rect
              x=${ctxMenu.svgX + 2} y=${ctxMenu.svgY + 2}
              width="172" height=${ctxMenu.type === 'wire' ? 36 : 74}
              rx="6" fill="#000918" fillOpacity="0.55"
            />
            <!-- panel background -->
            <rect
              x=${ctxMenu.svgX} y=${ctxMenu.svgY}
              width="172" height=${ctxMenu.type === 'wire' ? 36 : 74}
              rx="5" fill="#0d1b2e" stroke="#1e3a5f" strokeWidth="1.5"
            />
            ${ctxMenu.type === 'wire' ? html`
              <g style=${{ cursor:'pointer' }} onClick=${execAddWaypoint}>
                <rect x=${ctxMenu.svgX} y=${ctxMenu.svgY}
                  width="172" height="36" rx="5"
                  fill="transparent"
                />
                <text
                  x=${ctxMenu.svgX + 14} y=${ctxMenu.svgY + 23}
                  fill="#60a5fa" fontSize="12"
                  fontFamily="ui-sans-serif,system-ui,-apple-system,sans-serif"
                  fontWeight="500"
                >＋ Add routing point here</text>
              </g>
            ` : html`
              <g style=${{ cursor:'pointer' }} onClick=${execRemoveWaypoint}>
                <rect x=${ctxMenu.svgX} y=${ctxMenu.svgY}
                  width="172" height="37" rx="5 5 0 0"
                  fill="transparent"
                />
                <text
                  x=${ctxMenu.svgX + 14} y=${ctxMenu.svgY + 23}
                  fill="#f87171" fontSize="12"
                  fontFamily="ui-sans-serif,system-ui,-apple-system,sans-serif"
                  fontWeight="500"
                >✕  Remove this point</text>
              </g>
              <line
                x1=${ctxMenu.svgX + 8} y1=${ctxMenu.svgY + 37}
                x2=${ctxMenu.svgX + 164} y2=${ctxMenu.svgY + 37}
                stroke="#1e3a5f" strokeWidth="1"
              />
              <g style=${{ cursor:'pointer' }} onClick=${execResetRouting}>
                <rect x=${ctxMenu.svgX} y=${ctxMenu.svgY + 37}
                  width="172" height="37" rx="0 0 5 5"
                  fill="transparent"
                />
                <text
                  x=${ctxMenu.svgX + 14} y=${ctxMenu.svgY + 60}
                  fill="#94a3b8" fontSize="12"
                  fontFamily="ui-sans-serif,system-ui,-apple-system,sans-serif"
                  fontWeight="500"
                >↺  Reset to auto-route</text>
              </g>
            `}
          </g>
        `}

        <!-- live angle hint while dragging a waypoint -->
        ${wpDragHint && (() => {
          const { x, y, a1, a2 } = wpDragHint;
          const lines = [];
          if (a1 != null) lines.push(`In: ${a1}\u00b0`);
          if (a2 != null) lines.push(`Out: ${a2}\u00b0`);
          const text   = lines.join('  \u2502  ');
          const w      = text.length * 6.3 + 20;
          const h      = 22;
          const bx     = x + 14;
          const by     = y - h - 8;
          return html`
            <g style=${{ pointerEvents:'none' }}>
              <rect x=${bx} y=${by} width=${w} height=${h} rx="4"
                fill="#050f22" stroke="#facc15" strokeWidth="1.2" opacity="0.93"/>
              <text x=${bx + w/2} y=${by + 14}
                textAnchor="middle"
                fill="#facc15"
                fontSize="11"
                fontWeight="600"
                fontFamily="'Courier New',monospace"
              >${text}</text>
            </g>
          `;
        })()}
      </svg>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // PORT EDITOR MODAL — change card types, add extra cards
  // ─────────────────────────────────────────────────────────────
  function PortEditorModal({ node, overrides, onSave, onClose }) {
    const dev = getDevice(node.deviceId);
    if (!dev) return null;
    const catInfo = CAT[dev.category] || CAT.custom;

    const [portTypes,    setPortTypes]    = useState({ ...(overrides?.portTypes    || {}) });
    const [portLabels,   setPortLabels]   = useState({ ...(overrides?.portLabels   || {}) });
    const [extraInputs,  setExtraInputs]  = useState([...(overrides?.extraInputs  || [])]);
    const [extraOutputs, setExtraOutputs] = useState([...(overrides?.extraOutputs || [])]);
    const [newInpLabel,  setNewInpLabel]  = useState('');
    const [newInpType,   setNewInpType]   = useState('HDMI');
    const [newOutLabel,  setNewOutLabel]  = useState('');
    const [newOutType,   setNewOutType]   = useState('HDMI');
    const [newInpError,  setNewInpError]  = useState(false);
    const [newOutError,  setNewOutError]  = useState(false);
    const [activeTab,    setActiveTab]    = useState('inputs');
    const newInpRef = useRef(null);
    const newOutRef = useRef(null);

    const sigOptions = Object.entries(SIG).map(([k, v]) => html`<option key=${k} value=${k}>${v.label} (${k})</option>`);

    function addExtraInput() {
      if (!newInpLabel.trim()) {
        setNewInpError(true);
        newInpRef.current?.focus();
        return;
      }
      setExtraInputs(ei => [...ei, { id: 'EX_IN_' + uid(), label: newInpLabel.trim(), type: newInpType }]);
      setNewInpLabel('');
      setNewInpError(false);
    }

    function addExtraOutput() {
      if (!newOutLabel.trim()) {
        setNewOutError(true);
        newOutRef.current?.focus();
        return;
      }
      setExtraOutputs(eo => [...eo, { id: 'EX_OUT_' + uid(), label: newOutLabel.trim(), type: newOutType }]);
      setNewOutLabel('');
      setNewOutError(false);
    }

    function doSave() { onSave({ portTypes, portLabels, extraInputs, extraOutputs }); onClose(); }

    // Render a port row inline (NOT as a sub-component — avoids remount-on-every-render bug)
    function renderPortRow(p, isExtra, isInput, idx) {
      const curType  = isExtra ? p.type  : (portTypes[p.id]  ?? p.type);
      const curLabel = isExtra ? p.label : (portLabels[p.id] ?? p.label);
      const sig = SIG[curType] || SIG.CUSTOM;

      // Auto-rename helper: swap the old type prefix for the new one
      function autoRename(oldType, newType, label) {
        const oldNames = [SIG[oldType]?.label, SIG_SHORT[oldType], oldType]
          .filter((name, index, names) => name && names.indexOf(name) === index)
          .sort((a, b) => b.length - a.length);
        const newShort = SIG_SHORT[newType] || newType;
        const prefix = oldNames.find(name => label.startsWith(name));
        if (prefix) return newShort + label.slice(prefix.length);
        const contained = oldNames.find(name => label.includes(name));
        return contained ? label.replace(contained, newShort) : label;
      }

      return html`
        <div key=${p.id} style=${{ display:'flex', alignItems:'center', gap:9, padding:'7px 12px', background:'#0b1629', borderRadius:7,
          border:`1px solid ${sig.color}${isExtra ? '66' : '33'}`,
          boxShadow: isExtra ? `0 0 0 1px #1d4ed833` : 'none',
          marginBottom:4 }}>
          <div style=${{ width:10, height:10, borderRadius:'50%', background:sig.color, flexShrink:0 }}></div>

          <!-- label — editable for both factory and extra ports -->
          <input
            value=${curLabel}
            onInput=${(e) => {
              const val = e.target.value;
              if (isExtra) {
                if (isInput) setExtraInputs(ei => ei.map((x,j) => j===idx ? {...x, label:val} : x));
                else         setExtraOutputs(eo => eo.map((x,j) => j===idx ? {...x, label:val} : x));
              } else {
                setPortLabels(pl => ({ ...pl, [p.id]: val }));
              }
            }}
            style=${{ flex:1, background:'transparent', border:'none', outline:'none', color:'#e2e8f0', fontSize:11, fontWeight:600, minWidth:0, cursor:'text' }}
          />

          ${isExtra
            ? html`<span style=${{ fontSize:8, color:'#3b82f6', background:'#1d4ed822', borderRadius:3, padding:'1px 5px', flexShrink:0 }}>CARD</span>`
            : html`<span style=${{ fontSize:8, color:'#334155', flexShrink:0 }}>factory</span>`
          }

          <select
            value=${curType}
            onChange=${(e) => {
              const val = e.target.value;
              if (isExtra) {
                if (isInput) setExtraInputs(ei => ei.map((x,j) => j===idx ? {...x, type:val} : x));
                else         setExtraOutputs(eo => eo.map((x,j) => j===idx ? {...x, type:val} : x));
              } else {
                // update type AND auto-rename the label
                setPortTypes(pt => ({ ...pt, [p.id]: val }));
                setPortLabels(pl => ({ ...pl, [p.id]: autoRename(curType, val, curLabel) }));
              }
            }}
            style=${{ background:'#060f1e', border:`1px solid ${sig.color}66`, color:sig.color, borderRadius:5, padding:'4px 7px', fontSize:10, cursor:'pointer', fontWeight:700 }}
          >${sigOptions}</select>

          ${isExtra && html`<button
            onClick=${() => {
              if (isInput) setExtraInputs(ei => ei.filter((_,j) => j!==idx));
              else         setExtraOutputs(eo => eo.filter((_,j) => j!==idx));
            }}
            style=${{ background:'#450a0a', border:'1px solid #7f1d1d', color:'#fca5a5', borderRadius:4, width:22, height:22, cursor:'pointer', fontSize:14, lineHeight:'1', flexShrink:0 }}
          >×</button>`}
        </div>
      `;
    }

    return html`
      <div style=${{ position:'fixed', inset:0, background:'rgba(0,2,12,0.87)', zIndex:1100, display:'flex', alignItems:'center', justifyContent:'center' }}
        onClick=${onClose}>
        <div style=${{ background:'#071323', border:'1px solid #1e3a5f', borderRadius:12, width:530, maxHeight:'85vh', display:'flex', flexDirection:'column', overflow:'hidden' }}
          onClick=${(e) => e.stopPropagation()}>

          <!-- header -->
          <div style=${{ padding:'14px 18px', background:'#0b1629', borderBottom:'1px solid #1e3a5f', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
            <div>
              <div style=${{ fontSize:14, fontWeight:800, color:'#f1f5f9' }}>⚙ Port Configuration</div>
              <div style=${{ fontSize:10, color:catInfo.color, marginTop:1 }}>${dev.brand} ${dev.model}${node.label !== dev.model ? ' — ' + node.label : ''}</div>
            </div>
            <button onClick=${onClose} style=${{ background:'#1e293b', border:'1px solid #334155', color:'#94a3b8', borderRadius:6, width:28, height:28, cursor:'pointer', fontSize:16, lineHeight:1 }}>×</button>
          </div>

          <!-- tab bar -->
          <div style=${{ display:'flex', borderBottom:'1px solid #1e3a5f', background:'#060f1e', flexShrink:0 }}>
            ${['inputs','outputs'].map(tab => {
              const count = tab === 'inputs'
                ? (dev.inputs||[]).length + extraInputs.length
                : (dev.outputs||[]).length + extraOutputs.length;
              const active = activeTab === tab;
              return html`
                <button key=${tab} onClick=${() => setActiveTab(tab)}
                  style=${{ flex:1, padding:'9px 0', background: active ? '#1d4ed811' : 'transparent', border:'none',
                    borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
                    color: active ? '#60a5fa' : '#475569', cursor:'pointer', fontSize:11, fontWeight:700, letterSpacing:'0.05em',
                  }}>
                  ${tab.toUpperCase()} (${count})
                </button>
              `;
            })}
          </div>

          <!-- port list -->
          <div style=${{ flex:1, overflowY:'auto', padding:'12px 16px' }}>
            ${activeTab === 'inputs' && html`
              ${(dev.inputs||[]).map((p,i) => renderPortRow(p, false, true,  i))}
              ${extraInputs.map((p,i)  => renderPortRow(p, true,  true,  i))}
              <!-- add card row -->
              <div style=${{ display:'flex', gap:7, padding:'9px 12px', background:'rgba(29,78,216,0.05)', borderRadius:7, border:'1px dashed #1e3a5f', marginTop:8, alignItems:'center' }}>
                <span style=${{ fontSize:10, color:'#334155', flexShrink:0, fontWeight:700 }}>+ New Input Card</span>
                <input ref=${newInpRef} placeholder=${newInpError ? 'Enter a label' : 'Label (e.g. HDMI 5)'} value=${newInpLabel}
                  onInput=${(e)=>{ setNewInpLabel(e.target.value); if (newInpError) setNewInpError(false); }}
                  onKeyDown=${(e)=>e.key==='Enter'&&addExtraInput()}
                  aria-invalid=${newInpError}
                  style=${{ flex:1, background:'#060f1e', border:`1px solid ${newInpError ? '#ef4444' : '#1e3a5f'}`, borderRadius:5, color:'#f1f5f9', padding:'5px 8px', fontSize:10, minWidth:0, outline:'none' }} />
                <select value=${newInpType} onChange=${(e)=>setNewInpType(e.target.value)}
                  style=${{ background:'#060f1e', border:'1px solid #1e3a5f', color:'#94a3b8', borderRadius:5, padding:'5px 6px', fontSize:10 }}>
                  ${sigOptions}
                </select>
                <button onClick=${addExtraInput}
                  style=${{ background:'#1d4ed8', border:'none', color:'#fff', borderRadius:5, padding:'5px 14px', cursor:'pointer', fontSize:10, fontWeight:700, flexShrink:0 }}>Add</button>
              </div>
            `}
            ${activeTab === 'outputs' && html`
              ${(dev.outputs||[]).map((p,i) => renderPortRow(p, false, false, i))}
              ${extraOutputs.map((p,i)  => renderPortRow(p, true,  false, i))}
              <!-- add card row -->
              <div style=${{ display:'flex', gap:7, padding:'9px 12px', background:'rgba(29,78,216,0.05)', borderRadius:7, border:'1px dashed #1e3a5f', marginTop:8, alignItems:'center' }}>
                <span style=${{ fontSize:10, color:'#334155', flexShrink:0, fontWeight:700 }}>+ New Output Card</span>
                <input ref=${newOutRef} placeholder=${newOutError ? 'Enter a label' : 'Label (e.g. SDI Out 5)'} value=${newOutLabel}
                  onInput=${(e)=>{ setNewOutLabel(e.target.value); if (newOutError) setNewOutError(false); }}
                  onKeyDown=${(e)=>e.key==='Enter'&&addExtraOutput()}
                  aria-invalid=${newOutError}
                  style=${{ flex:1, background:'#060f1e', border:`1px solid ${newOutError ? '#ef4444' : '#1e3a5f'}`, borderRadius:5, color:'#f1f5f9', padding:'5px 8px', fontSize:10, minWidth:0, outline:'none' }} />
                <select value=${newOutType} onChange=${(e)=>setNewOutType(e.target.value)}
                  style=${{ background:'#060f1e', border:'1px solid #1e3a5f', color:'#94a3b8', borderRadius:5, padding:'5px 6px', fontSize:10 }}>
                  ${sigOptions}
                </select>
                <button onClick=${addExtraOutput}
                  style=${{ background:'#1d4ed8', border:'none', color:'#fff', borderRadius:5, padding:'5px 14px', cursor:'pointer', fontSize:10, fontWeight:700, flexShrink:0 }}>Add</button>
              </div>
            `}
          </div>

          <!-- footer -->
          <div style=${{ padding:'12px 18px', borderTop:'1px solid #1e3a5f', background:'#060f1e', display:'flex', gap:8, justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
            <div style=${{ fontSize:10, color:'#334155' }}>
              ${(dev.inputs||[]).length + extraInputs.length} inputs · ${(dev.outputs||[]).length + extraOutputs.length} outputs
            </div>
            <div style=${{ display:'flex', gap:8 }}>
              <button onClick=${onClose} style=${{ background:'#1e293b', border:'1px solid #334155', color:'#94a3b8', borderRadius:6, padding:'7px 16px', cursor:'pointer', fontSize:11 }}>Cancel</button>
              <button onClick=${doSave} style=${{ background:'#1d4ed8', border:'none', color:'#fff', borderRadius:6, padding:'7px 18px', cursor:'pointer', fontSize:11, fontWeight:700 }}>Save Changes</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // INSPECTOR PANEL
  // ─────────────────────────────────────────────────────────────
  function InspectorPanel({ node, allNodes, connections, onClose, onLabelChange, onUpgradeDevice, onConfigurePorts, nodeOverrides }) {
    const dev = getDevice(node.deviceId);
    if (!dev) return null;
    const catInfo = CAT[dev.category] || CAT.custom;
    const nodeConns = connections.filter(c => c.fromNodeId === node.id || c.toNodeId === node.id);
    const sameCategory = DEVICES.filter(d => d.category === dev.category && d.id !== dev.id);
    const { inputs, outputs } = resolveNodePorts(node, nodeOverrides);
    const ov = (nodeOverrides||{})[node.id];
    const hasOverrides = ov && (Object.keys(ov.portTypes||{}).length > 0 || (ov.extraInputs||[]).length > 0 || (ov.extraOutputs||[]).length > 0);

    return html`
      <div style=${{ padding:'14px', display:'flex', flexDirection:'column', gap:10 }}>
        <div style=${{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style=${{ fontSize:13, fontWeight:700, color:'#f1f5f9' }}>${catInfo.icon} Inspector</span>
          <button onClick=${onClose} style=${{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:18, lineHeight:1 }}>×</button>
        </div>

        <!-- Label -->
        <div>
          <div style=${{ fontSize:10, color:'#64748b', marginBottom:3 }}>CUSTOM LABEL</div>
          <input
            value=${node.label || dev.model}
            onInput=${(e) => onLabelChange(node.id, e.target.value)}
            style=${{ width:'100%', background:'#0f172a', border:'1px solid #1e3a5f', borderRadius:5, color:'#f1f5f9', padding:'5px 8px', fontSize:12, boxSizing:'border-box' }}
          />
        </div>

        <!-- Device info -->
        <div style=${{ background:'#0f172a', borderRadius:6, border:'1px solid #1e2d40', padding:10 }}>
          <div style=${{ fontSize:11, fontWeight:700, color: catInfo.color, marginBottom:6 }}>${dev.brand} — ${dev.model}</div>
          ${Object.entries(dev.properties || {}).map(([k,v]) => html`
            <div key=${k} style=${{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#94a3b8', marginBottom:2 }}>
              <span style=${{ color:'#64748b' }}>${k}</span>
              <span>${v}</span>
            </div>
          `)}
          <div style=${{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#94a3b8', marginTop:4 }}>
            <span style=${{ color:'#64748b' }}>Inputs</span><span>${inputs.length}</span>
          </div>
          <div style=${{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#94a3b8' }}>
            <span style=${{ color:'#64748b' }}>Outputs</span><span>${outputs.length}</span>
          </div>
        </div>

        <!-- Configure Ports -->
        <button
          onClick=${() => onConfigurePorts(node.id)}
          style=${{ background: hasOverrides ? 'linear-gradient(90deg,#1d4ed822,#2563eb22)' : '#0f172a',
            border: hasOverrides ? '1px solid #3b82f6' : '1px solid #1e3a5f',
            color: hasOverrides ? '#93c5fd' : '#64748b',
            borderRadius:6, padding:'8px 12px', cursor:'pointer', fontSize:11, fontWeight:700,
            display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%' }}
        >
          <span>⚙ Configure Port Cards</span>
          ${hasOverrides
            ? html`<span style=${{ fontSize:9, color:'#3b82f6', background:'#1d4ed822', borderRadius:10, padding:'1px 7px' }}>CUSTOM</span>`
            : html`<span style=${{ fontSize:9, color:'#334155' }}>Change types, add cards</span>`
          }
        </button>

        <!-- Connections info -->
        ${nodeConns.length > 0 && html`
          <div>
            <div style=${{ fontSize:10, color:'#64748b', marginBottom:4 }}>CONNECTIONS (${nodeConns.length})</div>
            ${nodeConns.map(c => {
              const other = allNodes.find(n => n.id === (c.fromNodeId === node.id ? c.toNodeId : c.fromNodeId));
              const otherDev = other ? getDevice(other.deviceId) : null;
              return html`
                <div key=${c.id} style=${{ display:'flex', alignItems:'center', gap:5, fontSize:10, color: c.valid ? '#94a3b8' : '#fca5a5', marginBottom:2 }}>
                  <span style=${{ color: c.valid ? '#22c55e' : (c.msg ? '#f59e0b' : '#ef4444') }}>${c.valid ? '●' : '⚠'}</span>
                  <span>${otherDev ? `${otherDev.brand} ${otherDev.model}` : '?'}</span>
                  ${c.msg && html`<span style=${{ color:'#f59e0b', fontSize:9, marginLeft:'auto' }}>${c.msg}</span>`}
                </div>
              `;
            })}
          </div>
        `}

        <!-- Upgrade / swap device -->
        ${sameCategory.length > 0 && html`
          <div>
            <div style=${{ fontSize:10, color:'#64748b', marginBottom:4 }}>SWAP DEVICE</div>
            <select
              onChange=${(e) => e.target.value && onUpgradeDevice(node.id, e.target.value)}
              style=${{ width:'100%', background:'#0f172a', border:'1px solid #1e3a5f', borderRadius:5, color:'#f1f5f9', padding:'5px 8px', fontSize:11, boxSizing:'border-box' }}
            >
              <option value="">— Select replacement —</option>
              ${sameCategory.map(d => html`<option key=${d.id} value=${d.id}>${d.brand} ${d.model}</option>`)}
            </select>
          </div>
        `}
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // PROJECT PANEL
  // ─────────────────────────────────────────────────────────────
  function ProjectPanel({ currentNodes, currentConns, viewport, textBoxes, rackOrder, onLoad, onClose }) {
    const [projects, setProjects] = useState(ProjectStore.list);
    const [saveName, setSaveName] = useState('');

    function doSave() {
      if (!saveName.trim()) { alert('Enter a project name'); return; }
      const updated = ProjectStore.save(saveName.trim(), { nodes: currentNodes, connections: currentConns, viewport, textBoxes: textBoxes || [], rackOrder: rackOrder || [] });
      setProjects(updated);
      setSaveName('');
    }

    function doDelete(name) {
      if (!confirm(`Delete project "${name}"?`)) return;
      setProjects(ProjectStore.delete(name));
    }

    return html`
      <div style=${{ padding:'14px', display:'flex', flexDirection:'column', gap:10 }}>
        <div style=${{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style=${{ fontSize:13, fontWeight:700, color:'#f1f5f9' }}>💾 Projects</span>
          <button onClick=${onClose} style=${{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:18, lineHeight:1 }}>×</button>
        </div>
        <!-- Save current -->
        <div style=${{ display:'flex', gap:6 }}>
          <input
            placeholder="Project name…"
            value=${saveName}
            onInput=${(e) => setSaveName(e.target.value)}
            onKeyDown=${(e) => e.key === 'Enter' && doSave()}
            style=${{ flex:1, background:'#0f172a', border:'1px solid #1e3a5f', borderRadius:5, color:'#f1f5f9', padding:'5px 8px', fontSize:11 }}
          />
          <button onClick=${doSave} style=${{ background:'#1d4ed8', border:'none', color:'#fff', borderRadius:5, padding:'0 10px', cursor:'pointer', fontSize:11 }}>Save</button>
        </div>
        <!-- Saved list -->
        ${projects.length === 0 && html`<div style=${{ fontSize:11, color:'#475569', textAlign:'center', padding:10 }}>No saved projects yet</div>`}
        ${projects.map(p => html`
          <div key=${p.name} style=${{ background:'#0f172a', border:'1px solid #1e2d40', borderRadius:6, padding:'8px 10px', display:'flex', alignItems:'center', gap:6 }}>
            <div style=${{ flex:1, minWidth:0 }}>
              <div style=${{ fontSize:12, fontWeight:600, color:'#f1f5f9', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>${p.name}</div>
              <div style=${{ fontSize:9, color:'#475569' }}>${new Date(p.savedAt).toLocaleString()} · ${p.nodes?.length||0} nodes · ${p.connections?.length||0} cables</div>
            </div>
            <button onClick=${() => onLoad(p)} style=${{ background:'#064e3b', border:'none', color:'#6ee7b7', borderRadius:4, padding:'3px 8px', cursor:'pointer', fontSize:10 }}>Load</button>
            <button onClick=${() => doDelete(p.name)} style=${{ background:'#450a0a', border:'none', color:'#fca5a5', borderRadius:4, padding:'3px 8px', cursor:'pointer', fontSize:10 }}>Del</button>
          </div>
        `)}
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // CUSTOM PORT TYPE MODAL
  // ─────────────────────────────────────────────────────────────
  function CustomPortModal({ onAdd, onClose }) {
    const [label, setLabel] = useState('');
    const [color, setColor] = useState('#94a3b8');

    function doAdd() {
      if (!label.trim()) { alert('Enter a label'); return; }
      const id = 'C_' + label.toUpperCase().replace(/\s+/g,'_');
      onAdd({ id, label: label.trim(), color });
    }

    return html`
      <div style=${{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}
        onClick=${onClose}>
        <div style=${{ background:'#0f172a', border:'1px solid #1e3a5f', borderRadius:10, padding:24, width:300, display:'flex', flexDirection:'column', gap:12 }}
          onClick=${(e) => e.stopPropagation()}>
          <div style=${{ fontSize:14, fontWeight:700, color:'#f1f5f9' }}>Add Custom Connection Type</div>
          <div>
            <div style=${{ fontSize:10, color:'#64748b', marginBottom:4 }}>TYPE LABEL</div>
            <input placeholder="e.g. HDBaseT, AES3…" value=${label} onInput=${(e)=>setLabel(e.target.value)}
              style=${{ width:'100%', background:'#061222', border:'1px solid #1e3a5f', borderRadius:5, color:'#f1f5f9', padding:'7px 10px', fontSize:12, boxSizing:'border-box' }}/>
          </div>
          <div style=${{ display:'flex', alignItems:'center', gap:10 }}>
            <div>
              <div style=${{ fontSize:10, color:'#64748b', marginBottom:4 }}>COLOR</div>
              <input type="color" value=${color} onChange=${(e)=>setColor(e.target.value)}
                style=${{ width:48, height:32, borderRadius:5, border:'none', cursor:'pointer', background:'none' }}/>
            </div>
            <div style=${{ flex:1 }}>
              <div style=${{ fontSize:10, color:'#64748b', marginBottom:4 }}>PREVIEW</div>
              <div style=${{ display:'flex', alignItems:'center', gap:6 }}>
                <span style=${{ width:14, height:14, borderRadius:'50%', background:color, display:'inline-block', border:'2px solid rgba(255,255,255,0.2)' }}></span>
                <span style=${{ fontSize:12, color:'#f1f5f9' }}>${label || '—'}</span>
              </div>
            </div>
          </div>
          <div style=${{ display:'flex', gap:8, marginTop:4 }}>
            <button onClick=${onClose} style=${{ flex:1, background:'#1e293b', border:'1px solid #334155', color:'#94a3b8', borderRadius:6, padding:'8px 0', cursor:'pointer', fontSize:12 }}>Cancel</button>
            <button onClick=${doAdd} style=${{ flex:1, background:'#1d4ed8', border:'none', color:'#fff', borderRadius:6, padding:'8px 0', cursor:'pointer', fontSize:12, fontWeight:600 }}>Add Type</button>
          </div>
        </div>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // CUSTOM DEVICE MODAL
  // ─────────────────────────────────────────────────────────────
  function CustomDeviceModal({ onSave, onClose }) {
    const [brand,    setBrand]    = useState('');
    const [model,    setModel]    = useState('');
    const [category, setCategory] = useState('custom');
    const [inputs,   setInputs]   = useState([{ id: uid(), label: 'Input 1',  type: 'HDMI' }]);
    const [outputs,  setOutputs]  = useState([{ id: uid(), label: 'Output 1', type: 'HDMI' }]);

    const sigTypeOptions = Object.entries(SIG).filter(([k]) => k !== 'CUSTOM');

    function addInput()             { setInputs(ps  => [...ps, { id:uid(), label:`Input ${ps.length+1}`,  type:'HDMI' }]); }
    function addOutput()            { setOutputs(ps => [...ps, { id:uid(), label:`Output ${ps.length+1}`, type:'HDMI' }]); }
    function removeInput(id)        { setInputs(ps  => ps.filter(p => p.id !== id)); }
    function removeOutput(id)       { setOutputs(ps => ps.filter(p => p.id !== id)); }
    function updateInput(id, k, v)  { setInputs(ps  => ps.map(p => p.id === id ? { ...p, [k]: v } : p)); }
    function updateOutput(id, k, v) { setOutputs(ps => ps.map(p => p.id === id ? { ...p, [k]: v } : p)); }

    function doSave() {
      if (!brand.trim() || !model.trim()) { alert('Brand and Model are required.'); return; }
      const dev = {
        id: 'custom_' + uid(),
        category,
        brand: brand.trim(),
        model: model.trim(),
        inputs:  inputs.map(p  => ({ id: p.id, type: p.type, label: p.label })),
        outputs: outputs.map(p => ({ id: p.id, type: p.type, label: p.label })),
        properties: { note: 'Custom device' },
        _custom: true,
      };
      onSave(dev);
      onClose();
    }

    const fieldStyle  = { width:'100%', background:'#061222', border:'1px solid #1e3a5f', borderRadius:5, color:'#f1f5f9', padding:'7px 10px', fontSize:12, boxSizing:'border-box', outline:'none' };
    const secLabel    = { fontSize:10, color:'#64748b', fontWeight:700, letterSpacing:'0.06em', marginBottom:5, marginTop:10 };
    const addBtnStyle = { background:'#0f2744', border:'1px dashed #2d5a8e', color:'#93c5fd', borderRadius:4, padding:'3px 10px', cursor:'pointer', fontSize:10, fontWeight:600, marginTop:3 };

    function renderPortRow(port, onUpdate, onRemove) {
      return html`
        <div key=${port.id} style=${{ display:'flex', gap:5, alignItems:'center', marginBottom:5 }}>
          <button onClick=${() => onRemove(port.id)}
            style=${{ background:'#1c0a0a', border:'1px solid #7f1d1d', color:'#fca5a5', borderRadius:4, padding:'2px 6px', cursor:'pointer', fontSize:11, flexShrink:0 }}>✕</button>
          <input
            value=${port.label}
            onInput=${(e) => onUpdate(port.id, 'label', e.target.value)}
            style=${{ flex:1, background:'#061222', border:'1px solid #1e3a5f', borderRadius:4, color:'#f1f5f9', padding:'4px 7px', fontSize:11, minWidth:0 }}
          />
          <div style=${{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
            <div style=${{ width:8, height:8, borderRadius:'50%', background: SIG[port.type]?.color || '#64748b' }}></div>
            <select
              value=${port.type}
              onChange=${(e) => onUpdate(port.id, 'type', e.target.value)}
              style=${{ background:'#061222', border:'1px solid #1e3a5f', borderRadius:4, color:'#f1f5f9', padding:'4px 4px', fontSize:10 }}
            >
              ${sigTypeOptions.map(([k, v]) => html`<option key=${k} value=${k}>${v.label}</option>`)}
            </select>
          </div>
        </div>
      `;
    }

    return html`
      <div style=${{ position:'fixed', inset:0, background:'rgba(0,0,0,0.78)', zIndex:1100, display:'flex', alignItems:'center', justifyContent:'center' }}
        onClick=${onClose}>
        <div style=${{ background:'#0f172a', border:'1px solid #1e3a5f', borderRadius:12, padding:22, width:500, maxHeight:'90vh', display:'flex', flexDirection:'column', overflowY:'auto', boxSizing:'border-box' }}
          onClick=${(e) => e.stopPropagation()}>

          <div style=${{ fontSize:15, fontWeight:800, color:'#f1f5f9', marginBottom:12 }}>📦 Add Custom Device</div>

          <div style=${{ display:'flex', gap:10 }}>
            <div style=${{ flex:1 }}>
              <div style=${secLabel}>BRAND</div>
              <input placeholder="e.g. AJA, Kramer…" value=${brand} onInput=${(e) => setBrand(e.target.value)} style=${fieldStyle} />
            </div>
            <div style=${{ flex:1 }}>
              <div style=${secLabel}>MODEL</div>
              <input placeholder="e.g. FS-HDR, VP-440" value=${model} onInput=${(e) => setModel(e.target.value)} style=${fieldStyle} />
            </div>
          </div>

          <div style=${secLabel}>CATEGORY</div>
          <select value=${category} onChange=${(e) => setCategory(e.target.value)}
            style=${{ width:'100%', background:'#061222', border:'1px solid #1e3a5f', borderRadius:5, color:'#f1f5f9', padding:'7px 10px', fontSize:12, boxSizing:'border-box' }}>
            ${Object.entries(CAT).map(([k, v]) => html`<option key=${k} value=${k}>${v.icon} ${v.label}</option>`)}
          </select>

          <div style=${secLabel}>INPUTS</div>
          <div style=${{ background:'#061222', borderRadius:6, padding:'8px 10px' }}>
            ${inputs.length === 0 && html`<div style=${{ fontSize:10, color:'#334155', marginBottom:5 }}>No inputs — output-only device.</div>`}
            ${inputs.map(p => renderPortRow(p, updateInput, removeInput))}
            <button onClick=${addInput} style=${addBtnStyle}>＋ Add Input</button>
          </div>

          <div style=${secLabel}>OUTPUTS</div>
          <div style=${{ background:'#061222', borderRadius:6, padding:'8px 10px', marginBottom:14 }}>
            ${outputs.length === 0 && html`<div style=${{ fontSize:10, color:'#334155', marginBottom:5 }}>No outputs — input-only device.</div>`}
            ${outputs.map(p => renderPortRow(p, updateOutput, removeOutput))}
            <button onClick=${addOutput} style=${addBtnStyle}>＋ Add Output</button>
          </div>

          <div style=${{ display:'flex', gap:8 }}>
            <button onClick=${onClose} style=${{ flex:1, background:'#1e293b', border:'1px solid #334155', color:'#94a3b8', borderRadius:6, padding:'9px 0', cursor:'pointer', fontSize:12 }}>Cancel</button>
            <button onClick=${doSave}  style=${{ flex:2, background:'#1d4ed8', border:'none', color:'#fff', borderRadius:6, padding:'9px 0', cursor:'pointer', fontSize:12, fontWeight:700 }}>Save Device to Catalog</button>
          </div>
        </div>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // TEMPLATES
  // ─────────────────────────────────────────────────────────────
  const TEMPLATES = [
    {
      id: 'tpl_ms_led',
      name: 'Media Server → LED Wall',
      description: 'Disguise vx4 → Novastar VX1000 via DP',
      icon: '🎬',
      category: 'basic',
      nodes: [
        { deviceId:'disguise_vx4',    label:'Disguise vx4',    position:{ x:60,  y:100 } },
        { deviceId:'novastar_vx1000', label:'Novastar VX1000', position:{ x:460, y:100 } },
      ],
      wires: [
        { from:0, fromPort:'o1', to:1, toPort:'i3' },
        { from:0, fromPort:'o2', to:1, toPort:'i4' },
      ],
    },
    {
      id: 'tpl_ms_sw_led',
      name: 'Full Live Event',
      description: 'Disguise vx4 → Barco E2 → Novastar VX1000',
      icon: '🎪',
      category: 'basic',
      nodes: [
        { deviceId:'disguise_vx4',    label:'Disguise vx4',    position:{ x:60,  y:120 } },
        { deviceId:'barco_e2',         label:'Barco E2',         position:{ x:440, y:80  } },
        { deviceId:'novastar_vx1000', label:'Novastar VX1000', position:{ x:820, y:120 } },
      ],
      wires: [
        { from:0, fromPort:'o1', to:1, toPort:'i5' },
        { from:0, fromPort:'o2', to:1, toPort:'i6' },
        { from:1, fromPort:'o3', to:2, toPort:'i3' },
        { from:1, fromPort:'o4', to:2, toPort:'i4' },
      ],
    },
    {
      id: 'tpl_watchout',
      name: 'WATCHOUT Cluster',
      description: 'Production PC → Network Switch → two Display PCs',
      icon: '🖥️',
      category: 'basic',
      nodes: [
        { deviceId:'dataton_wo_prod',   label:'WATCHOUT Production', position:{ x:60,  y:130 } },
        { deviceId:'generic_switch_8p', label:'Cluster Switch',      position:{ x:340, y:130 } },
        { deviceId:'dataton_wo_disp',   label:'WATCHOUT Display 1',  position:{ x:620, y:40  } },
        { deviceId:'dataton_wo_disp',   label:'WATCHOUT Display 2',  position:{ x:620, y:220 } },
      ],
      wires: [
        { from:0, fromPort:'o1', to:1, toPort:'i1' },
        { from:1, fromPort:'o1', to:2, toPort:'i1' },
        { from:1, fromPort:'o2', to:3, toPort:'i1' },
      ],
    },
    {
      id: 'tpl_projection',
      name: '4K Projection Rig',
      description: 'Disguise vx4 → Analog Way → 2× Panasonic projectors',
      icon: '📽️',
      category: 'basic',
      nodes: [
        { deviceId:'disguise_vx4',       label:'Disguise vx4',      position:{ x:60,  y:120 } },
        { deviceId:'analogway_aquilon',  label:'AW Aquilon RS4',     position:{ x:440, y:80  } },
        { deviceId:'panasonic_rz31k',    label:'Projector Left',     position:{ x:820, y:40  } },
        { deviceId:'panasonic_rz31k',    label:'Projector Right',    position:{ x:820, y:240 } },
      ],
      wires: [
        { from:0, fromPort:'o1', to:1, toPort:'i5' },
        { from:0, fromPort:'o2', to:1, toPort:'i6' },
        { from:1, fromPort:'o5', to:2, toPort:'i3' },
        { from:1, fromPort:'o6', to:3, toPort:'i3' },
      ],
    },
    {
      id: 'tpl_resolume_led',
      name: 'Resolume → LED Processor',
      description: 'Resolume Arena → Novastar VX600 via HDMI',
      icon: '🌀',
      category: 'basic',
      nodes: [
        { deviceId:'resolume_arena',  label:'Resolume Arena', position:{ x:60,  y:100 } },
        { deviceId:'novastar_vx600',  label:'Novastar VX600', position:{ x:440, y:100 } },
      ],
      wires: [
        { from:0, fromPort:'o1', to:1, toPort:'i1' },
      ],
    },
    {
      id: 'tpl_fiber_ext',
      name: 'Fiber Extension',
      description: 'Source → Lightware TX → Fiber → Lightware RX → Display',
      icon: '🔆',
      category: 'basic',
      nodes: [
        { deviceId:'disguise_vx4',       label:'Source',          position:{ x:60,  y:120 } },
        { deviceId:'lightware_opt_tx',   label:'LW Fiber TX',     position:{ x:420, y:120 } },
        { deviceId:'lightware_opt_rx',   label:'LW Fiber RX',     position:{ x:680, y:120 } },
        { deviceId:'novastar_vx1000',    label:'LED Processor',   position:{ x:940, y:120 } },
      ],
      wires: [
        { from:0, fromPort:'o5', to:1, toPort:'i1' },
        { from:1, fromPort:'o1', to:2, toPort:'i1' },
        { from:2, fromPort:'o1', to:3, toPort:'i1' },
      ],
    },

    // ── ADVANCED TEMPLATES ─────────────────────────────────────
    {
      id: 'tpl_concert_imag',
      name: 'Concert IMAG System',
      description: 'Multi-camera IMAG: 4× SDI cameras → ATEM 4ME switcher → Barco E2 → 2× LED walls + 2× projectors',
      icon: '🎤',
      category: 'advanced',
      nodes: [
        { deviceId:'bmd_atem_4me',     label:'ATEM 4 M/E',     position:{ x:60,  y:160 } },
        { deviceId:'barco_e2',          label:'Barco E2',        position:{ x:500, y:160 } },
        { deviceId:'novastar_vx1000',  label:'LED Wall L',      position:{ x:920, y:40  } },
        { deviceId:'novastar_vx1000',  label:'LED Wall R',      position:{ x:920, y:180 } },
        { deviceId:'panasonic_rz31k',  label:'Projector L',     position:{ x:920, y:320 } },
        { deviceId:'panasonic_rz31k',  label:'Projector R',     position:{ x:920, y:460 } },
      ],
      wires: [
        { from:0, fromPort:'o1', to:1, toPort:'i7' },
        { from:0, fromPort:'o2', to:1, toPort:'i8' },
        { from:1, fromPort:'o3', to:2, toPort:'i3' },
        { from:1, fromPort:'o4', to:3, toPort:'i3' },
        { from:1, fromPort:'o1', to:4, toPort:'i1' },
        { from:1, fromPort:'o2', to:5, toPort:'i1' },
      ],
    },
    {
      id: 'tpl_broadcast_studio',
      name: 'Broadcast Studio',
      description: 'ATEM 4ME → SDI matrix → multiview monitors + program out via fiber',
      icon: '📺',
      category: 'advanced',
      nodes: [
        { deviceId:'bmd_atem_4me',     label:'ATEM 4 M/E',       position:{ x:60,  y:160 } },
        { deviceId:'bmd_hub_40x40',    label:'SDI Router 40×40', position:{ x:480, y:100 } },
        { deviceId:'conv_sdi_hdmi',    label:'SDI→HDMI Mon 1',   position:{ x:880, y:40  } },
        { deviceId:'conv_sdi_hdmi',    label:'SDI→HDMI Mon 2',   position:{ x:880, y:180 } },
        { deviceId:'conv_sdi_hdmi',    label:'SDI→HDMI PGM',     position:{ x:880, y:320 } },
      ],
      wires: [
        { from:0, fromPort:'o1', to:1, toPort:'i1' },
        { from:0, fromPort:'o3', to:1, toPort:'i2' },
        { from:1, fromPort:'o1', to:2, toPort:'i1' },
        { from:1, fromPort:'o2', to:3, toPort:'i1' },
        { from:1, fromPort:'o3', to:4, toPort:'i1' },
      ],
    },
    {
      id: 'tpl_dual_server_redundancy',
      name: 'Dual Server Redundancy',
      description: 'Main + backup Disguise vx4+ feeding Aquilon switcher for seamless failover to LED wall',
      icon: '🔄',
      category: 'advanced',
      nodes: [
        { deviceId:'disguise_vx4plus', label:'Main Server (vx4+)',     position:{ x:60,  y:60  } },
        { deviceId:'disguise_vx4plus', label:'Backup Server (vx4+)',   position:{ x:60,  y:280 } },
        { deviceId:'analogway_aquilon',label:'AW Aquilon (Failover)',  position:{ x:500, y:160 } },
        { deviceId:'novastar_vx1000',  label:'LED Processor Main',    position:{ x:920, y:100 } },
        { deviceId:'novastar_vx1000',  label:'LED Processor Aux',     position:{ x:920, y:280 } },
      ],
      wires: [
        { from:0, fromPort:'o1', to:2, toPort:'i5' },
        { from:0, fromPort:'o2', to:2, toPort:'i6' },
        { from:1, fromPort:'o1', to:2, toPort:'i1' },
        { from:1, fromPort:'o2', to:2, toPort:'i2' },
        { from:2, fromPort:'o5', to:3, toPort:'i3' },
        { from:2, fromPort:'o6', to:3, toPort:'i4' },
        { from:2, fromPort:'o7', to:4, toPort:'i3' },
        { from:2, fromPort:'o8', to:4, toPort:'i4' },
      ],
    },
    {
      id: 'tpl_large_led_stage',
      name: 'Large LED Stage',
      description: 'Disguise gx2c → 4× Novastar VX1000 processors for massive LED volume (upstage + floor + side panels)',
      icon: '🏟️',
      category: 'advanced',
      nodes: [
        { deviceId:'disguise_gx2c',    label:'Disguise gx 2c',     position:{ x:60,  y:200 } },
        { deviceId:'novastar_vx1000',  label:'Upstage LED',        position:{ x:520, y:40  } },
        { deviceId:'novastar_vx1000',  label:'Floor LED',          position:{ x:520, y:160 } },
        { deviceId:'novastar_vx1000',  label:'Stage Left LED',     position:{ x:520, y:280 } },
        { deviceId:'novastar_vx1000',  label:'Stage Right LED',    position:{ x:520, y:400 } },
      ],
      wires: [
        { from:0, fromPort:'o1', to:1, toPort:'i3' },
        { from:0, fromPort:'o2', to:1, toPort:'i4' },
        { from:0, fromPort:'o3', to:2, toPort:'i3' },
        { from:0, fromPort:'o4', to:2, toPort:'i4' },
        { from:0, fromPort:'o5', to:3, toPort:'i3' },
        { from:0, fromPort:'o6', to:3, toPort:'i4' },
        { from:0, fromPort:'o7', to:4, toPort:'i3' },
        { from:0, fromPort:'o8', to:4, toPort:'i4' },
      ],
    },
    {
      id: 'tpl_corporate_av',
      name: 'Corporate Boardroom',
      description: 'Laptop inputs → HDMI matrix → confidence monitors + projector + recording',
      icon: '🏢',
      category: 'advanced',
      nodes: [
        { deviceId:'lightware_mx2',    label:'HDMI Matrix 16×16',  position:{ x:300, y:160 } },
        { deviceId:'panasonic_mz20k',  label:'Main Projector',     position:{ x:700, y:40  } },
        { deviceId:'conv_hdmi_sdi',    label:'HDMI→SDI Record',    position:{ x:700, y:160 } },
        { deviceId:'bmd_atem_2me',     label:'ATEM Recorder',      position:{ x:700, y:300 } },
      ],
      wires: [
        { from:0, fromPort:'o1', to:1, toPort:'i1' },
        { from:0, fromPort:'o2', to:2, toPort:'i1' },
        { from:2, fromPort:'o1', to:3, toPort:'i1' },
      ],
    },
    {
      id: 'tpl_pixera_immersive',
      name: 'Pixera Immersive Experience',
      description: 'Pixera three → Brompton Tessera → fiber LED outputs for 8K immersive dome/cave',
      icon: '🌐',
      category: 'advanced',
      nodes: [
        { deviceId:'pixera_three',       label:'Pixera three (8K)',   position:{ x:60,  y:160 } },
        { deviceId:'brompton_tessera',   label:'Brompton Tessera SX40', position:{ x:500, y:80  } },
        { deviceId:'brompton_tessera',   label:'Brompton Tessera SX40 #2', position:{ x:500, y:300 } },
      ],
      wires: [
        { from:0, fromPort:'o1', to:1, toPort:'i3' },
        { from:0, fromPort:'o2', to:1, toPort:'i4' },
        { from:0, fromPort:'o3', to:2, toPort:'i3' },
        { from:0, fromPort:'o4', to:2, toPort:'i4' },
      ],
    },
    {
      id: 'tpl_multi_proj_blend',
      name: 'Multi-Projector Edge Blend',
      description: 'Disguise vx4+ → AW LivePremier → 4× Christie 4K projectors for seamless panoramic blend',
      icon: '🎞️',
      category: 'advanced',
      nodes: [
        { deviceId:'disguise_vx4plus',  label:'Disguise vx4+',       position:{ x:60,  y:200 } },
        { deviceId:'analogway_lp',      label:'AW LivePremier',      position:{ x:460, y:200 } },
        { deviceId:'christie_boxer_4k35',label:'Projector Zone 1',   position:{ x:860, y:40  } },
        { deviceId:'christie_boxer_4k35',label:'Projector Zone 2',   position:{ x:860, y:160 } },
        { deviceId:'christie_boxer_4k35',label:'Projector Zone 3',   position:{ x:860, y:280 } },
        { deviceId:'christie_boxer_4k35',label:'Projector Zone 4',   position:{ x:860, y:400 } },
      ],
      wires: [
        { from:0, fromPort:'o1', to:1, toPort:'i5' },
        { from:0, fromPort:'o2', to:1, toPort:'i6' },
        { from:0, fromPort:'o3', to:1, toPort:'i1' },
        { from:0, fromPort:'o4', to:1, toPort:'i2' },
        { from:1, fromPort:'o1', to:2, toPort:'i1' },
        { from:1, fromPort:'o2', to:3, toPort:'i1' },
        { from:1, fromPort:'o3', to:4, toPort:'i1' },
        { from:1, fromPort:'o4', to:5, toPort:'i1' },
      ],
    },
    {
      id: 'tpl_hybrid_event',
      name: 'Hybrid Event (Live + Stream)',
      description: 'Camera feeds → ATEM switcher → LED wall for in-room + SDI out for streaming encoder',
      icon: '📡',
      category: 'advanced',
      nodes: [
        { deviceId:'bmd_atem_2me',     label:'ATEM 2 M/E',          position:{ x:60,  y:160 } },
        { deviceId:'barco_s3',          label:'Barco S3 Switcher',   position:{ x:480, y:80  } },
        { deviceId:'novastar_vx600',   label:'LED Wall Processor',  position:{ x:880, y:40  } },
        { deviceId:'conv_sdi_hdmi',    label:'SDI→HDMI (Stream)',   position:{ x:480, y:300 } },
      ],
      wires: [
        { from:0, fromPort:'o5', to:1, toPort:'i1' },
        { from:0, fromPort:'o6', to:1, toPort:'i2' },
        { from:1, fromPort:'o1', to:2, toPort:'i1' },
        { from:0, fromPort:'o1', to:3, toPort:'i1' },
      ],
    },
    {
      id: 'tpl_fiber_distributed',
      name: 'Fiber Distributed Venue',
      description: 'Central rack → fiber TX/RX pairs distributing HDMI to 3 distant venue zones over 300m',
      icon: '🔌',
      category: 'advanced',
      nodes: [
        { deviceId:'disguise_vx4',      label:'Media Server',    position:{ x:60,  y:200 } },
        { deviceId:'lightware_mx2',     label:'HDMI Matrix',     position:{ x:420, y:200 } },
        { deviceId:'lightware_opt_tx',  label:'Fiber TX Zone 1', position:{ x:740, y:40  } },
        { deviceId:'lightware_opt_rx',  label:'Fiber RX Zone 1', position:{ x:1040, y:40  } },
        { deviceId:'lightware_opt_tx',  label:'Fiber TX Zone 2', position:{ x:740, y:200 } },
        { deviceId:'lightware_opt_rx',  label:'Fiber RX Zone 2', position:{ x:1040, y:200 } },
        { deviceId:'lightware_opt_tx',  label:'Fiber TX Zone 3', position:{ x:740, y:360 } },
        { deviceId:'lightware_opt_rx',  label:'Fiber RX Zone 3', position:{ x:1040, y:360 } },
      ],
      wires: [
        { from:0, fromPort:'o5', to:1, toPort:'i1' },
        { from:1, fromPort:'o1', to:2, toPort:'i1' },
        { from:2, fromPort:'o1', to:3, toPort:'i1' },
        { from:1, fromPort:'o2', to:4, toPort:'i1' },
        { from:4, fromPort:'o1', to:5, toPort:'i1' },
        { from:1, fromPort:'o3', to:6, toPort:'i1' },
        { from:6, fromPort:'o1', to:7, toPort:'i1' },
      ],
    },
    {
      id: 'tpl_vp_stage',
      name: 'Virtual Production Stage',
      description: 'Disguise gx2c → Brompton Tessera for LED volume + camera tracking loop for VP/xR',
      icon: '🎬',
      category: 'advanced',
      nodes: [
        { deviceId:'disguise_gx2c',     label:'Disguise gx 2c (VP)',  position:{ x:60,  y:160 } },
        { deviceId:'brompton_tessera',   label:'Brompton Primary',     position:{ x:520, y:60  } },
        { deviceId:'brompton_tessera',   label:'Brompton Secondary',   position:{ x:520, y:300 } },
        { deviceId:'bmd_atem_2me',       label:'ATEM (Camera Return)', position:{ x:60,  y:380 } },
      ],
      wires: [
        { from:0, fromPort:'o1', to:1, toPort:'i3' },
        { from:0, fromPort:'o2', to:1, toPort:'i4' },
        { from:0, fromPort:'o3', to:2, toPort:'i3' },
        { from:0, fromPort:'o4', to:2, toPort:'i4' },
        { from:3, fromPort:'o5', to:0, toPort:'i2' },
      ],
    },
    {
      id: 'tpl_resolume_multiout',
      name: 'Resolume Multi-Output Show',
      description: 'Resolume Arena → Roland switcher → 2× LED processors + projection confidence',
      icon: '🌀',
      category: 'advanced',
      nodes: [
        { deviceId:'resolume_arena',   label:'Resolume Arena',     position:{ x:60,  y:160 } },
        { deviceId:'roland_v1200',     label:'Roland V-1200HD',    position:{ x:440, y:160 } },
        { deviceId:'novastar_vx600',   label:'LED Proc Stage',     position:{ x:820, y:60  } },
        { deviceId:'novastar_vx400',   label:'LED Proc DJ Booth',  position:{ x:820, y:260 } },
        { deviceId:'panasonic_rz21k',  label:'Confidence Monitor', position:{ x:820, y:420 } },
      ],
      wires: [
        { from:0, fromPort:'o1', to:1, toPort:'i1' },
        { from:0, fromPort:'o2', to:1, toPort:'i2' },
        { from:1, fromPort:'o1', to:2, toPort:'i1' },
        { from:1, fromPort:'o2', to:3, toPort:'i1' },
        { from:1, fromPort:'o3', to:4, toPort:'i4' },
      ],
    },
    {
      id: 'tpl_watchout_4screen',
      name: 'WATCHOUT 4-Screen Setup',
      description: 'WATCHOUT production → network switch → 4× display PCs for multi-screen installation',
      icon: '🖥️',
      category: 'advanced',
      nodes: [
        { deviceId:'dataton_wo_prod',   label:'WATCHOUT Production',  position:{ x:60,  y:200 } },
        { deviceId:'netgear_m4300',     label:'Cluster Switch',        position:{ x:340, y:200 } },
        { deviceId:'dataton_wo_disp',   label:'Display PC 1 (Left)',  position:{ x:660, y:40  } },
        { deviceId:'dataton_wo_disp',   label:'Display PC 2 (CL)',    position:{ x:660, y:150 } },
        { deviceId:'dataton_wo_disp',   label:'Display PC 3 (CR)',    position:{ x:660, y:260 } },
        { deviceId:'dataton_wo_disp',   label:'Display PC 4 (Right)', position:{ x:660, y:370 } },
      ],
      wires: [
        { from:0, fromPort:'o1', to:1, toPort:'i1' },
        { from:1, fromPort:'o1', to:2, toPort:'i1' },
        { from:1, fromPort:'o2', to:3, toPort:'i1' },
        { from:1, fromPort:'o3', to:4, toPort:'i1' },
        { from:1, fromPort:'o4', to:5, toPort:'i1' },
      ],
    },
    {
      id: 'tpl_ndi_workflow',
      name: 'NDI Network Workflow',
      description: 'Media servers → network switch (NDI) → switcher → LED + projection',
      icon: '🌐',
      category: 'advanced',
      nodes: [
        { deviceId:'resolume_arena',    label:'Resolume (NDI Src 1)', position:{ x:60,  y:60  } },
        { deviceId:'millumin_v4',       label:'Millumin (NDI Src 2)', position:{ x:60,  y:310 } },
        { deviceId:'netgear_m4300',     label:'NDI Network Switch',   position:{ x:340, y:160 } },
        { deviceId:'pixelhue_h3',       label:'PixelHue H3 Switcher', position:{ x:640, y:160 } },
        { deviceId:'novastar_vx600',    label:'LED Processor',        position:{ x:940, y:100 } },
        { deviceId:'panasonic_rq13k',   label:'4K Projector',         position:{ x:940, y:280 } },
      ],
      wires: [
        { from:0, fromPort:'o4', to:2, toPort:'i1' },
        { from:1, fromPort:'o4', to:2, toPort:'i2' },
        { from:2, fromPort:'o1', to:3, toPort:'i7' },
        { from:3, fromPort:'o1', to:4, toPort:'i1' },
        { from:3, fromPort:'o3', to:5, toPort:'i3' },
      ],
    },
    {
      id: 'tpl_full_concert',
      name: 'Full Concert Production',
      description: 'Complete concert: media server + cameras + switcher + LED walls + IMAG projectors + stream out',
      icon: '🎸',
      category: 'advanced',
      nodes: [
        { deviceId:'disguise_vx4plus',  label:'Disguise vx4+ (Content)', position:{ x:60,  y:120 } },
        { deviceId:'bmd_atem_4me',      label:'ATEM 4ME (Cameras)',      position:{ x:60,  y:360 } },
        { deviceId:'barco_e2',           label:'Barco E2 (Main Mix)',     position:{ x:520, y:200 } },
        { deviceId:'novastar_vx1000',   label:'Upstage LED Wall',        position:{ x:960, y:60  } },
        { deviceId:'novastar_vx1000',   label:'Side LED Panels',         position:{ x:960, y:180 } },
        { deviceId:'panasonic_rq35k',   label:'IMAG Projector L',        position:{ x:960, y:300 } },
        { deviceId:'panasonic_rq35k',   label:'IMAG Projector R',        position:{ x:960, y:420 } },
        { deviceId:'conv_sdi_hdmi',     label:'Stream Encoder Feed',     position:{ x:520, y:420 } },
      ],
      wires: [
        { from:0, fromPort:'o1', to:2, toPort:'i5' },
        { from:0, fromPort:'o2', to:2, toPort:'i6' },
        { from:1, fromPort:'o1', to:2, toPort:'i7' },
        { from:1, fromPort:'o2', to:2, toPort:'i8' },
        { from:2, fromPort:'o3', to:3, toPort:'i3' },
        { from:2, fromPort:'o4', to:4, toPort:'i3' },
        { from:2, fromPort:'o1', to:5, toPort:'i1' },
        { from:2, fromPort:'o2', to:6, toPort:'i1' },
        { from:1, fromPort:'o3', to:7, toPort:'i1' },
      ],
    },
  ];

  // ─────────────────────────────────────────────────────────────
  // TEMPLATES MODAL
  // ─────────────────────────────────────────────────────────────
  function TemplatesModal({ onLoad, onClose }) {
    const [filter, setFilter] = useState('all');
    const cats = [
      { key:'all',      label:'All Templates' },
      { key:'basic',    label:'Basic' },
      { key:'advanced', label:'Advanced' },
    ];
    const filtered = filter === 'all' ? TEMPLATES : TEMPLATES.filter(t => t.category === filter);
    return html`
      <div style=${{ position:'fixed', inset:0, background:'rgba(0,2,12,0.82)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}
        onClick=${onClose}>
        <div style=${{ background:'#071323', border:'1px solid #1e3a5f', borderRadius:12, padding:24, width:720, maxHeight:'85vh', overflowY:'auto', display:'flex', flexDirection:'column', gap:16 }}
          onClick=${(e) => e.stopPropagation()}>
          <div style=${{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style=${{ fontSize:15, fontWeight:800, color:'#f1f5f9', letterSpacing:'-0.3px' }}>Templates</div>
              <div style=${{ fontSize:10, color:'#475569', marginTop:1 }}>Pre-wired signal chains — load and customise</div>
            </div>
            <button onClick=${onClose} style=${{ background:'#1e293b', border:'1px solid #334155', color:'#94a3b8', borderRadius:6, width:28, height:28, cursor:'pointer', fontSize:16 }}>×</button>
          </div>
          <!-- Category Tabs -->
          <div style=${{ display:'flex', gap:6 }}>
            ${cats.map(c => html`
              <button key=${c.key}
                onClick=${() => setFilter(c.key)}
                style=${{
                  background: filter===c.key ? '#1e3a5f' : '#0b1629',
                  border: filter===c.key ? '1px solid #3b82f6' : '1px solid #1e3a5f',
                  color: filter===c.key ? '#60a5fa' : '#64748b',
                  borderRadius:6, padding:'5px 14px', fontSize:11, fontWeight:600, cursor:'pointer',
                  transition:'all 0.15s',
                }}
              >${c.label} (${c.key==='all' ? TEMPLATES.length : TEMPLATES.filter(t=>t.category===c.key).length})</button>
            `)}
          </div>
          <div style=${{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            ${filtered.map(t => html`
              <div key=${t.id}
                style=${{ background:'#0b1629', border:'1px solid #1e3a5f', borderRadius:8, padding:'12px 14px', cursor:'pointer', transition:'border-color 0.15s' }}
                onMouseEnter=${(e) => e.currentTarget.style.borderColor='#3b82f6'}
                onMouseLeave=${(e) => e.currentTarget.style.borderColor='#1e3a5f'}
                onClick=${() => { onLoad(t); onClose(); }}
              >
                <div style=${{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <span style=${{ fontSize:20 }}>${t.icon}</span>
                  <div style=${{ flex:1, minWidth:0 }}>
                    <span style=${{ fontSize:12, fontWeight:700, color:'#f1f5f9' }}>${t.name}</span>
                    ${t.category==='advanced' && html`<span style=${{ fontSize:8, background:'#7c3aed22', border:'1px solid #7c3aed44', color:'#a78bfa', borderRadius:3, padding:'1px 5px', marginLeft:6, verticalAlign:'middle' }}>ADV</span>`}
                  </div>
                </div>
                <div style=${{ fontSize:10, color:'#64748b', marginBottom:8, lineHeight:1.4 }}>${t.description}</div>
                <div style=${{ display:'flex', gap:4, flexWrap:'wrap' }}>
                  ${t.nodes.map((n,i) => {
                    const d = getDevice(n.deviceId);
                    const cat = CAT[d?.category] || CAT.custom;
                    return html`<span key=${i} style=${{ fontSize:9, background: cat.color+'22', border:'1px solid ' + cat.color+'44', color: cat.color, borderRadius:3, padding:'1px 5px' }}>${d?.brand} ${d?.model}</span>`;
                  })}
                </div>
                <div style=${{ marginTop:8, fontSize:9, color:'#334155' }}>${t.nodes.length} devices · ${t.wires.length} cables</div>
              </div>
            `)}
          </div>
        </div>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // RACK VIEW
  // ─────────────────────────────────────────────────────────────
  const RU = 36;          // 1U = 36px
  const RACK_W = 460;     // 19" rack width in px
  const RACK_PAD = 48;    // side rail padding

  // Rack-unit size lookup by category (real-world typical)
  const DEVICE_RU = {
    media_server: 2, switcher: 3, ledprocessor: 1, matrix: 2,
    projector: 0, ledwall: 0, converter: 1, network: 1, custom: 1,
  };
  // Typical power draw (watts) by category
  const DEVICE_POWER = {
    media_server: 650, switcher: 800, ledprocessor: 120, matrix: 80,
    projector: 0, ledwall: 0, converter: 15, network: 45, custom: 50,
  };
  // Typical weight (kg) by category
  const DEVICE_WEIGHT = {
    media_server: 12, switcher: 16, ledprocessor: 3.5, matrix: 4,
    projector: 0, ledwall: 0, converter: 0.8, network: 1.5, custom: 2,
  };

  function RackView({ nodes, connections, rackOrder, setRackOrder, canvasRef }) {
    const [dragIdx, setDragIdx] = useState(null);
    const [hoverIdx, setHoverIdx] = useState(null);

    // Build ordered list: use rackOrder if available, else default category sort
    const orderMap = useMemo(() => {
      const catOrder = ['media_server','switcher','ledprocessor','matrix','projector','ledwall','network','converter','custom'];
      if (rackOrder && rackOrder.length > 0) {
        const byId = new Map(rackOrder.map((id, i) => [id, i]));
        const inOrder = nodes.filter(n => byId.has(n.id)).sort((a,b) => byId.get(a.id) - byId.get(b.id));
        const rest = nodes.filter(n => !byId.has(n.id)).sort((a,b) => {
          const da = getDevice(a.deviceId), db = getDevice(b.deviceId);
          return catOrder.indexOf(da?.category||'custom') - catOrder.indexOf(db?.category||'custom');
        });
        return [...inOrder, ...rest];
      }
      return [...nodes].sort((a,b) => {
        const da = getDevice(a.deviceId), db = getDevice(b.deviceId);
        return catOrder.indexOf(da?.category||'custom') - catOrder.indexOf(db?.category||'custom');
      });
    }, [nodes, rackOrder]);

    const sorted = orderMap;
    // Filter out projectors and LED walls (not rack-mountable) — show them separately
    const rackItems = sorted.filter(n => { const d = getDevice(n.deviceId); return d?.category !== 'projector' && d?.category !== 'ledwall'; });
    const floorItems = sorted.filter(n => { const d = getDevice(n.deviceId); return d?.category === 'projector' || d?.category === 'ledwall'; });

    const totalRU = rackItems.reduce((sum, n) => sum + (DEVICE_RU[getDevice(n.deviceId)?.category] || 1), 0);
    const totalPower = rackItems.reduce((sum, n) => sum + (DEVICE_POWER[getDevice(n.deviceId)?.category] || 0), 0);
    const totalWeight = rackItems.reduce((sum, n) => sum + (DEVICE_WEIGHT[getDevice(n.deviceId)?.category] || 0), 0);
    const rackCapacity = Math.max(totalRU + 4, 42); // standard 42U rack

    function onDragStart(idx) { setDragIdx(idx); }
    function onDragOver(e, idx) { e.preventDefault(); setHoverIdx(idx); }
    function onDrop(idx) {
      if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setHoverIdx(null); return; }
      const newOrder = [...rackItems];
      const [moved] = newOrder.splice(dragIdx, 1);
      newOrder.splice(idx, 0, moved);
      // Include floor items at the end to preserve full ordering
      setRackOrder([...newOrder, ...floorItems].map(n => n.id));
      setDragIdx(null); setHoverIdx(null);
    }
    function onDragEnd() { setDragIdx(null); setHoverIdx(null); }

    // RU position accumulator
    let ruCounter = 1;

    return html`
      <div style=${{ flex:1, overflow:'auto', background:'#020a16', display:'flex', justifyContent:'center', padding:'32px 24px', gap:32, alignItems:'flex-start', flexWrap:'wrap' }}>
        <!-- Rack chassis -->
        <div ref=${canvasRef} style=${{ background:'#010810', border:'2px solid #1e3a5f', borderRadius:6, padding:'0', minWidth: RACK_W + RACK_PAD * 2 + 20, display:'inline-block', boxShadow:'0 8px 40px rgba(0,0,0,0.7)' }}>
          <!-- Rack top panel -->
          <div style=${{ background:'linear-gradient(90deg,#1e293b,#0f172a,#1e293b)', padding:'10px 16px', borderBottom:'2px solid #1e3a5f', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style=${{ fontSize:11, fontWeight:700, color:'#94a3b8', letterSpacing:'0.12em' }}>AV EQUIPMENT RACK</div>
            <div style=${{ fontSize:9, color:'#64748b' }}>${totalRU}U / ${rackCapacity}U  ·  Drag to reorder</div>
          </div>
          <!-- Rail area -->
          <div style=${{ display:'flex', gap:0 }}>
            <!-- left rail -->
            <div style=${{ width: RACK_PAD, background:'linear-gradient(90deg,#0d1b2e,#1e293b)', borderRight:'2px solid #1e3a5f', display:'flex', flexDirection:'column', alignItems:'center', paddingTop:4 }}>
              ${rackItems.map((node) => {
                const dev = getDevice(node.deviceId);
                const ru = DEVICE_RU[dev?.category] || 1;
                const startU = ruCounter; ruCounter += ru;
                return html`<div key=${node.id} style=${{ height: RU * ru, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:0 }}>
                  ${Array.from({length: ru}, (_, k) => html`<div key=${k} style=${{ fontSize:8, color:'#334155', height:RU, display:'flex', alignItems:'center', lineHeight:1 }}>${startU + k}</div>`)}
                </div>`;
              })}
              ${/* empty slots */ Array.from({length: Math.max(0, rackCapacity - totalRU)}, (_, i) => html`<div key=${'e'+i} style=${{ fontSize:8, color:'#1e293b', height:RU, display:'flex', alignItems:'center', justifyContent:'center' }}>${totalRU + i + 1}</div>`)}
            </div>
            <!-- slots -->
            <div style=${{ flex:1, padding:'4px 0' }}>
              ${rackItems.map((node, i) => {
                const dev = getDevice(node.deviceId);
                const cat = CAT[dev?.category||'custom'] || CAT.custom;
                const ru = DEVICE_RU[dev?.category] || 1;
                const power = DEVICE_POWER[dev?.category] || 0;
                const weight = DEVICE_WEIGHT[dev?.category] || 0;
                const nodeConns = connections.filter(c => c.fromNodeId === node.id || c.toNodeId === node.id);
                const isDragOver = hoverIdx === i && dragIdx !== null && dragIdx !== i;
                return html`
                  <div key=${node.id}
                    draggable="true"
                    onDragStart=${() => onDragStart(i)}
                    onDragOver=${(e) => onDragOver(e, i)}
                    onDrop=${() => onDrop(i)}
                    onDragEnd=${onDragEnd}
                    style=${{
                      height: RU * ru - 4, margin:'2px 0',
                      background:`linear-gradient(90deg, ${cat.color}22 0%, ${cat.color}0a 100%)`,
                      border:`1px solid ${isDragOver ? '#60a5fa' : cat.color + '55'}`,
                      borderTop: isDragOver ? '2px solid #60a5fa' : undefined,
                      display:'flex', alignItems:'center', padding:'0 10px', gap:8,
                      position:'relative', overflow:'hidden', cursor:'grab',
                      transition: 'border-color 0.15s',
                      opacity: dragIdx === i ? 0.4 : 1,
                    }}>
                    <!-- unit indicator stripe -->
                    <div style=${{ position:'absolute', left:0, top:0, bottom:0, width:3, background: cat.color }}></div>
                    <!-- RU badge -->
                    <div style=${{ background: cat.color + '33', borderRadius:3, padding:'1px 5px', fontSize:8, fontWeight:700, color: cat.color, flexShrink:0, minWidth:22, textAlign:'center' }}>${ru}U</div>
                    <span style=${{ fontSize:13, flexShrink:0 }}>${cat.icon}</span>
                    <div style=${{ flex:1, minWidth:0 }}>
                      <div style=${{ fontSize:9, color:'rgba(255,255,255,0.45)', lineHeight:1 }}>${dev?.brand}</div>
                      <div style=${{ fontSize:11, fontWeight:700, color:'#e2e8f0', lineHeight:1.3, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>${node.label || dev?.model}</div>
                    </div>
                    <!-- port indicators -->
                    <div style=${{ display:'flex', gap:3, alignItems:'center', flexShrink:0 }}>
                      ${(dev?.inputs||[]).slice(0,6).map(p => html`
                        <div key=${p.id} title=${p.label} style=${{ width:8, height:8, borderRadius:1, background: SIG[p.type]?.color || '#334155', opacity:0.8 }}></div>
                      `)}
                      ${(dev?.inputs||[]).length > 6 && html`<span style=${{ fontSize:7, color:'#475569' }}>+${(dev.inputs||[]).length-6}</span>`}
                      <div style=${{ width:1, height:12, background:'#1e3a5f', margin:'0 2px' }}></div>
                      ${(dev?.outputs||[]).slice(0,6).map(p => html`
                        <div key=${p.id} title=${p.label} style=${{ width:8, height:8, borderRadius:1, background: SIG[p.type]?.color || '#334155', opacity:0.9, border:'1px solid rgba(255,255,255,0.15)' }}></div>
                      `)}
                      ${(dev?.outputs||[]).length > 6 && html`<span style=${{ fontSize:7, color:'#475569' }}>+${(dev.outputs||[]).length-6}</span>`}
                    </div>
                    <!-- power -->
                    ${power > 0 && html`<span style=${{ fontSize:8, color:'#475569', flexShrink:0 }}>${power}W</span>`}
                    <!-- connection count badge -->
                    ${nodeConns.length > 0 && html`
                      <div style=${{ background:'#1d4ed8', borderRadius:10, padding:'1px 6px', fontSize:9, color:'#fff', fontWeight:700, flexShrink:0 }}>${nodeConns.length}</div>
                    `}
                  </div>
                `;
              })}
              ${/* Empty rack slots visualization */
                Array.from({length: Math.max(0, rackCapacity - totalRU)}, (_, i) => html`
                  <div key=${'empty-'+i} style=${{ height: RU - 4, margin:'2px 0', background:'rgba(255,255,255,0.01)', border:'1px dashed #0f1f35', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span style=${{ fontSize:8, color:'#0f1f35' }}>—</span>
                  </div>
                `).slice(0, 6)
              }
              ${rackCapacity - totalRU > 6 && html`<div style=${{ padding:'4px 10px', fontSize:8, color:'#1e3a5f', textAlign:'center' }}>+ ${rackCapacity - totalRU - 6} more empty slots</div>`}
              ${rackItems.length === 0 && html`
                <div style=${{ height:150, display:'flex', alignItems:'center', justifyContent:'center', color:'#1e3a5f', fontSize:11 }}>No rack-mountable devices on canvas</div>
              `}
            </div>
            <!-- right rail -->
            <div style=${{ width: RACK_PAD, background:'linear-gradient(270deg,#0d1b2e,#1e293b)', borderLeft:'2px solid #1e3a5f' }}></div>
          </div>
          <!-- base panel -->
          <div style=${{ background:'linear-gradient(90deg,#1e293b,#0f172a,#1e293b)', padding:'8px 16px', borderTop:'2px solid #1e3a5f', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style=${{ fontSize:9, color:'#334155' }}>PIXELOGIC — AV SCHEMATICS</div>
            <div style=${{ fontSize:9, color:'#334155' }}>${connections.length} cables patched</div>
          </div>
        </div>

        <!-- Right side panels -->
        <div style=${{ display:'flex', flexDirection:'column', gap:16, minWidth:340 }}>
          <!-- Rack summary -->
          <div style=${{ background:'#071323', border:'1px solid #1e3a5f', borderRadius:8, overflow:'hidden' }}>
            <div style=${{ padding:'10px 14px', background:'#0b1629', borderBottom:'1px solid #1e3a5f', fontSize:11, fontWeight:700, color:'#94a3b8', letterSpacing:'0.08em' }}>RACK SUMMARY</div>
            <div style=${{ padding:'12px 14px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <div style=${{ background:'#0a1a30', borderRadius:6, padding:'8px 10px', textAlign:'center' }}>
                <div style=${{ fontSize:18, fontWeight:800, color:'#60a5fa' }}>${totalRU}U</div>
                <div style=${{ fontSize:8, color:'#475569', marginTop:2 }}>of ${rackCapacity}U used</div>
              </div>
              <div style=${{ background:'#0a1a30', borderRadius:6, padding:'8px 10px', textAlign:'center' }}>
                <div style=${{ fontSize:18, fontWeight:800, color: totalPower > 3000 ? '#ef4444' : totalPower > 2000 ? '#f59e0b' : '#22c55e' }}>${totalPower}W</div>
                <div style=${{ fontSize:8, color:'#475569', marginTop:2 }}>Total Power</div>
              </div>
              <div style=${{ background:'#0a1a30', borderRadius:6, padding:'8px 10px', textAlign:'center' }}>
                <div style=${{ fontSize:18, fontWeight:800, color:'#a78bfa' }}>${totalWeight.toFixed(1)}<span style=${{ fontSize:10 }}>kg</span></div>
                <div style=${{ fontSize:8, color:'#475569', marginTop:2 }}>Total Weight</div>
              </div>
              <div style=${{ background:'#0a1a30', borderRadius:6, padding:'8px 10px', textAlign:'center' }}>
                <div style=${{ fontSize:18, fontWeight:800, color:'#94a3b8' }}>${rackItems.length}</div>
                <div style=${{ fontSize:8, color:'#475569', marginTop:2 }}>Devices</div>
              </div>
            </div>
            <!-- Utilization bar -->
            <div style=${{ padding:'4px 14px 12px' }}>
              <div style=${{ background:'#0a1a30', borderRadius:4, height:8, overflow:'hidden' }}>
                <div style=${{ width: Math.min(100, (totalRU / rackCapacity) * 100) + '%', height:'100%', background: (totalRU / rackCapacity) > 0.85 ? '#ef4444' : (totalRU / rackCapacity) > 0.65 ? '#f59e0b' : '#22c55e', borderRadius:4, transition:'width 0.3s' }}></div>
              </div>
              <div style=${{ fontSize:8, color:'#475569', marginTop:3, textAlign:'right' }}>${Math.round((totalRU / rackCapacity) * 100)}% capacity</div>
            </div>
          </div>

          ${/* Floor items (projectors) */
            floorItems.length > 0 && html`
            <div style=${{ background:'#071323', border:'1px solid #1e3a5f', borderRadius:8, overflow:'hidden' }}>
              <div style=${{ padding:'10px 14px', background:'#0b1629', borderBottom:'1px solid #1e3a5f', fontSize:11, fontWeight:700, color:'#94a3b8', letterSpacing:'0.08em' }}>FLOOR / MOUNTED (Non-Rack)</div>
              ${floorItems.map(node => {
                const dev = getDevice(node.deviceId);
                const cat = CAT[dev?.category||'custom'] || CAT.custom;
                const nodeConns = connections.filter(c => c.fromNodeId === node.id || c.toNodeId === node.id);
                return html`
                  <div key=${node.id} style=${{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                    <span style=${{ fontSize:13 }}>${cat.icon}</span>
                    <div style=${{ flex:1, minWidth:0 }}>
                      <div style=${{ fontSize:9, color:'rgba(255,255,255,0.45)' }}>${dev?.brand}</div>
                      <div style=${{ fontSize:11, fontWeight:700, color:'#e2e8f0' }}>${node.label || dev?.model}</div>
                    </div>
                    ${dev?.properties?.lumens ? html`<span style=${{ fontSize:8, color:'#b45309' }}>${dev.properties.lumens}</span>` : ''}
                    ${nodeConns.length > 0 && html`<div style=${{ background:'#1d4ed8', borderRadius:10, padding:'1px 6px', fontSize:9, color:'#fff', fontWeight:700 }}>${nodeConns.length}</div>`}
                  </div>
                `;
              })}
            </div>
          `}

          <!-- Patch list panel -->
          <div style=${{ background:'#071323', border:'1px solid #1e3a5f', borderRadius:8, overflow:'hidden' }}>
            <div style=${{ padding:'10px 14px', background:'#0b1629', borderBottom:'1px solid #1e3a5f', fontSize:11, fontWeight:700, color:'#94a3b8', letterSpacing:'0.08em' }}>PATCH LIST</div>
            ${connections.length === 0 && html`<div style=${{ padding:'20px', fontSize:11, color:'#334155', textAlign:'center' }}>No connections yet</div>`}
            ${connections.map((c, i) => {
              const fNode = nodes.find(n => n.id === c.fromNodeId);
              const tNode = nodes.find(n => n.id === c.toNodeId);
              const fDev = fNode ? getDevice(fNode.deviceId) : null;
              const tDev = tNode ? getDevice(tNode.deviceId) : null;
              const fPort = fDev ? (fDev.outputs||[]).find(p => p.id === c.fromPortId) : null;
              const tPort = tDev ? (tDev.inputs||[]).find(p => p.id === c.toPortId) : null;
              const sigInfo = SIG[fPort?.type] || SIG.CUSTOM;
              const label = c.cableLabel || `C${String(i+1).padStart(2,'0')}`;
              return html`
                <div key=${c.id} style=${{ display:'flex', alignItems:'center', gap:8, padding:'6px 14px', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                  <span style=${{ fontSize:9, fontWeight:700, color: c.valid ? sigInfo.color : '#ef4444', fontFamily:'monospace', minWidth:28 }}>${label}</span>
                  <span style=${{ width:8, height:8, borderRadius:'50%', background: sigInfo.color, display:'inline-block', flexShrink:0 }}></span>
                  <div style=${{ flex:1, minWidth:0, fontSize:10, color:'#94a3b8' }}>
                    <span style=${{ color:'#cbd5e1' }}>${fDev?.model||'?'}</span>
                    <span style=${{ color:'#475569' }}> ${fPort?.label||''} → </span>
                    <span style=${{ color:'#cbd5e1' }}>${tDev?.model||'?'}</span>
                    <span style=${{ color:'#475569' }}> ${tPort?.label||''}</span>
                  </div>
                  ${!c.valid && html`<span style=${{ fontSize:9, color:'#ef4444' }}>✗</span>`}
                  ${c.valid && c.msg && html`<span style=${{ fontSize:9, color:'#f59e0b' }}>⚠</span>`}
                </div>
              `;
            })}
          </div>
        </div>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // LEFT SIDEBAR — Device Catalog
  // ─────────────────────────────────────────────────────────────
  function DeviceSidebar({ customTypes, customDevices, onAddNode, onAddCustomType, onAddCustomDevice, onDeleteCustomDevice, onShowProjects, onShowTemplates, onClearAll, onExportPNG, onExportPDF, onExportPDFLight, onExportCSV, onImportCSV, authorInfo, onAuthorInfoChange }) {
    const [search, setSearch] = useState('');
    const [expandedCat, setExpandedCat] = useState({ media_server:true, switcher:false, projector:false, matrix:false, ledprocessor:false, ledwall:false, converter:false, custom:false });
    const [expandedBrand, setExpandedBrand] = useState({});
    const [showDocInfo, setShowDocInfo] = useState(false);

    const allDevices = useMemo(() => [...DEVICES, ...(customDevices || [])], [customDevices]);

    const filtered = useMemo(() => {
      const q = search.toLowerCase();
      if (!q) return allDevices;
      return allDevices.filter(d => (d.brand+' '+d.model+' '+d.category).toLowerCase().includes(q));
    }, [search, allDevices]);

    // grouped[cat][brand] = [devices]
    const grouped = useMemo(() => {
      const g = {};
      filtered.forEach(d => {
        if (!g[d.category]) g[d.category] = {};
        if (!g[d.category][d.brand]) g[d.category][d.brand] = [];
        g[d.category][d.brand].push(d);
      });
      return g;
    }, [filtered]);

    function toggleBrand(catKey, brand) {
      const key = `${catKey}::${brand}`;
      setExpandedBrand(p => ({ ...p, [key]: !p[key] }));
    }

    return html`
      <div style=${{ width:234, flexShrink:0, background:'linear-gradient(180deg,#0d1b2e 0%,#060f1e 100%)', borderRight:'1px solid #1e3a5f', display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
        <!-- Header -->
        <div style=${{ padding:'14px 12px 8px', borderBottom:'1px solid #1e3a5f' }}>
          <div style=${{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style=${{ fontSize:13, fontWeight:800, color:'#f1f5f9', letterSpacing:'-0.4px' }}>AV Schematics</div>
              <div style=${{ fontSize:9, color:'#334155', marginTop:1, letterSpacing:'0.05em' }}>Signal Chain Builder</div>
            </div>
            <button
              onClick=${onShowTemplates}
              title="Load a template"
              style=${{ background:'#0f2744', border:'1px solid #1e3a5f', color:'#93c5fd', borderRadius:6, padding:'4px 8px', cursor:'pointer', fontSize:10, fontWeight:600 }}
            >📋 Templates</button>
          </div>
          <!-- Search -->
          <input
            placeholder="Search devices…"
            value=${search}
            onInput=${(e) => setSearch(e.target.value)}
            style=${{ marginTop:8, width:'100%', background:'#0b1629', border:'1px solid #1e3a5f', borderRadius:6, color:'#f1f5f9', padding:'5px 8px', fontSize:11, boxSizing:'border-box', outline:'none' }}
          />
        </div>

        <!-- Device list -->
        <div style=${{ flex:1, overflowY:'auto', padding:'4px 0' }}>
          ${Object.entries(CAT).map(([catKey, catInfo]) => {
            const catBrands = grouped[catKey] || {};
            const totalItems = Object.values(catBrands).reduce((s, arr) => s + arr.length, 0);
            if (!totalItems && search) return null;
            const isOpen = expandedCat[catKey];
            return html`
              <div key=${catKey} style=${{ borderBottom:'1px solid rgba(30,58,95,0.4)' }}>
                <!-- Category header -->
                <div
                  onClick=${() => setExpandedCat(p => ({...p, [catKey]: !p[catKey]}))}
                  style=${{ display:'flex', alignItems:'center', gap:6, padding:'6px 10px', cursor:'pointer', userSelect:'none', background: isOpen ? 'rgba(30,58,95,0.2)' : 'transparent' }}
                >
                  <span style=${{ fontSize:13 }}>${catInfo.icon}</span>
                  <span style=${{ fontSize:9, fontWeight:800, color: isOpen ? catInfo.color : '#4b6076', letterSpacing:'0.1em', flex:1, textTransform:'uppercase' }}>${catInfo.label}</span>
                  <span style=${{ fontSize:9, color:'#334155', fontWeight:700 }}>${totalItems}</span>
                  <span style=${{ fontSize:9, color:'#334155', marginLeft:2 }}>${isOpen ? '▲' : '▼'}</span>
                </div>
                <!-- Brand sub-groups -->
                ${isOpen && Object.entries(catBrands).map(([brand, devs]) => {
                  const bKey = `${catKey}::${brand}`;
                  const bOpen = expandedBrand[bKey] !== false; // default open
                  return html`
                    <div key=${brand}>
                      <!-- Brand row -->
                      <div
                        onClick=${() => toggleBrand(catKey, brand)}
                        style=${{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px 4px 24px', cursor:'pointer', userSelect:'none', background:'rgba(0,0,0,0.18)' }}
                      >
                        <div style=${{ width:5, height:5, borderRadius:'50%', background: catInfo.color, opacity:0.7, flexShrink:0 }}></div>
                        <span style=${{ fontSize:9, fontWeight:700, color:'#64748b', flex:1, letterSpacing:'0.04em' }}>${brand.toUpperCase()}</span>
                        <span style=${{ fontSize:8, color:'#334155' }}>${bOpen ? '▲' : '▼'}</span>
                      </div>
                      <!-- Device rows -->
                      ${bOpen && devs.map(d => html`
                        <div
                          key=${d.id}
                          title="${d.brand} ${d.model} — click to add"
                          style=${{ padding:'4px 10px 4px 34px', cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}
                          onMouseEnter=${(e) => { e.currentTarget.style.background='rgba(29,78,216,0.15)'; e.currentTarget.style.borderLeft=`3px solid ${catInfo.color}`; }}
                          onMouseLeave=${(e) => { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderLeft='3px solid transparent'; }}
                          onClick=${() => onAddNode(d.id)}
                        >
                          <div style=${{ minWidth:0, flex:1 }}>
                            <div style=${{ fontSize:10, color:'#94a3b8', lineHeight:1.3, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>
                              ${d.model}
                              ${d._custom && html`<span style=${{ fontSize:8, color:'#4b5563', marginLeft:4, background:'#0f172a', border:'1px solid #334155', borderRadius:3, padding:'0 3px' }}>CUSTOM</span>`}
                            </div>
                            <div style=${{ display:'flex', gap:3, marginTop:2, flexWrap:'wrap' }}>
                              ${(d.outputs||[]).slice(0,4).map(p => html`
                                <span key=${p.id} title=${p.type} style=${{ width:6, height:6, borderRadius:1, background: SIG[p.type]?.color||'#334155', display:'inline-block' }}></span>
                              `)}
                              ${(d.outputs||[]).length > 4 && html`<span style=${{ fontSize:7, color:'#334155' }}>+${(d.outputs||[]).length-4}</span>`}
                            </div>
                          </div>
                          ${d._custom && html`
                            <button
                              title="Delete custom device from catalog"
                              onClick=${(e) => { e.stopPropagation(); if (confirm('Remove "' + d.brand + ' ' + d.model + '" from catalog?')) onDeleteCustomDevice(d.id); }}
                              style=${{ background:'none', border:'none', color:'#475569', cursor:'pointer', fontSize:12, padding:'0 3px', lineHeight:1, flexShrink:0 }}
                              onMouseEnter=${(e) => { e.stopPropagation(); e.currentTarget.style.color='#f87171'; }}
                              onMouseLeave=${(e) => { e.currentTarget.style.color='#475569'; }}
                            >✕</button>
                          `}
                          <span style=${{ fontSize:16, color: catInfo.color, fontWeight:700, flexShrink:0, opacity:0.8 }}>+</span>
                        </div>
                      `)}
                    </div>
                  `;
                })}
              </div>
            `;
          })}
        </div>

        <!-- Signal legend + Document Info + Footer (scrollable bottom section) -->
        <div style=${{ flexShrink:0, maxHeight:'50%', overflowY:'auto', borderTop:'1px solid #1e3a5f' }}>

        <!-- Signal legend -->
        <div style=${{ padding:'7px 10px', borderBottom:'1px solid #1e3a5f' }}>
          <div style=${{ fontSize:8, color:'#334155', fontWeight:700, letterSpacing:'0.08em', marginBottom:4 }}>SIGNAL TYPES</div>
          <div style=${{ display:'flex', flexWrap:'wrap', gap:'3px 7px' }}>
            ${Object.entries(SIG).filter(([k])=>k!=='CUSTOM').map(([k,v]) => html`
              <div key=${k} style=${{ display:'flex', alignItems:'center', gap:3 }}>
                <span style=${{ width:7, height:7, borderRadius:'50%', background:v.color, display:'inline-block' }}></span>
                <span style=${{ fontSize:8, color:'#475569' }}>${v.label}</span>
              </div>
            `)}
          </div>
          <button
            onClick=${onAddCustomType}
            style=${{ marginTop:5, width:'100%', background:'#0f172a', border:'1px dashed #1e3a5f', color:'#475569', borderRadius:4, padding:'3px 0', cursor:'pointer', fontSize:9 }}
          >+ Custom Signal Type</button>
        </div>

        <!-- Document Info (Author) -->
        <div style=${{ borderTop:'1px solid #1e3a5f' }}>
          <div onClick=${() => setShowDocInfo(!showDocInfo)}
            style=${{ padding:'8px 10px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', background:'linear-gradient(90deg,#0a1a30,#0d1f38)', borderBottom: showDocInfo ? '1px solid #1e3a5f' : 'none' }}>
            <span style=${{ fontSize:9, color:'#7dd3fc', fontWeight:700, letterSpacing:'0.06em', display:'flex', alignItems:'center', gap:5 }}>📝 DOCUMENT INFO</span>
            <span style=${{ fontSize:10, color:'#7dd3fc' }}>${showDocInfo ? '▾' : '▸'}</span>
          </div>
          ${showDocInfo && html`
            <div style=${{ padding:'6px 10px 10px', display:'flex', flexDirection:'column', gap:5, background:'#0a1628' }}>
              ${[
                { key:'projectName', label:'Project Name', placeholder:'e.g. Main Stage 2026' },
                { key:'name',        label:'Created By',   placeholder:'Your name' },
                { key:'company',     label:'Company',      placeholder:'Company name' },
                { key:'email',       label:'Email',        placeholder:'email@example.com' },
              ].map(f => html`
                <div key=${f.key}>
                  <div style=${{ fontSize:8, color:'#7ca0c9', marginBottom:2, fontWeight:600 }}>${f.label}</div>
                  <input value=${authorInfo[f.key] || ''} placeholder=${f.placeholder}
                    onInput=${e => onAuthorInfoChange({ ...authorInfo, [f.key]: e.target.value })}
                    style=${{ width:'100%', background:'#0b1629', border:'1px solid #2d5a8e', color:'#e0ecff', borderRadius:5, padding:'5px 8px', fontSize:10, outline:'none', boxSizing:'border-box' }} />
                </div>
              `)}
              <div style=${{ fontSize:8, color:'#4a6a8a', marginTop:2 }}>📅 Date is auto-filled at export time</div>
            </div>
          `}
        </div>

        <!-- Footer actions -->
        <div style=${{ padding:'7px 8px', display:'flex', flexDirection:'column', gap:4 }}>
          <button onClick=${onAddCustomDevice}
            style=${{ background:'linear-gradient(90deg,#1a2744,#0f2032)', border:'1px solid #2d5a8e', color:'#93c5fd', borderRadius:6, padding:'7px 0', cursor:'pointer', fontSize:11, fontWeight:600 }}>📦 Add Custom Device</button>
          <button onClick=${onShowProjects}
            style=${{ background:'linear-gradient(90deg,#1e3a5f,#163460)', border:'1px solid #2d5a8e', color:'#93c5fd', borderRadius:6, padding:'7px 0', cursor:'pointer', fontSize:11, fontWeight:600 }}>💾 Projects</button>
          <div style=${{ display:'flex', gap:3 }}>
            <button onClick=${onExportPNG}  style=${{ flex:1, background:'#0b1629', border:'1px solid #1e3a5f', color:'#7dd3fc', borderRadius:5, padding:'5px 0', cursor:'pointer', fontSize:9, fontWeight:600 }}>PNG</button>
            <button onClick=${onExportPDF}  style=${{ flex:1, background:'#0b1629', border:'1px solid #1e3a5f', color:'#7dd3fc', borderRadius:5, padding:'5px 0', cursor:'pointer', fontSize:9, fontWeight:600 }} title="PDF Dark Mode">PDF 🌙</button>
            <button onClick=${onExportPDFLight}  style=${{ flex:1, background:'#e8ecf2', border:'1px solid #b0bfd0', color:'#1e3a5f', borderRadius:5, padding:'5px 0', cursor:'pointer', fontSize:9, fontWeight:600 }} title="PDF Light Mode">PDF ☀</button>
            <button onClick=${onExportCSV}  style=${{ flex:1, background:'#0b1629', border:'1px solid #1e3a5f', color:'#7dd3fc', borderRadius:5, padding:'5px 0', cursor:'pointer', fontSize:9, fontWeight:600 }}>CSV</button>
          </div>
          <button onClick=${onImportCSV}
            style=${{ background:'#0b1629', border:'1px solid #1e3a5f', color:'#7dd3fc', borderRadius:6, padding:'5px 0', cursor:'pointer', fontSize:9, fontWeight:600 }}>📥 Import CSV</button>
          <button onClick=${onClearAll}
            style=${{ background:'#1c0a0a', border:'1px solid #4a1919', color:'#fca5a5', borderRadius:6, padding:'5px 0', cursor:'pointer', fontSize:9 }}>🗑 Clear Canvas</button>
        </div>
        </div>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // TEXT BOX
  // ─────────────────────────────────────────────────────────────
  const TB_FONTS = [
    { label: 'Sans',    value: "Inter,'Segoe UI',sans-serif" },
    { label: 'Mono',    value: "'Courier New',monospace" },
    { label: 'Serif',   value: "Georgia,serif" },
    { label: 'Display', value: "Impact,'Arial Black',sans-serif" },
  ];
  const TB_SIZES = [8,9,10,11,12,13,14,16,18,20,22,24,28,32,36,42,48,56,64];

  function TextBox({ box, selected, viewport, onSelect, onDelete, onUpdate }) {
    const [editing, setEditing] = _R.useState(false);
    const textareaRef = useRef(null);
    const fontSize   = box.fontSize   || 13;
    const fontFamily = box.fontFamily || TB_FONTS[0].value;

    function startDrag(e) {
      if (editing) return;
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT') return;
      e.stopPropagation();
      e.preventDefault();
      onSelect(box.id);
      const startMX = e.clientX, startMY = e.clientY;
      const startX = box.x, startY = box.y;
      let moved = false;
      function onMove(ev) {
        moved = true;
        const dx = (ev.clientX - startMX) / (viewport.scale || 1);
        const dy = (ev.clientY - startMY) / (viewport.scale || 1);
        onUpdate(box.id, { x: startX + dx, y: startY + dy });
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    }

    function enterEdit(e) {
      e.stopPropagation();
      setEditing(true);
      setTimeout(() => { try { textareaRef.current && textareaRef.current.focus(); } catch(_){} }, 20);
    }

    function commitEdit() {
      setEditing(false);
      if (textareaRef.current) onUpdate(box.id, { text: textareaRef.current.value });
    }

    return html`
      <div
        style=${{ position:'absolute', left:box.x, top:box.y, minWidth:140,
          display:'flex', flexDirection:'column', zIndex: selected ? 20 : 8 }}
        onMouseDown=${startDrag}
        onDblClick=${enterEdit}
      >
        <!-- Toolbar (shown when selected) -->
        ${selected && html`
          <div
            style=${{ display:'flex', gap:4, marginBottom:3, alignItems:'center',
              background:'#071828', border:'1px solid #1e4a7a', borderRadius:5,
              padding:'3px 6px', boxShadow:'0 2px 8px #00000077', flexShrink:0 }}
            onMouseDown=${(e) => e.stopPropagation()}
          >
            <!-- Font family -->
            <select
              value=${fontFamily}
              onChange=${(e) => { e.stopPropagation(); onUpdate(box.id, { fontFamily: e.target.value }); }}
              style=${{ background:'#0a1e38', border:'1px solid #1e3a5f', color:'#93c5fd', fontSize:9,
                borderRadius:3, padding:'1px 3px', cursor:'pointer', maxWidth:68 }}
            >
              ${TB_FONTS.map(f => html`<option value=${f.value}>${f.label}</option>`)}
            </select>
            <!-- Font size -->
            <select
              value=${fontSize}
              onChange=${(e) => { e.stopPropagation(); onUpdate(box.id, { fontSize: parseInt(e.target.value) }); }}
              style=${{ background:'#0a1e38', border:'1px solid #1e3a5f', color:'#93c5fd', fontSize:9,
                borderRadius:3, padding:'1px 3px', cursor:'pointer', width:46 }}
            >
              ${TB_SIZES.map(s => html`<option value=${s}>${s}px</option>`)}
            </select>
            <span style=${{ flex:1 }}></span>
            <!-- Edit button -->
            ${!editing && html`<button
              onClick=${(e) => { e.stopPropagation(); enterEdit(e); }}
              style=${{ background:'#0f3460', border:'1px solid #1e4a7a', color:'#7dd3fc', borderRadius:3,
                padding:'1px 6px', cursor:'pointer', fontSize:9, fontWeight:700 }}
            >Edit</button>`}
            <!-- Delete -->
            <button
              onClick=${(e) => { e.stopPropagation(); onDelete(box.id); }}
              style=${{ background:'#3b0a0a', border:'1px solid #7f1d1d', color:'#fca5a5', borderRadius:3,
                padding:'1px 5px', cursor:'pointer', fontSize:9, fontWeight:700 }}
            >✕</button>
          </div>
        `}
        <!-- Box body -->
        <div
          style=${{ background:'rgba(4,14,34,0.88)',
            border: selected ? '1.5px solid #60a5fa' : '1.5px solid #1e4a7a',
            borderRadius:7, padding:'8px 12px',
            cursor: editing ? 'text' : 'grab',
            color:'#e2e8f0', fontSize:fontSize, fontFamily:fontFamily,
            boxShadow: selected ? '0 0 0 2px rgba(96,165,250,0.22)' : '0 2px 10px #00000055',
            backdropFilter:'blur(2px)', whiteSpace:'pre-wrap', wordBreak:'break-word',
            minHeight:36, lineHeight:'1.5',
          }}
        >
          ${editing
            ? html`<textarea
                ref=${textareaRef}
                defaultValue=${box.text || ''}
                onBlur=${commitEdit}
                onKeyDown=${(e) => { e.stopPropagation(); if (e.key === 'Escape') commitEdit(); }}
                onMouseDown=${(e) => e.stopPropagation()}
                onClick=${(e) => e.stopPropagation()}
                style=${{ background:'transparent', border:'none', outline:'none', color:'#e2e8f0',
                  fontSize:fontSize, fontFamily:fontFamily, resize:'both',
                  minWidth:100, minHeight:28, width:'100%', padding:0, lineHeight:'1.5',
                  display:'block' }}
              />`
            : html`<span>${box.text || html`<span style=${{ color:'#334155', fontStyle:'italic', fontSize: Math.min(fontSize, 12) }}>Double-click to edit</span>`}</span>`
          }
        </div>
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // RIGHT PANEL
  // ─────────────────────────────────────────────────────────────
  function RightPanel({ mode, selectedNode, selectedConn, nodes, connections, nodeOverrides, viewport, textBoxes, rackOrder, onClose, onLabelChange, onUpgradeDevice, onDeleteConn, onRenameConn, onUpdateConn, onLoadProject, onConfigurePorts, onAddMidpointWaypoint }) {
    if (mode === 'project') {
      return html`
        <div style=${{ width:260, flexShrink:0, background:'#071323', borderLeft:'1px solid #1e3a5f', overflowY:'auto', height:'100%' }}>
          <${ProjectPanel}
            currentNodes=${nodes}
            currentConns=${connections}
            viewport=${viewport}
            textBoxes=${textBoxes}
            rackOrder=${rackOrder}
            onLoad=${onLoadProject}
            onClose=${onClose}
          />
        </div>
      `;
    }
    if (mode === 'conn' && selectedConn) {
      const fNode = nodes.find(n => n.id === selectedConn.fromNodeId);
      const tNode = nodes.find(n => n.id === selectedConn.toNodeId);
      // Use resolveNodePorts so overridden labels/types are reflected in the inspector
      const { outputs: fOuts } = fNode ? resolveNodePorts(fNode, nodeOverrides) : { outputs: [] };
      const { inputs:  tIns  } = tNode ? resolveNodePorts(tNode, nodeOverrides) : { inputs:  [] };
      const fPort = fOuts.find(p => p.id === selectedConn.fromPortId);
      const tPort = tIns.find(p => p.id === selectedConn.toPortId);
      const fDev  = fNode ? getDevice(fNode.deviceId) : null;
      const tDev  = tNode ? getDevice(tNode.deviceId) : null;
      const sigColor = SIG[fPort?.type]?.color || '#64748b';
      return html`
        <div style=${{ width:260, flexShrink:0, background:'#071323', borderLeft:'1px solid #1e3a5f', overflowY:'auto', height:'100%', padding:14, display:'flex', flexDirection:'column', gap:10 }}>
          <div style=${{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style=${{ fontSize:13, fontWeight:700, color:'#f1f5f9' }}>⚡ Connection</span>
            <button onClick=${onClose} style=${{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:18 }}>×</button>
          </div>
          <!-- Cable ID — editable -->
          <div style=${{ display:'flex', flexDirection:'column', gap:4 }}> 
            <label style=${{ fontSize:10, color:'#64748b', fontWeight:600, letterSpacing:'0.06em' }}>CABLE ID</label>
            <input
              value=${selectedConn.cableLabel || ''}
              onInput=${e => onRenameConn(selectedConn.id, e.target.value)}
              placeholder="e.g. V01"
              style=${{ background:'#0f172a', border:'1px solid #334155', borderRadius:5,
                         color:'#f1f5f9', fontSize:12, fontWeight:700,
                         fontFamily:"'Courier New',monospace", padding:'6px 8px',
                         width:'100%', boxSizing:'border-box', outline:'none' }}
            />
          </div>

          <!-- SIGNAL DIRECTION -->
          <div style=${{ display:'flex', flexDirection:'column', gap:4 }}>
            <label style=${{ fontSize:10, color:'#64748b', fontWeight:600, letterSpacing:'0.06em' }}>SIGNAL DIRECTION</label>
            <div style=${{ display:'flex', border:'1px solid #1e3a5f', borderRadius:6, overflow:'hidden' }}>
              ${['fwd','bidi','bwd'].map(dir => html`
                <button key=${dir}
                  onClick=${() => onUpdateConn(selectedConn.id, { direction: dir })}
                  style=${{ flex:1, background:(selectedConn.direction||'fwd')===dir ? 'linear-gradient(160deg,#1d4ed8,#1e40af)' : '#0a1628',
                    border:'none', borderRight: dir!=='bwd' ? '1px solid #1e3a5f' : 'none',
                    color:(selectedConn.direction||'fwd')===dir ? '#fff' : '#64748b',
                    padding:'6px 0', cursor:'pointer', fontSize:12, fontWeight:700, letterSpacing:'0.02em' }}
                >${dir==='fwd' ? '→' : dir==='bidi' ? '↔' : '←'}</button>
              `)}
            </div>
            <div style=${{ fontSize:9, color:'#334155', textAlign:'center' }}>
              ${(selectedConn.direction||'fwd')==='fwd' ? 'Output → Input (default)' : (selectedConn.direction||'fwd')==='bidi' ? 'Bidirectional signal' : 'Input → Output (return)'}
            </div>
          </div>

          <!-- LABEL FONT SIZE -->
          <div style=${{ display:'flex', flexDirection:'column', gap:4 }}>
            <label style=${{ fontSize:10, color:'#64748b', fontWeight:600, letterSpacing:'0.06em' }}>LABEL SIZE</label>
            <div style=${{ display:'flex', alignItems:'center', gap:4 }}>
              <button onClick=${() => onUpdateConn(selectedConn.id, { cableLabelSize: Math.max(7, (selectedConn.cableLabelSize||9)-1) })}
                style=${{ background:'#0a1628', border:'1px solid #1e3a5f', color:'#94a3b8', borderRadius:4, width:28, height:28, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>−</button>
              <span style=${{ flex:1, textAlign:'center', fontSize:14, fontWeight:700, color:'#f1f5f9', fontFamily:'monospace', background:'#0a1628', border:'1px solid #1e3a5f', borderRadius:4, padding:'4px 0' }}>${selectedConn.cableLabelSize||9}px</span>
              <button onClick=${() => onUpdateConn(selectedConn.id, { cableLabelSize: Math.min(22, (selectedConn.cableLabelSize||9)+1) })}
                style=${{ background:'#0a1628', border:'1px solid #1e3a5f', color:'#94a3b8', borderRadius:4, width:28, height:28, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>+</button>
            </div>
          </div>

          <!-- WIRE ROUTING HINTS -->
          <div style=${{ display:'flex', flexDirection:'column', gap:6 }}>
            <label style=${{ fontSize:10, color:'#64748b', fontWeight:600, letterSpacing:'0.06em' }}>WIRE ROUTING</label>
            <button
              onClick=${() => onAddMidpointWaypoint && onAddMidpointWaypoint(selectedConn.id)}
              style=${{ background:'linear-gradient(160deg,#1d4ed8,#1e40af)', border:'none', color:'#fff', borderRadius:6, padding:'8px 0', cursor:'pointer', fontSize:12, fontWeight:700, letterSpacing:'0.03em', width:'100%' }}
            >+ Add Route Point</button>
            <div style=${{ fontSize:9, color:'#475569', lineHeight:1.85, padding:'5px 7px', background:'#0a1628', borderRadius:6, border:'1px solid #1e3a5f' }}>
              <span style=${{ color:'#60a5fa', opacity:0.95 }}>Click wire</span><span style=${{ opacity:0.85 }}> → open this panel</span><br/>
              <span style=${{ color:'#60a5fa', opacity:0.95 }}>Right-click wire</span><span style=${{ opacity:0.85 }}> → Add / Remove point</span><br/>
              <span style=${{ opacity:0.85 }}>Double-click wire → Add point</span><br/>
              <span style=${{ opacity:0.85 }}>Drag ● to move  •  Double-click ● to delete</span>
            </div>
            ${(selectedConn.waypoints||[]).length > 0 && html`
              <button
                onClick=${() => onUpdateConn(selectedConn.id, { waypoints: [] })}
                style=${{ background:'#0a1628', border:'1px solid #1e3a5f', color:'#94a3b8', borderRadius:6, padding:'6px 0', cursor:'pointer', fontSize:11, fontWeight:600 }}
              >↺ Reset to Auto-Route</button>
            `}
          </div>

          <div style=${{ background:'#0f172a', borderRadius:6, border:'1px solid #1e2d40', padding:10 }}>
            <div style=${{ fontSize:10, color:'#64748b', marginBottom:4 }}>FROM</div>
            <div style=${{ fontSize:12, color:'#f1f5f9', fontWeight:600 }}>${fDev?.brand} ${fDev?.model}</div>
            <div style=${{ fontSize:11, color:'#94a3b8' }}>${fPort?.label || selectedConn.fromPortId}</div>
          </div>
          <div style=${{ display:'flex', justifyContent:'center' }}>
            <div style=${{ width:2, height:20, background: sigColor }}></div>
          </div>
          <div style=${{ background:'#0f172a', borderRadius:6, border:'1px solid #1e2d40', padding:10 }}>
            <div style=${{ fontSize:10, color:'#64748b', marginBottom:4 }}>TO</div>
            <div style=${{ fontSize:12, color:'#f1f5f9', fontWeight:600 }}>${tDev?.brand} ${tDev?.model}</div>
            <div style=${{ fontSize:11, color:'#94a3b8' }}>${tPort?.label || selectedConn.toPortId}</div>
          </div>
          <div style=${{ background: selectedConn.valid ? '#052e16' : '#1c0a0a', borderRadius:6, border:`1px solid ${selectedConn.valid?'#166534':'#7f1d1d'}`, padding:'8px 10px' }}>
            <div style=${{ fontSize:11, color: selectedConn.valid ? '#22c55e' : '#f87171', fontWeight:600 }}>
              ${selectedConn.valid ? '✓ Valid connection' : '✗ Incompatible types'}
            </div>
            ${selectedConn.msg && html`<div style=${{ fontSize:10, color:'#fbbf24', marginTop:3 }}>${selectedConn.msg}</div>`}
          </div>
          <button onClick=${() => onDeleteConn(selectedConn.id)}
            style=${{ background:'#1c0a0a', border:'1px solid #7f1d1d', color:'#fca5a5', borderRadius:6, padding:'7px 0', cursor:'pointer', fontSize:11, fontWeight:600 }}>
            Remove Connection
          </button>
        </div>
      `;
    }
    if (mode === 'node' && selectedNode) {
      return html`
        <div style=${{ width:260, flexShrink:0, background:'#071323', borderLeft:'1px solid #1e3a5f', overflowY:'auto', height:'100%' }}>
          <${InspectorPanel}
            node=${selectedNode}
            allNodes=${nodes}
            connections=${connections}
            nodeOverrides=${nodeOverrides}
            onClose=${onClose}
            onLabelChange=${onLabelChange}
            onUpgradeDevice=${onUpgradeDevice}
            onConfigurePorts=${onConfigurePorts}
          />
        </div>
      `;
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────────
  // MAIN APP
  // ─────────────────────────────────────────────────────────────
  function App() {
    const [nodes,       setNodes]       = useState([]);
    const [connections, setConnections] = useState([]);
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [selectedConnId, setSelectedConnId] = useState(null);
    const [rightPanel, setRightPanel]   = useState(null); // 'node' | 'conn' | 'project'
    const [viewport,   setViewport]     = useState({ x:0, y:0, scale:1 });
    const [pendingConn, setPendingConn] = useState(null); // { nodeId, portId, isOutput, wx, wy }
    const [mousePos,   setMousePos]     = useState({ x:0, y:0 });
    const [showCustom, setShowCustom]   = useState(false);
    const [extraTypes,  setExtraTypes]  = useState({}); // user-defined signal types
    const [viewMode,   setViewMode]     = useState('schematic'); // 'schematic' | 'rack'
    const [showTemplates, setShowTemplates] = useState(false);
    const [nodeOverrides, setNodeOverrides] = useState({}); // { [nodeId]: { portTypes:{}, extraInputs:[], extraOutputs:[] } }
    const [portEditorNodeId, setPortEditorNodeId] = useState(null); // null = closed
    const [customDevices, setCustomDevices] = useState(() => {
      try { return JSON.parse(localStorage.getItem(CUSTOM_DEV_KEY) || '[]'); } catch { return []; }
    });
    const [showCustomDevice, setShowCustomDevice] = useState(false);
    const [textBoxes, setTextBoxes] = useState([]);
    const [selectedTbId, setSelectedTbId] = useState(null);
    const [rackOrder, setRackOrder] = useState([]);
    const [authorInfo, setAuthorInfo] = useState(() => {
      try { return JSON.parse(localStorage.getItem('avs_author_info') || '{}'); } catch { return {}; }
    });
    // Canvas settings
    const [canvasSettings, setCanvasSettings] = useState(() => {
      try { return { gridSize: 20, gridBrightness: 0.5, gridDots: true, snapToGrid: false, showMinimap: false, bgColor: '#030d1e', ...JSON.parse(localStorage.getItem('avs_canvas_settings') || '{}') }; }
      catch { return { gridSize: 20, gridBrightness: 0.5, gridDots: true, snapToGrid: false, showMinimap: false, bgColor: '#030d1e' }; }
    });
    const [showCanvasSettings, setShowCanvasSettings] = useState(false);
    const canvasRef   = useRef(null);
    const wrapRef     = useRef(null);

    // ── Undo / Redo history ───────────────────────────────────
    const historyRef  = useRef([]);   // past snapshots
    const futureRef   = useRef([]);   // redo stack
    const skipSnap    = useRef(false); // flag to skip snapshot when restoring
    const MAX_HISTORY = 60;

    // Latest-state refs so snapshot always captures current values
    const nodesRef      = useRef(nodes);       nodesRef.current = nodes;
    const connsRef      = useRef(connections);  connsRef.current = connections;
    const overridesRef  = useRef(nodeOverrides);overridesRef.current = nodeOverrides;
    const textBoxesRef  = useRef(textBoxes);    textBoxesRef.current = textBoxes;

    function snapshot() {
      return JSON.stringify({ n: nodesRef.current, c: connsRef.current, o: overridesRef.current, t: textBoxesRef.current });
    }

    function pushHistory() {
      if (skipSnap.current) { skipSnap.current = false; return; }
      const s = snapshot();
      const stack = historyRef.current;
      if (stack.length > 0 && stack[stack.length - 1] === s) return; // no change
      stack.push(s);
      if (stack.length > MAX_HISTORY) stack.splice(0, stack.length - MAX_HISTORY);
      futureRef.current = []; // new action clears redo
    }

    // Push initial snapshot once on mount
    useEffect(() => { historyRef.current = [snapshot()]; }, []);

    // Push snapshot whenever mutable state changes
    useEffect(() => { pushHistory(); }, [nodes, connections, nodeOverrides, textBoxes]);

    function undo() {
      const stack = historyRef.current;
      if (stack.length <= 1) return;                    // nothing to undo
      futureRef.current.push(stack.pop());              // move current to redo
      const prev = JSON.parse(stack[stack.length - 1]); // peek top
      skipSnap.current = true;
      setNodes(prev.n); setConnections(prev.c); setNodeOverrides(prev.o); setTextBoxes(prev.t);
    }

    function redo() {
      const future = futureRef.current;
      if (future.length === 0) return;
      const next = JSON.parse(future.pop());
      historyRef.current.push(JSON.stringify(next));
      skipSnap.current = true;
      setNodes(next.n); setConnections(next.c); setNodeOverrides(next.o); setTextBoxes(next.t);
    }

    // merge extra types into SIG at runtime
    useEffect(() => {
      Object.assign(SIG, extraTypes);
      Object.entries(extraTypes).forEach(([k]) => { if (!COMPAT[k]) COMPAT[k] = Object.keys(SIG); });
    }, [extraTypes]);

    // keep module-level lookup in sync with custom devices state
    useEffect(() => { _runtimeCustomDevices = customDevices; }, [customDevices]);

    // Persist canvas settings
    const updateCanvasSetting = (key, val) => {
      setCanvasSettings(prev => {
        const next = { ...prev, [key]: val };
        try { localStorage.setItem('avs_canvas_settings', JSON.stringify(next)); } catch {}
        return next;
      });
    };

    function saveCustomDevice(dev) {
      setCustomDevices(cds => {
        const next = [...cds, dev];
        try { localStorage.setItem(CUSTOM_DEV_KEY, JSON.stringify(next)); } catch {}
        return next;
      });
    }
    function deleteCustomDevice(devId) {
      setCustomDevices(cds => {
        const next = cds.filter(d => d.id !== devId);
        try { localStorage.setItem(CUSTOM_DEV_KEY, JSON.stringify(next)); } catch {}
        return next;
      });
    }

    // ── node actions ──────────────────────────────────────────
    function addNode(deviceId) {
      const dev = getDevice(deviceId);
      if (!dev) return;
      // stagger placement
      const offset = nodes.length * 20;
      const x = 80  - viewport.x / viewport.scale + offset;
      const y = 80  - viewport.y / viewport.scale + offset;
      setNodes(ns => [...ns, { id: uid(), deviceId, label: dev.model, position: { x, y } }]);
    }

    function deleteNode(nodeId) {
      setNodes(ns => ns.filter(n => n.id !== nodeId));
      setConnections(cs => cs.filter(c => c.fromNodeId !== nodeId && c.toNodeId !== nodeId));
      if (selectedNodeId === nodeId) { setSelectedNodeId(null); setRightPanel(null); }
    }

    function selectNode(nodeId) {
      setSelectedNodeId(nodeId);
      setSelectedConnId(null);
      setRightPanel('node');
    }

    function updateLabel(nodeId, label) {
      setNodes(ns => ns.map(n => n.id === nodeId ? {...n, label} : n));
    }

    function upgradeDevice(nodeId, newDeviceId) {
      setNodes(ns => ns.map(n => n.id === nodeId ? {...n, deviceId: newDeviceId, label: getDevice(newDeviceId)?.model || n.label} : n));
      // clear overrides — ports have changed
      setNodeOverrides(ov => { const next = {...ov}; delete next[nodeId]; return next; });
      // remove connections that no longer have valid ports after swap
      const newDev = getDevice(newDeviceId);
      const allNewPortIds = new Set([...(newDev?.inputs||[]), ...(newDev?.outputs||[])].map(p => p.id));
      setConnections(cs => cs.filter(c => {
        if (c.fromNodeId === nodeId && !allNewPortIds.has(c.fromPortId)) return false;
        if (c.toNodeId === nodeId   && !allNewPortIds.has(c.toPortId))   return false;
        return true;
      }));
    }

    function savePortOverrides(nodeId, overrides) {
      const newAllOverrides = { ...nodeOverrides, [nodeId]: overrides };
      setNodeOverrides(newAllOverrides);
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;
      const merged = resolveNodePorts(node, newAllOverrides);
      const validPortIds = new Set([...merged.inputs, ...merged.outputs].map(p => p.id));
      setConnections(cs => cs
        // drop connections whose ports were removed
        .filter(c => {
          if (c.fromNodeId === nodeId && !validPortIds.has(c.fromPortId)) return false;
          if (c.toNodeId   === nodeId && !validPortIds.has(c.toPortId))   return false;
          return true;
        })
        // re-validate connections whose types may have changed
        .map(c => {
          const touchesNode = c.fromNodeId === nodeId || c.toNodeId === nodeId;
          if (!touchesNode) return c;
          const fNode = nodes.find(n => n.id === c.fromNodeId);
          const tNode = nodes.find(n => n.id === c.toNodeId);
          const { outputs: fOuts } = fNode ? resolveNodePorts(fNode, newAllOverrides) : { outputs: [] };
          const { inputs:  tIns  } = tNode ? resolveNodePorts(tNode, newAllOverrides) : { inputs:  [] };
          const fPort = fOuts.find(p => p.id === c.fromPortId);
          const tPort = tIns.find(p => p.id === c.toPortId);
          const { ok, msg } = validateConn(fPort?.type, tPort?.type);
          return { ...c, valid: ok, msg };
        })
      );
    }

    function renameConn(connId, newLabel) {
      setConnections(cs => cs.map(c => c.id === connId ? { ...c, cableLabel: newLabel } : c));
    }

    function updateConn(connId, patch) {
      setConnections(cs => cs.map(c => c.id === connId ? { ...c, ...patch } : c));
    }

    function addMidpointWaypoint(connId) {
      const conn = connections.find(c => c.id === connId);
      if (!conn) return;
      const fNode = nodes.find(n => n.id === conn.fromNodeId);
      const tNode = nodes.find(n => n.id === conn.toNodeId);
      if (!fNode || !tNode) return;
      const { x: x1, y: y1 } = portCoords(fNode, conn.fromPortId, true, nodeOverrides);
      const { x: x2, y: y2 } = portCoords(tNode, conn.toPortId, false, nodeOverrides);
      const isManual = (conn.waypoints || []).length > 0;
      const segs = isManual
        ? manualSegs(x1, y1, x2, y2, conn.waypoints)
        : buildOrthoSegments(x1, y1, x2, y2, conn.lineOffX || 0, conn.lineOffY || 0);
      if (!segs || !segs.length) return;
      const midPt = pointAtT(segs, 0.5);
      // Always start from explicit waypoints only (empty array for auto-routed wires).
      // This ensures only 1 waypoint is added, not 3.
      const baseWps = [...(conn.waypoints || [])];
      // Find best insertion index in the segs array
      let bestIdx = baseWps.length, bestD = Infinity;
      segs.forEach((s, i) => {
        const d = Math.hypot(midPt.x - (s.ax+s.bx)/2, midPt.y - (s.ay+s.by)/2);
        if (d < bestD) { bestD = d; bestIdx = Math.min(i, baseWps.length); }
      });
      baseWps.splice(Math.max(0, Math.min(baseWps.length, bestIdx)), 0, midPt);
      updateConn(connId, { waypoints: baseWps });
    }

    function deleteConn(connId) {
      setConnections(cs => cs.filter(c => c.id !== connId));
      if (selectedConnId === connId) { setSelectedConnId(null); setRightPanel(null); }
    }

    // ── drag nodes ────────────────────────────────────────────
    const draggingRef = useRef(null); // { nodeId, startMX, startMY, startNX, startNY }

    function onNodeDragStart(e, nodeId) {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;
      selectNode(nodeId);
      draggingRef.current = {
        nodeId,
        startMX: e.clientX, startMY: e.clientY,
        startNX: node.position.x, startNY: node.position.y,
      };
      e.preventDefault();
    }

    // ── pan canvas ────────────────────────────────────────────
    const panRef = useRef(null); // { startMX, startMY, startVX, startVY }

    function onCanvasMouseDown(e) {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        panRef.current = { startMX: e.clientX, startMY: e.clientY, startVX: viewport.x, startVY: viewport.y };
        e.preventDefault();
      } else if (e.button === 0) {
        // deselect
        setSelectedNodeId(null);
        setSelectedConnId(null);
        setSelectedTbId(null);
        setRightPanel(null);
      }
    }

    function clientToCanvas(cx, cy) {
      const rect = wrapRef.current?.getBoundingClientRect() || { left:0, top:0 };
      return {
        x: (cx - rect.left - viewport.x) / viewport.scale,
        y: (cy - rect.top  - viewport.y) / viewport.scale,
      };
    }

    function onMouseMove(e) {
      const { x, y } = clientToCanvas(e.clientX, e.clientY);
      setMousePos({ x, y });

      if (draggingRef.current) {
        const { nodeId, startMX, startMY, startNX, startNY } = draggingRef.current;
        const dx = (e.clientX - startMX) / viewport.scale;
        const dy = (e.clientY - startMY) / viewport.scale;
        let nx = startNX + dx, ny = startNY + dy;
        if (canvasSettings.snapToGrid) {
          const g = canvasSettings.gridSize || 20;
          nx = Math.round(nx / g) * g;
          ny = Math.round(ny / g) * g;
        }
        setNodes(ns => ns.map(n => n.id === nodeId ? {...n, position:{ x: nx, y: ny }} : n));
      }

      if (panRef.current) {
        const dx = e.clientX - panRef.current.startMX;
        const dy = e.clientY - panRef.current.startMY;
        setViewport(v => ({ ...v, x: panRef.current.startVX + dx, y: panRef.current.startVY + dy }));
      }
    }

    function onMouseUp() {
      draggingRef.current = null;
      panRef.current = null;
      setPendingConn(null);
    }

    function onWheel(e) {
      e.preventDefault();
      const rect = wrapRef.current?.getBoundingClientRect() || { left:0, top:0 };
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setViewport(v => {
        const ns = Math.min(Math.max(v.scale * delta, 0.15), 4);
        const rx = mx - (mx - v.x) * (ns / v.scale);
        const ry = my - (my - v.y) * (ns / v.scale);
        return { x: rx, y: ry, scale: ns };
      });
    }

    function zoomBy(factor) {
      const container = wrapRef.current;
      const cx = container ? container.clientWidth  / 2 : 500;
      const cy = container ? container.clientHeight / 2 : 350;
      setViewport(v => {
        const ns = Math.min(Math.max(v.scale * factor, 0.15), 4);
        return { x: cx - (cx - v.x) * (ns / v.scale), y: cy - (cy - v.y) * (ns / v.scale), scale: ns };
      });
    }
    const zoomIn  = () => zoomBy(1.25);
    const zoomOut = () => zoomBy(0.8);

    function zoomActual() {
      const container = wrapRef.current;
      const cx = container ? container.clientWidth  / 2 : 500;
      const cy = container ? container.clientHeight / 2 : 350;
      setViewport(v => ({ x: cx - (cx - v.x) * (1 / v.scale), y: cy - (cy - v.y) * (1 / v.scale), scale: 1 }));
    }

    function fitAll() {
      if (nodes.length === 0) { setViewport({ x:40, y:40, scale:1 }); return; }
      const container = wrapRef.current;
      const cw = container ? container.clientWidth  : 900;
      const ch = container ? container.clientHeight : 600;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodes.forEach(n => {
        const { inputs, outputs } = resolveNodePorts(n, nodeOverrides);
        const rows = Math.max(inputs.length, outputs.length);
        const h = HDR + BODY_PAD + COL_HDR + rows * PH + 10;
        minX = Math.min(minX, n.position.x); minY = Math.min(minY, n.position.y);
        maxX = Math.max(maxX, n.position.x + NW); maxY = Math.max(maxY, n.position.y + h);
      });
      const pad = 80;
      const contentW = maxX - minX + pad * 2;
      const contentH = maxY - minY + pad * 2;
      const scale = Math.min(Math.max(Math.min(cw / contentW, ch / contentH), 0.15), 2);
      const x = (cw - contentW * scale) / 2 - (minX - pad) * scale;
      const y = (ch - contentH * scale) / 2 - (minY - pad) * scale;
      setViewport({ x, y, scale });
    }

    // ── port connections ──────────────────────────────────────
    function onPortMouseDown(e, nodeId, portId, isOutput) {
      e.stopPropagation();
      e.preventDefault();
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;
      const { x, y } = portCoords(node, portId, isOutput, nodeOverrides);
      const { inputs, outputs } = resolveNodePorts(node, nodeOverrides);
      const portObj = (isOutput ? outputs : inputs).find(p => p.id === portId);
      setPendingConn({ nodeId, portId, isOutput, wx: x, wy: y, portType: portObj?.type });
    }

    function onPortMouseUp(e, nodeId, portId, isOutput) {
      e.stopPropagation();
      if (!pendingConn) return;
      // must connect output → input
      const from = pendingConn.isOutput ? pendingConn : { nodeId, portId };
      const to   = pendingConn.isOutput ? { nodeId, portId } : pendingConn;
      const fromOutput = pendingConn.isOutput ? pendingConn.portId : portId;
      const toInput    = pendingConn.isOutput ? portId : pendingConn.portId;

      if (from.nodeId === to.nodeId) { setPendingConn(null); return; }
      // don't duplicate
      const dup = connections.some(c => c.fromNodeId===from.nodeId && c.fromPortId===fromOutput && c.toNodeId===to.nodeId && c.toPortId===toInput);
      if (dup) { setPendingConn(null); return; }

      const fromNode = nodes.find(n => n.id === from.nodeId);
      const toNode   = nodes.find(n => n.id === to.nodeId);
      // Use resolveNodePorts so overridden types are respected
      const { outputs: fromOuts } = fromNode ? resolveNodePorts(fromNode, nodeOverrides) : { outputs: [] };
      const { inputs:  toIns  } = toNode   ? resolveNodePorts(toNode,   nodeOverrides) : { inputs:  [] };
      const fromPort = fromOuts.find(p => p.id === fromOutput);
      const toPort   = toIns.find(p => p.id === toInput);
      const { ok, msg } = validateConn(fromPort?.type, toPort?.type);

      setConnections(cs => [...cs, {
        id: uid(),
        fromNodeId: from.nodeId, fromPortId: fromOutput,
        toNodeId: to.nodeId,     toPortId: toInput,
        valid: ok, msg,
        cableLabel: nextCableLabel(cs, fromPort?.type),
      }]);
      setPendingConn(null);
    }

    // ── load project ──────────────────────────────────────────
    function addTextBox() {
      const cx = -viewport.x / viewport.scale + 120;
      const cy = -viewport.y / viewport.scale + 80;
      const id = uid();
      setTextBoxes(ts => [...ts, { id, x: cx, y: cy, text: '' }]);
      setSelectedTbId(id);
      setSelectedNodeId(null);
      setSelectedConnId(null);
    }

    function updateTextBox(id, patch) {
      setTextBoxes(ts => ts.map(t => t.id === id ? { ...t, ...patch } : t));
    }

    function deleteTextBox(id) {
      setTextBoxes(ts => ts.filter(t => t.id !== id));
      if (selectedTbId === id) setSelectedTbId(null);
    }

    function loadProject(p) {
      setNodes(p.nodes || []);
      setConnections(p.connections || []);
      setViewport(p.viewport || { x:0, y:0, scale:1 });
      setTextBoxes(p.textBoxes || []);
      setRackOrder(p.rackOrder || []);
      setSelectedNodeId(null);
      setSelectedConnId(null);
      setSelectedTbId(null);
      setRightPanel(null);
    }

    // ── load template ─────────────────────────────────────────
    function loadTemplate(tpl) {
      const idMap = {};
      const newNodes = tpl.nodes.map((n, i) => {
        const id = uid();
        idMap[i] = id;
        return { id, deviceId: n.deviceId, label: n.label, position: { ...n.position } };
      });
      const newConns = (tpl.wires || []).map(w => {
        const fromNode = newNodes[w.from];
        const toNode   = newNodes[w.to];
        const fromDev  = getDevice(fromNode?.deviceId);
        const toDev    = getDevice(toNode?.deviceId);
        // resolve port: match by index suffix or first available
        function resolvePort(dev, portList, portRef) {
          const p = (portList||[]).find(p => p.id === portRef) || (portList||[])[0];
          return p;
        }
        const fromPort = resolvePort(fromDev, fromDev?.outputs, w.fromPort);
        const toPort   = resolvePort(toDev,   toDev?.inputs,   w.toPort);
        if (!fromPort || !toPort) return null;
        const { ok, msg } = validateConn(fromPort.type, toPort.type);
        return {
          id: uid(),
          fromNodeId: fromNode.id, fromPortId: fromPort.id,
          toNodeId: toNode.id,     toPortId: toPort.id,
          valid: ok, msg,
          cableLabel: '',  // will be patched below
        };
      }).filter(Boolean);
      // assign cable labels
      const labeled = [];
      newConns.forEach(c => {
        const fNode = newNodes.find(n => n.id === c.fromNodeId);
        const fDev  = getDevice(fNode?.deviceId);
        const fPort = (fDev?.outputs||[]).find(p => p.id === c.fromPortId);
        c.cableLabel = nextCableLabel(labeled, fPort?.type);
        labeled.push(c);
      });
      setNodes(newNodes);
      setConnections(newConns);
      setNodeOverrides({});
      setRackOrder([]);
      setViewport({ x:0, y:0, scale:1 });
      setSelectedNodeId(null);
      setSelectedConnId(null);
      setRightPanel(null);
    }

    // ── keyboard shortcuts ────────────────────────────────────
    useEffect(() => {
      function onKey(e) {
        // Undo / Redo
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') { e.preventDefault(); undo(); return; }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); redo(); return; }
        if ((e.key === 'Delete' || e.key === 'Backspace') && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          if (selectedTbId) deleteTextBox(selectedTbId);
          else if (selectedNodeId) deleteNode(selectedNodeId);
          else if (selectedConnId) deleteConn(selectedConnId);
        }
      }
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    });

    // ── derived ───────────────────────────────────────────────
    const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;
    const selectedConn = connections.find(c => c.id === selectedConnId) || null;

    const tempLine = pendingConn ? (() => {
      const origin = pendingConn;
      const mn = nodes.find(n => n.id === origin.nodeId);
      if (!mn) return null;
      const { x:ox, y:oy } = portCoords(mn, origin.portId, origin.isOutput, nodeOverrides);
      return origin.isOutput
        ? { x1: ox, y1: oy, x2: mousePos.x, y2: mousePos.y }
        : { x1: mousePos.x, y1: mousePos.y, x2: ox, y2: oy };
    })() : null;

    const totalWarnings = connections.filter(c => !c.valid || c.msg).length;

    // Pre-compute canvas grid styles (avoid nested backticks inside html tagged template)
    const _gridG = canvasSettings.gridSize || 20;
    const _gridBr = canvasSettings.gridBrightness ?? 0.5;
    const _gridBgImage = (() => {
      if (_gridBr === 0) return 'none';
      if (canvasSettings.gridDots) {
        const a1 = (0.3 * _gridBr).toFixed(3);
        return 'radial-gradient(circle, rgba(100,160,255,' + a1 + ') 0.6px, transparent 0.6px)';
      }
      const major = _gridG * 3;
      const a1 = (0.22 * _gridBr).toFixed(3);
      const a2 = (0.1 * _gridBr).toFixed(3);
      return 'linear-gradient(rgba(30,58,95,' + a1 + ') 1px, transparent 1px), linear-gradient(90deg, rgba(30,58,95,' + a1 + ') 1px, transparent 1px), linear-gradient(rgba(30,58,95,' + a2 + ') 1px, transparent 1px), linear-gradient(90deg, rgba(30,58,95,' + a2 + ') 1px, transparent 1px)';
    })();
    const _gridBgSize = (() => {
      if (canvasSettings.gridDots) return _gridG + 'px ' + _gridG + 'px';
      const major = _gridG * 3;
      return major + 'px ' + major + 'px, ' + major + 'px ' + major + 'px, ' + _gridG + 'px ' + _gridG + 'px, ' + _gridG + 'px ' + _gridG + 'px';
    })();
    const _gridBgPos = (() => {
      const vx = viewport.x, vy = viewport.y;
      if (canvasSettings.gridDots) return (vx % _gridG) + 'px ' + (vy % _gridG) + 'px';
      const major = _gridG * 3;
      return (vx % major) + 'px ' + (vy % major) + 'px, ' + (vx % major) + 'px ' + (vy % major) + 'px, ' + (vx % _gridG) + 'px ' + (vy % _gridG) + 'px, ' + (vx % _gridG) + 'px ' + (vy % _gridG) + 'px';
    })();

    return html`
      <div style=${{ display:'flex', height:'100%', background:'#030d1e', color:'#f1f5f9', fontFamily:"'Inter','Segoe UI',sans-serif", overflow:'hidden', position:'relative' }}>

        <!-- LEFT SIDEBAR -->
        <${DeviceSidebar}
          customTypes=${extraTypes}
          customDevices=${customDevices}
          onAddNode=${addNode}
          onAddCustomType=${() => setShowCustom(true)}
          onAddCustomDevice=${() => setShowCustomDevice(true)}
          onDeleteCustomDevice=${deleteCustomDevice}
          onShowProjects=${() => setRightPanel('project')}
          onShowTemplates=${() => setShowTemplates(true)}
          onClearAll=${() => { if (confirm('Clear canvas? This cannot be undone.')) { setNodes([]); setConnections([]); setTextBoxes([]); setSelectedTbId(null); }}}
          onExportPNG=${() => exportCapture(nodes, nodeOverrides, connections, canvasRef, 'png', undefined, authorInfo)}
          onExportPDF=${() => exportCapture(nodes, nodeOverrides, connections, canvasRef, 'pdf', 'dark', authorInfo, rackOrder)}
          onExportPDFLight=${() => exportCapture(nodes, nodeOverrides, connections, canvasRef, 'pdf', 'light', authorInfo, rackOrder)}
          onExportCSV=${() => exportPatchCSV(nodes, connections)}
          onImportCSV=${() => {
            const inp = document.createElement('input');
            inp.type = 'file'; inp.accept = '.csv,text/csv';
            inp.onchange = () => {
              const file = inp.files[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                const allDevs = [...DEVICES, ..._runtimeCustomDevices];
                const result = importPatchCSV(reader.result, allDevs);
                if (result.errors.length && !result.nodes.length) {
                  alert('Import failed:\\n' + result.errors.join('\\n'));
                  return;
                }
                if (result.errors.length) {
                  alert('Imported with warnings:\\n' + result.errors.join('\\n'));
                }
                setNodes(n => [...n, ...result.nodes]);
                setConnections(c => [...c, ...result.connections]);
              };
              reader.readAsText(file);
            };
            inp.click();
          }}
          authorInfo=${authorInfo}
          onAuthorInfoChange=${(info) => { setAuthorInfo(info); try { localStorage.setItem('avs_author_info', JSON.stringify(info)); } catch {} }}
        />

        <!-- MAIN AREA -->
        <div style=${{ flex:1, display:'flex', flexDirection:'column', minWidth:0, position:'relative' }}>

          <!-- top toolbar -->
          <div style=${{ height:44, flexShrink:0, background:'linear-gradient(180deg,#081628 0%,#060f1e 100%)', borderBottom:'1px solid #152a47', display:'flex', alignItems:'center', padding:'0 14px', gap:8, zIndex:5, boxShadow:'0 2px 14px #00000066' }}>
            <!-- View toggle -->
            <div style=${{ display:'flex', background:'#030d1e', border:'1px solid #1e3a5f', borderRadius:6, overflow:'hidden', flexShrink:0 }}>
              <button
                onClick=${() => setViewMode('schematic')}
                style=${{ background: viewMode==='schematic' ? 'linear-gradient(160deg,#1d4ed8,#1e40af)' : '#040b18', border:'none', color: viewMode==='schematic' ? '#fff' : '#64748b', padding:'5px 14px', cursor:'pointer', fontSize:10, fontWeight:700, letterSpacing:'0.08em' }}
              >⬡ SCHEMATIC</button>
              <button
                onClick=${() => setViewMode('rack')}
                style=${{ background: viewMode==='rack' ? 'linear-gradient(160deg,#1d4ed8,#1e40af)' : '#040b18', border:'none', color: viewMode==='rack' ? '#fff' : '#64748b', padding:'5px 14px', cursor:'pointer', fontSize:10, fontWeight:700, letterSpacing:'0.08em' }}
              >▤ RACK</button>
            </div>
            <div style=${{ width:1, height:20, background:'#1e3a5f', flexShrink:0 }}></div>
            <span style=${{ fontSize:10, color:'#334155' }}>
              ${nodes.length} device${nodes.length!==1?'s':''} · ${connections.length} cable${connections.length!==1?'s':''}
              ${totalWarnings > 0 ? html`<span style=${{ color:'#f59e0b', marginLeft:8 }}>⚠ ${totalWarnings} warning${totalWarnings>1?'s':''}</span>` : ''}
            </span>
            <div style=${{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6 }}>
              ${viewMode === 'schematic' && html`<span style=${{ fontSize:9, color:'#1e3a5f', letterSpacing:'0.02em' }}>ctrl+z=undo  ·  scroll=zoom  ·  alt+drag=pan  ·  del=delete</span>`}
              <div style=${{ display:'flex', alignItems:'stretch', border:'1px solid #1a3354', borderRadius:5, overflow:'hidden', flexShrink:0 }}>
                <button onClick=${undo} title="Undo (Ctrl+Z)" style=${{ background:'#091421', border:'none', borderRight:'1px solid #1a3354', color: historyRef.current.length > 1 ? '#60a5fa' : '#1e3a5f', width:28, cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>↩</button>
                <button onClick=${redo} title="Redo (Ctrl+Y)" style=${{ background:'#091421', border:'none', color: futureRef.current.length > 0 ? '#60a5fa' : '#1e3a5f', width:28, cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>↪</button>
              </div>
              <div style=${{ display:'flex', alignItems:'stretch', border:'1px solid #1a3354', borderRadius:5, overflow:'hidden', flexShrink:0 }}>
                <button onClick=${zoomOut} title="Zoom Out" style=${{ background:'#091421', border:'none', borderRight:'1px solid #1a3354', color:'#94a3b8', width:26, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>−</button>
                <span style=${{ background:'#060f1e', color:'#64748b', padding:'0 8px', fontSize:9, fontWeight:700, fontFamily:'monospace', display:'flex', alignItems:'center', letterSpacing:'0.05em', minWidth:44, justifyContent:'center' }}>${Math.round(viewport.scale*100)}%</span>
                <button onClick=${zoomIn} title="Zoom In" style=${{ background:'#091421', border:'none', borderLeft:'1px solid #1a3354', color:'#94a3b8', width:26, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}>+</button>
              </div>
              <button onClick=${fitAll} style=${{ background:'#091421', border:'1px solid #1a3354', color:'#60a5fa', borderRadius:4, padding:'3px 10px', cursor:'pointer', fontSize:9, fontWeight:700, letterSpacing:'0.05em', flexShrink:0 }}>FIT ALL</button>
              <button onClick=${() => setViewport({x:0,y:0,scale:1})} style=${{ background:'#091421', border:'1px solid #1a3354', color:'#475569', borderRadius:4, padding:'3px 10px', cursor:'pointer', fontSize:9, fontWeight:600, flexShrink:0 }}>RESET</button>
              <button onClick=${addTextBox} title="Add a moveable text label to the canvas" style=${{ background:'linear-gradient(160deg,#0f3460,#0a2040)', border:'1px solid #1e4a7a', color:'#93c5fd', borderRadius:4, padding:'3px 10px', cursor:'pointer', fontSize:9, fontWeight:700, letterSpacing:'0.05em', flexShrink:0 }}>＋ TEXT</button>
            </div>
          </div>

          <!-- MAIN CONTENT AREA -->
          ${viewMode === 'rack'
            ? html`<${RackView} nodes=${nodes} connections=${connections} rackOrder=${rackOrder} setRackOrder=${setRackOrder} canvasRef=${canvasRef} />`
            : html`
          <!-- canvas wrapper -->
          <div
            ref=${wrapRef}
            style=${{ flex:1, overflow:'hidden', position:'relative', cursor: panRef.current ? 'grabbing' : 'default' }}
            onMouseMove=${onMouseMove}
            onMouseUp=${onMouseUp}
            onMouseDown=${onCanvasMouseDown}
            onWheel=${onWheel}
          >
            <!-- Canvas Settings gear button -->
            <button onClick=${() => setShowCanvasSettings(v => !v)} title="Canvas Settings"
              style=${{ position:'absolute', top:8, right:8, zIndex:90, width:30, height:30, borderRadius:'50%', border: showCanvasSettings ? '1.5px solid #3b82f6' : '1px solid #1e3a5f', background: showCanvasSettings ? 'linear-gradient(135deg,#1e3a6e,#0d1f3c)' : 'rgba(9,20,33,0.85)', color: showCanvasSettings ? '#60a5fa' : '#64748b', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, backdropFilter:'blur(8px)', transition:'all 0.15s' }}>
              ⚙
            </button>

            <!-- Canvas Settings Panel -->
            ${showCanvasSettings && html`
              <div style=${{ position:'absolute', top:44, right:8, zIndex:91, width:220, background:'linear-gradient(135deg,#0a1929,#0d1f3c)', border:'1px solid #1e3a5f', borderRadius:8, padding:'12px 14px', boxShadow:'0 8px 32px rgba(0,0,0,0.5)', backdropFilter:'blur(12px)' }}>
                <div style=${{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <span style=${{ fontSize:10, fontWeight:700, letterSpacing:'0.08em', color:'#94a3b8' }}>CANVAS SETTINGS</span>
                  <button onClick=${() => setShowCanvasSettings(false)} style=${{ background:'none', border:'none', color:'#475569', cursor:'pointer', fontSize:14, padding:0, lineHeight:1 }}>×</button>
                </div>

                <!-- Background -->
                <div style=${{ marginBottom:10 }}>
                  <div style=${{ fontSize:8, fontWeight:600, color:'#64748b', letterSpacing:'0.08em', marginBottom:5 }}>BACKGROUND</div>
                  <div style=${{ display:'flex', gap:4 }}>
                    ${['#030d1e','#0a1628','#111827','#1e293b','#0f172a','#020617','#18181b','#0c0a09'].map(c => html`
                      <div key=${c} onClick=${() => updateCanvasSetting('bgColor', c)}
                        style=${{ width:20, height:20, borderRadius:4, background:c, cursor:'pointer', border: canvasSettings.bgColor === c ? '2px solid #3b82f6' : '1px solid #1e3a5f', transition:'border 0.1s' }} />
                    `)}
                  </div>
                </div>

                <!-- Grid -->
                <div style=${{ marginBottom:10 }}>
                  <div style=${{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                    <span style=${{ fontSize:8, fontWeight:600, color:'#64748b', letterSpacing:'0.08em' }}>GRID</span>
                    <button onClick=${() => updateCanvasSetting('gridDots', !canvasSettings.gridDots)}
                      style=${{ background: canvasSettings.gridDots ? '#1e3a5f' : '#0d1926', border:'1px solid #1e3a5f', borderRadius:4, color: canvasSettings.gridDots ? '#60a5fa' : '#475569', cursor:'pointer', fontSize:8, fontWeight:600, padding:'2px 6px' }}>
                      ${canvasSettings.gridDots ? '⊡ Dots' : '# Lines'}
                    </button>
                  </div>
                  <div style=${{ marginBottom:6 }}>
                    <div style=${{ fontSize:7, color:'#475569', marginBottom:3 }}>Size</div>
                    <div style=${{ display:'flex', gap:3, alignItems:'center' }}>
                      ${[10, 16, 20, 24, 32, 48].map(s => html`
                        <button key=${s} onClick=${() => updateCanvasSetting('gridSize', s)}
                          style=${{ padding:'2px 5px', borderRadius:3, fontSize:8, fontWeight: canvasSettings.gridSize === s ? 700 : 500, border: canvasSettings.gridSize === s ? '1px solid #3b82f6' : '1px solid transparent', background: canvasSettings.gridSize === s ? '#1e3a6e' : 'transparent', color: canvasSettings.gridSize === s ? '#60a5fa' : '#64748b', cursor:'pointer' }}>
                          ${s}
                        </button>
                      `)}
                    </div>
                  </div>
                  <div>
                    <div style=${{ fontSize:7, color:'#475569', marginBottom:3, letterSpacing:'0.06em' }}>GRID BRIGHTNESS</div>
                    <input type="range" min="0" max="1" step="0.05" value=${canvasSettings.gridBrightness}
                      onInput=${(e) => updateCanvasSetting('gridBrightness', parseFloat(e.target.value))}
                      style=${{ width:'100%', accentColor:'#3b82f6', height:4 }} />
                  </div>
                </div>

                <!-- Snap + Minimap -->
                <div style=${{ display:'flex', gap:6, marginTop:6 }}>
                  <button onClick=${() => updateCanvasSetting('snapToGrid', !canvasSettings.snapToGrid)}
                    style=${{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'5px 0', borderRadius:6, fontSize:8, fontWeight:600, cursor:'pointer', border: canvasSettings.snapToGrid ? '1px solid #3b82f6' : '1px solid #1e3a5f', background: canvasSettings.snapToGrid ? 'linear-gradient(135deg,#1e3a6e,#0d2040)' : '#0d1926', color: canvasSettings.snapToGrid ? '#60a5fa' : '#64748b' }}>
                    🧲 Snap
                  </button>
                  <button onClick=${() => updateCanvasSetting('showMinimap', !canvasSettings.showMinimap)}
                    style=${{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'5px 0', borderRadius:6, fontSize:8, fontWeight:600, cursor:'pointer', border: canvasSettings.showMinimap ? '1px solid #3b82f6' : '1px solid #1e3a5f', background: canvasSettings.showMinimap ? 'linear-gradient(135deg,#1e3a6e,#0d2040)' : '#0d1926', color: canvasSettings.showMinimap ? '#60a5fa' : '#64748b' }}>
                    🗺 Minimap
                  </button>
                </div>
              </div>
            `}

            <!-- exportable canvas area -->
            <div
              ref=${canvasRef}
              style=${{
                position:'absolute', inset:0, overflow:'visible',
                background: canvasSettings.bgColor || '#030d1e',
                backgroundImage: _gridBgImage,
                backgroundSize: _gridBgSize,
                backgroundPosition: _gridBgPos,
              }}
            >
              <!-- transform layer -->
              <div style=${{ position:'absolute', inset:0, transform:`translate(${viewport.x}px,${viewport.y}px) scale(${viewport.scale})`, transformOrigin:'0 0', overflow:'visible' }}>
                <!-- Text boxes (rendered below nodes) -->
                ${textBoxes.map(box => html`
                  <${TextBox}
                    key=${box.id}
                    box=${box}
                    selected=${box.id === selectedTbId}
                    viewport=${viewport}
                    onSelect=${(id) => { setSelectedTbId(id); setSelectedNodeId(null); setSelectedConnId(null); setRightPanel(null); }}
                    onDelete=${deleteTextBox}
                    onUpdate=${updateTextBox}
                  />
                `)}
                <!-- Node cards (rendered first so SVG labels paint above them) -->
                ${nodes.map(node => html`
                  <${NodeCard}
                    key=${node.id}
                    node=${node}
                    selected=${node.id === selectedNodeId}
                    pendingConn=${pendingConn}
                    nodeOverrides=${nodeOverrides}
                    onSelect=${selectNode}
                    onDelete=${deleteNode}
                    onDragStart=${onNodeDragStart}
                    onPortMouseDown=${onPortMouseDown}
                    onPortMouseUp=${onPortMouseUp}
                    onConfigurePorts=${(nid) => { setPortEditorNodeId(nid); }}
                  />
                `)}
                <!-- SVG connections rendered last so labels/wires appear above node cards -->
                <${ConnectionLines}
                  nodes=${nodes}
                  connections=${connections}
                  selectedConnId=${selectedConnId}
                  onSelectConn=${(id) => { setSelectedConnId(id); setSelectedNodeId(null); setRightPanel('conn'); }}
                  tempConn=${tempLine}
                  nodeOverrides=${nodeOverrides}
                  onUpdateConn=${updateConn}
                  viewport=${viewport}
                />
              </div>
            </div>

            <!-- empty state -->
            ${nodes.length === 0 && html`
              <div style=${{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
                <div style=${{ textAlign:'center', color:'#1e3a5f' }}>
                  <div style=${{ fontSize:48, marginBottom:12, opacity:0.4 }}>🔌</div>
                  <div style=${{ fontSize:15, fontWeight:600, color:'#1e3a5f' }}>Click a device in the sidebar to add it</div>
                  <div style=${{ fontSize:11, color:'#0f2744', marginTop:4 }}>Then drag ports to connect them</div>
                </div>
              </div>
            `}

            <!-- Minimap -->
            ${canvasSettings.showMinimap && nodes.length > 0 && (() => {
              const MMW = 160, MMH = 100;
              const xs = nodes.map(n => n.position.x);
              const ys = nodes.map(n => n.position.y);
              const minX = Math.min(...xs) - 100, maxX = Math.max(...xs) + 300;
              const minY = Math.min(...ys) - 100, maxY = Math.max(...ys) + 200;
              const rangeX = Math.max(maxX - minX, 1), rangeY = Math.max(maxY - minY, 1);
              const sc = Math.min(MMW / rangeX, MMH / rangeY);
              return html`
                <div style=${{ position:'absolute', bottom:10, right:10, zIndex:90, width:MMW, height:MMH, background:'rgba(3,13,30,0.85)', border:'1px solid #1e3a5f', borderRadius:6, overflow:'hidden', backdropFilter:'blur(8px)' }}>
                  <svg width=${MMW} height=${MMH} style=${{ display:'block' }}>
                    ${nodes.map(n => {
                      const dev = getDevice(n.deviceId);
                      const catInfo = CAT[dev?.category] || CAT.custom;
                      const px = (n.position.x - minX) * sc;
                      const py = (n.position.y - minY) * sc;
                      return html`<rect key=${n.id} x=${px} y=${py} width=${8} height=${5} rx="1" fill=${catInfo.color} opacity="0.7" />`;
                    })}
                    ${connections.map(c => {
                      const fn = nodes.find(n => n.id === c.fromNodeId);
                      const tn = nodes.find(n => n.id === c.toNodeId);
                      if (!fn || !tn) return null;
                      return html`<line key=${c.id} x1=${(fn.position.x - minX) * sc + 4} y1=${(fn.position.y - minY) * sc + 2.5} x2=${(tn.position.x - minX) * sc + 4} y2=${(tn.position.y - minY) * sc + 2.5} stroke="#1e3a5f" stroke-width="0.5" />`;
                    })}
                    <!-- viewport indicator -->
                    ${(() => {
                      const wrap = wrapRef.current;
                      if (!wrap) return null;
                      const vw = wrap.clientWidth / viewport.scale;
                      const vh = wrap.clientHeight / viewport.scale;
                      const vx = (-viewport.x / viewport.scale - minX) * sc;
                      const vy = (-viewport.y / viewport.scale - minY) * sc;
                      return html`<rect x=${vx} y=${vy} width=${vw * sc} height=${vh * sc} fill="none" stroke="#3b82f6" stroke-width="1" rx="1" opacity="0.6" />`;
                    })()}
                  </svg>
                </div>
              `;
            })()}
          </div>
          `}
        </div>

        <!-- RIGHT PANEL -->
        <${RightPanel}
          mode=${rightPanel}
          selectedNode=${selectedNode}
          selectedConn=${selectedConn}
          nodes=${nodes}
          connections=${connections}
          nodeOverrides=${nodeOverrides}
          viewport=${viewport}
          textBoxes=${textBoxes}
          rackOrder=${rackOrder}
          onClose=${() => setRightPanel(null)}
          onLabelChange=${updateLabel}
          onUpgradeDevice=${upgradeDevice}
          onDeleteConn=${deleteConn}
          onRenameConn=${renameConn}
          onUpdateConn=${updateConn}
          onLoadProject=${loadProject}
          onConfigurePorts=${(nid) => setPortEditorNodeId(nid)}
          onAddMidpointWaypoint=${addMidpointWaypoint}
        />

        <!-- CUSTOM PORT MODAL -->
        ${showCustom && html`
          <${CustomPortModal}
            onAdd=${({ id, label, color }) => {
              setExtraTypes(t => ({ ...t, [id]: { label, color } }));
              setShowCustom(false);
            }}
            onClose=${() => setShowCustom(false)}
          />
        `}

        <!-- CUSTOM DEVICE MODAL -->
        ${showCustomDevice && html`
          <${CustomDeviceModal}
            onSave=${saveCustomDevice}
            onClose=${() => setShowCustomDevice(false)}
          />
        `}

        <!-- TEMPLATES MODAL -->
        ${showTemplates && html`
          <${TemplatesModal}
            onLoad=${loadTemplate}
            onClose=${() => setShowTemplates(false)}
          />
        `}

        <!-- PORT EDITOR MODAL -->
        ${portEditorNodeId && (() => {
          const pNode = nodes.find(n => n.id === portEditorNodeId);
          if (!pNode) return null;
          return html`
            <${PortEditorModal}
              node=${pNode}
              overrides=${nodeOverrides[portEditorNodeId] || {}}
              onSave=${(ov) => savePortOverrides(portEditorNodeId, ov)}
              onClose=${() => setPortEditorNodeId(null)}
            />
          `;
        })()}
      </div>
    `;
  }

  // ─────────────────────────────────────────────────────────────
  // MOUNT
  // ─────────────────────────────────────────────────────────────
  let _root   = null;
  let _rootEl = null; // track which DOM element the root was created for

  window.AVEngineeringPro = {
    mount(el) {
      if (!el) return;
      try {
        if (_RD.createRoot) {
          // If _root exists but belongs to a different / now-detached element,
          // unmount it first so we don't render into a stale/destroyed DOM node
          // (this is the root cause of the "blank canvas" bug on tab re-entry).
          if (_root && _rootEl !== el) {
            try { _root.unmount(); } catch (_) {}
            _root   = null;
            _rootEl = null;
          }
          if (!_root) {
            _root   = _RD.createRoot(el);
            _rootEl = el;
          }
          _root.render(_R.createElement(App));
        } else {
          _RD.render(_R.createElement(App), el);
        }
      } catch (err) {
        console.error('AVEngineeringPro mount error:', err);
        el.innerHTML = `<div style="color:#f87171;padding:20px">AV Schematics failed to load: ${err.message}</div>`;
      }
    },
    unmount() {
      try {
        if (_root) { _root.unmount(); _root = null; _rootEl = null; }
        else if (_RD.unmountComponentAtNode && _rootEl) { _RD.unmountComponentAtNode(_rootEl); _rootEl = null; }
      } catch (_) {}
    },
  };

})();
