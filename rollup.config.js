import resolve from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import commonjs from "@rollup/plugin-commonjs";

export default {
	input: "index.mjs",
	plugins: [
		resolve({
			preferBuiltins: false, // Might need true for non-iffe node builds?
			mainFields: ["module", "jsnext:main", "browser", "main"],
			// These are conditions added to the default ones.
			exportConditions: [],
			extensions: [".mjs", ".js", ".ts", ".tsx"],
		}),
		json(),
		commonjs({
			include: ["**/node_modules/**"],
		}),
	],
	output: {
		dir: "dist/",
		// Make sure to output .mjs files so node recognizes them as modules
		entryFileNames: "[name].mjs",
		chunkFileNames: "[name]-[hash].mjs",
		format: "esm",
		sourcemap: true,
	},
};
