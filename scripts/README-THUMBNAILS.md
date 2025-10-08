# Model Thumbnail Generator

This tool automatically generates low-resolution thumbnail previews of your 3D models for fast loading in the configurator.

## How to Generate Thumbnails

### Step 1: Run the Thumbnail Generator

1. Make sure your development server is running:
   ```bash
   npm run dev
   ```

2. Open the thumbnail generator in your browser:
   ```
   http://localhost:5173/scripts/generate-thumbnails.html
   ```

3. Click **"Generate All Thumbnails"** button

4. Wait for all thumbnails to be generated (you'll see them appear on the page)

5. Click **"Download All"** to download all thumbnails as JPG files

### Step 2: Organize Thumbnails

1. Create a `thumbnails` directory in your `public` folder:
   ```bash
   mkdir public/thumbnails
   ```

2. Move all downloaded thumbnail files to `public/thumbnails/`

3. Rename them to match the pattern: `{model-id}.jpg`
   - Example: `1-80-bb.jpg`, `complete-sofa-1.jpg`, etc.

### Step 3: Update Module Definitions

Update your `src/context/ConfiguratorContext.tsx` to include thumbnail paths:

```typescript
export const availableModules: ModuleDefinition[] = [
  {
    id: "1-80-bb",
    name: "[1(80)BB]",
    displayName: "[1(80)BB]",
    modelPath: "/models/[1(80)BB].glb",
    thumbnail: "/thumbnails/1-80-bb.jpg", // Add this line
  },
  {
    id: "1-80-l",
    name: "[1(80)L]",
    displayName: "[1(80)L]",
    modelPath: "/models/[1(80)L].glb",
    thumbnail: "/thumbnails/1-80-l.jpg", // Add this line
  },
  // ... add thumbnail for each module
];

export const availableCompleteSets: CompleteSetDefinition[] = [
  {
    id: "complete-sofa-1",
    name: "Complete Sofa",
    displayName: "Kompletna Sofa",
    modelPath: "/models/complete sofa.glb",
    thumbnail: "/thumbnails/complete-sofa-1.jpg", // Add this line
  },
  // ... add thumbnail for each complete set
];
```

## Thumbnail Specifications

- **Format**: JPEG
- **Quality**: 70% (optimized for fast loading)
- **Size**: 400x400px (automatically resized by the generator)
- **File naming**: `{model-id}.jpg` (lowercase with hyphens)

## Benefits

✅ **Fast Loading**: Low-res thumbnails load almost instantly
✅ **Better UX**: Users can see what models look like before adding them
✅ **Professional**: Makes the configurator look more polished
✅ **Consistent**: All thumbnails use the same camera angle and lighting

## Troubleshooting

**Problem**: Thumbnails not showing
- Check that files are in `public/thumbnails/`
- Verify file names match the module IDs exactly
- Check browser console for 404 errors

**Problem**: Models look cut off
- Adjust camera distance in `generate-thumbnails.html` (line 124)
- Change `distance * 1.2` to a higher number like `distance * 1.5`

**Problem**: Lighting looks bad
- Adjust `ambientLight` intensity (line 80)
- Adjust `directionalLight` intensity and position (lines 83-84)

## Future Improvements

- Automatically generate thumbnails during build process
- Add ability to customize camera angle per model
- Support for animated thumbnail generation
- Batch processing with Node.js script
