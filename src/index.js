import gh from './greiner-hormann.js';
import { sign } from './util.js';

/* eslint-disable no-unused-vars */
const INTERSECT = {
	WITH_SELF: (subject, clip) => [ subject ],
	SUBJECT_EMPTY: (subject, clip) => [ [] ],
	CLIP_EMPTY: (subject, clip) => [ [] ],
	SUBJECT_CONTAINED: (subject, clip) => [ subject ],
	CLIP_CONTAINED: (subject, clip) => [ clip ],
	DISJOINT: (subject, clip) => [ [] ],
	INITIAL_DIRECTION: entry => entry ? 'next' : 'prev',
	SWITCHED_POLYGON: entry => entry
}

const UNION = {
	WITH_SELF: (subject, clip) => [ subject ],
	SUBJECT_EMPTY: (subject, clip) => [ clip ],
	CLIP_EMPTY: (subject, clip) => [ subject] ,
	SUBJECT_CONTAINED: (subject, clip) => [ clip ],
	CLIP_CONTAINED: (subject, clip) => [ subject ],
	DISJOINT: (subject, clip) => [ subject, clip ],
	INITIAL_DIRECTION: entry => entry ? 'prev' : 'next',
	SWITCHED_POLYGON: entry => entry
}

const DIFFERENCE = {
	WITH_SELF: (subject, clip) => [ [] ],
	SUBJECT_EMPTY: (subject, clip) => [ [] ],
	CLIP_EMPTY: (subject, clip) => [ subject ],
	SUBJECT_CONTAINED: (subject, clip) => [ [] ],
	CLIP_CONTAINED: (subject, clip) => {
		/*		
			If the clip polygon is contained entirely within the subject polygon, that means
			we have to make it a hole in the subject polygon. Unfortunately, our data structure
			is not designed for polygons with holes.
			So instead, we will bisect the subject polygon in such a way that is guaranteed to create
			crossing intersections with the clip polygon.
			
			Specifically, we will calculate the y-coordinate that is halfway between the clip polygon's
			lowest and highest point. (Actually, any value strictly greater than the lowest and strictly less
			that the highest would work.) 

			Our bisection line is a horizontal line with that y-coordinate. This is guaranteed to have at least
			two crossing intersections with the clip polygon. Because the clip polygon is contained in the 
			subject polygon, it follows that it has at least two crossing intersections with the
			subject polygon as well.

			We now find a crossing intersection C with the clip polygon and that crossing intersection S1 with
			the subject polygon that is closest to C. By tracing the subject, we find the first crossing intersection
			that is on the opposite side of C. This is the second crossing intersection S2.

			We can now split the subject into two parts along the segment S1S2, and perform the difference 
			algorithm on them separately.
		*/
	
		let y = (Math.min(...clip.map(v => v.y)) + Math.max(...clip.map(v => v.y))) / 2;
		// The x-coordinate of the clip intersection
		let Cx;
		for (let i = 0; i < clip.length; i++) {
			let Q1 = clip[i];
			let Q2 = clip[(i + 1) % clip.length];
			if (Q1.y <= y && Q2.y > y || Q1.y > y && Q2.y <= y) {
				let alpha = (y - Q1.y) / (Q2.y - Q1.y);
				Cx = Q1.x + alpha * (Q2.x - Q1.x);
				break;
			}
		}
		
		// Find the intersection that is the closest to C.
		
		// The intersection that is closest to C.
		let S1;
		// The index of the starting vertex of the edge that S1 is on
		let i1;
		for (let i = 0; i < subject.length; i++) {
			let P1 = subject[i];
			let P2 = subject[(i + 1) % subject.length];
			// Find an edge crossing the bisection line UPWARD
			if (P1.y <= y && P2.y > y) {
				let alpha = (y - P1.y) / (P2.y - P1.y);
				let x = P1.x + alpha * (P2.x - P1.x);
				// If the newly found upward intersection is closer to C than the previous one (or if none had been set yet),
				// make this our new S1
				if (S1 === undefined || Math.abs(x - Cx) < Math.abs(S1.x - Cx)) {
					S1 = { x, y };
					// Remember the index
					i1 = i;
				}
			}
		}

		let S2;
		// The index of the starting vertex of the edge that S2 is on
		let i2;
		// Find the first subsequent edge crossing the line downward that is on the other
		// side of C horizontally.
		// 
		// For this, trace the subject polygon beginning with the edge following S1
		// (more accurately: following the edge that S1 is on) until we find one that
		// begins above (or on) the line and ends (strictly) below.
		// If the intersection of that edge with the bisection line has an x-difference
		// to C that has the opposite sign from the x-difference between S1 and C, we have
		// found our S2.
		// 
		// Edge cases:
		// One of S1 or S2 may coincide with C. This happens if the clip polygon and the subject
		// polygon share the edge that C is on. However, because the clip polygon is contained by the
		// subject, we know there must be a downward edge on the other side of C. 
		for (let j = 1; j < subject.length; j++) {
			let P1 = subject[(i1 + j) % subject.length];
			let P2 = subject[(i1 + j + 1) % subject.length];
			// Find an edge crossing the bisection line DOWNWARD
			if (P1.y > y && P2.y <= y) {
				let alpha = (y - P1.y) / (P2.y - P1.y);
				let x = P1.x + alpha * (P2.x - P1.x);
				if (sign(x - Cx) !== sign(S1.x - Cx)) { // One of S1.x - Cx or S2.x - Cx may be zero
					S2 = { x, y };
					i2 = (i1 + j) % subject.length;
					break;
				}
			}
		}

		// To make assembly of the new polygons easier, make it so that i1 < i2
		if (i1 > i2) {
			let temp = i1;
			i1 = i2;
			i2 = temp;
			temp = S1;
			S1 = S2;
			S2 = temp;
		}

		let subject1 = subject
			.slice(0, i1 + 1)
			.concat([ S1, S2 ])
			.concat(subject.slice(i2 + 1));
		let subject2 = subject.slice(i1 + 1, i2 + 1)
			.concat([ S2, S1 ]);
		return difference(subject1, clip).concat(difference(subject2, clip));
	},
	DISJOINT: (subject, clip) => [ subject ],
	INITIAL_DIRECTION: entry => entry ? 'prev' : 'next',
	SWITCHED_POLYGON: entry => entry === 'prev' ? 'next' : 'prev'
}
/* eslint-enable no-unused-vars */

export function intersect(subject, clip) {
	return gh(subject, clip, INTERSECT);
}

export function union(subject, clip) {
	return gh(subject, clip, UNION);
}

export function difference(subject, clip) {
	return gh(subject, clip, DIFFERENCE);
}