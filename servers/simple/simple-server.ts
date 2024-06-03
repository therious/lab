import "reflect-metadata";
import fastify from 'fastify';
import {secretsReport} from '@therious/utils/src/secrets';
import {reqIdGenerate, reqIdDescribe} from '@therious/utils/src/snowflake';
import {Config, Inflate} from '@therious/boot';

type MyConfig = {server?: {port?: number}};
let config:MyConfig = {};
const secrets = secretsReport();



// (async ()=>{
//   try {
//
//     const url = '/config/config.yaml';
//     console.warn(`attempting to load config from`,url);
//     config = await Config.fetch(url);
//     console.warn(`config loaded`,config);
//     // const inflate = new Inflate(config);
//     // const extendedConfig = inflate.intializeSequence('bootSequence');
//     // console.warn(`extendedConfig `,extendedConfig);
//
//
//   } catch(e) {
//     console.error(e);
//   }
// })();

const app = async () => {

  try {

    const url = '/config/config.yaml';
    console.warn(`attempting to load config from`,url);
    config = await Config.fetch(url) as MyConfig;
    console.warn(`config loaded`,config);
    // const inflate = new Inflate(config);
    // const extendedConfig = inflate.intializeSequence('bootSequence');
    // console.warn(`extendedConfig `,extendedConfig);


  } catch(e) {
    console.error(e);
  }

  const app = fastify();

  app.get('/', (req, reply) => {
    reply.send('welcome to simple server');
  });

  app.get('/ping', (req, reply) => {
    reply.send({ msg: 'pong' });
  });


  app.get('/id', (req, reply) => {
    const id = reqIdGenerate();
    const description = reqIdDescribe(id);

    reply.send({ msg: 'id' , id, description});
  });


  app.get('/config', (req, reply) => {
    reply.send(config);
  });

  app.get('/secrets', (req, reply) => {
    reply.send(secrets);
  });


  console.log('import meta env', import.meta.env);
  console.log('config loaded is ', config);
  if (import.meta.env.PROD)
    app.listen({port: config?.server?.port});

  return app;
};

export const simpleFastifyServer = app();  // this is running before the config is fetched
