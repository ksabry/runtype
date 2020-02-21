import util from "util";

import { __runtime } from "./injection";

export enum RuntypeKind {
	Never,
	Unknown,
	Any,
	Void,
	Undefined,
	String,
	Number,
	BigInt,
	Symbol,
	Null,
	True,
	False,
	NonPrimitive,
	StringLiteral,
	NumberLiteral,
	BigintLiteral,
	Object,
	Array,
	Tuple,
	Union,
	Intersection,
	
	PropertyOf,
	ArrayElementOf,
	TupleElementOf,
	Function,
	Mapped,
	Conditional,
	ParameterOf,
	ReturnOf,
}

// TODO:
// unique symbols
// Function,
// Mapped,
// Conditional,
// PropertyOf,
// ParameterOf,
// ReturnOf,
// ArrayElementOf,
// TupleElementOf,
// TypeQuery (typeof)
// ThisType
// InferType

// OptionalType (there is an OptionalTypeNode, but it seems it's Type is always a different Type)

// RestType,
// ImportType

// JSDoc types?

// TypeKeyword vs TypeOperator?

export abstract class Runtype {
	public readonly kind: RuntypeKind;

	public constructor(kind: RuntypeKind) {
		this.kind = kind;
	}

	// Checking

	/**
	 * Validates whether a value is permitted by the type.
	 * Note that this is actually not a completely black in white question in some cases due to the unsound nature of certain parts of the type system.
	 * For the purposes of this function, a value is permitted by a type if it can be directly assigned to a variable of the type.
	 * ```
	 * let lhs: Type;
	 * let rhs = value;
	 * lhs = rhs; // is this permitted?
	 * ```
	 * In the future we may add the ability to change this behavior.
	 */
	public abstract validate(value: unknown): ValidationResult;

	// Strings

	public abstract typeString(): string;

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized): unknown {
		return this.typeString();
	}

	public parenthesisPriority(): number {
		return 1;
	}
}

class NeverType extends Runtype {
	public constructor() {
		super(RuntypeKind.Never);
	}

	public validate(value: unknown): ValidationResult {
		return { valid: false, error: new InvalidValueError(value, this) };
	}

	public typeString() {
		return "never";
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		return options.stylize("never", "special");
	}
}

class UnknownType extends Runtype {
	public constructor() {
		super(RuntypeKind.Unknown);
	}

	public validate(value: unknown): ValidationResult {
		return { valid: true, error: null };
	}

	public typeString() {
		return "unknown";
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		return options.stylize("unknown", "special");
	}
}

class AnyType extends Runtype {
	public constructor() {
		super(RuntypeKind.Any);
	}

	// unsound
	public validate(value: unknown): ValidationResult {
		return { valid: true, error: null };
	}

	public typeString() {
		return "any";
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		return options.stylize("any", "special");
	}
}

class VoidType extends Runtype {
	public constructor() {
		super(RuntypeKind.Void);
	}

	// unsound
	public validate(value: unknown): ValidationResult {
		if (value === undefined) {
			return { valid: true, error: null };
		}
		else {
			return { valid: false, error: new InvalidValueError(value, this) };
		}
	}

	public typeString() {
		return "void";
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		return options.stylize("void", "special");
	}
}

class UndefinedType extends Runtype {
	public constructor() {
		super(RuntypeKind.Undefined);
	}
	
	public validate(value: unknown): ValidationResult {
		if (value === undefined) {
			return { valid: true, error: null };
		}
		else {
			return { valid: false, error: new InvalidValueError(value, this) };
		}
	}

	public typeString() {
		return "undefined";
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		return options.stylize("undefined", "special");
	}
}

class StringType extends Runtype {
	public constructor() {
		super(RuntypeKind.String);
	}

	public validate(value: unknown): ValidationResult {
		if (typeof value === "string") {
			return { valid: true, error: null };
		}
		else {
			return { valid: false, error: new InvalidValueError(value, this) };
		}
	}

	public typeString() {
		return "string";
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		return options.stylize("string", "special");
	}
}

class NumberType extends Runtype {
	public constructor() {
		super(RuntypeKind.Number);
	}

	public validate(value: unknown): ValidationResult {
		if (typeof value === "number") {
			return { valid: true, error: null };
		}
		else {
			return { valid: false, error: new InvalidValueError(value, this) };
		}
	}

	public typeString() {
		return "number";
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		return options.stylize("number", "special");
	}
}

