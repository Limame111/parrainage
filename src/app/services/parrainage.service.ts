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
   * Effectue le parrainage automatique selon les règles :
   * - Chaque filleul a 1 seul parrain/marraine
   * - Chaque parrain/marraine peut avoir 1 ou 2 filleuls maximum
   * - SAUF Ndeye Fatou Sall, Khoudia Manga Dieye, Karine Touré : 1 seule filleule chacune
   */
  assignParrains(filleuls: Student[], parrains: Student[]): ParrainageResult[] {
    if (parrains.length === 0) {
      throw new Error('Aucun parrain disponible');
    }

    if (filleuls.length === 0) {
      throw new Error('Aucun filleul disponible');
    }

    const results: ParrainageResult[] = [];
    const usedFilleulIds = new Set<number>();
    const usedParrainIds = new Set<number>();

    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Marraines avec une seule filleule (sexe F), tirée au sort
    const marrainesAvecFilleule: { parrain: Student; filleul: Student }[] = [];

    const ndeyeFatouSall = parrains.find(p => {
      const n = norm(p.nom);
      return n.includes('ndeye') && n.includes('fatou') && n.includes('sall');
    });
    const khoudiaMangaDieye = parrains.find(p => norm(p.nom).includes('khoudia') && norm(p.nom).includes('manga'));
    const karineToure = parrains.find(p => norm(p.nom).includes('karine') && norm(p.nom).includes('toure'));

    const filleulesF = this.shuffleArray(filleuls.filter(f => f.sexe === 'F'));
    let idxF = 0;

    for (const marraine of [ndeyeFatouSall, khoudiaMangaDieye, karineToure]) {
      if (marraine && filleulesF[idxF]) {
        marrainesAvecFilleule.push({ parrain: marraine, filleul: filleulesF[idxF++] });
      }
    }

    // Ces marraines n'auront qu'1 seule filleule (pas de 2e filleul possible)
    marrainesAvecFilleule.forEach(({ parrain, filleul }) => {
      results.push({ filleul, parrain });
      usedFilleulIds.add(filleul.id);
      usedParrainIds.add(parrain.id);
    });

    const remainingFilleuls = filleuls.filter(f => !usedFilleulIds.has(f.id));
    const remainingParrains = parrains.filter(p => !usedParrainIds.has(p.id));

    // Mélanger aléatoirement les listes restantes
    const shuffledFilleuls = this.shuffleArray(remainingFilleuls);
    const shuffledParrains = this.shuffleArray(remainingParrains);

    // Compteur pour chaque parrain
    const parrainCounts = new Map<number, number>();
    shuffledParrains.forEach(p => parrainCounts.set(p.id, 0));
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
          results.push({ filleul, parrain });
          parrainCounts.set(parrain.id, count + 1);
          parrainAssigned = true;
        }

        parrainIndex = (parrainIndex + 1) % shuffledParrains.length;
        attempts++;
      }

      // Si on n'a pas trouvé de parrain disponible, utiliser le premier disponible
      if (!parrainAssigned) {
        const availableParrain = shuffledParrains.find(p => (parrainCounts.get(p.id) || 0) < 2);
        if (availableParrain) {
          const count = parrainCounts.get(availableParrain.id) || 0;
          results.push({ filleul, parrain: availableParrain });
          parrainCounts.set(availableParrain.id, count + 1);
        } else {
          results.push({ filleul, parrain: shuffledParrains[0] });
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
