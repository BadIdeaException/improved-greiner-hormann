import { union } from '../src/index.js';
import { readPoly, expectPolyEqual, mirror } from './helpers.js';

const EPSILON = 1.0e-8;

// Convenience function that generates a test that reads 
// the subject polygon from the file test/fixtures/subject/<subject>.poly, 
// the clip polygon from test/fixtures/clip/<clip>.poly, and
// the expected result polygon(s) from test/fixtures/intersect/<subject>_<clip>.poly
// and executes a (mirrored) test on them.
function generate(subject, clip) {
	let expected = `test/fixtures/union/${subject}_${clip}.poly`;
	subject = `test/fixtures/subject/${subject}.poly`;
	clip = `test/fixtures/clip/${clip}.poly`;

	subject = readPoly(subject)[0];
	clip = readPoly(clip)[0];
	expected = readPoly(expected);

	mirror(subject, clip, (P, Q) => {
		let result = union(P, Q);

		expect(result).to.be.an('array').with.lengthOf(expected.length);			
		// Check that all expected components are present in the result
		expected.forEach(expectedComponent => {
			// Find a component in the intersection result that includes all vertices of the current expected component
			let resultComponent = result.find(component => component.every(resultVertex => expectedComponent.some(expectedVertex => Math.abs(resultVertex[0] - expectedVertex[0]) < EPSILON && Math.abs(resultVertex[1] - expectedVertex[1]) < EPSILON)));
			expect(resultComponent).to.exist;
			expectPolyEqual(resultComponent, expectedComponent);
		});
	});
}

describe('Union', function() {

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

	describe('special cases', function() {
		it('disjoint', function() {
			let subject = readPoly('test/fixtures/subject/concave.poly')[0];
			let clip = subject.map(v => [ v[0] + 100, v[1] ]);
			mirror(subject, clip, (P, Q) => {
				let result = union(P, Q);
				expect(result).to.be.an('array').with.lengthOf(2);
				// result should contain both P and Q.
				// If it is not in the order P,Q reverse it.
				if (!P.find(vertex => Math.abs(vertex[0] - result[0][0][0]) < EPSILON && Math.abs(vertex[1] - result[0][0][1]) < EPSILON)) {
					result.reverse();
				}
				result.forEach((component, index) => expectPolyEqual(component, [ P, Q ][index]));
			});
		});

		it('all vertices of the clip polygon are on edges', function() {
			['convex','concave'].forEach(subject => generate(subject, 'bounce-inside-all'));
		});

		it('polygons are identical', function() {			
			['convex','concave'].forEach(subject => generate(subject, subject));
		});

		it('one of the polygons is empty', function() {
			['convex','concave'].forEach(subject => {
				subject = readPoly(`test/fixtures/subject/${subject}.poly`)[0];
				mirror(subject, [], (P, Q) => {
					let result = union(P, Q);
					expect(result).to.be.an('array').with.lengthOf(1);
					const expected = [ P, Q ].find(poly => poly.length > 0)
					expectPolyEqual(result[0], expected);
				});
			});
		});

		it('one polygon contains the other', function() {
			['convex','concave'].forEach(subject => generate(subject, 'contained'));
		});


		it('union with a point or a segment throws', function() {
			let subject = readPoly(`test/fixtures/subject/convex.poly`); // Doesn't really matter anyway
			let clip = [ [ 5, 5 ] ];
			mirror(subject, clip, (P, Q) => expect(union.bind(null, P, Q)).to.throw());
			clip.push([ 8, 8 ]);
			mirror(subject, clip, (P, Q) => expect(union.bind(null, P, Q)).to.throw());
		});

		it('two polygons that together would enclose a hole', function() {
			// Subject looks like a letter "c"
			const subject = [
				[ 0, 0 ],
				[ 0, 1 ],
				[ -2, 1 ],
				[ -2, 2 ],
				[ 0, 2 ],
				[ 0, 3 ],
				[ -3, 3 ],
				[ -3, 0 ]
			];
			// Clip is the y-axis mirror image of subject
			const clip = subject.map(vertex => [ Math.abs(vertex[0]), vertex[1] ]);	
			mirror(subject, clip, (P, Q) => {
				let result = union(P, Q);
				expect(result).to.be.an('array').with.lengthOf(2);
				if (result[0].some(vertex => vertex[0] > 0)) 
					result.reverse();
				expectPolyEqual(result[0], subject);
				expectPolyEqual(result[1], clip);
			});
		});
	});
});