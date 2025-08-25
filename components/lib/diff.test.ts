import {
	shallowDiff,
	shallowEqual,
	deepDiff,
	deepMerge,
	deepMergeTagMultiple,
	MULTIPLE,
	isMultiple,
} from ".";

const obj1 = { v1: "aa", v2: "bb" };
const obj2 = { v1: "aa", v2: "bb" }; // different instance, same value
const obj3 = { v1: "aa", v2: "BB" }; // different content
const obj4 = { v1: "aa", v3: "cc" }; // different shape
const array1 = [1, 2];
const array2 = [1, 2]; // different instance, same content
const array3 = [1, 3]; // different content
const array4 = [1, 2, 3]; // different length
const emptyArray: number[] = []; // empty array
const date1 = new Date(2011, 2, 1);
const date2 = new Date(2011, 2, 1); // different instance, same value
const date3 = new Date(2011, 2, 2); // different value

const orig = {
	v1: "a",
	o1: obj1,
	o2: obj1,
	o3: obj1,
	a1: array1,
	a2: array1,
	a3: array1,
	a4: emptyArray,
	a5: array1,
	d1: date1,
	d2: date1,
	d3: date1,
	oo1: { o1: obj1, o2: obj1, o3: obj1 },
	oo2: { a1: array1, a2: array1, a3: array1 },
	oo3: { d1: date1, d2: date1, d3: date1 },
};

const mod = {
	v1: "a",
	o1: obj1, // same instance
	o2: obj2, // different instance, same content
	o3: obj3, // different content
	a1: array1, // same instance
	a2: array2, // different instance, same content
	a3: array3, // different content
	a4: array1, // empty vs non-empty
	a5: emptyArray, // non-empty vs empty
	d1: date1, // same instance
	d2: date2, // different instance, same value
	d3: date3, // different value
	oo1: { o1: obj1, o2: obj2, o3: obj3 },
	oo2: { a1: array1, a2: array2, a3: array3 },
	oo3: { d1: date1, d2: date2, d3: date3 },
};

describe("shallowEqual", function () {
	// eslint-disable-next-line no-sparse-arrays
	const falsey = [, "", 0, false, NaN, null, undefined];

	beforeEach(() => {
		// isolated instances of shallowequal for each test.
		jest.resetModules();
	});

	it("returns false if either argument is null", () => {
		expect(shallowEqual(null, {})).toEqual(false);
		expect(shallowEqual({}, null)).toEqual(false);
	});

	it("returns true if both arguments are null or undefined", () => {
		expect(shallowEqual(null, null)).toEqual(true);
		expect(shallowEqual(undefined, undefined)).toEqual(true);
	});

	it("returns true if arguments are shallow equal", () => {
		expect(
			shallowEqual({ a: 1, b: 2, c: 3 }, { a: 1, b: 2, c: 3 })
		).toEqual(true);
	});

	it("returns false if arguments are not objects and not equal", () => {
		expect(shallowEqual(1, 2)).toEqual(false);
	});

	it("returns false if only one argument is not an object", () => {
		expect(shallowEqual(1, {})).toEqual(false);
	});

	it("returns false if first argument has too many keys", () => {
		expect(shallowEqual({ a: 1, b: 2, c: 3 }, { a: 1, b: 2 })).toEqual(
			false
		);
	});

	it("returns false if second argument has too many keys", () => {
		expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2, c: 3 })).toEqual(
			false
		);
	});

	it("returns true if values are not primitives but are ===", () => {
		let obj = {};
		expect(
			shallowEqual({ a: 1, b: 2, c: obj }, { a: 1, b: 2, c: obj })
		).toEqual(true);
	});

	// subsequent test cases are copied from lodash tests
	it("returns false if arguments are not shallow equal", () => {
		expect(
			shallowEqual({ a: 1, b: 2, c: {} }, { a: 1, b: 2, c: {} })
		).toEqual(false);
	});

	it("should treat objects created by `Object.create(null)` like any other plain object", () => {
		function Foo() {
			this.a = 1;
		}
		Foo.prototype.constructor = null;

		const object2 = { a: 1 };
		expect(shallowEqual(new Foo(), object2)).toEqual(true);

		const object1 = Object.create(null);
		object1.a = 1;
		expect(shallowEqual(object1, object2)).toEqual(true);
	});
});

