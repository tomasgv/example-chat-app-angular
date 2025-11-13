import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { ChatWindowComponent } from './components/chat-window/chat-window';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'chat', component: ChatWindowComponent },
  { path: '**', redirectTo: '/login' }
];