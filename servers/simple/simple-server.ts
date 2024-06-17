import "reflect-metadata";
import fastify from 'fastify';
import fstatic from '@fastify/static';
import {secretsReport} from '@therious/utils/src/secrets';
import {reqIdGenerate, reqIdDescribe} from '@therious/utils/src/snowflake';
import {Config, Inflate} from '@therious/boot';
import * as process from 'node:process';
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';

type MyConfig = Partial<{server: {port: number}, welcome: string}>;

function setCurrentDirectory()
{
  const prodMode = !!import.meta.env.PROD;

  const args =  [...process.argv].slice(2);  // skip the first two args
  const dir = args[0] ?? '';                 // is there a directory arg?

  if(dir && fs.existsSync(dir))
    process.chdir(dir);
  else
    console.error(`cannot chdir("${dir}")`);

  console.log(`current dir: ${process.cwd()}`);
}

function staticServeDir():string
{
  const devMode = !!import.meta.env.DEV;
  const suffix = devMode? '/public': '';  // if dev mode, append an extra /public to serve static files

  const locationOfThisSourceFile = path.dirname(fileURLToPath(import.meta.url));

  return `${locationOfThisSourceFile}${suffix}`;
}

const app = async () => {

  let config:MyConfig = {};
  const secrets = secretsReport();

  setCurrentDirectory();
  const __dirname = staticServeDir();

  try {
    const url = `/config/config.yaml`;
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
// maybe move this down if we serve static files from public directory with '/' just slash
// and it competes with /api/*
  app?.register(fstatic, {
    root: path.join(__dirname, 'public'),  // all static files will be in this directory
    prefix: '/public/',
    // constraints: {} // the default value
    // constraints: { host: 'example.com' }
  })

  app?.get('/', (req, reply) => {
    reply.send(config.welcome);
  });

  app?.get('/ping', (req, reply) => {
    reply.send({ msg: 'pong' });
  });


  app?.get('/id', (req, reply) => {
    const id = reqIdGenerate();
    const description = reqIdDescribe(id);

    reply.send({ msg: 'id' , id, description});
  });


  app?.get('/config', (req, reply) => {
    reply.send(config);
  });

  app?.get('/secrets', (req, reply) => {
    reply.send(secrets);
  });


  console.log('import meta env', import.meta.env);
  console.log('config loaded is ', config);
  if (import.meta.env.PROD)
    app?.listen({host:'0.0.0.0', port: config?.server?.port});

  return app;
};

export const simpleFastifyServer = app();  // this is running before the config is fetched
