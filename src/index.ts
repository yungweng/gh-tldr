// gh-tldr - Generate a TL;DR summary of your GitHub activity
// Entry point: detects mode (interactive vs direct) and runs CLI

import { run } from "./cli.js";

run().catch((error: unknown) => {
	// Force output of any unhandled error
	const stderr = process.stderr;
	stderr.write("\n=== UNHANDLED ERROR ===\n");
	stderr.write(`Type: ${typeof error}\n`);
	stderr.write(`Is Error: ${error instanceof Error}\n`);

	if (error instanceof Error) {
		stderr.write(`Message: ${error.message}\n`);
		stderr.write(`Stack: ${error.stack}\n`);
	}

	try {
		stderr.write(
			`JSON: ${JSON.stringify(error, Object.getOwnPropertyNames(error as object), 2)}\n`,
		);
	} catch {
		stderr.write(`Raw: ${String(error)}\n`);
	}

	stderr.write("=== END ERROR ===\n");
	process.exitCode = 1;
});
