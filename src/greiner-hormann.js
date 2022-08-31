import VertexList from './vertexlist.js';
import { A, inside, sign } from './util.js';

// Floating point precision. Two numbers will be considered equal if their difference is less than EPSILON.
const EPSILON = 1.0e-8;

// Constants to describe the mode of coincident vertices on chains of shared edges.
// See Foster et al. p. 5
const LEFT_ON = 1;
const RIGHT_ON = 2;
const ON_ON = 3;
const ON_LEFT = 4;
const ON_RIGHT = 5;

// Constants to describe where a point lies with respect to an edge/a chain of edges
const LEFT = +1;
const RIGHT = -1;

// Constants to describe whether an intersection vertex is an entry or exit
const ENTRY = true;
const EXIT = false;

// Constants to describe whether an intersection is crossing or bouncing
const CROSSING = true;
const BOUNCING = false;

// Helper function that determines the position of a point with respect to the polygonal chain P1, P2, P3
// 
// Returns 
// 	LEFT if the point is to the left of P1P2 and P2P3
// 	RIGHT if the point is to the right of P1P2 and P2P3
// See Foster et al. p4
function side(Q, P1, P2, P3) {
	Q = Q.vertex; P1 = P1.vertex; P2 = P2.vertex; P3 = P3.vertex;

	const s1 = A(Q, P1, P2);
	const s2 = A(Q, P2, P3);
	const s3 = A(P1, P2, P3);

	switch (sign(s3)) {
		case +1: return s1 > 0 && s2 > 0 ? LEFT : RIGHT;
		case  0: return s1 > 0 ? LEFT : RIGHT;
		case -1: return s1 > 0 || s2 > 0 ? LEFT : RIGHT;
	}
}

