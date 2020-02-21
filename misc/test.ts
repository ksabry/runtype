import util from "util";
import * as rt from "../runtype";

const obj = new rt.RuntypeProperties(
	{
		a: {
			optional: false,
			property: new rt.RuntypeString(),
		},
		b: {
			optional: true,
			property: new rt.RuntypeNumber(),
		},
		c: {
			optional: true,
			property: new rt.RuntypeArray(new rt.RuntypeNumber()),
		},
		d: {
			optional: false,
			property: new rt.RuntypeTuple([ new rt.RuntypeStringLiteral("abc"), new rt.RuntypeNumberLiteral(123) ]),
		},
	},
);

console.log(
	util.inspect(
		obj,
		{
			colors: true,
			customInspect: true,
		}
	)
)
