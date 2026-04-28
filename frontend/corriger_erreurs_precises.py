#!/usr/bin/env python3
"""Script pour corriger les erreurs JSX précises après suppression d'icônes"""

import os
import re
import glob

def corriger_fichier_precis(fichier):
    """Corriger les erreurs JSX spécifiques dans un fichier"""
    try:
        with open(fichier, 'r', encoding='utf-8') as f:
            contenu = f.read()
        
        original = contenu
        
        # Corriger l'erreur de double accolade dans onClick
        contenu = re.sub(r'onClick=\{\(\)\s*=>\s*openEdit\(ag\)\}\}', 'onClick={() => openEdit(ag)}', contenu)
        
        # Corriger les fragments JSX manquants au début du return
        contenu = re.sub(r'return\s*\(\s*<', 'return (<>', contenu)
        
        # Corriger les fragments JSX manquants à la fin
        if '<>' in contenu and not contenu.strip().endswith('</>'):
            contenu = contenu.rstrip() + '\n    </>\n  );'
        
        # Corriger les composants StatCard mal formés (manque le nom du composant)
        contenu = re.sub(r'(\s+)}\s+label="([^"]+)"\s+value="([^"]+)"\s+color="([^"]+)"\s*/>', r'\1<StatCard label="\2" value="\3" color="\4" />', contenu)
        
        # Corriger les fragments JSX dans les retours
        contenu = re.sub(r'return\s*\(\s*$', 'return (<>', contenu)
        
        # Corriger les éléments adjacents non enveloppés
        # Chercher les patterns où il y a des éléments JSX adjacents
        lines = contenu.split('\n')
        new_lines = []
        i = 0
        while i < len(lines):
            line = lines[i]
            
            # Si c'est un commentaire JSX, le garder
            if '{/*' in line and '*/}' in line:
                new_lines.append(line)
                i += 1
                continue
            
            # Si c'est une balise ouvrante JSX standalone
            if (re.match(r'^\s*<[^/][^>]*>', line) and 
                i + 1 < len(lines) and 
                re.match(r'^\s*<[^/][^>]*>', lines[i + 1]) and
                not re.search(r'return\s*\(', '\n'.join(lines[max(0, i-5):i]))):
                
                # Ajouter un fragment au début si nécessaire
                if not any('return (<>' in l for l in lines[max(0, i-10):i]):
                    # Insérer <> avant cette ligne
                    new_lines.extend(['', '    <>'])
                
                new_lines.append(line)
            else:
                new_lines.append(line)
            i += 1
        
        contenu = '\n'.join(new_lines)
        
        # Corriger les retours JSX incomplets
        if 'return (<>' in contenu and not contenu.strip().endswith('</>'):
            contenu = contenu.rstrip() + '\n    </>\n  );'
        
        # Corriger les erreurs de syntaxe spécifiques
        contenu = re.sub(r'return\s*</Layout>;', 'return <Layout title="Page"><PageLoader /></Layout>;', contenu)
        
        # Nettoyer les lignes vides multiples
        contenu = re.sub(r'\n\s*\n\s*\n', '\n\n', contenu)
        
        if contenu != original:
            with open(fichier, 'w', encoding='utf-8') as f:
                f.write(contenu)
            print(f"Corrigé: {fichier}")
            return True
        else:
            print(f"Pas de modification: {fichier}")
            return False
            
    except Exception as e:
        print(f"Erreur avec {fichier}: {e}")
        return False

def main():
    # Fichiers spécifiques mentionnés dans les erreurs
    fichiers_a_corriger = [
        'src/pages/admin/Agences.jsx',
        'src/pages/admin/Configuration.jsx',
        'src/pages/admin/Dashboard.jsx',
        'src/pages/admin/Logs.jsx',
        'src/pages/admin/Services.jsx',
        'src/pages/admin/Utilisateurs.jsx',
        'src/pages/agent/Dashboard.jsx',
        'src/pages/agent/FileAttente.jsx',
        'src/pages/agent/MesTaches.jsx',
        'src/pages/agent/Profil.jsx',
        'src/pages/auth/Login.jsx',
        'src/pages/auth/RegisterClient.jsx',
        'src/pages/auth/RegisterInstitution.jsx',
        'src/pages/client/Dashboard.jsx',
        'src/pages/client/Historique.jsx',
        'src/pages/client/MesRdv.jsx',
        'src/pages/client/MonTicket.jsx',
        'src/pages/client/Profil.jsx',
        'src/pages/directeur/Comparaison.jsx',
        'src/pages/directeur/Dashboard.jsx',
        'src/pages/directeur/Predictions.jsx',
        'src/pages/directeur/Rapports.jsx',
        'src/pages/manager/Alertes.jsx',
        'src/pages/manager/Dashboard.jsx',
        'src/pages/manager/FileAttente.jsx',
        'src/pages/manager/GestionAgents.jsx',
        'src/pages/manager/Rapports.jsx',
        'src/pages/manager/Statistiques.jsx',
        'src/pages/manager/Taches.jsx'
    ]
    
    print(f"Correction précise de {len(fichiers_a_corriger)} fichiers...")
    
    modifies = 0
    for fichier in fichiers_a_corriger:
        if os.path.exists(fichier):
            if corriger_fichier_precis(fichier):
                modifies += 1
    
    print(f"\nTerminé! {modifies} fichiers modifiés")

if __name__ == "__main__":
    main()
