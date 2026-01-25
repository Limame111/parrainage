import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { gsap } from 'gsap';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent implements OnInit {
  private router = inject(Router);
  isAnimating = false;

  ngOnInit(): void {
    this.animateEntrance();
  }

  private animateEntrance(): void {
    // S'assurer que le bouton est visible immédiatement
    const button = document.querySelector('.landing-button');
    if (button) {
      (button as HTMLElement).style.opacity = '1';
      (button as HTMLElement).style.visibility = 'visible';
    }

    const tl = gsap.timeline();
    
    // Animation du titre
    tl.from('.landing-title', {
      duration: 1,
      opacity: 0,
      y: -30,
      ease: 'power3.out'
    })
    // Animation du sous-titre
    .from('.landing-subtitle', {
      duration: 0.8,
      opacity: 0,
      y: 20,
      ease: 'power3.out'
    }, '-=0.6')
    // Animation du bouton (plus rapide et visible)
    .from('.landing-button', {
      duration: 0.6,
      opacity: 0.3,
      scale: 0.95,
      y: 20,
      ease: 'back.out(1.4)'
    }, '-=0.4')
    // Animation des particules/effets
    .from('.landing-particles', {
      duration: 1,
      opacity: 0,
      ease: 'power2.out'
    }, '-=0.8');
  }

  navigateToMain(): void {
    if (this.isAnimating) return;
    
    this.isAnimating = true;
    
    // Animation de sortie
    const tl = gsap.timeline({
      onComplete: () => {
        this.router.navigate(['/main']);
      }
    });
    
    tl.to('.landing-content', {
      duration: 0.6,
      opacity: 0,
      scale: 0.95,
      ease: 'power2.in'
    })
    .to('.landing-container', {
      duration: 0.4,
      opacity: 0,
      ease: 'power2.in'
    }, '-=0.3');
  }
}
