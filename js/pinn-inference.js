// ============================================================
// DamarFlow PINN Inference
// ONNX Runtime Web — Serpentinization Reactive Transport Surrogate
//
// Verified against the shipped model (demo/model/serpentinization_pinn.onnx)
// with onnxruntime (Python) before writing this file:
//   input:  "xytT"       [batch, 4]   (x_cm, y_cm, t_hours, T_celsius)
//   output: "prediction" [batch, 13]  columns 0-8 = log10(aqueous conc.),
//                                     columns 9-12 = mineral volume fraction
// Do not hardcode a different output name ("output" was assumed in an
// earlier draft of this file and does not match what this model
// actually exports -- always check session.outputNames if you retrain
// and re-export).
// ============================================================

const PINN_MODEL_URL = "demo/model/serpentinization_pinn.onnx";

const AQUEOUS_TARGETS = ["H+", "Mg++", "Fe++", "O2(aq)", "SiO2(aq)", "Na+", "Cl-", "HCO3-", "Tracer"];
const MINERALS = ["Fo90", "Lizardite", "Magnetite", "Brucite"];
const N_COLS = AQUEOUS_TARGETS.length + MINERALS.length; // 13

// domain, must match config.py (NX,NY,DX,DY)
const NX = 100, NY = 100;
const DX = 0.0517, DY = 0.0517;

let pinnSession = null;
let pinnLoadPromise = null;

/** Load the model once; safe to call multiple times (returns the same promise). */
function loadPINN() {
  if (pinnLoadPromise) return pinnLoadPromise;
  pinnLoadPromise = ort.InferenceSession.create(PINN_MODEL_URL, {
    executionProviders: ["wasm"],
  }).then((session) => {
    pinnSession = session;
    console.log("DamarFlow PINN loaded. inputs:", session.inputNames, "outputs:", session.outputNames);
    return session;
  }).catch((err) => {
    pinnLoadPromise = null; // allow retrying on failure
    throw err;
  });
  return pinnLoadPromise;
}

/**
 * Run inference over the full 2D grid at a given temperature/time.
 * Returns { nx, ny, columns, data } where `data` is a flat Float32Array
 * of length nx*ny*columns, row-major over (j=y, i=x) then column.
 */
async function runPINNGrid(temperature, timeHours) {
  if (!pinnSession) await loadPINN();

  const input = new Float32Array(NX * NY * 4);
  let p = 0;
  for (let j = 0; j < NY; j++) {
    for (let i = 0; i < NX; i++) {
      input[p++] = (i + 0.5) * DX;
      input[p++] = (j + 0.5) * DY;
      input[p++] = timeHours;
      input[p++] = temperature;
    }
  }

  const tensor = new ort.Tensor("float32", input, [NX * NY, 4]);
  const feeds = {};
  feeds[pinnSession.inputNames[0]] = tensor;

  const results = await pinnSession.run(feeds);
  const outName = pinnSession.outputNames[0];
  const raw = results[outName].data;

  return { nx: NX, ny: NY, columns: N_COLS, data: raw, temperature, timeHours };
}

/**
 * Extract one field as a 2D array [ny][nx], already converted out of
 * log10 space for aqueous species. `fieldIndex` 0-8 = aqueous,
 * 9-12 = mineral volume fraction.
 */
function extractField2D(prediction, fieldIndex) {
  const { nx, ny, columns, data } = prediction;
  const isMineral = fieldIndex >= AQUEOUS_TARGETS.length;
  const z = new Array(ny);
  for (let j = 0; j < ny; j++) {
    const row = new Array(nx);
    for (let i = 0; i < nx; i++) {
      const cellStart = (j * nx + i) * columns;
      let v = data[cellStart + fieldIndex];
      if (!isMineral) v = Math.pow(10, v); // log10(C) -> C
      row[i] = v;
    }
    z[j] = row;
  }
  return z;
}

function fieldDisplayName(fieldIndex) {
  const names = ["H\u2082", "Mg\u00b2\u207a", "Fe\u00b2\u207a", "O\u2082(aq)", "SiO\u2082(aq)",
    "Na\u207a", "Cl\u207b", "HCO\u2083\u207b", "Tracer",
    "Fo90 (olivine)", "Lizardite", "Magnetite", "Brucite"];
  // note: "H+" is rendered as H\u207a below in the dropdown; keep this
  // array in sync with the <select> options in index.html if you add fields
  names[0] = "H\u207a";
  return names[fieldIndex];
}

function fieldIsMineral(fieldIndex) {
  return fieldIndex >= AQUEOUS_TARGETS.length;
}
