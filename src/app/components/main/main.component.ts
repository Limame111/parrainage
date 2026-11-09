import { Component, OnInit, signal, computed, inject, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { gsap } from 'gsap';
import { DataLoaderService, Student } from '../../services/data-loader.service';
import { ParrainageService, ParrainageResult } from '../../services/parrainage.service';
import { CsvParserService } from '../../services/csv-parser.service';

const TIRAGE_STORAGE_KEY = 'parrainage-tirage';

type UploadTarget = 'l1' | 'l2';

interface SavedTirage {
  results: ParrainageResult[];
  zoomedCardIndex: number | null;
}

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
  private csvParser = inject(CsvParserService);
  private cdr = inject(ChangeDetectorRef);

  // État de l'application
  filleuls = signal<Student[]>([]);
  parrains = signal<Student[]>([]);
  
  results = signal<ParrainageResult[]>([]);
  isProcessing = signal(false);
  showResults = signal(false);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  searchQuery = signal<string>('');
  sortedResults = computed(() => this.sortResults(this.results()));
  filteredResults = computed(() => this.computeFilteredResults());
  showStatistics = signal(false);
  isFullscreen = signal(false);
  zoomedCardIndex = signal<number | null>(null);
  zoomActive = signal<boolean>(false); // Indique si un zoom est actif
  cascadePending = signal(false); // Cartes masquées en attendant l'animation cascade

  // État pour l'upload CSV
  showUploadSection = signal(false);
  uploadingL1 = signal(false);
  uploadingL2 = signal(false);
  l1FileName = signal<string>('');
  l2FileName = signal<string>('');
  dragTarget = signal<UploadTarget | null>(null);

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
      this.restoreTirage();
      
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

  /**
   * Sauvegarde le tirage pour qu'il survive à un rafraîchissement de la page
   */
  private saveTirage(): void {
    const results = this.results();
    if (results.length === 0) {
      localStorage.removeItem(TIRAGE_STORAGE_KEY);
      return;
    }
    const saved: SavedTirage = { results, zoomedCardIndex: this.zoomedCardIndex() };
    try {
      localStorage.setItem(TIRAGE_STORAGE_KEY, JSON.stringify(saved));
    } catch {
      // Stockage indisponible (navigation privée, quota) : le tirage reste en mémoire
    }
  }

  /**
   * Restaure le dernier tirage sauvegardé (affiché directement, sans animation)
   */
  private restoreTirage(): void {
    let saved: SavedTirage | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(TIRAGE_STORAGE_KEY) ?? 'null');
    } catch {
      saved = null;
    }
    if (!saved || !Array.isArray(saved.results) || saved.results.length === 0) return;

    this.results.set(saved.results);
    this.showResults.set(true);

    const index = saved.zoomedCardIndex;
    if (typeof index === 'number' && index >= 0 && index < saved.results.length) {
      this.zoomedCardIndex.set(index);
      this.zoomActive.set(true);
      document.body.style.overflow = 'hidden';
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
      this.saveTirage();
      
      // Attendre un court instant pour l'animation de suspense
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Afficher les résultats
      this.isProcessing.set(false);
      this.cascadePending.set(true);
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
    this.cascadePending.set(false);

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
    this.zoomActive.set(false);
    this.cascadePending.set(false);
    localStorage.removeItem(TIRAGE_STORAGE_KEY);
    // Restaurer le scroll
    document.body.style.overflow = '';
  }

  /**
   * Retourne le libellé approprié (parrain/marraine) selon le sexe
   */
  getParrainLabel(sexe: 'M' | 'F'): string {
    return sexe === 'F' ? 'Marraine' : 'Parrain';
  }

  /**
   * Normalise une chaîne pour la recherche (insensible aux accents)
   */
  private normalizeForSearch(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  /**
   * Carte impliquant Ndeye Fatou Sall, Khoudia Manga Dieye ou Karine Touré (à afficher en fin de liste)
   */
  private isMarraineSpecial(result: ParrainageResult): boolean {
    const n = this.normalizeForSearch;
    const p = result.parrain.nom;
    return (
      (n(p).includes('ndeye fatou') && n(p).includes('sall')) ||
      (n(p).includes('khoudia') && n(p).includes('manga')) ||
      (n(p).includes('karine') && n(p).includes('toure'))
    );
  }

  /**
   * Ordre d'affichage : alphabétique par filleul, marraines spéciales en fin de liste
   */
  private sortResults(results: ParrainageResult[]): ParrainageResult[] {
    return [...results].sort((a, b) => {
      const aSpecial = this.isMarraineSpecial(a);
      const bSpecial = this.isMarraineSpecial(b);
      if (aSpecial && !bSpecial) return 1;   // a en fin
      if (!aSpecial && bSpecial) return -1;  // b en fin
      return a.filleul.nom.localeCompare(b.filleul.nom, 'fr');
    });
  }

  /**
   * Calcule les résultats filtrés et triés (utilisé par le computed)
   */
  private computeFilteredResults(): ParrainageResult[] {
    const query = this.normalizeForSearch(this.searchQuery());
    const sorted = this.sortedResults();

    return query
      ? sorted.filter(result =>
          this.normalizeForSearch(result.filleul.nom).includes(query) ||
          this.normalizeForSearch(result.parrain.nom).includes(query)
        )
      : sorted;
  }

  getFilteredResults(): ParrainageResult[] {
    return this.filteredResults();
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
    const results = this.sortedResults();
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
    const results = this.sortedResults();
    let csv = 'N°,Filleul,Parrain/Marraine,Sexe,Téléphone\n';
    
    results.forEach((result, index) => {
      csv += `${index + 1},"${result.filleul.nom}","${result.parrain.nom}","${result.parrain.sexe}","${result.parrain.telephone ?? ''}"\n`;
    });

    // BOM UTF-8 pour qu'Excel affiche correctement les accents
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
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
   * Télécharge la liste des parrainages en PDF (même ordre et mêmes numéros qu'à l'écran)
   */
  async downloadPDF(): Promise<void> {
    const results = this.sortedResults();
    if (results.length === 0) return;

    try {
      const [{ jsPDF }, { autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
      ]);

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      const today = new Date();
      const dateLabel = today.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
      const stats = this.getStatistics();

      // Bandeau d'en-tête
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageWidth, 38, 'F');
      doc.setFillColor(139, 92, 246);
      doc.rect(0, 38, pageWidth, 2.5, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('Parrainage - Section Informatique', margin, 18);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(`Journée d'intégration  ·  Liste officielle L1 / L2  ·  ${dateLabel}`, margin, 28);

      // Résumé
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(10.5);
      doc.text(
        `${stats.totalFilleuls} filleul(e)s  ·  ${stats.totalParrains} parrains et marraines`,
        margin,
        51
      );

      autoTable(doc, {
        startY: 57,
        margin: { left: margin, right: margin, bottom: 18 },
        head: [['N°', 'Filleul(e) - L1', 'Parrain / Marraine - L2', 'Rôle', 'Téléphone']],
        body: results.map((result, index) => [
          String(index + 1),
          result.filleul.nom,
          result.parrain.nom,
          this.getParrainLabel(result.parrain.sexe),
          result.parrain.telephone || '-'
        ]),
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 10,
          cellPadding: { top: 3.2, bottom: 3.2, left: 3, right: 3 },
          textColor: [30, 41, 59],
          lineColor: [226, 232, 240],
          lineWidth: 0.2,
          valign: 'middle'
        },
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10
        },
        alternateRowStyles: { fillColor: [241, 245, 249] },
        columnStyles: {
          0: { halign: 'center', cellWidth: 13, fontStyle: 'bold', textColor: [59, 130, 246] },
          1: { fontStyle: 'bold' },
          3: { halign: 'center', cellWidth: 22, fontSize: 9, fontStyle: 'bold' },
          4: { cellWidth: 32 }
        },
        didParseCell: data => {
          if (data.section === 'body' && data.column.index === 3) {
            data.cell.styles.textColor = data.cell.raw === 'Marraine' ? [219, 39, 119] : [6, 132, 162];
          }
        }
      });

      // Pied de page sur chaque page
      const pageCount = doc.getNumberOfPages();
      for (let page = 1; page <= pageCount; page++) {
        doc.setPage(page);
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text('Section Informatique - Parrainage L1 / L2', margin, pageHeight - 7);
        doc.text(`Page ${page} / ${pageCount}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
      }

      doc.save(`parrainage_${today.toISOString().split('T')[0]}.pdf`);
      this.showSuccessMessage('✅ Liste PDF téléchargée !');
    } catch {
      this.errorMessage.set('Erreur lors de la génération du PDF');
    }
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

  @HostListener('document:fullscreenchange')
  onFullscreenChange(): void {
    this.isFullscreen.set(!!document.fullscreenElement);
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
   * Gère la saisie dans la barre de recherche
   */
  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement)?.value ?? '';
    this.searchQuery.set(value);
  }

  /**
   * Efface la recherche et affiche toute la liste
   */
  clearSearch(): void {
    this.searchQuery.set('');
    this.cdr.detectChanges();
    setTimeout(() => {
      const container = document.querySelector('.results-container');
      if (container) container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  /**
   * Gère le clic sur une carte pour le zoom
   */
  onCardClick(index: number, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    // Empêcher d'ouvrir plusieurs zooms en même temps
    if (this.zoomActive()) {
      return;
    }
    
    // Vérifier que l'index est valide
    const results = this.results();
    if (index < 0 || index >= results.length) {
      console.error('Invalid index for zoom:', index, 'Total results:', results.length);
      return;
    }
    
    // Marquer le zoom comme actif
    this.zoomActive.set(true);
    
    // Bloquer le scroll (l'overlay est fixe : la position dans la liste est conservée)
    document.body.style.overflow = 'hidden';
    
    // Afficher la carte immédiatement
    this.zoomedCardIndex.set(index);
    this.saveTirage();
  }

  /**
   * Ferme le zoom
   */
  closeZoom(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // Fermer le zoom
    this.zoomedCardIndex.set(null);
    this.zoomActive.set(false);
    this.saveTirage();
    
    // Restaurer le scroll
    document.body.style.overflow = '';
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
   * Numéro affiché sur la carte zoomée (identique à celui de la carte dans la liste)
   */
  getZoomedCardNumber(): number {
    const zoomed = this.getZoomedCard();
    if (!zoomed) return 0;
    const position = this.filteredResults().indexOf(zoomed);
    return position >= 0 ? position + 1 : (this.zoomedCardIndex() ?? 0) + 1;
  }

  /**
   * Récupère l'index réel d'un résultat dans la liste complète
   */
  getRealIndex(result: ParrainageResult): number {
    const results = this.results();
    const index = results.findIndex(r => 
      r.filleul.id === result.filleul.id && 
      r.parrain.id === result.parrain.id
    );
    return index >= 0 ? index : 0;
  }

  /**
   * Toggle l'affichage de la section d'upload
   */
  toggleUploadSection(): void {
    this.showUploadSection.set(!this.showUploadSection());
  }

  /**
   * Gère la sélection d'un fichier CSV via le sélecteur de fichiers
   */
  async onFileSelected(event: Event, target: UploadTarget): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Réinitialiser l'input pour permettre de recharger le même fichier
    input.value = '';
    if (file) {
      await this.importCsv(file, target);
    }
  }

  onDragOver(event: DragEvent, target: UploadTarget): void {
    event.preventDefault();
    this.dragTarget.set(target);
  }

  onDragLeave(event: DragEvent): void {
    const zone = event.currentTarget as HTMLElement;
    if (zone.contains(event.relatedTarget as Node | null)) return;
    this.dragTarget.set(null);
  }

  async onDrop(event: DragEvent, target: UploadTarget): Promise<void> {
    event.preventDefault();
    this.dragTarget.set(null);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      await this.importCsv(file, target);
    }
  }

  /**
   * Charge un fichier CSV dans la liste L1 (filleuls) ou L2 (parrains)
   */
  private async importCsv(file: File, target: UploadTarget): Promise<void> {
    const isL1 = target === 'l1';
    const uploading = isL1 ? this.uploadingL1 : this.uploadingL2;
    const fileName = isL1 ? this.l1FileName : this.l2FileName;
    const list = isL1 ? this.filleuls : this.parrains;

    if (uploading()) return;

    if (!/\.(csv|txt)$/i.test(file.name)) {
      this.errorMessage.set('⚠️ Veuillez sélectionner un fichier CSV ou TXT');
      return;
    }

    uploading.set(true);
    fileName.set(file.name);
    this.errorMessage.set(null);

    try {
      const students = await this.csvParser.parseCsvFile(file);
      list.set(students);
      const label = isL1 ? 'filleul(s)' : 'parrain(s)/marraine(s)';
      this.showSuccessMessage(`✅ ${students.length} ${label} chargé(s) depuis ${file.name}`);
      
      // Réinitialiser les résultats si le parrainage a déjà été fait
      if (this.showResults()) {
        this.reset();
      }
    } catch (error) {
      fileName.set('');
      this.errorMessage.set(
        error instanceof Error ? error.message : `Erreur lors du chargement du fichier ${isL1 ? 'L1' : 'L2'}`
      );
    } finally {
      uploading.set(false);
    }
  }
}
