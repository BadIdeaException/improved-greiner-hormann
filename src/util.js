const EPSILON = 1.0e-8;

// Helper function that computes twice the signed area of the triangle formed by P, Q and R.
// See Foster et al. p. 4
export function A(P, Q, R) {
	return (Q.x - P.x) * (R.y - P.y) - (Q.y - P.y) * (R.x - P.x);
}


// Helper function that checks whether the point is inside the polygon.
// Basically implements the winding number check by Dan Summer, 2001.
// (https://web.archive.org/web/20210504233957/http://geomalgorithms.com/a03-_inclusion.html)
export function inside(point, poly) {
	let wn = 0; // The winding number
	// Helper function that tests if p2 is left/on/right of the line through p0 and p1. 
	// If p2 is right of that line, result is < 0.
	// If p2 is on that line, result is === 0.
	// If p2 is left of that line, result is > 0.
	// 
	// Note that this function (which Summer calls "isLeft") is identical to the function A in Foster et al.
	const isLeft = A;
	
	// Iterate through all edges and check them against a horizontal ray	
	poly.forEach(curr => {
		let a = curr.vertex;
		let b = (curr.next ?? poly).vertex;

		if (a.y <= point.y) { // edge starts below  the point
			if (b.y > point.y // edge ends above the point => it is an upward crossing
				&& isLeft(a, b, point) > 0) // point is left of the edge
					wn++; // Ray intersects an upward edge
		} else // edge starts above the point
			if (b.y <= point.y // edge ends "below" the point => it is a downward crossing
				&& isLeft(a, b, point) < 0) // point is right of the edge
					wn--; // Ray intersects a downward edge
		curr = curr.next;
	})

	// Here we differ from Summer, who considers any point with a non-zero winding number to be "inside".
	// However, Greiner and Hormann define a point as "inside" if it has an ODD winding number, so we
	// will do likewise here.
	return wn % 2 === 1;
}

export function sign(x) { return Math.abs(x) < EPSILON ? 0 : Math.sign(x) }
