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
    let sexeColumnIndex = -1; // Index de la colonne Sexe si elle existe

    // Vérifier si la première ligne est un en-tête et détecter la colonne Sexe
    const firstLine = lines[0].toLowerCase();
    if (firstLine.includes('nom') || firstLine.includes('prénom') || firstLine.includes('téléphone') || firstLine.includes('telephone') || firstLine.includes('sexe')) {
      startIndex = 1;
      
      // Trouver l'index de la colonne Sexe
      const headerValues = this.parseLineValues(lines[0]);
      sexeColumnIndex = headerValues.findIndex(h => h.toLowerCase() === 'sexe');
    }

    // Parser chaque ligne
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      const student = this.parseCsvLine(line, i - startIndex + 1, sexeColumnIndex);
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
   * Parse les valeurs d'une ligne CSV (gestion des guillemets et virgules)
   */
  private parseLineValues(line: string): string[] {
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
    values.push(currentValue.trim());

    // Nettoyer les guillemets des valeurs
    return values.map(v => v.replace(/^"|"$/g, '').trim());
  }

  /**
   * Parse une ligne CSV individuelle
   * Format attendu : nom,prénom,téléphone[,sexe]
   * @param sexeColumnIndex Index de la colonne Sexe (-1 si non présente)
   */
  private parseCsvLine(line: string, id: number, sexeColumnIndex: number = -1): Student | null {
    const cleanedValues = this.parseLineValues(line);

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

    // Déterminer le sexe : priorité à la colonne CSV si elle existe
    let sexe: 'M' | 'F';
    if (sexeColumnIndex >= 0 && cleanedValues[sexeColumnIndex]) {
      const sexeValue = cleanedValues[sexeColumnIndex].toUpperCase();
      sexe = (sexeValue === 'F' || sexeValue === 'FEMININ' || sexeValue === 'FÉMININ' || sexeValue === 'FEMME') ? 'F' : 'M';
    } else {
      // Fallback : détection par prénom
      sexe = this.detectSexe(prenom);
    }

    return {
      id: id,
      nom: nomComplet,
      sexe: sexe,
      telephone: telephone || undefined
    };
  }

  /**
   * Détecte le sexe basé sur le prénom (approximation simple)
   * Utilisé uniquement si la colonne Sexe n'est pas présente dans le CSV
   */
  private detectSexe(prenom: string): 'M' | 'F' {
    const prenomLower = prenom.toLowerCase();
    
    // Liste de prénoms féminins courants (maghrébins, français et sénégalais)
    const prenomsFeminins = [
      // Prénoms maghrébins
      'sara', 'fatima', 'amina', 'aicha', 'khadija', 'zineb', 'salma', 'nadia',
      // Prénoms français
      'marie', 'sophie', 'emilie', 'julie', 'laura', 'clara', 'lisa', 'anna',
      // Prénoms sénégalais
      'fatou', 'awa', 'khoudia', 'daba', 'soda', 'marieme', 'fatim', 'aminata',
      'coumba', 'ndèye', 'ndeye', 'astou', 'mame', 'rokhaya', 'sokhna', 'bineta',
      'khady', 'ndiaye', 'aissatou', 'oumou', 'adja', 'mariama', 'seynabou', 'yacine'
    ];

    if (prenomsFeminins.some(p => prenomLower.includes(p))) {
      return 'F';
    }

    // Par défaut, on retourne 'M' (peut être amélioré)
    return 'M';
  }
}
