import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  username: string = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onLogin(): void {
    if (this.username.trim()) {
      this.authService.login(this.username.trim());
      this.router.navigate(['/chat']);
    }
  }
}