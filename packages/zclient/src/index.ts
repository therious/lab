import "reflect-metadata";
import {Config} from "./utils/config";
import {Inflate} from "./utils/inflate";

// get the relevant classes registered for injection with an import
import './fsm-utils/test-class';
import {connectApp} from "./connect-app";




(async ()=>{
    try {
        const config = await Config.fetch('/config/hello.yaml');
        console.warn(`config loaded`);
        const inflate = new Inflate(config);
        // const extendedConfig = inflate.intializeSequence('bootSequence');

        connectApp();
    } catch(e) {
        console.error(e);
    }
})();

