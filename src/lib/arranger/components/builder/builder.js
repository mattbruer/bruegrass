/**
 * @typedef {import('../../chart/writtenChart.js').WrittenChart} WrittenChart
 * @typedef {{ section: number, bar: number, chord: number }} Picked
 *   the bar (and chord in it) the builder is changing; `bar` one past the
 *   section's last is the "+" bar, which a chord adds
 * @typedef {(change: (chart: WrittenChart) => WrittenChart, next?: Picked | null, typing?: string) => void} Edit
 *   change the chart; next: what to pick after; typing: words typed in one
 *   place, undone as one change
 */
export {};
