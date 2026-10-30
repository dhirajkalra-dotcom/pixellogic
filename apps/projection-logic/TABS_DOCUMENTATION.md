# PixelLogic — Complete Tab Documentation

> Thorough documentation of every tab in the PixelLogic application.

---

## Current Workflow Updates

- **Projects**: `Save` persists the current project without moving or closing its editable card. Auto-save runs every three minutes by default and can be disabled from the Projects tab.
- **Pixel Designer**: screen Width and Height synchronize with Tiles Across and Tiles High in both directions.
- **Output Maps**: source-map updates refresh an existing output map while retaining its canvas placement and crop. Select masks directly; move and resize them tile-by-tile, or hold Shift for precise polygon vertices.
- **Output Map naming**: Rename beside the top-level tabs changes the parent Output Map independently of nested canvas names. Save/Enter persists; Cancel leaves it unchanged; blank names are rejected.
- **Rendering & GPU**: Full supports up to 8.3MP (native 4K at 100% quality); Lite caps previews at 1MP. Bounded source-image caching and frame-coalesced redraws improve Output Map editing. Help > Check GPU reports actual desktop acceleration and explains Windows High performance selection.
- **Export accuracy**: preview mode no longer downscales export sources or crop coordinates. Advanced PDF image encoding still follows its print-aware 300-DPI limit.
- **External Output**: the desktop header opens controls for one clean extended-monitor window showing a pixel map or one nested output canvas. Fit / physical-pixel 1:1, Live / Freeze, independent Blackout and explicit annotations/drawings/masks are supported.
- **Help, PDF Export and Start App Tour**: updated guidance covers these changes alongside earlier workflow updates. The Tutorial PDF includes a dedicated Rendering & GPU chapter. Regenerate the bundled document with `node scripts\generate-tutorial-pdf.js`; the app opens `external-files/Tutorial_pixel logic.pdf`, not the older root-level PDF.
- **Windows releases**: the main `npm run build` pipeline bumps the patch version, rebuilds CSS and regenerates the Tutorial PDF with the matching app version before packaging. Publishing is disabled unless explicitly requested through `ELECTRON_BUILDER_PUBLISH`. Nested product workspaces are excluded from the main package.
- **Video Delivery Specifications**: Quick Pick and the Media Server dropdown stay synchronized. Choosing a server applies its matching codec, links, quality, frame rate, audio, still-frame, and naming values.
- **Codec download links**: Simple and Advanced PDF exports include clickable codec download URLs. Resolume links are labeled **DXV3 CODEC**, while HAP and Notch LC presets retain their matching labels. PowerPoint uses the same labels.

---

## External Display Output

1. Connect a second display. On Windows choose **Win+P > Extend**, not Duplicate.
2. Open **External Output** in the header. Select a display other than the editor monitor; use **Refresh displays** after changing connections.
3. Select a pixel map or **Output Map / nested canvas**. This selects one canvas, not the multi-canvas editor workspace.
4. **1:1** is the default (one source pixel per physical display pixel, centered and clipped if larger). Choose **Fit** for an aspect-preserving view with black letterboxing. Fit changes the display view, not saved map scale. Windows display scaling is accounted for.
5. Choose map annotations/logos, canvas drawings, and masks: **Ignore**, **Show fills**, **Inside only**, or **Outside only**. Clipping includes drawings, overlapping masks form a union, and no masks means no clipping. Clean mode hides editing controls.
6. Select **Start output**, then **Close controls** to keep editing. Reopen controls to **Freeze**, **Resume live**, **Blackout**, or **Stop output**. Blackout is independent of Freeze; restoring a frozen output restores the held image, and Resume shows the latest source edits.
7. Stop before changing the source or display. Escape while the output window has focus also stops output.

### Editing directly on the monitor

Enable **Edit Mode on the external monitor**, before or after starting output. For a pixel-map source this creates a saved **External Layout** canvas at the selected monitor's physical resolution, with the map centered at native 100% size regardless of Fit/1:1 view. Selecting an existing output canvas preserves and edits its saved layout directly.

- Editing controls are docked at the **bottom**. **Hide controls** collapses them to a small **Show controls** bar; maps remain draggable/resizable, and the output-size badge stays at the top-right. Expand/collapse does not change the layout or export. On smaller windows the expanded controls scroll. **Finish editing** hides the bar and all other editing overlays.
- Use **Add map** to add any pixel map from the active project, including multiple independent instances of the same source. New instances start at 100% on both axes, even if larger than the canvas; they are clipped, not automatically scaled.
- Click a map or choose it in the **Map** list, then drag it into position. Corner handles resize it; **X/Y/W/H** provide precise values in canvas pixels.
- **Snap** aligns with output-canvas edges/center and other maps' edges/centers, including cropped visible edges. It applies during dragging and resizing, with a 10-screen-pixel threshold and yellow alignment guides. Hold Alt to bypass snapping temporarily.
- The **top-right output-size badge** shows the working canvas resolution (for example, `3840 x 2160 px`), not the selected map size or the editor window size.
- **W/H (px)** accept whole-pixel dimensions. **Scale X/Y (%)** are relative to the map's native pixel resolution: 100% is native size. Pixel sizes and percentages update together; percentage-derived and pointer-resized dimensions round to the nearest whole pixel. Percent readouts use two-decimal precision. Exact numeric entries are not altered by snapping.
- **Keep aspect** is enabled by default and uses the native map proportions, not previously rounded dimensions. Enter 100% on either scale axis to restore exact native width and height (for example, 2560 x 1280). Disable it or hold Shift while dragging a corner to resize freely. Some other sizes necessarily round to whole pixels, but that rounding is not reused as the aspect ratio for later resizes.
- **Remove map** or Delete removes only that placed instance, not the source pixel map.
- **Finish editing** hides the toolbar, size badge, outlines, handles and snap guides. E toggles editing when a canvas is active. Freeze and Blackout turn editing off.
- Edits save immediately to the project and remain available in Output Maps and canvas exports. Scaling is independent per instance and survives source refreshes and project reloads; a source-resolution change retains the saved relative scale. LED dimensions, panel resolution and pixel-map exports are unchanged.

Pointer motion is rendered locally with animation-frame coalescing; final geometry is sent to the main editor on release and explicitly acknowledged. Fit letterboxing, physical-pixel 1:1 clipping and Windows display scaling are accounted for in pointer coordinates. Rejected edits report an error and restore the authoritative layout.

### Saving a PNG from the external monitor

In **Edit Mode**, select **Save PNG** and choose a destination in the save dialog.

