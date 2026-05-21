#!/usr/bin/env python3
"""
add_ar_anchor.py — Add AR anchoring metadata to a USDZ so iOS launches it
directly into AR ("View in AR?" prompt → AR camera) instead of the 3D previewer
("View 3D Object?" prompt → preview screen).

Works by extracting the USDZ archive, editing the inner USD layer in place
(adding the Preliminary_AnchoringAPI schema + non-custom attributes), and
repacking. Textures and existing references are preserved exactly.

Usage:
    pip install usd-core
    python3 add_ar_anchor.py input.usdz output.usdz [horizontal|vertical]

    horizontal (default) — objects that sit on the floor / a table
    vertical             — objects that hang on a wall (paintings, clocks)
"""

import os
import sys
import zipfile
import tempfile
from pxr import Sdf, Usd, UsdUtils


def add_ar_anchor(input_usdz, output_usdz, alignment="horizontal"):
    if alignment not in ("horizontal", "vertical"):
        raise ValueError("alignment must be 'horizontal' or 'vertical'")

    with tempfile.TemporaryDirectory() as tmp:
        # 1. Extract the USDZ. By USDZ spec, the first file in the archive
        #    is the default layer (the entrypoint).
        with zipfile.ZipFile(input_usdz) as z:
            z.extractall(tmp)
            entrypoint_name = z.filelist[0].filename

        usd_path = os.path.join(tmp, entrypoint_name)

        # 2. Open the layer (works for both binary .usdc and text .usda).
        layer = Sdf.Layer.FindOrOpen(usd_path)
        if not layer:
            raise RuntimeError(f"Could not open USD layer at {usd_path}")

        # 3. Bring up a stage backed by this layer so we can use the high-level
        #    Usd API to apply the schema.
        stage = Usd.Stage.Open(layer)
        root = stage.GetDefaultPrim()
        if not root:
            # If there's no defaultPrim, set it to the first top-level prim
            top = list(stage.GetPseudoRoot().GetChildren())
            if not top:
                raise RuntimeError("USDZ has no usable root prim")
            root = top[0]
            stage.SetDefaultPrim(root)

        prim_path = root.GetPath()
        prim_spec = layer.GetPrimAtPath(prim_path)

        # 4. Remove any pre-existing (possibly broken) anchoring attributes.
        for attr_name in ("preliminary:anchoring:type",
                          "preliminary:planeAnchoring:alignment"):
            existing = prim_spec.attributes.get(attr_name)
            if existing:
                prim_spec.RemoveProperty(existing)

        # 5. Re-create them as NON-CUSTOM uniform token attributes.
        #    Apple's tools (and IKEA's exports) emit these without `custom`.
        Sdf.AttributeSpec(
            prim_spec,
            "preliminary:anchoring:type",
            Sdf.ValueTypeNames.Token,
            Sdf.VariabilityUniform,
            False,  # declaresCustom = False
        ).default = "plane"

        Sdf.AttributeSpec(
            prim_spec,
            "preliminary:planeAnchoring:alignment",
            Sdf.ValueTypeNames.Token,
            Sdf.VariabilityUniform,
            False,
        ).default = alignment

        # 6. Apply the Preliminary_AnchoringAPI schema. iOS looks for this to
        #    confirm the prim opts into AR anchoring. AddAppliedSchema() requires
        #    the schema to be registered in usd-core, but Apple's Preliminary_*
        #    schemas aren't — so we write the apiSchemas list-op directly via Sdf.
        schemas_op = Sdf.TokenListOp()
        existing = (
            prim_spec.GetInfo("apiSchemas")
            if prim_spec.HasInfo("apiSchemas")
            else None
        )
        prepended = list(existing.prependedItems) if existing else []
        if "Preliminary_AnchoringAPI" not in prepended:
            prepended.insert(0, "Preliminary_AnchoringAPI")
        schemas_op.prependedItems = prepended
        if existing:
            schemas_op.appendedItems = existing.appendedItems
            schemas_op.addedItems = existing.addedItems
            schemas_op.deletedItems = existing.deletedItems
            schemas_op.explicitItems = existing.explicitItems
        prim_spec.SetInfo("apiSchemas", schemas_op)

        # 7. Save the layer back to disk (in-place inside the extracted tree).
        layer.Save()

        # 8. Repack the directory as a fresh USDZ. The entrypoint stays first
        #    in the archive, textures and other assets follow.
        if os.path.exists(output_usdz):
            os.remove(output_usdz)
        UsdUtils.CreateNewUsdzPackage(usd_path, output_usdz)


def verify(usdz_path):
    """Print what's actually inside the resulting USDZ for sanity-checking."""
    stage = Usd.Stage.Open(usdz_path)
    root = stage.GetDefaultPrim()
    print(f"  default prim:                          {root.GetPath()}")
    print(f"  apiSchemas:                            {root.GetAppliedSchemas()}")
    for attr_name in ("preliminary:anchoring:type",
                      "preliminary:planeAnchoring:alignment"):
        attr = root.GetAttribute(attr_name)
        is_custom = "custom" if attr.IsCustom() else "non-custom"
        print(f"  {attr_name}: {attr.Get()} ({is_custom})")

    with zipfile.ZipFile(usdz_path) as z:
        print(f"  archive contents:")
        for info in z.filelist:
            print(f"    {info.filename}  ({info.file_size:,} bytes)")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)

    inp, outp = sys.argv[1], sys.argv[2]
    alignment = sys.argv[3] if len(sys.argv) > 3 else "horizontal"

    add_ar_anchor(inp, outp, alignment)
    print(f"✓ Wrote {outp}")
    verify(outp)
