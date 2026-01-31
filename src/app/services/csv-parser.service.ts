import { Injectable } from '@angular/core';
import { Student } from './data-loader.service';

@Injectable({
  providedIn: 'root'
})
export class CsvParserService {
  /**
   * Parse un fichier CSV et retourne un tableau d'étudiants
   * Format attendu : nom,prénom,téléphone (avec ou sans en-tête)
   */
  async parseCsvFile(file: File): Promise<Student[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e: ProgressEvent<FileReader>) => {
        try {
          const text = e.target?.result as string;
          const students = this.parseCsvText(text);
          resolve(students);
        } catch (error) {
          reject(new Error('Erreur lors du parsing du fichier CSV: ' + error));
        }
      };

      reader.onerror = () => {
        reject(new Error('Erreur lors de la lecture du fichier'));
      };

      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * Parse le texte CSV en tableau d'étudiants
   */
  private parseCsvText(csvText: string): Student[] {
    const lines = csvText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length === 0) {
      throw new Error('Le fichier CSV est vide');
    }

    const students: Student[] = [];
    let startIndex = 0;

    // Vérifier si la première ligne est un en-tête
    const firstLine = lines[0].toLowerCase();
    if (firstLine.includes('nom') || firstLine.includes('prénom') || firstLine.includes('téléphone') || firstLine.includes('telephone')) {
      startIndex = 1;
    }

    // Parser chaque ligne
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      const student = this.parseCsvLine(line, i - startIndex + 1);
      if (student) {
        students.push(student);
      }
    }

    if (students.length === 0) {
      throw new Error('Aucun étudiant trouvé dans le fichier CSV');
    }

    return students;
  }

  /**
   * Parse une ligne CSV individuelle
   * Format attendu : nom,prénom,téléphone
   */
  private parseCsvLine(line: string, id: number): Student | null {
    // Gérer les guillemets et les virgules dans les valeurs
    const values: string[] = [];
    let currentValue = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim()); // Ajouter la dernière valeur

    // Nettoyer les guillemets des valeurs
    const cleanedValues = values.map(v => v.replace(/^"|"$/g, '').trim());

    if (cleanedValues.length < 2) {
      console.warn(`Ligne ${id} ignorée : format invalide (${line})`);
      return null;
    }

    const nom = cleanedValues[0] || '';
    const prenom = cleanedValues[1] || '';
    const telephone = cleanedValues[2] || '';

    // Construire le nom complet
    const nomComplet = `${prenom} ${nom}`.trim() || `${nom} ${prenom}`.trim();
    
    if (!nomComplet) {
      console.warn(`Ligne ${id} ignorée : nom vide`);
      return null;
    }

    // Déterminer le sexe basé sur le prénom (approximation simple)
    // On peut améliorer cela avec une liste de prénoms ou laisser l'utilisateur le spécifier
    const sexe = this.detectSexe(prenom);

    return {
      id: id,
      nom: nomComplet,
      sexe: sexe,
      telephone: telephone || undefined
    };
  }

  /**
   * Détecte le sexe basé sur le prénom (approximation simple)
   * Peut être amélioré avec une liste de prénoms ou un champ dans le CSV
   */
  private detectSexe(prenom: string): 'M' | 'F' {
    const prenomLower = prenom.toLowerCase();
    
    // Liste de prénoms féminins courants (peut être étendue)
    const prenomsFeminins = [
      'sara', 'fatima', 'amina', 'aicha', 'khadija', 'zineb', 'salma', 'nadia',
      'marie', 'sophie', 'emilie', 'julie', 'laura', 'clara', 'lisa', 'anna'
    ];

    if (prenomsFeminins.some(p => prenomLower.includes(p))) {
      return 'F';
    }

    // Par défaut, on retourne 'M' (peut être amélioré)
    return 'M';
  }
}