- The PNG retains the full output-canvas resolution, such as `3840 x 2160`, independent of Fit, window size, Windows scaling and preview quality.
- All maps move together in the export so the combined visible map bounds start at `(0, 0)`. Map sizes, order and relative spacing are preserved. With a staggered arrangement, the leftmost and topmost maps can be different maps; maps are not rearranged into rows.
- Each map has its exported **X/Y coordinates** printed at the top-right, even if other annotations are disabled. Coordinates refer to the visible top-left after cropping and alignment, not the original live placement.
- Enabled drawings and masks shift by the same offset as the maps. Their existing visibility/clipping options remain in effect. The background is black, and editor controls, handles and snap guides are excluded.
- The live display and saved project geometry are not changed. Canceling the dialog writes nothing. If the arranged maps exceed the full canvas size, the PNG clips them and reports a warning; it never silently scales them to fit.
- Resume live output and disable Blackout before entering Edit Mode to save. Empty or fully cropped layouts and file-writing errors are reported explicitly.

The source stays pinned while other editor tabs/maps/canvases are selected. Switching projects or removing the selected source stops output. Closing/reloading the editor, renderer failures, unplugging the display, or changing display resolution/scaling/arrangement also stops output. It never automatically restarts on another monitor; select a valid display and restart explicitly.

The independent context-isolated Electron window uses the shared map renderer, not screenshots or PNG streaming. Changed source data is reconciled up to 10 times per second while running, including edits outside the active editor tab. IPC frames are coalesced with renderer acknowledgements. Output uses full-resolution source pixels independently of Full/Lite settings. Display options do not alter export settings, but saved canvas layout edits are reflected in canvas exports.

This first version supports one external display. It is not genlocked playback, a media server, or a guarantee of color calibration, HDR consistency, or monitor processing bypass. Per-surface limits are 16384 pixels per side and 64MP, with a 128MP source-rendering budget and 500,000 panels per map; unsupported output produces an explicit error. Browser mode explains that the desktop application is required.

Validation:
- `node --test scripts\rendering-engine.test.cjs scripts\external-output.test.cjs scripts\external-output-editing.test.cjs scripts\tutorial-docs.test.cjs`
- `scripts\external-output-smoke.cjs` runs with Electron and an isolated `PIXELLOGIC_TEST_USER_DATA` directory. It exercises real preloads, controls and rendering using a simulated display topology without taking over a physical output monitor; it also refreshes the tutorial screenshot. Physical-monitor fullscreen placement still needs a manual extended-desktop check.

---

## 1. Projects

**Purpose**: Central hub for creating, managing, and organizing LED pixel map projects.

**Description**: The Projects tab is the entry point for every workflow in PixelLogic. It features a two-panel layout: the left panel handles new and draft (unsaved) projects, while the right panel displays all previously saved projects with colored accent indicators. Each project stores metadata including name, event date, event time, location, salesperson, venue, and client information.

Draft projects remain in the working area while their details are edited and saved. The Save button persists the details without closing or moving the project, while the optional Auto-save control is enabled by default and saves every three minutes. Saved projects are reserved for projects you explicitly archive and appear in a scrollable list with multi-select support (including a Select All checkbox) for bulk operations like deletion. The tab also provides a comprehensive Backup & Restore system that allows exporting all projects, exporting just the current project, or importing project data with merge or full-replace strategies — all using JSON format.

Every other tab in PixelLogic depends on an active project being selected, making Projects the mandatory starting point before any design, effects, or export work can begin.

**Key Features**:
- Two-panel layout: Draft Projects (left) and Saved Projects (right)
- Project metadata fields: name, event date, event time, location, salesperson, venue, client
- Draft project actions: rename, delete, save details in place, optional three-minute auto-save
- Saved project actions: reopen, delete, multi-select, bulk delete
- Backup & Restore: Export All, Export Current, Import (Merge), Import (Replace All) as JSON
- Select All checkbox for saved projects
- Color-coded accent indicators on saved projects

**Controls**:
- New Project name input + Create button
- Save / Delete / Rename buttons per draft project
- Reopen / Delete buttons per saved project
- Select All checkbox
- Export All / Export Current / Import (Merge) / Import (Replace All) buttons

**Subtabs**: None

**Workflow**:
1. Enter a project name in the input field and click Create
2. Fill in project details (event date, time, location, salesperson, venue)
3. Click Save to persist details while keeping the project open; leave Auto-save enabled for periodic backups
4. Select a saved project to make it active across all other tabs
5. Use Export/Import for backup and sharing between installations

---

## 2. Pixel Designer

**Purpose**: Core LED pixel map editor for defining physical screen dimensions, panel specifications, and visual styling.

**Description**: The Pixel Designer is the primary design workspace where LED screen geometry is defined. It uses a tabbed sub-navigation system allowing multiple pixel maps within a single project, each displayed as a color-coded tab cycling through 8 distinct accent colors for instant visual identification. The editor provides precise control over LED screen dimensions (width and height in meters, centimeters, millimeters, feet, or inches) and LED panel specifications including panel physical size and resolution.

Visual styling is split into two modes: Gradient and Checker. Gradient mode supports linear and radial gradients with palette presets (Sunrise, Ocean, Passion, Forest, Amethyst) plus custom color stops and angle control. Checker mode offers an extensive library of 50+ preset palettes including professional test patterns (SMPTE-style color bars). Both modes support saved custom palettes stored in localStorage.

Panel-level detail controls include numbering styles (sequential, row-letter, column-letter, row-column numeric, column-row numeric), number color, font size, and border styles (solid, dashed, dotted). A composite map feature allows composing multiple maps together with configurable placement direction and gap spacing.

**Key Features**:
- Color-coded map tabs (8 cycling palette colors)
- LED screen dimension inputs with unit system (m/cm/mm/ft/in)
- LED panel specifications: physical size (mm), resolution (W×H pixels)
- Resolution presets dropdown
- Gradient fill: linear/radial, palette presets, custom colors, angle
- Checker fill: 50+ preset palettes including SMPTE-style test patterns
- Panel numbering: 5 styles with customizable color and font size
- Panel border styling: solid/dashed/dotted
- Composite map composition with placement direction and gap
- Saved custom palettes in localStorage
- Duplicate Map and Delete Map actions

**Controls**:
- Map name input
- Screen width/height inputs with unit selector
- Panel width/height inputs (mm) with unit selector
- Panel resolution width/height inputs
- Resolution presets dropdown
- Gradient/Checker style selector
- Palette preset buttons
- Numbering style dropdown
- Number color picker, font size slider
- Border style selector
- Add Map (+), Duplicate Map, Delete Map buttons
- Composite: placement direction (right/left/top/bottom), gap input

**Subtabs**: Multiple pixel map tabs (dynamically created, color-coded)

