#!/usr/bin/env python3
"""Script pour supprimer toutes les icônes de toutes les pages React"""

import os
import re
import glob

def supprimer_icones_fichier(fichier):
    """Supprimer les imports d'icônes et leur utilisation dans un fichier"""
    try:
        with open(fichier, 'r', encoding='utf-8') as f:
            contenu = f.read()
        
        original = contenu
        
        # Supprimer les imports d'icônes lucide-react
        contenu = re.sub(r'import\s*\{[^}]*\}\s*from\s*[\'"]lucide-react[\'"];?', '', contenu)
        
        # Supprimer les imports d'icônes react-icons
        contenu = re.sub(r'import\s*\{[^}]*\}\s*from\s*[\'"]react-icons/[^\'\"]*[\'"];?', '', contenu)
        
        # Supprimer les composants d'icônes utilisés dans le JSX
        # Patterns courants: <IconName />, <IconName size={...} />, <IconName className={...} />
        contenu = re.sub(r'<[A-Z][a-zA-Z]*(?:\s+[^>]*)?\s*/?>', '', contenu)
        
        # Nettoyer les lignes vides multiples
        contenu = re.sub(r'\n\s*\n\s*\n', '\n\n', contenu)
        
        if contenu != original:
            with open(fichier, 'w', encoding='utf-8') as f:
                f.write(contenu)
            print(f"Modifié: {fichier}")
            return True
        else:
            print(f"Aucune modification: {fichier}")
            return False
            
    except Exception as e:
        print(f"Erreur avec {fichier}: {e}")
        return False

def main():
    # Trouver tous les fichiers .jsx dans les pages
    fichiers_jsx = glob.glob('src/pages/**/*.jsx', recursive=True)
    
    print(f"Traitement de {len(fichiers_jsx)} fichiers...")
    
    modifies = 0
    for fichier in fichiers_jsx:
        if supprimer_icones_fichier(fichier):
            modifies += 1
    
    print(f"\nTerminé! {modifies} fichiers modifiés sur {len(fichiers_jsx)}")

if __name__ == "__main__":
    main()
