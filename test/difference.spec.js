import { difference } from '../src/index.js';
import { readPoly, reorder, expectPolyEqual } from './helpers.js';

const EPSILON = 1.0e-8;

describe('Difference', function() {
	let subject;
	beforeEach(function() {
		subject = readPoly('test/fixtures/subject/convex.poly')[0];
	});

	it('crossing intersections', function() {
		const clip = readPoly('test/fixtures/clip/convex.poly')[0];
		const expected = readPoly('test/fixtures/difference/convex_convex.poly')[0];

		let result = difference(subject, clip);
		expect(result).to.be.an('array').with.lengthOf(1);
		result = reorder(result[0], expected);
		expectPolyEqual(result, expected);
	});

	it('polygons are identical', function() {
		let result = difference(subject, subject);
		expect(result).to.be.an('array').with.lengthOf(1);
		expect(result[0]).to.be.empty;
	});

	it('subject is empty', function() {
		let result = difference([], subject);
		expect(result).to.be.an('array').with.lengthOf(1);
		expect(result[0]).to.be.empty;
	});

	it('clip is empty', function() {
		let result = difference(subject, []);
		expect(result).to.be.an('array').with.lengthOf(1);
		result = reorder(result[0], subject);
	});

	it('subject contained in clip', function() {
		const clip = subject;
		subject = readPoly('test/fixtures/clip/contained.poly')[0];
		let result = difference(subject, clip);
		expect(result).to.be.an('array').with.lengthOf(1);
		expect(result[0]).to.be.empty;
	});

	it('clip contained in subject', function() {
		const clip = readPoly('test/fixtures/clip/contained.poly')[0];
		const expected = readPoly('test/fixtures/difference/convex_contained.poly');

		let result = difference(subject, clip);
		expect(result).to.be.an('array').with.lengthOf(expected.length);
		expected.forEach(expectedComponent => {
			let resultComponent = result.find(resultComponent => 
						resultComponent.every(resultVertex => 
						expectedComponent.some(expectedVertex => Math.abs(resultVertex[0] - expectedVertex[0]) < EPSILON && Math.abs(resultVertex[1] - expectedVertex[1]) < EPSILON)));
			
			expect(resultComponent).to.exist;
			resultComponent = reorder(resultComponent, expectedComponent);
			expectPolyEqual(resultComponent, expectedComponent);
		})
	});

	it('clip contained in subject with touching sides', function() {
		const subject = [
			[ 0, 0 ],
			[ 4, 0 ],
			[ 4, 4 ],
			[ 0, 4 ]
		];
		const clip = [
			[ 0, 1 ],
			[ 4, 1 ],
			[ 4, 3 ],
			[ 0, 3 ]
		];
		const expected = [
			[
				[ 0, 0 ],
				[ 4, 0 ],
				[ 4, 1 ],
				[ 0, 1]
			], [
				[ 0, 3 ],
				[ 4, 3 ],
				[ 4, 4 ],
				[ 0, 4 ]
			]
		];
		let result = difference(subject, clip);
		expect(result).to.be.an('array').with.lengthOf(expected.length);
		expected.forEach(expectedComponent => {
			let resultComponent = result.find(resultComponent =>
						resultComponent.every(resultVertex => 
						expectedComponent.some(expectedVertex => Math.abs(resultVertex[0] - expectedVertex[0]) < EPSILON && Math.abs(resultVertex[1] - expectedVertex[1]) < EPSILON)));
			
			expect(resultComponent).to.exist;
			resultComponent = reorder(resultComponent, expectedComponent);
			expectPolyEqual(resultComponent, expectedComponent);
		});
	})

	it('disjoint', function() {
		const clip = subject.map(vertex => [ vertex[0] + 10, vertex[1] + 10 ]);
		let result = difference(subject, clip);
		expect(result).to.be.an('array').with.lengthOf(1);
		result = reorder(result[0], subject);
		expectPolyEqual(result, subject);
	});
});