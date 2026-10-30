/**
 * PixelLogic Tutorial PDF Generator
 * Generates a comprehensive PDF tutorial with screenshots for all tabs and subtabs.
 * 
 * Usage: node scripts/generate-tutorial-pdf.js
 * Output: external-files/Tutorial_pixel logic.pdf (opened by the app's Tutorial PDF button)
 */

const { jsPDF } = require('jspdf');
const fs = require('fs');
const path = require('path');

// Read this app's package so root and product builds use their own release version.
let APP_VERSION = '0.0.0';
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  APP_VERSION = pkg.version || APP_VERSION;
} catch (_) {}

// PDF dimensions (A4 Landscape)
const PAGE_W = 297;
const PAGE_H = 210;
const MARGIN = 15;
const CONTENT_W = PAGE_W - 2 * MARGIN;
const CONTENT_H = PAGE_H - 2 * MARGIN;

// Colors
const COLORS = {
  primary: [79, 70, 229],      // Indigo-600
  secondary: [16, 185, 129],   // Emerald-500
  dark: [15, 23, 42],          // Slate-900
  darkBg: [30, 41, 59],        // Slate-800
  cardBg: [51, 65, 85],        // Slate-700
  text: [241, 245, 249],       // Slate-100
  textMuted: [148, 163, 184],  // Slate-400
  accent: [139, 92, 246],      // Violet-500
  warning: [245, 158, 11],     // Amber-500
  success: [34, 197, 94],      // Green-500
};

// Screenshot directory (use optimized JPEGs if available)
const SCREENSHOTS_DIR_OPT = path.join(__dirname, 'screenshots', 'optimized');
const SCREENSHOTS_DIR_ORIG = path.join(__dirname, 'screenshots');
const USE_OPTIMIZED = fs.existsSync(SCREENSHOTS_DIR_OPT);

