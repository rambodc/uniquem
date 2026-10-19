import { useMemo, useState } from "react";
import { CURRENCY, SAVINGS_ASSUMPTIONS, SAVINGS_DISCLAIMER, SAVINGS_FOOTNOTE, SAVINGS_INPUTS, calculateSavings, defaultSavingsInputs, type InputKey, type SavingsResult } from "./savingsConfig";

const money = (value: number, compact = false) =>
  new Intl.NumberFormat(CURRENCY.locale, { style: "currency", currency: CURRENCY.code, maximumFractionDigits: 0, notation: compact ? "compact" : "standard" }).format(value);
const number = (value: number) => new Intl.NumberFormat(CURRENCY.locale, { maximumFractionDigits: 0 }).format(value);

function Badge() { return <span className="sw-example-badge">{SAVINGS_DISCLAIMER}</span>; }

function BeforeAfterChart({ result }: { result: SavingsResult }) {
  const groups = [
    { label: "Downtime losses", before: result.before.downtime, after: result.after.downtime },
    { label: "Equipment repairs", before: result.before.repairs, after: result.after.repairs },
    { label: "Cleanouts / workovers", before: result.before.workovers, after: result.after.workovers },
  ];
  const max = Math.max(1, ...groups.map((group) => group.before));
  const width = 520, height = 260, chartTop = 24, chartBottom = 210, barWidth = 46, groupWidth = width / groups.length;
  const y = (value: number) => chartBottom - (value / max) * (chartBottom - chartTop);
  return <figure className="sw-chart">
    <figcaption><strong>Annual sand-related cost: before vs after</strong><Badge /></figcaption>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Example bar chart comparing annual sand-related costs before and after SandWeb">
      <line x1="0" x2={width} y1={chartBottom} y2={chartBottom} className="sw-axis" />
      {groups.map((group, index) => {
        const center = groupWidth * index + groupWidth / 2;
        return <g key={group.label}>
          <rect x={center - barWidth - 4} y={y(group.before)} width={barWidth} height={chartBottom - y(group.before)} rx="6" className="sw-bar-before" />
          <rect x={center + 4} y={y(group.after)} width={barWidth} height={chartBottom - y(group.after)} rx="6" className="sw-bar-after" />
          <text x={center - barWidth / 2 - 4} y={y(group.before) - 6} textAnchor="middle" className="sw-bar-value">{money(group.before, true)}</text>
          <text x={center + barWidth / 2 + 4} y={y(group.after) - 6} textAnchor="middle" className="sw-bar-value">{money(group.after, true)}</text>
          <text x={center} y={chartBottom + 24} textAnchor="middle" className="sw-bar-label">{group.label}</text>
        </g>;
      })}
    </svg>
    <div className="sw-legend"><span><i className="before" />Without SandWeb</span><span><i className="after" />With SandWeb</span></div>
  </figure>;
}

