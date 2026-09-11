// Figma Grayscale & Revert Plugin
// Main sandbox code (code.js)

// Helper to check if a node is locked or inside a locked frame
function isNodeGrayscaleable(node) {
  if (node.locked) return false;
  
  // Check if it has color properties
  const hasFills = "fills" in node && node.fills && (node.fills === figma.mixed || (Array.isArray(node.fills) && node.fills.length > 0));
  const hasStrokes = "strokes" in node && node.strokes && (node.strokes === figma.mixed || (Array.isArray(node.strokes) && node.strokes.length > 0));
  const hasEffects = "effects" in node && node.effects && Array.isArray(node.effects) && node.effects.length > 0;
  
  return hasFills || hasStrokes || hasEffects;
}

// Helper to check if a node has saved revert state
function isNodeRevertable(node) {
  try {
    return !!node.getPluginData("original-colors");
  } catch {
    return false;
  }
}

// Convert a single paint object to grayscale
function convertPaintToGrayscale(paint) {
  if (!paint) return paint;
  const newPaint = JSON.parse(JSON.stringify(paint)); // Deep copy to edit
  
  if (newPaint.type === "SOLID") {
    const { r, g, b } = newPaint.color;
    // BT.709 sRGB luminance formula
    const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    newPaint.color = { r: gray, g: gray, b: gray };
    // If this paint's color is bound to a Variable (design token), the binding
    // takes precedence over the literal color at render time — Figma re-resolves
    // it on copy/paste and the original color reappears. Strip it so the gray
    // literal actually sticks; the pre-conversion paint (with its binding) is
    // preserved separately in the revert backup.
    if (newPaint.boundVariables) {
      delete newPaint.boundVariables.color;
      if (Object.keys(newPaint.boundVariables).length === 0) delete newPaint.boundVariables;
    }
  } else if (
    newPaint.type === "GRADIENT_LINEAR" ||
    newPaint.type === "GRADIENT_RADIAL" ||
    newPaint.type === "GRADIENT_ANGULAR" ||
    newPaint.type === "GRADIENT_DIAMOND"
  ) {
    if (newPaint.gradientStops) {
      newPaint.gradientStops = newPaint.gradientStops.map(stop => {
        const { r, g, b } = stop.color;
        const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const newStop = {
          ...stop,
          color: { r: gray, g: gray, b: gray, a: stop.color.a }
        };
        if (newStop.boundVariables) {
          delete newStop.boundVariables.color;
          if (Object.keys(newStop.boundVariables).length === 0) delete newStop.boundVariables;
        }
        return newStop;
      });
    }
  } else if (newPaint.type === "IMAGE") {
    // Figma allows setting image filters directly
    newPaint.filters = newPaint.filters || {};
    newPaint.filters.saturation = -1; // -1 means 0% saturation (grayscale)
  }
  
  return newPaint;
}

// Convert a single effect object to grayscale
function convertEffectToGrayscale(effect) {
  if (!effect) return effect;
  const newEffect = JSON.parse(JSON.stringify(effect));
  
  if (newEffect.type === "DROP_SHADOW" || newEffect.type === "INNER_SHADOW") {
    const { r, g, b, a } = newEffect.color;
    const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    newEffect.color = { r: gray, g: gray, b: gray, a };
    // Same variable-binding issue as paints: strip so the gray color persists.
    if (newEffect.boundVariables) {
      delete newEffect.boundVariables.color;
      if (Object.keys(newEffect.boundVariables).length === 0) delete newEffect.boundVariables;
    }
  }
  
  return newEffect;
}