const shallowDiff_result = {
	o2: mod.o2,
	o3: mod.o3,
	a2: mod.a2,
	a3: mod.a3,
	a4: mod.a4,
	a5: mod.a5,
	d2: mod.d2,
	d3: mod.d3,
	oo1: mod.oo1,
	oo2: mod.oo2,
	oo3: mod.oo3,
};

describe("shallowDiff", function () {
	it("returns correct change object for objects that differ", () => {
		expect(shallowDiff(orig, mod)).toStrictEqual(shallowDiff_result);
	});

	it("returns correct change object for objects that are the same", () => {
		expect(shallowDiff(orig, {...orig})).toStrictEqual({});
	});
});

const deepDiff_result = {
	o3: { v2: "BB" },
	a3: [undefined, 3],
	a4: array1,
	a5: emptyArray,
	d3: date3,
	oo1: { o3: { v2: "BB" } },
	oo2: { a3: [undefined, 3] },
	oo3: { d3: date3 },
};

describe("deepDiff", function () {
	it("returns correct change object for objects that differ", () => {
		expect(deepDiff(orig, mod)).toStrictEqual(deepDiff_result);
	});

	it("returns correct change object for objects that are the same", () => {
		expect(deepDiff(orig, {...orig})).toStrictEqual({});
	});
});

const o1 = {
	v1: "a",
	d1: date1,
	o1: obj1,
	a1: array1,
	a2: array1,
	v7: {
		aa: "aa",
		bb: "bb",
		o1: obj1,
	},
};
const o2 = {
	o1: obj3,
	a1: array3,
	a2: array4,
	v7: {
		bb: "b2",
		cc: "cc",
		o1: obj3,
	},
};
const m = {
	...o1,
	...o2,
	o1: { ...obj1, ...obj3 },
	a1: array3,
	a2: array4,
	v7: {
		...o1.v7,
		...o2.v7,
	},
};

describe("deepMerge", function () {

	test("objects", () => {
		expect(deepMerge(o1, o2)).toStrictEqual(m);
	});

	test("numbers", () => {
		expect(deepMerge(1, 2)).toStrictEqual(2);
	});
});

const oo1 = {
	sameValue: "a",
	diffValue: "b",
	sameDate: date1,
	diffDate: date1,
	sameArray1: [1, 2],
	sameArray2: [obj1, obj1],
	sameArrayDiffObj: [obj1, obj1],
	diffArrayLen: [1, 2],
	diffArrayContent1: array1,
	diffArrayContent2: array1,
	diffArrayContent3: [1, obj1],
	obj: {
		sameValue: "aa",
		diffValue: "bb",
	},
	extra1: "aa",
};
const oo2 = {
	sameValue: "a",
	diffValue: "B",
	sameDate: date2,
	diffDate: date3,
	sameArray1: [1, 2],
	sameArray2: [obj1, obj2],
	sameArrayDiffObj: [obj1, obj3],
	diffArrayLen: [1, 2, 3],
	diffArrayContent1: [1, 3],
	diffArrayContent2: [2, 1],
	diffArrayContent3: [1, 2],
	obj: {
		sameValue: "aa",
		diffValue: "BB",
	},
	extra2: "bb",
};
const mm = {
	sameValue: "a",
	diffValue: MULTIPLE,
	sameDate: date1,
	diffDate: MULTIPLE,
	sameArray1: [1, 2],
	sameArray2: [obj1, obj2],
	sameArrayDiffObj: [obj1, { v1: "aa", v2: MULTIPLE }],
	diffArrayLen: MULTIPLE,
	diffArrayContent1: MULTIPLE,
	diffArrayContent2: MULTIPLE,
	diffArrayContent3: MULTIPLE,
	obj: {
		sameValue: "aa",
		diffValue: MULTIPLE,
	},
	extra1: "aa",
	extra2: "bb",
};

describe("deepMergeTagMultiple", function () {

	test("merge and tag {} with oo2", () => {
		const result = deepMergeTagMultiple({}, oo2);
		expect(result).toStrictEqual(oo2);
	});

	test("merge and tag oo2 with {}", () => {
		const result = deepMergeTagMultiple(oo2, {});
		expect(result).toStrictEqual(oo2);
	});

	test("merge and tag oo1 and oo2", () => {
		const result = deepMergeTagMultiple(oo1, oo2);
		expect(result).toStrictEqual(mm);
		expect(isMultiple(result.sameValue)).toEqual(false);
		expect(isMultiple(result.diffValue)).toEqual(true);
	});
});