**Workflow**:
1. Select or create a project in the Projects tab
2. Set LED screen physical dimensions and unit system
3. Configure panel specifications (size and resolution)
4. Choose a visual fill style (Gradient or Checker) and select or customize a palette
5. Configure panel numbering and border style
6. Optionally add additional maps using the + button
7. Use Duplicate Map to branch alternate designs. Rename the copy in **Pixel Map Name**; Enter saves while keeping the field editable, and clicking outside saves without interrupting Duplicate or map-tab selection. Names are persisted without restarting the app.
8. Compose multiple maps using the composite feature if needed

---

## 3. Special Effects

**Purpose**: Apply visual overlays, markers, badges, logos, and color bars to pixel maps for presentation and testing.

**Description**: The Special Effects tab provides a rich set of overlay and decoration tools that can be applied on top of the pixel map geometry defined in the Pixel Designer. It features a live preview panel with comprehensive zoom controls (in, out, actual size, fit to view, 100%) and a quality slider for balancing rendering speed against fidelity. A thumbnail strip at the bottom shows all pixel maps in the current project for quick selection.

The core feature set includes a Center Badge system with toggle, size slider, text size, line spacing, opacity, fill color, gradient/3D effects, and the option to include metrics. Overlays and markers comprise coordinates overlay with font size control, Center Circle (solid/dashed/dotted with gradient and shadow options), Corner Circles with style and radius controls, Center Cross with gradient and shadow options, and Corner Markers — all with shared color, thickness, and circle radius customization.

Additional overlay capabilities include Logo Overlay (file upload with position presets for center and corners, size and opacity controls) and Color Bars (SMPTE, RGBW, RGB presets with configurable position, thickness, length, and opacity). Output options include Send to Canvas, Save PNG (with transparent background option), and font selection for info text. All settings combine to create comprehensive pixel map presentations suitable for client review and technical specification.

**Key Features**:
- Live preview with zoom controls (in/out/actual/fit/100%)
- Quality slider for preview rendering
- Pixel map thumbnail strip for quick map selection
- Center Badge: toggle, size, text size, line spacing, opacity, fill color, metrics, gradient/3D
- Coordinates overlay with font size
- Center Circle: solid/dashed/dotted, gradient, shadow
- Corner Circles: style, radius
- Center Cross: style, gradient, shadow
- Corner Markers
- Shared marker customization: color, thickness, circle radius
- Logo Overlay: file upload, position (center/4 corners), size, opacity, clear
- Color Bars: SMPTE/RGBW/RGB presets, position, thickness, length, opacity
- Font selection for info text
- Send to Canvas, Save PNG (with transparent option)

**Controls**:
- Zoom in/out/actual/fit/100% buttons
- Quality slider
- Center Badge toggle and all sub-controls (sliders, color pickers, checkboxes)
- Overlay toggles for coordinates, circles, crosses, corner markers
- Marker color picker, thickness slider, radius slider
- Logo file upload, position selector, size and opacity sliders, clear button
- Color bars preset selector, position/thickness/length/opacity inputs
- Font family dropdown
- Send to Canvas button
- Save PNG button with transparent checkbox

**Subtabs**: None

**Workflow**:
1. Select a pixel map from the thumbnail strip
2. Enable desired overlays (coordinates, center circle, corner markers, etc.)
3. Customize overlay appearance (colors, thickness, styles)
4. Add a Center Badge if metrics or branding are needed
5. Upload a logo and position it on the map
6. Add color bars for technical testing patterns
7. Use the zoom controls to review details
8. Click Send to Canvas to push to Output Maps, or Save PNG to export directly

---

## 4. 2D Visualizer

**Purpose**: Full-resolution interactive preview of pixel maps with export capabilities and map combining.

**Description**: The 2D Visualizer provides a clean, interactive preview of the currently active pixel map at full resolution. It includes synchronized top and left canvas rulers for precise measurement reference, along with comprehensive zoom controls (Zoom In, Zoom Out, Fit to View, Actual Pixels, and 100%). A thumbnail strip at the bottom displays all pixel maps in the project, and keyboard navigation (Left/Right arrow keys) allows quick cycling through maps.

Export functionality includes Save PNG, Save JPG, and Save All PNGs (batch export of every map). A transparent background option is available for PNG exports. The Send to Output Canvas button pushes the current map directly onto an Output Canvas for composition work.

The Combine feature allows merging up to 5 additional maps alongside the active map, with a configurable placement direction. Quick Combine offers a two-map shortcut with a secondary map dropdown and placement selector. The Make Map button creates the composite as a new map entity.

**Key Features**:
- Full-resolution interactive preview
- Synchronized top and left canvas rulers
- Zoom controls: in/out/fit/actual/100%
- Keyboard navigation: Left/Right arrow keys to cycle maps
- Pixel map thumbnail strip for quick selection
- Export: Save PNG, Save JPG, Save All PNGs
- Transparent PNG option
- Send to Output Canvas
- Combine feature: multi-select up to 5 maps, placement direction, Make Map
- Quick Combine: 2-map shortcut with dropdown and placement selector

**Controls**:
- Zoom in/out/fit/actual/100% buttons
- Save PNG button, Save JPG button, Save All PNGs button
- Transparent checkbox
- Send to Output Canvas button
- Combine: map multi-select, placement direction selector, Make Map button
- Quick Combine: secondary map dropdown, placement selector
- Thumbnail strip (click to activate map)

**Subtabs**: None

**Workflow**:
1. View the active pixel map in full resolution
2. Use zoom controls or rulers to verify dimensions
3. Use arrow keys or thumbnail strip to switch between maps
4. Optionally combine multiple maps using the Combine feature
5. Export as PNG/JPG or send to Output Canvas for further composition

---

## 5. 3D Visualizer

**Purpose**: WebGL 3D perspective preview of pixel maps with interactive camera controls and multi-map composition.

**Description**: The 3D Visualizer renders pixel maps in a three-dimensional perspective view using canvas-based 3D rendering. It includes a View Cube with preset camera angles (Top, Front, Right, Left, Back, Bottom) and supports both a Native Canvas 3D backend and an optional Unity WebGL backend (with configurable loader, data, framework, and code URLs).

The 3D Layout Composer allows selecting multiple maps and arranging them in 3D space with placement direction (right, left, top, bottom) and gap control. Transform tools include Orbit (Q), Move (W), Rotate (E), and Scale (R) keyboard shortcuts, with the currently selected map indicated in the UI. Per-map transforms provide independent control over X position, Z position, Y rotation, and scale.

Display options include toggles for Depth Grid, X/Y/Z Axis indicators, UV Overlay with opacity slider, and Grid Density control. An Auto Revolve feature continuously rotates the scene with an adjustable speed slider. UV texture mapping applies pixel map data as textures onto the 3D geometry for realistic visualization.

