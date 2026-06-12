# Clickable Breadcrumbs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all non-current breadcrumb items in the configurator header clickable so users can navigate back to earlier steps.

**Architecture:** Change `Breadcrumb` to accept `{ label: string; onClick?: () => void }[]` instead of `string[]`. Items with `onClick` render as buttons with a hover opacity style; items without render as plain spans (used for the current/last step). `ConfiguratorHeader` updates its prop type, and all 4 call sites wire up `setCurrentStep` navigation.

**Tech Stack:** React, TypeScript, Tailwind CSS

---

## File Map

- Modify: `src/components/ui/Breadcrumb.tsx` — update prop type, conditionally render button vs span
- Modify: `src/components/Configurator/ConfiguratorHeader.tsx` — update `breadcrumb` prop type
- Modify: `src/components/Configurator/ConfigTypeStep.tsx` — wire click on "home"
- Modify: `src/components/Configurator/ModuleSelectionStep.tsx` — wire clicks on "home" and "changeConfigType"
- Modify: `src/components/ControlPanel/index.tsx` — wire clicks on "home", "changeConfigType", and step item

---

### Task 1: Update Breadcrumb component

**Files:**
- Modify: `src/components/ui/Breadcrumb.tsx`

- [ ] **Step 1: Replace the component with the updated version**

Replace the entire file content with:

```tsx
import React from "react";

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => (
  <div className="flex items-center gap-1">
    {items.map((item, idx) => (
      <React.Fragment key={idx}>
        {item.onClick ? (
          <button
            onClick={item.onClick}
            className="font-lato font-light text-ui-muted text-[15px] uppercase whitespace-nowrap opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
          >
            {item.label}
          </button>
        ) : (
          <span className="font-lato font-light text-ui-muted text-[15px] uppercase whitespace-nowrap">
            {item.label}
          </span>
        )}
        {idx < items.length - 1 && (
          <div className="flex items-center justify-center w-[6px] h-[11px]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="7"
              height="12"
              viewBox="0 0 7 12"
              fill="none"
            >
              <path
                d="M0.253418 11.2764L6.25342 5.77652L0.253418 0.276367"
                stroke="#757575"
                strokeWidth="0.75"
              />
            </svg>
          </div>
        )}
      </React.Fragment>
    ))}
  </div>
);

export default Breadcrumb;
```

- [ ] **Step 2: Update ConfiguratorHeader prop type**

In `src/components/Configurator/ConfiguratorHeader.tsx`, change the import and interface:

Change:
```tsx
import Breadcrumb from "../ui/Breadcrumb";
```
(no change needed for the import)

Change the interface:
```tsx
// OLD
breadcrumb?: string[];

// NEW
breadcrumb?: { label: string; onClick?: () => void }[];
```

No other changes needed — the `<Breadcrumb items={breadcrumb} />` call is already correct.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/Breadcrumb.tsx src/components/Configurator/ConfiguratorHeader.tsx
git commit -m "feat: update Breadcrumb to support clickable items"
```

---

### Task 2: Wire breadcrumb clicks in ConfigTypeStep

**Files:**
- Modify: `src/components/Configurator/ConfigTypeStep.tsx`

Context: This step shows breadcrumb `[home, changeConfigType]`. "home" should navigate to `"welcome"`. The last item (changeConfigType) is the current page — no click.

- [ ] **Step 1: Update the breadcrumb prop**

In `src/components/Configurator/ConfigTypeStep.tsx`, the component already has access to `setCurrentStep` from `useConfigurator()`.

Change:
```tsx
breadcrumb={[t.home, t.changeConfigType]}
```

To:
```tsx
breadcrumb={[
  { label: t.home, onClick: () => setCurrentStep("welcome") },
  { label: t.changeConfigType },
]}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Configurator/ConfigTypeStep.tsx
git commit -m "feat: make breadcrumb home clickable in ConfigTypeStep"
```

---

### Task 3: Wire breadcrumb clicks in ModuleSelectionStep

**Files:**
- Modify: `src/components/Configurator/ModuleSelectionStep.tsx`

Context: This step has two render paths (complete sets and modules). Both show `[home, changeConfigType, <current>]`. "home" → `"welcome"`, "changeConfigType" → `"config-type"`, last item → no click.

The component already has `setCurrentStep` from `useConfigurator()`.

- [ ] **Step 1: Update the complete-sets breadcrumb**

Change:
```tsx
breadcrumb={[t.home, t.changeConfigType, t.completeSets]}
```

To:
```tsx
breadcrumb={[
  { label: t.home, onClick: () => setCurrentStep("welcome") },
  { label: t.changeConfigType, onClick: () => setCurrentStep("config-type") },
  { label: t.completeSets },
]}
```

- [ ] **Step 2: Update the modules breadcrumb**

Change:
```tsx
breadcrumb={[t.home, t.changeConfigType, t.moduleSelect]}
```

To:
```tsx
breadcrumb={[
  { label: t.home, onClick: () => setCurrentStep("welcome") },
  { label: t.changeConfigType, onClick: () => setCurrentStep("config-type") },
  { label: t.moduleSelect },
]}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Configurator/ModuleSelectionStep.tsx
git commit -m "feat: make breadcrumbs clickable in ModuleSelectionStep"
```

---

### Task 4: Wire breadcrumb clicks in ControlPanel

**Files:**
- Modify: `src/components/ControlPanel/index.tsx`

Context: This step shows `[home, changeConfigType, setSelect/moduleSelect, editor]`. "home" → `"welcome"`, "changeConfigType" → `"config-type"`, the third item → `"module-selection"`, "editor" → no click (current page).

The component already has `setCurrentStep` and `configurationType` from `useConfigurator()`.

- [ ] **Step 1: Update the breadcrumb prop**

Change:
```tsx
breadcrumb={[t.home, t.changeConfigType, configurationType === "complete" ? t.setSelect : t.moduleSelect, t.editor]}
```

To:
```tsx
breadcrumb={[
  { label: t.home, onClick: () => setCurrentStep("welcome") },
  { label: t.changeConfigType, onClick: () => setCurrentStep("config-type") },
  { label: configurationType === "complete" ? t.setSelect : t.moduleSelect, onClick: () => setCurrentStep("module-selection") },
  { label: t.editor },
]}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ControlPanel/index.tsx
git commit -m "feat: make breadcrumbs clickable in ControlPanel"
```

---

### Task 5: Verify in the browser

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test each breadcrumb path**

Walk through the full flow and verify each clickable breadcrumb navigates correctly:

1. Open the configurator → go past Welcome → reach ConfigTypeStep
   - Click "home" breadcrumb → should land on WelcomeStep

2. Select a config type → reach ModuleSelectionStep
   - Click "home" → WelcomeStep
   - Click "changeConfigType" → ConfigTypeStep

3. Select a module → reach the Scene/editor (ControlPanel header visible)
   - Click "home" → WelcomeStep
   - Click "changeConfigType" → ConfigTypeStep
   - Click the third breadcrumb (set/module step) → ModuleSelectionStep

4. Confirm the last breadcrumb in every step is non-clickable (no cursor change, no navigation).
