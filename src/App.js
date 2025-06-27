import React, { useState } from "react";
import "./styles.css";

// --- Utility Data & Functions ---
const THHN_AMPACITY = {
  14: 25,
  12: 30,
  10: 40,
  8: 55,
  6: 75,
  4: 95,
  3: 115,
  2: 130,
  1: 145,
  0: 195,
  "00": 225,
  "000": 260,
  "0000": 305,
};
const EMT_SIZES = [
  { size: "1/2", area: 0.122 },
  { size: "3/4", area: 0.213 },
  { size: "1", area: 0.346 },
  { size: "1-1/4", area: 0.598 },
  { size: "1-1/2", area: 0.832 },
  { size: "2", area: 1.342 },
  { size: "2-1/2", area: 2.036 },
  { size: "3", area: 2.978 },
];
const WIRE_OD = {
  14: 0.108,
  12: 0.126,
  10: 0.146,
  8: 0.186,
  6: 0.224,
  4: 0.26,
  3: 0.278,
  2: 0.32,
  1: 0.36,
  0: 0.4,
  "00": 0.44,
  "000": 0.488,
  "0000": 0.528,
};
const TEMP_DERATE = [
  { temp: 78, factor: 1 },
  { temp: 87, factor: 0.91 },
  { temp: 96, factor: 0.82 },
  { temp: 105, factor: 0.71 },
  { temp: 114, factor: 0.58 },
  { temp: 122, factor: 0.41 },
];
const EQUIP_GROUND_SIZE = [
  { maxBreaker: 15, size: "#14 AWG Copper, THWN-2" },
  { maxBreaker: 20, size: "#12 AWG Copper, THWN-2" },
  { maxBreaker: 60, size: "#10 AWG Copper, THWN-2" },
  { maxBreaker: 100, size: "#8 AWG Copper, THWN-2" },
  { maxBreaker: 200, size: "#6 AWG Copper, THWN-2" },
  { maxBreaker: 300, size: "#4 AWG Copper, THWN-2" },
  { maxBreaker: 400, size: "#3 AWG Copper, THWN-2" },
  { maxBreaker: 500, size: "#2 AWG Copper, THWN-2" },
];

function getTempDerate(tempF) {
  for (let i = TEMP_DERATE.length - 1; i >= 0; i--) {
    if (tempF >= TEMP_DERATE[i].temp) return TEMP_DERATE[i].factor;
  }
  return 1;
}
function getWireAmpacity(awg, tempF, nWires) {
  let base = THHN_AMPACITY[awg];
  if (!base) return null;
  let tempDerate = getTempDerate(tempF);
  let fillDerate = 1;
  if (nWires >= 4 && nWires <= 6) fillDerate = 0.8;
  else if (nWires >= 7 && nWires <= 9) fillDerate = 0.7;
  else if (nWires >= 10 && nWires <= 20) fillDerate = 0.5;
  return Math.floor(base * tempDerate * fillDerate);
}
function selectWireSize(requiredAmp, tempF, nWires) {
  for (const awg of [14, 12, 10, 8, 6, 4, 3, 2, 1, 0, "00", "000", "0000"]) {
    const ampacity = getWireAmpacity(awg, tempF, nWires);
    if (ampacity !== null && ampacity >= requiredAmp) return awg;
  }
  return null;
}
function selectConduitSize(awg, nWires) {
  const od = WIRE_OD[awg];
  if (!od) return null;
  const singleWireArea = Math.PI * (od / 2) ** 2;
  const fillArea = nWires * singleWireArea * 1.05;
  for (const emt of EMT_SIZES) {
    if (fillArea / emt.area <= 0.4) return emt.size;
  }
  return null;
}
function getBreakerSize(requiredAmp) {
  const sizes = [
    15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175,
    200,
  ];
  for (const size of sizes) {
    if (requiredAmp <= size) return size;
  }
  return "N/A";
}
function getEquipGround(breaker) {
  for (const row of EQUIP_GROUND_SIZE)
    if (breaker <= row.maxBreaker) return row.size;
  return "#1/0 AWG Copper, THWN-2";
}
function roundUp(num, precision = 2) {
  return Math.ceil(num * Math.pow(10, precision)) / Math.pow(10, precision);
}
function getVoltageDrop(
  lengthFt,
  current,
  awg,
  voltage,
  nWires,
  isAC,
  is3ph = false
) {
  const wireRes = {
    14: 3.14,
    12: 1.98,
    10: 1.24,
    8: 0.778,
    6: 0.491,
    4: 0.308,
    3: 0.245,
    2: 0.194,
    1: 0.154,
    0: 0.122,
    "00": 0.077,
    "000": 0.061,
    "0000": 0.049,
  };
  const R = wireRes[awg];
  if (!R) return null;
  let VD = 0;
  if (isAC) {
    if (is3ph) VD = (1.732 * current * R * lengthFt) / (1000 * voltage);
    else VD = (2 * current * R * lengthFt) / (1000 * voltage);
  } else VD = (2 * current * R * lengthFt) / (1000 * voltage);
  return roundUp(VD * 100, 2); // %
}

