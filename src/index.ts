import { CommandsRegistry, runCommand, initRegistry} from "./cli.js"

async function main() {

    const registry: CommandsRegistry = {};

    initRegistry(registry);     // register all available commands with their handlers

    // we want to slice after (tsx ./src/index.ts) -> after 2
    const cmdName = process.argv.slice(2)[0];
    if (process.argv.slice(2).length === 0) {   // if not enough arguments were provided -> error
        console.log(`not enough arguments were provided`);
        process.exit(1);
    
    } else if (process.argv.slice(3).length === 0 && (cmdName === 'register' || cmdName === 'login')) {    // if a username is not provided -> error with register and login commands
        console.log(`a username is required`);
        process.exit(1);
    
    } else {    // enough arguments were provided
        const args = process.argv.slice(3);

        if (cmdName in registry) {
            try {
                await runCommand(registry, cmdName, ...args);

            } catch (error) {
                if (error instanceof Error) {
                    console.error("ERROR Occured While Run Command:", error.message);
                    process.exit(1);
                }
                else {
                    console.error("ERROR Occured While Run Command:", error);
                    process.exit(1);
                }
            }

        } else {
            console.log(`Unknown command`);
        }      
    }

    process.exit(0);

}

await main();