// Apply grayscale conversion to a node
function makeNodeGrayscale(node) {
  try {
    // 1. Back up original state if not already backed up
    const hasBackup = node.getPluginData("original-colors");
    if (!hasBackup) {
      const backup = {};
      
      // Handle Mixed text colors (range fills)
      if (node.type === "TEXT" && node.fills === figma.mixed) {
        const len = node.characters.length;
        const textRanges = [];
        let start = 0;
        while (start < len) {
          const nextStyleId = node.getRangeFillStyleId(start, start + 1);
          const nextFills = node.getRangeFills(start, start + 1);
          let end = start + 1;
          while (end < len) {
            const currentStyleId = node.getRangeFillStyleId(end, end + 1);
            const currentFills = node.getRangeFills(end, end + 1);
            
            const isSameStyle = currentStyleId === nextStyleId;
            const isSameFills = JSON.stringify(currentFills) === JSON.stringify(nextFills);
            
            if (isSameStyle && isSameFills) {
              end++;
            } else {
              break;
            }
          }
          textRanges.push({ start, end, fills: nextFills, fillStyleId: nextStyleId });
          start = end;
        }
        backup.textRanges = textRanges;
      } else {
        if ("fills" in node && node.fills !== figma.mixed) {
          backup.fills = node.fills;
          backup.fillStyleId = node.fillStyleId;
        }
      }

      if ("strokes" in node && node.strokes !== figma.mixed) {
        backup.strokes = node.strokes;
        backup.strokeStyleId = node.strokeStyleId;
      }
      
      if ("effects" in node && node.effects !== figma.mixed) {
        backup.effects = node.effects;
      }
      
      // Save node-level bound variables
      if (node.boundVariables) {
        backup.boundVariables = {};
        if (node.boundVariables.fills) backup.boundVariables.fills = node.boundVariables.fills;
        if (node.boundVariables.strokes) backup.boundVariables.strokes = node.boundVariables.strokes;
        if (node.boundVariables.effects) backup.boundVariables.effects = node.boundVariables.effects;
      }
      
      node.setPluginData("original-colors", JSON.stringify(backup));
    }

    // 2. Detach Color Styles (so we don't modify global design tokens)
    if ("fillStyleId" in node && node.fillStyleId && node.fillStyleId !== figma.mixed) {
      node.fillStyleId = "";
    }
    if ("strokeStyleId" in node && node.strokeStyleId && node.strokeStyleId !== figma.mixed) {
      node.strokeStyleId = "";
    }

    // 3. Convert Fills
    if (node.type === "TEXT" && node.fills === figma.mixed) {
      const saved = node.getPluginData("original-colors");
      if (saved) {
        const backup = JSON.parse(saved);
        if (backup.textRanges) {
          for (const range of backup.textRanges) {
            // Detach range style if any
            try {
              node.setRangeFillStyleId(range.start, range.end, "");
            } catch {}
            const grayFills = range.fills.map(convertPaintToGrayscale);
            node.setRangeFills(range.start, range.end, grayFills);
          }
        }
      }
    } else if ("fills" in node && Array.isArray(node.fills)) {
      node.fills = node.fills.map(convertPaintToGrayscale);
    }

    // 4. Convert Strokes
    if ("strokes" in node && Array.isArray(node.strokes)) {
      node.strokes = node.strokes.map(convertPaintToGrayscale);
    }

    // 5. Convert Effects (Shadows)
    if ("effects" in node && Array.isArray(node.effects)) {
      node.effects = node.effects.map(convertEffectToGrayscale);
    }
  } catch (err) {
    console.error("Failed to convert node to grayscale:", node.name, err);
  }
}