class BigIntType extends Runtype {
	public constructor() {
		super(RuntypeKind.BigInt);
	}

	public validate(value: unknown): ValidationResult {
		if (typeof value === "bigint") {
			return { valid: true, error: null };
		}
		else {
			return { valid: false, error: new InvalidValueError(value, this) };
		}
	}

	public typeString() {
		return "bigint";
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		return options.stylize("bigint", "special");
	}
}

class SymbolType extends Runtype {
	public constructor() {
		super(RuntypeKind.Symbol);
	}

	public validate(value: unknown): ValidationResult {
		if (typeof value === "symbol") {
			return { valid: true, error: null };
		}
		else {
			return { valid: false, error: new InvalidValueError(value, this) };
		}
	}

	public typeString() {
		return "symbol";
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		return options.stylize("symbol", "special");
	}
}

class NullType extends Runtype {
	public constructor() {
		super(RuntypeKind.Null);
	}

	public validate(value: unknown): ValidationResult {
		if (value === null) {
			return { valid: true, error: null };
		}
		else {
			return { valid: false, error: new InvalidValueError(value, this) };
		}
	}

	public typeString() {
		return "null";
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		return options.stylize("null", "special");
	}
}

class TrueType extends Runtype {
	public constructor() {
		super(RuntypeKind.True);
	}

	public validate(value: unknown): ValidationResult {
		if (value === true) {
			return { valid: true, error: null };
		}
		else {
			return { valid: false, error: new InvalidValueError(value, this) };
		}
	}

	public typeString() {
		return "true";
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		return options.stylize("true", "boolean");
	}
}

class FalseType extends Runtype {
	public constructor() {
		super(RuntypeKind.False);
	}

	public validate(value: unknown): ValidationResult {
		if (value === false) {
			return { valid: true, error: null };
		}
		else {
			return { valid: false, error: new InvalidValueError(value, this) };
		}
	}

	public typeString() {
		return "false";
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		return options.stylize("false", "boolean");
	}
}


/**
 * This is the `object` keyword
 */
class NonPrimitiveType extends Runtype {
	public constructor() {
		super(RuntypeKind.NonPrimitive)
	}
	
	public validate(value: unknown): ValidationResult {
		if (typeof value === "object" && value !== null) {
			return { valid: true, error: null };
		}
		else {
			return { valid: false, error: new InvalidValueError(value, this) };
		}
	}
	
	public typeString(): string {
		return "object";
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		return options.stylize("object", "special");
	}
}

class StringLiteralType extends Runtype {
	public readonly literal: string;
	
	public constructor(literal: string) {
		super(RuntypeKind.StringLiteral);
		this.literal = literal;
	}

	public validate(value: unknown): ValidationResult {
		if (value === this.literal) {
			return { valid: true, error: null };
		}
		else {
			return { valid: false, error: new InvalidValueError(value, this) };
		}
	}

	public typeString() {
		return `"${this.literal}"`;
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		return options.stylize(this.typeString(), "string");
	}
}

class NumberLiteralType extends Runtype {
	public readonly literal: number;
	
	public constructor(literal: number) {
		super(RuntypeKind.NumberLiteral);
		this.literal = literal;
	}

	public validate(value: unknown): ValidationResult {
		if (value === this.literal) {
			return { valid: true, error: null };
		}
		else {
			return { valid: false, error: new InvalidValueError(value, this) };
		}
	}

	public typeString() {
		return this.literal.toString();
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		return options.stylize(this.typeString(), "number");
	}
}

class BigIntLiteralType extends Runtype {
	public readonly literal: bigint;
	
	public constructor(literal: bigint) {
		super(RuntypeKind.BigintLiteral);
		this.literal = literal;
	}

	public validate(value: unknown): ValidationResult {
		if (value === this.literal) {
			return { valid: true, error: null };
		}
		else {
			return { valid: false, error: new InvalidValueError(value, this) };
		}
	}

	public typeString() {
		return `${this.literal}n`;
	}
	
	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		return options.stylize(this.typeString(), "bigint");
	}
}

type ObjectPropertiesReadonly = {
	readonly key: string | number | symbol;
	readonly value: Runtype;
	readonly optional: boolean;
}[];

type ObjectProperties = {
	key: string | number | symbol;
	value: Runtype;
	optional: boolean;
}[];

