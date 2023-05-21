import { readFileSync } from 'fs';

const EPSILON = 1.0e-8;

// Helper function that reads a polygon in the format described in the Foster et al. reference implementation
// README.txt
export function readPoly(file) {
	return readFileSync(file, 'utf8')	
		.replaceAll('\n', '')
		.split(';')
		.filter(component => component !== '')
		.map(component => component
			.split(',')
			.map(vertex => vertex.split(' ').map(Number))
		);
}

// Helper function that attempts to bring result into the same order as expected by 
// reversing result if it detects it is in the opposite direction from expected,
// and by aligning the start point to expected
export function reorder(result, expected) {
	// Compares two 2D points
	const equals = (p, q) => Math.abs(p[0] - q[0]) < EPSILON && Math.abs(p[1] - q[1]) < EPSILON;

	// Find the index of expected[0] in result
	let index = result.findIndex(equals.bind(null, expected[0]));
	if (index > -1) {
		// Check that the result is not in reverse order from expected
		// Result is in reverse order if the point at index + 1 in 
		if (!equals(result[(index + 1) % result.length], expected[1]) && equals(result[(index + 1) % result.length], expected[expected.length - 1])) {
			result = result.slice().reverse();
			index = result.length - index - 1;
		}

		result = result.slice(index).concat(result.slice(0, index));
	}
	return result;
}

// Convenience function that takes two polygons and a function containing the tests
// and calls the function once with the polygons - once in the same order as passed
// and once with roles reversed.
export function mirror(subject, clip, tests) {
	tests(subject, clip);
	tests(clip, subject);
}

export function expectPolyEqual(actual, expected) {
	// Reorder actual polygon because it might be in reverse order/starting at a different vertex than the expected polygon
	actual = reorder(actual, expected);
	// Now they should be deeply equal. Unfortunately we can't use deep equality directly here though,
	// because we need to account for floating-point imprecision.
	// So we need to compare every vertex by hand here.	
	expected.forEach((vertex, index) => {
		expect(actual[index][0]).to.be.approximately(vertex[0], EPSILON);
		expect(actual[index][1]).to.be.approximately(vertex[1], EPSILON);
});

}