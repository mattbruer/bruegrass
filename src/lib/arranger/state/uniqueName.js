/**
 * A name not already taken: "Amazing Grace", else "Amazing Grace 2", "… 3".
 * @param {string} name
 * @param {string[]} taken
 */
export function uniqueName(name, taken) {
	if (!taken.includes(name)) return name;
	let number = 2;
	while (taken.includes(`${name} ${number}`)) number += 1;
	return `${name} ${number}`;
}
