import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { gsap } from 'gsap';
import { DataLoaderService, Student } from '../../services/data-loader.service';
import { ParrainageService, ParrainageResult } from '../../services/parrainage.service';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './main.component.html',
  styleUrl: './main.component.css'
})
export class MainComponent implements OnInit {
  private dataLoader = inject(DataLoaderService);
  private parrainageService = inject(ParrainageService);

  // État de l'application
  filleuls = signal<Student[]>([]);
  parrains = signal<Student[]>([]);
  
  results = signal<ParrainageResult[]>([]);
  isProcessing = signal(false);
  showResults = signal(false);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  searchQuery = signal<string>('');
  showStatistics = signal(false);
  isFullscreen = signal(false);
  zoomedCardIndex = signal<number | null>(null);

  ngOnInit(): void {
    this.loadData();
  }

  private async loadData(): Promise<void> {
    try {
      // Charger les données JSON
      const [filleulsData, parrainsData] = await Promise.all([
        this.dataLoader.loadFilleuls(),
        this.dataLoader.loadParrains()
      ]);

      this.filleuls.set(filleulsData);
      this.parrains.set(parrainsData);
      this.isLoading.set(false);
      
      // Animation d'entrée après le chargement
      setTimeout(() => {
        this.animateEntrance();
      }, 100);
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Erreur lors du chargement des données'
      );
      this.isLoading.set(false);
    }
  }

  private animateEntrance(): void {
    gsap.from('.main-container', {
      duration: 0.8,
      opacity: 0,
      y: 30,
      ease: 'power3.out'
    });
  }

  async launchParrainage(): Promise<void> {
    const filleulsData = this.filleuls();
    const parrainsData = this.parrains();

    if (filleulsData.length === 0 || parrainsData.length === 0) {
      this.errorMessage.set('Les données ne sont pas encore chargées');
      return;
    }

    this.isProcessing.set(true);
    this.errorMessage.set(null);
    this.showResults.set(false);
    this.results.set([]);

    try {
      // Effectuer le parrainage
      const parrainageResults = this.parrainageService.assignParrains(
        filleulsData,
        parrainsData
      );

      this.results.set(parrainageResults);
      
      // Attendre un court instant pour l'animation de suspense
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Afficher les résultats
      this.isProcessing.set(false);
      this.showResults.set(true);
      
      // Lancer l'animation cascade après un court délai pour que le DOM soit prêt
      setTimeout(() => {
        this.animateCascade();
      }, 300);

    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Une erreur est survenue'
      );
      this.isProcessing.set(false);
    }
  }

  /**
   * Animation cascade : chaque carte apparaît une par une avec fade-in + slide + rotation
   */
  private animateCascade(): void {
    const results = this.results();
    if (results.length === 0) return;

    // Initialiser toutes les cartes comme invisibles
    results.forEach((_, index) => {
      const card = document.querySelector(`.result-card[data-index="${index}"]`);
      if (card) {
        gsap.set(card, {
          opacity: 0,
          y: 80,
          x: -30,
          rotation: -5,
          scale: 0.8
        });
      }
    });

    // Animer chaque carte une par une en cascade
    results.forEach((_, index) => {
      setTimeout(() => {
        this.animateCardCascade(index);
      }, index * 200); // Délai de 200ms entre chaque carte
    });

    // Animation finale (confetti) après la dernière carte
    setTimeout(() => {
      this.triggerConfetti();
    }, results.length * 200 + 800);
  }

  /**
   * Animation individuelle d'une carte avec effet cascade
   */
  private animateCardCascade(index: number): void {
    const card = document.querySelector(`.result-card[data-index="${index}"]`);
    if (!card) return;

    // Animation principale : fade-in + slide + rotation + scale
    gsap.to(card, {
      duration: 0.8,
      opacity: 1,
      y: 0,
      x: 0,
      rotation: 0,
      scale: 1,
      ease: 'back.out(1.4)',
      onComplete: () => {
        // Animation subtile de "rebond" final
        gsap.to(card, {
          duration: 0.3,
          scale: 1.02,
          yoyo: true,
          repeat: 1,
          ease: 'power2.inOut'
        });
      }
    });

    // Animation du contenu de la carte (filleul et parrain)
    const filleulName = card.querySelector('.filleul-name');
    const parrainInfo = card.querySelector('.parrain-info');
    
    if (filleulName) {
      gsap.from(filleulName, {
        duration: 0.6,
        opacity: 0,
        x: -20,
        delay: 0.2,
        ease: 'power3.out'
      });
    }

    if (parrainInfo) {
      gsap.from(parrainInfo, {
        duration: 0.6,
        opacity: 0,
        x: 20,
        delay: 0.4,
        ease: 'power3.out'
      });
    }
  }

  private triggerConfetti(): void {
    // Confetti amélioré
    const confettiCount = 80;
    const container = document.querySelector('.results-container') || document.body;
    
    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.top = '-10px';
      
      const colors = [
        '#3b82f6',
        '#8b5cf6',
        '#06b6d4',
        '#f59e0b',
        '#10b981'
      ];
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      
      const shapes = ['circle', 'square'];
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      if (shape === 'circle') {
        confetti.style.borderRadius = '50%';
      }
      
      confetti.style.width = (Math.random() * 8 + 6) + 'px';
      confetti.style.height = confetti.style.width;
      
      container.appendChild(confetti);

      gsap.to(confetti, {
        duration: Math.random() * 2 + 2,
        y: window.innerHeight + 200,
        x: (Math.random() - 0.5) * 150,
        rotation: Math.random() * 360,
        opacity: 0,
        ease: 'power2.out',
        onComplete: () => confetti.remove()
      });
    }
  }

  reset(): void {
    this.results.set([]);
    this.showResults.set(false);
    this.errorMessage.set(null);
    this.isProcessing.set(false);
    this.searchQuery.set('');
    this.showStatistics.set(false);
    this.zoomedCardIndex.set(null);
  }

  /**
   * Retourne le libellé approprié (parrain/marraine) selon le sexe
   */
  getParrainLabel(sexe: 'M' | 'F'): string {
    return sexe === 'F' ? 'Marraine' : 'Parrain';
  }

  /**
   * Filtre les résultats selon la recherche
   */
  getFilteredResults(): ParrainageResult[] {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) {
      return this.results();
    }
    
    return this.results().filter(result => 
      result.filleul.nom.toLowerCase().includes(query) ||
      result.parrain.nom.toLowerCase().includes(query)
    );
  }

  /**
   * Calcule les statistiques de parrainage
   */
  getStatistics(): {
    totalFilleuls: number;
    totalParrains: number;
    filleulsParParrain: { nom: string; count: number }[];
  } {
    const results = this.results();
    const parrainsCount = new Map<string, number>();
    
    results.forEach(result => {
      const count = parrainsCount.get(result.parrain.nom) || 0;
      parrainsCount.set(result.parrain.nom, count + 1);
    });

    const filleulsParParrain = Array.from(parrainsCount.entries())
      .map(([nom, count]) => ({ nom, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalFilleuls: results.length,
      totalParrains: parrainsCount.size,
      filleulsParParrain
    };
  }

  /**
   * Copie les résultats dans le presse-papier
   */
  async copyToClipboard(): Promise<void> {
    const results = this.results();
    let text = '🎓 Résultats du Parrainage - Section Informatique\n';
    text += '='.repeat(50) + '\n\n';
    
    results.forEach((result, index) => {
      text += `${index + 1}. ${result.filleul.nom} → ${result.parrain.nom} (${this.getParrainLabel(result.parrain.sexe)})\n`;
    });

    try {
      await navigator.clipboard.writeText(text);
      this.showSuccessMessage('✅ Résultats copiés dans le presse-papier !');
    } catch (error) {
      this.errorMessage.set('Erreur lors de la copie');
    }
  }

  /**
   * Télécharge les résultats en CSV
   */
  downloadCSV(): void {
    const results = this.results();
    let csv = 'Filleul,Parrain/Marraine,Sexe\n';
    
    results.forEach(result => {
      csv += `"${result.filleul.nom}","${result.parrain.nom}","${result.parrain.sexe}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `parrainage_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    this.showSuccessMessage('✅ Fichier CSV téléchargé !');
  }

  /**
   * Active/désactive le mode plein écran
   */
  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        this.isFullscreen.set(true);
      }).catch(() => {
        this.errorMessage.set('Impossible d\'activer le mode plein écran');
      });
    } else {
      document.exitFullscreen().then(() => {
        this.isFullscreen.set(false);
      });
    }
  }

  /**
   * Affiche un message de succès temporaire
   */
  private showSuccessMessage(message: string): void {
    this.errorMessage.set(message);
    setTimeout(() => {
      if (this.errorMessage()?.includes('✅')) {
        this.errorMessage.set(null);
      }
    }, 3000);
  }

  /**
   * Toggle les statistiques
   */
  toggleStatistics(): void {
    this.showStatistics.set(!this.showStatistics());
  }

  /**
   * Gère le clic sur une carte pour le zoom
   */
  onCardClick(index: number, event: Event): void {
    event.stopPropagation();
    
    // Scroll instantané vers le haut AVANT d'afficher la carte
    window.scrollTo(0, 0);
    
    // Empêcher le scroll du body pendant le zoom
    document.body.style.overflow = 'hidden';
    
    // Attendre que le scroll soit effectué avant d'afficher la carte
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.zoomedCardIndex.set(index);
        
        // S'assurer que la carte est bien centrée après affichage
        setTimeout(() => {
          // Forcer le scroll vers le haut une dernière fois pour être sûr
          window.scrollTo(0, 0);
        }, 10);
      });
    });
  }

  /**
   * Ferme le zoom
   */
  closeZoom(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.zoomedCardIndex.set(null);
    
    // Réactiver le scroll du body
    document.body.style.overflow = '';
  }

  /**
   * Empêche la propagation du clic sur la carte zoomée
   */
  onZoomedCardClick(event: Event): void {
    event.stopPropagation();
  }

  /**
   * Récupère la carte zoomée
   */
  getZoomedCard(): ParrainageResult | null {
    const index = this.zoomedCardIndex();
    if (index === null) return null;
    const results = this.results();
    return results[index] || null;
  }

  /**
   * Récupère l'index réel d'un résultat dans la liste complète
   */
  getRealIndex(result: ParrainageResult): number {
    return this.results().indexOf(result);
  }
}