// Tutorial content for each tab
const TUTORIAL_SECTIONS = [
  {
    title: 'Projects',
    screenshot: '01-New-Shows.png',
    subtitle: 'Create & Manage Your LED Shows',
    purpose: 'Central hub for creating, organizing, and managing all your LED wall projects.',
    description: [
      'The Projects tab is your starting point in PixelLogic. Here you create new shows, manage existing drafts, and organize your saved projects. Each project contains all pixel maps, canvas layouts, effects, and export settings for a complete LED wall deployment.',
      'Save project details in place without closing the editable project card. Auto-save is enabled by default every three minutes and can be disabled from the Projects tab. Saved Projects are for shows you explicitly archive, while JSON export/import provides portable backups.',
      'The tab supports full project metadata including event name, date, location, venue, and salesperson. This information carries through to PDF exports and helps organize shows for multi-event operations.'
    ],
    features: [
      'Create new projects with custom names',
      'Edit project metadata (event date, location, venue, salesperson)',
      'Save project details in place without closing the project',
      'Optional auto-save every three minutes, enabled by default',
      'Duplicate existing projects',
      'Export individual projects as JSON backup files',
      'Import projects from JSON backup files',
      'Bulk export/import all projects',
      'Delete projects with confirmation',
      'Color-coded project cards for easy identification',
      'Auto-save to local storage'
    ],
    workflow: [
      'Click "New Project" and enter a project name',
      'Fill in event metadata (date, location, venue)',
      'Work on pixel maps, effects, and canvases in other tabs',
      'Click "Save" to persist details while keeping the project open',
      'Export as JSON for backup before delivery'
    ]
  },
  {
    title: 'Saved Projects',
    screenshot: '02-Saved-Shows.png',
    subtitle: 'Finalized & Archived Shows',
    purpose: 'View and manage all saved/finalized projects in a dedicated archive view.',
    description: [
      'The Saved Projects section displays all projects that have been marked as "saved" or finalized. These represent completed shows that are ready for deployment or have been archived after an event. The view provides a clean overview of your project library.',
      'Each saved project displays its name, unique ID, save date, and event metadata. Projects can be reopened for further editing if modifications are needed, or permanently deleted when no longer required.',
      'Multi-select functionality allows batch operations on saved projects, making it easy to manage large project libraries. Color coding helps visually distinguish between different projects at a glance.'
    ],
    features: [
      'View all finalized/saved projects',
      'Multi-select with checkboxes for batch operations',
      'Reopen saved projects for further editing',
      'Delete saved projects permanently',
      'Color-coded project identification',
      'Display project metadata (name, ID, date, venue)',
      'Sort and filter projects'
    ],
    workflow: [
      'Navigate to the saved projects section',
      'Review archived shows and their metadata',
      'Select projects for batch operations if needed',
      'Click "Reopen" to move a project back to drafts for editing',
      'Use delete to permanently remove old projects'
    ]
  },
  {
    title: 'Pixel Designer',
    screenshot: '03-Pixel-Designer.png',
    subtitle: 'LED Wall Geometry & Configuration',
    purpose: 'Design and configure LED pixel maps with precise panel dimensions, pitch, and resolution settings.',
    description: [
      'The Pixel Designer is the core design tool of PixelLogic. It allows you to define LED wall geometry by specifying panel dimensions (width × height in pixels), pixel pitch, and physical panel sizes. The designer calculates total resolution, physical dimensions, and generates visual representations of your LED walls.',
      'Each project can contain multiple pixel maps representing different LED surfaces (main wall, side fills, floor, ceiling, etc.). The designer supports various visual styles including checker patterns, gradient fills, and solid colors to help visualize panel boundaries and pixel density.',
      'Shape-based pixel maps let you build non-rectangular LED walls — Circle, Ellipse/Oval, Triangle, Diamond, Hexagon, Cross/Plus, or a fully custom hand-painted outline. Choosing a shape automatically disables the panels that fall outside it, yet the project still calculates as a rectangular grid so export, 3D, LED patching and power all keep working unchanged. For circular walls you can enter just a Radius, Diameter or Circumference and the wall size is computed for you — ideal when a client only gives one measurement.',
      'Advanced features include panel gap simulation, automatic aspect ratios, rotation, and precise millimeter-level measurements. Screen dimensions and tile counts synchronize in both directions: Width updates Tiles Across, Height updates Tiles High, and changing tile counts recalculates the matching screen dimension. The calculated ratio is shown in reduced and decimal forms, for example 5:4 (1.25:1).'
    ],
    features: [
      'Define pixel map dimensions (width × height in panels)',
      'Two-way synchronization between screen dimensions and tile counts',
      'Set pixel pitch (mm) for accurate physical calculations',
      'Configure panel pixel resolution (e.g., 500×500, 250×250)',
      'Shape-based walls: Circle, Ellipse, Triangle, Diamond, Hexagon, Cross & Custom',
      'Size a circle by Radius, Diameter or Circumference — enter any one value',
      'Click-to-paint panels in the Live Preview for custom shapes & logos',
      'Disabled panels render transparent (no black background)',
      'Multiple visual styles: checker, gradient, solid, numbered',
      'Panel gap simulation for realistic visualization',
      'Multiple pixel maps per project',
      'Auto-calculate total resolution, physical size, pixel count',
      'Automatic reduced and decimal aspect ratio, such as 5:4 (1.25:1)',
      'Custom naming for each pixel map',
      'Duplicate and resize existing maps',
      'Real-time dimension preview',
      'Support for non-standard panel sizes',
      'Lock aspect ratio option'
    ],
    workflow: [
      'Select or create a pixel map from the map list',
      'Enter panel count (columns × rows)',
      'Pick a Wall Shape (or leave Rectangle) — for a circle, choose Radius / Diameter / Circumference and type one value',
      'Set pixel pitch (e.g., 2.6mm, 3.9mm)',
      'Define panel resolution (pixels per panel)',
      'Choose visual style for the preview',
      'Click panels in the Live Preview to fine-tune or paint a custom shape',
      'Verify calculated dimensions match requirements',
      'Add additional maps for multi-surface setups'
    ]
  },
  {
    title: 'Special Effects',
    screenshot: '04-Special-Effects.png',
    subtitle: 'Visual Overlays & Annotations',
    purpose: 'Add visual overlay effects, text badges, markers, logos, and color adjustments to pixel maps.',
    description: [
      'The Special Effects tab provides tools for annotating and enhancing your pixel map visualizations. You can add text overlays showing resolution info, coordinate markers, dimension labels, and custom badges. Enable Include Metrics on the centre badge to add screen size, pixel resolution, and both aspect-ratio formats automatically. These effects help communicate technical specifications visually on exported images and PDFs.',
      'Color adjustment tools allow you to modify the visual appearance of pixel maps with brightness, contrast, and tint controls. This is useful for creating presentation materials where different LED surfaces need distinct visual identification.',
      'Logo placement, custom watermarks, and grid overlays round out the effects toolkit. All effects are non-destructive and can be toggled on/off independently, allowing you to create multiple export variations from the same base design.'
    ],
    features: [
      'Text overlay with resolution/dimension info',
      'Coordinate markers (X/Y axis labels)',
      'Custom text badges and labels',
      'Centre badge metrics include screen size, pixels and dual-format aspect ratio',
      'Logo/watermark placement',
      'Color bars and test patterns',
      'Brightness and contrast adjustment',
      'Grid overlay with customizable spacing',
      'Dimension lines and arrows',
      'Panel numbering overlay',
      'Non-destructive effect stacking',
      'Per-effect visibility toggle',
      'Effect presets for common configurations'
    ],
    workflow: [
      'Select the pixel map to add effects to',
      'Choose effect type from the toolbar',
      'Configure effect parameters (text, position, color)',
      'Toggle effects on/off to preview',
      'Export with effects applied to 2D Visualizer'
    ]
  },
  {
    title: '2D Visualizer',
    screenshot: '05-2D-Visualizer.png',
    subtitle: 'Full-Resolution Preview & Export',
    purpose: 'Render full-resolution 2D previews of pixel maps and export as high-quality PNG images.',
    description: [
      'The 2D Visualizer renders your pixel maps at full resolution with all applied effects, providing an accurate preview of what the LED wall will look like. It supports zooming, panning, and measuring tools for detailed inspection of the design.',
      'Export functionality allows saving the visualization as high-resolution PNG images suitable for client presentations, technical documentation, and print materials. You can export individual maps or combine multiple maps into a single composite view.',
      'The visualizer respects all Special Effects settings, showing text overlays, dimension markers, and color adjustments as they will appear in the final output. This makes it the primary quality-check tool before generating PDFs or sharing designs with clients.'
    ],
    features: [
      'Full-resolution pixel map rendering',
      'Zoom and pan controls',
      'Export as high-resolution PNG or JPG',
      'Batch export — Save All Pixel Maps as PNGs in one click',
      'Combine multiple maps in one view via a simple chip strip (click to add/remove, Right / Below / Left / Above / Grid placement with pixel gap)',
      'Per-map styles (gradient, palette, numbering, colour bars) preserved in composites',
      'Show/hide individual maps',
      'Background color customization',
      'Measurement and dimension tools',
      'Scale indicator',
      'Print-ready resolution output',
      'Effects preview integration'
    ],
    workflow: [
      'Navigate to 2D Visualizer tab',
      'Select which pixel maps to display',
      'Adjust zoom level for desired view',
      'Toggle effects visibility as needed',
      'Click Export to save as PNG image',
      'Use exported image in presentations or documents'
    ]
  },
  {
    title: '3D Visualizer',
    screenshot: '06-3D-Visualizer.png',
    subtitle: 'Perspective 3D View',
    purpose: 'View LED wall designs in an interactive 3D perspective environment with camera controls.',
    description: [
      'The 3D Visualizer provides an interactive perspective view of your LED wall designs. You can rotate, zoom, orbit, and pan around your LED surfaces to understand spatial relationships, viewing angles, and overall installation appearance.',
      'Multiple pixel maps are rendered in 3D space at their configured positions, allowing you to visualize multi-surface installations (main wall + side fills + floor) as they would appear in the real venue. Camera presets let you quickly switch between front, side, top, and perspective views.',
      'The Stage Builder adds dimensioned stage decks beneath LED walls. Choose Move and drag a selected stage directly in the scene, use Snap Below LED for placement, or use Span to LED Bottom to align the back edge and match the selected wall width.',
      'Every LED screen has a high-contrast callout containing its map name, physical W x H, and pixel resolution. Stage callouts contain the deck name and W x D x H. PNG and JPG exports retain these callouts while automatically omitting editor axes and transform gizmos.'
    ],
    features: [
      'Interactive 3D orbit/pan/zoom controls',
      'Multiple camera angle presets (front, side, top, perspective)',
      'Save & recall named camera views',
      'Per-map position / rotation / scale controls with readable labels',
      'Direct stage dragging with the Move tool',
      'Snap Below LED and Span to LED Bottom stage actions',
      'Boxed screen and stage dimension callouts',
      'Multi-map 3D composition',
      'UV texture overlay with opacity and extrude-depth sliders',
      'Auto Revolve for presentations',
      'Ground plane and grid reference',
      'Real-time rotation and manipulation',
      'Clean PNG / JPG export without editor axes or transform gizmos',
      'Include 3D View Snapshot in the PDF Export'
    ],
    workflow: [
      'Open 3D Visualizer tab',
      'Use mouse to orbit around the LED walls',
      'Scroll to zoom in/out',
      'Select camera presets for standard views',
      'Add a stage deck, select Move, and drag it into position',
      'Use Span to LED Bottom to align and width-match the stage',
      'Confirm each screen and stage callout is readable',
      'Save PNG or JPG for a clean client-facing image'
    ]
  },
  {
    title: 'Output Maps',
    screenshot: '07-Output-Maps.png',
    subtitle: 'Canvas Composition & Layout',
    purpose: 'Arrange pixel maps into output canvases with drawing tools, masks, and cropping for media server output configuration.',
    description: [
      'The Output Maps tab is where you compose your final media server output configuration. Each Output Map can contain multiple named canvases representing physical video outputs, with a stable horizontal or vertical workspace layout.',
      'Selecting a canvas never changes its name or order. The active canvas remains in full color while inactive canvases stay visible in grayscale, making the current editing target clear without hiding the rest of the output.',
      'Drawing tools enable adding reference lines, masks, and annotations directly on the canvas. Select masks directly to move and resize them on the tile grid; hold Shift while dragging a polygon vertex for precise free positioning. Crop tools let you define which portion of each pixel map receives content from each output.',
      'Output maps remain linked to their source Pixel Designer map. Designer changes refresh the source content while retaining the map placement and crop configured on the output canvas.',
      'Rename beside the top-level tabs edits the Output Map. Save or Enter persists; Cancel leaves it unchanged and blank names are rejected. Nested canvas names remain independent.',
      'Unchanged source images are reused and drag/zoom redraws are combined into animation frames. Canvas presets include HD, 4K and custom sizes; exports use full-resolution sources.'
    ],
    features: [
      'Multiple named canvases nested inside each Output Map',
      'Rename Output Maps independently of nested canvas names',
      'Cached source images and frame-coalesced drag/zoom redraws',
      'Stable canvas naming and order independent of selection',
      'Horizontal or vertical non-overlapping workspace layouts',
      'Active canvas in full color with inactive canvases in grayscale',
      'Drag-and-drop pixel map placement',
      'Precise positioning with pixel coordinates',
      'Crop/region selection per map',
      'Drawing tools (lines, rectangles, text)',
      'Mask overlay tools',
      'Direct mask selection with tile-snapped move and resize; Shift precision for polygon vertices',
      'Source-linked map refresh that retains canvas placement and crop',
      'Canvas dimension presets (HD, 4K, custom)',
      'Snap-to-grid alignment',
      'Layer ordering for overlapping maps',
      'Save the selected canvas individually as PNG',
      'Export Output Maps as PNG (with transparency), JPG, PDF, or PPTX report content',
      'Background color/pattern options',
      'Zoom and pan navigation'
    ],
    workflow: [
      'Create or select an Output Map; use Rename, then Save or Enter',
      'Add and name nested canvases independently',
      'Choose horizontal or vertical layout and confirm stable canvas names and order',
      'Select a canvas and set its dimensions to match the physical output resolution',
      'Drag pixel maps from the list onto the canvas',
      'Position and size maps precisely using coordinates',
      'Apply cropping if only a portion needs this output',
      'Add annotations and reference markings',
      'Save an individual canvas as PNG or export the Output Map for documentation'
    ]
  },
  {
    title: 'LED Patching',
    screenshot: '08-Signal-Patching.png',
    subtitle: 'Automatic & Manual Signal / Power Routing',
    purpose: 'Plan processor ports and power circuits automatically or draw every LED tile route by hand with live capacity feedback.',
    description: [
      'The LED Patching workspace combines display-array inputs, an interactive tile diagram, processor and output-card configuration, port allocation, and power distribution in one screen. Data and Power overlays can be viewed independently or together.',
      'Auto Patch generates Vertical or Horizontal Snake/ZigZag routes using processor bandwidth, panel resolution, refresh rate, bit depth, tile amperage, and breaker capacity. The Hardware Rack shows controller requirements, used ports, per-port pixels, and load percentages.',
      'Draw Lines mode lets you build the real installation route tile-by-tile. Click or drag through adjacent tiles, finish a line with Next Port or Next Circuit, and watch the enlarged dock report live pixels or amps and overload status. Undo, Redo, Clear All, and Done keep manual planning fast and recoverable.'
    ],
    features: [
      'Automatic Vertical/Horizontal Snake and ZigZag routing',
      'Manual click-or-drag routing across adjacent LED tiles',
      'Independent Data and Power routing modes and overlays',
      'Automatic C1-P1 onward port assignment with controller rollover',
      'Sequential power-circuit assignment',
      'Live active-line tile, pixel, amp, and load percentage feedback',
      'Overload and unassigned-path warnings',
      'Undo and Redo history for manual routes',
      'Clear All with undo recovery for the active route layer',
      'NovaStar/COEX processor and output-card profiles',
      'Refresh-rate and bit-depth-aware port capacity',
      'Automatic or fixed controller count',
      'Per-controller port allocation and load display',
      'Tile-aware breaker and circuit calculations',
      'FIT plus explicit zoom/pan controls without wheel-triggered resizing',
      'PNG and professional two-page PDF export'
    ],
    workflow: [
      'Set the wall columns, rows, panel resolution, physical size, tile type, and breaker rating',
      'Select the processor, output-card profile, refresh rate, bit depth, and controller mode',
      'For automatic routing, choose Auto Patch and select a Snake or ZigZag pattern',
      'For manual signal routing, select Draw Lines under Data Routing and click or drag through adjacent tiles',
      'Review live pixels and load percentage, then select Next Port to advance to the next C/P assignment',
      'For manual power routing, select Draw Lines under Power Routing and use Next Circuit between feeds',
      'Use Undo/Redo for corrections, Clear All to reset the active layer, and Done to leave drawing mode',
      'Review port allocation, circuit load, and Network Health, then export PNG or PDF documentation'
    ]
  },
  {
    title: 'LED Master Sheets & CAD Drawings',
    screenshot: '07-Output-Maps.png',
    subtitle: 'Spreadsheet Scheduling & 8 Architectural Vector Blueprints',
    purpose: 'Live spreadsheet project tracking, 30+ brand technical catalog, and 8 vector CAD engineering blueprints with multi-screen master publishing.',
    description: [
      'The LED Master Sheets module unifies high-level spreadsheet project scheduling with millimeter-accurate architectural CAD drawings. It synchronizes live with your active pixel maps and generates technical blueprints for staging, rigging, and electrical inspection.',
      'Three core views are provided: Project Schedule (live spreadsheet grid of all screens, tile counts, power loads in kW/Amps, and weight), LED Catalog (30+ brands and hundreds of models with verified pitch and electrical loads), and 8 CAD Drawings.',
      'The 8 CAD blueprints include 1 Dimensions (mm/ft), 2 Raster Map, 3 Data Wiring, 4 Power Wiring, 5 System Flow, 6 Weight Estimate, 7 Heat Load (BTU), and 8 Bill of Materials. Supports custom company logo upload in the CAD Title Block, multi-screen master PDF publishing, and dynamic page sizes (A1 to A5, Letter, Tabloid).'
    ],
    features: [
      'Live-synced Excel spreadsheet grid for all screens in project',
      '30+ brand LED technical database with pitch & power specs',
      'Custom LED brand and model creation & editing',
      '8 Vector CAD Sheets: Dimensions, Raster, Data, Power, System, Weight, BTU, BoM',
      'Publish All Screens Full Project PDF master package in one click',
      'Dedicated COMPANY LOGO column in CAD Title Block with persistent storage',
      'Dynamic page size selector (A1, A2, A3, A4, A5, Letter, Tabloid)',
      'Dimensions in meters, mm, cm, feet, and inches',
      'Rigging load and hoist pickup points calculation (WLL)',
      'BTU/hr thermal dissipation, cooling tons, and CFM airflow requirements',
      'Itemized equipment Bill of Materials'
    ],
    workflow: [
      'Open the Sheets tab and review project screens in the Schedule grid',
      'Select any screen or customize brand/model from the LED Catalog',
      'Switch to the 8 CAD Drawings view to inspect engineering blueprints',
      'Upload your company logo into the CAD Title Block',
      'Select your desired paper size (e.g. A3 or A4 landscape)',
      'Click "Publish All Screens PDF" to export the master engineering package'
    ]
  },
  {
    title: 'PDF Export',
    screenshot: '10-PDF-Export.png',
    subtitle: 'Professional Report Generation',
    purpose: 'Generate multi-page PDF reports with customizable templates, title blocks, and layout regions.',
    description: [
      'The PDF Export tab creates professional documentation packages from your PixelLogic designs. It generates multi-page PDF reports that include pixel map visualizations, technical specifications, dimension drawings, and project metadata in a polished presentation format.',
      'Output canvases are emitted in stable order, with two canvases placed on each PDF or PowerPoint page when available. A final unpaired canvas receives its own page.',
      'Advanced PDF export uses high-quality JPEG encoding for raster artwork and caps image resolution at 300 DPI based on its physical page placement. This substantially reduces file size while vector titles, detail text, and title blocks remain crisp.',
      'Full/Lite preview quality does not reduce export source resolution. Pixel-map pages, output canvases and masks use full-resolution sources, native-pixel crops and full-quality annotation shadows. PDF encoding still follows the print-aware page limit.',
      'The template system allows customizing report layouts with configurable regions, title blocks, headers/footers, and typography settings. You can define which pixel maps appear on which pages, add custom artwork backgrounds, and configure the information hierarchy.',
      'Export options include page size (A4, A3, Letter, custom), orientation (landscape/portrait), quality settings, and selective page inclusion. Reports can include delivery specifications, cable schedules, power requirements, and any other project data — making this a one-stop documentation solution for LED installations.',
      'Delivery presets for Resolume, Disguise d3, Watchout 6/7, Playback Pro, Green Hippo and Pixera synchronize Quick Pick, server and encoding settings. Simple and Advanced PDFs include clickable codec links; Resolume is labeled DXV3 CODEC.'
    ],
    features: [
      'Multi-page PDF report generation',
      'On-screen Preview quality, GPU acceleration & export accuracy guide',
      'Preview-independent source resolution, crops and annotation shadows',
      'Two output canvases per PDF or PPTX page when available',
      'Stable canvas order across report pages',
      'Print-aware 300-DPI raster cap with high-quality JPEG encoding',
      'Vector titles, details, and title blocks preserved for clarity',
      'Customizable page templates',
      'Title block with project metadata',
      'Header and footer configuration',
      'Selective pixel map inclusion',
      'Custom artwork/background support',
      'Page size options (A4, A3, Letter, custom)',
      'Landscape and portrait orientation',
      'Typography and font settings',
      'Technical specification tables',
      'Delivery specification pages with cleaner line spacing on the final page',
      'Advanced mode media server presets include Green Hippo and Pixera',
      'Quick-pick presets synchronize the Media Server dropdown and delivery details',
      'Pixel-map details include total pixel size and reduced + decimal aspect ratio',
      'Table of contents generation',
      'Company branding/logo placement',
      'Quality/resolution settings',
      'Batch export multiple projects'
    ],
    workflow: [
      'Read the preview/export accuracy guide; configure template and title block',
      'Select which pixel maps to include',
      'Confirm the nested output canvases and their stable order',
      'Arrange page layout and regions',
      'Add project metadata and specifications',
      'Verify each map details block shows pixel size and aspect ratio',
      'Choose a Video Delivery quick pick or Media Server dropdown; its server-specific details populate automatically',
      'Preview the PDF layout; use Help > Check GPU for desktop diagnostics',
      'Choose export settings (size, orientation, quality)',
      'Generate and save the compact print-quality PDF or paired-page PPTX document'
    ]
  },
  {
    title: 'Power Calculator',
    screenshot: '11-Power-Calc.png',
    subtitle: 'LED Wall Power Consumption Analysis',
    purpose: 'Calculate LED wall power requirements using real bench-measured amperage data from 65+ panel models.',
    description: [
      'The Power Calculator uses real bench-measured amperage data from professional testing labs to accurately calculate power consumption for LED wall installations. The database contains 65+ LED tile models across 10 major brands (Gloshine, Absen, Unilumin, Infiled, and more).',
      'For each selected model, the calculator provides per-tile amperage data across 5 color scenarios (Full Red, Full Green, Full Blue, Full White, and Standby) at both 100% and 50% brightness levels. It then scales these values based on your total tile count and voltage configuration.',
      'The tool calculates total current draw, active power (kW), apparent power (kVA with power factor), and recommends breaker sizes with a 1.25× safety factor. For 3-phase configurations, it shows per-phase load distribution ensuring balanced power delivery. Results can be exported as a professional PDF power report.'
    ],
    features: [
      '65+ LED models across 10 brands',
      'Real bench-measured amperage data',
      '5 color scenarios (R, G, B, White, Standby)',
      '100% and 50% brightness levels',
      'Configurable tile count (1-9999)',
      'Supply voltage selection (100-480V)',
      '1-Phase and 3-Phase configuration',
      'Active power calculation (kW)',
      'Apparent power calculation (kVA)',
      'Breaker sizing with 1.25× safety factor',
      'Per-phase load distribution analysis',
      'IEC standard breaker size recommendations',
      'Professional PDF power report export',
      'Color-coded scenario comparison cards'
    ],
    workflow: [
      'Select LED brand from dropdown',
      'Choose specific model (auto-populated based on brand)',
      'Set brightness level (100% or 50%)',
      'Enter total number of tiles',
      'Configure supply voltage (default: 230V)',
      'Select phase configuration (1-phase or 3-phase)',
      'Review power summary and scenario breakdown',
      'Export power report as PDF if needed'
    ]
  },
  {
    title: 'Utility Tools',
    screenshot: '12-Misc-Tools.png',
    subtitle: 'Aspect Ratio Calculator & LTC Generator',
    purpose: 'Quick-access utility tools for common AV calculations and timecode generation.',
    description: [
      'The Utility Tools tab houses two essential tools for AV professionals: an Aspect Ratio Calculator and a Linear Timecode (LTC) Generator. These tools provide quick access to common calculations needed during LED wall design and show programming.',
      'The Aspect Ratio Calculator has two modes: Custom Calculator (enter any resolution to find its aspect ratio and scaling options) and Universal Ratios (browse a comprehensive reference of standard display ratios from 1:1 through ultrawide formats). It helps ensure content is created at the correct proportions for your LED surfaces.',
      'The LTC (SMPTE Timecode) Generator creates standard timecode signals for synchronization purposes. It supports multiple frame rates (23.976, 24, 25, 29.97, 30 fps) and can generate timecode audio signals for triggering media servers and show control systems.'
    ],
    features: [
      'Aspect Ratio Calculator - Custom mode',
      'Aspect Ratio Calculator - Universal Ratios reference',
      'Calculate ratio from any resolution',
      'Scale resolution maintaining aspect ratio',
      'Common ratio presets (16:9, 4:3, 21:9, etc.)',
      'LTC/SMPTE Timecode Generator',
      'Multiple frame rate support (23.976 - 30fps)',
      'Timecode audio signal output',
      'Start/stop time configuration',
      'Real-time timecode display'
    ],
    workflow: [
      'Select the desired utility tool',
      'For Aspect Ratio: Enter resolution or select standard ratio',
      'Review calculated ratio and equivalent resolutions',
      'For LTC: Configure frame rate and start time',
      'Generate timecode signal as needed'
    ]
  },
  {
    title: 'Projector Test Pattern',
    screenshot: '13-Projector-Test-Pattern.png',
    subtitle: 'Projection Calculator & Test Patterns',
    purpose: 'Generate test patterns and calculate projection parameters for flat, curved, and circular surfaces.',
    description: [
      'The Projector Test Pattern tool is PixelLogic\'s projection mode centerpiece. It generates professional test patterns for projector alignment, edge-blending calibration, and geometry correction. The tool includes comprehensive calculators for three projection surface types: flat, curved, and circular/dome.',
      'The Flat Calculator computes throw distances, image sizes, lens shift requirements, and multi-projector overlap zones for standard flat-screen installations. The Curved Calculator handles cylindrical and custom-curve surfaces with wrap angle calculations. The Circular/Dome Calculator addresses planetarium-style and immersive dome projections.',
      'Test pattern generation includes grid patterns, crosshatch, color bars, focus charts, geometry test images, and custom resolution patterns. All patterns can be displayed fullscreen on connected displays for real-time projector calibration during installation.'
    ],
    features: [
      'Test pattern generation (grid, crosshatch, color bars, focus)',
      'Fullscreen pattern display on connected monitors',
      'Custom resolution pattern generation',
      'Flat projection calculator (throw distance, image size)',
      'Lens shift calculation',
      'Multi-projector overlap zone calculation',
      'Curved surface projection calculator',
      'Wrap angle and surface radius computation',
      'Circular/dome projection calculator',
      'Projector specification database',
      'Edge blend overlap visualization',
      'Geometric correction reference patterns'
    ],
    subtabs: [
      { name: 'Settings', description: 'Base projector and surface inputs, pattern type selection, rendering options' },
      { name: 'Flat Calculator', description: 'Standard flat-surface projection: throw ratio, distance, multi-projector layouts' },
      { name: 'Curved Calculator', description: 'Cylindrical/curved surface projection calculations with wrap angle' },
      { name: 'Circular/Dome Calculator', description: 'Dome and circular projection geometry, coverage calculations' }
    ],
    workflow: [
      'Select projection surface type (flat/curved/dome)',
      'Enter projector specifications (lens, throw ratio)',
      'Configure surface dimensions',
      'Calculate throw distance and image size',
      'For multi-projector: configure overlap and blending',
      'Generate appropriate test pattern',
      'Display fullscreen on projector for calibration'
    ]
  },
  {
    title: 'Rendering & GPU',
    screenshot: '15-Rendering-GPU.png',
    subtitle: 'Sharper Previews, Smoother Editing',
    purpose: 'Choose preview quality and inspect actual desktop graphics acceleration.',
    description: [
      'Full supports previews up to 8.3MP: native 3840 x 2160 at 100% quality. Lite caps at 1MP. Existing saved limits and the quality slider still apply; very large maps may be downscaled.',
      'Panel boundaries share rounded edges at fractional scales and borders scale proportionally. Output Maps reuse unchanged source images and combine rapid drag/zoom requests into animation frames.',
      'The bitmap cache retains at most 64MiB of pixel data and 128 entries. Oversized images render without being cached; source, logo and font changes refresh content. Coordinate overlays and composites render directly.',
      'Desktop acceleration is enabled by default subject to driver compatibility checks. Help > Check GPU reports the active device, renderer, detected GPUs and Canvas/compositing/rasterization status. A dedicated GPU may be available but not active.',
      'GPU acceleration improves performance, not the accuracy of project dimensions. Full-resolution export sources remain independent of preview mode; Advanced PDF artwork still follows its print-aware 300-DPI limit.'
    ],
    features: [
      'Full: up to 8.3MP; Lite: 1MP pixel-map previews',
      'Native 4K at 100% preview quality in Full mode',
      'Consistent panel edges and border widths at fractional scales',
      'Bounded source-image cache for Output Maps',
      'Drag and zoom redraws combined into animation frames',
      'Source edits, logo loading and font changes refresh images',
      'Native-pixel crops and full-resolution export sources',
      'Full-resolution annotation shadows independent of Lite mode',
      'Check GPU: actual desktop device and acceleration status',
      'Browser mode explicitly identifies browser-managed graphics',
      'Driver compatibility checks remain enabled'
    ],
    workflow: [
      'Choose Full in Help for sharper previews, or Lite for lower preview load',
      'Set preview quality to 100% when inspecting a native 4K map',
      'Open Help > Check GPU in the desktop app',
      'Compare the active GPU/renderer with detected devices',
      'On Windows: Settings > System > Display > Graphics',
      'Select Pixelogic > Options > High performance; restart the app',
      'Check GPU again; the OS and driver determine the active device',
      'For driver troubleshooting only: launch with PIXELLOGIC_DISABLE_GPU=1. Remove the override and restart to restore normal selection'
    ]
  },
  {
    title: 'External Output',
    screenshot: '17-External-Edit.png',
    subtitle: 'Edit and Present Multiple Maps',
    purpose: 'Arrange multiple maps directly on the external monitor, then show clean output.',
    description: [
      'Desktop only: connect another monitor, select Win+P > Extend, then open External Output in the header. The editor monitor is excluded; choose a connected secondary display.',
      'Select a pixel map or nested output canvas. Save PNG in Edit Mode exports the full canvas with maps aligned together to the top-left and exported X/Y coordinates. Spacing and live placement stay unchanged.',
      'Fit preserves aspect ratio with black letterboxing. 1:1 maps one source pixel to one physical display pixel, accounting for Windows scaling. Content is centered; oversized sources are clipped.',
      'Edit Mode supports Add map, dragging, corner handles, whole-pixel W/H and Scale X/Y percentages (100% = native resolution). Snap aligns edges/centers; Alt bypasses it. The top-right badge shows the working output size. Finish editing hides controls.',
      'Layout edits persist and affect canvas exports, without changing LED panel specifications. Live source updates run up to 10 times per second. Freeze and Blackout disable editing; display options do not change export settings. This is not genlocked playback.'
    ],
    features: [
      'One external display and one selected source per session',
      'Pixel-map sources become saved editable output canvases',
      'Full-resolution PNG with exported X/Y coordinates, independent of Full/Lite',
      'New maps start at 100%; 1:1 is default; Fit never changes saved scale',
      'Live / Freeze, independent Blackout, Stop and output Escape',
      'Optional annotations/logos and canvas drawings',
      'Add multiple independent instances of project pixel maps',
      'Drag positioning, corner resizing and precise X/Y/W/H values',
      'Keep aspect or free resizing; saved scale survives source refreshes',
      'Snap with alignment guides, output-resolution badge and pixel/percentage sizing',
      'Bottom toolbar: Hide controls / Show controls; Finish editing hides all overlays',
      'Masks: Ignore, Show fills, Inside only or Outside only',
      'Overlapping clipping masks form a union; no masks means no clipping',
      'Stops on disconnect, display reconfiguration, project change or source deletion',
      'No automatic restart or fallback onto the editor monitor',
      'Limits: 16384px per side, 64MP per surface, 128MP source budget, 500,000 panels per map'
    ],
    workflow: [
      'Connect a display and choose Win+P > Extend',
      'Open External Output; Refresh displays if necessary',
      'Select the external display and pixel map or nested canvas',
      'Choose Fit or 1:1 and explicit annotation, drawing and mask options',
      'Start output, then Close controls to continue editing live',
      'Enable Edit Mode to add, select, drag or resize maps on the monitor',
      'Use Snap for edge/center alignment; hold Alt to bypass snapping',
      'Enter W/H in whole pixels or Scale X/Y in percent; 100% is native resolution',
      'Keep aspect uses native proportions; 100% restores exact size; Shift resizes freely',
      'Choose Finish editing to hide handles and the toolbar',
      'Reopen controls to Freeze, Resume live or toggle Blackout',
      'Stop before changing the source or display; Escape in output also stops',
      'After unplugging or changing resolution, scaling or arrangement, select the display and restart explicitly',
      'Save PNG: top-left alignment, full canvas size, unchanged live layout; oversize clips'
    ]
  },
  {
    title: 'Help & Reference',
    screenshot: '14-Help.png',
    subtitle: 'Documentation & Tutorials',
    purpose: 'In-app documentation, keyboard shortcuts, workflow guides, and troubleshooting tips.',
    description: [
      'The Help tab provides comprehensive in-application documentation covering all features, keyboard shortcuts, workflow guides, and troubleshooting information. It serves as both a quick reference for experienced users and a learning resource for new users.',
      'Content includes feature descriptions for every tab, step-by-step workflow tutorials, keyboard shortcut reference, performance optimization tips, and known limitations. The "What\'s New" section highlights recent updates and added features.',
      'Full supports previews up to 8.3MP and Lite caps at 1MP. Check GPU identifies actual desktop acceleration; browser mode reports browser-managed graphics. Troubleshooting covers Windows GPU selection and the software-rendering startup override.',
      'Start App Tour now covers Output Map renaming, sharper previews, smoother editing and preview-independent exports, alongside earlier geometry, stage, routing and PDF/PPTX improvements. The Tutorial PDF and PDF Export guidance describe the same workflows.'
    ],
    features: [
      'Complete feature documentation',
      'Keyboard shortcuts reference',
      'Step-by-step workflow tutorials',
      'What\'s New changelog',
      'Full (8.3MP) / Lite (1MP) pixel-map preview modes',
      'Check GPU with active renderer and detected device details',
      'Troubleshooting guides',
      'Start App Tour button with updated guided walkthrough content',
      'Tips and best practices',
      'System requirements information',
      'Export format specifications',
      'Contact and support information'
    ],
    workflow: [
      'Open Help tab for documentation',
      'Browse by topic or search for specific features',
      'Follow workflow guides for new features',
      'Check troubleshooting for common issues',
      'Choose Full for detail or Lite if experiencing lag',
      'Check GPU and follow the Windows High performance instructions',
      'Use Start App Tour or open Tutorial PDF to revisit recent updates'
    ]
  }
];

