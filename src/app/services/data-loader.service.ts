import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';

export interface Student {
  id: number;
  nom: string;
  sexe: 'M' | 'F';
  telephone?: string; // Optionnel pour compatibilité avec les fichiers JSON existants
}

@Injectable({
  providedIn: 'root'
})
export class DataLoaderService {
  private http = inject(HttpClient);

  /**
   * Charge les données des filleuls (L1) depuis le fichier JSON
   */
  async loadFilleuls(): Promise<Student[]> {
    try {
      const data = await firstValueFrom(
        this.http.get<Student[]>('/assets/l1.json')
      );
      return data;
    } catch (error) {
      throw new Error('Erreur lors du chargement des filleuls (L1): ' + error);
    }
  }

  /**
   * Charge les données des parrains (L2) depuis le fichier JSON
   */
  async loadParrains(): Promise<Student[]> {
    try {
      const data = await firstValueFrom(
        this.http.get<Student[]>('/assets/l2.json')
      );
      return data;
    } catch (error) {
      throw new Error('Erreur lors du chargement des parrains (L2): ' + error);
    }
  }
}