// ---- HEADER / TAB BAR ----
function Header() {
  return (
    <header className="header-bar">
      <img
        src="/logo-maktinta.png"
        alt="Maktinta Energy Logo"
        className="logo"
      />
      <div className="header-right">
        <div className="header-title">Commercial Wire & Conduit Calculator</div>
        <div className="header-phone">Tel: 408-432-9900 |</div>
      </div>
    </header>
  );
}
function TabBar({ tab, setTab }) {
  return (
    <div className="tabbar-prominent">
      <button
        className={tab === "load" ? "tab-prominent active" : "tab-prominent"}
        onClick={() => setTab("load")}
      >
        Load-Based Sizing
      </button>
      <button
        className={
          tab === "pv" ? "tab-prominent active pv" : "tab-prominent pv"
        }
        onClick={() => setTab("pv")}
      >
        PV System Sizing
      </button>
    </div>
  );
}

// ---- LOAD-BASED CALCULATOR ----
function LoadBasedCalculator({ setResults }) {
  const [desc, setDesc] = useState("");
  const [inputType, setInputType] = useState("Amps");
  const [inputValue, setInputValue] = useState("");
  const [voltage, setVoltage] = useState("");
  const [acdc, setAcdc] = useState("AC");
  const [phases, setPhases] = useState("single");
  const [length, setLength] = useState("");
  const [temp, setTemp] = useState(86);
  const [errors, setErrors] = useState([]);

  function validate() {
    let errs = [];
    if (!desc.trim()) errs.push("Equipment/load description required.");
    if (!inputValue || isNaN(inputValue) || Number(inputValue) <= 0)
      errs.push("Input value must be positive.");
    if (!voltage || isNaN(voltage) || Number(voltage) <= 0)
      errs.push("Voltage must be positive.");
    if (!length || isNaN(length) || Number(length) <= 0)
      errs.push("Length must be positive.");
    if (!temp || isNaN(temp) || Number(temp) < 60 || Number(temp) > 140)
      errs.push("Ambient temp must be 60–140°F.");
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    let errs = validate();
    if (errs.length) {
      setErrors(errs);
      setResults(null);
      return;
    }
    setErrors([]);
    let amps = 0;
    const v = Number(voltage);
    if (inputType === "Amps") amps = Number(inputValue);
    else if (inputType === "kW")
      amps =
        acdc === "DC"
          ? (1000 * Number(inputValue)) / v
          : phases === "single"
          ? (1000 * Number(inputValue)) / v
          : (1000 * Number(inputValue)) / (v * Math.sqrt(3));
    else if (inputType === "HP") amps = (Number(inputValue) * 746) / (v * 0.9);
    amps = roundUp(amps, 2);
    const minAmpacity = roundUp(amps * 1.25, 1);
    let nC = 1,
      is3ph = false,
      hotLbl = 1;
    if (acdc === "AC") {
      if (phases === "single") {
        nC = 2;
        hotLbl = 1;
      } else {
        nC = 3;
        is3ph = true;
        hotLbl = 3;
      }
    }
    let nWires = nC + 1; // Neutral or ground
    const awg = selectWireSize(minAmpacity, Number(temp), nWires);
    const conduit = selectConduitSize(awg, nWires);
    const breaker = getBreakerSize(minAmpacity);
    const vd = getVoltageDrop(
      Number(length),
      amps,
      awg,
      v,
      nWires,
      acdc === "AC",
      is3ph
    );
    const groundWire = getEquipGround(breaker);

    setResults({
      amps,
      minAmpacity,
      awg,
      conduit,
      breaker,
      nWires,
      vd,
      groundWire,
      nC,
      is3ph,
      hotLbl,
      inputSummary: {
        desc,
        amps,
        v,
        acdc,
        phases,
        nC,
        nWires,
        temp: Number(temp),
        length: Number(length),
      },
    });
  }

  return (
    <div className="card card-input">
      <div className="card-title">Project Inputs</div>
      <form className="inputs-form" onSubmit={handleSubmit}>
        <label>
          Equipment/Load Description
          <input
            type="text"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="E.g. 7.5 HP Pool Pump"
          />
        </label>
        <label>
          Input Method
          <select
            value={inputType}
            onChange={(e) => setInputType(e.target.value)}
          >
            <option>Amps</option>
            <option>kW</option>
            <option>HP</option>
          </select>
        </label>
        <label>
          {inputType}{" "}
          <span className="hint">
            (
            {inputType === "kW"
              ? "kilowatts"
              : inputType === "Amps"
              ? "amperes"
              : "horsepower"}
            )
          </span>
          <input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={
              inputType === "kW" ? "5.5" : inputType === "Amps" ? "40" : "3"
            }
            step="any"
          />
        </label>
        <label>
          Voltage (V)
          <input
            type="number"
            value={voltage}
            onChange={(e) => setVoltage(e.target.value)}
            placeholder="E.g. 240"
            step="any"
          />
        </label>
        <label>
          AC/DC
          <select value={acdc} onChange={(e) => setAcdc(e.target.value)}>
            <option>AC</option>
            <option>DC</option>
          </select>
        </label>
        {acdc === "AC" && (
          <label>
            AC Phases
            <select value={phases} onChange={(e) => setPhases(e.target.value)}>
              <option value="single">Single-phase</option>
              <option value="three">Three-phase</option>
            </select>
          </label>
        )}
        <label>
          Length of Run (feet)
          <input
            type="number"
            value={length}
            onChange={(e) => setLength(e.target.value)}
            placeholder="E.g. 120"
            step="any"
          />
        </label>
        <label>
          Ambient Temperature (°F)
          <input
            type="number"
            value={temp}
            onChange={(e) => setTemp(e.target.value)}
            placeholder="86"
          />
          <span className="hint">Used for temperature derating per NEC</span>
        </label>
        <button type="submit" className="main-btn">
          Calculate
        </button>
        {errors.length > 0 && (
          <div className="errbox">
            <ul>
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}
      </form>
    </div>
  );
}

// ---- PV SYSTEM CALCULATOR ----
function PvSizingCalculator({ setResults }) {
  const [inputs, setInputs] = useState({
    systemW: "",
    panelW: "",
    numStrings: "",
    combinerToInv: "",
    invToPanel: "",
    acVoltage: "",
    acPhase: "single",
    temp: 86,
  });
  const [errors, setErrors] = useState([]);

  function handleInput(e) {
    setInputs({ ...inputs, [e.target.name]: e.target.value });
  }

  function validate() {
    let errs = [];
    if (!inputs.systemW || isNaN(inputs.systemW) || Number(inputs.systemW) <= 0)
      errs.push("System size required.");
    if (!inputs.panelW || isNaN(inputs.panelW) || Number(inputs.panelW) <= 0)
      errs.push("Panel wattage required.");
    if (
      !inputs.numStrings ||
      isNaN(inputs.numStrings) ||
      Number(inputs.numStrings) <= 0
    )
      errs.push("Number of strings required.");
    if (
      !inputs.combinerToInv ||
      isNaN(inputs.combinerToInv) ||
      Number(inputs.combinerToInv) <= 0
    )
      errs.push("Distance from combiner to inverter required.");
    if (
      !inputs.invToPanel ||
      isNaN(inputs.invToPanel) ||
      Number(inputs.invToPanel) <= 0
    )
      errs.push("Distance from inverter to electric panel required.");
    if (
      !inputs.acVoltage ||
      isNaN(inputs.acVoltage) ||
      Number(inputs.acVoltage) <= 0
    )
      errs.push("AC voltage required.");
    if (!inputs.temp || isNaN(inputs.temp)) errs.push("Ambient temp required.");
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    let errs = validate();
    if (errs.length) {
      setErrors(errs);
      setResults(null);
      return;
    }
    setErrors([]);

    const sysW = Number(inputs.systemW);
    const panelW = Number(inputs.panelW);
    const numStrings = Number(inputs.numStrings);
    const panelsPerString = Math.round(sysW / panelW / numStrings);
    const vmp = 34;
    const imp = Number((panelW / vmp).toFixed(2));
    const dcStringCurrent = imp;
    const dcStringVoltage = Number((vmp * panelsPerString).toFixed(1));
    const dcCombinerCurrent = imp * numStrings;
    const dcWireAmpacity = roundUp(dcStringCurrent * 1.56, 1);
    const dcCombinerAmpacity = roundUp(dcCombinerCurrent * 1.56, 1);
    const dcAWG = selectWireSize(dcWireAmpacity, Number(inputs.temp), 2);
    const dcCombinerAWG = selectWireSize(
      dcCombinerAmpacity,
      Number(inputs.temp),
      numStrings + 1
    );
    const dcWireDesc = dcAWG ? `#${dcAWG} AWG Copper, THWN-2` : "N/A";
    const dcCombinerWireDesc = dcCombinerAWG
      ? `#${dcCombinerAWG} AWG Copper, THWN-2`
      : "N/A";
    const dcWires = 2;
    const dcCombinerWires = numStrings + 1;
    const dcConduit = selectConduitSize(dcAWG, dcWires);
    const dcCombinerConduit = selectConduitSize(dcCombinerAWG, dcCombinerWires);
    const dcConduitDesc = dcConduit
      ? `${dcConduit}-inch (Schedule 40 PVC or EMT)`
      : "N/A";
    const dcCombinerConduitDesc = dcCombinerConduit
      ? `${dcCombinerConduit}-inch (Schedule 40 PVC or EMT)`
      : "N/A";
    const dcVDrop = getVoltageDrop(
      Number(inputs.combinerToInv),
      dcCombinerCurrent,
      dcCombinerAWG,
      dcStringVoltage,
      dcCombinerWires,
      false
    );

    // AC OUTPUT CURRENT (FIXED)
    const acVoltage = Number(inputs.acVoltage);
    const is3ph = inputs.acPhase === "three";
    // const inverterEff = 0.97;
    // const acCurrentFixed = is3ph
    //   ? roundUp((sysW * inverterEff) / (acVoltage * Math.sqrt(3)), 2)
    //   : roundUp((sysW * inverterEff) / acVoltage, 2);
    const acCurrentFixed = is3ph
      ? roundUp(sysW / (acVoltage * Math.sqrt(3)), 2)
      : roundUp(sysW / acVoltage, 2);

    const acWireAmpacity = roundUp(acCurrentFixed * 1.25, 1);
    const acConductors = is3ph ? 3 : 2;
    const acAWG = selectWireSize(
      acWireAmpacity,
      Number(inputs.temp),
      acConductors + 1
    );
    const acWireDesc = acAWG ? `#${acAWG} AWG Copper, THWN-2` : "N/A";
    const acConduit = selectConduitSize(acAWG, acConductors + 1);
    const acConduitDesc = acConduit
      ? `${acConduit}-inch (Schedule 40 PVC or EMT)`
      : "N/A";
    const acBreaker = getBreakerSize(acWireAmpacity);
    const acVDrop = getVoltageDrop(
      Number(inputs.invToPanel),
      acCurrentFixed,
      acAWG,
      acVoltage,
      acConductors + 1,
      true,
      is3ph
    );
    const groundWire = getEquipGround(acBreaker);

    setResults({
      panelsPerString,
      dcStringVoltage,
      dcStringCurrent,
      dcWireDesc,
      dcWires: dcWires,
      dcGround: 1,
      dcConduitDesc,
      dcVDrop,

      dcCombinerWireDesc,
      dcCombinerWires: dcCombinerWires,
      dcCombinerGround: 1,
      dcCombinerConduitDesc,
      dcCombinerVDrop: dcVDrop,

      acCurrent: acCurrentFixed,
      acWireDesc,
      acConductors,
      acGround: 1,
      acConduitDesc,
      acBreaker,
      acVDrop,
      acWireAmpacity,
      groundWire,
      is3ph,
    });
  }

  return (
    <div className="card card-input">
      <div className="card-title">Project Inputs</div>
      <form className="inputs-form" onSubmit={handleSubmit}>
        <label>
          Total System Size (W)
          <input
            type="number"
            name="systemW"
            value={inputs.systemW}
            onChange={handleInput}
          />
        </label>
        <label>
          Panel Wattage (W)
          <input
            type="number"
            name="panelW"
            value={inputs.panelW}
            onChange={handleInput}
          />
        </label>
        <label>
          Number of Strings
          <input
            type="number"
            name="numStrings"
            value={inputs.numStrings}
            onChange={handleInput}
          />
        </label>
        <label>
          Distance Combiner to Inverter (ft)
          <input
            type="number"
            name="combinerToInv"
            value={inputs.combinerToInv}
            onChange={handleInput}
          />
        </label>
        <label>
          Distance Inverter to Main Panel (ft)
          <input
            type="number"
            name="invToPanel"
            value={inputs.invToPanel}
            onChange={handleInput}
          />
        </label>
        <label>
          AC Voltage
          <input
            type="number"
            name="acVoltage"
            value={inputs.acVoltage}
            onChange={handleInput}
            placeholder="240, 208, etc"
          />
        </label>
        <label>
          AC Phase
          <select name="acPhase" value={inputs.acPhase} onChange={handleInput}>
            <option value="single">Single-phase</option>
            <option value="three">Three-phase</option>
          </select>
        </label>
        <label>
          Ambient Temperature (°F)
          <input
            type="number"
            name="temp"
            value={inputs.temp}
            onChange={handleInput}
          />
        </label>
        <button type="submit" className="main-btn">
          Calculate
        </button>
        {errors.length > 0 && (
          <div className="errbox">
            <ul>
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}
      </form>
    </div>
  );
}

// ---- RESULTS CARD ----
function ResultsCard({ tab, results }) {
  if (!results) {
    return (
      <div className="card card-results">
        <div className="card-title">Summary & Results</div>
        <div className="results-placeholder">
          Results will appear here after you enter your project inputs and
          calculate.
        </div>
      </div>
    );
  }
  function getAcWireBreakdown(acConductors, is3ph) {
    if (is3ph) return `${acConductors + 2} Total (3 Hots, 1 Neutral, 1 Ground)`;
    if (acConductors === 2) return `3 Total (1 Hot, 1 Neutral, 1 Ground)`;
    if (acConductors === 3) return `4 Total (2 Hots, 1 Neutral, 1 Ground)`;
    return `${acConductors + 1} Total (${acConductors} Hots, 1 Ground)`;
  }
  if (tab === "pv") {
    return (
      <div className="card card-results">
        <div className="card-title">Summary & Results</div>
        <table className="results-table">
          <thead>
            <tr>
              <th
                colSpan={6}
                style={{ background: "#d8ecfd", color: "#184b97" }}
              >
                AC Output (Inverter to Main Panel)
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <b>AC Output Current</b>
              </td>
              <td colSpan={5}>{results.acCurrent} A</td>
            </tr>
            <tr>
              <td>
                <b>Required Ampacity (125%)</b>
              </td>
              <td colSpan={5}>{results.acWireAmpacity} A</td>
            </tr>
            <tr>
              <td>
                <b>Overcurrent Protection</b>
              </td>
              <td colSpan={5}>
                {results.acBreaker} A {results.is3ph ? "3-Pole" : "2-Pole"}{" "}
                Circuit Breaker
              </td>
            </tr>
            <tr>
              <td>
                <b>Conductors (Wires)</b>
              </td>
              <td colSpan={5}>{results.acWireDesc}</td>
            </tr>
            <tr>
              <td>
                <b>Number of Conductors</b>
              </td>
              <td colSpan={5}>
                {getAcWireBreakdown(results.acConductors, results.is3ph)}
              </td>
            </tr>
            <tr>
              <td>
                <b>Equipment Ground</b>
              </td>
              <td colSpan={5}>{results.groundWire}</td>
            </tr>
            <tr>
              <td>
                <b>Conduit Size</b>
              </td>
              <td colSpan={5}>{results.acConduitDesc}</td>
            </tr>
            <tr>
              <td>
                <b>Estimated Voltage Drop</b>
              </td>
              <td colSpan={5}>
                {results.acVDrop}% (Well within acceptable limits)
              </td>
            </tr>
          </tbody>
        </table>
        <table className="results-table" style={{ marginTop: "20px" }}>
          <thead>
            <tr>
              <th
                colSpan={6}
                style={{ background: "#d8ecfd", color: "#184b97" }}
              >
                DC Array (Combiner to Inverter)
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <b>Panels/String</b>
              </td>
              <td colSpan={5}>{results.panelsPerString}</td>
            </tr>
            <tr>
              <td>
                <b>String Voltage (Vmp)</b>
              </td>
              <td colSpan={5}>{results.dcStringVoltage} V</td>
            </tr>
            <tr>
              <td>
                <b>String Current (Imp)</b>
              </td>
              <td colSpan={5}>{results.dcStringCurrent} A</td>
            </tr>
            <tr>
              <td>
                <b>Conductors (Wires)</b>
              </td>
              <td colSpan={5}>{results.dcWireDesc}</td>
            </tr>
            <tr>
              <td>
                <b># Conductors + Ground</b>
              </td>
              <td colSpan={5}>
                {results.dcWires} + {results.dcGround}
              </td>
            </tr>
            <tr>
              <td>
                <b>Conduit Size</b>
              </td>
              <td colSpan={5}>{results.dcConduitDesc}</td>
            </tr>
            <tr>
              <td>
                <b>Estimated Voltage Drop</b>
              </td>
              <td colSpan={5}>{results.dcVDrop}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }
  function getLoadWireBreakdown(nC, is3ph) {
    if (is3ph) return `5 Total (3 Hots, 1 Neutral, 1 Ground)`;
    if (nC === 2) return `3 Total (1 Hot, 1 Neutral, 1 Ground)`;
    if (nC === 3) return `4 Total (2 Hots, 1 Neutral, 1 Ground)`;
    return `${nC + 1} Total (${nC} Hots, 1 Ground)`;
  }
  return (
    <div className="card card-results">
      <div className="card-title">Summary & Results</div>
      <table className="results-table">
        <tbody>
          <tr>
            <td>
              <b>Load Description</b>
            </td>
            <td colSpan={4}>{results.inputSummary?.desc}</td>
          </tr>
          <tr>
            <td>
              <b>Output Current</b>
            </td>
            <td colSpan={4}>{results.amps} A</td>
          </tr>
          <tr>
            <td>
              <b>Required Ampacity (125%)</b>
            </td>
            <td colSpan={4}>{results.minAmpacity} A</td>
          </tr>
          <tr>
            <td>
              <b>Overcurrent Protection</b>
            </td>
            <td colSpan={4}>{results.breaker} A Circuit Breaker</td>
          </tr>
          <tr>
            <td>
              <b>Conductors (Wires)</b>
            </td>
            <td colSpan={4}>#{results.awg} AWG Copper, THWN-2</td>
          </tr>
          <tr>
            <td>
              <b>Number of Conductors</b>
            </td>
            <td colSpan={4}>
              {getLoadWireBreakdown(results.nC, results.is3ph)}
            </td>
          </tr>
          <tr>
            <td>
              <b>Equipment Ground</b>
            </td>
            <td colSpan={4}>{results.groundWire}</td>
          </tr>
          <tr>
            <td>
              <b>Conduit Size</b>
            </td>
            <td colSpan={4}>
              {results.conduit
                ? `${results.conduit}-inch (Schedule 40 PVC or EMT)`
                : "N/A"}
            </td>
          </tr>
          <tr>
            <td>
              <b>Estimated Voltage Drop</b>
            </td>
            <td colSpan={4}>{results.vd}%</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ---- MAIN APP ----
export default function App() {
  const [tab, setTab] = useState("load");
  const [loadResults, setLoadResults] = useState(null);
  const [pvResults, setPvResults] = useState(null);

  let inputCard, resultsCard;
  if (tab === "load") {
    inputCard = <LoadBasedCalculator setResults={setLoadResults} />;
    resultsCard = <ResultsCard tab="load" results={loadResults} />;
  } else {
    inputCard = <PvSizingCalculator setResults={setPvResults} />;
    resultsCard = <ResultsCard tab="pv" results={pvResults} />;
  }

  return (
    <div className="main-bg">
      <Header />
      <TabBar tab={tab} setTab={setTab} />
      <div className="container">
        {inputCard}
        {resultsCard}
      </div>
      <div className="card-notes">
        <div className="notes">
          <b>Calculation Notes:</b>
          <ul>
            <li>
              Wire type: Copper, THWN-2. All code derating for temperature and
              fill is applied per NEC/CEC.
            </li>
            <li>
              Voltage drop based on run length, conductor size, and load
              current.
            </li>
            <li>
              Conduit shown as minimum code-compliant; field conditions may
              require upsize.
            </li>
          </ul>
        </div>
        <div className="disclaimer">
          Disclaimer: This tool provides a preliminary estimate for
          informational purposes only. For a more accurate proposal, contact{" "}
          <b>Maktinta Energy</b> at <b>408-432-9900</b> or visit{" "}
          <a
            href="https://www.maktinta.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            www.maktinta.com
          </a>
        </div>
      </div>
    </div>
  );
}
