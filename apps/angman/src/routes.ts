import { Route, provideRouter } from '@angular/router';

const routeInfo: Route[] = [
  {
    path: '',
    loadComponent: () => import('./home.component').then(c => c.HomeComponent)
  },
  {
    path: 'about-us',
    loadComponent: (): any => import('./about.component').then (c => c.AboutComponent)
  }
];


export const routes = [
  provideRouter(routeInfo)
]
