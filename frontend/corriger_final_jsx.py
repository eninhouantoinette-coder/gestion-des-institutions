#!/usr/bin/env python3
"""Script final pour corriger toutes les erreurs JSX restantes"""

import os
import re

def corriger_fichier_final(fichier):
    """Corriger toutes les erreurs JSX restantes dans un fichier"""
    try:
        with open(fichier, 'r', encoding='utf-8') as f:
            contenu = f.read()
        
        original = contenu
        
        # Corriger les fragments JSX manquants ou mal formés
        # Remplacer les retours mal formés
        contenu = re.sub(r'return\s*\(\s*$', 'return (<>', contenu)
        
        # Corriger les fragments JSX non fermés
        if '<>' in contenu and not '</>' in contenu:
            contenu = contenu.rstrip() + '\n    </>\n  );'
        
        # Corriger les éléments JSX adjacents non enveloppés
        # Chercher les patterns où il y a des éléments JSX adjacents dans un return
        lines = contenu.split('\n')
        new_lines = []
        in_return = False
        has_fragment = False
        
        for i, line in enumerate(lines):
            # Détecter le début d'un return
            if 'return (' in line:
                in_return = True
                new_lines.append(line)
                continue
            
            # Détecter la fin d'un return
            if in_return and line.strip().startswith(');'):
                in_return = False
                # Ajouter la fermeture du fragment si nécessaire
                if has_fragment and not line.strip().startswith('</>'):
                    new_lines.insert(-1, '    </>')
                new_lines.append(line)
                continue
            
            # Si on est dans un return et on trouve une balise standalone
            if (in_return and 
                re.match(r'^\s*<[^/][^>]*>', line) and 
                not re.search(r'return\s*\(', '\n'.join(lines[max(0, i-5):i]))):
                
                # Si c'est la première balise et pas de fragment, en ajouter un
                if not has_fragment and not any('<>' in l for l in new_lines[-10:]):
                    new_lines.append('    <>')
                    has_fragment = True
                
                new_lines.append(line)
            else:
                new_lines.append(line)
        
        contenu = '\n'.join(new_lines)
        
        # Corriger les erreurs spécifiques de fragments
        contenu = re.sub(r'(<>\s*)$', r'\1', contenu)
        contenu = re.sub(r'(\s*</>)', r'\1', contenu)
        
        # Corriger les retours JSX incomplets
        contenu = re.sub(r'return\s*</Layout>;', 'return <Layout title="Page"><PageLoader /></Layout>;', contenu)
        
        # Corriger les doubles accolades dans onClick
        contenu = re.sub(r'onClick=\{\(\)\s*=>\s*[^}]+\}\}', lambda m: m.group(0).replace('}}', '}'), contenu)
        
        # Corriger les composants mal formés
        contenu = re.sub(r'(\s+)}\s+label="([^"]+)"\s+value="([^"]+)"\s+color="([^"]+)"\s*/>', r'\1<StatCard label="\2" value="\3" color="\4" />', contenu)
        
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
    # Fichiers spécifiques qui ont encore des erreurs
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
    
    print(f"Correction finale de {len(fichiers_a_corriger)} fichiers...")
    
    modifies = 0
    for fichier in fichiers_a_corriger:
        if os.path.exists(fichier):
            if corriger_fichier_final(fichier):
                modifies += 1
    
    print(f"\nTerminé! {modifies} fichiers modifiés")

if __name__ == "__main__":
    main()
