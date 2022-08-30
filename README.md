# improved-greiner-hormann

This is a pure Javascript zero-dependency implementation of the [Greiner-Hormann polygon clipping algorithm](https://doi.org/10.1145/274363.274364) as improved by [E. Foster, K. Hormann and R. Popa](https://doi.org/10.1016/j.cagx.2019.100007). 

## Install

NodeJS:
```
npm install improved-greiner-hormann
```

## Use

The algorithm takes two arrays of vertices of the form `{ x,y }` for the subject and clip polygon, resp., and returns an array of resulting polygons in the same format. The first and last point of the input arrays are not required to be identical (i.e. the polygon is not required to be explicitly closed). Input polygons must be [simple](https://en.wikipedia.org/wiki/Simple_polygon), i.e. they may not self-intersect. They must have a non-zero area. They may be concave. There are no requirements on their winding direction (clockwise or counter-clockwise), but no guarantees are made on the winding direction of the result polygons, either. 

Note that, although the algorithms presented by Greiner and Hormann as well as Foster et al. allow for multi-component polygons, this implementation does not support them. (Because the underlying data structure of polygons as arrays of vertices forming an implicitly-closed loop does not allow it.) In particular, this means polygons may not have holes. If an operation (union, difference) would result in a polygon containing a hole, the result is split into several polygons.

```
import { intersect, union, difference } from 'improved-greiner-hormann';

const subject = [
  { x: 1, y: 1 },
  { x: 3, y: 1 },
  { x: 2, y: 3 }
];
const clip = [ 
  { x: 1, y: 3 },
  { x: 3, y: 3 },
  { x: 2, y: 1 }
]

intersect(subject, clip);
union(subject, clip);
difference(subject, clip);
```

## Tests

Automated tests using [Mocha](https://mochajs.org/) and [Chai](https://www.chaijs.com/) test a variety of cases including degenerate intersections. In the case of intersection and union, this implementation's results are compared against the [reference implementation](https://www.sciencedirect.com/science/article/pii/S259014861930007X?via%3Dihub#ecom0002) provided by Foster et al. Since the reference implementation does not support set-theoretic difference, tests for this operation are less extensive. This is tolerable, however, because much of the underlying algorithm is shared between all operations and thus benefits from the tests for union and intersection.

## Contributing

Pull requests are welcome, provided they are fully tested and passing. In lieu of a formal style guide, please take care to preserve the existing style. 

## License

[MIT](https://github.com/BadIdeaException/improved-greiner-hormann/blob/master/LICENSE)