function getAllProperties(obj: unknown) {
	const result: string[] = [];
	let current = obj;
	
	do {
		for (const key of Object.getOwnPropertyNames(current)) {
			if (!result.includes(key)) {
				result.push(key);
			}
		}
	}
	while(current = Object.getPrototypeOf(current));

	return result
}

class ObjectType extends Runtype {
	public readonly properties: ObjectPropertiesReadonly;
	public readonly indexString: Runtype | undefined;
	public readonly indexNumber: Runtype | undefined;

	public constructor(
		properties: ObjectProperties,
		indexString?: Runtype,
		indexNumber?: Runtype,
	) {
		super(RuntypeKind.Object);
		this.properties = properties;
		this.indexString = indexString;
		this.indexNumber = indexNumber;
	}

	public validate(value: unknown): ValidationResult {
		if (typeof value !== "object" || value === null) {
			return { valid: false, error: new InvalidValueError(value, this) };
		}

		let valid = true;
		const errors: ValidationError[] = [];
		const visitedProperties = new Set<string | number | symbol>();

		for (const { key, value: valueType, optional } of this.properties) {
			// TODO: we may want to check non-enumerable properties
			if (!(key in value)) {
				if (!optional) {
					valid = false;
					errors.push(new MissingPropertyError(key));
					// Don't short circuit after missing properties
				}
				continue;
			}
			
			visitedProperties.add(key);
			const propertyValidation = valueType.validate((value as any)[key]);
			
			if (!propertyValidation.valid) {
				valid = false;
			}
			if (propertyValidation.error !== null) {
				errors.push(new InvalidPropertyError(key, [ propertyValidation.error ]));
				break; // Short circuit after first property error
			}
		}

		if (valid && (this.indexString || this.indexNumber)) {
			// Note that we don't want to check hasOwnProperty
			for (const propertyName of getAllProperties(value)) {
				if (visitedProperties.has(propertyName)) {
					continue;
				}

				let propertyType: Runtype;

				if (this.indexNumber && !Number.isNaN(Number(propertyName))) {
					propertyType = this.indexNumber;
				}
				else if (this.indexString) {
					propertyType = this.indexString;
				}
				else {
					// we don't care about unspecified properties
					continue;
				}

				const propertyValidation = propertyType.validate((value as any)[propertyName]);

				if (!propertyValidation.valid) {
					valid = false;
				}
				if (propertyValidation.error !== null) {
					errors.push(new InvalidPropertyError(propertyName, [ propertyValidation.error ]));
					break; // short circuit after first property error
				}
			}
		}

		return { valid: valid, error: errors.length === 0 ? null : new InvalidValueError(value, this, errors) };
	}

	public typeString() {
		return util.inspect(this, { colors: false, customInspect: true });
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		// We have to inject our own custom 'stylize' in a somewhat roundabout way to add '?' to optional property names and use ';' instead of ','
		
		class ProxyInspected {
			public result: string;
			constructor(result: string) {
				this.result = result;
			}
			public [util.inspect.custom]() {
				return this.result + ";";
			} 
		}

		const optionalKeys: (string | number | symbol)[] = []
		const inspectObject: { [key: string]: ProxyInspected } = {};
		
		for (const { key, optional, value } of this.properties) {
			if (optional) {
				optionalKeys.push(key);
			}
			inspectObject[key as any] = new ProxyInspected(util.inspect(value, options));
		}
		
		// @ts-ignore
		const result = util.inspect(
			inspectObject,
			{
				...options,
				colors: false, // if true ignores custom stylize
				stylize: (text: string, styleType: util.Style) => {
					// @ts-ignore
					if (styleType === "name") {
						// @ts-ignore
						return options.stylize(optionalKeys.includes(text) ? text + options.stylize("?", "undefined") : text, "name");
					}
					return text;
				}
			}
		);

		return result.replace(/;,/g, ";");
	}
}

// TODO: consider just comparing this by property (as an ObjectType); typescript seems to do it that way
class ArrayType extends Runtype {
	public readonly element: Runtype;

	public constructor(element: Runtype) {
		super(RuntypeKind.Array);
		this.element = element;
	}

