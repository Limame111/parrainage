import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/landing/landing.component').then(m => m.LandingComponent)
  },
  {
    path: 'main',
    loadComponent: () => import('./components/main/main.component').then(m => m.MainComponent)
  },
  {
    path: 'parrainage',
    redirectTo: 'main',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: ''
  }
];