function CumulativeChart({ result }: { result: SavingsResult }) {
  const values = result.cumulative, width = 520, height = 260, left = 14, right = 506, top = 20, bottom = 214;
  const min = Math.min(0, ...values), max = Math.max(1, ...values);
  const x = (month: number) => left + (month / (values.length - 1)) * (right - left);
  const y = (value: number) => bottom - ((value - min) / (max - min || 1)) * (bottom - top);
  const line = values.map((value, month) => `${month ? "L" : "M"}${x(month).toFixed(1)},${y(value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(values.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const payback = Number.isFinite(result.paybackMonths) && result.paybackMonths <= values.length - 1 ? result.paybackMonths : null;
  return <figure className="sw-chart">
    <figcaption><strong>Cumulative net savings over {SAVINGS_ASSUMPTIONS.projectionYears} years</strong><Badge /></figcaption>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Example line chart of cumulative net savings by month">
      <defs><linearGradient id="sw-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#ffd21f" stopOpacity=".42" /><stop offset="1" stopColor="#ffd21f" stopOpacity="0" /></linearGradient></defs>
      <line x1={left} x2={right} y1={y(0)} y2={y(0)} className="sw-axis" />
      <path d={area} fill="url(#sw-area)" />
      <path d={line} className="sw-line" />
      {payback !== null && <g><line x1={x(payback)} x2={x(payback)} y1={top} y2={bottom} className="sw-payback" /><text x={x(payback) + 6} y={top + 12} className="sw-bar-value">Payback ≈ {payback.toFixed(1)} mo</text></g>}
      {Array.from({ length: SAVINGS_ASSUMPTIONS.projectionYears + 1 }, (_, year) => <text key={year} x={x(year * 12)} y={bottom + 22} textAnchor={year === 0 ? "start" : year === SAVINGS_ASSUMPTIONS.projectionYears ? "end" : "middle"} className="sw-bar-label">{year === 0 ? "Treatment" : `Year ${year}`}</text>)}
    </svg>
    <div className="sw-legend"><span><i className="after" />Cumulative savings minus treatment cost</span></div>
  </figure>;
}

export default function SavingsCalculator() {
  const [inputs, setInputs] = useState(defaultSavingsInputs);
  const result = useMemo(() => calculateSavings(inputs), [inputs]);
  const update = (key: InputKey, value: string) => setInputs((current) => ({ ...current, [key]: Number(value) || 0 }));
  return <section className="sw-section sw-calculator" id="savings-calculator" aria-labelledby="sw-calc-title">
    <div className="sw-section-head">
      <span className="sw-kicker">Savings calculator</span>
      <h2 id="sw-calc-title">Estimate what sand control could be worth</h2>
      <p>Adjust the inputs to see how sand flowback control can affect downtime, repairs, workovers and production across your wells.</p>
      <p className="sw-disclaimer" role="note"><Badge /> {SAVINGS_FOOTNOTE}</p>
    </div>
    <div className="sw-calc-grid">
      <form className="sw-calc-inputs" onSubmit={(event) => event.preventDefault()} aria-label="Example savings inputs">
        {SAVINGS_INPUTS.map((field) => <label key={field.key}>
          <span>{field.label}{field.unit && <small> ({field.unit})</small>}</span>
          <input type="number" inputMode="decimal" min={field.min} max={field.max} step={field.step} value={inputs[field.key]} onChange={(event) => update(field.key, event.target.value)} />
          {field.hint && <em>{field.hint}</em>}
        </label>)}
        <button type="button" className="sw-reset" onClick={() => setInputs(defaultSavingsInputs())}>Reset example values</button>
      </form>
      <div className="sw-calc-results">
        <div className="sw-stats">
          <div><small>Estimated annual savings</small><strong>{money(result.annualSavings)}</strong></div>
          <div><small>Extra production</small><strong>{number(result.extraBarrels)} bbl/yr</strong></div>
          <div><small>Payback</small><strong>{Number.isFinite(result.paybackMonths) ? `${result.paybackMonths.toFixed(1)} months` : "n/a"}</strong></div>
          <div><small>Net over {SAVINGS_ASSUMPTIONS.projectionYears} years</small><strong>{money(result.netOverProjection)}</strong></div>
        </div>
        <div className="sw-charts"><BeforeAfterChart result={result} /><CumulativeChart result={result} /></div>
        <p className="sw-assumptions">Example assumptions: {Math.round(SAVINGS_ASSUMPTIONS.downtimeReduction * 100)}% less sand downtime, {Math.round(SAVINGS_ASSUMPTIONS.repairReduction * 100)}% lower sand repair cost, {Math.round(SAVINGS_ASSUMPTIONS.workoverReduction * 100)}% fewer cleanouts and {Math.round(SAVINGS_ASSUMPTIONS.productionUplift * 100)}% production uplift. {SAVINGS_DISCLAIMER}.</p>
      </div>
    </div>
  </section>;
}
