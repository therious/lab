import fastify from 'fastify';
import { secretsReport} from '@therious/utils/secrets';


const app = async () => {
  const app = fastify();

  app.get('/', (req, reply) => {
    reply.send('change me to see updates, fastify!');
  });

  app.get('/ping', (req, reply) => {
    reply.send({ msg: 'pong' });
  });

  app.get('/pong', (req, reply) => {
    reply.send({ msg: 'ping' });
  });

  app.get('/secrets', (req, reply) => {
    reply.send(secretsReport());
  });


  if (import.meta.env.PROD)
    app.listen(3000);

  return app;
};

export const simpleFastifyServer = app();
