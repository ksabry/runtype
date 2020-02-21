import util from "util";
import { runtypeOf, isOfType } from "../runtype";

function logType<T>() {
	const rt = runtypeOf<T>();
	console.log(rt);
}

function checkType<T>(value: unknown) {
	console.log("========================");

	const rt = runtypeOf<T>();
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
checkType<string[]>([ "a", "b", "c" ]);

