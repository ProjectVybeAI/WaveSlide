// How chart numbers are written: whole percentages on axes and marks, one decimal in tables.
const oneDecimal = new Intl.NumberFormat("en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const twoDecimals = new Intl.NumberFormat("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });

/** 0.964 -> "96%": marks and axes. */
export const percent = (share: number) => `${whole.format(share * 100)}%`;

/** 0.964 -> "96.4%": tables, where a point matters. */
export const percentExact = (share: number) => `${oneDecimal.format(share * 100)}%`;

/** 4.7 -> "4.7", 0.33 -> "0.33", 1284 -> "1,284". */
export const figure = (value: number) => twoDecimals.format(value);