**Key Features**:
- Canvas-based 3D rendering with View Cube (6 preset angles)
- Render backend: Native Canvas 3D or Unity WebGL (configurable URLs)
- 3D Layout Composer: multi-map select, placement direction, gap control
- Transform tools: Orbit (Q), Move (W), Rotate (E), Scale (R)
- Per-map transforms: X, Z, rotY, scale
- Auto Revolve with speed slider
- Display toggles: Depth Grid, X/Y/Z Axis, UV Overlay (with opacity), Grid Density
- Reset View button
- UV texture mapping from pixel map data

**Controls**:
- View Cube: Top/Front/Right/Left/Back/Bottom preset buttons
- Transform tool buttons: Orbit, Move, Rotate, Scale
- Multi-map selector for layout composer
- Placement direction (right/left/top/bottom)
- Gap input
- Per-map transform inputs (X, Z, rotY, scale)
- Auto Revolve toggle + speed slider
- Depth Grid / Axis / UV Overlay / Grid Density toggles
- UV Overlay opacity slider
- Reset View button

**Subtabs**: None

**Workflow**:
1. Navigate to the 3D Visualizer with an active project
2. Use the View Cube or mouse drag to explore the 3D scene
3. Select multiple maps in the Layout Composer and arrange them
4. Adjust per-map transforms for precise positioning
5. Toggle display aids (grid, axes, UV overlay) as needed
6. Enable Auto Revolve for presentation mode
7. Use the 3D view for client presentations or export as part of PDF

---

## 6. Output Maps

**Purpose**: Compose multiple pixel maps onto resolution-specific output canvases with drawing, masking, and cropping tools.

**Description**: The Output Maps tab serves as the composition workspace where individual pixel maps are arranged on output canvases at specific resolutions. It supports tabbed canvases (add, duplicate, delete) with a canvas name input and resolution presets ranging from HD through 8K, including portrait orientations and fully custom sizes that can be saved and deleted.

The composition environment provides grid, ruler, and snap-to-grid toggles for precise alignment. Zoom controls (in, out, fit) help navigate large canvases. Cropping controls allow trimming from all four edges in both pixel and panel units. An Undo/Redo system tracks map deletions.

### Preview quality and graphics acceleration

- Choose **Full** in the header or Help for previews up to 8.3 megapixels (enough for native 3840 x 2160). **Lite** keeps the 1MP limit. Existing saved quality limits remain in effect until changed. PNG, JPG, and PDF exports still render at their original full resolution.
- Preview panel boundaries share rounded edges to prevent gaps at fractional scales; panel borders scale with the preview instead of becoming disproportionately thick.
- Output Maps reuse unchanged source bitmaps while moving, cropping, and zooming. The cache retains at most 64MiB of bitmap pixel data and 128 entries; larger images render without being cached. Style, panel, annotation, logo, quality, and font changes invalidate the relevant cached content. Coordinate overlays and composite maps render directly to avoid stale workspace-dependent content.
- Drag updates and zoom requests are combined into animation frames; releasing a drag flushes the final state. This reduces duplicate rendering without changing placement, crop, or export coordinates.
- Desktop hardware acceleration is enabled by default, subject to Chromium's driver compatibility checks. In **Help > Check GPU**, inspect the reported active device, Canvas acceleration, compositing, and rasterization. Browser builds explicitly identify browser-managed graphics instead of claiming desktop GPU status.
- Output-map PNG/JPG/PDF, mask exports, and PDF pixel-map pages bypass preview downscaling. Cropping uses native source pixels, and full-resolution annotation shadows do not depend on Lite mode.
- To prefer a discrete GPU on Windows, set the installed app to **High performance** in **Settings > System > Display > Graphics**, then restart the app. Do not bypass driver safety checks. For driver troubleshooting, launch with `PIXELLOGIC_DISABLE_GPU=1`; this software-rendering override is applied before Electron starts.

Rendering regression checks: `node --test scripts\rendering-engine.test.cjs`.
Tutorial text, page layout, bundled PDF and contents-link checks: `node --test scripts\tutorial-docs.test.cjs`.

The Draw Mode provides line drawing tools (straight, dashed, dotted, pencil) with color picker, multicolor mode, adjustable line width, arrow start/end with size control, and snap controls. A full undo/redo/clear system manages drawing history. Mask Tools include Rectangle, Ellipse, and Polygon drawing modes plus a Select mode for manipulating existing masks, with fill color, opacity, show/invert toggles, and export options (Map+Mask or Cut LEDs). A unit system selector (px/mm/cm/m/ft/in) and selected mask properties panel complete the toolkit. Export options include Save as PNG (with transparent option) and Save as JPG.

**Key Features**:
- Tabbed output canvases with Add/Duplicate/Delete
- Rename the selected Output Map using Rename beside its top-level tabs. Save (or press Enter) to keep the name with the project; Cancel leaves it unchanged. Blank names are rejected. Nested canvas names are independent.
- Canvas name input
- Resolution presets: HD through 8K, portrait, custom (save/delete)
- Zoom in/out/fit controls
- Display toggles: Grid, Rulers, Snapping
- Cropping: Left/Right/Top/Bottom in px and panel units
- Delete Selected map, Undo/Redo delete
- Draw Mode: straight/dashed/dotted/pencil lines, color picker, multicolor, line width, arrows (start/end + size), snap, undo/redo/clear
- Mask Tools: Rectangle/Ellipse/Polygon draw, Select mode, delete/clear, fill color + opacity, show/invert toggles, export (Map+Mask or Cut LEDs)
- Unit system: px/mm/cm/m/ft/in
- Selected mask properties panel (X/Y/W/H)
- Mask list panel
- Export: Save as PNG (transparent option), Save as JPG
- Coordinate font size control

**Controls**:
- Canvas tab bar with +/Duplicate/Delete
- Canvas name input
- Resolution preset dropdown + custom size inputs + Save/Delete
- Zoom in/out/fit buttons
- Grid/Rulers/Snapping toggle buttons
- Crop inputs: Left/Right/Top/Bottom (px and panels)
- Draw mode selector, color picker, line width, arrow toggles
- Mask tool selector, fill color, opacity, show/invert toggles
- Export mask buttons (Map+Mask, Cut LEDs)
- Unit system dropdown
- Mask properties inputs (X/Y/W/H)
- Save PNG/JPG buttons

**Subtabs**: Multiple output canvas tabs (dynamically created)

**Workflow**:
1. Add a new output canvas or select an existing one
2. Set the canvas resolution from presets or custom dimensions
3. Drag pixel maps onto the canvas from the project
4. Position and align maps using grid, rulers, and snapping
5. Use cropping to trim the output area
6. Add annotations using the Draw Mode tools
7. Create masks to isolate or highlight specific regions
8. Export the final composition as PNG or JPG

---

## 7. LED Patching

**Purpose**: Plan LED data signal and power wiring paths for LED processor systems with visual patching diagrams.