// Revert grayscale conversion
function revertNodeColors(node) {
  try {
    const saved = node.getPluginData("original-colors");
    if (!saved) return;

    const backup = JSON.parse(saved);

    // Restore text ranges if they exist (for mixed text fills)
    if (backup.textRanges && node.type === "TEXT") {
      for (const range of backup.textRanges) {
        if (range.fillStyleId) {
          try {
            node.setRangeFillStyleId(range.start, range.end, range.fillStyleId);
          } catch {
            // Style ID might no longer exist, fallback to raw colors
            node.setRangeFills(range.start, range.end, range.fills);
          }
        } else if (range.fills) {
          node.setRangeFills(range.start, range.end, range.fills);
        }
      }
    } else {
      // Restore fills
      if ("fillStyleId" in node && backup.fillStyleId !== undefined) {
        try {
          if (backup.fillStyleId) {
            node.fillStyleId = backup.fillStyleId;
          } else {
            node.fillStyleId = "";
            node.fills = backup.fills;
          }
        } catch {
          node.fillStyleId = "";
          node.fills = backup.fills;
        }
      } else if ("fills" in node && backup.fills !== undefined) {
        node.fills = backup.fills;
      }
    }

    // Restore strokes
    if ("strokeStyleId" in node && backup.strokeStyleId !== undefined) {
      try {
        if (backup.strokeStyleId) {
          node.strokeStyleId = backup.strokeStyleId;
        } else {
          node.strokeStyleId = "";
          node.strokes = backup.strokes;
        }
      } catch {
        node.strokeStyleId = "";
        node.strokes = backup.strokes;
      }
    } else if ("strokes" in node && backup.strokes !== undefined) {
      node.strokes = backup.strokes;
    }

    // Restore effects
    if ("effects" in node && backup.effects !== undefined) {
      node.effects = backup.effects;
    }

    // Restore node-level bound variables
    if (backup.boundVariables && node.setBoundVariable) {
      for (const prop of ["fills", "strokes", "effects"]) {
        if (backup.boundVariables[prop]) {
          try {
            const binding = backup.boundVariables[prop];
            if (binding && binding.id) {
              const variable = figma.variables.getVariableById(binding.id);
              if (variable) {
                node.setBoundVariable(prop, variable);
              }
            }
          } catch (e) {
            console.warn("Failed to restore variable binding for", prop, e);
          }
        }
      }
    }

    // Clean up metadata
    node.setPluginData("original-colors", "");
  } catch (err) {
    console.error("Failed to revert node colors:", node.name, err);
  }
}

// Collect selected nodes and all of their descendants recursively (avoiding duplicates)
function getSelectedNodesToProcess() {
  const selection = figma.currentPage.selection;
  const collected = new Set();
  
  function collect(node) {
    collected.add(node);
    if ("children" in node) {
      for (const child of node.children) {
        collect(child);
      }
    }
  }
  
  for (const node of selection) {
    collect(node);
  }
  
  return Array.from(collected);
}

// Calculate and send current selection stats to UI
function sendSelectionStats() {
  const selection = figma.currentPage.selection;
  const nodes = getSelectedNodesToProcess();
  
  let grayscaleable = 0;
  let revertable = 0;
  
  for (const node of nodes) {
    if (isNodeGrayscaleable(node)) grayscaleable++;
    if (isNodeRevertable(node)) revertable++;
  }
  
  figma.ui.postMessage({
    type: "selection-update",
    totalSelected: selection.length,
    totalCollected: nodes.length,
    grayscaleable,
    revertable
  });
}

// --- Menu Command Routing ---

if (figma.command === "grayscale-direct") {
  const nodes = getSelectedNodesToProcess();
  let count = 0;
  for (const node of nodes) {
    if (isNodeGrayscaleable(node)) {
      makeNodeGrayscale(node);
      count++;
    }
  }
  figma.notify(`Converted ${count} elements to grayscale.`);
  figma.closePlugin();
} else if (figma.command === "revert-direct") {
  const nodes = getSelectedNodesToProcess();
  let count = 0;
  for (const node of nodes) {
    if (isNodeRevertable(node)) {
      revertNodeColors(node);
      count++;
    }
  }
  figma.notify(`Reverted ${count} elements to original colors.`);
  figma.closePlugin();
} else {
  // Show UI Panel (Default mode)
  figma.showUI(__html__, { width: 320, height: 380, themeColors: true });
  
  // Initial stats
  sendSelectionStats();
  
  // Listen for selection changes in the canvas
  figma.on("selectionchange", () => {
    sendSelectionStats();
  });
  
  // Handle messages from UI
  figma.ui.onmessage = (msg) => {
    if (msg.type === "convert-grayscale") {
      const nodes = getSelectedNodesToProcess();
      let count = 0;
      for (const node of nodes) {
        if (isNodeGrayscaleable(node)) {
          makeNodeGrayscale(node);
          count++;
        }
      }
      figma.notify(`Converted ${count} elements to grayscale.`);
      sendSelectionStats();
    } else if (msg.type === "revert-colors") {
      const nodes = getSelectedNodesToProcess();
      let count = 0;
      for (const node of nodes) {
        if (isNodeRevertable(node)) {
          revertNodeColors(node);
          count++;
        }
      }
      figma.notify(`Reverted ${count} elements to original colors.`);
      sendSelectionStats();
    } else if (msg.type === "close") {
      figma.closePlugin();
    }
  };
}
