import { setUser, readConfig } from "./config.js"

function main() {

    setUser('Qusay');

    const config = readConfig();

    console.log(config);

}

main();