export default function greinerHormann(subject, clip, mode) {
	subject ??= [];
	clip ??= [];
	const _subject = subject;
	const _clip = clip;

	if (subject.length === 0)
		return mode.SUBJECT_EMPTY(_subject, _clip);
	if (clip.length === 0) 
		return mode.CLIP_EMPTY(_subject, _clip);
	if (subject.length < 3 || clip.length < 3)
		throw new Error(`Cannot intersect with a polygon that has less than three points.`);

	/***************************************
			
			Preparations. 

			Convert polygons to circular doubly linked lists.

	 ***************************************/

	subject = VertexList.fromArray(subject);
	clip = VertexList.fromArray(clip);


	/***************************************
			
			Phase 1: Intersection phase. 

			Find all intersections between subject and clip and insert them into both.

	 ***************************************/
	{
		// Helper function that finds the insertion point for newEntry.
		// The insertion point is between lower and upper bound (that is, on the edge
		// between the two) according to the new entry's alpha value.
		// We can't just insert directly after the lower bound, because there might have been more than
		// one intersection for this edge.
		// eslint-disable-next-line no-inner-declarations
		function findInsertionPoint(newEntry, lowerBound, upperBound) {
			return lowerBound.find(curr => curr.next === upperBound 
				|| !curr.next 
				|| curr.next.alpha > newEntry.alpha) 
			?? lowerBound;
		}		

		subject.forEach(Pcurr => {			
			// Skip if not part of the original subject polygon
			if (!Pcurr.source) return;
			let Pnext = Pcurr.find(Pnext => Pnext !== Pcurr && Pnext.source);
		
			clip.forEach(Qcurr => {
				if (!Qcurr.source) return;
				let Qnext = Qcurr.find(Qnext => Qnext !== Qcurr && Qnext.source);

				// The signed areas of the triangles 
				// 		Pcurr, Qcurr, Qnext
				// 		Pnext, Qcurr, Qnext
				// 		Qcurr, Pcurr, Pnext
				// 		Qnext, Pcurr, Pnext
				// These are used to determine what type of intersection/overlap we have
				// Notably, the edges Pcurr->Pnext and Qcurr->Qnext intersect in a single point iff
				// APcurr !== APnext iff AQcurr !== AQnext.
				const APcurr = A(Pcurr.vertex, Qcurr.vertex, Qnext.vertex);
				const APnext = A(Pnext.vertex, Qcurr.vertex, Qnext.vertex);
				const AQcurr = A(Qcurr.vertex, Pcurr.vertex, Pnext.vertex);
				const AQnext = A(Qnext.vertex, Pcurr.vertex, Pnext.vertex);

				if (Math.abs(APcurr - APnext) > EPSILON) {
					// Case 1: The lines are NOT parallel.
					// 
					// They intersect in a point I = Pcurr + alpha * (Pnext - Pcurr) = Qcurr + beta * (Qnext - Qcurr).
					// Calculate alpha and beta from the signed areas of the triangles. See Foster et al. p. 4.
					const alpha = APcurr / (APcurr - APnext);
					const beta = AQcurr / (AQcurr - AQnext); // AQcurr === AQnext iff APcurr === APnext, which we already know is not the case.
					const I = {
						x: Pcurr.vertex.x + alpha * (Pnext.vertex.x - Pcurr.vertex.x),
						y: Pcurr.vertex.y + alpha * (Pnext.vertex.y - Pcurr.vertex.y)
					}
					if (0 < alpha && alpha < 1 && 0 < beta && beta < 1) {
						// X-intersection ("normal" case) according to Foster et al.
						// Insert the intersection point into both P and Q according to the alpha/beta values.
						const entryP = new VertexList({
							vertex: I,
							intersection: true,
							alpha: alpha
						});
						const entryQ = new VertexList({
							vertex: I,
							intersection: true,
							alpha: beta
						});
						// Link the two points together.
						// In the original paper, this is called "neighbour"
						entryP.corresponding = entryQ;
						entryQ.corresponding = entryP;
						
						findInsertionPoint(entryP, Pcurr, Pnext).insert(entryP);
						findInsertionPoint(entryQ, Qcurr, Qnext).insert(entryQ);				
					} else if (0 === alpha && 0 < beta && beta < 1) {
						// T-intersection according to Foster et al.
						// Insert the intersection into Q according to the beta value, and mark Pcurr as an intersection point
						const entryQ = new VertexList({
							vertex: I,
							intersection: true,
							alpha: beta,
							corresponding: Pcurr
						});
						Pcurr.intersection = true;
						Pcurr.corresponding = entryQ;

						findInsertionPoint(entryQ, Qcurr, Qnext).insert(entryQ);
					} else if (0 < alpha && alpha < 1 && 0 === beta) {
						// T-intersection according to Foster et al.
						// Insert the intersection into P according to the alpha value, and mark Qcurr as an intersection point
						const entryP = new VertexList({
							vertex: I,
							intersection: true,
							alpha: alpha,
							corresponding: Qcurr
						});
						Qcurr.intersection = true;
						Qcurr.corresponding = entryP;

						findInsertionPoint(entryP, Pcurr, Pnext).insert(entryP);
					} else if (alpha === 0 && beta === 0) {
						// V-intersection according to Foster et al.
						// Mark Pcurr and Qcurr as intersection points
						Pcurr.intersection = true;
						Qcurr.intersection = true;
						Pcurr.corresponding = Qcurr;
						Qcurr.corresponding = Pcurr;
					}
				} else if (sign(APcurr) === 0 && sign(APnext) === 0 && sign(AQcurr) === 0 && sign(AQnext) === 0) {
					// Case 2: The lines are COLLINEAR, the two edges may overlap.
					
					// Express Qcurr relative to [Pcurr,Pnext) and Pcurr relative to [Qcurr,Qnext)
					// Find alpha, beta such that
					// 		Qcurr = Pcurr + alpha * (Pnext - Pcurr) 
					// 		Pcurr = beta + beta * (Qnext - Qcurr)
					// According to Foster et al., this can be achieved as below:
					const alpha = 
						((Qcurr.vertex.x - Pcurr.vertex.x) * (Pnext.vertex.x - Pcurr.vertex.x) + (Qcurr.vertex.y - Pcurr.vertex.y) * (Pnext.vertex.y - Pcurr.vertex.y)) /
						((Pnext.vertex.x - Pcurr.vertex.x) ** 2 + (Pnext.vertex.y - Pcurr.vertex.y) ** 2);
						// Vector.dot(Qcurr.vertex.subtract(Pcurr.vertex), Pnext.vertex.subtract(Pcurr.vertex)) /
						// Vector.dot(Pnext.vertex.subtract(Pcurr.vertex), Pnext.vertex.subtract(Pcurr.vertex));
					const beta = 
						((Pcurr.vertex.x - Qcurr.vertex.x) * (Qnext.vertex.x - Qcurr.vertex.x) + (Pcurr.vertex.y - Qcurr.vertex.y) * (Qnext.vertex.y - Qcurr.vertex.y)) /
						((Qnext.vertex.x - Qcurr.vertex.x) ** 2 + (Qnext.vertex.y - Qcurr.vertex.y) ** 2);
						// Vector.dot(Pcurr.vertex.subtract(Qcurr.vertex), Qnext.vertex.subtract(Qcurr.vertex)) /
						// Vector.dot(Qnext.vertex.subtract(Qcurr.vertex), Qnext.vertex.subtract(Qcurr.vertex));

					if (0 < alpha && alpha < 1 && 0 < beta && beta < 1) {
						// X-overlap according to Foster et al.
						// Pcurr lies in Q and Qcurr lies in P
						// Insert Pcurr into Q and Qcurr into P
						const entryP = new VertexList({
							vertex: Qcurr.vertex,
							intersection: true,
							alpha: alpha,
							corresponding: Qcurr
						});
						const entryQ = new VertexList({
							vertex: Pcurr.vertex,
							intersection: true,
							alpha: beta,
							corresponding: Pcurr
						});
						Pcurr.corresponding = entryQ;
						Qcurr.corresponding = entryP;
						findInsertionPoint(entryP, Pcurr, Pnext).insert(entryP);
						findInsertionPoint(entryQ, Qcurr, Qnext).insert(entryQ);
					} else if ((alpha < 0 || alpha >= 1) && 0 < beta && beta < 1) {
						// T-overlap according to Foster et al.
						// Qcurr lies outside of P, but Pcurr lies in Q
						// Insert Pcurr into Q
						const entryQ = new VertexList({
							vertex: Pcurr.vertex,
							intersection: true,
							alpha: beta,
							corresponding: Pcurr
						});
						Pcurr.intersection = true;
						Pcurr.corresponding = entryQ;
						findInsertionPoint(entryQ, Qcurr, Qnext).insert(entryQ);
					} else if (0 < alpha && alpha < 1 && (beta < 0 || beta >= 1)) {
						// T-overlap according to Foster et al.
						// Pcurr lies outside of Q, but Qcurr lies in P
						// Insert Qcurr into P
						const entryP = new VertexList({
							vertex: Qcurr.vertex,
							intersection: true,
							alpha: alpha,
							corresponding: Qcurr
						});
						Qcurr.intersection = true;
						Qcurr.corresponding = entryP;
						findInsertionPoint(entryP, Pcurr, Pnext).insert(entryP);
					} else if (alpha === 0 && beta === 0) {
						Pcurr.intersection = true;
						Qcurr.intersection = true;
						Pcurr.corresponding = Qcurr;
						Qcurr.corresponding = Pcurr;
					}
				} 
				// Case 3: The lines are parallel but not collinear. 
				// Then they don't intersect at all, and there is nothing for us to do.
			});
		});
	}

	/***************************************
			
			Phase 2: Labeling phase. 

			Mark each intersection as immediate or delayed crossing or bouncing.
			Then mark each intersection as an entry or an exit.

	 ***************************************/
	{
		// Mark each intersection in the subject as either a crossing/bouncing INTERSECTION, or as an OVERLAP.
		subject.forEach(curr => {
			if (curr.intersection) {
				// Get the points P+ and P- following and preceding the intersection in the subject polygon, 
				// and the same for the clip polygon
				let Pplus = curr.next;
				let Pminus = curr.prev;
				let Qplus = curr.corresponding.next;
				let Qminus = curr.corresponding.prev;
				// Check if this is an intersection or an overlap. 
				// Because all overlaps are represented as common edges after the intersection phase, we can
				// determine this by seeing if P+ is itself an intersection and is linked to either Q+ or Q-, and
				// analagously for P-.
				if ((Pplus.intersection && (Pplus.corresponding === Qplus || Pplus.corresponding === Qminus)) 
					|| (Pminus.intersection && (Pminus.corresponding === Qplus || Pminus.corresponding === Qminus))) {
					// We have an OVERLAP
					// Determine the type of (chain) intersection we have here:
					// With each edge, P, can either change from being to one side of Q, stay on Q, or diverge to one side again.
					if ((Pplus.corresponding === Qplus && Pminus.corresponding === Qminus) 
						|| (Pplus.corresponding === Qminus && Pminus.corresponding === Qplus)) {
						// P is ON Q on both sides of curr
						curr.chain = ON_ON;
					} else if ((Pplus.corresponding === Qplus && side(Qminus, Pminus, curr, Pplus) === RIGHT)
						|| (Pplus.corresponding === Qminus && side(Qplus, Pminus, curr, Pplus) === RIGHT)) {
						// P changes from being LEFT of Q to being ON Q at curr
						curr.chain = LEFT_ON;
					} else if ((Pplus.corresponding === Qplus && side(Qminus, Pminus, curr, Pplus) === LEFT) 
						|| (Pplus.corresponding === Qminus && side(Qplus, Pminus, curr, Pplus) === LEFT)) {
						// P changes from being RIGHT of Q to being ON Q at curr
						curr.chain = RIGHT_ON;
					} else if ((Pminus.corresponding === Qminus && side(Qplus, Pminus, curr, Pplus) === RIGHT)
						|| (Pminus.corresponding === Qplus && side(Qminus, Pminus, curr, Pplus) === RIGHT)) {
						// P changes from being ON Q to being LEFT of Q at curr
						curr.chain = ON_LEFT;
					} else if ((Pminus.corresponding === Qminus && side(Qplus, Pminus, curr, Pplus) === LEFT)
						|| (Pminus.corresponding === Qplus && side(Qminus, Pminus, curr, Pplus) === LEFT)) {
						// P changes from being ON Q to being RIGHT of Q at curr
						curr.chain = ON_RIGHT;
					}
				} else {
					// We have an INTERSECTION

					// The intersection is CROSSING (i.e. a "normal" edge cross) if Q- and Q+ lie on DIFFERENT sides
					// of the polygonal chain P-, curr, P+, and BOUNCING if they lie on the same side
					if (side(Qminus, Pminus, curr, Pplus) !== side(Qplus, Pminus, curr, Pplus)) {
						// CROSSING intersection
						curr.crossing = CROSSING;
					} else
						// BOUNCING intersection
						curr.crossing = BOUNCING;			
				}
			}
		});

		// Process overlaps by marking them as (delayed) crossings/bouncings
		let chainStartSide;
		subject.forEach(curr => {
			if (!curr.chain) return;

			// Initialize chainStartSide
			chainStartSide ??= curr.chain;
			// Unless we are at the last point of the common chain, mark the intersection as BOUNCING
			if (curr.chain <= ON_ON) {
				curr.crossing = BOUNCING;
			} else {
				// If we are at the last point, mark the intersection as BOUNCING if the last vertex is
				// on the same side as the first vertex was, and as crossing if it is on the other side.
				curr.crossing = curr.chain - ON_ON === chainStartSide ? BOUNCING : CROSSING;
				// Reset chainStartSide
				chainStartSide = undefined;
			}
		});

		// At this point, all of the intersection vertices of the subject polygon are marked as either
		// CROSSING or BOUNCING.
		// Copy those labels over to the clip polygon, because the clip polygon crosses the subject at an 
		// intersection iff the subject crosses the clip.
		subject.forEach(curr => {
			if (curr.intersection)
				curr.corresponding.crossing = curr.crossing;
		});


		// Now we can perform the final labeling stage for both polygons: marking each intersection as either 
		// an ENTRY or an EXIT.
		
		// For both polygons, try to find a vertex that is not an intersection vertex to start the process.
		// This is necessary so the inside/outside test can be performed unambiguously.		
		//
		// See Foster et al. p. 6			
		let [ subjectStart, clipStart ] = [ subject, clip ].map(poly => poly.find(curr => !curr.intersection));
		// Check that a non-intersection vertex existed in the subject polygon.
		// If no such vertex existed, and every vertex is an ON/ON vertex, 
		// then subject and clip polygon are identical, and we can return the input subject polygon.
		if (!subjectStart && subject.every(curr => curr.chain === ON_ON))
			return mode.WITH_SELF(_subject, _clip);
		else [ subjectStart, clipStart ] = [ subjectStart, clipStart ].map((start, index) => {
			// Now either start is defined, meaning we already have a valid start vertex, or
			// start is not defined but not every vertex of the polygon is an ON/ON vertex.
			if (!start) {				
				// At this point, we know there is at least one vertex that is not an ON/ON vertex 
				// and thus adjacent to an edge that is not a shared edge.
				// Find that vertex.
				start = [ subject, clip][index].find(curr => curr.chain !== ON_ON);
				// If it is a LEFT/ON or a RIGHT/ON vertex, move the start back one...
				if (start.chain < ON_ON) 
					start = start.prev;
				// ...or if it is an ON/LEFT or an ON/RIGHT vertex, move the start forward one.
				else if (start.chain > ON_ON)
					start = start.next;
				// Now we know for sure that start is not on one of the polygon's edges.
				// Create a new virtual vertex halfway between start and its successor and insert it
				// into the polygon.
				const entry = new VertexList({
					vertex: {
						x: (start.vertex.x + start.next.vertex.x) / 2,
						y: (start.vertex.y + start.next.vertex.y) / 2
					}
				});
				start.insert(entry);
				start = entry;			
			}
			return start;
		});

		// Now both subjectStart and clipStart are guaranteed to not be on a polygon's edge. 
		// So the inside/outside test can be performed unambiguously.
		// We can finally mark every intersection as entering or exiting.
		[ subjectStart, clipStart ].forEach((poly, index, polys) => {
			let status;
			// Initialize status according to whether the first point is inside or outside the OTHER polygon
			status = inside(poly.vertex, polys[(index + 1) % polys.length]) ? EXIT : ENTRY;

			// Label all intersection points as entering or exiting
			poly.forEach(curr => {
				if (curr.crossing === CROSSING) {
					curr.entry = status;
					status = !status;
				}			
			});
		});	
	}

	/***************************************
			
			Phase 3: Tracing phase. 

			Construct the output polygon(s).

	 ***************************************/
	let result = [];
	{
		// Returns the first unprocessed crossing intersection point in the polygon, or null if there are no
		// unprocessed crossing intersection points.
		// eslint-disable-next-line no-inner-declarations
		function firstUnprocessedCrossingIntersection(poly) {
			return poly.find(curr => curr.intersection && curr.crossing && !curr.processed);
		}

		// While there are still unprocessed crossing intersection points in the subject, choose the first one
		let curr = firstUnprocessedCrossingIntersection(subject);
		// If there are no intersections at all, check if one polygon is contained entirely within the other,
		// and return the contained one.
		if (!curr) {
			if (clip.some(entry => inside(entry.vertex, subject)))
				return mode.CLIP_CONTAINED(_subject, _clip);
			else if (subject.some(entry => inside(entry.vertex, clip)))
				return mode.SUBJECT_CONTAINED(_subject, _clip);
			else
				return mode.DISJOINT(_subject, _clip);
		}
		
		while (curr) {
			// Start a new result polygon
			// (Because when intersecting concave polygons, the intersection might consist of more than one polygon.
			// Consider intersecting a "W" with an "E", for example.)
			let resultComponent = [];
			result.push(resultComponent);

			// Set traversal direction, depending on whether the current intersection is an entry or an exit
			let dir = mode.INITIAL_DIRECTION(curr.entry);
			let oppositeEntry = !curr.entry;
			resultComponent.push(curr.vertex);

			// Mark the intersection as processed, as well as its corresponding intersection in the other polygon
			curr.processed = true;
			curr.corresponding.processed = true;

			// Merge the relevant parts of the input polygons until we have formed a closed chain of segments.
			do {
				// Traverse the current input polygon and push its vertices until we reach the next intersection
				do {
					curr = curr[dir];
					resultComponent.push(curr.vertex);
				} while (curr.entry !== oppositeEntry); // Includes when curr.entry === undefined
				// When we reach an intersection, mark it as processed
				curr.processed = true;	
				curr.corresponding.processed = true;
				// Switch from one input polygon to the other
				curr = curr.corresponding;
				dir = mode.SWITCHED_POLYGON(dir);
				oppositeEntry = !curr.entry;
			} while (curr.vertex !== resultComponent[0]);
			curr = firstUnprocessedCrossingIntersection(subject);
		}
	}

	/***************************************
			
			Post-processing. 

			Remove collinear vertices.

	 ***************************************/
	for (let component of result) {
		for (let i = component.length - 1; i >= 0; i--) {
			let R = component[i];
			let Rminus = component[(i - 1 + component.length) % component.length];
			let Rplus = component[(i + 1) % component.length];
			if (A(Rminus, R, Rplus) === 0) component.splice(i, 1);
		}		
	}
	return result;
}