	public validate(value: unknown): ValidationResult {
		if (!Array.isArray(value)) {
			return { valid: false, error: new InvalidValueError(value, this) };
		}

		let valid = true;
		const errors: ValidationError[] = [];

		for (let i = 0; i < value.length; i++) {
			const elementValidation = this.element.validate(value[i]);

			if (!elementValidation.valid) {
				valid = false;
			}
			if (elementValidation.error !== null) {
				errors.push(new InvalidElementError(i, [ elementValidation.error ]));
				break; // short circuit after first element error
			}
		}

		return { valid: valid, error: errors.length === 0 ? null : new InvalidValueError(value, this, errors) };
	}

	public typeString() {
		return `${this.element.typeString()}[]`;
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		return `${this.element[util.inspect.custom](depth, options)}[]`;
	}
}

// TODO: consider just comparing this by property (as an ObjectType); typescript seems to do it that way
class TupleType extends Runtype {
	public readonly elements: Runtype[];
	
	public constructor(elements: Runtype[]) {
		super(RuntypeKind.Tuple);
		this.elements = elements;
	}

	public validate(value: unknown): ValidationResult {
		if (!Array.isArray(value) || value.length !== this.elements.length) {
			return { valid: false, error: new InvalidValueError(value, this) };
		}

		let valid = true;
		const errors: ValidationError[] = [];

		for (let i = 0; i < this.elements.length; i++) {
			const elementValidation = this.elements[i].validate(value[i]);

			if (!elementValidation.valid) {
				valid = false;
			}
			if (elementValidation.error !== null) {
				errors.push(new InvalidElementError(i, [ elementValidation.error ]));
				break; // short circuit after first element error
			}
		}

		return { valid, error: errors.length === 0 ? null : new InvalidValueError(value, this, errors) };
	}

	public typeString() {
		return `[ ${ this.elements.map(e => e.typeString()).join(", ") } ]`;
	}
	
	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		return this.elements;
	}
}

class UnionType extends Runtype {
	public readonly types: Runtype[];

	public constructor(types: Runtype[]) {
		super(RuntypeKind.Union);
		this.types = types;
	}

	public validate(value: unknown): ValidationResult {
		let found = false;
		const errors: ValidationError[] = [];

		for (const unionType of this.types) {
			const unionTypeValidation = unionType.validate(value);
			if (unionTypeValidation.valid) {
				found = true;
				break;
			}
			if (unionTypeValidation.error !== null) {
				errors.push(unionTypeValidation.error);
			}
		}

		return { valid: found, error: found ? null : new InvalidValueError(value, this, errors) }
	}

	public typeString() {
		return `( ${ this.types.map(e => e.typeString()).join(" | ") } )`;
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		const typeStrings: string[] = [];
		for (const type of this.types) {
			let typeString = type[util.inspect.custom](depth, options);
			// while it is not strictly necessary, we want to parenthesize both intersections and unions
			if (type.parenthesisPriority() >= 2) {
				typeString = `(${typeString})`;
			}
			typeStrings.push(String(typeString));
		}
		return typeStrings.join(" | ");
	}

	public parenthesisPriority() {
		return 3;
	}
}

class IntersectionType extends Runtype {
	public readonly types: Runtype[];

	public constructor(types: Runtype[]) {
		super(RuntypeKind.Intersection);
		this.types = types;
	}

	public validate(value: unknown): ValidationResult {
		let valid = true;
		const errors: ValidationError[] = [];

		for (const intersectionType of this.types) {
			const intersectionTypeValidation = intersectionType.validate(value);
			if (!intersectionTypeValidation.valid) {
				valid = false;
			}
			if (intersectionTypeValidation.error !== null) {
				errors.push(intersectionTypeValidation.error);
				break; // short circuit after first error
			}
		}

		return { valid: valid, error: errors.length === 0 ? null : new InvalidValueError(value, this, errors) };
	}

	public typeString() {
		return `( ${ this.types.map(e => e.typeString()).join(" & ") } )`;
	}

	public [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
		const typeStrings: string[] = [];
		for (const type of this.types) {
			let typeString = type[util.inspect.custom](depth, options);
			// while it is not strictly necessary, we want to parenthesize both intersections and unions
			if (type.parenthesisPriority() >= 2) {
				typeString = `(${typeString})`;
			}
			typeStrings.push(String(typeString));
		}
		return typeStrings.join(" & ");
	}

	public parenthesisPriority() {
		return 2;
	}
}

// Validation

export interface ValidationResult {
	valid: boolean;
	error: null | ValidationError;
}

export abstract class ValidationError {
	public readonly children: ValidationError[];
	
	constructor(children: ValidationError[] = []) {
		this.children = children;
	}

