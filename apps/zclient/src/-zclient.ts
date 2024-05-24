import "reflect-metadata";
import {Config, Inflate} from "@therious/boot";

// get the relevant classes registered for injection with an import
import './fsm/some-tests';
import {connectApp} from "./connect-app";

(async ()=>{
    try {
        const config = await Config.fetch('/config/-zclient.yaml');
        console.warn(`config loaded`,config);
        const inflate = new Inflate(config);
        const extendedConfig = inflate.intializeSequence('bootSequence');
        console.warn(`extendedConfig `,extendedConfig);

        connectApp();
    } catch(e) {
        console.error(e);
    }
})();

