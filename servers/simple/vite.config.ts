import { defineConfig } from 'vite';
///@ts-ignore
import { VitePluginNode } from 'vite-plugin-node';

export default defineConfig({
  server:  { port: 3737 },   // for details see [vite doc](https://vitejs.dev/config/#server-host)
  //@ts-ignore  VitePluginNode may not be entirely compatible with latest vite version, but this is working
  plugins: [
    ...VitePluginNode({
      adapter:       'fastify',             //options:'express', 'nest', 'koa' and 'fastify' (and apollo?) or function
      appPath:       './simple-server.ts',  // entry point of your app
      exportName:    'simpleFastifyServer', // named export of your app from the appPath file
      initAppOnBoot:  false,                // to init your app on boot, set this to true, defaults to false

      // Optional, default: 'esbuild'
      // The TypeScript compiler you want to use
      // by default this plugin is using vite default ts compiler which is esbuild
      // 'swc' compiler is supported to use as well for frameworks
      // like Nestjs (esbuild dont support 'emitDecoratorMetadata' yet)
      // you need to INSTALL `@swc/core` as dev dependency if you want to use swc
      tsCompiler: 'esbuild',

      // Optional, default: {
      // jsc: {
      //   target: 'es2019',
      //   parser: {
      //     syntax: 'typescript',
      //     decorators: true
      //   },
      //  transform: {
      //     legacyDecorator: true,
      //     decoratorMetadata: true
      //   }
      // }
      // }
      // swc configs, see [swc doc](https://swc.rs/docs/configuration/swcrc)
      swcOptions: {}
    })
  ],
  optimizeDeps: {
    // Vite does not work well with optionnal dependencies,
    // you can mark them as ignored for now
    // eg: for nestjs, exlude these optional dependencies:
    // exclude: [
    //   '@nestjs/microservices',
    //   '@nestjs/websockets',
    //   'cache-manager',
    //   'class-transformer',
    //   'class-validator',
    //   'fastify-swagger',
    // ],
  },
});