	public abstract toStringShort(): string;

	public toString() {
		let messageLines = [ this.toStringShort() ];
		for (const child of this.children) {
			for (const childLine of child.toString().split("\n")) {
				messageLines.push("  " + childLine);
			}
		}
		return messageLines.join("\n");
	}
}

class InvalidValueError extends ValidationError {
	readonly expected: Runtype;
	readonly actual: unknown;
	
	public constructor(actual: unknown, expected: Runtype, children: ValidationError[] = []) {
		super(children);
		this.expected = expected;
		this.actual = actual;
	}

	public toStringShort() {
		return `Invalid value: ${JSON.stringify(this.actual)}\nExpected: ${this.expected.typeString()}`;
	}
}

class MissingPropertyError extends ValidationError {
	readonly propertyKey: string | number | symbol;

	public constructor(key: string | number | symbol) {
		super();
		this.propertyKey = key;
	}

	public toStringShort() {
		return `Missing property '${String(this.propertyKey)}'`;
	}
}

class InvalidPropertyError extends ValidationError {
	readonly propertyKey: string | number | symbol;

	public constructor(key: string | number | symbol, children: ValidationError[] = []) {
		super(children);
		this.propertyKey = key;
	}

	public toStringShort() {
		return `Property '${String(this.propertyKey)}' failed validation`;
	}
}

class InvalidElementError extends ValidationError {
	readonly elementIndex: number;

	public constructor(elementIndex: number, children: ValidationError[] = []) {
		super(children);
		this.elementIndex = elementIndex;
	}

	public toStringShort() {
		return `Element at index ${this.elementIndex} failed validation`;
	}
}

class InvalidPropertyIndexError extends ValidationError {
	readonly propertyName: string;
	readonly expected: Runtype;

	public constructor(propertyName: string, expected: Runtype, children: ValidationError[]) {
		super(children);
		this.propertyName = propertyName;
		this.expected = expected;
	}

	public toStringShort() {
		return `Invalid property index ${this.propertyName}\nExpected ${this.expected.typeString()}`;
	}
}

// Exported creation methods

export function createNeverType() {
	return new NeverType();
}

export function createUnknownType() {
	return new UnknownType();
}

export function createAnyType() {
	return new AnyType();
}

export function createVoidType() {
	return new VoidType();
}

export function createUndefinedType() {
	return new UndefinedType();
}

export function createStringType() {
	return new StringType();
}

export function createNumberType() {
	return new NumberType();
}

export function createBigIntType() {
	return new BigIntType();
}

export function createSymbolType() {
	return new SymbolType();
}

export function createNullType() {
	return new NullType();
}

export function createTrueType() {
	return new TrueType();
}

export function createFalseType() {
	return new FalseType();
}

export function createBooleanType() {
	return createUnionType([ createTrueType(), createFalseType() ]);
}

export function createNonPrimitiveType() {
	return new NonPrimitiveType();
}

export function createStringLiteralType(value: string) {
	return new StringLiteralType(value);
}

export function createNumberLiteralType(value: number) {
	return new NumberLiteralType(value);
}

export function createBigIntLiteralType(value: bigint) {
	return new BigIntLiteralType(value);
}

export function createObjectType(
	properties: ObjectProperties,
	indexString?: Runtype,
	indexNumber?: Runtype,
) {
	return new ObjectType(properties, indexString, indexNumber);
}

export function createArrayType(element: Runtype) {
	return new ArrayType(element);
}

export function createTupleType(elements: Runtype[]) {
	return new TupleType(elements);
}

export function createUnionType(types: Runtype[]) {
	return new UnionType(types);
}

export function createIntersectionType(types: Runtype[]) {
	return new IntersectionType(types);
}

export function getGlobalType(name: string) {
	const result = __runtime.global_runtypes.get(name);
	if (result === undefined) {
		throw new Error(`Cannot find global type '${name}'`);
	}
	return result;
}

function getObjectKeyTypes(type: ObjectType) {
	// TODO: add unique symbols
	
	if (type.indexString) {
		return [ createStringType(), createNumberType() ];
	}

	const types: Runtype[] = [];
	for (const property of type.properties) {
		if (typeof property.key === "string") {
			types.push(createStringLiteralType(property.key));
		}
		else if (typeof property.key === "number") {
			types.push(createNumberLiteralType(property.key));
		}
		else {
			// TODO: unique symbols
			throw Error("unique symbols not implemented");
		}
	}
	if (type.indexNumber) {
		types.push(createNumberType());
	}

	return types;
}