**Description**: The LED Patching tab provides a comprehensive signal patching workspace for planning how LED panels connect to processors and power distribution. The primary implementation uses the `SignalPatchingPro` React component (loaded from an external module), with a legacy fallback implementation available.

The system includes an LED Processor Library featuring NovaStar and COEX controllers (MX6000 Pro, MX2000 Pro, MX40 Pro, MX30, VX16s, MCTRL4K, and more). It auto-computes port count, total pixel load, and per-port distribution based on controller type, link speed (1G/5G/10G), bit depth, and refresh rate. For modular processors (MX6000/MX2000 Pro), output card type and slot count can be configured.

The Patch Visualizer generates a visual cable/port patching diagram with DATA (blue) and POWER (red) routing overlays. Supported routing patterns include Vertical Snake, Horizontal Snake, Vertical ZigZag, and Horizontal ZigZag. Cabinet configuration includes type selection (multiple manufacturer models), columns/rows layout, data signal config (pattern, max modules/port, bandwidth limit check), and power wiring config (pattern, max modules/circuit). The legacy version includes export to CSV, PDF, and PNG.

**Key Features**:
- LED Processor Library: NovaStar and COEX controllers
- Auto port/pixel calculation based on controller, link speed, bit depth, refresh rate
- Output card configuration for modular processors
- Cabinet type selection (BESD, Absen, ROE, etc.)
- Cabinet grid: columns × rows configuration
- Data signal routing patterns: V-Snake, H-Snake, V-ZigZag, H-ZigZag
- Power wiring routing patterns with max modules/circuit
- SVG Patch Visualizer with DATA (blue) and POWER (red) overlays
- Toggle Show Data / Show Power
- System Controllers panel showing port usage
- Bandwidth limit checking
- Export: CSV, PDF, PNG (legacy version)

**Controls**:
- Controller model selector
- Output card config (modular processors)
- Cabinet type dropdown
- Columns/Rows inputs
- Refresh rate, bit depth inputs
- Data signal pattern dropdown, max modules/port input
- Power wiring pattern dropdown, max modules/circuit input
- Show Data / Show Power toggle buttons
- Generate Patching button
- Export CSV/PDF/PNG buttons

**Subtabs**: None (SignalPatchingPro component has internal navigation)

**Workflow**:
1. Select an LED processor controller model
2. Configure output cards if using a modular processor
3. Set cabinet type and grid dimensions (columns × rows)
4. Configure data signal routing pattern and port limits
5. Set power wiring pattern and circuit limits
6. Generate the patching diagram
7. Review DATA and POWER routing overlays
8. Export the patching plan as CSV, PDF, or PNG

---

## 8. AV Schematics

**Purpose**: Full AV system schematic designer for signal flow diagrams, device connections, and documentation.

**Description**: The AV Schematics tab mounts the `AVEngineeringPro` React component from an external module (`av-engineering-pro.js`), providing a complete AV system design environment. It features a 50+ device catalog spanning Media Servers, Switchers, Projectors, LED Processors, Network Switches, Converters, and Custom Devices.

The connection system supports 14 signal types (HDMI, HDMI 2.1, DisplayPort, Mini-DP, 3G-SDI, 12G-SDI, NDI, RJ45, DVI, Fiber, Dante, USB, Custom, and more) with real-time compatibility validation — incompatible types are flagged automatically with adapter requirements shown. Twenty pre-built templates cover LED walls, projection, broadcast, streaming, corporate AV, worship, digital signage, and more (6 basic + 14 advanced).

Canvas settings provide background color customization (8 presets), grid style/size/brightness, snap-to-grid, and minimap toggle — all persisted across sessions. Full Ctrl+Z / Ctrl+Shift+Z undo/redo history is supported. The Rack Elevation View visualizes all racked devices in standard 19″ rack units with slot positions, power draw, and weight summary. Export options include Dark and Light PDF modes, with a dedicated Cable Color Reference page and Rack Elevation page appended to exports. CSV import enables bulk device loading with fuzzy name matching.

**Key Features**:
- 50+ device catalog (Media Servers, Switchers, Projectors, LED Processors, etc.)
- 14 signal types with real-time compatibility validation
- 20 pre-built templates (LED, projection, broadcast, streaming, corporate, worship, signage)
- Canvas settings: background color, grid style/size/brightness, snap-to-grid, minimap
- Full undo/redo (Ctrl+Z / Ctrl+Shift+Z)
- Rack Elevation View: 19″ rack layout, RU positions, power draw, weight summary
- Cable Color Reference PDF page with swatches and hex codes
- Dark / Light PDF export
- CSV import with fuzzy device name matching
- Document info and annotations

**Controls**:
- Device palette (drag to canvas)
- Port connection drawing
- Template selector (20 templates)
- Canvas settings toolbar (background, grid, snap, minimap)
- Undo/Redo buttons
- Export PDF (Dark/Light mode)
- CSV Import button
- Rack Elevation View toggle

**Subtabs**: Internal to AVEngineeringPro component

**Workflow**:
1. Open AV Schematics tab
2. Load a pre-built template or start from a blank canvas
3. Drag devices from the catalog onto the canvas
4. Connect device ports to define signal flow
5. Validate connections (incompatible types are flagged)
6. Add document info and annotations
7. Review the Rack Elevation View
8. Export as Dark or Light PDF with Cable Color Reference

---

## 9. Devices

**Purpose**: Database for cataloging LED wall and projector hardware specifications with PDF import capability.

**Description**: The Devices tab provides a structured database for storing and managing LED wall and projector hardware specifications. It features two subtabs — LED Walls and Projectors — each displaying devices in a table format with columns for Name, Brand, Model, Pitch (or Resolution for projectors), and Actions. A search/filter input allows quick lookup across the device library.

The Add/Edit form for LED walls includes fields for pixel pitch, refresh rate, panel resolution, cabinet dimensions (width, height, depth), curve type, weight, brightness, aspect ratio, viewing distance, usage type, power specifications, frame rate, and voltage. Projector entries capture resolution, lumens, technology, lens type, and throw ratio. Both device types include a notes field for additional documentation.

A standout feature is PDF parsing capability — uploading a manufacturer PDF spec sheet will attempt to auto-populate the form fields using text extraction. The full device library can be exported and imported as JSON for sharing between installations. The tab uses a v2 data structure (`state.devicesV2`).

**Key Features**:
- Two subtabs: LED Walls and Projectors
- Table view: Name/Brand/Model/Pitch(or Resolution)/Actions
- Search/filter input
- LED Wall fields: pitch, refresh rate, panel resolution, cabinet W/H/D, curve type, weight, brightness, aspect ratio, viewing distance, usage, power specs, frame rate, voltage
- Projector fields: resolution, lumens, technology, lens, throw ratio
- Notes field for both types
- PDF spec sheet parsing to auto-populate form fields
- Export/Import device library as JSON