// ============================================================================
// PDF Generation
// ============================================================================

function createPDF() {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Pre-calculate target page numbers for each section (1-indexed for jsPDF internal pages)
  // Page 1 = Cover, Page 2 = TOC, then sections start at page 3
  const sectionPageMap = [];
  let pg = 3;
  for (let i = 0; i < TUTORIAL_SECTIONS.length; i++) {
    sectionPageMap.push(pg); // overview page
    pg += 2; // overview + details
    if (TUTORIAL_SECTIONS[i].subtabs) pg++; // subtabs page
  }

  // ---- Cover Page ----
  renderCoverPage(doc);

  // ---- Table of Contents ----
  doc.addPage();
  renderTableOfContents(doc, sectionPageMap);

  // ---- Tutorial Sections ----
  let pageNum = 2;
  for (let i = 0; i < TUTORIAL_SECTIONS.length; i++) {
    const section = TUTORIAL_SECTIONS[i];

    // Page 1: Screenshot + Overview
    doc.addPage();
    pageNum++;
    renderSectionOverview(doc, section, i + 1, pageNum);

    // Page 2: Features + Workflow
    doc.addPage();
    pageNum++;
    renderSectionDetails(doc, section, i + 1, pageNum);

    // Page 3: Subtabs (if any)
    if (section.subtabs && section.subtabs.length > 0) {
      doc.addPage();
      pageNum++;
      renderSubtabs(doc, section, i + 1, pageNum);
    }
  }

  // ---- Quick Reference Page ----
  doc.addPage();
  pageNum++;
  renderQuickReference(doc, pageNum);

  // Save
  const outputPath = path.join(__dirname, '..', 'external-files', 'Tutorial_pixel logic.pdf');
  const buffer = Buffer.from(doc.output('arraybuffer'));
  fs.writeFileSync(outputPath, buffer);
  console.log(`\n✓ Tutorial PDF generated: ${outputPath}`);
  console.log(`  Pages: ${doc.getNumberOfPages()}`);
  console.log(`  Size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
}

// ============================================================================
// Page Renderers
// ============================================================================

function renderCoverPage(doc) {
  // Dark background
  doc.setFillColor(...COLORS.dark);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  // Gradient accent bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, PAGE_W, 4, 'F');
  doc.setFillColor(...COLORS.secondary);
  doc.rect(0, PAGE_H - 4, PAGE_W, 4, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(48);
  doc.setTextColor(...COLORS.text);
  doc.text('PixelLogic', PAGE_W / 2, 65, { align: 'center' });

  // Subtitle
  doc.setFontSize(24);
  doc.setTextColor(...COLORS.textMuted);
  doc.text('Complete Application Tutorial', PAGE_W / 2, 82, { align: 'center' });

  // Version info
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.accent);
  doc.text(`Version ${APP_VERSION}`, PAGE_W / 2, 98, { align: 'center' });

  // Description box
  doc.setFillColor(...COLORS.darkBg);
  roundedRect(doc, 60, 110, PAGE_W - 120, 45, 4);

  doc.setFontSize(11);
  doc.setTextColor(...COLORS.textMuted);
  const descLines = [
    'Professional LED wall design, pixel mapping, and AV engineering tool.',
    'This tutorial covers all tabs and features with screenshots and detailed explanations.',
    'Designed for AV technicians, LED engineers, and production designers.'
  ];
  descLines.forEach((line, i) => {
    doc.text(line, PAGE_W / 2, 124 + (i * 12), { align: 'center' });
  });

  // Footer
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.textMuted);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, PAGE_W / 2, PAGE_H - 15, { align: 'center' });
  doc.text('Author: Dhiraj Kalra', PAGE_W / 2, PAGE_H - 22, { align: 'center' });
}

function renderTableOfContents(doc, sectionPageMap) {
  // Background
  doc.setFillColor(...COLORS.dark);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
  renderHeader(doc, 'Table of Contents', '');

  const startY = 38;
  const lineHeight = 10;
  const colWidth = CONTENT_W / 2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  TUTORIAL_SECTIONS.forEach((section, i) => {
    const col = i < 7 ? 0 : 1;
    const row = i < 7 ? i : i - 7;
    const x = MARGIN + (col * colWidth) + 5;
    const y = startY + (row * lineHeight);
    const targetPage = sectionPageMap[i];

    // Number badge
    doc.setFillColor(...COLORS.primary);
    doc.circle(x + 3, y - 1.5, 3.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(String(i + 1), x + 3, y - 0.5, { align: 'center' });

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.text);
    doc.text(section.title, x + 10, y);

    // Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textMuted);
    doc.text(section.subtitle, x + 10, y + 4.5);

    // Page number
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.accent);
    const pageLabel = `Page ${targetPage}`;
    doc.text(pageLabel, x + colWidth - 20, y);

    // Clickable link covering the entire TOC entry row
    const linkX = x;
    const linkY = y - 5;
    const linkW = colWidth - 10;
    const linkH = lineHeight;
    doc.link(linkX, linkY, linkW, linkH, { pageNumber: targetPage });
  });

  // Footer with section count
  const lastPage = sectionPageMap[sectionPageMap.length - 1] + 1 + (TUTORIAL_SECTIONS[TUTORIAL_SECTIONS.length - 1].subtabs ? 1 : 0);
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.textMuted);
  doc.text(`${TUTORIAL_SECTIONS.length} sections • ${lastPage + 1} total pages`, PAGE_W / 2, PAGE_H - 12, { align: 'center' });

  renderFooter(doc, 2);
}

function renderSectionOverview(doc, section, sectionNum, pageNum) {
  // Background
  doc.setFillColor(...COLORS.dark);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  // Header
  renderHeader(doc, `${sectionNum}. ${section.title}`, section.subtitle);

  // Screenshot
  const jpgName = section.screenshot.replace('.png', '.jpg');
  const screenshotPathOpt = path.join(SCREENSHOTS_DIR_OPT, jpgName);
  const screenshotPathOrig = path.join(SCREENSHOTS_DIR_ORIG, section.screenshot);
  const screenshotPath = USE_OPTIMIZED && fs.existsSync(screenshotPathOpt) ? screenshotPathOpt : screenshotPathOrig;
  const isJpeg = screenshotPath.endsWith('.jpg');
  if (fs.existsSync(screenshotPath)) {
    try {
      const imgData = fs.readFileSync(screenshotPath);
      const base64 = imgData.toString('base64');
      const mimeType = isJpeg ? 'image/jpeg' : 'image/png';
      const imgDataUri = `data:${mimeType};base64,` + base64;
      const imgFormat = isJpeg ? 'JPEG' : 'PNG';

      // Calculate image dimensions (fit in right half)
      const imgAreaW = CONTENT_W * 0.55;
      const imgAreaH = CONTENT_H - 30;
      const imgAspect = 1920 / 1080;
      let imgW = imgAreaW;
      let imgH = imgW / imgAspect;
      if (imgH > imgAreaH) {
        imgH = imgAreaH;
        imgW = imgH * imgAspect;
      }

      const imgX = PAGE_W - MARGIN - imgW;
      const imgY = 35;

      // Image border
      doc.setDrawColor(...COLORS.cardBg);
      doc.setLineWidth(0.5);
      doc.rect(imgX - 1, imgY - 1, imgW + 2, imgH + 2, 'S');

      doc.addImage(imgDataUri, imgFormat, imgX, imgY, imgW, imgH);
    } catch (e) {
      console.warn(`  Warning: Could not embed screenshot ${section.screenshot}: ${e.message}`);
    }
  } else {
    console.warn(`  Warning: Screenshot not found: ${screenshotPath}`);
  }

  // Text content (left side)
  const textW = CONTENT_W * 0.40;
  const textX = MARGIN;
  let textY = 38;

  // Purpose badge
  doc.setFillColor(...COLORS.cardBg);
  roundedRect(doc, textX, textY, textW, 14, 3);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.accent);
  doc.text('PURPOSE', textX + 4, textY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.text);
  const purposeLines = doc.splitTextToSize(section.purpose, textW - 8);
  doc.text(purposeLines, textX + 4, textY + 10);

  textY += 20;

  // Description
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.textMuted);

  section.description.forEach((para) => {
    const lines = doc.splitTextToSize(para, textW - 4);
    doc.text(lines, textX + 2, textY);
    textY += lines.length * 3.8 + 4;
  });

  renderFooter(doc, pageNum);
}

function renderSectionDetails(doc, section, sectionNum, pageNum) {
  // Background
  doc.setFillColor(...COLORS.dark);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  renderHeader(doc, `${sectionNum}. ${section.title} — Features & Workflow`, '');

  // Features (left column)
  const colW = CONTENT_W / 2 - 5;
  let y = 36;

  doc.setFillColor(...COLORS.darkBg);
  roundedRect(doc, MARGIN, y, colW, CONTENT_H - 22, 3);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.success);
  doc.text('Key Features', MARGIN + 5, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.text);

  section.features.forEach((feature) => {
    if (y > PAGE_H - 25) return; // Don't overflow
    doc.setFillColor(...COLORS.success);
    doc.circle(MARGIN + 8, y - 1, 1, 'F');
    const lines = doc.splitTextToSize(feature, colW - 18);
    doc.text(lines, MARGIN + 12, y);
    y += lines.length * 3.5 + 2;
  });

  // Workflow (right column)
  const rightX = MARGIN + colW + 10;
  y = 36;

  doc.setFillColor(...COLORS.darkBg);
  roundedRect(doc, rightX, y, colW, CONTENT_H - 22, 3);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.warning);
  doc.text('Typical Workflow', rightX + 5, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.text);

  section.workflow.forEach((step, i) => {
    if (y > PAGE_H - 25) return;

    // Step number
    doc.setFillColor(...COLORS.warning);
    doc.circle(rightX + 8, y - 1.5, 4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(String(i + 1), rightX + 8, y - 0.5, { align: 'center' });

    // Step text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.text);
    const lines = doc.splitTextToSize(step, colW - 20);
    doc.text(lines, rightX + 15, y);
    y += lines.length * 4 + 5;
  });

  renderFooter(doc, pageNum);
}

function renderSubtabs(doc, section, sectionNum, pageNum) {
  // Background
  doc.setFillColor(...COLORS.dark);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  renderHeader(doc, `${sectionNum}. ${section.title} — Subtabs`, '');

  let y = 38;
  const cardH = 28;

  section.subtabs.forEach((subtab, i) => {
    // Card background
    doc.setFillColor(...COLORS.cardBg);
    roundedRect(doc, MARGIN, y, CONTENT_W, cardH, 3);

    // Subtab number
    doc.setFillColor(...COLORS.accent);
    roundedRect(doc, MARGIN + 5, y + 4, 20, 8, 2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(`Tab ${i + 1}`, MARGIN + 15, y + 9, { align: 'center' });

    // Subtab name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.text);
    doc.text(subtab.name, MARGIN + 30, y + 10);

    // Description
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.textMuted);
    const descLines = doc.splitTextToSize(subtab.description, CONTENT_W - 40);
    doc.text(descLines, MARGIN + 30, y + 17);

    y += cardH + 5;
  });

  renderFooter(doc, pageNum);
}

function renderQuickReference(doc, pageNum) {
  // Background
  doc.setFillColor(...COLORS.dark);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  renderHeader(doc, 'Quick Reference — All Tabs at a Glance', '');

  const colW = CONTENT_W / 3 - 3;
  const startY = 36;
  let col = 0;
  let y = startY;

  TUTORIAL_SECTIONS.forEach((section, i) => {
    if (y > PAGE_H - 30) {
      col++;
      y = startY;
    }

    const x = MARGIN + col * (colW + 5);

    // Mini card
    doc.setFillColor(...COLORS.darkBg);
    roundedRect(doc, x, y, colW, 11, 2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.primary);
    doc.text(`${i + 1}.`, x + 3, y + 4.5);

    doc.setTextColor(...COLORS.text);
    doc.text(section.title, x + 10, y + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...COLORS.textMuted);
    const purposeShort = section.purpose.length > 55 ? section.purpose.slice(0, 55) + '...' : section.purpose;
    doc.text(purposeShort, x + 3, y + 9);

    y += 13;
  });

  // Tips section
  const tipsY = PAGE_H - 50;
  doc.setFillColor(...COLORS.cardBg);
  roundedRect(doc, MARGIN, tipsY, CONTENT_W, 35, 3);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.warning);
  doc.text('Pro Tips', MARGIN + 5, tipsY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.text);
  const tips = [
    '• Use Ctrl+S to quick-save your project at any time',
    '• Switch between Pixelogic and Projection Logic modes using the mode toggle in the header',
    '• Export your work frequently — use JSON backup for complete project preservation',
    '• The Power Calculator uses real lab-measured data, not manufacturer specifications',
    '• All tools work offline — no internet connection required after installation'
  ];
  tips.forEach((tip, i) => {
    doc.text(tip, MARGIN + 5, tipsY + 14 + (i * 4.5));
  });

  renderFooter(doc, pageNum);
}

// ============================================================================
// Utility Functions
// ============================================================================

function renderHeader(doc, title, subtitle) {
  // Header bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, PAGE_W, 3, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...COLORS.text);
  doc.text(title, MARGIN, 14);

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.textMuted);
    doc.text(subtitle, MARGIN, 21);
  }

  // Separator line
  doc.setDrawColor(...COLORS.cardBg);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, 25, PAGE_W - MARGIN, 25);
}

function renderFooter(doc, pageNum) {
  const y = PAGE_H - 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.textMuted);
  doc.text('PixelLogic Tutorial', MARGIN, y);
  doc.text(`Page ${pageNum}`, PAGE_W - MARGIN, y, { align: 'right' });
  doc.text('www.pixelogic.live', PAGE_W / 2, y, { align: 'center' });
}

function roundedRect(doc, x, y, w, h, r) {
  doc.roundedRect(x, y, w, h, r, r, 'F');
}

// ============================================================================
// Run
// ============================================================================

console.log('PixelLogic Tutorial PDF Generator');
console.log('==================================');
console.log(`Screenshots (optimized): ${SCREENSHOTS_DIR_OPT}`);
console.log(`Screenshots (original): ${SCREENSHOTS_DIR_ORIG}`);
console.log(`Using: ${USE_OPTIMIZED ? 'optimized JPEG' : 'original PNG'}`);
console.log(`Sections: ${TUTORIAL_SECTIONS.length}`);
console.log('');
console.log('Generating PDF...');

createPDF();
