import gh from '../src/greiner-hormann.js';
import { readFileSync } from 'fs';

const EPSILON = 1.0e-8;
	
// Helper function that reads a polygon in the format described in the Foster et al. reference implementation
// README.txt
function readPoly(file) {
	return readFileSync(file, 'utf8')	
		.replaceAll('\n', '')
		.split(';')
		.filter(component => component !== '')
		.map(component => component
			.split(',')
			.map(vertex => ({
				x: Number(vertex.split(' ')[0]),
				y: Number(vertex.split(' ')[1])
			}))
		);
}

// Helper function that attempts to bring result into the same order as expected by 
// reversing result if it detects it is in the opposite direction from expected,
// and by aligning the start point to expected
function reorder(result, expected) {
	// Compares two 2D points
	const equals = (p, q) => Math.abs(p.x - q.x) < EPSILON && Math.abs(p.y - q.y) < EPSILON;

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
function mirror(subject, clip, tests) {
	tests(subject, clip);
	tests(clip, subject);
}

// Convenience function that generates a test that reads 
// the subject polygon from the file test/fixtures/subject/<subject>.poly, 
// the clip polygon from test/fixtures/clip/<clip>.poly, and
// the expected result polygon(s) from test/fixtures/intersect/<subject>_<clip>.poly
// and executes a (mirrored) test on them.
function generate(subject, clip) {
	let expected = `test/fixtures/intersect/${subject}_${clip}.poly`;
	subject = `test/fixtures/subject/${subject}.poly`;
	clip = `test/fixtures/clip/${clip}.poly`;

	subject = readPoly(subject)[0];
	clip = readPoly(clip)[0];
	expected = readPoly(expected);

	mirror(subject, clip, (P, Q) => {
		let result = gh(P, Q);

		expect(result).to.be.an('array').with.lengthOf(expected.length);			
		// Check that all expected components are present in the result
		expected.forEach(expectedComponent => {
			// Find a component in the intersection result that includes all vertices of the current expected component
			let resultComponent = result.find(component => component.every(resultVertex => expectedComponent.some(expectedVertex => Math.abs(resultVertex.x - expectedVertex.x) < EPSILON && Math.abs(resultVertex.y - expectedVertex.y) < EPSILON)));			
			expect(resultComponent).to.exist;
			// Reorder the component because it might be in reverse order/starting at a different vertex
			resultComponent = reorder(resultComponent, expectedComponent);
			// Now they should be deeply equal. Unfortunately we can't use deep equality here though,
			// because there may be differences in the floating-point precision of the reference implementation
			// and this one. So we need to compare every vertex by hand here.
			expectedComponent.forEach((expectedVertex, index) => {
				expect(resultComponent[index].x).to.be.approximately(expectedVertex.x, EPSILON);
				expect(resultComponent[index].y).to.be.approximately(expectedVertex.y, EPSILON);
			});
		});
	});
}


describe('Greiner-Hormann polygon intersection with Foster et al. improvements', function() {
	describe('degenerate input', function() {
		let subject;
		beforeEach(function() {
			subject = [
				{ x: 1, y: 1 },
				{ x: 3, y: 1 },
				{ x: 2, y: 5 },
				{ x: -3, y:  5 },
				{ x: -2, y: 2 }
			];
		});
		it('should return the subject if clipped with itself', function() {			
			let result = gh(subject, subject);
			expect(result).to.be.an('array').with.lengthOf(1);
			result = result[0];
			result = reorder(result, subject);
			expect(result).to.deep.equal(subject);
		});

		it('should return an empty polygon if one of the polygons is empty', function() {
			mirror(subject, [], (P, Q) => {
				let result = gh(P, Q);
				expect(result).to.be.an('array').with.lengthOf(1);
				expect(result[0]).to.be.empty;		
			});
		});

		it('should throw when attempting to intersect with a point or a segment', function() {
			let clip = [ { x: 5, y: 5 } ];
			mirror(subject, clip, (P, Q) => expect(gh.bind(null, P, Q)).to.throw());
			clip.push({ x: 8, y: 8 });
			mirror(subject, clip, (P, Q) => expect(gh.bind(null, P, Q)).to.throw());
		});
	});

	describe('normal crossing intersections', function() {
		it('two convex polygons', function() {
			generate('convex', 'convex');
		});
		it('a convex and a concave polygon', function() {
			generate('concave', 'convex');
			generate('convex', 'concave');
		});
		it('two concave polygons', function() {
			generate('concave', 'concave');
		});
	});

	describe('degenerate crossing intersection', function() {
		it('shared vertex', function() {
			['convex','concave'].forEach(subject => generate(subject, 'cross-shared-vertex'));
		});

		it('vertex-on-edge', function() {
			['convex','concave'].forEach(subject => generate(subject, 'cross-vertex-on-edge'));
		});

		it('delayed crossing (shared edge)', function() {
			['convex','concave'].forEach(subject => generate(subject, 'cross-shared-full-edge'));
			['convex','concave'].forEach(subject => generate(subject, 'cross-shared-partial-edge'));
		});
	});

	describe('degenerate bouncing intersection (clip inside subject)', function() {
		it('shared vertex', function() {
			['convex','concave'].forEach(subject => generate(subject, 'bounce-inside-shared-vertex'));
		});

		it('vertex-on-edge', function () {
			['convex','concave'].forEach(subject => generate(subject, 'bounce-inside-vertex-on-edge'));			
		});

		it('delayed bouncing (shared edge)', function() {
			['convex','concave'].forEach(subject => generate(subject, 'bounce-inside-shared-full-edge'));
			['convex','concave'].forEach(subject => generate(subject, 'bounce-inside-shared-partial-edge'));
		});
	});

	describe('degenerate bouncing intersection (clip outside subject)', function() {
		it('shared vertex', function() {
			['convex','concave'].forEach(subject => generate(subject, 'bounce-outside-shared-vertex'));
		});

		it('vertex-on-edge', function () {
			['convex','concave'].forEach(subject => generate(subject, 'bounce-outside-vertex-on-edge'));
		});

		it('delayed bouncing (shared edge)', function() {
			['convex','concave'].forEach(subject => generate(subject, 'bounce-outside-shared-full-edge'));
			['convex','concave'].forEach(subject => generate(subject, 'bounce-outside-shared-partial-edge'));
		});
	});

	it('should return an empty polygon if there is no intersection', function() {
		let subject = readPoly('test/fixtures/subject/concave.poly')[0];
		let clip = subject.map(v => ({ x: v.x + 100, y: v.y }));
		mirror(subject, clip, (P, Q) => {
			let result = gh(P, Q);
			expect(result).to.be.an('array').with.lengthOf(1);
			expect(result[0]).to.be.empty;			
		});
	});
});