**Controls**:
- LED Walls / Projectors subtab selector
- Search/filter input
- Add Device button
- Edit/Delete action buttons per device
- Form inputs for all device specifications
- PDF upload for auto-parsing
- Export JSON / Import JSON buttons
- Notes textarea

**Subtabs**: LED Walls, Projectors

**Workflow**:
1. Switch to the desired subtab (LED Walls or Projectors)
2. Click Add to create a new device entry
3. Fill in specifications manually or upload a PDF spec sheet for auto-population
4. Save the device to the library
5. Use the search filter to find devices quickly
6. Export the library as JSON for backup or sharing

---

## 10. PDF Export

**Purpose**: Comprehensive PDF document generation with template artwork, layout control, typography, and delivery specifications.

**Description**: The PDF Export tab is an advanced document generation control room that produces professional specification PDFs from pixel map projects. It uses a multi-section collapsible card layout organized into purpose-named sections: Project Details, Coverage, Map Labels, Pairing, Template, Title Block, Typography, and Action Center. A hero header displays quick metrics including project name, pixel map count, and output canvas count.

The Coverage section controls which output canvases are included (none, active, specific, or all) and supports a title page with optional cover image upload. Toggles control inclusion of LED pixel pitch in details and 3D View snapshots. The Map Labels section allows renaming maps specifically for PDF output and attaching optional reference images per map. The Pairing section enables placing two pixel maps side-by-side on the same PDF page, with automatic pairing for equal-resolution maps and manual override capability.

The Template section accepts custom branding PDF artwork with an interactive visual template area editor featuring five draggable/resizable regions (Map Area, Title Area, Details Area, Title Block Area, Ref Image Area). Preset buttons provide quick positioning (Map:Left, Title:Top, Details:Bottom, Screenshot Defaults, Title Block:Right). The Title Block section populates a per-page info table with project name, date, venue, sales, client, page number, drawn by, and version fields plus font size controls. Typography controls include font family (core + system fonts), banner/details/delivery font sizes, horizontal and vertical alignment, and auto-fit options. The Delivery Spec section defaults to Resolume presets covering format, codecs, quality, FPS, audio, and naming structure.

**Key Features**:
- Multi-section collapsible card layout (Project, Coverage, Map Labels, Pairing, Template, Title Block, Typography)
- Hero header with quick metrics (project, pixel maps, output canvases)
- Project selection, document title, PDF filename
- Output canvas inclusion: none/active/specific/all
- Title page with optional cover image upload
- Include LED pixel pitch, include 3D View snapshot
- Map renaming for PDF and reference image attachment per map
- Page pairing: auto (equal resolution) and manual pair definition
- Template artwork upload with export-without-template option
- Visual template area editor: 5 draggable regions (Map, Title, Details, Title Block, Ref Image)
- Area preset buttons (Map:Left, Title:Top, Details:Bottom, Screenshot Defaults, Title Block:Right)
- Save/Clear areas with persistence
- Title Block: project name, date, venue, sales, client, page, drawn by, version
- Typography: font family, banner/details/delivery font sizes, H/V alignment, auto-fit
- Delivery Spec: Resolume preset (format, codecs, quality, FPS, audio, naming)
- PDF and PPTX export with preview

**Controls**:
- Project selector dropdown
- Document title and filename inputs
- Include Output Map dropdown (none/active/specific/all)
- Canvas multi-select for specific output
- Cover image upload, include title page checkbox
- Include pitch and 3D view checkboxes
- Map rename inputs and reference image uploads
- Pair definition selects (map 1 + map 2)
- Template PDF upload, export without template checkbox
- Draggable/resizable layout regions on template preview
- Preset buttons for area positioning
- Save Areas / Clear Areas buttons
- Title Block field inputs (8 fields) + font size controls
- Font family dropdown, font size inputs, alignment selects
- Auto-fit checkboxes
- Generate PDF / Generate PPTX buttons

**Subtabs**: None (collapsible sections)

**Workflow**:
1. Select the project from the dropdown
2. Set document title and PDF filename
3. Configure output map inclusion and title page options
4. Rename maps and attach reference images in Map Labels
5. Set up page pairing for side-by-side map layouts
6. Upload or configure template artwork and position layout areas
7. Fill in Title Block details
8. Adjust typography settings
9. Click Generate PDF (or PPTX) in the Action Center

---

## 11. Power Calc

**Purpose**: LED power consumption calculator based on real-world per-tile amperage measurements.

**Description**: The Power Calc tab is a specialized electrical engineering tool that calculates total power draw for LED wall configurations using data from the "LED Test Report 2025." The database contains measured per-tile amperage values for 55+ LED models across 10 brands (GLOSHINE, ABSEN, UNILUMIN, INFILED, CREATE LED, DI COLOUR, UNIVIEW, ESD LUMIN, JR VISUAL, BESD) at both 100% and 50% brightness levels.

Configuration inputs include brand/model selection, brightness level (100% or 50%), number of tiles, supply voltage, and phase configuration (1-phase or 3-phase). The calculator produces Summary KPIs showing Total Amps, Active Power (kW), Apparent Power (kVA at PF 0.9), and recommended Breaker per Phase (with 1.25× safety factor).

A Scenario Breakdown section shows detailed per-tile, total, per-phase, and breaker values for five scenarios: Full Red, Full Green, Full Blue, Full White, and Standby. For 3-phase configurations, a Phase Distribution table shows per-phase tile count, amps per scenario, and breaker sizing. Breaker calculations use standard sizes (10A through 200A) with automatic selection of the next available size above the calculated value with safety factor.

**Key Features**:
- 55+ LED models across 10 brands
- Per-tile amperage data at 100% and 50% brightness
- Configuration: brand, model, brightness, tile count, voltage, phase (1/3)
- Summary KPIs: Total Amps, Active Power (kW), Apparent Power (kVA), Breaker/Phase
- 5 scenario breakdowns: Full Red, Green, Blue, White, Standby
- Per-tile, total, per-phase, breaker values per scenario
- Phase Distribution table for 3-phase: per-phase tiles, amps, breaker
- 1.25× safety factor on breaker calculations
- Standard breaker sizes: 10–200A
- Export to PDF

**Controls**:
- Brand dropdown
- Model dropdown (filtered by brand)
- Brightness toggle: 100% / 50%
- Number of Tiles input
- Supply Voltage input
- Phase Configuration toggle: 1-Phase / 3-Phase
- Export PDF button

**Subtabs**: None

**Workflow**:
1. Select the LED brand from the dropdown
2. Select the specific model
3. Choose brightness level (100% or 50%)
4. Enter the number of tiles in the wall
5. Set the supply voltage (default 230V)
6. Select phase configuration (1-phase or 3-phase)
7. Review Summary KPIs and Scenario Breakdown
8. Check Phase Distribution table for 3-phase setups
9. Export the report as PDF for site documentation

