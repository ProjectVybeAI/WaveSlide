// Chart building blocks for the Evaluation lab. Colours and sizes come from tokens.css; confusion
// matrices are a CSS grid, the rest are Recharts (or plain SVG for the histogram).
export { ConfusionMatrix, type AxisLabel, type ConfusionMatrixProps } from "./ConfusionMatrix";
export { FigureStrip, type Figure } from "./FigureStrip";
export { Histogram, type HistogramBin, type Marker } from "./Histogram";
export { HorizontalBars, type BarRow } from "./HorizontalBars";
export { PercentBars } from "./PercentBars";
export { PercentLines, type ConditionRow, type Series } from "./PercentLines";
export { figure, percent, percentExact } from "./format";
