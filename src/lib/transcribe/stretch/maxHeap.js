/**
 * A max-heap of integer ids by number keys: push, then pop the loudest.
 * Fixed capacity and typed arrays, so it never allocates while audio runs.
 * @param {number} capacity
 */
export function createMaxHeap(capacity) {
	const ids = new Int32Array(capacity);
	const keys = new Float64Array(capacity);
	let size = 0;

	/** @param {number} a @param {number} b */
	function swap(a, b) {
		const id = ids[a];
		ids[a] = ids[b];
		ids[b] = id;
		const key = keys[a];
		keys[a] = keys[b];
		keys[b] = key;
	}

	return {
		get size() {
			return size;
		},

		clear() {
			size = 0;
		},

		/** @param {number} id @param {number} key */
		push(id, key) {
			let i = size++;
			ids[i] = id;
			keys[i] = key;
			while (i > 0) {
				const parent = (i - 1) >> 1;
				if (keys[parent] >= keys[i]) break;
				swap(i, parent);
				i = parent;
			}
		},

		/** @returns {number} the id with the largest key */
		pop() {
			const top = ids[0];
			size--;
			ids[0] = ids[size];
			keys[0] = keys[size];
			let i = 0;
			for (;;) {
				const left = 2 * i + 1;
				const right = left + 1;
				let largest = i;
				if (left < size && keys[left] > keys[largest]) largest = left;
				if (right < size && keys[right] > keys[largest]) largest = right;
				if (largest === i) break;
				swap(i, largest);
				i = largest;
			}
			return top;
		}
	};
}
