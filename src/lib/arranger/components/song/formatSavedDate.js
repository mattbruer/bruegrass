/**
 * When a song was saved, for a list: "today, 3:42 PM", or "Nov 2, 2026".
 * @param {string} isoDate
 */
export function formatSavedDate(isoDate) {
	const saved = new Date(isoDate);
	const savedToday = saved.toDateString() === new Date().toDateString();

	if (savedToday) {
		return `today, ${saved.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
	}
	return saved.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
