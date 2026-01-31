import { Injectable } from '@angular/core';
import { Student } from './data-loader.service';

export interface ParrainageResult {
  filleul: Student;
  parrain: Student;
}

@Injectable({
  providedIn: 'root'
})
export class ParrainageService {
  /**
   * Effectue le parrainage automatique selon les nouvelles règles :
   * - Chaque filleul a 1 seul parrain/marraine
   * - Chaque parrain/marraine peut avoir 1 ou 2 filleuls maximum
   * - Parrainage aléatoire mais respectant ces contraintes
   */
  assignParrains(filleuls: Student[], parrains: Student[]): ParrainageResult[] {
    if (parrains.length === 0) {
      throw new Error('Aucun parrain disponible');
    }

    if (filleuls.length === 0) {
      throw new Error('Aucun filleul disponible');
    }

    // Mélanger aléatoirement les listes
    const shuffledFilleuls = this.shuffleArray([...filleuls]);
    const shuffledParrains = this.shuffleArray([...parrains]);
    
    // Compteur pour chaque parrain (nombre de filleuls assignés)
    const parrainCounts = new Map<number, number>();
    shuffledParrains.forEach(p => parrainCounts.set(p.id, 0));
    
    const results: ParrainageResult[] = [];
    let parrainIndex = 0;

    for (const filleul of shuffledFilleuls) {
      let parrainAssigned = false;
      let attempts = 0;
      const maxAttempts = shuffledParrains.length * 2; // Éviter les boucles infinies

      // Chercher un parrain disponible (qui n'a pas encore 2 filleuls)
      while (!parrainAssigned && attempts < maxAttempts) {
        const parrain = shuffledParrains[parrainIndex];
        const count = parrainCounts.get(parrain.id) || 0;

        // Vérifier si ce parrain peut encore prendre un filleul (max 2)
        if (count < 2) {
          // Assigner le parrain au filleul
          results.push({
            filleul: filleul,
            parrain: parrain
          });

          // Incrémenter le compteur du parrain
          parrainCounts.set(parrain.id, count + 1);
          parrainAssigned = true;
        }

        // Passer au parrain suivant (cyclique)
        parrainIndex = (parrainIndex + 1) % shuffledParrains.length;
        attempts++;
      }

      // Si on n'a pas trouvé de parrain disponible, utiliser le premier disponible
      if (!parrainAssigned) {
        const availableParrain = shuffledParrains.find(p => (parrainCounts.get(p.id) || 0) < 2);
        if (availableParrain) {
          const count = parrainCounts.get(availableParrain.id) || 0;
          results.push({
            filleul: filleul,
            parrain: availableParrain
          });
          parrainCounts.set(availableParrain.id, count + 1);
        } else {
          // Fallback : utiliser le premier parrain même s'il a déjà 2 filleuls
          const fallbackParrain = shuffledParrains[0];
          results.push({
            filleul: filleul,
            parrain: fallbackParrain
          });
        }
      }
    }

    return results;
  }

  /**
   * Mélange un tableau de manière aléatoire (algorithme Fisher-Yates)
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
