import { defineConfig } from 'vite';
import { VitePluginNode } from 'vite-plugin-node';         // supports hmr w/ rest servers (fastify), but dev server clashes w/ websockets
import { viteStaticCopy } from 'vite-plugin-static-copy';  // used to copy assets neither public nor source code

const outDir = '../../dist/simple';        // relative where the builds go, keep it out of source tree

export default defineConfig({
  root: '.',                               // other paths are relative to root, which is relative to location of vite.config.mts
  build: { outDir, emptyOutDir: true },    // all build artifacts go under a monorepo root relative dist directory
  server:  { port: 3000 },                 // for details see [vite doc](https://vitejs.dev/config/#server-host)
  plugins: [
    ...viteStaticCopy({
      silent: false,
      targets: [
      {src: './deployment/**',                      dest: outDir},  // move all deployment files to dist
      {src: './deployment/fly-deploy-package.json', dest: outDir, rename: 'package.json'}  // rename one file
      ]}),

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
    }),

  ],
  optimizeDeps: {
    // Vite does not work well with optional dependencies,
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
