import { runtype, isOfType } from "../runtype";

function logType<T>() {
	const rt = runtype<T>();
	console.log(rt);
}

function checkType<T extends { [key: string]: unknown }>(value: unknown) {
	console.log("========================");

	const rt = runtype<T>();
	const accessRt = runtype<T["1"]>();

	console.log(rt);
	console.log(accessRt);
	console.log(value);

	const validation = rt.validate(value);
	if (!validation.valid) {
		console.log(validation.error!.toString());
	}
	else {
		console.log("Valid")
	}
}

const testSymbol = Symbol("test");

interface Test {
	a: 123;
	[key: number]: 10;
	[key: string]: number;
}

checkType<Test>({ test: 1 });

// checkType<{ a: string, b: string, c: string }>({ b: 10 });

// export function symbolName(symbol: Symbol): string {
// 	if (symbol.valueDeclaration && isPrivateIdentifierPropertyDeclaration(symbol.valueDeclaration)) {
// 		return idText(symbol.valueDeclaration.name);
// 	}
// 	return unescapeLeadingUnderscores(symbol.escapedName);
// }

// function getLiteralTypeFromProperty(prop: Symbol, include: TypeFlags) {
// 	if (!(getDeclarationModifierFlagsFromSymbol(prop) & ModifierFlags.NonPublicAccessibilityModifier)) {
// 		let type = getSymbolLinks(getLateBoundSymbol(prop)).nameType;
// 		if (!type && !isKnownSymbol(prop)) {
// 			if (prop.escapedName === InternalSymbolName.Default) {
// 				type = getLiteralType("default");
// 			}
// 			else {
// 				const name = prop.valueDeclaration && getNameOfDeclaration(prop.valueDeclaration) as PropertyName;
// 				type = name && getLiteralTypeFromPropertyName(name) || getLiteralType(symbolName(prop));
// 			}
// 		}
// 		if (type && type.flags & include) {
// 			return type;
// 		}
// 	}
// 	return neverType;
// }
