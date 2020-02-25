import { runtype, isOfType } from "../runtype";

function logType<T>() {
	const rt = runtype<T>();
	console.log(rt);
}

function checkType<T>(value: unknown) {
	console.log("========================");

	const rt = runtype<T>();
	console.log(rt);
	console.log(value);

	const validation = rt.validate(value);
	if (!validation.valid) {
		console.log(validation.error!.toString());
	}
	else {
		console.log("Valid")
	}
}

// checkType<{ a: string, b: string, c: string }>({ b: 10 });
checkType<string[]>([ "a", "b" ]);

// function createUniqueESSymbolType(symbol: Symbol) {
// 	const type = <UniqueESSymbolType>createType(TypeFlags.UniqueESSymbol);
// 	type.symbol = symbol;
// 	type.escapedName = `__@${type.symbol.escapedName}@${getSymbolId(type.symbol)}` as __String;
// 	return type;
// }

// export function getPropertyNameForKnownSymbolName(symbolName: string): __String {
// 	return "__@" + symbolName as __String;
// }

// function getPropertyNameFromType(type: StringLiteralType | NumberLiteralType | UniqueESSymbolType): __String {
// 	if (type.flags & TypeFlags.UniqueESSymbol) {
// 		return (<UniqueESSymbolType>type).escapedName;
// 	}
// 	if (type.flags & (TypeFlags.StringLiteral | TypeFlags.NumberLiteral)) {
// 		return escapeLeadingUnderscores("" + (<StringLiteralType | NumberLiteralType>type).value);
// 	}
// 	return Debug.fail();
// }

// export function escapeLeadingUnderscores(identifier: string): __String {
// 	return (
// 		identifier.length >= 2 &&
// 		identifier.charCodeAt(0) === CharacterCodes._ &&
// 		identifier.charCodeAt(1) === CharacterCodes._ ? "_" + identifier : identifier
// 	) as __String;
// }

// export function unescapeLeadingUnderscores(identifier: __String): string {
// 	const id = identifier as string;
// 	return id.length >= 3 && id.charCodeAt(0) === CharacterCodes._ && id.charCodeAt(1) === CharacterCodes._ && id.charCodeAt(2) === CharacterCodes._ ? id.substr(1) : id;
// }
