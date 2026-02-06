import { Injectable } from '@angular/core';
import { Student } from './data-loader.service';

type Delimiter = ',' | ';' | '\t';

@Injectable({
  providedIn: 'root'
})
export class CsvParserService {
  /**
   * Parse un fichier CSV et retourne un tableau d'étudiants
   * Accepte tous les formats : virgule, point-virgule, tabulation, différentes structures
   */
  async parseCsvFile(file: File): Promise<Student[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e: ProgressEvent<FileReader>) => {
        try {
          let text = (e.target?.result as string) || '';
          if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
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
   * Détecte le délimiteur CSV (virgule, point-virgule ou tabulation)
   */
  private detectDelimiter(line: string): Delimiter {
    const counts = {
      ',': (line.match(/,/g) || []).length,
      ';': (line.match(/;/g) || []).length,
      '\t': (line.match(/\t/g) || []).length
    };
    const max = Math.max(counts[','], counts[';'], counts['\t']);
    if (max === 0) return ',';
    if (counts[';'] === max) return ';';
    if (counts['\t'] === max) return '\t';
    return ',';
  }

  /**
   * Parse les valeurs d'une ligne avec le délimiteur donné
   */
  private parseLineValues(line: string, delimiter: Delimiter): string[] {
    const values: string[] = [];
    let currentValue = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === delimiter && !insideQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim());

    return values.map(v => v.replace(/^"|"$/g, '').trim());
  }

  /**
   * Normalise un en-tête pour la comparaison (accents, casse)
   */
  private normalizeHeader(h: string): string {
    return h
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  /**
   * Trouve l'index d'une colonne par son nom (flexible)
   */
  private findColumnIndex(headers: string[], names: string[]): number {
    return headers.findIndex(h => {
      const n = this.normalizeHeader(h);
      return names.some(name => n.includes(name) || n === name);
    });
  }

  /**
   * Parse le texte CSV en tableau d'étudiants
   */
  private parseCsvText(csvText: string): Student[] {
    const lines = csvText
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) {
      throw new Error('Le fichier CSV est vide');
    }

    const delimiter = this.detectDelimiter(lines[0]);
    const headerValues = this.parseLineValues(lines[0], delimiter);
    const firstLineLower = lines[0].toLowerCase();

    const hasHeader =
      firstLineLower.includes('nom') ||
      firstLineLower.includes('prenom') ||
      firstLineLower.includes('prénom') ||
      firstLineLower.includes('telephone') ||
      firstLineLower.includes('téléphone') ||
      firstLineLower.includes('sexe') ||
      firstLineLower.includes('tel');

    let startIndex = 0;
    let nomColumnIndex = 0;
    let prenomColumnIndex = 1;
    let telephoneColumnIndex = 2;
    let sexeColumnIndex = -1;

    if (hasHeader) {
      startIndex = 1;

      nomColumnIndex = this.findColumnIndex(headerValues, ['nom']);
      if (nomColumnIndex < 0) nomColumnIndex = 0;

      prenomColumnIndex = this.findColumnIndex(headerValues, ['prenom', 'prénom', 'prnom']);
      if (prenomColumnIndex < 0) prenomColumnIndex = 1;

      telephoneColumnIndex = this.findColumnIndex(headerValues, ['telephone', 'téléphone', 'tel', 'télphone', 'phone']);
      if (telephoneColumnIndex < 0) telephoneColumnIndex = 2;

      sexeColumnIndex = this.findColumnIndex(headerValues, ['sexe']);
    }

    const students: Student[] = [];

    for (let i = startIndex; i < lines.length; i++) {
      const values = this.parseLineValues(lines[i], delimiter);
      const student = this.parseCsvLine(
        values,
        i - startIndex + 1,
        { nomColumnIndex, prenomColumnIndex, telephoneColumnIndex, sexeColumnIndex }
      );
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
   * Parse une ligne CSV (valeurs déjà découpées)
   */
  private parseCsvLine(
    values: string[],
    id: number,
    columns: { nomColumnIndex: number; prenomColumnIndex: number; telephoneColumnIndex: number; sexeColumnIndex: number }
  ): Student | null {
    const nom = (values[columns.nomColumnIndex] || '').trim();
    const prenom = (values[columns.prenomColumnIndex] || '').trim();
    const telephone = (values[columns.telephoneColumnIndex] || '').trim();

    if (values.length <= Math.max(columns.nomColumnIndex, columns.prenomColumnIndex)) {
      return null;
    }

    const nomComplet = `${prenom} ${nom}`.trim() || `${nom} ${prenom}`.trim();

    if (!nomComplet) {
      return null;
    }

    let sexe: 'M' | 'F';
    if (columns.sexeColumnIndex >= 0 && values[columns.sexeColumnIndex]) {
      const sexeVal = values[columns.sexeColumnIndex].toUpperCase().trim();
      sexe =
        sexeVal === 'F' ||
        sexeVal === 'FEMININ' ||
        sexeVal === 'FÉMININ' ||
        sexeVal === 'FEMME'
          ? 'F'
          : 'M';
    } else {
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
   * Détecte le sexe basé sur le prénom
   */
  private detectSexe(prenom: string): 'M' | 'F' {
    const prenomLower = prenom.toLowerCase();
    const prenomsFeminins = [
      'sara', 'fatima', 'amina', 'aicha', 'khadija', 'zineb', 'salma', 'nadia',
      'marie', 'sophie', 'emilie', 'julie', 'laura', 'clara', 'lisa', 'anna',
      'fatou', 'awa', 'khoudia', 'daba', 'soda', 'marieme', 'fatim', 'aminata',
      'coumba', 'ndèye', 'ndeye', 'astou', 'mame', 'rokhaya', 'sokhna', 'bineta',
      'khady', 'aissatou', 'oumou', 'adja', 'mariama', 'seynabou', 'yacine'
    ];

    if (prenomsFeminins.some(p => prenomLower.includes(p))) {
      return 'F';
    }
    return 'M';
  }
}