---

## 12. Projector Test Pattern

**Purpose**: Generate projector test patterns, alignment images, and perform throw/coverage calculations for flat, curved, and circular projection screens.

**Description**: The Projector Test Pattern tab is a multi-purpose projection planning tool with four subtabs: Flat Screen Calculator, Curve Screen Projection, Circular/Semi-circular Calculator, and Projector Test Pattern (settings). The settings subtab provides comprehensive control over test pattern generation including native resolution presets (4:3, 5:4, 16:9, 16:10, 17:9, 5:3, portrait orientations) plus custom resolution support, image naming, font sizing, display grid configuration (X×Y displays), and overlap settings in both pixels and percentages.

Visual customization includes grid size, line width, grid color, text color, overlap color, circles, hatching (cross/forward/backward with density control), and grid numbers. Per-projector settings allow individual naming and color assignment. A live preview panel with zoom controls renders the test pattern in real-time. Export options include Save PNG, Save All PNGs, Save Image, and PDF export.

The Flat Screen Calculator computes pixel pitch, resolution, overlap, and throw distance for rectangular projection setups. The Curve Screen Calculator handles curved surfaces with depth, curve type (concave), and safe angle parameters. The Circular/Semi-circular Calculator supports full circles and semicircles with diameter, screen height, projection side (inside/outside), safe angle, arc angle, and throw calculations. When Circular (Dome) Pattern is enabled, a dome visualizer appears with configurable diameter, pixels/meter, and unit selection.

**Key Features**:
- 4 subtabs: Flat Screen Calculator, Curve Screen Projection, Circular/Semi-circular, Projector Test Pattern
- Native resolution presets (28+ options across all aspect ratios) + custom resolutions
- Display grid configuration (X×Y displays) with overlap (px and %)
- Grid & Colors: grid size, line width, grid/text/overlap colors, circles, hatching, grid numbers
- Hatching styles: cross/forward/backward with density control
- Logo overlay: file upload, size slider
- Per-projector naming and color assignment
- Overlay opacity control
- Live preview with zoom controls
- Dome visualizer (when circular enabled): diameter, pixels/meter, unit
- Flat Calculator: screen dimensions, throw ratio modes, projector count, overlap, resolution
- Curve Calculator: screen dimensions, curve depth/type, projectors, overlap, safe angle, throw
- Circular Calculator: circle/semi shape, diameter, height, projection side, safe/arc angle, throw
- Export: Save PNG, Save All PNGs, Save Image, PDF

**Controls**:
- Native Resolution dropdown + custom W/H inputs + Add button
- Image Name input, Font Size slider
- Name Offset X/Y sliders
- Display Size W×H inputs
- Displays X×Y inputs
- Overlap X/Y inputs (px and %)
- Total Size inputs
- Overlap/Logo/Circular toggles
- Grid Size, Line Width sliders
- Color pickers: Grid, Text, Overlap
- Circles, Hatching, Grid Numbers checkboxes
- Hatching Style dropdown, Density slider
- Logo file upload, Logo Size slider
- Per-projector name inputs and color pickers
- Overlay Opacity slider
- Zoom buttons, Save PNG, Save All PNGs, Save Image, PDF Export buttons
- Calculator-specific inputs per subtab

**Subtabs**: Flat Screen Calculator, Curve Screen Projection, Circular / Semi-circular Calculator, Projector Test Pattern

**Workflow**:
1. Select the appropriate subtab for the projection scenario
2. For test pattern: configure resolution, display grid, overlap, colors, and grid options
3. Customize projector names and colors
4. Review the live preview and adjust as needed
5. Save as PNG or export as PDF
6. For calculators: enter screen dimensions and projection parameters
7. Review calculated throw distances, overlap regions, and projector counts

---

## 13. Utility Tools

**Purpose**: Compact utility workspace hosting the Aspect Ratio Calculator and LTC (Linear Timecode) Generator.

**Description**: The Utility Tools tab presents a simple two-column grid layout containing two standalone sub-tools. The left column hosts the Aspect Ratio Calculator, which provides preset and custom ratio calculations with visual reference for screen planning. Users can input dimensions and receive accurate aspect ratio information for LED walls, projection screens, and video outputs.

The right column hosts the LTC (Linear Timecode) Generator, which creates SMPTE LTC WAV files based on user-specified start timecode and duration. Controls include frame rate, sample rate, and bit-depth settings, enabling generation of timecode audio tracks for synchronization with video playback systems and media servers.

**Key Features**:
- Two-column layout with dedicated sub-tools
- Aspect Ratio Calculator: preset and custom ratios, visual reference
- LTC Generator: SMPTE LTC WAV generation
- LTC controls: start timecode, duration, frame rate, sample rate, bit-depth

**Controls**:
- Aspect Ratio Calculator: dimension inputs, preset selectors, calculate button
- LTC Generator: start timecode input, duration input, frame rate selector, sample rate selector, bit-depth selector, generate button

**Subtabs**: None (side-by-side layout)

**Workflow**:
1. Use the Aspect Ratio Calculator to verify screen dimensions and ratios
2. Use the LTC Generator to create timecode audio files:
   a. Set the start timecode
   b. Set the duration
   c. Choose frame rate, sample rate, and bit-depth
   d. Generate and save the WAV file

---

## 14. Help

**Purpose**: Comprehensive in-app reference guide with feature documentation, workflow guides, keyboard shortcuts, and troubleshooting.

**Description**: The Help tab serves as the complete reference manual for PixelLogic, organized into clearly structured sections. A hero header displays the current app version and provides quick-access buttons for Video Tutorial, Tutorial PDF, Start App Tour, and performance mode toggles (Lite Mode / Full Mode).

The What's New section highlights the latest features and improvements with color-coded cards organized by feature area (Pixel Designer, PDF Export, AV Schematics, etc.). Quick Workflows provides step-by-step guided paths for common tasks: LED Project workflow, AV System Design, Media Delivery, and Projection — each with clickable links that navigate directly to the relevant tabs.

The Tab Reference section contains detailed reference cards for every tab in the application, listing key features, capabilities, and usage tips. The Keyboard Shortcuts section documents all available hotkeys (Ctrl+Z/Shift+Z for undo/redo, Ctrl+S for save, scroll wheel zoom, Space+drag pan, Escape, arrow keys, Delete/Backspace). The Troubleshooting section provides solutions for common issues including slow previews, missing maps, PDF layout problems, script loading failures, signal warnings, and video converter errors.

**Key Features**:
- App version display
- Video Tutorial, Tutorial PDF, Start App Tour buttons
- Lite Mode / Full Mode performance toggles
- What's New: color-coded feature update cards
- Quick Workflows: LED Project, AV System Design, Media Delivery, Projection
- Tab Reference: detailed cards for every tab
- Keyboard Shortcuts reference (8 documented shortcuts)
- Troubleshooting: 7 common issue/solution pairs
- Clickable tab navigation links throughout

