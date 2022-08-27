export default class VertexList {
	constructor(data) {
		Object.assign(this, data);
		this.next = null;
		this.prev = null;
	}

	insert(entry) {
		if (this.next) this.next.prev = entry;
		entry.next = this.next;
		this.next = entry;
		entry.prev = this;
	}

	insertBefore(entry) {
		if (this.prev) this.prev.next = entry;
		entry.prev = this.prev;
		this.prev = entry;
		entry.next = this;
	}

	forEach(callback) {
		let index = 0;
		let curr = this;
		while (curr && (curr !== this || index === 0)) {
			callback(curr, index++, this);
			curr = curr.next;
		}
	}

	find(predicate) {
		let index = 0;
		let curr = this;
		while (curr && (curr !== this || index === 0)) {
			if (predicate(curr, index++, this))
				return curr;
			curr = curr.next;
		}
		return null;
	}

	every(predicate) {
		return this.find((entry, index, list) => !predicate(entry, index, list));
	}

	toArray() {
		let result = [];
		this.forEach(curr => result.push(curr));
		return result;
	}

	static fromArray(vertices) {
		let curr = null;
		let first = null;
		vertices.forEach(vertex => {
			const entry = new VertexList({ vertex, source: true });
			first ??= entry;
			if (curr)
				curr.insert(entry);
			curr = entry;
		});
		first.prev = curr;
		curr.next = first;
		return first;
	}
}
