// ============================================================
// DamarFlow Lab — UI wiring for the interactive PINN section
// Requires: js/pinn-inference.js loaded first, Plotly loaded first.
// ============================================================

(function () {
  "use strict";

  const els = {
    plot: document.getElementById("fieldPlot"),
    status: document.getElementById("fieldStatus"),
    titleReadout: document.getElementById("fieldTitleReadout"),
    fieldSelect: document.getElementById("fieldSelect"),
    tempSlider: document.getElementById("tempSlider"),
    timeSlider: document.getElementById("timeSlider"),
    tempValue: document.getElementById("tempValue"),
    timeValue: document.getElementById("timeValue"),
    runBtn: document.getElementById("runPINN"),
    downloadBtn: document.getElementById("downloadPNG"),
  };

  // Section not present on this page (e.g. a stripped-down build) -- bail quietly.
  if (!els.plot || !els.fieldSelect || !els.tempSlider || !els.timeSlider) return;

  // time slider (0..1000) maps log-uniformly onto [0.013, 2400] hours,
  // matching the training data's time range (config.TIMES_H).
  const T_MIN_H = 0.013, T_MAX_H = 2400;
  function sliderToHours(s) {
    const lo = Math.log10(T_MIN_H), hi = Math.log10(T_MAX_H);
    const frac = s / 1000;
    return Math.pow(10, lo + frac * (hi - lo));
  }
  function formatHours(h) {
    if (h < 1) return h.toFixed(3) + " h";
    if (h < 48) return h.toFixed(1) + " h";
    return (h / 24).toFixed(1) + " d";
  }

  function updateReadouts() {
    els.tempValue.textContent = els.tempSlider.value + " \u00b0C";
    els.timeValue.textContent = formatHours(sliderToHours(+els.timeSlider.value));
  }
  updateReadouts();
  els.tempSlider.addEventListener("input", updateReadouts);
  els.timeSlider.addEventListener("input", updateReadouts);

  let running = false;
  let lastPrediction = null;

  async function runAndRender() {
    if (running) return;
    running = true;
    els.runBtn.disabled = true;
    els.status.textContent = "Running \u2026";

    try {
      const T = +els.tempSlider.value;
      const t_h = sliderToHours(+els.timeSlider.value);
      const fieldIndex = +els.fieldSelect.value;

      const prediction = await runPINNGrid(T, t_h);
      lastPrediction = prediction;

      const z = extractField2D(prediction, fieldIndex);
      const isMineral = fieldIsMineral(fieldIndex);
      const name = fieldDisplayName(fieldIndex);

      const trace = {
        z,
        type: "heatmap",
        colorscale: "Viridis",
        colorbar: { title: isMineral ? "volume fraction" : "mol/kgw", titleside: "right" },
      };
      const layout = {
        margin: { l: 40, r: 10, t: 10, b: 34 },
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: "#c8d9e1", family: "IBM Plex Mono, monospace", size: 10 },
        xaxis: { title: "x (cm)", showgrid: false },
        yaxis: { title: "y (cm)", showgrid: false, scaleanchor: "x" },
      };
      Plotly.react(els.plot, [trace], layout, { responsive: true, displaylogo: false });

      els.titleReadout.textContent = name;
      els.status.textContent = `T = ${T} \u00b0C \u00b7 t = ${formatHours(t_h)}`;
    } catch (err) {
      console.error("PINN inference failed:", err);
      els.status.textContent = "Inference failed \u2014 see console.";
    } finally {
      running = false;
      els.runBtn.disabled = false;
    }
  }

  function downloadFigure() {
    if (!els.plot || !els.plot.data) {
      alert("Run inference first, then download.");
      return;
    }
    Plotly.downloadImage(els.plot, {
      format: "png",
      width: 1600,
      height: 1400,
      scale: 2,
      filename: "DamarFlow_PINN_prediction",
    });
  }

  els.runBtn.addEventListener("click", runAndRender);
  els.fieldSelect.addEventListener("change", runAndRender);
  els.tempSlider.addEventListener("change", runAndRender);
  els.timeSlider.addEventListener("change", runAndRender);
  if (els.downloadBtn) els.downloadBtn.addEventListener("click", downloadFigure);

  els.runBtn.disabled = true;
  els.status.textContent = "Loading model \u2026";
  loadPINN()
    .then(() => {
      els.runBtn.disabled = false;
      return runAndRender();
    })
    .catch((err) => {
      console.error("Failed to load PINN model:", err);
      els.status.textContent = "Model failed to load \u2014 see console.";
    });
})();