**Controls**:
- Video Tutorial button (opens video)
- Tutorial PDF button (opens PDF)
- Start App Tour button (launches interactive tour)
- Lite Mode / Full Mode buttons
- Tab navigation links (clickable, jump to any tab)

**Subtabs**: None (scrollable sections)

**Workflow**:
1. Browse the What's New section for latest features
2. Follow Quick Workflows for guided step-by-step task completion
3. Refer to Tab Reference cards for detailed feature documentation
4. Check Keyboard Shortcuts for productivity hotkeys
5. Consult Troubleshooting for solutions to common problems
6. Use Lite Mode if experiencing performance issues

---

## 15. Video & Audio Converter

**Purpose**: FFmpeg-powered media converter supporting professional video and audio formats with batch processing.

**Description**: The Video & Audio Converter tab provides a complete media conversion pipeline powered by FFmpeg. It supports a wide range of output formats organized into three categories: Standard Video (MP4 H.264, MP4 H.265/HEVC, ProRes MOV, DNxHD MOV, MOV H.264, AVI, WebM, Animated GIF), HAP/Notch/DXV (HAP, HAP Q, HAP Alpha, Notch Block, Notch LC, DXV — requiring a full FFmpeg build), and Audio Only (MP3, WAV uncompressed PCM, AAC, FLAC).

The interface follows a 4-step workflow: Source Files (add multiple files with probe results showing format and duration), Output Folder (browse to select destination), Format & Settings (format preset, resolution override, video/audio bitrate, frame rate, ProRes profile, audio sample rate, channels), and Convert (start button with live job queue). Quick Broadcast Presets provide one-click configurations for common scenarios: ProRes HQ 1080p25/30, H.264 1080p/4K, HAP Q 1080p25/30, HAP 1080p25, DXV 1080p25/30, WAV 48kHz/24-bit, MP3 320kbps, AAC 256kbps.

HAP/Notch/DXV formats require a full FFmpeg build with snappy support, which can be downloaded directly from the app (~130 MB one-time setup). A custom FFmpeg path option is also available. The job queue displays live progress bars with percentage, timemark, and current FPS, supports cancellation of active jobs, and provides one-click output folder access for completed conversions.

**Key Features**:
- 16+ output formats across video, HAP/Notch/DXV, and audio categories
- ProRes profiles: Proxy, LT, 422, HQ, 4444, 4444 XQ
- HAP/Notch/DXV support with full FFmpeg download (130 MB)
- Batch processing: multiple files converted sequentially
- Quick Broadcast Presets: 12 one-click configurations
- Resolution override presets (4K through 360p)
- Frame rate override presets (60 through 23.976)
- Audio: sample rate (44.1/48/96 kHz), channels (mono/stereo/5.1/7.1), bitrate
- Live job queue with progress bars, timemark, FPS
- Cancel active jobs
- One-click output folder access
- File probing (format, duration detection)
- Custom FFmpeg path support

**Controls**:
- Add Files button, Clear All button
- Remove file button (per file)
- Browse output folder button
- Format/Preset dropdown
- Resolution Override dropdown
- Video Bitrate input
- Frame Rate Override dropdown
- ProRes Profile dropdown (when ProRes selected)
- Audio Sample Rate dropdown
- Audio Channels dropdown
- Audio Bitrate input
- Quick Broadcast Preset buttons (12 presets)
- Start Conversion button
- Cancel job button (per active job)
- Open folder button (per completed job)
- Clear finished jobs button
- HAP: Install/Download/Retry button, custom FFmpeg path input + Browse

**Subtabs**: None

**Workflow**:
1. Click Add Files to select source video or audio files
2. Click Browse to select the output folder
3. Choose the output format/preset from the dropdown
4. Optionally select a Quick Broadcast Preset for common configurations
5. Adjust resolution, frame rate, bitrate, and audio settings as needed
6. For HAP/Notch/DXV: install full FFmpeg support if prompted
7. Click Start Conversion
8. Monitor progress in the job queue
9. Click the folder icon to access completed files

---

## 16. Circular LED

**Purpose**: Calculate geometry, panel counts, pixel counts, and power requirements for circular and ring-shaped LED displays.

**Description**: The Circular LED tab provides a dedicated calculator for circular and ring (annular) LED display configurations. It computes all relevant geometric, pixel, panel, and electrical parameters from user-provided inputs. The left panel contains all input fields and calculated results, while the right panel shows a live canvas-based visualization of the circular display.

Input parameters include outer diameter D (in meters or millimeters), optional inner diameter d (for ring configurations), pixel pitch (mm), panel physical dimensions (width and height in mm), panel pixel dimensions (W×H), and power density (W/m²). Toggle options control display of panel divisions and circle measurements on the preview.

The calculator outputs a comprehensive set of derived values: radius, diameter, circumference (outer and inner), pixel counts (around circumference, vertical for full disc, radial for ring), total pixel count, panel counts (physical and pixel-based, both horizontal and vertical), angle between panels, total panel count, surface area, power estimate, and recommended viewing distance (using the 0.3× pitch rule). The canvas visualization renders the circular geometry with optional panel division lines, numbered segments, and angle indicators between adjacent panels.

**Key Features**:
- Outer diameter D input with unit selector (m/mm)
- Inner diameter d for ring/annular configurations
- Pixel pitch input (mm)
- Panel physical dimensions (W×H mm)
- Panel pixel dimensions (W×H pixels)
- Power density input (W/m²)
- Computed outputs: radius, diameter, circumference, inner geometry
- Pixel counts: around, vertical (full/ring), total
- Panel counts: physical and pixel-based (horizontal/vertical), total
- Angle between panels calculation
- Area calculation (outer/ring)
- Power estimate
- Recommended viewing distance
- Live canvas visualization with gradient fill
- Panel division lines with numbered segments
- Angle indicator between adjacent panels
- Show panel divisions / Show circle measurements toggles

**Controls**:
- Outer diameter D input + unit selector (m/mm)
- Inner diameter d input + unit selector (m/mm)
- Pixel pitch input
- Panel width/height inputs
- Panel pixel W/H inputs
- Power density input
- Show panel divisions checkbox
- Show circle measurements checkbox

**Subtabs**: None

**Workflow**:
1. Enter the outer diameter of the circular LED display
2. Optionally set an inner diameter for a ring configuration
3. Set the pixel pitch for the LED panels
4. Enter panel physical dimensions and pixel counts
5. Set the power density (W/m²)
6. Review all computed values (pixels, panels, area, power, viewing distance)
7. Toggle panel divisions and measurements on the canvas preview
8. Use the results for procurement planning and site specifications
