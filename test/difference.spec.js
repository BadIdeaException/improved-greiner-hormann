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
						expectedComponent.some(expectedVertex => Math.abs(resultVertex.x - expectedVertex.x) < EPSILON && Math.abs(resultVertex.y - expectedVertex.y) < EPSILON)));
			
			expect(resultComponent).to.exist;
			resultComponent = reorder(resultComponent, expectedComponent);
			expectPolyEqual(resultComponent, expectedComponent);
		})
	});

	it('clip contained in subject with touching sides', function() {
		const subject = [
			{ x: 0, y: 0 },
			{ x: 4, y: 0 },
			{ x: 4, y: 4 },
			{ x: 0, y: 4 }
		];
		const clip = [
			{ x: 0, y: 1 },
			{ x: 4, y: 1 },
			{ x: 4, y: 3 },
			{ x: 0, y: 3 }
		];
		const expected = [
			[
				{ x: 0, y: 0 },
				{ x: 4, y: 0 },
				{ x: 4, y: 1 },
				{ x: 0, y: 1 }
			], [
				{ x: 0, y: 3 },
				{ x: 4, y: 3 },
				{ x: 4, y: 4 },
				{ x: 0, y: 4 }
			]
		];
		let result = difference(subject, clip);
		expect(result).to.be.an('array').with.lengthOf(expected.length);
		expected.forEach(expectedComponent => {
			let resultComponent = result.find(resultComponent =>
						resultComponent.every(resultVertex => 
						expectedComponent.some(expectedVertex => Math.abs(resultVertex.x - expectedVertex.x) < EPSILON && Math.abs(resultVertex.y - expectedVertex.y) < EPSILON)));
			
			expect(resultComponent).to.exist;
			resultComponent = reorder(resultComponent, expectedComponent);
			expectPolyEqual(resultComponent, expectedComponent);
		});
	})

	it('disjoint', function() {
		const clip = subject.map(vertex => ({ x: vertex.x + 10, y: vertex.y + 10 }));
		let result = difference(subject, clip);
		expect(result).to.be.an('array').with.lengthOf(1);
		result = reorder(result[0], subject);
		expectPolyEqual(result, subject);
	});
});