export function getBoxedType(type: Runtype) {
	if (type.kind === RuntypeKind.String) {
		return getGlobalType("String");
	}
	if (type.kind === RuntypeKind.Number) {
		return getGlobalType("Number");
	}
	if (type.kind === RuntypeKind.BigInt) {
		return getGlobalType("BigInt");
	}
	if (type.kind === RuntypeKind.Symbol) {
		return getGlobalType("Symbol");
	}
	if (type.kind === RuntypeKind.True) {
		return getGlobalType("Boolean");
	}
	if (type.kind === RuntypeKind.False) {
		return getGlobalType("Boolean");
	}
	if (type.kind === RuntypeKind.StringLiteral) {
		return getGlobalType("String");
	}
	if (type.kind === RuntypeKind.NumberLiteral) {
		return getGlobalType("Number");
	}
	if (type.kind === RuntypeKind.BigintLiteral) {
		return getGlobalType("BigInt");
	}
	return undefined;
}

export function createKeyOfType(type: Runtype): Runtype {
	if (
		type.kind === RuntypeKind.Unknown ||
		type.kind === RuntypeKind.Void ||
		type.kind === RuntypeKind.Undefined ||
		type.kind === RuntypeKind.Null ||
		type.kind === RuntypeKind.NonPrimitive
	) {
		return createNeverType();
	}

	if (
		type.kind === RuntypeKind.Never ||
		type.kind === RuntypeKind.Any
	) {
		return createUnionType([ createStringType(), createNumberType(), createSymbolType() ]);
	}

	// For keyof types we defer primitives to their boxed versions
	const boxed = getBoxedType(type);
	if (boxed) {
		type = boxed;
	}

	if (type.kind === RuntypeKind.Object) {
		return createUnionType(getObjectKeyTypes(type as ObjectType));
	}

	if (type.kind === RuntypeKind.Array) {
		return createKeyOfType(getGlobalType("Array"));
	}

	if (type.kind === RuntypeKind.Tuple) {
		const keyTypes = getObjectKeyTypes(getGlobalType("Array") as ObjectType);
		for (let i = 0; i < (type as TupleType).elements.length; i++) {
			keyTypes.push(createStringLiteralType(i.toString()));
		}
		return createUnionType(keyTypes);
	}

	if (type.kind === RuntypeKind.Union) {
		// keys which are present in types
		return createIntersectionType((type as UnionType).types.map(createKeyOfType));
	}

	if (type.kind === RuntypeKind.Intersection) {
		// keys which are present in any
		return createUnionType((type as UnionType).types.map(createKeyOfType));
	}

	throw new Error(`Unrecognized runtype; kind is ${type.kind}`);
}

function createAccessTypeWithPrimitiveKey(type: Runtype, key: string | number) {
	// TODO: unique symbols
	if (type.kind === RuntypeKind.Object) {
		for (const { key: propertyKey, value } of (type as ObjectType).properties) {
			// TODO: symbols
			if (typeof key === "symbol") {
				continue;
			}

			if (key.toString() === propertyKey.toString()) {
				return value;
			}
		}

		if (typeof key === "number" && (type as ObjectType).indexNumber) {
			return (type as ObjectType).indexNumber;
		}

		if ((type as ObjectType).indexString) {
			return (type as ObjectType).indexString;
		}

		// TODO: error type
		throw new Error(`Invalid key for access type: ${key}`);
	}
}

export function createAccessType(type: Runtype, keyType: Runtype) {
	type test = { [key: number]: string, b: string };
	type r = test["0"];

	if (
		keyType.kind === RuntypeKind.Any ||
		keyType.kind === RuntypeKind.Unknown ||
		keyType.kind === RuntypeKind.Void ||
		keyType.kind === RuntypeKind.Undefined ||
		keyType.kind === RuntypeKind.Null ||
		keyType.kind === RuntypeKind.NonPrimitive
	) {
		// TODO: error type;
		throw new Error("Invalid key type for access type");
	}

	// For access types we defer primitives to their boxed versions
	const boxed = getBoxedType(type);
	if (boxed) {
		type = boxed;
	}
	
	if (type.kind === RuntypeKind.Object) {
		for (const { name, optional, value } of (type as ObjectType).properties) {
			
		}
	}
}
